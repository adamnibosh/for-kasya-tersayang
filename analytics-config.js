// ═══ ANALYTICS SETUP (one-time) ═══
// 1. Go to https://console.firebase.google.com → Create project
// 2. Build → Realtime Database → Create database (any region)
// 3. Rules tab → paste:
//    { "rules": { "events": { ".read": true, ".write": true } } } }
// 4. Copy your Database URL (ends with .firebaseio.com or firebasedatabase.app)
// 5. Paste below, set enabled: true, deploy

const ANALYTICS_CONFIG = {
  enabled: false,
  firebaseDatabaseUrl: '',
  adminPasscode: '0909'
};