/* intro.js: swaps everything.png for everything2.png while the cursor is over the image.
   It only swaps if everything2.png actually loaded, so a wrong file name or folder
   can never leave you with a blank screen (check the browser console for a warning).

   It also shows a "press SPACE to continue" prompt at the bottom of the screen after a delay. */
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

/* "press SPACE to continue": built and styled here, so intro.html needs nothing for it.
   Once the prompt is showing, pressing SPACE fades to black and goes to the next page. */
(() => {
  const DELAY = 2;                         // seconds to wait before it appears
  const TEXT = 'press SPACE to continue';
  const NEXT_PAGE = '1a.html';             // where SPACE takes you
  const FADE_MS = 600;                     // fade-to-black time before leaving

  const style = document.createElement('style');
  style.textContent = `
    .space-prompt {
      position: fixed;
      left: 50%;
      bottom: 12vh;                        /* bigger number = higher up */
      transform: translateX(-50%);
      z-index: 10;
      white-space: nowrap;
      font-family: Georgia, "Times New Roman", serif;
      font-size: clamp(12px, 1.1vw, 20px);  /* smaller numbers = smaller text */
      letter-spacing: 0.08em;
      color: #e8c98f;
      text-shadow: 0 0 12px rgba(232, 201, 143, 0.45);
      pointer-events: none;
      user-select: none;
      animation: space-prompt-in 1s ease-out both;
    }
    @keyframes space-prompt-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    .space-fade {
      position: fixed;
      inset: 0;
      z-index: 100;
      background: #000;
      opacity: 0;
      pointer-events: none;
      transition: opacity ${FADE_MS}ms ease-in;
    }
  `;
  document.head.appendChild(style);

  let ready = false;     // SPACE only works once the prompt is on screen
  let leaving = false;

  setTimeout(() => {
    const prompt = document.createElement('div');
    prompt.className = 'space-prompt';
    prompt.textContent = TEXT;
    document.body.appendChild(prompt);
    ready = true;
  }, DELAY * 1000);

  addEventListener('keydown', (e) => {
    if (e.code !== 'Space') return;
    e.preventDefault();                    // stops the page from scrolling
    if (!ready || leaving || e.repeat) return;
    leaving = true;

    const fade = document.createElement('div');
    fade.className = 'space-fade';
    document.body.appendChild(fade);
    fade.getBoundingClientRect();          // makes sure the fade starts from transparent
    fade.style.opacity = 1;

    setTimeout(() => { location.href = NEXT_PAGE; }, FADE_MS);
  });
})();