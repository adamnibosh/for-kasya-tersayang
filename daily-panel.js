(function () {
  const listEl = () => document.getElementById('dailyList');
  const countEl = () => document.getElementById('dailyCount');
  const badgeEl = () => document.getElementById('dailyBadgeCount');

  function fmtDate(iso) {
    try {
      const [y, m, d] = iso.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      return dt.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return iso || '';
    }
  }

  function normalizeNotes(data) {
    if (!Array.isArray(data)) return [];
    const out = [];
    for (const item of data) {
      if (!item || typeof item !== 'object') continue;
      if (Array.isArray(item.value)) {
        for (const nested of item.value) {
          if (nested?.date && nested?.text) out.push(nested);
        }
        continue;
      }
      if (item.date && item.text) out.push(item);
    }
    return out;
  }

  function render(notes) {
    const list = listEl();
    const count = countEl();
    const badge = badgeEl();
    if (!list) return;

    const sorted = [...normalizeNotes(notes)].reverse();
    if (count) count.textContent = `${notes.length} note${notes.length === 1 ? '' : 's'} dari baby`;
    if (badge) badge.textContent = String(notes.length);

    if (!sorted.length) {
      list.innerHTML = '<p class="daily-empty">belum ada nota lagi — baby akan tambah soon 💛</p>';
      return;
    }

    list.innerHTML = sorted.map((note, i) => {
      const isNewest = i === 0;
      return `
        <article class="daily-card${isNewest ? ' daily-card-new' : ''}">
          ${isNewest ? '<span class="daily-new-pill">new ✨</span>' : ''}
          <time class="daily-date">${fmtDate(note.date)}</time>
          <p class="daily-text">${escapeHtml(note.text || '')}</p>
          ${note.sub ? `<p class="daily-sub">${escapeHtml(note.sub)}</p>` : ''}
        </article>
      `;
    }).join('');
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function load() {
    try {
      const res = await fetch(`daily.json?nocache=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Could not load daily notes');
      const data = await res.json();
      render(normalizeNotes(data));
    } catch (e) {
      const list = listEl();
      if (list) list.innerHTML = `<p class="daily-empty">${e.message}</p>`;
    }
  }

  window.DailyPanel = { init: load, refresh: load };
})();