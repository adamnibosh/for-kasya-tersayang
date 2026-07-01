(function () {
  const REACTIONS = [
    { emoji: '😊', label: 'happy' },
    { emoji: '😢', label: 'sad' },
    { emoji: '😴', label: 'tired' },
    { emoji: '💭', label: 'miss you' },
    { emoji: '🥰', label: 'loved' },
    { emoji: '😤', label: 'annoyed' }
  ];

  const STORAGE_PREFIX = 'kasya_daily_reaction_';

  function getConfig() {
    if (typeof ANALYTICS_CONFIG !== 'undefined') return ANALYTICS_CONFIG;
    return window.ANALYTICS_CONFIG || null;
  }

  function getVisitorId() {
    return window.KasyaAnalytics?.getVisitorId?.()
      || localStorage.getItem('kasya_visitor_id')
      || 'unknown';
  }

  function deviceType() {
    return window.matchMedia('(hover: none) and (pointer: coarse)').matches ? 'phone' : 'desktop';
  }

  function todayMY() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
  }

  function dbBase() {
    const url = getConfig()?.firebaseDatabaseUrl;
    return url ? url.replace(/\/$/, '') : '';
  }

  function reactionUrl(date, visitorId) {
    const id = encodeURIComponent(visitorId);
    return `${dbBase()}/daily_reactions/${date}/${id}.json`;
  }

  function localKey(date, visitorId) {
    return `${STORAGE_PREFIX}${date}_${visitorId}`;
  }

  function readLocal(date, visitorId) {
    try {
      const raw = localStorage.getItem(localKey(date, visitorId));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function saveLocal(date, visitorId, data) {
    try {
      localStorage.setItem(localKey(date, visitorId), JSON.stringify(data));
    } catch (_) {}
  }

  function normalizeOne(data) {
    if (!data || typeof data !== 'object' || !data.emoji) return null;
    return data;
  }

  async function fetchMyReaction(date, visitorId) {
    const base = dbBase();
    if (!base) return null;
    try {
      const res = await fetch(`${reactionUrl(date, visitorId)}?nocache=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) return normalizeOne(await res.json());

      const legacy = await fetch(`${base}/daily_reactions/${date}.json?nocache=${Date.now()}`, { cache: 'no-store' });
      if (!legacy.ok) return null;
      const old = await legacy.json();
      if (old?.visitorId === visitorId) return normalizeOne(old);
      return null;
    } catch {
      return null;
    }
  }

  function notifyAdam(reaction, date) {
    const cfg = getConfig();
    if (!cfg) return;
    const who = reaction.device === 'phone' ? 'Sayang (phone)' : 'Visitor (desktop)';
    const when = new Date().toLocaleString('en-MY', {
      timeZone: 'Asia/Kuala_Lumpur',
      dateStyle: 'medium',
      timeStyle: 'short'
    });
    const alert = {
      title: reaction.device === 'phone' ? 'Kasya answered today' : 'Someone answered today',
      body: `${who}: ${reaction.emoji} ${reaction.label}\n${date} · ${when}\nid: ${reaction.visitorId || '?'}`
    };

    if (cfg.ntfyTopic) {
      const params = new URLSearchParams({ title: alert.title, priority: 'default', tags: 'heart' });
      const postUrl = `https://ntfy.sh/${cfg.ntfyTopic}?${params}`;
      try {
        fetch(postUrl, { method: 'POST', body: alert.body, keepalive: true, mode: 'no-cors' }).catch(() => {});
      } catch (_) {}
    }

    const token = cfg.telegramBotToken;
    const chatId = cfg.telegramChatId;
    if (token && chatId) {
      const text = `${alert.title}\n\n${alert.body}`;
      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      const payload = new URLSearchParams({ chat_id: String(chatId), text });
      try {
        fetch(url, { method: 'POST', body: payload, keepalive: true, mode: 'no-cors' }).catch(() => {});
      } catch (_) {}
    }
  }

  function showLocked(reaction) {
    const row = document.getElementById('dailyEmojiRow');
    const done = document.getElementById('dailyQuestionDone');
    const picked = document.getElementById('dailyPickedEmoji');
    if (row) row.hidden = true;
    if (done) done.hidden = false;
    if (picked) {
      picked.textContent = `${reaction.emoji} ${reaction.label}`;
    }
  }

  function showPicker() {
    const row = document.getElementById('dailyEmojiRow');
    const done = document.getElementById('dailyQuestionDone');
    if (row) row.hidden = false;
    if (done) done.hidden = true;
  }

  function buildPicker() {
    const row = document.getElementById('dailyEmojiRow');
    if (!row || row.dataset.built) return;
    row.dataset.built = '1';
    row.innerHTML = REACTIONS.map((r, i) => `
      <button type="button" class="daily-emoji-btn" data-reaction-idx="${i}" aria-label="${r.label}">
        <span class="daily-emoji-icon">${r.emoji}</span>
        <span class="daily-emoji-label">${r.label}</span>
      </button>
    `).join('');
  }

  async function submitReaction(reaction) {
    const date = todayMY();
    const visitorId = getVisitorId();
    const base = dbBase();
    if (!base) throw new Error('Could not save');

    const payload = {
      emoji: reaction.emoji,
      label: reaction.label,
      date,
      ts: Date.now(),
      time: new Date().toISOString(),
      visitorId,
      device: deviceType()
    };

    const res = await fetch(reactionUrl(date, visitorId), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.status === 401) throw new Error('Firebase rules need update');
    if (!res.ok) {
      const existing = await fetchMyReaction(date, visitorId);
      if (existing) return existing;
      throw new Error('Could not save reaction');
    }

    saveLocal(date, visitorId, payload);
    window.KasyaAnalytics?.log?.('daily_reaction', {
      emoji: reaction.emoji,
      label: reaction.label,
      device: payload.device
    });
    notifyAdam(payload, date);
    return payload;
  }

  async function init() {
    const date = todayMY();
    const visitorId = getVisitorId();
    buildPicker();

    const local = readLocal(date, visitorId);
    const remote = await fetchMyReaction(date, visitorId);
    const existing = remote || local;

    if (existing?.emoji) {
      showLocked(existing);
      return;
    }

    showPicker();
  }

  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-reaction-idx]');
    if (!btn || btn.disabled) return;

    const idx = Number(btn.dataset.reactionIdx);
    const reaction = REACTIONS[idx];
    if (!reaction) return;

    e.preventDefault();
    const row = document.getElementById('dailyEmojiRow');
    row?.querySelectorAll('.daily-emoji-btn').forEach((b) => { b.disabled = true; });

    try {
      const saved = await submitReaction(reaction);
      showLocked(saved);
    } catch (err) {
      row?.querySelectorAll('.daily-emoji-btn').forEach((b) => { b.disabled = false; });
      const msg = document.getElementById('dailyReactionError');
      if (msg) {
        msg.textContent = err.message || 'could not save — try again';
        msg.hidden = false;
      }
    }
  });

  window.DailyReaction = { init, fetchMyReaction, todayMY, getVisitorId };
})();