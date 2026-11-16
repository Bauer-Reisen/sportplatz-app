// Kleine Merkzettel im Gerät (Rundgang gesehen, Hinweis ausgeblendet …).
// Nichts Persönliches. Kann der Browser nicht speichern (privates Fenster), geht trotzdem alles.
const PREFIX = 'halbzeit.';

export const store = {
  get(key) { try { return localStorage.getItem(PREFIX + key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(PREFIX + key, value); } catch { /* egal */ } },
  del(key) { try { localStorage.removeItem(PREFIX + key); } catch { /* egal */ } },
};
