// Seite „Meine Plätze“ – dein persönliches Stempelheft. Nur in diesem Handy gespeichert.
import { besuche, ZIELE, alleVergessen } from './besuche.js?v=0.4.4';
import { esc, datum, dialog, toast } from './ui.js?v=0.4.4';

export function render(view) {
  const liste = besuche();
  const n = liste.length;
  const naechstes = ZIELE.find((z) => z > n);
  const besuchZahl = liste.reduce((s, x) => s + x.tage.length, 0);
  view.innerHTML = `
    <section>
      <a class="back" href="#/">‹ Alle Plätze</a>
      <h1>Meine Plätze</h1>
      <div class="card stempel">
        <span class="stempel-zahl">${n}</span>
        <span>${n === 1 ? 'Platz' : 'Plätze'} besucht${besuchZahl > n ? ` · ${besuchZahl} Besuche` : ''}</span>
        ${naechstes ? `<div class="balken" aria-hidden="true"><span style="width:${Math.round((n / naechstes) * 100)}%"></span></div>
        <span class="muted small">Noch ${naechstes - n} bis ${naechstes} Plätze</span>` : '<span class="small">Respekt – echte Groundhopperin, echter Groundhopper! 🏆</span>'}
      </div>
      ${n ? `<ul class="plist">${liste.map((x) => `
        <li><a href="#/platz/${esc(x.id)}">
          <span class="pname">${esc(x.verein)}</span>
          <span class="pmeta">${esc(x.ort)} · ${x.tage.length ? `${x.tage.length > 1 ? `${x.tage.length}× · ` : ''}zuletzt ${datum(x.zuletzt)}` : 'früher mal'}</span>
        </a></li>`).join('')}</ul>`
      : `<p class="lead">Noch leer. Jeder Platz, den du bewertest, kommt automatisch hierher. Auf einer Platzseite kannst du auch <strong>„Hier war ich schon“</strong> antippen.</p>
         <a class="btn btn-primary btn-wide" href="#/">Plätze ansehen</a>`}
      <p class="muted small center" style="margin-top:16px">Nur auf diesem Handy gespeichert – niemand sonst sieht das.</p>
      ${n ? '<p class="center"><button type="button" class="link small" id="loeschen">Liste löschen</button></p>' : ''}
    </section>`;
  view.querySelector('#loeschen')?.addEventListener('click', async () => {
    const r = await dialog({ title: 'Liste löschen?', body: '<p>Deine besuchten Plätze werden auf diesem Handy gelöscht. Deine Bewertungen bleiben.</p>', buttons: [{ label: 'Abbrechen', value: 'nein' }, { label: 'Löschen', value: 'ja', primary: true }] });
    if (r?.value !== 'ja') return;
    alleVergessen();
    toast('Gelöscht.');
    render(view);
  });
}
