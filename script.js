/* John Kenneth Moscosa — portfolio
   Ported from design/Me2.dc.html (measure, nameFx, fade, seg, out, io).
   Window scrolling drives the intro: p = scrollY / introDist. */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var TOTAL = 19;
  var L1 = 'John Kenneth', L2 = 'Moscosa';
  var SECS = ['me', 'projects', 'skills', 'certs', 'log', 'contact'];
  var EMAIL = 'moscosajohnkenneth1@gmail.com';

  var reduced = false;
  try { reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}
  var coarse = false;
  try { coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches); } catch (e) {}

  function byId(id) { return doc.getElementById(id); }
  function all(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }

  var el = {
    track: byId('introTrack'),
    stage: byId('stage'),
    nameBox: byId('nameBox'),
    nameFx: byId('nameFx'),
    eyebrow: byId('eyebrow'),
    line: byId('eyebrowLine'),
    dotsWrap: byId('typingDots'),
    t1: byId('typed1'), r1: byId('rest1'), c1: byId('caret1'),
    t2: byId('typed2'), r2: byId('rest2'), c2: byId('caret2'),
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

  el.dots = el.dotsWrap ? all('span', el.dotsWrap) : [];
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
    typed: reduced ? TOTAL : 0,
    p: reduced ? 1 : 0,
    pTarget: reduced ? 1 : 0,
    beat: 0,
    introIn: reduced,
    active: null
  };

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
    node.style[prop] = val;
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

    css(el.stage, 'height', H + 'px');
    css(el.track, 'height', (H + S.introDist) + 'px');
    if (el.msg) el.msg.rows = S.mobile ? 2 : 3;

    var sr = el.stage.getBoundingClientRect();
    var nr = el.nameBox.getBoundingClientRect();
    S.box = { x: nr.left - sr.left, y: nr.top - sr.top, w: nr.width, h: nr.height };

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
    if (S.pTarget > 0.03 && S.typed < TOTAL) finishTyping();
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

  var lastActive;
  function render() {
    var mobile = S.mobile, W = S.W, H = S.H;
    var n = S.typed;
    var typing = n < TOTAL;
    var tick = Math.floor(S.beat / 2) % 2 === 0;

    // name: centred and scaled at p = 0, settles into its slot by p = 0.6
    var box = S.box || { x: 0, y: 0, w: 0, h: 0 };
    var e = io(seg(0.03, 0.6));
    var s0 = 1;
    if (box.w > 0) s0 = mobile ? Math.min(1.06, (W * 0.9) / box.w) : Math.min(1.2, (W * 0.64) / box.w, (H * 0.42) / box.h);
    var dx = W / 2 - (box.x + box.w / 2);
    var dy = H / 2 - (box.y + box.h / 2);
    var sc = s0 + (1 - s0) * e;
    css(el.nameFx, 'transform', 'translate(' + (dx * (1 - e)).toFixed(1) + 'px, ' + (dy * (1 - e)).toFixed(1) + 'px) scale(' + sc.toFixed(4) + ')');
    css(el.nameFx, 'opacity', box.w > 0 ? '1' : '0');

    // typing
    var k1 = Math.min(n, 12), k2 = Math.max(0, n - 12);
    text(el.t1, L1.slice(0, k1)); text(el.r1, L1.slice(k1));
    text(el.t2, L2.slice(0, k2)); text(el.r2, L2.slice(k2));
    css(el.c1, 'display', n < 12 ? 'inline-block' : 'none');
    css(el.c2, 'display', n >= 12 ? 'inline-block' : 'none');
    var caretO = (typing || tick) ? '1' : '0';
    css(el.c1, 'opacity', caretO);
    css(el.c2, 'opacity', caretO);

    // intro chrome
    css(el.eyebrow, 'opacity', S.introIn ? '1' : '0');
    css(el.line, 'transform', 'scaleX(' + (S.introIn ? 1 : 0) + ')');
    css(el.dotsWrap, 'opacity', (S.introIn && n === 0) ? '1' : '0');
    var phase = S.beat % 3;
    for (var i = 0; i < el.dots.length; i++) css(el.dots[i], 'opacity', phase === i ? '1' : '0.3');
    css(el.sub, 'opacity', typing ? '0' : '1');
    css(el.sub, 'transform', 'translateY(' + (typing ? 8 : 0) + 'px)');

    var cueO = typing ? 0 : (1 - seg(0, 0.1));
    css(el.cue, 'opacity', cueO.toFixed(3)); vis(el.cue, cueO);
    var urlO = mobile ? 0 : cueO;
    css(el.cueUrl, 'opacity', urlO.toFixed(3)); vis(el.cueUrl, urlO);
    css(el.cueArrow, 'transform', 'translateY(' + (tick ? 6 : 0) + 'px)');
    var skipO = reduced ? 0 : (1 - seg(0.2, 0.45));
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

  /* ---------- typing + beat ---------- */

  var startT, typeT, beatT;
  function finishTyping() {
    S.typed = TOTAL;
    clearTimeout(startT);
    clearInterval(typeT);
  }

  function stageVisible() { return scrollTop() < S.introDist + S.H; }

  if (!reduced) {
    setTimeout(function () { S.introIn = true; schedule(); }, 150);
    startT = setTimeout(function () {
      typeT = setInterval(function () {
        if (S.typed >= TOTAL) { clearInterval(typeT); return; }
        S.typed += 1;
        schedule();
      }, 80);
    }, 1500);
    beatT = setInterval(function () {
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
    finishTyping();
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

  /* ---------- mini Kenn: leans toward a nearby cursor and talks to visitors ----------
     Mouse: he wakes when the cursor comes within NEAR_PX of the room, leans toward it
     and says a line every few seconds; he says bye when it leaves.
     Touch: he greets once after the intro; tapping him gets the next line. */

  var KENN_LINES = [
    'oh hey! welcome to my room.',
    "I'm Kenn. vibecoding, as usual.",
    'psst, my projects are just below ↓',
    "I'm looking for an OJT in web, backend or data.",
    'ask me about MySQL transactions. at your own risk.',
    'the whiteboards are where ideas get messy.',
    'free aircon: open window + the fan.',
    'my résumé is up in the corner ↗'
  ];
  var KENN_BYE = 'okay, back to my schema…';
  var NEAR_PX = 140;            // how close the cursor must get to the room
  var LINE_EVERY_MS = 4500;     // a new line this often while the cursor stays near
  var HEAD = { x: 141.6, y: 219.9 };  // his head, in the room SVG's units

  var kenn = {
    fig: byId('kennFig'), hop: byId('kennHop'), talk: byId('kennTalk'),
    said: byId('kennSaid'), rest: byId('kennRest'), live: byId('kennLive'), hit: byId('kennHit'),
    fx: doc.querySelector('#room .room-fx')
  };
  var hasMouse = false;
  try { hasMouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches; } catch (e) {}

  var lineIdx = 0, kennNear = false, kennOn = false, sayT = 0, hideT = 0, nextT = 0, greeted = false, saidAt = 0;
  var lean = 0, leanTarget = 0, leanRaf = 0, leanLast = 0;
  var pointer = null, pointerRaf = 0;

  function heroLive() { return S.pTarget >= 0.98 && scrollTop() < S.introDist + S.H * 0.5; }

  function say(line, holdMs) {
    if (!kenn.talk) return;
    clearTimeout(hideT); clearInterval(sayT);
    kennOn = true;
    saidAt = Date.now();
    el.room.classList.add('is-talking');
    kenn.talk.classList.add('is-on');
    kenn.live.textContent = line;
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
  }
  function nextLine() { var l = KENN_LINES[lineIdx % KENN_LINES.length]; lineIdx += 1; return l; }

  function hop() {
    if (reduced || !kenn.hop) return;
    kenn.hop.classList.remove('is-hopping'); void kenn.hop.getBoundingClientRect(); kenn.hop.classList.add('is-hopping');
  }
  if (kenn.hop) kenn.hop.addEventListener('animationend', function () { kenn.hop.classList.remove('is-hopping'); });

  function leanTick(ts) {
    var dt = leanLast ? Math.min(64, ts - leanLast) : 16;
    leanLast = ts;
    lean += (leanTarget - lean) * (1 - Math.exp(-dt / 140));
    if (Math.abs(leanTarget - lean) < 0.002) lean = leanTarget;
    css(kenn.fig, 'transform', 'translateX(' + (lean * 2.5).toFixed(2) + 'px) rotate(' + (lean * 5).toFixed(2) + 'deg)');
    if (lean !== leanTarget) leanRaf = window.requestAnimationFrame(leanTick);
    else { leanRaf = 0; leanLast = 0; }
  }
  function setLean(t) {
    if (reduced) return;
    leanTarget = t;
    if (!leanRaf && lean !== leanTarget) leanRaf = window.requestAnimationFrame(leanTick);
  }

  function setNear(v, quiet) {
    if (v === kennNear) return;
    kennNear = v;
    clearInterval(nextT);
    if (v) {
      say(nextLine());
      nextT = setInterval(function () { say(nextLine()); }, LINE_EVERY_MS);
    } else {
      setLean(0);
      if (quiet) hush(); else if (kennOn) say(KENN_BYE, 1600);
    }
  }

  function pointerUpdate() {
    pointerRaf = 0;
    if (!kenn.fx || !el.room) return;
    if (!pointer || !heroLive() || doc.hidden) { setNear(false, !heroLive()); return; }
    var r = el.room.getBoundingClientRect();
    var dx = Math.max(r.left - pointer.x, 0, pointer.x - r.right);
    var dy = Math.max(r.top - pointer.y, 0, pointer.y - r.bottom);
    var near = Math.sqrt(dx * dx + dy * dy) <= NEAR_PX;
    setNear(near);
    if (!near) return;
    var m = kenn.fx.getScreenCTM();
    var hx = m ? m.a * HEAD.x + m.e : r.left + r.width * 0.27;
    setLean(Math.max(-1, Math.min(1, (pointer.x - hx) / 260)));
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
        if (hasMouse) pointerUpdate();  // the cursor may have only just arrived: greet first
        hop();
        if (kennOn && Date.now() - saidAt < 1000) return;  // he just started a line: don't cut it off
        say(nextLine(), kennNear ? 0 : 4200);
        if (kennNear) {
          clearInterval(nextT);
          nextT = setInterval(function () { say(nextLine()); }, LINE_EVERY_MS);
        }
      });
    }
    // Touch devices have no cursor: greet once when the hero first settles.
    if (!hasMouse) {
      var checkGreet = function () {
        if (greeted || !heroLive()) { if (kennOn && !heroLive()) hush(); return; }
        greeted = true;
        setTimeout(function () { if (heroLive()) { hop(); say(nextLine(), 4200); } }, 700);
      };
      window.addEventListener('scroll', checkGreet, { passive: true });
      setTimeout(checkGreet, 1500);  // e.g. reduced motion, where the hero is settled on load
    }
    doc.addEventListener('visibilitychange', function () { if (doc.hidden) setNear(false, true); });
  }

  /* ---------- small live touches: chat plays, test count, row count ---------- */

  var rowCount = byId('rowCount');
  if (rowCount) text(rowCount, String(all('.results tbody tr').length));

  function countUp(node) {
    var end = parseInt(node.getAttribute('data-count'), 10);
    var suffix = node.getAttribute('data-suffix') || '';
    if (!end) return;
    var t0 = 0, dur = 1400;
    function tick(ts) {
      if (!t0) t0 = ts;
      var k = Math.min(1, (ts - t0) / dur);
      node.textContent = Math.round(end * out(k)) + suffix;
      if (k < 1) window.requestAnimationFrame(tick);
    }
    window.requestAnimationFrame(tick);
  }

  function onceVisible(node, fn) {
    var obs = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) { obs.disconnect(); fn(); return; }
      }
    }, { threshold: 0.6 });
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
      counter.textContent = '0' + (counter.getAttribute('data-suffix') || '');
      onceVisible(counter, function () { countUp(counter); });
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
  }
  if ('IntersectionObserver' in window && el.room) {
    new IntersectionObserver(function (entries) {
      roomOnScreen = entries[entries.length - 1].isIntersecting;
      syncPause();
    }).observe(el.room);
  }
  doc.addEventListener('visibilitychange', function () { syncPause(); if (!doc.hidden) { updateTime(); schedule(); } });

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

  try {
    if (doc.fonts && doc.fonts.ready) {
      doc.fonts.ready.then(function () { measure(true); landOnHash(); });
    }
  } catch (e) {}
  window.addEventListener('load', function () { measure(true); landOnHash(); });
})();
