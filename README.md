FITNESS-TAGEBUCH – PWA
======================

Eine eigenständige Web-App (kein Build nötig). Alle Daten bleiben lokal auf
deinem Gerät (localStorage). Kein Konto, keine Cloud.

Dateien:
  index.html, app.js, sw.js, manifest.webmanifest, icons/


1) HOSTEN (Voraussetzung: HTTPS)
--------------------------------
Ein Service Worker / eine installierbare PWA braucht HTTPS. Ausnahme:
"localhost" funktioniert zum Testen auch ohne HTTPS.

Möglichkeiten:
 • Eigener Server: den Ordner-Inhalt in ein Web-Verzeichnis legen (Root oder
   Unterpfad, z. B. https://deinserver.de/tagebuch/). Alle Pfade sind relativ,
   funktioniert also in beiden Fällen.
 • GitHub Pages: Repo anlegen, Dateien hochladen, Pages aktivieren.
 • Netlify: Ordner per Drag-and-drop auf app.netlify.com/drop ziehen.
 • Lokal testen:  cd tagebuch && python3 -m http.server 8000
   dann http://localhost:8000 im Browser öffnen.


2) AUF DEN HOMESCREEN
---------------------
iPhone (WICHTIG: Safari, nicht Chrome):
  URL in Safari öffnen → Teilen-Symbol → "Zum Home-Bildschirm".
  Danach startet die App im Vollbild mit eigenem Icon.

Android (Chrome):
  URL öffnen → Menü (⋮) → "App installieren" bzw. "Zum Startbildschirm".


3) NUTZUNG
----------
 • Tab "Tag": Datum wählen (oder ‹ › / Heute), Werte eintragen. Soll-Werte
   werden vom letzten Tag übernommen. Speichert automatisch.
 • Zitat: auf das Stift-Symbol tippen, um ein eigenes einzutragen.
 • Tab "Gesamtsicht": Verläufe, Durchschnitte, letzte Notizen, Programmstart
   und CSV-Export.


4) BACKUP
---------
Die Daten liegen im Browser-Speicher des Geräts. Wird die App entfernt oder der
Browser-Speicher gelöscht, sind sie weg. Exportiere daher ab und zu die CSV
(Tab "Gesamtsicht" → "CSV exportieren") als Sicherung.


5) UPDATE
---------
Nach Änderungen an den Dateien in sw.js den Wert CACHE_NAME hochzählen
(z. B. "tagebuch-v2"), damit der Cache neu geladen wird.
