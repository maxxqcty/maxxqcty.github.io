/* ==========================================================================
   Motion: small interactive touches. Each block is independent and follows the
   performance rules in core.js: measure on layout or on pointerenter, never per
   frame; animate only transform-type properties; do nothing while at rest.
   - split words  big statements rise word by word when they scroll into view
   - scramble     section labels decode from random characters as they appear
   - magnets      buttons and icon links lean toward the pointer
   - tilt         film posters and album covers tilt under the pointer, with a glare
   - nav          the header link for the section you are in is underlined
   All of it is switched off with reduced motion (the nav underline stays).
   ========================================================================== */
(function (App) {
  'use strict';

  const fine = matchMedia('(hover: hover) and (pointer: fine)');

  /* ---------- nav: mark the section in view ---------- */
  (function nav() {
    const links = App.$$('.nav a[href^="#"]').map(a => ({ a, el: App.$(a.getAttribute('href')), top: 0 })).filter(l => l.el);
    if (!links.length) return;
    let pageEnd = 0, current = null;
    App.onLayout(() => {
      links.forEach(l => { l.top = l.el.getBoundingClientRect().top + scrollY; });
      pageEnd = document.documentElement.scrollHeight - innerHeight;
    });
    App.onFrame(() => {
      const f = App.frame;
      if (!f.scrolled) return;
      // a section counts as current once its top passes 45% of the way down the screen
      const line = f.scrollY + f.vh * .45;
      let now = null;
      for (const l of links) if (l.top <= line) now = l;
      if (f.scrollY >= pageEnd - 2 && f.scrollY > 0) now = links[links.length - 1];
      if (now === current) return;
      if (current) { current.a.classList.remove('is-current'); current.a.removeAttribute('aria-current'); }
      if (now) { now.a.classList.add('is-current'); now.a.setAttribute('aria-current', 'true'); }
      current = now;
    });
  })();

  if (App.reduce) return;

  /* ---------- split words ---------- */
  App.$$('.split').forEach(el => {
    let i = 0;
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 1) return walk(n);
        if (n.nodeType !== 3 || !n.textContent.trim()) return;
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) return frag.appendChild(document.createTextNode(part));
          const outer = document.createElement('span'), inner = document.createElement('span');
          outer.className = 'w';
          inner.textContent = part;
          inner.style.setProperty('--w', i++);
          outer.appendChild(inner);
          frag.appendChild(outer);
        });
        n.replaceWith(frag);
      });
    };
    walk(el);
  });

  /* ---------- scramble: called by reveal.js when an element animates in ---------- */
  const GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789/<>[]{}';
  function scramble(el) {
    const text = el.textContent, STEPS = 16;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const solved = text.length * step / STEPS;
      el.textContent = step >= STEPS ? text : [...text].map((ch, i) =>
        i < solved || !/[a-z0-9]/i.test(ch) ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]).join('');
      if (step >= STEPS) clearInterval(timer);
    }, 45);
  }
  App.onReveal = el => {
    const label = el.matches('.sec-head') && App.$('.label', el);
    if (label) scramble(label);
  };

  if (!fine.matches) return;   // the rest needs a mouse

  /* ---------- magnets ---------- */
  (function magnets() {
    const PULL_X = .22, PULL_Y = .3, EASE = .18;
    const live = new Map();   // element -> { x, y, tx, ty, cx, cy }
    App.$$('.btn, .icon-link, .theme-btn').forEach(el => {
      el.addEventListener('pointerenter', () => {
        const s = live.get(el) || { x: 0, y: 0, tx: 0, ty: 0 };
        const r = el.getBoundingClientRect();
        s.cx = r.left + r.width / 2 - s.x; s.cy = r.top + r.height / 2 - s.y;   // resting centre
        live.set(el, s);
      });
      el.addEventListener('pointermove', e => {
        const s = live.get(el);
        if (s) { s.tx = (e.clientX - s.cx) * PULL_X; s.ty = (e.clientY - s.cy) * PULL_Y; }
      });
      el.addEventListener('pointerleave', () => { const s = live.get(el); if (s) s.tx = s.ty = 0; });
    });
    App.onFrame(() => {
      if (!live.size) return;
      // scrolling carries the element away from where it was measured: let it go
      if (App.frame.scrolled) live.forEach(s => { s.tx = s.ty = 0; });
      live.forEach((s, el) => {
        s.x += (s.tx - s.x) * EASE; s.y += (s.ty - s.y) * EASE;
        if (!s.tx && !s.ty && Math.abs(s.x) + Math.abs(s.y) < .05) { el.style.translate = ''; live.delete(el); return; }
        el.style.translate = `${s.x.toFixed(2)}px ${s.y.toFixed(2)}px`;
      });
    });
  })();

  /* ---------- tilt ---------- */
  App.$$('.media-card').forEach(card => {
    const art = App.$('.media-art', card);
    if (!art) return;
    const MAX = 9;   // degrees
    let r = null;
    card.addEventListener('pointerenter', () => { r = art.getBoundingClientRect(); });
    card.addEventListener('pointermove', e => {
      if (!r) return;
      const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      art.style.transform = `perspective(700px) translateY(-4px) rotateX(${((.5 - py) * 2 * MAX).toFixed(1)}deg) rotateY(${((px - .5) * 2 * MAX).toFixed(1)}deg)`;
      art.style.setProperty('--gx', (px * 100).toFixed(0) + '%');
      art.style.setProperty('--gy', (py * 100).toFixed(0) + '%');
    });
    card.addEventListener('pointerleave', () => { r = null; art.style.transform = ''; });
  });
})(window.MAE);
