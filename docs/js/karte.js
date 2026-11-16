// Seite „Karte“: kommt in Abschnitt 5.
export function render(view) {
  view.innerHTML = `
    <section>
      <h1>Karte</h1>
      <div class="card soon">
        <span class="tag">Kommt später</span>
        <p>Hier siehst du bald alle Plätze auf einer Karte – grün, gelb oder rot je nach Note. Zum Stöbern daheim: Wo lohnt sich der nächste Ausflug?</p>
      </div>
    </section>`;
}
