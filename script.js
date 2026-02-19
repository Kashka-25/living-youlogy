/* =============================================
   A LIVING YOULOGY — script.js
   ============================================= */

'use strict';

/* ─── VEIL LIFT ───────────────────────────────── */
window.addEventListener('load', () => {
  setTimeout(() => {
    const veil = document.getElementById('veil');
    if (veil) veil.classList.add('lifted');
  }, 400);
});

/* ─── CURSOR ──────────────────────────────────── */
const cursorGlow = document.getElementById('cursor-glow');
const cursorDot  = document.getElementById('cursor-dot');
const cursorRipple = document.getElementById('cursor-ripple');

let mouseX = 0, mouseY = 0;
let glowX  = 0, glowY  = 0;

document.addEventListener('mousemove', e => {
  mouseX = e.clientX;
  mouseY = e.clientY;

  if (cursorDot) {
    cursorDot.style.left = mouseX + 'px';
    cursorDot.style.top  = mouseY + 'px';
  }
});

// Smooth cursor glow (lagging behind)
function animateCursor() {
  glowX += (mouseX - glowX) * 0.06;
  glowY += (mouseY - glowY) * 0.06;

  if (cursorGlow) {
    cursorGlow.style.left = glowX + 'px';
    cursorGlow.style.top  = glowY + 'px';
  }

  requestAnimationFrame(animateCursor);
}
animateCursor();

// Ripple on click
document.addEventListener('click', e => {
  if (!cursorRipple) return;
  cursorRipple.style.left = e.clientX + 'px';
  cursorRipple.style.top  = e.clientY + 'px';
  cursorRipple.style.width  = '0px';
  cursorRipple.style.height = '0px';
  cursorRipple.style.opacity = '0.6';
  cursorRipple.style.animation = 'none';
  void cursorRipple.offsetWidth;
  cursorRipple.style.animation = 'rippleOut 0.7s ease-out forwards';
});

/* ─── PARTICLES ───────────────────────────────── */
const canvas = document.getElementById('particle-canvas');
const ctx    = canvas ? canvas.getContext('2d') : null;

let particles = [];
const PARTICLE_COUNT = 55;

function resizeCanvas() {
  if (!canvas) return;
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}

function randomParticle() {
  const types = ['dust', 'spark', 'mist'];
  const type  = types[Math.floor(Math.random() * types.length)];
  return {
    x:       Math.random() * (canvas?.width  || 800),
    y:       Math.random() * (canvas?.height || 600),
    r:       type === 'mist' ? Math.random() * 3 + 1 : Math.random() * 1.5 + 0.3,
    opacity: Math.random() * 0.25 + 0.04,
    vx:      (Math.random() - 0.5) * 0.25,
    vy:      -(Math.random() * 0.3 + 0.05),
    drift:   Math.random() * Math.PI * 2,
    driftSpeed: Math.random() * 0.008 + 0.003,
    life:    Math.random(),
    decay:   Math.random() * 0.0015 + 0.0005,
    type,
    hue:     Math.random() > 0.6
               ? `rgba(200,169,110,`
               : Math.random() > 0.5
               ? `rgba(201,74,122,`
               : `rgba(220,200,180,`,
  };
}

function initParticles() {
  if (!canvas) return;
  particles = Array.from({ length: PARTICLE_COUNT }, randomParticle);
}

function drawParticles() {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  particles.forEach((p, i) => {
    p.drift += p.driftSpeed;
    p.x += p.vx + Math.sin(p.drift) * 0.15;
    p.y += p.vy;
    p.life -= p.decay;

    const alpha = p.life * p.opacity;

    if (p.type === 'mist') {
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
      grad.addColorStop(0, `${p.hue}${alpha})`);
      grad.addColorStop(1, `${p.hue}0)`);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `${p.hue}${alpha})`;
      ctx.fill();
    }

    if (p.life <= 0 || p.y < -20) {
      particles[i] = randomParticle();
      particles[i].y = canvas.height + 20;
    }
  });

  requestAnimationFrame(drawParticles);
}

if (canvas) {
  resizeCanvas();
  initParticles();
  drawParticles();
  window.addEventListener('resize', () => {
    resizeCanvas();
    initParticles();
  });
}

/* ─── SCROLL REVEAL ───────────────────────────── */
const revealEls = document.querySelectorAll('.reveal');

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, {
  threshold: 0.12,
  rootMargin: '0px 0px -40px 0px',
});

revealEls.forEach(el => observer.observe(el));

/* ─── AMBIENT AUDIO (Web Audio API) ──────────── */
let audioCtx     = null;
let audioStarted = false;
let masterGain   = null;
let isMuted      = false;

const audioBtn    = document.getElementById('audio-btn');
const iconSound   = document.getElementById('icon-sound');
const iconMuted   = document.getElementById('icon-muted');

function buildAmbientAudio() {
  audioCtx  = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.setValueAtTime(0, audioCtx.currentTime);
  masterGain.gain.linearRampToValueAtTime(0.18, audioCtx.currentTime + 6);
  masterGain.connect(audioCtx.destination);

  // Layer 1: gentle noise (wind/breath)
  function makeNoise(freq, q, gainVal, type = 'lowpass') {
    const bufferSize = audioCtx.sampleRate * 4;
    const buffer     = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data       = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const src    = audioCtx.createBufferSource();
    src.buffer   = buffer;
    src.loop     = true;

    const filter = audioCtx.createBiquadFilter();
    filter.type            = type;
    filter.frequency.value = freq;
    filter.Q.value         = q;

    const gain = audioCtx.createGain();
    gain.gain.value = gainVal;

    src.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    src.start();
    return src;
  }

  makeNoise(200,  0.5, 0.12, 'lowpass');   // deep breath
  makeNoise(800,  0.3, 0.04, 'bandpass');  // high shimmer
  makeNoise(1500, 0.2, 0.02, 'highpass');  // airy hiss

  // Layer 2: soft drone tones
  const droneTones = [130.81, 164.81, 196.00, 261.63]; // C E G C
  droneTones.forEach((freq, i) => {
    const osc  = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const lfo  = audioCtx.createOscillator();
    const lfog = audioCtx.createGain();

    osc.type            = 'sine';
    osc.frequency.value = freq;

    lfo.type            = 'sine';
    lfo.frequency.value = 0.05 + i * 0.02;
    lfog.gain.value     = 0.003;

    lfo.connect(lfog);
    lfog.connect(osc.frequency);

    gain.gain.value = 0.04 - i * 0.005;

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    lfo.start();
  });

  // Layer 3: occasional soft bell ping
  function ping() {
    if (!audioCtx || audioCtx.state === 'closed') return;
    const osc  = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type            = 'sine';
    osc.frequency.value = [523.25, 659.25, 783.99, 1046.5][Math.floor(Math.random() * 4)];

    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.06, audioCtx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 4);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    osc.stop(audioCtx.currentTime + 4.5);

    const next = 6000 + Math.random() * 12000;
    setTimeout(ping, next);
  }

  setTimeout(ping, 8000);
}

function toggleAudio() {
  if (!audioStarted) {
    buildAmbientAudio();
    audioStarted = true;
    isMuted = false;
    showSoundIcon();
    return;
  }

  if (isMuted) {
    masterGain.gain.linearRampToValueAtTime(0.18, audioCtx.currentTime + 1.5);
    audioCtx.resume();
    isMuted = false;
    showSoundIcon();
  } else {
    masterGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.5);
    isMuted = true;
    showMutedIcon();
  }
}

function showSoundIcon() {
  if (iconSound)  iconSound.style.display  = 'block';
  if (iconMuted)  iconMuted.style.display  = 'none';
}

function showMutedIcon() {
  if (iconSound)  iconSound.style.display  = 'none';
  if (iconMuted)  iconMuted.style.display  = 'block';
}

if (audioBtn) audioBtn.addEventListener('click', toggleAudio);

/* ─── RSVP HOVER EFFECT ───────────────────────── */
const seal = document.querySelector('.rsvp-seal');
if (seal) {
  seal.addEventListener('mouseenter', () => {
    seal.style.cursor = 'none';
    if (cursorDot) cursorDot.style.background = 'var(--rose-glow)';
  });
  seal.addEventListener('mouseleave', () => {
    if (cursorDot) cursorDot.style.background = 'var(--gold)';
  });
}
