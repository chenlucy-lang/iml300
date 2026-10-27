//I copy and pasted this code, in similar formats, throughout every single JS page 
//In a nutshell, this file: 
//Shows a full-screen pictures that slides a tiny bit as you move the mouse
//Plays a music file, if applicable
//shows lines of text one at a time 
//After the last line, it fades out and goes to the next segment 

// Wrap everything in a function that runs right away. Keeps the variable names private so they can't clash with anything else on the page.
(() => {

 const IMAGE_SRC = 'fire.png';

  // Customizable settings
  //How far the picture can slide
  const DISTANCE = 0.012;
  // How quickly the picture catches up to your mouse. Higher = snappier.
  const EASE = 25;
  // false = picture follows the mouse. true = picture moves the opposite way.
  const INVERT = false;
  // Zoom in a little so the edges never show when the picture slides.
  const ZOOM = 1.03;

  // Canvas

  // Making  <canvas>, an empty rectangle we can draw the picture onto.
  const canvas = document.createElement('canvas');
  // Style it with code instead of CSS: (I chose to do this because I didn’t like how CSS split the image into quadrants…it didn’t give me the result that I wanted) 
  Object.assign(canvas.style, {
    position: 'fixed',      // stays in place, even if the page scrolls
    inset: '0',             // stretch to all four edges of the window
    width: '100%',          // full width
    height: '100%',         // full height
    zIndex: '0',            // stacking order: sits at the back layer
    pointerEvents: 'none',  // clicks pass through it to the page underneath
    display: 'block',       // avoids a small gap sometimes added under canvases
  });
  // Put the canvas at the very start of <body> so it is behind the text.
  document.body.prepend(canvas);

  // Get the "pen" we use to draw on the canvas (2D drawing tools).
  const ctx = canvas.getContext('2d');
  // Pictures bigger than this (in pixels) get shrunk once, so drawing stays smooth.
  const MAX_SIDE = 4096;

  // The picture we are drawing from. Empty until the file has loaded.
  let source = null;
  let ready = false;

  // Sizes the canvas to match the window. Runs at start and when the window resizes.
  function layout() {

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
    // Set the canvas width in real pixels.
  canvas.width = Math.round(window.innerWidth * dpr);
    // Set the canvas height in real pixels.
  canvas.height = Math.round(window.innerHeight * dpr);
  // Resizing the canvas resets its settings, so turn smoothing back on...
    ctx.imageSmoothingEnabled = true;
    // ...and ask for the best-quality smoothing.
    ctx.imageSmoothingQuality = 'high';
  }


  // Create an image object (not on the page yet; just loading the file).
  const img = new Image();
  // Runs once the file has finished loading.
  img.onload = () => {
    // The picture's real size in pixels.
    const w = img.naturalWidth, h = img.naturalHeight;
    source = img;
//this is for if the image is too big…code resizes
    if (Math.max(w, h) > MAX_SIDE) {
      const k = MAX_SIDE / Math.max(w, h);
      // Make a second, hidden canvas to hold a smaller copy.
      const c = document.createElement('canvas');
      //shrunk width
      c.width = Math.round(w * k);
      //and shrunk height.
      c.height = Math.round(h * k);
      // Paint the picture onto it at the smaller size.
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      // Use the small copy from now on.
      source = c;
    }
    // Tell the animation it can start drawing.
    ready = true;
    // Size the canvas for the first time.
    layout();
  };
//AI generated for debugging
  // Runs if the picture can't be found. Prints a helpful message in the console (F12).
  img.onerror = () => console.error(
    '1c.js: could not load image "' + IMAGE_SRC + '" (looked for ' + img.src + '). ' +
    'Check the file name, capitalisation and that it is in the same folder as 1c.html.');
  // Start loading the file. (Do this last, after onload/onerror are set up.)
  img.src = IMAGE_SRC;

  // Re-size the canvas whenever the window changes size.
  window.addEventListener('resize', layout);
  // Also size it right now, before the picture has loaded.
  layout();

  //Mouse Tracking

  //Where the mouse is, from -1 (left/top) to 1 (right/bottom). 0,0 is the centre.
  //"target" is where the mouse is; "cur" is where the picture currently is.
  const target = { x: 0, y: 0 };
  const cur = { x: 0, y: 0 };

  // Converts a pixel position on screen into that -1 to 1 range.
  function setTarget(clientX, clientY) {
    // Horizontal: 0 to width becomes -1 to 1.
    target.x = (clientX / window.innerWidth) * 2 - 1;
    // Vertical: 0 to height becomes -1 to 1.
    target.y = (clientY / window.innerHeight) * 2 - 1;
  }
  // Every time the mouse moves, record where it is.
  window.addEventListener('mousemove', e => setTarget(e.clientX, e.clientY));
  // Same for a finger dragging on a touchscreen.
  window.addEventListener('touchmove', e => {
    // Use the first finger that is touching.
    const t = e.touches[0]; if (t) setTarget(t.clientX, t.clientY);
    //tells browser we won't block scrolling, which keeps it smooth.
  }, { passive: true });

  //Draws the frame 

  // Draws the picture, shifted by (offX, offY) as a fraction of the picture size.
  function draw(offX, offY) {
    // The picture's width and height.
    const iw = source.width, ih = source.height;
    // Its shape: width divided by height.
    const imgAspect = iw / ih;
    // The screen's shape, the same way.
    const screenAspect = canvas.width / canvas.height;

    //Work out how much of the picture fits the screen so it fills it with no
    //empty bars (like CSS "object-fit: cover"), then shrink that slice by ZOOM
    //so we are zoomed in slightly. fx is the width fraction, fy the height fraction (retaining the most)
    const fx = (screenAspect > imgAspect ? 1 : screenAspect / imgAspect) / ZOOM;
    const fy = (screenAspect > imgAspect ? imgAspect / screenAspect : 1) / ZOOM;

    // The slice's width and height, in picture pixels.
    const sw = fx * iw, sh = fy * ih;
    // The slice's top-left corner: start centred (0.5), then shift by the offset.
    const sx = (0.5 + offX) * iw - sw / 2;
    const sy = (0.5 + offY) * ih - sh / 2;

    //Fill the canvas with black first (shows through transparent parts of the png). (I wanted a fade in from black)
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Copy the slice of the picture and stretch it to fill the whole canvas.
    ctx.drawImage(source, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  }

  //the audio I want it to play 

  //the exact file
  const AUDIO_SRC = 'carn.mp3';
  // true = repeat forever, until the page changes.
  const AUDIO_LOOP = true;
  // How long the fade-in takes, in milliseconds (1400 = 1.4 seconds).
  const AUDIO_FADE_IN_MS = 1400;
  // Create the audio player and load the file.
  const audio = new Audio(AUDIO_SRC);
  // Apply the loop setting.
  audio.loop = AUDIO_LOOP;
  // Start downloading the file right away so it is ready.
  audio.preload = 'auto';
  // Start silent (0 = mute, 1 = full volume); we fade it up later.
  audio.volume = 0;

  //Has the music started? Is a start attempt in progress? Is it fading out?
  let audioStarted = false;
  let audioPending = false;
  let audioFading = false;

  //Slowly raises the volume from 0 to full over `ms` milliseconds. (I also wanted a subtle fade, so it's not too jarring for the user)
  function fadeInAudio(ms) {
    // Remember when the fade began.
    const t0 = performance.now();
    // Run the code below every 30 milliseconds.
    const timer = setInterval(() => {
      // If a fade-out has started, stop fading in.
      if (audioFading) { clearInterval(timer); return; }
      // Progress from 0 (just started) to 1 (finished).
      const p = Math.min(1, (performance.now() - t0) / ms);
      //Set the volume to match the progress.
      audio.volume = p;
      //When done, stop the timer.
      if (p >= 1) clearInterval(timer);
    }, 30);
  }

  //Tries to start the music.
  function startAudio() {
    // Do nothing if it is already playing, trying, or fading out.
    if (audioStarted || audioPending || audioFading) return;
    // Note that we are mid-attempt, so we don't try twice at once.
    audioPending = true;
    //Ask the browser to play-->returns promise
    const p = audio.play();
    // Newer browsers return a promise, so check that it exists.
    if (p && p.then) {
      // If playing worked: note it, then fade the volume in.
      p.then(() => { audioStarted = true; audioPending = false; fadeInAudio(AUDIO_FADE_IN_MS); })
       // If the browser refused, don't worry: we'll try again on the next
       // mouse move or click. (Browsers often block sound until you interact.)
       .catch(() => { audioPending = false; });
    } else {
      //Very old browsers: assume it worked and fade in. (??? I don't know what this is)
      audioStarted = true; audioPending = false; fadeInAudio(AUDIO_FADE_IN_MS);
    }
  }

  // Try to start the music whenever the mouse moves, a finger drags, or a click happens.
  window.addEventListener('mousemove', startAudio);
  window.addEventListener('touchmove', startAudio, { passive: true });
  window.addEventListener('click', startAudio);
  // Also try immediately. This works only if the browser allows it.
  startAudio();

  // Slowly lowers the volume to 0 over `ms` milliseconds, then stops the music.
  function fadeOutAudio(ms) {
    // Mark that we are fading out, so movement can't restart the music.
    audioFading = true;
    // Remember the current volume to fade down from.
    const startVol = audio.volume;
    // Remember when the fade began.
    const t0 = performance.now();
    // Run every 30 milliseconds.
    const timer = setInterval(() => {
      // Progress from 0 to 1.
      const p = Math.min(1, (performance.now() - t0) / ms);
      // Volume falls as progress rises.
      audio.volume = startVol * (1 - p);
      // When finished, stop the timer and pause the music.
      if (p >= 1) { clearInterval(timer); audio.pause(); }
    }, 30);
  }

  // Remember the time of the previous frame.
  let lastT = performance.now();
  //A function that runs once, immediately, and then keeps re-running every frame.
  (function frame(now) {
    //Ask the browser to call this again for the next frame (about 60 times a second).
    requestAnimationFrame(frame);
    //If the picture hasn't loaded yet, skip drawing.
    if (!ready) return;
    //On the very first call "now" may be missing, so fall back to the clock.
    now = now || performance.now();
    // Seconds since the last frame, capped at 0.05 so a lag spike can't cause a jump.
    const dt = Math.min(0.05, (now - lastT) / 1000);
    // Remember this frame's time for next round.
    lastT = now;

    // How much of the remaining gap to close this frame
    const k = 1 - Math.exp(-EASE * dt);
    // Move the picture's position a fraction of the way toward the mouse.
    cur.x += (target.x - cur.x) * k;
    cur.y += (target.y - cur.y) * k;

    // Which direction to shift. Showing a slice of the picture on the opposite
    // side of the mouse makes the picture appear to follow it.
    const dir = INVERT ? 1 : -1;
    // Draw the picture with the current shift.
    draw(dir * cur.x * DISTANCE, dir * cur.y * DISTANCE);
  })(performance.now());

  //most of my text is on the html file, but i need this part of the code to control when and how they appear
  //The words live in the HTML file. This code only controls when they appear.

  //Collect every element with class "line" (each is one screen of text).
  const lines = Array.from(document.querySelectorAll('.line'));
  // Find an element that says where to go next (data-next="..." in the HTML).
  const holder = document.querySelector('[data-next]');
  // Use that page, or "1d.html" if none is specified.
  const NEXT_PAGE = (holder && holder.dataset.next) || '1d.html';

  // Only do any of this if the page actually has text lines.
  if (lines.length) {
    // How long a fade takes. It is read from the CSS so it's set in one place.
    // Falls back to 1.4 seconds. Multiplied by 1000 to get milliseconds.
    const fadeMs = (parseFloat(getComputedStyle(lines[0]).transitionDuration) || 1.4) * 1000;
    // Which line we are on (0 = the first).
    let index = 0;
    // "busy" blocks clicks while a fade is happening.
    let busy = true;

    // Fade in line number i.
    function show(i) {
      // Block clicks during the fade.
      busy = true;
      // The CSS class "is-visible" makes the line visible (your CSS needs a rule for it).
      lines[i].classList.add('is-visible');
      // After the fade finishes, allow clicks again.
      setTimeout(() => (busy = false), fadeMs);
    }

    //Runs on each click: fade out the current line, then show the next one.
    function advance() {
      //Ignore clicks that happen mid-fade (so that no part of the story gets skipped)
      if (busy) return;
      // Is this the final line?
      const isLast = index === lines.length - 1;
      // If it's the last line and there's nowhere to go, do nothing.
      if (isLast && !NEXT_PAGE) return;
      // Block clicks during the fade.
      busy = true;
      // Fade the current line out.
      lines[index].classList.remove('is-visible');
      // On the last line, fade the music out too.
      if (isLast) fadeOutAudio(fadeMs);
      //Wait for the fade-out to finish, then continue.
      setTimeout(() => {
        // Move to the next line.
        index++;
        // If there is another line, show it.
        if (index < lines.length) show(index);
        else {
          try {
            sessionStorage.setItem('danceAudio', JSON.stringify({ t: audio.currentTime, playing: audioStarted }));
          } catch (e) {}
          //Go to the next page
          window.location.href = NEXT_PAGE;
        }
      }, fadeMs);
    }

    //Call advance() every time the page is clicked.
    window.addEventListener('click', advance);
    //First line will automatically appear after 0.4 seconds (gives users time to admire the background before their attention goes to the text)
    setTimeout(() => show(0), 400);
  }
})();
