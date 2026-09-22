# PartiUp P0.15.2

## Media Presentation Fix
- Kleine/quadratische Beitragsbilder werden nicht mehr künstlich auf die volle Feed-Breite hochskaliert.
- Seitenverhältnis bleibt erhalten; `object-fit: contain` statt zuschneidendem `cover` für Beitragsmedien.
- Desktop- und Mobile-Höhen werden sinnvoll begrenzt.
- Home-/Unified-Feed und Space-/Community-Feed verwenden dieselbe proportionale Logik.
- Intrinsische Bildabmessungen werden im Markup mitgeführt, um Layout-Sprünge zu reduzieren.
- Keine Änderung an Upload-, Permission-, Privacy- oder Federation-Prozessen.
