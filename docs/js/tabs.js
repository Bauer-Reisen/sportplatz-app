// Leiste unten: Liste · Karte · Bewerten. Das Zahnrad oben führt zu „Mehr“.
const ICON = {
  liste: '<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1.2"/><circle cx="4" cy="12" r="1.2"/><circle cx="4" cy="18" r="1.2"/>',
  karte: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
  bewerten: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
};

const TABS = [
  ['liste', 'Liste', '#/'],
  ['karte', 'Karte', '#/karte'],
  ['bewerten', 'Bewerten', '#/bewerten'],
];

export function renderTabs(page) {
  const nav = document.getElementById('tabs');
  const active = page || 'liste';
  nav.innerHTML = TABS.map(([id, label, href]) => `
    <a href="${href}" class="${id === 'bewerten' ? 'tab-main' : ''}" ${id === active ? 'aria-current="page"' : ''}>
      <svg viewBox="0 0 24 24" aria-hidden="true">${ICON[id]}</svg>
      <span>${label}</span>
    </a>`).join('');
  const gear = document.querySelector('.gear');
  if (page === 'mehr') gear.setAttribute('aria-current', 'page');
  else gear.removeAttribute('aria-current');
}
