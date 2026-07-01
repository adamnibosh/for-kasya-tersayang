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

  function formatLocation(loc) {
    if (!loc) return 'Location unknown';
    const parts = [loc.city, loc.region, loc.country].filter(Boolean);
    return parts.length ? parts.join(', ') : 'Location unknown';
  }

  function buildUnlockAlert(loc, sessionId) {
    const when = new Date().toLocaleString('en-MY', {
      timeZone: 'Asia/Kuala_Lumpur',
      dateStyle: 'medium',
      timeStyle: 'short'
    });
    const place = formatLocation(loc);
    const device = window.matchMedia('(hover: none) and (pointer: coarse)').matches
      ? 'phone'
      : 'desktop';
    const sessionLine = sessionId ? `\nsession:${sessionId}` : '';
    return {
      title: 'Sayang opened the site',
      body: `She entered 1406 at ${when}\n${place} · ${device}${sessionLine}`
    };
  }

  function sendNtfyAlert(alert) {
    const topic = CFG.ntfyTopic;
    if (!topic) return;
    const params = new URLSearchParams({
      title: alert.title,
      priority: 'high',
      tags: 'heart'
    });
    const postUrl = `https://ntfy.sh/${topic}?${params}`;
    const getUrl = `https://ntfy.sh/${topic}/${encodeURIComponent(alert.body)}?${params}`;

    try {
      if (navigator.sendBeacon && navigator.sendBeacon(postUrl, alert.body)) return;
    } catch (_) {}

    try {
      fetch(postUrl, { method: 'POST', body: alert.body, keepalive: true, mode: 'no-cors' }).catch(() => {});
    } catch (_) {}

    try {
      const img = new Image();
      img.referrerPolicy = 'no-referrer';
      img.src = getUrl;
    } catch (_) {}
  }

  function sendTelegramAlert(alert) {
    const token = CFG.telegramBotToken;
    const chatId = CFG.telegramChatId;
    if (!token || !chatId) return;
    const text = `${alert.title}\n\n${alert.body}`;
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const payload = new URLSearchParams({
      chat_id: String(chatId),
      text
    });

    try {
      if (navigator.sendBeacon && navigator.sendBeacon(url, payload)) return;
    } catch (_) {}

    try {
      fetch(url, {
        method: 'POST',
        body: payload,
        keepalive: true,
        mode: 'no-cors'
      }).catch(() => {});
    } catch (_) {}

    try {
      const getUrl = `${url}?${new URLSearchParams({ chat_id: String(chatId), text })}`;
      const img = new Image();
      img.referrerPolicy = 'no-referrer';
      img.src = getUrl;
    } catch (_) {}
  }

  function notifyUnlock(loc, id) {
    const alert = buildUnlockAlert(loc, id);
    sendNtfyAlert(alert);
    sendTelegramAlert(alert);
  }

  async function beginSession() {
    if (!isReady()) return;
    sessionId = 'sess_' + uid();
    notifyUnlock(null, sessionId);
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
    notifyUnlock,
    getSessionId: () => sessionId,
    getVisitorId,
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