/*
  Fitness journal (standalone PWA build).
  UI copy is German to match the paper page it reproduces.
  Persistence: localStorage, single JSON blob. Data stays on the device.

  Storage shape: { config: { startDate }, entries: { "YYYY-MM-DD": Entry } }
*/
(function () {
  "use strict";

  var STORAGE_KEY = "fitness-journal-data";

  var QUOTES = [
    { t: "Jeder Tag ist eine neue Chance, das zu tun, was du möchtest.", a: "Friedrich Schiller" },
    { t: "Es ist nicht genug zu wollen, man muss auch tun.", a: "Johann Wolfgang von Goethe" },
    { t: "Nicht weil es schwer ist, wagen wir es nicht, sondern weil wir es nicht wagen, ist es schwer.", a: "Seneca" },
    { t: "Was mich nicht umbringt, macht mich stärker.", a: "Friedrich Nietzsche" }
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
  var STRENGTH_FIELDS = [
    { key: "planned", label: "geplant" },
    { key: "done", label: "durchgeführt" },
    { key: "progression", label: "Progression" }
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
    var e = { weight: "", strength: { planned: null, done: null, progression: null }, wentWell: ["", "", ""], todayActions: ["", "", ""] };
    for (var i = 0; i < PAIR_KEYS.length; i++) e[PAIR_KEYS[i]] = { target: "", actual: "" };
    return e;
  }

  function hasContent(e) {
    if (!e) return false;
    if (e.weight) return true;
    if (e.customQuote) return true;
    for (var i = 0; i < PAIR_KEYS.length; i++) {
      var k = PAIR_KEYS[i];
      if (e[k] && (e[k].target || e[k].actual)) return true;
    }
    var s = e.strength || {};
    if (s.planned != null || s.done != null || s.progression != null) return true;
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
        (showCustom ? '' : '<p class="qauthor">' + rot.a + '</p>') +
        '<button class="qedit" id="qedit" title="Zitat bearbeiten">&#9998;</button>';
    }

    var macros = MACRO_FIELDS.map(pairRowHtml).join("");
    var life = LIFE_FIELDS.map(pairRowHtml).join("");

    var toggles = STRENGTH_FIELDS.map(function (s) {
      return '' +
        '<div class="tgroup"><span class="tl">' + s.label + '</span>' +
          '<button class="pill" data-str="' + s.key + '" data-val="yes">ja</button>' +
          '<button class="pill no" data-str="' + s.key + '" data-val="no">nein</button>' +
        '</div>';
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
        '<div class="section-title">Krafttraining</div>' +
        '<div class="toggles">' + toggles + '</div>' +
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
    STRENGTH_FIELDS.forEach(function (s) {
      var yes = view.querySelector('[data-str="' + s.key + '"][data-val="yes"]');
      var no = view.querySelector('[data-str="' + s.key + '"][data-val="no"]');
      function paint(val) {
        yes.className = "pill" + (val === true ? " on" : "");
        no.className = "pill no" + (val === false ? " on no" : "");
      }
      paint(w.strength ? w.strength[s.key] : null);
      yes.addEventListener("click", function () {
        var e = ensureEntry();
        e.strength[s.key] = e.strength[s.key] === true ? null : true;
        persist(); paint(e.strength[s.key]);
      });
      no.addEventListener("click", function () {
        var e = ensureEntry();
        e.strength[s.key] = e.strength[s.key] === false ? null : false;
        persist(); paint(e.strength[s.key]);
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
    var doneY = 0, doneTotal = 0;

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
    });

    function fmt(v, dec) {
      return v == null ? "–" : v.toLocaleString("de-DE", { maximumFractionDigits: dec || 0 });
    }
    var avgSleep = sleepN ? sleepSum / sleepN : null;
    var avgSteps = stepsN ? stepsSum / stepsN : null;
    var avgWater = waterN ? waterSum / waterN : null;
    var trainRate = doneTotal ? Math.round((doneY / doneTotal) * 100) : null;

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
        yn(e.strength.planned), yn(e.strength.done), yn(e.strength.progression),
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
