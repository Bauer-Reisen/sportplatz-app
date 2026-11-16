// Seite „Bewerten“: kommt in Abschnitt 3.
export function render(view) {
  view.innerHTML = `
    <section>
      <h1>Bewerten</h1>
      <div class="card soon">
        <span class="tag">Kommt bald</span>
        <p>So wird es gehen:</p>
        <ol>
          <li>Platz wählen (oder <strong>Wo bin ich?</strong>)</li>
          <li><strong>Gesamt-Sterne</strong> antippen – das reicht schon</li>
          <li>Wer mag: Bier, Essen, Preise, Stimmung und was es gibt</li>
          <li><strong>Senden</strong> – fertig, auch ohne Netz</li>
        </ol>
      </div>
    </section>`;
}
