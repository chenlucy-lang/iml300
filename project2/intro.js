/* intro.js: swaps everything.png for everything2.png while the cursor is over the image.
   It only swaps if everything2.png actually loaded, so a wrong file name or folder
   can never leave you with a blank screen (check the browser console for a warning). */
(() => {
  const frame = document.querySelector('.intro .frame');
  const hoverImg = document.querySelector('.everything.hover');
  if (!frame || !hoverImg) return;

  const src = hoverImg.getAttribute('src');
  const warn = () =>
    console.warn(`intro.js: could not load "${src}". Check the file name, capitalization and folder.`);

  let ready = hoverImg.complete && hoverImg.naturalWidth > 0;
  if (hoverImg.complete && !ready) warn();

  hoverImg.addEventListener('load', () => { ready = true; });
  hoverImg.addEventListener('error', () => { ready = false; warn(); });

  const on = () => { if (ready) frame.classList.add('is-hover'); };
  const off = () => frame.classList.remove('is-hover');

  frame.addEventListener('pointerenter', on);
  frame.addEventListener('pointermove', on);   // also covers an image that finishes loading under the cursor
  frame.addEventListener('pointerleave', off);
  frame.addEventListener('pointercancel', off);
  addEventListener('blur', off);
})();