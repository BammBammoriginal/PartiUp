# Installationshinweis v0.8.8

Diese ZIP enthält bewusst kein mitkopiertes `node_modules` und kein altes Lockfile aus einer Vorversion.

Im entpackten Projektordner zuerst:

```powershell
npm.cmd install
npm.cmd rebuild better-sqlite3
npm.cmd audit
npm.cmd run preflight
```

`npm.cmd install` erzeugt das zu v0.8.8 passende `package-lock.json`. Danach funktionieren die Dependency-/Release-Gates gegen genau diesen Stand.
