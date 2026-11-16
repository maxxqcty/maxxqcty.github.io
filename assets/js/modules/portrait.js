/* Portrait parallax: the photo and the accent disc drift in opposite
   directions with the cursor. Uses the `translate` property so it never
   fights the CSS load animation, which uses `transform`. */
(function (App) {
  'use strict';

  const img = App.$('#portraitImg');
  const disc = App.$('.portrait .disc');
  if (!img || !disc || App.reduce) return;

  let px = 0, py = 0;
  const view = App.inView(img);

  App.onFrame(() => {
    if (!App.pointer.active || !view.on) return;
    const tx = App.pointer.x / App.frame.vw - .5;
    const ty = App.pointer.y / App.frame.vh - .5;
    if (Math.abs(tx - px) + Math.abs(ty - py) < .0005) return;   // settled: nothing to move
    px += (tx - px) * .06;
    py += (ty - py) * .06;
    img.style.translate = `${(px * 14).toFixed(2)}px ${(py * 8).toFixed(2)}px`;
    disc.style.translate = `${(px * -22).toFixed(2)}px ${(py * -14).toFixed(2)}px`;
  });
})(window.MAE);
