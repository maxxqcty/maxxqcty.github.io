/* Reveal: elements with .reveal fade and slide up as they scroll into view, and
   elements that arrive together (the rows of a list) cascade one after another.
   They are fully visible without this script; it only adds motion.

   Only what is still below the screen is hidden (.wait) to be animated in later.
   Anything already on screen at load, or above it after a reload part-way down,
   is left alone, so nothing can end up invisible. motion.css holds the animation. */
(function (App) {
  'use strict';

  if (App.reduce || !('IntersectionObserver' in window)) return;

  const STAGGER = 70, MAX_STEPS = 6;   // ms between items arriving together; cap so long lists do not drag
  let first = true;

  const io = new IntersectionObserver(entries => {
    const vh = innerHeight;
    let n = 0;
    entries.forEach(e => {
      const el = e.target;
      if (first && !e.isIntersecting) {
        if (e.boundingClientRect.top >= vh) el.classList.add('wait');   // below the screen: animate in later
        else io.unobserve(el);                                           // above it: already read
        return;
      }
      if (!e.isIntersecting) return;
      io.unobserve(el);
      // on screen at load: only what sits in the lower half animates, the rest is simply there
      if (!el.classList.contains('wait') && e.boundingClientRect.top <= vh * .5) return;
      el.style.setProperty('--d', Math.min(n++, MAX_STEPS) * STAGGER + 'ms');
      el.classList.remove('wait');
      el.classList.add('in');
      App.onReveal?.(el);
    });
    first = false;
  }, { threshold: .05 });

  App.$$('.reveal').forEach(el => io.observe(el));
})(window.MAE);
