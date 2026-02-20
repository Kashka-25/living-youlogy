'use strict';

// ── VEIL ──
window.addEventListener('load', () => {
  setTimeout(() => {
    const veil = document.getElementById('veil');
    if (veil) veil.classList.add('lifted');
  }, 300);
});

// ── CURSOR ──
const cGlow = document.getElementById('cursor-glow');
const cDot  = document.getElementById('cursor-dot');
let mx=0, my=0, gx=0, gy=0;

document.addEventListener('mousemove', e => {
  mx = e.clientX; my = e.clientY;
  if (cDot) { cDot.style.left=mx+'px'; cDot.style.top=my+'px'; }
});

(function animCursor() {
  gx += (mx-gx)*0.06; gy += (my-gy)*0.06;
  if (cGlow) { cGlow.style.left=gx+'px'; cGlow.style.top=gy+'px'; }
  requestAnimationFrame(animCursor);
})();

// ── PARTICLES ──
const canvas = document.getElementById('particle-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;
let particles = [];
const COUNT = 55;

function resize() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function newParticle() {
  const hues = ['rgba(200,169,110,','rgba(201,74,122,','rgba(220,200,180,'];
  const h = hues[Math.floor(Math.random()*hues.length)];
  const isMist = Math.random() > 0.6;
  return {
    x: Math.random()*(canvas?.width||800),
    y: Math.random()*(canvas?.height||600),
    r: isMist ? Math.random()*3+1 : Math.random()*1.4+0.3,
    op: Math.random()*0.22+0.04,
    vx: (Math.random()-0.5)*0.22,
    vy: -(Math.random()*0.28+0.05),
    drift: Math.random()*Math.PI*2,
    ds: Math.random()*0.008+0.003,
    life: Math.random(),
    decay: Math.random()*0.0015+0.0005,
    mist: isMist,
    hue: h
  };
}

function drawParticles() {
  if (!ctx||!canvas) return;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  particles.forEach((p,i) => {
    p.drift += p.ds;
    p.x += p.vx + Math.sin(p.drift)*0.14;
    p.y += p.vy;
    p.life -= p.decay;
    const a = p.life * p.op;
    if (p.mist) {
      const g = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*4);
      g.addColorStop(0,`${p.hue}${a})`);
      g.addColorStop(1,`${p.hue}0)`);
      ctx.beginPath();
      ctx.arc(p.x,p.y,p.r*4,0,Math.PI*2);
      ctx.fillStyle=g; ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=`${p.hue}${a})`;
      ctx.fill();
    }
    if (p.life<=0||p.y<-20) {
      particles[i]=newParticle();
      particles[i].y=(canvas.height||600)+10;
    }
  });
  requestAnimationFrame(drawParticles);
}

if (canvas) {
  resize();
  particles = Array.from({length:COUNT},newParticle);
  drawParticles();
  window.addEventListener('resize', resize);
}

// ── SCROLL REVEAL ──
const revealEls = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => { if(e.isIntersecting) e.target.classList.add('visible'); });
}, {threshold:0.12, rootMargin:'0px 0px -40px 0px'});
revealEls.forEach(el => observer.observe(el));

// ── AUDIO ──
let actx=null, started=false, mgain=null, muted=false;
const aBtn=document.getElementById('audio-btn');
const iSound=document.getElementById('icon-sound');
const iMuted=document.getElementById('icon-muted');

function buildAudio() {
  actx = new (window.AudioContext||window.webkitAudioContext)();
  mgain = actx.createGain();
  mgain.gain.setValueAtTime(0, actx.currentTime);
  mgain.gain.linearRampToValueAtTime(0.22, actx.currentTime+6);
  mgain.connect(actx.destination);

  // Helper: looping white noise buffer
  function makeNoise(duration) {
    const buf = actx.createBuffer(2, actx.sampleRate*duration, actx.sampleRate);
    for(let c=0;c<2;c++){const d=buf.getChannelData(c);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;}
    const src=actx.createBufferSource(); src.buffer=buf; src.loop=true; return src;
  }

  // Base rain hiss — highpass filtered noise
  const rain1=makeNoise(6);
  const hp=actx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=1200; hp.Q.value=0.3;
  const g1=actx.createGain(); g1.gain.value=0.18;
  rain1.connect(hp); hp.connect(g1); g1.connect(mgain); rain1.start();

  // Mid rain body — bandpass
  const rain2=makeNoise(5);
  const bp=actx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=600; bp.Q.value=0.5;
  const g2=actx.createGain(); g2.gain.value=0.10;
  rain2.connect(bp); bp.connect(g2); g2.connect(mgain); rain2.start();

  // Low rumble — lowpass
  const rain3=makeNoise(7);
  const lp=actx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=180; lp.Q.value=0.4;
  const g3=actx.createGain(); g3.gain.value=0.06;
  rain3.connect(lp); lp.connect(g3); g3.connect(mgain); rain3.start();

  // Slow swell LFO on overall gain for natural variation
  const lfo=actx.createOscillator();
  const lg=actx.createGain(); lg.gain.value=0.04;
  lfo.type='sine'; lfo.frequency.value=0.04;
  lfo.connect(lg); lg.connect(mgain.gain); lfo.start();

  // Occasional drip — soft high ping
  (function drip() {
    if(!actx||actx.state==='closed') return;
    const osc=actx.createOscillator(); const g=actx.createGain();
    osc.type='sine';
    osc.frequency.value=1200+Math.random()*800;
    g.gain.setValueAtTime(0,actx.currentTime);
    g.gain.linearRampToValueAtTime(0.018,actx.currentTime+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001,actx.currentTime+1.8);
    osc.connect(g); g.connect(mgain);
    osc.start(); osc.stop(actx.currentTime+2);
    setTimeout(drip, 1500+Math.random()*4000);
  })();
}

if (aBtn) aBtn.addEventListener('click', () => {
  if (!started) {
    buildAudio(); started=true; muted=false;
    if(iSound) iSound.style.display='block';
    if(iMuted) iMuted.style.display='none';
    return;
  }
  if (muted) {
    mgain.gain.linearRampToValueAtTime(0.16, actx.currentTime+1.5);
    actx.resume(); muted=false;
    if(iSound) iSound.style.display='block';
    if(iMuted) iMuted.style.display='none';
  } else {
    mgain.gain.linearRampToValueAtTime(0, actx.currentTime+1.5);
    muted=true;
    if(iSound) iSound.style.display='none';
    if(iMuted) iMuted.style.display='block';
  }
});
