# Project case studies

All new projects must use the same **Card expansion** opening and closing transition as thReady. Extend and reuse the case-study controller and `animateCaseStudy` in `script.js`, with the `.case-study` motion rules in `style.css`, so projects share one behavior and timing source.

- Expand from the originating project card, fade in the backdrop, and reveal the content as the panel settles. Closing returns toward that card.
- Keep the shared opening and closing durations defined by `--case-open-duration` and `--case-close-duration`.
- Respect reduced motion with immediate show/hide. Open directly when a deep link has no visible originating card. Settle any running transition when the viewport changes.
- Preserve focus entry/trapping/return, background scroll lock, previous hash and scroll restoration, and dismissal by close button, Escape, backdrop and browser Back. Rapid closing or Back/Forward must leave the panel consistent with the URL.
- Verify the transition on desktop and mobile, including reduced motion and interrupted opening/closing, whenever adding a project case study.
