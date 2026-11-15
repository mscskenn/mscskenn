/* John Kenneth Moscosa — portfolio
   Ported from design/Me2.dc.html (measure, nameFx, fade, seg, out, io).
   Window scrolling drives the intro: p = scrollY / introDist. */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var SECS = ['me', 'projects', 'skills', 'certs', 'log', 'contact'];
  var EMAIL = 'moscosajohnkenneth1@gmail.com';

  var reduced = false, motionQuery = null;
  try {
    motionQuery = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
    reduced = !!(motionQuery && motionQuery.matches);
  } catch (e) {}
  var coarse = false;
  try { coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches); } catch (e) {}

  function byId(id) { return doc.getElementById(id); }
  function all(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }

  var el = {
    bg: byId('siteBg'),
    bgGrid: byId('siteBgGrid'),
    bgGlow: byId('siteBgGlow'),
    bgTiles: byId('siteBgTiles'),
    bgText: byId('siteBgText'),
    bgPlane: byId('siteBgPlane'),
    track: byId('introTrack'),
    stage: byId('stage'),
    nameBox: byId('nameBox'),
    nameFx: byId('nameFx'),
    nameLoad: byId('nameLoad'),
    loadQuery: byId('loadQuery'),
    loadQueryRun: byId('loadQueryRun'),
    loadFlash: byId('loadFlash'),
    loadVignette: byId('loadVignette'),
    loadRipple: byId('loadRipple'),
    loadResult: byId('loadResult'),
    loadGhost: byId('loadGhost'),
    eyebrow: byId('eyebrow'),
    line: byId('eyebrowLine'),
    sub: byId('sub'),
    lede: byId('lede'),
    actions: byId('actions'),
    roomWrap: byId('roomWrap'),
    room: byId('room'),
    notes: byId('roomNotes'),
    strip: byId('strip'),
    cue: byId('cue'),
    cueArrow: byId('cueArrow'),
    cueUrl: byId('cueUrl'),
    skip: byId('skipIntro'),
    topbar: byId('topbar'),
    tabbar: byId('tabbar'),
    msg: byId('kenn-msg'),
    send: byId('sendMail'),
    copyBtn: byId('copyEmail'),
    copyLabel: byId('copyLabel'),
    time: byId('localTime')
  };
  if (!el.track || !el.stage || !el.nameBox) return;

  el.reveal = {
    board: all('[data-reveal="board"]'),
    notes: all('[data-reveal="notes"]'),
    lights: all('[data-reveal="lights"]'),
    glow: all('[data-reveal="glow"]'),
    screen: all('[data-reveal="screen"]')
  };
  var secs = {};
  SECS.forEach(function (id) { secs[id] = byId(id); });
  var navLinks = all('[data-nav]');

  var S = {
    W: 0, H: 0, mobile: false, introDist: 0,
    box: null,
    p: reduced ? 1 : 0,
    pTarget: reduced ? 1 : 0,
    beat: 0,
    active: null
  };
  var loadPlaying = root.classList.contains('load-playing');
  var loadAnimations = [], loadNameAnimation = null, loadGhostName = null, loadStart = 0;
  var loadFlat = 'matrix(0.866, 0.5, -0.866, 0.5, 0, 0) scale(1)';

  /* ---------- helpers ported from renderVals() ---------- */

  function clamp(v) { return Math.min(1, Math.max(0, v)); }
  function seg(a, b) { return clamp((S.p - a) / (b - a)); }
  function out(t) { return 1 - Math.pow(1 - t, 3); }
  function io(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  // Write a style only when it changed.
  function css(node, prop, val) {
    if (!node) return;
    var key = '_k_' + prop;
    if (node[key] === val) return;
    node[key] = val;
    if (prop.slice(0, 2) === '--') node.style.setProperty(prop, val);
    else node.style[prop] = val;
  }
  function vis(node, o) { css(node, 'visibility', o < 0.01 ? 'hidden' : 'visible'); }
  function fade(node, a, b, dy) {
    var o = out(seg(a, b));
    css(node, 'opacity', o.toFixed(3));
    css(node, 'transform', 'translateY(' + ((dy || 16) * (1 - o)).toFixed(1) + 'px)');
    vis(node, o);
  }
  function op(nodes, a, b) {
    var v = out(seg(a, b)).toFixed(3);
    for (var i = 0; i < nodes.length; i++) css(nodes[i], 'opacity', v);
  }
  function text(node, val) {
    if (node && node._txt !== val) { node._txt = val; node.textContent = val; }
  }

  /* ---------- queries on the floor ---------- */

  var floorW = 0, floorH = 0, floorRate = 1, floorResizeT;
  var floorRows = [], floorContext, floorSize = 0, floorRatio = 1;
  var floorX = 0, floorY = 0;
  var floorTime = 0, floorLast = 0, floorRaf = 0;
  var floorMotion = !reduced;
  var floorQueries = [
    "<span class=\"kw\">SELECT</span> * <span class=\"kw\">FROM</span> kenn <span class=\"kw\">WHERE</span> section = <span class=\"accent\">'me'</span>;",
    '<span class="kw">SELECT</span> * <span class="kw">FROM</span> kenn.projects <span class="kw">ORDER BY</span> pride <span class="kw">DESC</span>;',
    '<span class="kw">SELECT</span> category, tools <span class="kw">FROM</span> kenn.skills;',
    "<span class=\"kw\">SELECT</span> * <span class=\"kw\">FROM</span> kenn.certs <span class=\"kw\">WHERE</span> status = <span class=\"accent\">'earned'</span>;",
    '<span class="kw">SELECT</span> * <span class="kw">FROM</span> kenn.log <span class="kw">ORDER BY</span> date <span class="kw">DESC</span>;',
    "<span class=\"kw\">INSERT INTO</span> kenn.inbox <span class=\"kw\">VALUES</span> (<span class=\"accent\">'you'</span>);"
  ];

  function drawFloor(ts) {
    floorRaf = 0;
    if (floorLast) floorTime += (ts - floorLast) * floorRate;
    floorLast = ts;
    floorContext.setTransform(floorRatio, 0, 0, floorRatio, 0, 0);
    floorContext.clearRect(0, 0, floorW, floorH);
    floorContext.transform(0.866, 0.5, -0.866, 0.5, floorX, floorY);
    for (var i = 0; i < floorRows.length; i++) {
      var row = floorRows[i];
      var x = -row.width * ((floorTime / 1000 + row.delay) % row.duration) / row.duration;
      for (; x < floorSize; x += row.width) {
        floorContext.drawImage(row.strip, x, i * 60, row.width, 60);
      }
    }
    if (floorMotion && !doc.hidden) floorRaf = window.requestAnimationFrame(drawFloor);
  }

  function measureFloor(w, h, force) {
    if (!el.bg || (w === floorW && h === floorH && !force)) return;
    floorW = w; floorH = h;

    var half = w / 3.464;
    var top = -Math.ceil(half / 60) * 60;
    var length = Math.ceil((h - top + half) / 60) * 60;
    floorX = 52 + 104 * Math.round((w / 2 - 52) / 104);
    floorY = top;
    css(el.bgPlane, 'width', w + 'px');
    css(el.bgPlane, 'height', h + 'px');

    var nq = Math.max(6, Math.ceil(length / 420) + 1);
    var speeds = [52, 68, 44, 76, 60];
    var style = window.getComputedStyle(el.bgPlane);
    var palette = window.getComputedStyle(root);
    var colors = { kw: palette.getPropertyValue('--sql-keyword').trim(), accent: palette.getPropertyValue('--accent').trim() };
    var strips = [], widths = [];
    floorSize = length;
    // Bound texture memory and stay inside mobile canvas dimension limits.
    floorRatio = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(3000000 / (w * h)), 4096 / w, 4096 / h);
    if (floorRaf) window.cancelAnimationFrame(floorRaf);
    floorRaf = 0; floorLast = 0; floorRows = [];
    el.bgPlane.width = Math.min(4096, Math.ceil(w * floorRatio));
    el.bgPlane.height = Math.min(4096, Math.ceil(h * floorRatio));
    floorContext = el.bgPlane.getContext('2d');
    if (!floorContext) { css(el.bgText, 'display', 'none'); return; }
    floorContext.scale(floorRatio, floorRatio);
    for (var start = 0; start < 3; start++) {
      var parts = [], width = 0;
      floorContext.font = style.font;
      for (var j = 0; j < nq; j++) {
        var query = doc.createElement('span');
        query.innerHTML = floorQueries[(start * 2 + j) % 6];
        Array.prototype.forEach.call(query.childNodes, function (part) {
          parts.push({ text: part.textContent, x: width, color: colors[part.className] || style.color });
          width += floorContext.measureText(part.textContent).width;
        });
        width += 120;
      }
      var strip = doc.createElement('canvas');
      var stripRatio = Math.min(floorRatio, 4096 / width);
      strip.width = Math.min(4096, Math.ceil(width * stripRatio));
      strip.height = Math.ceil(60 * stripRatio);
      var context = strip.getContext('2d');
      if (!context) { floorContext = null; css(el.bgText, 'display', 'none'); return; }
      context.scale(stripRatio, stripRatio);
      context.font = style.font;
      context.textBaseline = 'middle';
      parts.forEach(function (part) {
        context.fillStyle = part.color;
        context.fillText(part.text, part.x, 30);
      });
      strips.push(strip);
      widths.push(width);
    }
    for (var i = 0; i < length / 60; i++) {
      var duration = speeds[i % 5] * nq / 6;
      floorRows.push({ strip: strips[i % 3], width: widths[i % 3], duration: duration, delay: reduced ? 0 : (i * 7) % duration });
    }
    css(el.bgText, 'display', '');
    drawFloor(0);

    // A fixed cell hash keeps surviving cells in the same order across resizes.
    var candidates = [];
    for (var b = 0; b * 60 < h; b++) {
      for (var a = -1; a * 104 < w; a++) {
        for (var offset = 0; offset < 2; offset++) {
          var x = a * 104 + offset * 52, y = b * 60 + offset * 30;
          var cx = x + 52, cy = y + 30;
          if (cx < 0 || cx > w || cy > h) continue;
          if (Math.abs(cx - w / 2) < 420 && Math.abs(cy - h / 2) < 260) continue;
          var hash = Math.sin((a + 1) * 127.1 + b * 311.7 + offset * 74.7) * 43758.5453;
          candidates.push({ x: x, y: y, rank: hash - Math.floor(hash) });
        }
      }
    }
    candidates.sort(function (a, b) { return a.rank - b.rank || a.y - b.y || a.x - b.x; });
    var tiles = doc.createDocumentFragment();
    var count = Math.min(candidates.length, Math.max(4, Math.floor(w * h / 200000)));
    for (i = 0; i < count; i++) {
      var cell = candidates[i];
      var tile = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
      tile.setAttribute('class', 'site-bg-lit');
      tile.setAttribute('d', 'M0 30 L52 0 L104 30 L52 60 Z');
      tile.setAttribute('transform', 'translate(' + cell.x + ' ' + cell.y + ')');
      tiles.appendChild(tile);
    }
    el.bgTiles.textContent = '';
    el.bgTiles.appendChild(tiles);
  }

  function renderFloor(k) {
    if (!el.bg) return;
    css(el.bgGrid, 'opacity', (1 - 0.3 * k).toFixed(3));
    css(el.bgText, 'opacity', (0.5 - 0.2 * k).toFixed(3));
    css(el.bg, '--hole', k.toFixed(3));
    floorRate = 1 - 0.75 * k;
  }

  /* ---------- measure ---------- */

  function measure(force) {
    var W = root.clientWidth || window.innerWidth;
    var H = window.innerHeight;
    // On touch devices the URL bar changes innerHeight while scrolling; ignore small height-only changes.
    if (!force && coarse && S.H && W === S.W && Math.abs(H - S.H) < 160) H = S.H;
    S.W = W;
    S.H = H;
    S.mobile = W < 760;
    S.introDist = reduced ? 0 : Math.round(H * (S.mobile ? 0.75 : 1.3));
    if (!floorW) measureFloor(W, H);
    else if (W !== floorW || H !== floorH) {
      clearTimeout(floorResizeT);
      floorResizeT = setTimeout(function () {
        measureFloor(S.W, S.H);
        if (!loadPlaying) renderFloor(reduced ? 1 : io(seg(0.03, 0.6)));
        else renderFloor(0);
      }, 120);
    }

    css(el.stage, 'height', H + 'px');
    css(el.track, 'height', (H + S.introDist) + 'px');
    if (el.msg) el.msg.rows = S.mobile ? 2 : 3;

    var sr = el.stage.getBoundingClientRect();
    var nr = el.nameBox.getBoundingClientRect();
    S.box = { x: nr.left - sr.left, y: nr.top - sr.top, w: nr.width, h: nr.height };
    if (loadPlaying && loadGhostName) placeLoadName();

    readScroll();
    S.p = S.pTarget;
    render();
  }

  /* ---------- scroll ---------- */

  function scrollTop() { return window.pageYOffset || root.scrollTop || 0; }

  function activeAt(top) {
    var a = null, y = top + S.H * 0.4;
    for (var i = 0; i < SECS.length; i++) {
      var s = secs[SECS[i]];
      if (s && s.getBoundingClientRect().top + top <= y) a = SECS[i];
    }
    if (top + window.innerHeight >= root.scrollHeight - 4) a = 'contact';
    return a;
  }

  // S.pTarget follows the scroll position exactly; S.p (what the intro renders)
  // eases toward it, so a notched mouse wheel glides instead of jumping.
  var EASE_MS = 90;
  var snapNext = true;

  function readScroll() {
    var top = scrollTop();
    S.pTarget = S.introDist ? clamp(top / S.introDist) : 1;
    if (loadPlaying && top > 0) finishLoad();
    S.active = activeAt(top);
  }

  var raf = 0, lastFrame = 0;
  function frame(ts) {
    raf = 0;
    readScroll();
    var dt = lastFrame ? Math.min(64, ts - lastFrame) : 16;
    lastFrame = ts;
    var diff = S.pTarget - S.p;
    if (reduced || snapNext || Math.abs(diff) < 0.0004) { S.p = S.pTarget; snapNext = false; }
    else S.p += diff * (1 - Math.exp(-dt / EASE_MS));
    render();
    if (S.p !== S.pTarget) schedule(); else lastFrame = 0;
  }
  function schedule() { if (!raf) raf = window.requestAnimationFrame(frame); }

  /* ---------- room annotations ----------
     Each note fades in and its arrow draws on, one after another. The displayed
     progress eases toward the scroll target over time (never faster than ~2.8s
     for the whole set), so one flick of the wheel can't make them pop in. */

  var notes = all('.note').map(function (n) { return { el: n, paths: all('path', n) }; });
  var noteShown = 0, noteTarget = 0, noteRaf = 0, noteLast = 0;

  function applyNotes() {
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      var local = clamp((noteShown - i * 0.12) / 0.64);
      var o = out(clamp(local / 0.55));
      css(n.el, 'opacity', o.toFixed(3));
      css(n.el, 'translate', '0 ' + (8 * (1 - o)).toFixed(2) + 'px');
      drawPath(n.paths[0], io(clamp((local - 0.2) / 0.6)));
      drawPath(n.paths[1], out(clamp((local - 0.78) / 0.22)));
    }
  }

  // Round line caps would show a dot before a stroke starts, so hide it until then.
  function drawPath(path, t) {
    if (!path) return;
    css(path, 'strokeDashoffset', (1 - t).toFixed(4));
    css(path, 'opacity', t > 0.005 ? '1' : '0');
  }

  function noteTick(ts) {
    var dt = noteLast ? Math.min(64, ts - noteLast) : 16;
    noteLast = ts;
    var step = (noteTarget - noteShown) * (1 - Math.exp(-dt / 380));
    var maxStep = dt / 2800;
    if (step > maxStep) step = maxStep; else if (step < -maxStep) step = -maxStep;
    noteShown += step;
    if (Math.abs(noteTarget - noteShown) < 0.0015) noteShown = noteTarget;
    applyNotes();
    if (noteShown !== noteTarget) noteRaf = window.requestAnimationFrame(noteTick);
    else { noteRaf = 0; noteLast = 0; }
  }

  function setNoteTarget(t) {
    if (reduced) { noteShown = noteTarget = 1; applyNotes(); return; }
    noteTarget = t;
    if (!noteRaf && noteShown !== noteTarget) noteRaf = window.requestAnimationFrame(noteTick);
  }

  /* ---------- render ---------- */

  function startNameScale(box) {
    if (box.w <= 0) return 1;
    return S.mobile ? Math.min(1.06, (S.W * 0.9) / box.w) : Math.min(1.2, (S.W * 0.64) / box.w, (S.H * 0.42) / box.h);
  }

  var lastActive;
  function render() {
    var mobile = S.mobile, W = S.W, H = S.H;
    var tick = Math.floor(S.beat / 2) % 2 === 0;

    // name: centred and scaled at p = 0, settles into its slot by p = 0.6
    var box = S.box || { x: 0, y: 0, w: 0, h: 0 };
    var e = io(seg(0.03, 0.6));
    if (!loadPlaying) {
      renderFloor(reduced ? 1 : e);
      css(el.loadVignette, 'opacity', (1 - e).toFixed(3));
    }
    var s0 = startNameScale(box);
    var dx = W / 2 - (box.x + box.w / 2);
    var dy = H / 2 - (box.y + box.h / 2);
    var sc = s0 + (1 - s0) * e;
    css(el.nameFx, 'transform', 'translate(' + (dx * (1 - e)).toFixed(1) + 'px, ' + (dy * (1 - e)).toFixed(1) + 'px) scale(' + sc.toFixed(4) + ')');
    css(el.nameFx, 'opacity', box.w > 0 ? '1' : '0');

    // intro chrome
    css(el.eyebrow, 'opacity', '1');
    css(el.line, 'transform', 'scaleX(1)');
    css(el.sub, 'opacity', '1');
    css(el.sub, 'transform', 'translateY(0px)');

    if (!loadPlaying) {
      var cueO = 1 - seg(0, 0.1);
      css(el.cue, 'opacity', cueO.toFixed(3)); vis(el.cue, cueO);
      var urlO = mobile ? 0 : cueO;
      css(el.cueUrl, 'opacity', urlO.toFixed(3)); vis(el.cueUrl, urlO);
    }
    css(el.cueArrow, 'transform', 'translateY(' + (tick ? 6 : 0) + 'px)');
    var skipO = loadPlaying ? 1 : (reduced ? 0 : (1 - seg(0.2, 0.45)));
    css(el.skip, 'opacity', skipO.toFixed(3)); vis(el.skip, skipO);

    // hero fades
    fade(el.lede, 0.5, 0.78);
    fade(el.actions, 0.56, 0.84);
    fade(el.strip, 0.72, 1, 20);
    var roomO = out(seg(0.22, 0.55));
    css(el.roomWrap, 'opacity', roomO.toFixed(3));
    css(el.roomWrap, 'transform', 'translateY(' + (40 * (1 - roomO)).toFixed(1) + 'px) scale(' + (0.95 + 0.05 * roomO).toFixed(4) + ')');
    vis(el.roomWrap, roomO);
    if (!mobile) setNoteTarget(seg(0.62, 1));
    fade(el.topbar, 0.5, 0.82, mobile ? 0 : -12);
    fade(el.tabbar, 0.5, 0.82, mobile ? 0 : -12);

    // room reveals
    op(el.reveal.board, 0.36, 0.6);
    op(el.reveal.glow, 0.48, 0.7);
    op(el.reveal.lights, 0.52, 0.76);
    op(el.reveal.screen, 0.58, 0.8);
    op(el.reveal.notes, 0.6, 0.86);

    // active section
    if (S.active !== lastActive) {
      lastActive = S.active;
      navLinks.forEach(function (a) {
        var on = a.getAttribute('data-nav') === S.active;
        a.classList.toggle('is-active', on);
        if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
    }
  }

  /* ---------- once-per-load sequence ---------- */

  function nameLoadFrames() {
    return [
      { offset: 0, opacity: 0, filter: 'blur(3px)', transform: loadFlat },
      { offset: 550 / 2300, opacity: 0.45, filter: 'blur(0px)', transform: loadFlat },
      { offset: 750 / 2300, opacity: 0.45, filter: 'blur(0px)', transform: loadFlat, easing: 'cubic-bezier(0.3, 0, 0.1, 1)' },
      { offset: 1, opacity: 1, filter: 'blur(0px)', transform: 'matrix(1, 0, 0, 1, 0, 0) scale(1)' }
    ];
  }

  function placeLoadName() {
    var box = S.box, scale = startNameScale(box);
    var flatScale = Math.min(1, (S.W * 0.9) / (0.866 * (box.w + box.h) * scale));
    loadFlat = 'matrix(0.866, 0.5, -0.866, 0.5, 0, 0) scale(' + flatScale.toFixed(4) + ')';
    css(el.loadGhost, 'left', (S.W / 2) + 'px');
    css(el.loadGhost, 'top', (S.H / 2) + 'px');
    css(el.loadGhost, 'width', box.w + 'px');
    css(el.loadGhost, 'height', box.h + 'px');
    css(el.loadGhost, 'transform', 'translate(-50%, -50%) scale(' + scale + ')');
    css(loadGhostName, 'transform', loadFlat);
    if (loadNameAnimation) loadNameAnimation.effect.setKeyframes(nameLoadFrames());
  }

  function animateLoad(node, frames, duration, delay, easing, fill) {
    var animation = node.animate(frames, { duration: duration, delay: delay, easing: easing || 'linear', fill: fill || 'both' });
    animation.startTime = loadStart;
    loadAnimations.push(animation);
    return animation;
  }

  function finishLoad() {
    if (!loadPlaying) return;
    loadPlaying = false;
    ['wheel', 'touchstart', 'scroll', 'keydown'].forEach(function (type) { window.removeEventListener(type, finishLoad, true); });
    window.removeEventListener('click', skipLoad, true);
    css(el.cue, 'transition', 'none');
    css(el.cueUrl, 'transition', 'none');
    [el.loadQuery, el.loadFlash, el.loadRipple, el.loadGhost, el.loadResult, el.bgGlow].forEach(function (node) { css(node, 'opacity', '0'); });
    css(el.nameLoad, 'opacity', '1');
    css(el.nameLoad, 'transform', 'none');
    css(el.nameLoad, 'filter', 'none');
    css(el.bg, 'opacity', '1');
    css(el.bg, 'transform', 'none');
    css(el.bg, 'filter', 'none');
    loadAnimations.forEach(function (animation) { animation.cancel(); });
    loadAnimations = [];
    loadNameAnimation = null;
    root.classList.remove('load-playing');
    render();
    window.requestAnimationFrame(function () { window.requestAnimationFrame(function () {
      css(el.cue, 'transition', ''); css(el.cueUrl, 'transition', '');
    }); });
  }

  function skipLoad(ev) {
    if (!loadPlaying || !ev.target.closest || !ev.target.closest('#skipIntro')) return;
    ev.preventDefault();
    ev.stopPropagation();
    finishLoad();
  }

  function startLoad() {
    if (!el.nameLoad.animate || reduced || location.hash || scrollTop()) { finishLoad(); return; }
    loadGhostName = el.nameLoad.cloneNode(true);
    loadGhostName.removeAttribute('id');
    loadGhostName.className = 'load-ghost-name';
    all('[id]', loadGhostName).forEach(function (node) { node.removeAttribute('id'); });
    el.loadGhost.appendChild(loadGhostName);
    placeLoadName();
    renderFloor(0);
    css(el.bg, '--hole', '1');
    loadStart = doc.timeline.currentTime;
    animateLoad(el.loadQuery, [
      { offset: 0, opacity: 0, transform: 'scale(1)', filter: 'blur(0px)' },
      { offset: 450 / 2650, opacity: 1, transform: 'scale(1)', filter: 'blur(0px)' },
      { offset: 2150 / 2650, opacity: 1, transform: 'scale(1)', filter: 'blur(0px)', easing: 'cubic-bezier(0.6, 0, 0.9, 0.4)' },
      { offset: 1, opacity: 0, transform: 'scale(5)', filter: 'blur(10px)' }
    ], 2650, 0);
    animateLoad(el.loadQueryRun, [{ width: '0ch' }, { width: '19ch' }], 1300, 550, 'steps(19)');
    animateLoad(el.loadFlash, [{ opacity: 0 }, { offset: 350 / 1550, opacity: 1 }, { opacity: 0 }], 1550, 2200);
    animateLoad(el.loadVignette, [{ opacity: 0 }, { opacity: 1 }], 1100, 2200);
    var flight = animateLoad(el.bg, [
      { offset: 0, opacity: 0, transform: 'scale(7)' },
      { offset: 350 / 8300, opacity: 1, transform: 'scale(7)', easing: 'cubic-bezier(0.6, 0, 0.1, 1)' },
      { offset: 2400 / 8300, opacity: 1, transform: 'scale(1.07)' },
      { offset: 1, opacity: 1, transform: 'scale(1)' }
    ], 8300, 2200);
    // Clear before the flat-name hold so floor queries cannot cross its letters.
    animateLoad(el.bg, [{ '--hole': 1 }, { offset: 0.35, '--hole': 0 }, { '--hole': 0 }], 1000, 4500);
    loadNameAnimation = animateLoad(el.nameLoad, nameLoadFrames(), 2300, 4300);
    animateLoad(el.loadGhost, [{ opacity: 0 }, { offset: 200 / 2300, opacity: 0.32 }, { opacity: 0 }], 2300, 4950);
    animateLoad(el.loadRipple, [{ transform: 'scale(0.2)', opacity: 0.9 }, { transform: 'scale(9)', opacity: 0 }], 2000, 5050, 'cubic-bezier(0.15, 0.6, 0.2, 1)', 'forwards');
    animateLoad(el.bgGlow, [{ opacity: 0 }, { offset: 350 / 2200, opacity: 0.45 }, { opacity: 0 }], 2200, 5050);
    animateLoad(el.loadResult, [{ opacity: 0 }, { offset: 450 / 2550, opacity: 1 }, { offset: 1900 / 2550, opacity: 1 }, { opacity: 0 }], 2550, 6800);
    animateLoad(el.cue, [{ opacity: 0 }, { opacity: 1 }], 850, 7500);
    animateLoad(el.cueUrl, [{ opacity: 0 }, { opacity: 1 }], 850, 7500);
    flight.finished.then(finishLoad, function () {});
    ['wheel', 'touchstart', 'scroll', 'keydown'].forEach(function (type) { window.addEventListener(type, finishLoad, { passive: true, capture: true }); });
    window.addEventListener('click', skipLoad, true);
  }

  /* ---------- beat ---------- */

  function stageVisible() { return scrollTop() < S.introDist + S.H; }

  if (!reduced) {
    setInterval(function () {
      if (doc.hidden || !stageVisible()) return;
      S.beat += 1;
      schedule();
    }, 350);
  }

  /* ---------- navigation ---------- */

  function sectionTop(id) {
    var s = secs[id];
    return s ? s.getBoundingClientRect().top + scrollTop() - (S.mobile ? 56 : 64) : 0;
  }

  function go(id, instant) {
    var top = 0;
    if (id === 'home') top = S.introDist;
    else if (id !== 'top') top = sectionTop(id);
    finishLoad();
    schedule();
    var behavior = (reduced || instant) ? 'auto' : 'smooth';
    try { window.scrollTo({ top: top, behavior: behavior }); } catch (e) { window.scrollTo(0, top); }

    try {
      if (secs[id]) history.replaceState(null, '', '#' + id);
      else if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    } catch (e) {}

    if (secs[id] && !instant) {
      try { secs[id].focus({ preventScroll: true }); } catch (e) {}
    }
  }

  doc.addEventListener('click', function (ev) {
    var t = ev.target && ev.target.closest ? ev.target.closest('[data-go]') : null;
    if (!t) return;
    if (ev.defaultPrevented || ev.button > 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    ev.preventDefault();
    go(t.getAttribute('data-go'));
    var hobby = t.getAttribute('data-hobby');
    if (hobby) showHobby(hobby);
  });

  // Skip link: complete typing and focus the first section.
  var skipLink = doc.querySelector('.skip-link');
  if (skipLink) skipLink.addEventListener('click', function (ev) { ev.preventDefault(); go('me'); });

  /* ---------- show more toggles ---------- */

  // Labels come from the number of hidden items, so they stay right when items change.
  all('.more-btn').forEach(function (btn) {
    var list = byId(btn.getAttribute('aria-controls'));
    if (!list) return;
    var extras = all('.more', list);
    if (!extras.length) { btn.hidden = true; return; }
    function label(open) {
      return open ? btn.getAttribute('data-less') : btn.getAttribute('data-more').replace('{n}', extras.length);
    }
    btn.textContent = label(false);
    btn.addEventListener('click', function () {
      var open = !list.classList.contains('is-expanded');
      var before = btn.getBoundingClientRect().top;
      list.classList.toggle('is-expanded', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.textContent = label(open);
      if (open && !reduced) {
        extras.forEach(function (li, i) {
          li.classList.remove('is-revealing');
          void li.offsetWidth;
          li.style.animationDelay = (i * 90) + 'ms';
          li.classList.add('is-revealing');
        });
      }
      // Collapsing removes content above the button: keep the button where the reader's finger is.
      if (!open) {
        var after = btn.getBoundingClientRect().top;
        if (Math.abs(after - before) > 1) window.scrollBy(0, after - before);
      }
      schedule();
    });
  });

  /* ---------- hobby cards: chips, carousel pager, highlight ---------- */

  var hobbyWrap = doc.querySelector('.hobbies');
  var pager = byId('hobbyPager');
  var hint = byId('swipeHint');
  var pagerBtns = pager ? all('button', pager) : [];
  var hobbyCards = hobbyWrap ? all('.hobby', hobbyWrap) : [];

  function padLeft() {
    var v = 0;
    try { v = parseFloat(window.getComputedStyle(hobbyWrap).paddingLeft) || 0; } catch (e) {}
    return v;
  }
  function scrollCarouselTo(card) {
    if (!hobbyWrap || !card) return;
    var left = card.offsetLeft - padLeft();
    try { hobbyWrap.scrollTo({ left: left, behavior: reduced ? 'auto' : 'smooth' }); } catch (e) { hobbyWrap.scrollLeft = left; }
  }

  var carRaf = 0;
  function syncPager() {
    carRaf = 0;
    if (!hobbyWrap || !hobbyCards.length) return;
    var x = hobbyWrap.scrollLeft, pad = padLeft(), best = 0, bestD = Infinity;
    hobbyCards.forEach(function (card, i) {
      var d = Math.abs(card.offsetLeft - pad - x);
      if (d < bestD) { bestD = d; best = i; }
    });
    if (x > 4 && x + hobbyWrap.clientWidth >= hobbyWrap.scrollWidth - 4) best = hobbyCards.length - 1;
    pagerBtns.forEach(function (b, i) {
      if (i === best) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
    });
    if (hint) text(hint, best === hobbyCards.length - 1 ? '← swipe back' : 'swipe for more →');
  }
  if (hobbyWrap) {
    hobbyWrap.addEventListener('scroll', function () {
      if (!carRaf) carRaf = window.requestAnimationFrame(syncPager);
    }, { passive: true });
  }
  pagerBtns.forEach(function (b) {
    b.addEventListener('click', function () { scrollCarouselTo(byId('hobby-' + b.getAttribute('data-card'))); });
  });

  var flashT;
  function showHobby(key) {
    var card = byId('hobby-' + key);
    if (!card) return;
    if (S.mobile) scrollCarouselTo(card);
    clearTimeout(flashT);
    flashT = setTimeout(function () {
      card.classList.remove('is-flash');
      void card.offsetWidth;
      card.classList.add('is-flash');
    }, reduced ? 0 : 600);
  }
  hobbyCards.forEach(function (card) {
    card.addEventListener('animationend', function () { card.classList.remove('is-flash'); });
  });

  /* ---------- mini Kenn: greets visitors, talks to them, leans toward the cursor ----------
     Whenever a visitor is in the room view (the intro at least GREET_AT_P along, and the
     room not yet scrolled BACK_TO_WORK_AT of a screen away), he greets them (again, on
     every return), holds his waving posture and keeps talking: a new line every
     LINE_EVERY_MS. When they scroll on, he says bye and goes back to vibecoding.
     With a mouse he also leans toward a cursor within NEAR_PX of the room.
     Tapping him (or Tab + Enter) gets the next line right away. */

  var KENN_GREETING = 'oh hey! welcome to my room.';
  var KENN_WELCOME_BACK = 'oh, welcome back!';
  var KENN_LINES = [
    "I'm Kenn. building with AI, as usual.",
    'psst, my projects are just below ↓',
    "I'm looking for an OJT in web, backend or data.",
    'ask me about MySQL transactions. at your own risk.',
    'the whiteboards are where ideas get messy.',
    'free aircon: open window + the fan.',
    'my résumé is up in the corner ↗'
  ];
  var KENN_BYE = 'okay, back to my schema…';
  var GREET_AT_P = 0.5;         // the room view starts once the intro is this far along
  var BACK_TO_WORK_AT = 0.36;   // ...and ends once the room has scrolled this share of a screen away
  var REENTER_AT = 0.28;        // coming back up, he greets again once the room is back to here
  var LINE_EVERY_MS = 4500;     // a new line this often while the visitor is in the room view
  var NEAR_PX = 140;            // how close the cursor must get to the room for him to lean
  var HEAD = { x: 141.6, y: 219.9 };  // his head, in the room SVG's units

  var kenn = {
    fig: byId('kennFig'), hop: byId('kennHop'), talk: byId('kennTalk'),
    said: byId('kennSaid'), rest: byId('kennRest'), live: byId('kennLive'), hit: byId('kennHit'),
    fx: doc.querySelector('#room .room-fx')
  };
  var hasMouse = false;
  try { hasMouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches; } catch (e) {}

  var lineIdx = 0, kennOn = false, sayT = 0, hideT = 0, chatT = 0, saidAt = 0;
  var inRoom = false, visits = 0;
  var kennNear = false, pointer = null, pointerRaf = 0, look = null;  // look: lean toward the cursor, or null

  // Where is the visitor? Reads the scroll position directly (S.pTarget lags a frame).
  function introP() { return S.introDist ? scrollTop() / S.introDist : 1; }
  function roomAway() { return (scrollTop() - S.introDist) / S.H; }  // share of a screen scrolled past the intro
  function heroLive() { return introP() >= 0.98 && roomAway() < 0.5; }

  // announce: also tell screen readers (greetings and lines asked for by tapping him,
  // but not every automatic line, which would be tiring to listen to).
  function say(line, holdMs, announce) {
    if (!kenn.talk) return;
    clearTimeout(hideT); clearInterval(sayT);
    kennOn = true;
    saidAt = Date.now();
    el.room.classList.add('is-talking');
    kenn.talk.classList.add('is-on');
    if (announce) kenn.live.textContent = line;
    updatePose();
    if (reduced) { kenn.said.textContent = line; kenn.rest.textContent = ''; }
    else {
      // type it out; the untyped rest stays in place (transparent) so the bubble doesn't resize
      var i = 0;
      kenn.said.textContent = ''; kenn.rest.textContent = line;
      sayT = setInterval(function () {
        i += 1;
        kenn.said.textContent = line.slice(0, i); kenn.rest.textContent = line.slice(i);
        if (i >= line.length) clearInterval(sayT);
      }, 28);
    }
    keepOnScreen();
    if (holdMs) hideT = setTimeout(hush, holdMs);
  }
  // On narrow phones the bubble can run past the right edge: nudge it left.
  function keepOnScreen() {
    var bub = kenn.talk.firstElementChild;
    if (!bub) return;
    bub.style.transform = '';
    var over = bub.getBoundingClientRect().right - (root.clientWidth - 16);
    if (over > 0) bub.style.transform = 'translateX(' + (-Math.ceil(over)) + 'px)';
  }
  function hush() {
    clearTimeout(hideT); clearInterval(sayT);
    kennOn = false;
    if (kenn.talk) kenn.talk.classList.remove('is-on');
    el.room.classList.remove('is-talking');
    updatePose();
  }
  function nextLine() { var l = KENN_LINES[lineIdx % KENN_LINES.length]; lineIdx += 1; return l; }
  function chatter() {
    clearInterval(chatT);
    chatT = setInterval(function () { if (!doc.hidden) say(nextLine()); }, LINE_EVERY_MS);
  }

  function hop() {
    if (reduced || !kenn.hop) return;
    kenn.hop.classList.remove('is-hopping'); void kenn.hop.getBoundingClientRect(); kenn.hop.classList.add('is-hopping');
  }
  if (kenn.hop) kenn.hop.addEventListener('animationend', function () { kenn.hop.classList.remove('is-hopping'); });

  /* His pose: a body lean that pivots at the seat, easing toward a target picked by
     what's going on: a nearby cursor > the visitor while he talks > small idle sways. */
  var pose = 0, poseTarget = 0, poseRaf = 0, poseLast = 0, idlePose = 0, idleT = 0;
  var LEAN_TO_VISITOR = 0.2;
  var IDLE_SWAYS = [0, -0.08, 0.05, 0.12];

  function poseTick(ts) {
    var dt = poseLast ? Math.min(64, ts - poseLast) : 16;
    poseLast = ts;
    pose += (poseTarget - pose) * (1 - Math.exp(-dt / 170));
    if (Math.abs(poseTarget - pose) < 0.004) pose = poseTarget;
    css(kenn.fig, 'transform', 'translateX(' + (pose * 4).toFixed(2) + 'px) rotate(' + (pose * 7).toFixed(2) + 'deg)');
    if (pose !== poseTarget) poseRaf = window.requestAnimationFrame(poseTick);
    else { poseRaf = 0; poseLast = 0; }
  }
  function updatePose() {
    if (reduced || !kenn.fig) return;
    poseTarget = look !== null ? look : (kennOn ? LEAN_TO_VISITOR : idlePose);
    if (!poseRaf) poseRaf = window.requestAnimationFrame(poseTick);
  }
  function idleLoop() {
    clearTimeout(idleT);
    idleT = setTimeout(idleLoop, 2600 + Math.random() * 3000);
    if (doc.hidden || look !== null || kennOn || scrollTop() > S.introDist + S.H) return;
    var next = IDLE_SWAYS[Math.floor(Math.random() * IDLE_SWAYS.length)];
    idlePose = next === idlePose ? 0 : next;
    updatePose();
  }

  // Waving posture (the matched "waving" render): held while the visitor is in the room
  // view; outside it, a tap gives a brief wave.
  var waveT = 0;
  function setWaving(on) {
    clearTimeout(waveT);
    if (el.room) el.room.classList.toggle('is-waving', on);
  }
  function briefWave(ms) {
    if (inRoom || !el.room) return;
    setWaving(true);
    waveT = setTimeout(function () { el.room.classList.remove('is-waving'); }, ms);
  }

  function enterRoom() {
    inRoom = true;
    setWaving(true);
    hop();
    say(visits ? KENN_WELCOME_BACK : KENN_GREETING, 0, true);
    visits += 1;
    chatter();
  }
  function leaveRoom(downward) {
    inRoom = false;
    clearInterval(chatT);
    setWaving(false);
    if (downward) say(KENN_BYE, 1800); else hush();
  }
  var roomRaf = 0;
  function roomCheck() {
    roomRaf = 0;
    var p = introP(), away = roomAway();
    if (!inRoom) {
      if (p >= GREET_AT_P && away < REENTER_AT) enterRoom();
    } else if (p < GREET_AT_P - 0.1) {
      leaveRoom(false);
    } else if (away >= BACK_TO_WORK_AT) {
      leaveRoom(true);
    }
  }

  function setNear(v) {
    if (v === kennNear) return;
    kennNear = v;
    if (!v) { look = null; updatePose(); }
  }
  function pointerUpdate() {
    pointerRaf = 0;
    if (!kenn.fx || !el.room) return;
    if (!pointer || !heroLive() || doc.hidden) { setNear(false); return; }
    var r = el.room.getBoundingClientRect();
    var dx = Math.max(r.left - pointer.x, 0, pointer.x - r.right);
    var dy = Math.max(r.top - pointer.y, 0, pointer.y - r.bottom);
    var near = Math.sqrt(dx * dx + dy * dy) <= NEAR_PX;
    setNear(near);
    if (!near) return;
    var m = kenn.fx.getScreenCTM();
    var hx = m ? m.a * HEAD.x + m.e : r.left + r.width * 0.27;
    var nx = Math.max(-1, Math.min(1, (pointer.x - hx) / (r.width * 0.45)));
    look = nx * 0.9;
    updatePose();
  }
  function schedulePointer() { if (!pointerRaf) pointerRaf = window.requestAnimationFrame(pointerUpdate); }

  if (kenn.fig) {
    if (hasMouse) {
      window.addEventListener('pointermove', function (e) {
        if (e.pointerType && e.pointerType !== 'mouse') return;
        pointer = { x: e.clientX, y: e.clientY };
        schedulePointer();
      }, { passive: true });
      doc.documentElement.addEventListener('mouseleave', function () { pointer = null; schedulePointer(); });
      window.addEventListener('scroll', schedulePointer, { passive: true });
    }
    if (kenn.hit) {
      kenn.hit.addEventListener('click', function () {
        hop();
        briefWave(1600);
        if (kennOn && Date.now() - saidAt < 1000) return;  // he just started a line: don't cut it off
        say(nextLine(), inRoom ? 0 : 4200, true);
        if (inRoom) chatter();  // restart the rhythm from this line
      });
    }
    window.addEventListener('scroll', function () {
      if (!roomRaf) roomRaf = window.requestAnimationFrame(roomCheck);
    }, { passive: true });
    setTimeout(roomCheck, 1500);  // e.g. reduced motion, or a reload that lands on the room
    doc.addEventListener('visibilitychange', function () { if (doc.hidden) setNear(false); });
    if (!reduced) idleLoop();
  }

  /* ---------- thReady case study ---------- */

  var caseDialog = byId('threadyDialog');
  var caseContent = byId('caseContent');
  var caseButton = byId('openThready');
  var caseClose = byId('closeThready');
  var screenViewer = byId('screenViewer');
  var enlargeScreen = byId('enlargeScreen');
  var galleryImage = byId('galleryImage');
  var galleryThumbs = all('.gallery-thumb');
  var caseHash = '', caseScroll = 0, caseClosing = false;
  var caseRestoration = 'auto';
  var caseHasHistory = false;

  function openCase(fromHistory) {
    if (!caseDialog || caseDialog.open) return;
    finishLoad();
    var entry = fromHistory && history.state && history.state.threadyCaseStudy;
    caseHash = entry ? entry.hash : (location.hash === '#thready' ? '' : location.hash);
    caseScroll = entry ? entry.scroll : scrollTop();
    caseRestoration = history.scrollRestoration;
    history.scrollRestoration = 'manual';
    caseHasHistory = false;
    try {
      if (!entry) {
        if (location.hash === '#thready') history.replaceState(history.state, '', location.pathname + location.search + caseHash);
        history.pushState({ threadyCaseStudy: { hash: caseHash, scroll: caseScroll } }, '', '#thready');
      }
      caseHasHistory = true;
    } catch (e) {}
    caseClosing = false;
    root.classList.add('case-open');
    caseDialog.showModal();
    caseContent.scrollTop = 0;
    caseClose.focus({ preventScroll: true });
  }

  function hideCase() {
    if (!caseDialog || !caseDialog.open) return;
    if (screenViewer.open) screenViewer.close();
    caseDialog.close();
    root.classList.remove('case-open');
    caseClosing = false;
    window.scrollTo(0, caseScroll);
    caseButton.focus({ preventScroll: true });
    // History traversal can restore scroll after popstate has finished.
    window.requestAnimationFrame(function () {
      if (caseDialog.open) return;
      window.scrollTo(0, caseScroll);
      if (caseRestoration) history.scrollRestoration = caseRestoration;
      schedule();
    });
  }

  function closeCase() {
    if (!caseDialog.open || caseClosing) return;
    caseClosing = true;
    if (caseHasHistory && location.hash === '#thready') history.back();
    else {
      try { history.replaceState(history.state, '', location.pathname + location.search + caseHash); } catch (e) {}
      hideCase();
    }
  }

  function trapDialogFocus(ev) {
    if (ev.key !== 'Tab') return;
    var items = all('a[href], button:not([disabled]), [tabindex="0"]', ev.currentTarget).filter(function (node) { return node.getClientRects().length; });
    var first = items[0], last = items[items.length - 1];
    if (ev.shiftKey && doc.activeElement === first) { ev.preventDefault(); last.focus(); }
    else if (!ev.shiftKey && doc.activeElement === last) { ev.preventDefault(); first.focus(); }
  }

  function chooseScreen(index) {
    var thumb = galleryThumbs[index];
    var title = thumb.getAttribute('data-title');
    galleryImage.src = thumb.querySelector('img').getAttribute('src');
    galleryImage.alt = 'thReady ' + title + ' screen, with demo data';
    text(byId('galleryTitle'), title);
    text(byId('galleryCaption'), thumb.getAttribute('data-caption'));
    galleryThumbs.forEach(function (button) { button.setAttribute('aria-pressed', button === thumb ? 'true' : 'false'); });
  }

  if (caseDialog && caseButton) {
    caseButton.addEventListener('click', function () { openCase(false); });
    caseClose.addEventListener('click', closeCase);
    caseDialog.addEventListener('cancel', function (ev) { ev.preventDefault(); closeCase(); });
    caseDialog.addEventListener('keydown', trapDialogFocus);
    var backdropStart = false;
    function onBackdrop(ev) {
      var box = caseDialog.getBoundingClientRect();
      return ev.target === caseDialog && (ev.clientX < box.left || ev.clientX > box.right || ev.clientY < box.top || ev.clientY > box.bottom);
    }
    caseDialog.addEventListener('pointerdown', function (ev) { backdropStart = onBackdrop(ev); });
    caseDialog.addEventListener('click', function (ev) { if (backdropStart && onBackdrop(ev)) closeCase(); backdropStart = false; });
    window.addEventListener('popstate', function () {
      if (location.hash === '#thready') openCase(true);
      else hideCase();
    });
    byId('walkthrough').addEventListener('click', function (ev) { ev.preventDefault(); });
    galleryThumbs.forEach(function (thumb, index) {
      thumb.addEventListener('click', function () { chooseScreen(index); });
      thumb.addEventListener('keydown', function (ev) {
        var next = index;
        if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') next = (index + 1) % galleryThumbs.length;
        else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') next = (index + galleryThumbs.length - 1) % galleryThumbs.length;
        else return;
        ev.preventDefault();
        chooseScreen(next);
        galleryThumbs[next].focus({ preventScroll: true });
        var scroller = thumb.parentNode;
        scroller.scrollLeft = Math.max(0, galleryThumbs[next].offsetLeft - scroller.offsetLeft - 4);
      });
    });
    function syncEnlarge() { enlargeScreen.disabled = window.innerWidth >= 760; }
    syncEnlarge();
    window.addEventListener('resize', syncEnlarge);
    enlargeScreen.addEventListener('click', function () {
      var image = byId('fullScreenImage');
      image.src = galleryImage.src;
      image.alt = galleryImage.alt;
      screenViewer.showModal();
    });
    screenViewer.addEventListener('keydown', trapDialogFocus);
    byId('closeScreen').addEventListener('click', function () { screenViewer.close(); });
    screenViewer.addEventListener('close', function () { if (caseDialog.open) enlargeScreen.focus({ preventScroll: true }); });
  }

  /* ---------- small live touches: chat plays, test count, row count ---------- */

  var rowCount = byId('rowCount');
  if (rowCount) text(rowCount, String(all('.results tbody tr').length));

  function countUp(node) {
    var end = parseInt(node.getAttribute('data-count'), 10);
    if (!end) return;
    var t0 = 0, dur = 1400;
    function tick(ts) {
      if (!t0) t0 = ts;
      var k = Math.min(1, (ts - t0) / dur);
      node.textContent = Math.round(end * out(k)).toLocaleString('en-US');
      if (k < 1) window.requestAnimationFrame(tick);
    }
    window.requestAnimationFrame(tick);
  }

  function onceVisible(node, fn, scrollRoot) {
    var obs = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) { obs.disconnect(); fn(); return; }
      }
    }, { threshold: 0.6, root: scrollRoot || null });
    obs.observe(node);
  }

  if (!reduced && 'IntersectionObserver' in window) {
    var chat = doc.querySelector('.mini-chat');
    if (chat) {
      chat.classList.add('will-play');
      onceVisible(chat, function () { chat.classList.add('is-in'); });
    }
    var counter = byId('testCount');
    if (counter) {
      counter.classList.add('will-count');
      counter.textContent = '0';
      onceVisible(counter, function () { countUp(counter); }, caseContent);
    }
  }

  /* ---------- contact ---------- */

  var SUBJECT = 'Hi Kenn — from your portfolio';
  function updateMail() {
    if (!el.send) return;
    var msg = el.msg ? el.msg.value : '';
    el.send.href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(SUBJECT) + (msg ? '&body=' + encodeURIComponent(msg) : '');
  }
  if (el.msg) {
    el.msg.addEventListener('input', updateMail);
    el.msg.addEventListener('change', updateMail);
  }
  updateMail();

  var copyT;
  function copied() {
    text(el.copyLabel, 'Copied!');
    clearTimeout(copyT);
    copyT = setTimeout(function () { text(el.copyLabel, 'Copy email'); }, 2000);
  }
  function legacyCopy() {
    var ta = doc.createElement('textarea');
    ta.value = EMAIL;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.opacity = '0';
    doc.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = doc.execCommand('copy'); } catch (e) { ok = false; }
    doc.body.removeChild(ta);
    if (ok) copied();
  }
  if (el.copyBtn) {
    el.copyBtn.addEventListener('click', function () {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(EMAIL).then(copied, legacyCopy);
          return;
        }
      } catch (e) {}
      legacyCopy();
    });
  }

  /* ---------- local time ---------- */

  function updateTime() {
    if (!el.time) return;
    var t = '';
    try { t = new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' }); } catch (e) { t = ''; }
    text(el.time, t);
  }
  updateTime();
  setInterval(function () { if (!doc.hidden) updateTime(); }, 30000);

  /* ---------- room loops: pause when hidden or off screen ---------- */

  var roomOnScreen = true;
  function syncPause() {
    if (el.room) el.room.classList.toggle('is-paused', doc.hidden || !roomOnScreen);
    if (el.bg) el.bg.classList.toggle('is-paused', doc.hidden || !floorMotion);
    if ((doc.hidden || !floorMotion) && floorRaf) {
      window.cancelAnimationFrame(floorRaf);
      floorRaf = 0; floorLast = 0;
    } else if (!doc.hidden && floorMotion && !floorRaf && floorContext) {
      floorRaf = window.requestAnimationFrame(drawFloor);
    }
  }
  if ('IntersectionObserver' in window && el.room) {
    new IntersectionObserver(function (entries) {
      roomOnScreen = entries[entries.length - 1].isIntersecting;
      syncPause();
    }).observe(el.room);
  }
  doc.addEventListener('visibilitychange', function () { syncPause(); if (!doc.hidden) { updateTime(); schedule(); } });
  function changeFloorMotion(event) {
    floorMotion = !event.matches && !reduced;
    if (event.matches) finishLoad();
    syncPause();
  }
  if (motionQuery && motionQuery.addEventListener) motionQuery.addEventListener('change', changeFloorMotion);
  else if (motionQuery && motionQuery.addListener) motionQuery.addListener(changeFloorMotion);

  // Murmurs: three words float up from Kenn's mouth and fade, staggered.
  // (From assets/room-demo.html; the only change is the pause check.)
  (function () {
    var WORDS = ['hmm…', 'what if…', 'JOIN?', 'index it', 'okay okay', '{ … }', 'one more col', 'ship it', 'wait—', 'cache?'];
    var slots = Array.prototype.slice.call(document.querySelectorAll('.room .murmur'));
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var CYC = 9, beat = 0;
    function place(g, i, t, word) {
      var x = 106 - t * 8 + (i === 1 ? -4 : 0), y = 229 - t * 38;
      var o = Math.min(1, Math.min(1, t / 0.2) * (1 - t) * 1.15);
      g.style.transition = t === 0 ? 'none' : 'transform 350ms linear, opacity 350ms linear';
      g.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
      g.style.opacity = o;
      if (word) g.querySelector('text').textContent = word;
    }
    if (reduced) { slots.forEach(function (g, i) { place(g, i, [0.25, 0.55, 0.85][i]); }); return; }
    setInterval(function () {
      if (el.room && el.room.classList.contains('is-paused')) return;
      beat++;
      slots.forEach(function (g, i) {
        var k = beat + i * 3;
        place(g, i, (k % CYC) / CYC, WORDS[(Math.floor(k / CYC) * 3 + i * 4) % WORDS.length]);
      });
    }, 350);
  })();

  /* ---------- init ---------- */

  window.addEventListener('scroll', schedule, { passive: true });
  var resizeRaf = 0;
  window.addEventListener('resize', function () {
    if (resizeRaf) return;
    resizeRaf = window.requestAnimationFrame(function () { resizeRaf = 0; measure(false); });
  });
  window.addEventListener('orientationchange', function () { setTimeout(function () { measure(true); }, 150); });

  measure(true);
  if (loadPlaying) startLoad();

  // Deep links such as #certs (credentials.html redirects there): land under the top bar.
  var userScrolled = false;
  ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(function (t) {
    window.addEventListener(t, function () { userScrolled = true; }, { passive: true, once: true });
  });
  var hash = (location.hash || '').slice(1);
  function landOnHash() { if (secs[hash] && !userScrolled) go(hash, true); }
  if (secs[hash]) {
    if ('scrollRestoration' in history) { try { history.scrollRestoration = 'manual'; } catch (e) {} }
    landOnHash();
  }
  if (hash === 'thready') openCase(true);

  try {
    if (doc.fonts && doc.fonts.ready) {
      doc.fonts.ready.then(function () { measureFloor(S.W, S.H, true); measure(true); landOnHash(); });
    }
  } catch (e) {}
  window.addEventListener('load', function () { measure(true); landOnHash(); });
})();
