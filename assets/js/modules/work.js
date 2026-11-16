/* Selected work: a floating preview card follows the cursor over the list
   (desktop), and each row draws its own thumbnail on phones. */
(function (App) {
  'use strict';

  const rows = App.$$('.row a');
  const preview = App.$('#preview');
  if (!rows.length || !preview) return;

  const PREVIEW_W = 600, PREVIEW_H = 420, THUMB = 176;      // canvas pixel sizes (2x the CSS size)
  const OFFSET_X = 56, OFFSET_Y = -105;                     // card position relative to the cursor

  const previewCtx = App.$('canvas', preview).getContext('2d');
  const caption = App.$('.cap', preview);
  const thumbs = rows.map(a => ({ key: a.dataset.art, ctx: App.$('.r-thumb', a).getContext('2d'), view: App.inView(a) }));
  /* same conditions as work.css: thumbnails show on narrow screens, the card needs a wide one with hover */
  const narrow = matchMedia('(max-width: 820px)');
  const noCard = matchMedia('(max-width: 820px), (hover: none)');

  /* one place decides which row (if any) the card shows */
  let activeRow = null;
  function show(row) {
    if (row === activeRow) return;
    activeRow = row;
    if (row) caption.textContent = row.dataset.caption;
    preview.classList.toggle('on', !!row);
  }

  rows.forEach(a => {
    a.addEventListener('pointerenter', () => show(a));
    a.addEventListener('pointerleave', () => { if (activeRow === a) show(null); });
  });

  /* the pointer leaving the window also closes it */
  document.documentElement.addEventListener('mouseleave', () => show(null));

  const CLOSE_MS = 600;   // the card keeps following while its closing wipe plays (work.css: .55s)
  let px = 0, py = 0, closedAt = -1e9, wasOpen = false;
  App.onFrame(t => {
    const time = App.reduce ? 0 : t;
    const f = App.frame;

    /* Scrolling moves rows under a still mouse without firing pointerleave/enter, so the
       card stayed open. core.js re-checks what is under the pointer on scrolled frames. */
    if (f.scrolled && App.pointer.active && f.under) show(f.under.closest('.row a'));

    if (!noCard.matches) {
      const now = performance.now();
      if (wasOpen && !activeRow) closedAt = now;
      // on opening after a rest, start at the pointer instead of flying in from where it last closed
      if (activeRow && !wasOpen && now - closedAt > CLOSE_MS) { px = App.pointer.x + OFFSET_X; py = App.pointer.y + OFFSET_Y; }
      wasOpen = !!activeRow;
      if (activeRow || now - closedAt < CLOSE_MS) {
        px += (App.pointer.x + OFFSET_X - px) * .14;
        py += (App.pointer.y + OFFSET_Y - py) * .14;
        preview.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px)`;
      }
      if (activeRow) App.drawArt(previewCtx, activeRow.dataset.art, time, PREVIEW_W, PREVIEW_H);
    }

    // thumbnails only exist on narrow screens, and only the ones on screen are drawn
    if (narrow.matches) thumbs.forEach(th => { if (th.view.on) App.drawArt(th.ctx, th.key, time, THUMB, THUMB); });
  });
})(window.MAE);
