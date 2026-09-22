# PartiUp P0.4.1

## Federation und Space-Zugang entkoppelt

- Nichtöffentliche (`unlisted`/`private`) Spaces dürfen Federation im Modus `selected` aktivieren.
- In solchen Spaces darf **nur ein ausdrücklich pro Beitrag aktivierter Inhalt** öffentlich föderiert werden.
- Der automatische Modus `public` bleibt für nichtöffentliche Spaces gesperrt.
- Wird ein öffentlich föderierender Space nachträglich nichtöffentlich, wird `public` automatisch auf `selected` herabgestuft statt Federation vollständig abzuschalten.
- `off` bleibt restriktiver Default; `disabled` auf Beitragsebene gewinnt immer.
- Kommentare dürfen nur föderieren, wenn der zugehörige Elternbeitrag die Federation-Grenze passiert.
- UI erklärt ausdrücklich, dass ein Opt-in in einem geschlossenen Space eine öffentliche Veröffentlichung außerhalb des Spaces bedeutet.

Damit sind Space-Zugang und Außenkommunikation getrennte Policies, ohne private Inhalte implizit zu veröffentlichen.
