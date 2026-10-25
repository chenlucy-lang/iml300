// intro.js: a p5 sketch. Blurred text that focuses on hover (ice.mp3 plays while you hover), and "press SPACE to continue".

const TEXT = 'everything is made for you';
const NEXT_PAGE = '1a.html';
const DELAY = 2;          // seconds before the SPACE prompt appears (and SPACE starts working)
const FADE_MS = 600;      // fade to black before leaving

let ice;
let blurAmt = 0.16;       // current blur, in em (0.16 = fully blurred, 0 = sharp)
let over = false;         // is the mouse over the text?
let vol = 0;              // current volume of ice.mp3 (fades in and out)
let leaveStart = null;    // set when SPACE is pressed

function setup() {
  createCanvas(windowWidth, windowHeight).style('display', 'block');
  textAlign(CENTER, CENTER);

  ice = createAudio('ice.mp3');
  ice.elt.loop = true;    // keeps playing for as long as you hover
}

function draw() {
  background('#000013');

  // Main text: blurred until the mouse is over it
  const size = width * 0.032;
  textFont('Times New Roman');
  textStyle(BOLD);
  textSize(size);

  over =
    abs(mouseX - width / 2) < textWidth(TEXT) / 2 + 2 * size &&
    abs(mouseY - height / 2) < 1.8 * size;
  blurAmt = lerp(blurAmt, over ? 0 : 0.16, 0.1);

  // Sound: plays while the mouse is over the text, fades out when it leaves
  vol = lerp(vol, over ? 1 : 0, 0.15);
  ice.elt.volume = constrain(vol, 0, 1);
  if (over && ice.elt.paused) {
    ice.elt.play().catch(() => console.warn('ice.mp3 is blocked until you click the page once.'));
  }
  if (!over && vol < 0.01 && !ice.elt.paused) {
    ice.elt.pause();
    ice.elt.currentTime = 0;
  }

  drawingContext.filter = `blur(${blurAmt * size * pixelDensity()}px)`;
  drawingContext.shadowColor = '#000a5c';
  drawingContext.shadowBlur = size * 0.3 * pixelDensity();
  noStroke();
  fill('#f9a537');
  text(TEXT, width / 2, height / 2);
  drawingContext.filter = 'none';
  drawingContext.shadowBlur = 0;

  // "press SPACE to continue" fades in after DELAY seconds
  const a = constrain(millis() / 1000 - DELAY, 0, 1);
  if (a > 0) {
    textFont('Georgia');
    textStyle(NORMAL);
    textSize(constrain(width * 0.011, 12, 20));
    fill(232, 201, 143, a * 255);
    text('press SPACE to continue', width / 2, height * 0.88);
  }

  // Fade to black, then go to the next page
  if (leaveStart !== null) {
    const k = (millis() - leaveStart) / FADE_MS;
    fill(0, constrain(k, 0, 1) * 255);
    rect(0, 0, width, height);
    if (k >= 1) window.location.href = NEXT_PAGE;
  }
}

function keyPressed() {
  if (key === ' ') {
    if (millis() > DELAY * 1000 && leaveStart === null) leaveStart = millis();
    return false;         // keeps SPACE from scrolling the page
  }
}

function mousePressed() {
  // Browsers only allow sound after a click. This "unlocks" it silently so hovering works.
  ice.elt.play().then(() => { if (!over) ice.elt.pause(); }).catch(() => {});
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}