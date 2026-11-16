/* ==========================================================================
   Loader: decides when the loading curtain (loader.css) leaves. Loaded right
   after the curtain's markup, without `defer`, so it is in control at once.

   The logo's build animation always plays in full (BUILD_MS). After that the
   curtain leaves as soon as the page has finished loading; while it waits the
   V breathes. A slow page is let through after MAX_MS, so the curtain can never
   hold the site hostage.

   window.MAE_shown resolves when the page becomes visible; core.js exposes it
   as App.whenShown() so load-time effects (stat count-up, ruler ticks) start then.
   ========================================================================== */
(function () {
  'use strict';

  const root = document.documentElement;
  const el = document.querySelector('.loader');
  let shown;
  window.MAE_shown = new Promise(resolve => { shown = resolve; });
  if (!el || !root.classList.contains('loading')) { root.classList.remove('loading'); shown(); return; }

  const BUILD_MS = 1400;    // the logo's build animation (loader.css), plus a beat to take it in
  const MAX_MS = 5000;      // longest the curtain may stay
  const REVEAL_MS = 620;    // into the exit: the lime has filled the screen and the lift is under way
  const DONE_MS = 1400;     // exit finished: the curtain is off screen

  let built = false, ready = document.readyState === 'complete', left = false;
  const leave = () => {
    if (left || !built || !ready) return;
    left = true;
    el.classList.remove('is-waiting');
    root.classList.add('loaded');                                            // diamond grows, curtain lifts
    setTimeout(() => { root.classList.remove('loading'); shown(); }, REVEAL_MS);   // page intro starts under it
    setTimeout(() => { el.remove(); root.classList.remove('loaded'); }, DONE_MS);
  };

  addEventListener('load', () => { ready = true; leave(); });
  setTimeout(() => { built = true; if (!ready) el.classList.add('is-waiting'); leave(); }, BUILD_MS);
  setTimeout(() => { built = ready = true; leave(); }, MAX_MS);
})();
