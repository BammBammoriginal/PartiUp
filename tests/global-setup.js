const fs = require('fs');
const path = require('path');

module.exports = async () => {
  // Keine bestehende SQLite-Datei mehr löschen: playwright.config.js erzeugt
  // pro QA-Lauf einen eindeutigen DB-Pfad. Das vermeidet EBUSY unter Windows.
  fs.mkdirSync(path.join(__dirname, '..', 'data'), { recursive: true });
};
