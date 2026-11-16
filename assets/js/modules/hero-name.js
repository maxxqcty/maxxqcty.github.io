/* Hero name: splits the heading into letters (words stay unbreakable) and
   makes each letter heavier and narrower as the cursor comes near. */
(function (App) {
  'use strict';

  const name = App.$('#name');
  if (!name) return;

  const RADIUS = 380;   // px: how far the cursor's influence reaches
  const EASE = .15;     // how quickly letters follow (0-1)

  const words = name.textContent.trim().split(/\s+/);
  name.textContent = '';
  let index = 0;
  words.forEach((word, wi) => {
    const wrap = document.createElement('span');
    wrap.className = 'word';
    wrap.setAttribute('aria-hidden', 'true'); // the h1 keeps an aria-label with the full name
    for (const c of word) {
      const ch = document.createElement('span');
      ch.className = 'ch';
      ch.textContent = c;
      ch.style.setProperty('--i', index++);
      wrap.appendChild(ch);
    }
    name.appendChild(wrap);
    if (wi < words.length - 1) name.appendChild(document.createTextNode(' '));
  });

  const letters = App.$$('.ch', name);
  const weight = letters.map(() => 0);
  const written = letters.map(() => 300 * 1000 + 85);   // last "wght, wdth" pair written (the CSS resting values)
  const cx = letters.map(() => 0), cy = letters.map(() => 0);   // letter centres in page coordinates
  const view = App.inView(name);
  let easing = false;

  /* Letter centres are measured once per layout change, at their resting weight, and
     cached. Measuring every frame forced a full layout per letter per frame. Offsets
     (not client rects) are used so the load animation's transform is ignored. */
  App.onLayout(() => {
    const saved = letters.map(ch => ch.style.fontVariationSettings);
    letters.forEach(ch => { ch.style.fontVariationSettings = ''; });
    const box = name.getBoundingClientRect();
    const left = box.left + scrollX - name.offsetLeft, top = box.top + scrollY - name.offsetTop;
    letters.forEach((ch, i) => {
      cx[i] = left + ch.offsetLeft + ch.offsetWidth / 2;
      cy[i] = top + ch.offsetTop + ch.offsetHeight / 2;
    });
    letters.forEach((ch, i) => { ch.style.fontVariationSettings = saved[i]; });
  });

  App.onFrame(() => {
    const f = App.frame;
    // nothing to do while the name is off screen, or while every letter has settled and nothing moved
    if (!view.on || !(easing || f.moved || f.scrolled)) return;
    const x = App.pointer.x, y = App.pointer.y + f.scrollY;
    easing = false;
    for (let i = 0; i < letters.length; i++) {
      const target = Math.max(0, 1 - Math.hypot(x - cx[i], y - cy[i]) / RADIUS);
      weight[i] += (target - weight[i]) * EASE;
      if (Math.abs(target - weight[i]) > .002) easing = true; else weight[i] = target;
      // weight moves in steps of 10 (invisible at this size): every distinct value is a new font
      // instance for the browser to shape with, and a few dozen cache far better than five hundred
      const k = Math.round(weight[i] * 50) / 50, wght = Math.round(300 + k * 500), wdth = Math.round(85 - k * 10);
      const key = wght * 1000 + wdth;
      if (key === written[i]) continue;
      written[i] = key;
      letters[i].style.fontVariationSettings = `"wght" ${wght}, "wdth" ${wdth}, "opsz" 96`;
    }
  });
})(window.MAE);
