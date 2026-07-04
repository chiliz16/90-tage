/*
  Fitness journal (standalone PWA build).
  UI copy is German to match the paper page it reproduces.
  Persistence: localStorage, single JSON blob. Data stays on the device.

  Storage shape: { config: { startDate }, entries: { "YYYY-MM-DD": Entry } }
*/
(function () {
  "use strict";

  var STORAGE_KEY = "fitness-journal-data";

  // ~90 quotes about success/effort. Attributions are limited to verifiable
  // public-domain sources; proverbs are marked as such; author-less entries are
  // original lines (empty author => no author shown).
  var QUOTES = [
    { t: "Jeder Tag ist eine neue Chance, das zu tun, was du möchtest.", a: "Friedrich Schiller" },
    { t: "Es ist nicht genug zu wollen, man muss auch tun.", a: "Johann Wolfgang von Goethe" },
    { t: "Nicht weil es schwer ist, wagen wir es nicht, sondern weil wir es nicht wagen, ist es schwer.", a: "Seneca" },
    { t: "Was mich nicht umbringt, macht mich stärker.", a: "Friedrich Nietzsche" },
    { t: "Wer immer strebend sich bemüht, den können wir erlösen.", a: "Johann Wolfgang von Goethe" },
    { t: "Was dem Weg im Wege steht, wird zum Weg.", a: "Mark Aurel" },
    { t: "Du hast Macht über deinen Geist, nicht über äußere Ereignisse — darin liegt deine Stärke.", a: "Mark Aurel" },
    { t: "Keine große Sache entsteht plötzlich.", a: "Epiktet" },
    { t: "Nicht die Dinge beunruhigen uns, sondern unsere Urteile über die Dinge.", a: "Epiktet" },
    { t: "Solange du lebst, lerne zu leben.", a: "Seneca" },
    { t: "Das Feuer prüft das Gold, das Unglück die Starken.", a: "Seneca" },
    { t: "Wer nicht weiß, welchen Hafen er ansteuert, für den ist kein Wind der richtige.", a: "Seneca" },
    { t: "Es gibt keinen leichten Weg von der Erde zu den Sternen.", a: "Seneca" },
    { t: "Eine Reise von tausend Meilen beginnt mit einem einzigen Schritt.", a: "Laotse" },
    { t: "Der stete Tropfen höhlt den Stein.", a: "Ovid" },
    { t: "Arbeit besiegt alles.", a: "Vergil — Labor omnia vincit" },
    { t: "Sie können, weil sie glauben, dass sie können.", a: "Vergil" },
    { t: "Wer angefangen hat, hat schon die Hälfte getan.", a: "Horaz" },
    { t: "Nutze den Tag.", a: "Horaz — Carpe diem" },
    { t: "Jeder Tag ist der Schüler des vorigen.", a: "Publilius Syrus" },
    { t: "Der Langsamste, der sein Ziel nicht aus den Augen verliert, geht noch geschwinder als jener, der ohne Ziel umherirrt.", a: "Gotthold Ephraim Lessing" },
    { t: "Habe Mut, dich deines eigenen Verstandes zu bedienen.", a: "Immanuel Kant — Sapere aude" },
    { t: "Es muss anders werden, wenn es gut werden soll.", a: "Georg Christoph Lichtenberg" },
    { t: "Wer aufhört, besser zu werden, hat aufgehört, gut zu sein.", a: "Marie von Ebner-Eschenbach" },
    { t: "Das Vertrauen in dich selbst ist das erste Geheimnis des Erfolgs.", a: "Ralph Waldo Emerson" },
    { t: "Fleiß ist die Mutter des Glücks.", a: "Benjamin Franklin" },
    { t: "Genie ist ein Prozent Inspiration und neunundneunzig Prozent Transpiration.", a: "Thomas Edison" },
    { t: "Ich bin nicht gescheitert. Ich habe nur zehntausend Wege gefunden, die nicht funktionieren.", a: "Thomas Edison" },
    { t: "Nichts auf der Welt kann Beharrlichkeit ersetzen.", a: "Calvin Coolidge" },
    { t: "Tu, was du kannst, mit dem, was du hast, dort, wo du bist.", a: "Theodore Roosevelt" },
    { t: "Glaube, dass du es kannst, und du bist schon halb am Ziel.", a: "Theodore Roosevelt" },
    { t: "Man muss nichts im Leben fürchten, man muss es nur verstehen.", a: "Marie Curie" },
    { t: "Der Sieg gehört dem Beharrlichsten.", a: "Napoleon Bonaparte" },
    { t: "Das Wort ‚unmöglich' steht nur im Wörterbuch der Narren.", a: "Napoleon Bonaparte" },
    { t: "Wir sind, was wir wiederholt tun. Exzellenz ist daher keine Tat, sondern eine Gewohnheit.", a: "Will Durant" },
    { t: "Wer nicht sät, wird nicht ernten.", a: "Sprichwort" },
    { t: "Durch Mühsal zu den Sternen.", a: "Per aspera ad astra" },
    { t: "Den Mutigen hilft das Glück.", a: "Fortes fortuna adiuvat" },
    { t: "Eile mit Weile.", a: "Festina lente" },
    { t: "Solange ich atme, hoffe ich.", a: "Dum spiro, spero" },
    { t: "Ohne Fleiß kein Preis.", a: "Sprichwort" },
    { t: "Übung macht den Meister.", a: "Sprichwort" },
    { t: "Wer rastet, der rostet.", a: "Sprichwort" },
    { t: "Von nichts kommt nichts.", a: "Sprichwort" },
    { t: "Wer wagt, gewinnt.", a: "Sprichwort" },
    { t: "Aller Anfang ist schwer.", a: "Sprichwort" },
    { t: "Erst die Arbeit, dann das Vergnügen.", a: "Sprichwort" },
    { t: "Was du heute kannst besorgen, das verschiebe nicht auf morgen.", a: "Sprichwort" },
    { t: "Der frühe Vogel fängt den Wurm.", a: "Sprichwort" },
    { t: "Morgenstund hat Gold im Mund.", a: "Sprichwort" },
    { t: "Es ist noch kein Meister vom Himmel gefallen.", a: "Sprichwort" },
    { t: "Wer will, findet Wege; wer nicht will, findet Gründe.", a: "Sprichwort" },
    { t: "Wo ein Wille ist, ist auch ein Weg.", a: "Sprichwort" },
    { t: "Jeder ist seines Glückes Schmied.", a: "Sprichwort" },
    { t: "Geduld bringt Rosen.", a: "Sprichwort" },
    { t: "Probieren geht über Studieren.", a: "Sprichwort" },
    { t: "Rom wurde nicht an einem Tag erbaut.", a: "Sprichwort" },
    { t: "Man wächst mit seinen Aufgaben.", a: "Sprichwort" },
    { t: "Wer den Gipfel erreichen will, muss unten anfangen.", a: "Sprichwort" },
    { t: "Kleine Schritte führen auch zum Ziel.", a: "Sprichwort" },
    { t: "Beharrlichkeit überwindet allen Widerstand.", a: "Sprichwort" },
    { t: "Wer A sagt, muss auch B sagen.", a: "Sprichwort" },
    { t: "Disziplin ist, das zu tun, was du dir vorgenommen hast — auch wenn die Lust längst weg ist.", a: "" },
    { t: "Der schwerste Schritt ist der aus der Tür. Alles danach ist leichter.", a: "" },
    { t: "Konsequenz schlägt Intensität — zeig einfach jeden Tag auf.", a: "" },
    { t: "Motivation bringt dich zum Start, Gewohnheit bringt dich ins Ziel.", a: "" },
    { t: "Du musst es nicht gut machen. Du musst es nur machen.", a: "" },
    { t: "Fortschritt ist selten laut. Meistens ist er nur beständig.", a: "" },
    { t: "Was du heute übst, wird morgen leicht.", a: "" },
    { t: "Ein durchschnittlicher Trainingstag schlägt jeden perfekten Plan, der nur im Kopf bleibt.", a: "" },
    { t: "Die Tage, an denen du keine Lust hast, zählen am meisten.", a: "" },
    { t: "Vergleich dich mit dir von gestern, nicht mit irgendwem.", a: "" },
    { t: "Erst kommt die Anstrengung, dann das Können — nie umgekehrt.", a: "" },
    { t: "Ziele setzt man einmal. Systeme lebt man täglich.", a: "" },
    { t: "Niemand sieht die Arbeit. Alle sehen das Ergebnis.", a: "" },
    { t: "Ein Prozent besser — jeden Tag.", a: "" },
    { t: "Der Rückschlag ist Teil des Plans, nicht sein Ende.", a: "" },
    { t: "Du bist näher dran, als es sich gerade anfühlt.", a: "" },
    { t: "Mach den nächsten Schritt. Nur den einen.", a: "" },
    { t: "Anfangen ist die halbe Miete — die andere Hälfte ist Dranbleiben.", a: "" },
    { t: "Zwölf Wochen konsequent verändern mehr als ein Jahr Vorsätze.", a: "" },
    { t: "Nicht jeder Tag ist stark. Aber jeder Tag zählt.", a: "" },
    { t: "Ergebnisse folgen der Beständigkeit, nicht der Begeisterung.", a: "" },
    { t: "Heute die Arbeit, für die dein zukünftiges Ich dir dankt.", a: "" },
    { t: "Kleine Gewohnheiten, groß aufsummiert — das ist der ganze Trick.", a: "" },
    { t: "Wer jeden Tag ein Stück besser wird, ist nicht zu stoppen.", a: "" },
    { t: "Aufschieben kostet mehr Kraft als anfangen.", a: "" },
    { t: "Der Plan ist nichts, das Dranbleiben ist alles.", a: "" },
    { t: "Zeig auf — der Rest ergibt sich.", a: "" },
    { t: "Dein Wille von heute ist die Freiheit von morgen.", a: "" }
  ];

  var MACRO_FIELDS = [
    { key: "calories", label: "Kalorienziel" },
    { key: "protein", label: "Protein" },
    { key: "fat", label: "Fett" },
    { key: "carbs", label: "Kohlenhydrate" }
  ];
  var LIFE_FIELDS = [
    { key: "sleep", label: "Schlaf" },
    { key: "steps", label: "Schritte" },
    { key: "water", label: "Trinken" }
  ];
  var PAIR_KEYS = MACRO_FIELDS.concat(LIFE_FIELDS).map(function (f) { return f.key; });
  // Yes/No tracker blocks shown on the daily page (same style as Krafttraining).
  var TRACKERS = [
    { key: "strength", title: "Krafttraining", fields: [
      { key: "planned", label: "geplant" },
      { key: "done", label: "durchgeführt" },
      { key: "progression", label: "Progression" }
    ] },
    { key: "techLearning", title: "Tech lernen", fields: [
      { key: "planned", label: "geplant" },
      { key: "done", label: "durchgeführt" }
    ] },
    { key: "application", title: "Bewerbung", fields: [
      { key: "planned", label: "geplant" },
      { key: "done", label: "durchgeführt" }
    ] }
  ];

  // ---------- date helpers ----------
  function pad(n) { return String(n).padStart(2, "0"); }
  function todayISO() {
    var d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function isoToDate(iso) {
    var p = iso.split("-").map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  }
  function addDays(iso, delta) {
    var d = isoToDate(iso);
    d.setDate(d.getDate() + delta);
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function diffDays(fromIso, toIso) {
    return Math.round((isoToDate(toIso).getTime() - isoToDate(fromIso).getTime()) / 86400000);
  }
  function formatDE(iso) {
    var d = isoToDate(iso);
    return pad(d.getDate()) + "." + pad(d.getMonth() + 1) + "." + d.getFullYear();
  }
  function shortDE(iso) {
    var d = isoToDate(iso);
    return pad(d.getDate()) + "." + pad(d.getMonth() + 1) + ".";
  }

  // Parse a loosely-typed number ("2,5 L", "9.800", "7.5h") to float or null.
  function parseNum(raw) {
    if (raw == null) return null;
    var s = String(raw).trim();
    if (!s) return null;
    s = s.replace(/[^0-9.,-]/g, "");
    if (!s) return null;
    var hasDot = s.indexOf(".") !== -1, hasComma = s.indexOf(",") !== -1;
    if (hasDot && hasComma) {
      // German style: "." thousands, "," decimal
      s = s.replace(/\./g, "").replace(",", ".");
    } else if (hasComma) {
      s = s.replace(",", ".");
    } else if (hasDot && /^-?\d{1,3}(\.\d{3})+$/.test(s)) {
      // lone dot(s) grouping 3 trailing digits -> thousands separator (e.g. "9.800")
      s = s.replace(/\./g, "");
    }
    var n = parseFloat(s);
    return isFinite(n) ? n : null;
  }

  function emptyEntry() {
    var e = { weight: "", movement: "", wentWell: ["", "", ""], todayActions: ["", "", ""] };
    TRACKERS.forEach(function (t) {
      var o = {};
      t.fields.forEach(function (f) { o[f.key] = null; });
      e[t.key] = o;
    });
    for (var i = 0; i < PAIR_KEYS.length; i++) e[PAIR_KEYS[i]] = { target: "", actual: "" };
    return e;
  }

  function hasContent(e) {
    if (!e) return false;
    if (e.weight) return true;
    if (e.movement) return true;
    if (e.customQuote) return true;
    for (var i = 0; i < PAIR_KEYS.length; i++) {
      var k = PAIR_KEYS[i];
      if (e[k] && (e[k].target || e[k].actual)) return true;
    }
    for (var t = 0; t < TRACKERS.length; t++) {
      var o = e[TRACKERS[t].key];
      if (o) {
        var f = TRACKERS[t].fields;
        for (var g = 0; g < f.length; g++) if (o[f[g].key] != null) return true;
      }
    }
    if ((e.wentWell || []).some(Boolean)) return true;
    if ((e.todayActions || []).some(Boolean)) return true;
    return false;
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // ---------- state ----------
  var state = {
    data: null,
    tab: "day",
    current: todayISO(),
    editingQuote: false,
    quoteDraft: ""
  };
  var statusTimer = null;

  function load() {
    var fresh = { config: { startDate: todayISO() }, entries: {} };
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.entries) {
          fresh = { config: parsed.config || { startDate: todayISO() }, entries: parsed.entries };
        }
      }
    } catch (err) { /* start fresh */ }
    state.data = fresh;
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
      setStatus("Gespeichert", true);
    } catch (err) {
      setStatus("Nicht gespeichert", false);
    }
  }

  function setStatus(text, ok) {
    var el = document.getElementById("status");
    if (!el) return;
    el.textContent = text;
    el.className = "status" + (ok ? " ok" : "");
    if (statusTimer) clearTimeout(statusTimer);
    statusTimer = setTimeout(function () {
      var e2 = document.getElementById("status");
      if (e2) { e2.textContent = ""; e2.className = "status"; }
    }, 1600);
  }

  // Targets carried over from the most recent prior day with data.
  function priorTargets(beforeIso) {
    var dates = Object.keys(state.data.entries).filter(function (d) { return d < beforeIso; }).sort();
    for (var i = dates.length - 1; i >= 0; i--) {
      var e = state.data.entries[dates[i]];
      var out = {}, any = false;
      for (var j = 0; j < PAIR_KEYS.length; j++) {
        var k = PAIR_KEYS[j];
        var t = e[k] && e[k].target ? e[k].target : "";
        if (t) any = true;
        out[k] = t;
      }
      if (any) return out;
    }
    return {};
  }

  // Entry shown for the current day: stored one, or a pre-filled blank (not persisted).
  function getWorking() {
    if (state.data.entries[state.current]) return state.data.entries[state.current];
    var base = emptyEntry();
    var carry = priorTargets(state.current);
    for (var i = 0; i < PAIR_KEYS.length; i++) {
      var k = PAIR_KEYS[i];
      if (carry[k]) base[k].target = carry[k];
    }
    return base;
  }

  // Get the persisted entry for the current day, creating it (pre-filled) if absent.
  function ensureEntry() {
    if (!state.data.entries[state.current]) {
      var base = emptyEntry();
      var carry = priorTargets(state.current);
      for (var i = 0; i < PAIR_KEYS.length; i++) {
        var k = PAIR_KEYS[i];
        if (carry[k]) base[k].target = carry[k];
      }
      state.data.entries[state.current] = base;
    }
    return state.data.entries[state.current];
  }

  // ---------- rendering ----------
  function renderTabs() {
    var tabs = document.getElementById("tabs");
    tabs.innerHTML =
      '<button class="tab" data-tab="day">Tag</button>' +
      '<button class="tab" data-tab="overview">Gesamtsicht</button>';
    var btns = tabs.querySelectorAll(".tab");
    for (var i = 0; i < btns.length; i++) {
      if (btns[i].getAttribute("data-tab") === state.tab) btns[i].classList.add("active");
      btns[i].addEventListener("click", function () {
        state.tab = this.getAttribute("data-tab");
        renderTabs();
        renderView();
      });
    }
  }

  function renderView() {
    if (state.tab === "day") renderDay();
    else renderOverview();
  }

  function pairRowHtml(field) {
    return '' +
      '<div class="pairrow">' +
        '<div class="flabel">' + field.label + '</div>' +
        '<div class="si"><span class="tag">Soll</span><input class="bar" inputmode="decimal" data-k="' + field.key + '" data-sub="target"></div>' +
        '<div class="si"><span class="tag">Ist</span><input class="bar" inputmode="decimal" data-k="' + field.key + '" data-sub="actual"></div>' +
      '</div>';
  }

  function renderDay() {
    var view = document.getElementById("view");
    var w = getWorking();
    var start = state.data.config.startDate;
    var dayNum = diffDays(start, state.current) + 1;
    var idx = (((dayNum - 1) % QUOTES.length) + QUOTES.length) % QUOTES.length;
    var rot = QUOTES[idx];
    var showCustom = !!w.customQuote;

    var quoteBlock;
    if (state.editingQuote) {
      quoteBlock =
        '<div class="qbox">' +
          '<textarea id="qdraft" rows="3"></textarea>' +
          '<div class="qactions">' +
            '<button class="primary" id="qsave">Fertig</button>' +
            '<button id="qreset">Zurücksetzen</button>' +
            '<button id="qcancel">Abbrechen</button>' +
          '</div>' +
        '</div>';
    } else {
      quoteBlock =
        '<p class="quote">' + escapeHtml(showCustom ? w.customQuote : rot.t) + '</p>' +
        (showCustom || !rot.a ? '' : '<p class="qauthor">' + rot.a + '</p>') +
        '<button class="qedit" id="qedit" title="Zitat bearbeiten">&#9998;</button>';
    }

    var macros = MACRO_FIELDS.map(pairRowHtml).join("");
    var life = LIFE_FIELDS.map(pairRowHtml).join("");

    var trackerBlocks = TRACKERS.map(function (t) {
      var tg = t.fields.map(function (s) {
        return '' +
          '<div class="tgroup"><span class="tl">' + s.label + '</span>' +
            '<button class="pill" data-tracker="' + t.key + '" data-field="' + s.key + '" data-val="yes">ja</button>' +
            '<button class="pill no" data-tracker="' + t.key + '" data-field="' + s.key + '" data-val="no">nein</button>' +
          '</div>';
      }).join("");
      return '<div class="section-title">' + t.title + '</div><div class="toggles">' + tg + '</div>';
    }).join("");

    function reflBlock(list) {
      var out = "";
      for (var i = 0; i < 3; i++) {
        out += '<div class="ritem"><span class="dot"></span>' +
          '<input class="lineinput" data-refl="' + list + '" data-i="' + i + '"></div>';
      }
      return out;
    }

    view.innerHTML =
      '<div class="sheet">' +
        '<div class="topbar">' +
          '<div class="datefield"><span class="lbl">Datum</span><input type="date" id="dateInput"></div>' +
          '<div class="nav">' +
            '<button class="navbtn" id="prevDay" aria-label="Vorheriger Tag">&#8249;</button>' +
            '<button class="today" id="todayBtn">Heute</button>' +
            '<button class="navbtn" id="nextDay" aria-label="N&auml;chster Tag">&#8250;</button>' +
          '</div>' +
        '</div>' +
        '<div class="daytagwrap"><span class="daytag">' + (dayNum >= 1 ? "Tag " + dayNum : formatDE(state.current)) + '</span></div>' +
        '<div class="quotewrap">' + quoteBlock + '</div>' +
        '<div class="weightrow"><span class="k">K&ouml;rpergewicht</span>' +
          '<input class="bar" style="max-width:230px" inputmode="decimal" data-weight="1"></div>' +
        macros +
        '<div class="blockgap"></div>' +
        life +
        trackerBlocks +
        '<div class="section-title">Sonstige Bewegung</div>' +
        '<div class="notewrap"><input class="lineinput noteinput" data-note="movement"></div>' +
        '<div class="section-title">Drei Dinge, die gestern gut liefen</div>' +
        '<div class="reflect">' + reflBlock("wentWell") + '</div>' +
        '<div class="section-title">Drei Dinge, die ich heute umsetze</div>' +
        '<div class="reflect">' + reflBlock("todayActions") + '</div>' +
        '<div class="footer"><span class="pageno">' + (dayNum >= 1 ? dayNum : "") + '</span>' +
          '<span class="status" id="status"></span></div>' +
      '</div>';

    // ---- set values + wire (no full re-render on typing, so focus is kept) ----
    var dateInput = document.getElementById("dateInput");
    dateInput.value = state.current;
    dateInput.addEventListener("change", function () {
      if (this.value) { state.current = this.value; renderDay(); }
    });
    document.getElementById("prevDay").addEventListener("click", function () { state.current = addDays(state.current, -1); renderDay(); });
    document.getElementById("nextDay").addEventListener("click", function () { state.current = addDays(state.current, 1); renderDay(); });
    document.getElementById("todayBtn").addEventListener("click", function () { state.current = todayISO(); renderDay(); });

    if (state.editingQuote) {
      var draft = document.getElementById("qdraft");
      draft.value = state.quoteDraft;
      document.getElementById("qsave").addEventListener("click", function () {
        var v = document.getElementById("qdraft").value.trim();
        var e = ensureEntry(); e.customQuote = v || undefined; persist();
        state.editingQuote = false; renderDay();
      });
      document.getElementById("qreset").addEventListener("click", function () {
        var e = ensureEntry(); e.customQuote = undefined; persist();
        state.editingQuote = false; renderDay();
      });
      document.getElementById("qcancel").addEventListener("click", function () {
        state.editingQuote = false; renderDay();
      });
    } else {
      document.getElementById("qedit").addEventListener("click", function () {
        state.quoteDraft = showCustom ? w.customQuote : rot.t;
        state.editingQuote = true; renderDay();
      });
    }

    var weightInput = view.querySelector("[data-weight]");
    weightInput.value = w.weight || "";
    weightInput.addEventListener("input", function () {
      ensureEntry().weight = this.value; persist();
    });

    var noteInput = view.querySelector('[data-note="movement"]');
    noteInput.value = w.movement || "";
    noteInput.addEventListener("input", function () {
      ensureEntry().movement = this.value; persist();
    });

    var pairInputs = view.querySelectorAll("input[data-k]");
    for (var i = 0; i < pairInputs.length; i++) {
      (function (input) {
        var k = input.getAttribute("data-k");
        var sub = input.getAttribute("data-sub");
        input.value = (w[k] && w[k][sub]) ? w[k][sub] : "";
        input.addEventListener("input", function () {
          ensureEntry()[k][sub] = this.value; persist();
        });
      })(pairInputs[i]);
    }

    var reflInputs = view.querySelectorAll("input[data-refl]");
    for (var r = 0; r < reflInputs.length; r++) {
      (function (input) {
        var list = input.getAttribute("data-refl");
        var i2 = parseInt(input.getAttribute("data-i"), 10);
        input.value = (w[list] && w[list][i2]) ? w[list][i2] : "";
        input.addEventListener("input", function () {
          ensureEntry()[list][i2] = this.value; persist();
        });
      })(reflInputs[r]);
    }

    // toggles: set initial state, then update classes directly on click
    TRACKERS.forEach(function (t) {
      t.fields.forEach(function (s) {
        var sel = '[data-tracker="' + t.key + '"][data-field="' + s.key + '"]';
        var yes = view.querySelector(sel + '[data-val="yes"]');
        var no = view.querySelector(sel + '[data-val="no"]');
        function paint(val) {
          yes.className = "pill" + (val === true ? " on" : "");
          no.className = "pill no" + (val === false ? " on no" : "");
        }
        paint(w[t.key] ? w[t.key][s.key] : null);
        yes.addEventListener("click", function () {
          var e = ensureEntry();
          if (!e[t.key]) e[t.key] = {};
          e[t.key][s.key] = e[t.key][s.key] === true ? null : true;
          persist(); paint(e[t.key][s.key]);
        });
        no.addEventListener("click", function () {
          var e = ensureEntry();
          if (!e[t.key]) e[t.key] = {};
          e[t.key][s.key] = e[t.key][s.key] === false ? null : false;
          persist(); paint(e[t.key][s.key]);
        });
      });
    });
  }

  // ---------- charts (hand-drawn SVG, no dependencies) ----------
  function lineChart(series, lines) {
    // series: [{x, key:num|null}], lines: [{key,color,dash,dots}]
    var vals = [];
    series.forEach(function (row) {
      lines.forEach(function (ln) {
        var v = row[ln.key];
        if (v != null && isFinite(v)) vals.push(v);
      });
    });
    if (!vals.length) return "";

    var W = 340, H = 190, pl = 40, pr = 12, pt = 10, pb = 22;
    var plotW = W - pl - pr, plotH = H - pt - pb;
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    var padY = (max - min) * 0.12 || Math.abs(max) * 0.1 || 1;
    var yMin = min - padY, yMax = max + padY;
    if (yMax === yMin) { yMax += 1; yMin -= 1; }
    var n = series.length;

    function xAt(i) { return n <= 1 ? pl + plotW / 2 : pl + (i / (n - 1)) * plotW; }
    function yAt(v) { return pt + (1 - (v - yMin) / (yMax - yMin)) * plotH; }

    var round = function (v) {
      var a = Math.abs(v);
      var dec = a >= 100 ? 0 : a >= 10 ? 0 : 1;
      return v.toLocaleString("de-DE", { maximumFractionDigits: dec });
    };

    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" preserveAspectRatio="xMidYMid meet" role="img">';

    // horizontal gridlines + y labels (min, mid, max)
    [0, 0.5, 1].forEach(function (f) {
      var val = yMin + (yMax - yMin) * f;
      var y = yAt(val);
      svg += '<line x1="' + pl + '" y1="' + y.toFixed(1) + '" x2="' + (W - pr) + '" y2="' + y.toFixed(1) + '" stroke="#E6E4EE" stroke-width="1"/>';
      svg += '<text x="' + (pl - 6) + '" y="' + (y + 3).toFixed(1) + '" text-anchor="end" font-size="10" fill="#5A5780">' + round(val) + '</text>';
    });

    // x labels: first, middle, last
    var xi = n === 1 ? [0] : (n === 2 ? [0, n - 1] : [0, Math.floor((n - 1) / 2), n - 1]);
    xi.forEach(function (i) {
      var anchor = i === 0 ? "start" : (i === n - 1 ? "end" : "middle");
      svg += '<text x="' + xAt(i).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="' + anchor + '" font-size="10" fill="#5A5780">' + series[i].x + '</text>';
    });

    // lines
    lines.forEach(function (ln) {
      var pts = [];
      series.forEach(function (row, i) {
        var v = row[ln.key];
        if (v != null && isFinite(v)) pts.push([xAt(i), yAt(v)]);
      });
      if (pts.length) {
        var dstr = pts.map(function (p, i) { return (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" ");
        svg += '<path d="' + dstr + '" fill="none" stroke="' + ln.color + '" stroke-width="' + (ln.dash ? 2 : 2.4) + '"' +
          (ln.dash ? ' stroke-dasharray="4 4"' : "") + ' stroke-linejoin="round" stroke-linecap="round"/>';
        if (ln.dots) {
          pts.forEach(function (p) {
            svg += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="2.5" fill="' + ln.color + '"/>';
          });
        }
      }
    });

    svg += "</svg>";
    return svg;
  }

  function renderOverview() {
    var view = document.getElementById("view");
    var entries = state.data.entries;
    var dates = Object.keys(entries).filter(function (d) { return hasContent(entries[d]); }).sort();

    var weightSeries = [], calSeries = [], proteinSeries = [];
    var sleepSum = 0, sleepN = 0, stepsSum = 0, stepsN = 0, waterSum = 0, waterN = 0;
    var doneY = 0, doneTotal = 0, techY = 0, techTotal = 0, appY = 0, appTotal = 0;

    dates.forEach(function (d) {
      var e = entries[d], lbl = shortDE(d);
      var w = parseNum(e.weight);
      if (w != null) weightSeries.push({ x: lbl, w: w });
      var cs = parseNum(e.calories.target), ci = parseNum(e.calories.actual);
      if (cs != null || ci != null) calSeries.push({ x: lbl, soll: cs, ist: ci });
      var ps = parseNum(e.protein.target), pi = parseNum(e.protein.actual);
      if (ps != null || pi != null) proteinSeries.push({ x: lbl, soll: ps, ist: pi });
      var sl = parseNum(e.sleep.actual); if (sl != null) { sleepSum += sl; sleepN++; }
      var st = parseNum(e.steps.actual); if (st != null) { stepsSum += st; stepsN++; }
      var wa = parseNum(e.water.actual); if (wa != null) { waterSum += wa; waterN++; }
      if (e.strength && e.strength.done != null) { doneTotal++; if (e.strength.done === true) doneY++; }
      if (e.techLearning && e.techLearning.done != null) { techTotal++; if (e.techLearning.done === true) techY++; }
      if (e.application && e.application.done != null) { appTotal++; if (e.application.done === true) appY++; }
    });

    function fmt(v, dec) {
      return v == null ? "–" : v.toLocaleString("de-DE", { maximumFractionDigits: dec || 0 });
    }
    var avgSleep = sleepN ? sleepSum / sleepN : null;
    var avgSteps = stepsN ? stepsSum / stepsN : null;
    var avgWater = waterN ? waterSum / waterN : null;
    var trainRate = doneTotal ? Math.round((doneY / doneTotal) * 100) : null;
    var techRate = techTotal ? Math.round((techY / techTotal) * 100) : null;
    var appRate = appTotal ? Math.round((appY / appTotal) * 100) : null;

    var legend = '<span class="legend"><span><i style="background:#B9B4D6"></i>Soll</span><span><i style="background:#574B90"></i>Ist</span></span>';

    var html = '<div class="ov"><h2>Gesamtsicht</h2><p class="sub">' +
      (dates.length ? dates.length + " erfasste Tage" : "Noch keine Eintr\u00e4ge") + '</p>';

    if (!dates.length) {
      html += '<div class="empty">Sobald du Tage ausf\u00fcllst, erscheinen hier deine Verl\u00e4ufe.</div>';
    } else {
      html += '<div class="cards">' +
        '<div class="card"><div class="num">' + fmt(avgSleep, 1) + '</div><div class="cl">\u00d8 Schlaf</div></div>' +
        '<div class="card"><div class="num">' + fmt(avgSteps) + '</div><div class="cl">\u00d8 Schritte</div></div>' +
        '<div class="card"><div class="num">' + (avgWater == null ? "–" : fmt(avgWater, 1)) + '</div><div class="cl">\u00d8 Trinken</div></div>' +
        '<div class="card"><div class="num">' + (trainRate == null ? "–" : trainRate + "%") + '</div><div class="cl">Training erledigt</div></div>' +
        '<div class="card"><div class="num">' + (techRate == null ? "–" : techRate + "%") + '</div><div class="cl">Tech gelernt</div></div>' +
        '<div class="card"><div class="num">' + (appRate == null ? "–" : appRate + "%") + '</div><div class="cl">Beworben</div></div>' +
        '</div>';

      var wc = lineChart(weightSeries, [{ key: "w", color: "#574B90", dots: true }]);
      if (wc) html += '<div class="chartblock"><div class="charthead"><span class="ct">K\u00f6rpergewicht</span></div>' + wc + '</div>';

      var cc = lineChart(calSeries, [{ key: "soll", color: "#B9B4D6", dash: true }, { key: "ist", color: "#574B90", dots: true }]);
      if (cc) html += '<div class="chartblock"><div class="charthead"><span class="ct">Kalorien</span>' + legend + '</div>' + cc + '</div>';

      var pc = lineChart(proteinSeries, [{ key: "soll", color: "#B9B4D6", dash: true }, { key: "ist", color: "#574B90", dots: true }]);
      if (pc) html += '<div class="chartblock"><div class="charthead"><span class="ct">Protein</span>' + legend + '</div>' + pc + '</div>';

      var recent = dates.slice().reverse().filter(function (d) {
        return (entries[d].wentWell || []).some(Boolean) || (entries[d].todayActions || []).some(Boolean);
      }).slice(0, 4);

      if (recent.length) {
        html += '<div class="reflog"><div class="rt">Letzte Notizen</div>';
        recent.forEach(function (d) {
          var e = entries[d];
          var items = "";
          (e.wentWell || []).filter(Boolean).forEach(function (g) { items += '<li>\u2713 ' + escapeHtml(g) + '</li>'; });
          (e.todayActions || []).filter(Boolean).forEach(function (t) { items += '<li>\u2192 ' + escapeHtml(t) + '</li>'; });
          html += '<div class="rday"><div class="rd">' + formatDE(d) + '</div><ul>' + items + '</ul></div>';
        });
        html += '</div>';
      }
    }

    html += '<div class="setrow"><span>Programmstart (Tag 1):</span>' +
      '<input type="date" id="startInput">' +
      '<button class="exportbtn" id="csvBtn">CSV exportieren</button></div>';
    html += '</div>';

    view.innerHTML = html;

    var startInput = document.getElementById("startInput");
    startInput.value = state.data.config.startDate;
    startInput.addEventListener("change", function () {
      if (this.value) { state.data.config.startDate = this.value; persist(); renderOverview(); }
    });
    document.getElementById("csvBtn").addEventListener("click", exportCSV);
  }

  function exportCSV() {
    var cols = ["Datum", "Tag", "K\u00f6rpergewicht",
      "Kalorien Soll", "Kalorien Ist", "Protein Soll", "Protein Ist",
      "Fett Soll", "Fett Ist", "Kohlenhydrate Soll", "Kohlenhydrate Ist",
      "Schlaf Soll", "Schlaf Ist", "Schritte Soll", "Schritte Ist", "Trinken Soll", "Trinken Ist",
      "Training geplant", "Training durchgef\u00fchrt", "Progression",
      "Tech geplant", "Tech durchgef\u00fchrt", "Bewerbung geplant", "Bewerbung durchgef\u00fchrt",
      "Sonstige Bewegung",
      "Gut 1", "Gut 2", "Gut 3", "Umsetzen 1", "Umsetzen 2", "Umsetzen 3"];
    function yn(b) { return b === true ? "ja" : b === false ? "nein" : ""; }
    function esc(v) {
      var s = v == null ? "" : String(v);
      return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }
    var rows = [cols.join(";")];
    var start = state.data.config.startDate;
    Object.keys(state.data.entries).sort().forEach(function (d) {
      var e = state.data.entries[d];
      if (!hasContent(e)) return;
      var tag = diffDays(start, d) + 1;
      var r = [d, tag >= 1 ? tag : "", e.weight,
        e.calories.target, e.calories.actual, e.protein.target, e.protein.actual,
        e.fat.target, e.fat.actual, e.carbs.target, e.carbs.actual,
        e.sleep.target, e.sleep.actual, e.steps.target, e.steps.actual, e.water.target, e.water.actual,
        yn(e.strength ? e.strength.planned : null), yn(e.strength ? e.strength.done : null), yn(e.strength ? e.strength.progression : null),
        yn(e.techLearning ? e.techLearning.planned : null), yn(e.techLearning ? e.techLearning.done : null),
        yn(e.application ? e.application.planned : null), yn(e.application ? e.application.done : null),
        e.movement || "",
        e.wentWell[0], e.wentWell[1], e.wentWell[2], e.todayActions[0], e.todayActions[1], e.todayActions[2]
      ].map(esc);
      rows.push(r.join(";"));
    });
    var blob = new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = "tagebuch.csv";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  // ---------- boot ----------
  load();
  renderTabs();
  renderView();
})();
