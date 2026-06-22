// ╔══════════════════════════════════════════════╗
// ║  SWEET MESSAGES DATA — edit these!           ║
// ╚══════════════════════════════════════════════╝
const MESSAGES = [
  {
    text: "you are the kindest person i've ever known. 🌸",
    sub: "and i mean that more than you know."
  },
  {
    text: "i think about you way more than i let on. 💛",
    sub: "like, embarrassingly often."
  },
  {
    text: "being around you just makes everything feel lighter. ✨",
    sub: "thank you for that."
  },
  {
    text: "i'm really lucky you're in my life. 🤍",
    sub: "even on the hard days."
  },
  {
    text: "you deserve all the softness the world has. 🌷",
    sub: "i hope i can be part of that."
  },
  {
    text: "i choose you. yesterday, today, always. 🐾",
    sub: "even when i forget to show it."
  }
];

// ╔══════════════════════════════════════════════╗
// ║  MEMORY CAPTIONS — edit these to match yours ║
// ╚══════════════════════════════════════════════╝
// (captions are already in the HTML, this is just a reminder
//  to also edit index.html mem-caption paragraphs)

// ╔══════════════════════════════════════════════╗
// ║  PASSCODE                                    ║
// ╚══════════════════════════════════════════════╝
// Adam's birthday: 14 June → 1406
const PASSCODE = '1406';

function initApp() {
// ─── screen navigation ───────────────────────────
const GIFT_SCREENS = new Set(['letter', 'memories', 'messages']);
const visited = new Set();

function markVisited(name) {
  visited.add(name);
  const card = document.getElementById('gcard-' + name);
  if (card) card.classList.add('visited');
  if (visited.size === 3) {
    setTimeout(() => {
      document.getElementById('finaleReveal')?.classList.add('show');
    }, 500);
  }
}

function goTo(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const t = document.getElementById('screen-' + name);
  if (t) t.classList.add('active');
  if (name === 'lock') {
    resetKeypad();
    visited.clear();
    document.querySelectorAll('.gift-card').forEach(c => c.classList.remove('visited'));
    document.getElementById('finaleReveal')?.classList.remove('show');
    stopHeartRain();
  }
  if (name === 'memories') initGallery();
  if (name === 'messages') initMessages();
  if (name === 'finale')   startHeartRain();
  // burst confetti when entering a gift screen
  if (GIFT_SCREENS.has(name)) burstConfetti();
}

// ── data-goto buttons (navigation only, no visit tracking) ──
document.querySelectorAll('[data-goto]').forEach(el => {
  el.addEventListener('click', e => {
    spawnRipple(el, e);
    setTimeout(() => goTo(el.dataset.goto), 140);
  });
});

// ── data-done buttons (mark gift complete → back to picker) ──
document.querySelectorAll('[data-done]').forEach(el => {
  el.addEventListener('click', e => {
    spawnRipple(el, e);
    const gift = el.dataset.done;
    markVisited(gift);
    setTimeout(() => goTo('gift'), 140);
  });
});

// ─── ripple ──────────────────────────────────────
function spawnRipple(el, evt) {
  const rect = el.getBoundingClientRect();
  const r = document.createElement('span');
  r.className = 'ripple';
  const size = Math.max(rect.width, rect.height) * 1.2;
  r.style.width = r.style.height = size + 'px';
  r.style.left = ((evt.clientX ?? rect.left + rect.width/2) - rect.left - size/2) + 'px';
  r.style.top  = ((evt.clientY ?? rect.top + rect.height/2) - rect.top  - size/2) + 'px';
  el.appendChild(r);
  setTimeout(() => r.remove(), 650);
}

// ─── keypad + passcode ────────────────────────────
const heartSlots = document.querySelectorAll('#heartsRow .heart-slot');
const burstLayer = document.getElementById('burstLayer');
const wrongMsg   = document.getElementById('wrongMsg');
let entered = '';

function resetKeypad() {
  entered = '';
  heartSlots.forEach(h => {
    h.textContent = '🤍';
    h.classList.remove('filled', 'wrong');
  });
  wrongMsg.classList.remove('show');
}

function setWrong() {
  heartSlots.forEach(h => {
    h.textContent = '❌';
    h.classList.add('wrong');
    h.classList.remove('filled');
  });
  wrongMsg.classList.add('show');
  setTimeout(() => resetKeypad(), 1100);
}

function spawnHeartBurst() {
  if (!burstLayer) return;
  ['💕','💛','✨','🤍','🌸'].forEach((em, i) => {
    setTimeout(() => {
      const h = document.createElement('span');
      h.className = 'burst-heart';
      h.textContent = em;
      const angle = (Math.PI * 2 * i) / 5 + Math.random() * 0.5;
      const dist  = 80 + Math.random() * 80;
      h.style.setProperty('--fly-to', `translate(${Math.cos(angle)*dist}px,${Math.sin(angle)*dist-40}px)`);
      h.style.left = '50%';
      h.style.top  = '42%';
      burstLayer.appendChild(h);
      setTimeout(() => h.remove(), 950);
    }, i * 60);
  });
}

document.querySelectorAll('#keypad .key').forEach(key => {
  key.addEventListener('click', e => {
    spawnRipple(key, e);
    const k = key.dataset.key;

    if (k === 'back') {
      if (entered.length > 0) {
        entered = entered.slice(0, -1);
        heartSlots[entered.length].textContent = '🤍';
        heartSlots[entered.length].classList.remove('filled');
        wrongMsg.classList.remove('show');
      }
      return;
    }

    if (k === 'enter') {
      if (entered.length === 4) checkCode();
      return;
    }

    if (entered.length < 4) {
      heartSlots[entered.length].textContent = '❤️';
      heartSlots[entered.length].classList.add('filled');
      entered += k;
    }

    if (entered.length === 4) setTimeout(checkCode, 260);
  });
});

function checkCode() {
  if (entered === PASSCODE) {
    spawnHeartBurst();
    setTimeout(() => goTo('ready'), 430);
  } else {
    setWrong();
  }
}

// ─── gallery (memories) ───────────────────────────
let galIndex = 0;
const GAL_TOTAL = 6;

function initGallery() {
  galIndex = 0;
  renderGallery();
  // build dots once
  const dotContainer = document.getElementById('galDots');
  if (dotContainer && dotContainer.children.length === 0) {
    for (let i = 0; i < GAL_TOTAL; i++) {
      const d = document.createElement('span');
      d.className = 'gal-dot' + (i === 0 ? ' active' : '');
      dotContainer.appendChild(d);
    }
  }
  updateGalDots();
}

function renderGallery() {
  const slider = document.getElementById('gallerySlider');
  if (!slider) return;
  const slides = slider.querySelectorAll('.mem-slide');
  slides.forEach((s, i) => {
    s.style.transform = `translateX(${(i - galIndex) * 100}%)`;
  });
}

function updateGalDots() {
  document.querySelectorAll('#galDots .gal-dot').forEach((d, i) => {
    d.classList.toggle('active', i === galIndex);
  });
}

document.getElementById('galPrev')?.addEventListener('click', () => {
  galIndex = (galIndex - 1 + GAL_TOTAL) % GAL_TOTAL;
  renderGallery(); updateGalDots();
});
document.getElementById('galNext')?.addEventListener('click', () => {
  galIndex = (galIndex + 1) % GAL_TOTAL;
  renderGallery(); updateGalDots();
});

// touch swipe on gallery
let touchStartX = 0;
document.getElementById('gallerySlider')?.addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX;
}, { passive: true });
document.getElementById('gallerySlider')?.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) > 40) {
    galIndex = dx < 0
      ? (galIndex + 1) % GAL_TOTAL
      : (galIndex - 1 + GAL_TOTAL) % GAL_TOTAL;
    renderGallery(); updateGalDots();
  }
});

// ─── sweet messages ───────────────────────────────
let msgIndex = 0;

function initMessages() {
  msgIndex = 0;
  renderMessage(false);
  const dotContainer = document.getElementById('msgDots');
  if (dotContainer && dotContainer.children.length === 0) {
    MESSAGES.forEach((_, i) => {
      const d = document.createElement('span');
      d.className = 'gal-dot' + (i === 0 ? ' active' : '');
      dotContainer.appendChild(d);
    });
  }
  updateMsgDots();
}

function renderMessage(animate = true) {
  const card    = document.getElementById('msgCard');
  const textEl  = document.getElementById('msgText');
  const subEl   = document.getElementById('msgSub');
  const numEl   = document.getElementById('msgNumber');
  if (!card) return;

  if (animate) {
    card.classList.remove('flip');
    void card.offsetWidth; // reflow to restart animation
    card.classList.add('flip');
  }

  const msg = MESSAGES[msgIndex];
  textEl.textContent = msg.text;
  subEl.textContent  = msg.sub;
  numEl.textContent  = `${msgIndex + 1} / ${MESSAGES.length}`;
}

function updateMsgDots() {
  document.querySelectorAll('#msgDots .gal-dot').forEach((d, i) => {
    d.classList.toggle('active', i === msgIndex);
  });
}

document.getElementById('msgPrev')?.addEventListener('click', () => {
  msgIndex = (msgIndex - 1 + MESSAGES.length) % MESSAGES.length;
  renderMessage(); updateMsgDots();
});
document.getElementById('msgNext')?.addEventListener('click', () => {
  msgIndex = (msgIndex + 1) % MESSAGES.length;
  renderMessage(); updateMsgDots();
});

// ─── confetti ─────────────────────────────────────
const canvas = document.getElementById('confettiCanvas');
const ctx    = canvas?.getContext('2d');
let confetti = [], raf = null;
const COLORS  = ['#A9D6E8','#F4B9C4','#FBF6EC','#5B8FA8','#E08A9B','#fff5c6'];

function resizeCanvas() {
  if (!canvas) return;
  const r = document.getElementById('screenStack').getBoundingClientRect();
  canvas.width = r.width; canvas.height = r.height;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function burstConfetti() {
  if (!ctx) return;
  resizeCanvas();
  for (let i = 0; i < 65; i++) {
    confetti.push({
      x: canvas.width/2 + (Math.random()-.5)*80,
      y: canvas.height*.35,
      vx:(Math.random()-.5)*10,
      vy:-Math.random()*10-3,
      size:Math.random()*6+4,
      color:COLORS[Math.floor(Math.random()*COLORS.length)],
      rot:Math.random()*Math.PI*2,
      rs:(Math.random()-.5)*.3,
      shape:Math.random()>.5?'c':'r',
      life:0
    });
  }
  if (!raf) loop();
}

function loop() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  confetti.forEach(p => {
    p.vy+=.22; p.x+=p.vx; p.y+=p.vy; p.rot+=p.rs; p.life++;
    ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot);
    ctx.fillStyle=p.color; ctx.globalAlpha=Math.max(0,1-p.life/90);
    if(p.shape==='c'){ ctx.beginPath(); ctx.arc(0,0,p.size/2,0,Math.PI*2); ctx.fill(); }
    else { ctx.fillRect(-p.size/2,-p.size/4,p.size,p.size/2); }
    ctx.restore();
  });
  confetti = confetti.filter(p => p.life<90 && p.y<canvas.height+40);
  if(confetti.length){ raf=requestAnimationFrame(loop); }
  else { ctx.clearRect(0,0,canvas.width,canvas.height); raf=null; }
}

// ─── heart rain (finale screen) ──────────────────
const rainCanvas = document.getElementById('rainCanvas');
const rainCtx    = rainCanvas?.getContext('2d');
let rainDrops    = [];
let rainRAF      = null;
let rainRunning  = false;

const RAIN_SYMBOLS = ['❤️','💛','🤍','💕','✨','🌸','💖','🌷'];

function resizeRainCanvas() {
  if (!rainCanvas) return;
  const r = document.getElementById('screenStack').getBoundingClientRect();
  rainCanvas.width  = r.width;
  rainCanvas.height = r.height;
}
window.addEventListener('resize', resizeRainCanvas);
resizeRainCanvas();

function spawnRainDrop() {
  if (!rainCanvas) return;
  rainDrops.push({
    x:     Math.random() * rainCanvas.width,
    y:     -40,
    vy:    1.2 + Math.random() * 1.8,
    vx:    (Math.random() - 0.5) * 0.6,
    size:  18 + Math.random() * 22,
    sym:   RAIN_SYMBOLS[Math.floor(Math.random() * RAIN_SYMBOLS.length)],
    sway:  Math.random() * Math.PI * 2,    // sway phase offset
    swayA: 0.3 + Math.random() * 0.5,      // sway amplitude
    alpha: 0.7 + Math.random() * 0.3,
  });
}

function rainLoop() {
  if (!rainCtx || !rainRunning) return;
  resizeRainCanvas();
  rainCtx.clearRect(0, 0, rainCanvas.width, rainCanvas.height);

  // spawn new drops steadily
  if (Math.random() < 0.35) spawnRainDrop();

  rainDrops.forEach(d => {
    d.sway += 0.025;
    d.x += d.vx + Math.sin(d.sway) * d.swayA;
    d.y += d.vy;
    rainCtx.save();
    rainCtx.globalAlpha = d.alpha;
    rainCtx.font = `${d.size}px serif`;
    rainCtx.textAlign = 'center';
    rainCtx.fillText(d.sym, d.x, d.y);
    rainCtx.restore();
  });

  // recycle drops that fall off the bottom
  rainDrops = rainDrops.filter(d => d.y < rainCanvas.height + 50);

  rainRAF = requestAnimationFrame(rainLoop);
}

function startHeartRain() {
  if (rainRunning) return;
  rainRunning = true;
  rainDrops   = [];
  resizeRainCanvas();
  // seed an initial spread so it doesn't feel empty at first
  for (let i = 0; i < 18; i++) {
    spawnRainDrop();
    rainDrops[rainDrops.length - 1].y = Math.random() * (rainCanvas?.height ?? 600);
  }
  rainLoop();
}

function stopHeartRain() {
  rainRunning = false;
  if (rainRAF) { cancelAnimationFrame(rainRAF); rainRAF = null; }
  if (rainCtx && rainCanvas) rainCtx.clearRect(0, 0, rainCanvas.width, rainCanvas.height);
  rainDrops = [];
}

// stop rain when navigating away from finale
const _origGoTo = goTo;  // keep reference
// patch goTo to stop rain when leaving
const goToOrig = goTo;
window.__goTo  = goTo;
// override via event — when "start over" is clicked, rain stops
document.getElementById('screen-finale')?.addEventListener('click', e => {
  const btn = e.target.closest('[data-goto]');
  if (btn) stopHeartRain();
});

} // end initApp

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
