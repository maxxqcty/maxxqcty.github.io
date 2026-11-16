/* ==========================================================================
   Core: shared state and one animation loop that every module plugs into.
   Loaded first (after the vendored Lenis). Modules attach themselves to window.MAE.

   Plain scripts (not ES modules) on purpose: ES modules are blocked when
   index.html is opened straight from disk, and this site should work by
   double-clicking it.

   Performance rules the modules follow:
   - never measure the page (getBoundingClientRect, offsetWidth...) inside a
     frame handler: measure in an onLayout handler and cache the result
   - read scroll position and viewport size from App.frame, not from window
   - skip the frame when nothing the module shows has changed
   ========================================================================== */
(function () {
  'use strict';

  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* pointer position in viewport pixels; `active` stays false until the mouse first moves */
  const pointer = { x: -9999, y: -9999, active: false };
  let pendingMove = false, pendingScroll = true, pendingTheme = false, pendingLayout = true;
  addEventListener('pointermove', e => {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true; pendingMove = true;
  }, { passive: true });
  addEventListener('scroll', () => { pendingScroll = true; }, { passive: true });

  /* theme colours for canvas drawing, cached and re-read when the theme changes */
  let tokens = null;
  const readTokens = () => {
    const cs = getComputedStyle(root), get = n => cs.getPropertyValue(n).trim();
    tokens = { ink: get('--ink'), paper: get('--paper'), paper2: get('--paper-2'), accent: get('--accent') };
  };
  const themeChanged = () => { tokens = null; pendingTheme = true; };
  new MutationObserver(themeChanged).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', themeChanged);

  /* smooth scrolling (Lenis, vendored in assets/js/vendor). Wheel, anchor links and the
     scroll ruler all glide through it. Touch keeps native scrolling. With reduced motion,
     or if the library is missing, everything falls back to native scrolling. */
  let lenis = null;
  if (!reduce && typeof window.Lenis === 'function') {
    try { lenis = new window.Lenis({ autoRaf: false, anchors: true }); } catch (e) { lenis = null; }
  }

  /* layout signal: anything that can move or resize page content asks modules to re-measure.
     Handlers run together at the start of the next frame, in registration order. */
  const layoutHandlers = [];
  const layoutChanged = () => { pendingLayout = true; };
  addEventListener('resize', layoutChanged);
  addEventListener('load', layoutChanged);
  document.fonts?.ready?.then(layoutChanged);
  // the font stylesheet loads late (non-blocking), so faces can arrive after `ready` first resolved
  document.fonts?.addEventListener?.('loadingdone', layoutChanged);
  // page height changes without a resize: images loading, the message box growing
  if ('ResizeObserver' in window) new ResizeObserver(layoutChanged).observe(document.body);

  /* per-frame state, refreshed once before the handlers run. The three flags are true
     for the single frame after the event they name. */
  const frame = {
    scrollY: window.scrollY, vw: innerWidth, vh: innerHeight,
    scrolled: true,   // the page scrolled, or its layout changed
    moved: false,     // the pointer moved
    themed: false,    // the colour theme changed
    under: null,      // element under the pointer, re-checked on scrolled frames
  };

  /* one requestAnimationFrame loop; modules register a callback that receives seconds since start */
  const frameHandlers = [];

  window.MAE = {
    root,
    reduce,
    pointer,
    frame,
    lenis,
    $: (sel, ctx = document) => ctx.querySelector(sel),
    $$: (sel, ctx = document) => [...ctx.querySelectorAll(sel)],
    tokens: () => tokens || (readTokens(), tokens),
    onFrame: fn => { frameHandlers.push(fn); },
    onLayout: fn => { layoutHandlers.push(fn); },
    /* { on } stays true while the element is on screen (always true without IntersectionObserver) */
    inView(el) {
      const state = { on: true };
      if (el && 'IntersectionObserver' in window) {
        new IntersectionObserver(entries => { state.on = entries[entries.length - 1].isIntersecting; }).observe(el);
      }
      return state;
    },
    /* scroll the page: glides with Lenis unless `immediate`; instant without Lenis */
    scrollTo(y, opts = {}) {
      if (lenis) lenis.scrollTo(y, opts);
      else window.scrollTo({ top: y, behavior: 'instant' });
    },
    start() {
      const t0 = performance.now();
      const tick = now => {
        requestAnimationFrame(tick);
        if (lenis) lenis.raf(now);

        if (pendingLayout) {
          pendingLayout = false; pendingScroll = true;
          frame.vw = innerWidth; frame.vh = innerHeight;
          frame.scrollY = window.scrollY;
          for (const fn of layoutHandlers) fn();
        }
        const y = window.scrollY;
        frame.scrolled = pendingScroll || y !== frame.scrollY;
        frame.scrollY = y;
        frame.moved = pendingMove;
        frame.themed = pendingTheme;
        pendingScroll = pendingMove = pendingTheme = false;
        /* Scrolling slides content under a still mouse without firing pointerenter/leave,
           so hover has to be re-checked. Done here, before any handler writes styles,
           so the lookup never forces a layout. */
        if (frame.scrolled && pointer.active) frame.under = document.elementFromPoint(pointer.x, pointer.y);

        // the first frame's timestamp can be earlier than t0, so clamp: negative time broke modulo-based animations
        const t = Math.max(0, (now - t0) / 1000);
        for (const fn of frameHandlers) fn(t);
      };
      requestAnimationFrame(tick);
    },
  };
})();
