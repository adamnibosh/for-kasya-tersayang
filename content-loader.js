(function () {
  function dbBase() {
    const url = window.ANALYTICS_CONFIG?.firebaseDatabaseUrl;
    return url ? url.replace(/\/$/, '') : '';
  }

  function cleanEntry(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const date = String(raw.date || '').trim();
    const text = String(raw.text || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !text) return null;
    const out = { date, text };
    const sub = String(raw.sub || '').trim();
    if (sub) out.sub = sub;
    return out;
  }

  function mapToList(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return [];
    return Object.values(data).map(cleanEntry).filter(Boolean);
  }

  async function fetchDailyFromFirebase() {
    const base = dbBase();
    if (!base) return [];
    try {
      const res = await fetch(`${base}/content/daily.json?nocache=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return [];
      return mapToList(await res.json());
    } catch {
      return [];
    }
  }

  async function fetchMoodCardsFromFirebase(mood) {
    const base = dbBase();
    if (!base || !mood) return [];
    try {
      const res = await fetch(`${base}/content/moods/${mood}/cards.json?nocache=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return [];
      return mapToList(await res.json());
    } catch {
      return [];
    }
  }

  async function fetchAllMoodCardsFromFirebase() {
    const moods = ['sad', 'happy', 'alone', 'angry', 'rindu'];
    const entries = await Promise.all(moods.map(async (mood) => ({
      mood,
      cards: await fetchMoodCardsFromFirebase(mood)
    })));
    return entries.filter((e) => e.cards.length);
  }

  function mergeDailyLists(staticNotes, remoteNotes) {
    const seen = new Set();
    const out = [];
    for (const list of [staticNotes, remoteNotes]) {
      for (const note of list) {
        const key = `${note.date}|${note.text}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(note);
      }
    }
    return out;
  }

  function mergeMoodCards(staticCards, remoteCards) {
    const seen = new Set();
    const out = [];
    for (const list of [staticCards || [], remoteCards || []]) {
      for (const card of list) {
        const key = `${card.date || ''}|${card.text}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(card);
      }
    }
    return out;
  }

  window.ContentLoader = {
    fetchDailyFromFirebase,
    fetchMoodCardsFromFirebase,
    fetchAllMoodCardsFromFirebase,
    mergeDailyLists,
    mergeMoodCards
  };
})();