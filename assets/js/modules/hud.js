/* HUD: page coordinates of the cursor (bottom left).
   The scroll position lives in the scroll ruler (scroll-ruler.js). */
(function (App) {
  'use strict';

  const coords = App.$('#coords');
  if (!coords) return;

  const pad = n => String(Math.max(0, Math.round(n))).padStart(4, '0');
  let shown = '';

  App.onFrame(() => {
    const f = App.frame;
    if (!f.moved && !f.scrolled) return;
    const text = `X ${pad(App.pointer.x)} · Y ${pad(App.pointer.y + f.scrollY)}`;
    if (text !== shown) coords.textContent = shown = text;
  });
})(window.MAE);
