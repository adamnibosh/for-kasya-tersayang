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
const IS_TOUCH = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function hapticTap() {
  if (navigator.vibrate) navigator.vibrate(12);
}

function pointerCoords(evt) {
  if (evt.changedTouches?.[0]) {
    return { x: evt.changedTouches[0].clientX, y: evt.changedTouches[0].clientY };
  }
  if (evt.touches?.[0]) {
    return { x: evt.touches[0].clientX, y: evt.touches[0].clientY };
  }
  return { x: evt.clientX, y: evt.clientY };
}

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
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
    s.hidden = true;
    s.setAttribute('inert', '');
  });

  const t = document.getElementById('screen-' + name);
  if (t) {
    t.hidden = false;
    t.removeAttribute('inert');
    t.classList.add('active');
    t.scrollTop = 0;
  }

  if (name === 'lock') {
    resetKeypad();
    visited.clear();
    document.querySelectorAll('.gift-card').forEach(c => c.classList.remove('visited'));
    document.getElementById('finaleReveal')?.classList.remove('show');
    stopHeartRain();
  }
  if (name === 'memories') initGallery();
  if (name === 'messages') initMessages();
  if (name === 'finale') startHeartRain();
  if (GIFT_SCREENS.has(name)) burstConfetti();
}

let lastPointerUp = 0;

function handlePointerUp(e) {
  if (e.pointerType === 'mouse' && e.button !== 0) return;

  const now = Date.now();
  if (now - lastPointerUp < 280) return;
  lastPointerUp = now;

  const gotoBtn = e.target.closest('[data-goto]');
  if (gotoBtn) {
    e.preventDefault();
    hapticTap();
    spawnRipple(gotoBtn, e);
    setTimeout(() => goTo(gotoBtn.dataset.goto), IS_TOUCH ? 80 : 120);
    return;
  }

  const doneBtn = e.target.closest('[data-done]');
  if (doneBtn) {
    e.preventDefault();
    hapticTap();
    spawnRipple(doneBtn, e);
    markVisited(doneBtn.dataset.done);
    setTimeout(() => goTo('gift'), IS_TOUCH ? 80 : 120);
    return;
  }

  const galPrev = e.target.closest('#galPrev');
  if (galPrev) {
    e.preventDefault();
    hapticTap();
    galIndex = (galIndex - 1 + GAL_TOTAL) % GAL_TOTAL;
    renderGallery();
    updateGalDots();
    return;
  }

  const galNext = e.target.closest('#galNext');
  if (galNext) {
    e.preventDefault();
    hapticTap();
    galIndex = (galIndex + 1) % GAL_TOTAL;
    renderGallery();
    updateGalDots();
    return;
  }

  const msgPrev = e.target.closest('#msgPrev');
  if (msgPrev) {
    e.preventDefault();
    hapticTap();
    msgIndex = (msgIndex - 1 + MESSAGES.length) % MESSAGES.length;
    renderMessage();
    updateMsgDots();
    return;
  }

  const msgNext = e.target.closest('#msgNext');
  if (msgNext) {
    e.preventDefault();
    hapticTap();
    msgIndex = (msgIndex + 1) % MESSAGES.length;
    renderMessage();
    updateMsgDots();
    return;
  }

  const key = e.target.closest('#keypad .key');
  if (key) {
    e.preventDefault();
    hapticTap();
    handleKeyPress(key, e);
  }
}

const screenStack = document.getElementById('screenStack');
screenStack?.addEventListener('pointerup', handlePointerUp);

// ─── ripple ──────────────────────────────────────
function spawnRipple(el, evt) {
  const rect = el.getBoundingClientRect();
  const pt = pointerCoords(evt);
  const r = document.createElement('span');
  r.className = 'ripple';
  const size = Math.max(rect.width, rect.height) * 1.2;
  r.style.width = r.style.height = size + 'px';
  r.style.left = ((pt.x || rect.left + rect.width / 2) - rect.left - size / 2) + 'px';
  r.style.top  = ((pt.y || rect.top + rect.height / 2) - rect.top - size / 2) + 'px';
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

function handleKeyPress(key, e) {
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
}

function checkCode() {
  if (entered === PASSCODE) {
    spawnHeartBurst();
    setTimeout(() => goTo('ready'), 430);
  } else {
    setWrong();
  }
}

// ─── gallery (memories) ───────────────────────────
// Edit captions here — photo # matches assets/1.jpg, 2.jpg, etc.
const ASSET_BASE = 'https://adamnibosh.github.io/for-sayang/assets/';
const EXCLUDED_PHOTOS = new Set([3, 10, 16, 18, 21]);
const MEMORIES = Array.from({ length: 21 }, (_, i) => i + 1)
  .filter(num => !EXCLUDED_PHOTOS.has(num))
  .map(num => ({
    num,
    src: `${ASSET_BASE}${num}.jpg?v=9`,
    caption: '---'
  }));

let galIndex = 0;
let GAL_TOTAL = MEMORIES.length;
let galleryBuilt = false;

function buildGallery() {
  const slider = document.getElementById('gallerySlider');
  if (!slider || galleryBuilt) return;

  const icons = ['🌸', '🤍', '✨', '💕', '🌷', '🫶'];
  slider.innerHTML = MEMORIES.map((mem, i) => `
    <div class="mem-slide${i === 0 ? ' active-slide' : ''}"${i === 0 ? '' : ' hidden'}>
      <p class="mem-number">#${mem.num}</p>
      <div class="mem-photo-wrap">
        <img src="${mem.src}" alt="memory ${mem.num}" class="mem-photo" loading="${i < 2 ? 'eager' : 'lazy'}">
        <div class="mem-placeholder-inner">${icons[i % icons.length]}</div>
      </div>
      <p class="mem-caption">${mem.caption}</p>
    </div>
  `).join('');

  galleryBuilt = true;
}

function initGallery() {
  buildGallery();
  galIndex = 0;
  document.querySelectorAll('.mem-photo').forEach(img => {
    img.parentNode?.classList.remove('placeholder');
    if (!img.complete) {
      img.addEventListener('load', () => img.parentNode?.classList.remove('placeholder'), { once: true });
      img.addEventListener('error', () => img.parentNode?.classList.add('placeholder'), { once: true });
    } else if (img.naturalWidth === 0) {
      img.parentNode?.classList.add('placeholder');
    }
  });
  renderGallery();
  // build dots once
  const dotContainer = document.getElementById('galDots');
  if (dotContainer) {
    dotContainer.innerHTML = '';
    for (let i = 0; i < GAL_TOTAL; i++) {
      const d = document.createElement('span');
      d.className = 'gal-dot' + (i === 0 ? ' active' : '');
      dotContainer.appendChild(d);
    }
  }
  updateGalDots();
}

function renderGallery() {
  const slides = document.querySelectorAll('#gallerySlider .mem-slide');
  slides.forEach((s, i) => {
    const show = i === galIndex;
    s.classList.toggle('active-slide', show);
    s.hidden = !show;
  });

  const nextImg = slides[galIndex]?.querySelector('.mem-photo');
  if (nextImg?.loading === 'lazy') {
    const preload = new Image();
    preload.src = nextImg.src;
  }
  const ahead = slides[(galIndex + 1) % GAL_TOTAL]?.querySelector('.mem-photo');
  if (ahead) {
    const preloadAhead = new Image();
    preloadAhead.src = ahead.src;
  }
}

function updateGalDots() {
  document.querySelectorAll('#galDots .gal-dot').forEach((d, i) => {
    d.classList.toggle('active', i === galIndex);
  });
}

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
  if (!ctx || REDUCED_MOTION) return;
  resizeCanvas();
  const count = IS_TOUCH ? 38 : 65;
  for (let i = 0; i < count; i++) {
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
  if (rainRunning || REDUCED_MOTION) return;
  rainRunning = true;
  rainDrops   = [];
  resizeRainCanvas();
  const seedCount = IS_TOUCH ? 12 : 18;
  for (let i = 0; i < seedCount; i++) {
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
document.getElementById('screen-finale')?.addEventListener('click', e => {
  const btn = e.target.closest('[data-goto]');
  if (btn) stopHeartRain();
});

// swipe — gallery + messages (iPhone & Android)
let swipeStartX = 0;
let swipeStartY = 0;
let swipeZone = null;

function bindSwipe(el, zone, onSwipe) {
  if (!el) return;
  el.addEventListener('touchstart', e => {
    swipeStartX = e.touches[0].clientX;
    swipeStartY = e.touches[0].clientY;
    swipeZone = zone;
  }, { passive: true });

  el.addEventListener('touchend', e => {
    if (swipeZone !== zone) return;
    const dx = e.changedTouches[0].clientX - swipeStartX;
    const dy = e.changedTouches[0].clientY - swipeStartY;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      hapticTap();
      onSwipe(dx < 0 ? 1 : -1);
    }
    swipeZone = null;
  }, { passive: true });
}

bindSwipe(document.getElementById('gallerySlider'), 'gallery', dir => {
  galIndex = (galIndex + dir + GAL_TOTAL) % GAL_TOTAL;
  renderGallery();
  updateGalDots();
});

bindSwipe(document.getElementById('msgCard'), 'messages', dir => {
  msgIndex = (msgIndex + dir + MESSAGES.length) % MESSAGES.length;
  renderMessage();
  updateMsgDots();
});
