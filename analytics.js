(function () {
  const CFG = typeof ANALYTICS_CONFIG !== 'undefined' ? ANALYTICS_CONFIG : { enabled: false };
  const VISITOR_KEY = 'kasya_visitor_id';
  let sessionId = null;
  let locationInfo = null;
  let locationPromise = null;
  let lastGalleryLog = '';
  let lastMessageLog = '';

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function getVisitorId() {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = 'v_' + uid();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  }

  function isReady() {
    return CFG.enabled && CFG.firebaseDatabaseUrl;
  }

  function eventsUrl() {
    const base = CFG.firebaseDatabaseUrl.replace(/\/$/, '');
    return `${base}/events.json`;
  }

  async function fetchLocation() {
    if (locationInfo) return locationInfo;
    if (locationPromise) return locationPromise;
    locationPromise = fetch('https://ipapi.co/json/', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return null;
        locationInfo = {
          city: data.city || '',
          region: data.region || '',
          country: data.country_name || '',
          ip: data.ip || ''
        };
        return locationInfo;
      })
      .catch(() => null);
    return locationPromise;
  }

  async function send(payload) {
    if (!isReady()) return;
    try {
      await fetch(eventsUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      });
    } catch (_) {}
  }

  async function log(type, detail = {}) {
    if (!isReady()) return;
    const loc = await fetchLocation();
    await send({
      type,
      detail,
      sessionId: sessionId || 'pre_unlock',
      visitorId: getVisitorId(),
      ts: Date.now(),
      time: new Date().toISOString(),
      location: loc,
      device: {
        ua: navigator.userAgent,
        touch: window.matchMedia('(hover: none) and (pointer: coarse)').matches,
        w: window.innerWidth,
        h: window.innerHeight
      }
    });
  }

  async function beginSession() {
    if (!isReady()) return;
    sessionId = 'sess_' + uid();
    const loc = await fetchLocation();
    await send({
      type: 'session_start',
      detail: { unlocked: true },
      sessionId,
      visitorId: getVisitorId(),
      ts: Date.now(),
      time: new Date().toISOString(),
      location: loc,
      device: {
        ua: navigator.userAgent,
        touch: window.matchMedia('(hover: none) and (pointer: coarse)').matches,
        w: window.innerWidth,
        h: window.innerHeight
      }
    });
  }

  window.KasyaAnalytics = {
    log,
    beginSession,
    getSessionId: () => sessionId,
    logGallerySlide(photoNum) {
      const key = `g_${photoNum}`;
      if (lastGalleryLog === key) return;
      lastGalleryLog = key;
      log('memory_slide', { photo: photoNum });
    },
    logMessageCard(mood, index) {
      const key = `m_${mood}_${index}`;
      if (lastMessageLog === key) return;
      lastMessageLog = key;
      log('message_card', { mood, card: index + 1 });
    },
    resetSlideLogs() {
      lastGalleryLog = '';
      lastMessageLog = '';
    }
  };

  if (isReady()) {
    log('page_visit', { path: location.pathname });
  }
})();