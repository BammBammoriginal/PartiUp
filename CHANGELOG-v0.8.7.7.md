# BottomUpParti v0.8.7.7 – Sidebar Scope & Mobile QA Fix

- Haupt-Sidebar erhält einen eindeutigen Selektor (`#appSidebar`, `.app-sidebar`).
- Sidebar-CSS wird nicht mehr auf jedes semantische `<aside>` angewendet. Dadurch bleiben z. B. Chat-/Konversationslisten eigenständige Inhaltsbereiche.
- Mobile QA prüft nun, ob die Haupt-Sidebar geometrisch außerhalb des Viewports liegt, statt fälschlich CSS-`visibility` zu erwarten.
- Desktop-/Mobile-Navigationstests adressieren ausschließlich die Haupt-Sidebar.
- Neuer `sidebar-scope-preflight` blockiert zukünftige ungescopte `aside`-Shell-Regeln.
- Keine Änderung an Datenmodell, Rechten, Privacy, APIs oder Produktlogik.
