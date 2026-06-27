(function () {
  const CFG = typeof ANALYTICS_CONFIG !== 'undefined' ? ANALYTICS_CONFIG : {};
  const sessionsEl = () => document.getElementById('adminSessions');
  const metaEl = () => document.getElementById('adminMeta');

  const LABELS = {
    page_visit: 'opened site',
    passcode_wrong: 'wrong password',
    session_start: 'unlocked — new session',
    screen: 'went to screen',
    gift_done: 'finished gift',
    mood_pick: 'picked mood',
    memory_slide: 'viewed photo',
    message_card: 'read sweet card',
    finale_secret: 'opened secret button'
  };

  function dbBase() {
    return CFG.firebaseDatabaseUrl ? CFG.firebaseDatabaseUrl.replace(/\/$/, '') : '';
  }

  function eventsUrl() {
    const base = dbBase();
    return base ? `${base}/events.json` : '';
  }

  async function deleteEvent(id) {
    const base = dbBase();
    if (!base) throw new Error('Firebase not configured');
    const res = await fetch(`${base}/events/${id}.json`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');
  }

  async function deleteSessionEvents(events) {
    await Promise.all(events.map(ev => deleteEvent(ev.id)));
  }

  function fmtTime(iso) {
    try {
      return new Date(iso).toLocaleString('en-MY', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return iso || '';
    }
  }

  function fmtDetail(ev) {
    const d = ev.detail || {};
    if (ev.type === 'screen') return d.screen || '';
    if (ev.type === 'gift_done') return d.gift || '';
    if (ev.type === 'mood_pick') return d.mood || '';
    if (ev.type === 'memory_slide') return `#${d.photo}`;
    if (ev.type === 'message_card') return `${d.mood} card ${d.card}`;
    return '';
  }

  function fmtLoc(loc) {
    if (!loc) return 'location unknown';
    const parts = [loc.city, loc.region, loc.country].filter(Boolean);
    return parts.length ? parts.join(', ') : 'location unknown';
  }

  async function loadEvents() {
    const url = eventsUrl();
    if (!url) throw new Error('Firebase not configured');
    const res = await fetch(`${url}?orderBy="$key"&limitToLast=400`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Could not load logs');
    const data = await res.json();
    if (!data) return [];
    return Object.entries(data)
      .map(([id, ev]) => ({ id, ...ev }))
      .sort((a, b) => (b.ts || 0) - (a.ts || 0));
  }

  function groupBySession(events) {
    const map = new Map();
    events.forEach(ev => {
      const sid = ev.sessionId || 'unknown';
      if (!map.has(sid)) map.set(sid, []);
      map.get(sid).push(ev);
    });
    return [...map.entries()]
      .map(([sessionId, list]) => ({
        sessionId,
        events: list.sort((a, b) => (a.ts || 0) - (b.ts || 0)),
        start: list.find(e => e.type === 'session_start') || list[0]
      }))
      .sort((a, b) => (b.start?.ts || 0) - (a.start?.ts || 0));
  }

  function renderSessions(groups) {
    const el = sessionsEl();
    if (!el) return;
    if (!groups.length) {
      el.innerHTML = '<p class="admin-empty">No sessions yet. Waiting for sayang to open with 1406.</p>';
      return;
    }
    el.innerHTML = groups.map(g => {
      const loc = g.start?.location;
      const startTime = fmtTime(g.start?.time);
      const eventsHtml = g.events.map(ev => `
        <div class="admin-event">
          <strong>${LABELS[ev.type] || ev.type}</strong>
          ${fmtDetail(ev) ? ` — ${fmtDetail(ev)}` : ''}
          <span>${fmtTime(ev.time)}</span>
        </div>
      `).join('');
      const ids = g.events.map(ev => ev.id).join(',');
      return `
        <article class="admin-session-card">
          <div class="admin-session-top">
            <span>${startTime}</span>
            <span>${g.events.length} events</span>
          </div>
          <div class="admin-session-bar">
            <p class="admin-session-loc">📍 ${fmtLoc(loc)}</p>
            <button type="button" class="btn-admin-delete" data-event-ids="${ids}">delete</button>
          </div>
          ${eventsHtml}
        </article>
      `;
    }).join('');
  }

  async function refresh() {
    const meta = metaEl();
    if (!meta) return;
    meta.textContent = 'loading…';
    try {
      const events = await loadEvents();
      const groups = groupBySession(events);
      meta.textContent = `${groups.length} sessions · ${events.length} events`;
      renderSessions(groups);
    } catch (e) {
      meta.textContent = 'error loading';
      const el = sessionsEl();
      if (el) el.innerHTML = `<p class="admin-empty">${e.message}</p>`;
    }
  }

  async function deleteAllEvents() {
    const events = await loadEvents();
    if (!events.length) return;
    if (!confirm(`Delete all ${events.length} events? Cannot undo.`)) return;
    await deleteSessionEvents(events);
    await refresh();
  }

  window.AdminPanel = {
    init() { refresh(); },
    refresh,
    deleteAll: deleteAllEvents
  };

  document.getElementById('adminRefresh')?.addEventListener('pointerup', e => {
    e.preventDefault();
    refresh();
  });

  document.getElementById('adminClearAll')?.addEventListener('pointerup', e => {
    e.preventDefault();
    deleteAllEvents();
  });

  document.getElementById('adminSessions')?.addEventListener('pointerup', async e => {
    const btn = e.target.closest('[data-event-ids]');
    if (!btn || btn.disabled) return;
    e.preventDefault();
    const ids = btn.dataset.eventIds.split(',').filter(Boolean);
    if (!ids.length) return;
    if (!confirm('Delete this session? Cannot undo.')) return;
    btn.disabled = true;
    btn.textContent = 'deleting…';
    try {
      await Promise.all(ids.map(id => deleteEvent(id)));
      await refresh();
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'delete';
      alert(err.message || 'Delete failed');
    }
  });
})();