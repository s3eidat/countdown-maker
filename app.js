/* Countdown Maker — settings travel in the URL hash. The hash is UNTRUSTED input:
   it is length-capped, validated field by field, and rendered with textContent only. */
(function () {
  "use strict";
  var $ = S3.$, $$ = S3.$$;
  var THEMES = ["aurora", "sunset", "ocean", "midnight", "mint", "gold"];
  var MAX_NAME = 80, MAX_HASH = 1000;
  var current = null, wasPositive = null, timer = null;

  // ---------- untrusted input ----------
  function cleanName(s) {
    // Drop control characters and bidi overrides/isolates (they can make a name display misleadingly).
    return String(s).replace(/[\u0000-\u001f\u007f-\u009f‎‏‪-‮⁦-⁩]/g, "").replace(/\s+/g, " ").trim().slice(0, MAX_NAME);
  }
  function parseTime(v) {
    if (typeof v !== "string") return null;
    var ms;
    if (/^\d{1,15}$/.test(v)) ms = +v;
    else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?Z$/.test(v)) ms = Date.parse(v);
    else return null;
    // Valid dates between 1970 and 9999 only.
    return isFinite(ms) && ms >= 0 && ms < 253402300800000 ? ms : null;
  }
  function parseHash(hash) {
    if (typeof hash !== "string" || hash.length > MAX_HASH) return null;
    var q;
    try { q = new URLSearchParams(hash.replace(/^#/, "")); } catch (e) { return null; }
    var t = parseTime(q.get("t"));
    if (t == null) return null;
    var th = q.get("th");
    return { n: cleanName(q.get("n") || "") || "Countdown", t: t, th: THEMES.indexOf(th) >= 0 ? th : THEMES[0] };
  }
  function toHash(c) {
    var q = new URLSearchParams();
    q.set("n", cleanName(c.n)); q.set("t", new Date(c.t).toISOString().replace(/\.000Z$/, "Z")); q.set("th", c.th);
    return "#" + q.toString();
  }
  function breakdown(ms) {
    var s = Math.floor(Math.abs(ms) / 1000);
    return { d: Math.floor(s / 86400), h: Math.floor(s / 3600) % 24, m: Math.floor(s / 60) % 60, s: s % 60 };
  }

  // ---------- render (textContent only) ----------
  function renderInto(root, c) {
    root.className = "cd-view theme-" + c.th;
    root.querySelector("#name, .cd-name").textContent = c.n;
    root.querySelector("#when, .cd-when").textContent = new Date(c.t).toLocaleString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" });
  }
  function pad(n) { return String(n).padStart(2, "0"); }
  function tick() {
    if (!current) return;
    var left = current.t - Date.now(), b = breakdown(left), done = left <= 0;
    $("#d").textContent = b.d; $("#h").textContent = pad(b.h); $("#m").textContent = pad(b.m); $("#s").textContent = pad(b.s);
    $("#done").hidden = !done; $("#view").classList.toggle("is-done", done);
    $("#kicker").textContent = done ? "Time since" : "Counting down to";
    if (wasPositive === true && done) confetti();
    wasPositive = !done;
    document.title = (done ? "🎉 " : b.d + "d " + pad(b.h) + ":" + pad(b.m) + ":" + pad(b.s) + " · ") + current.n + " — Countdown Maker";
  }
  function show(c) {
    current = c; wasPositive = null;
    renderInto($("#view"), c);
    tick();
  }
  function defaultCountdown() {
    var y = new Date().getFullYear() + 1;
    return { n: "New Year " + y, t: new Date(y, 0, 1).getTime(), th: "aurora" };
  }
  function fromLocation() {
    var c = location.hash ? parseHash(location.hash) : null;
    if (location.hash && !c) S3.toast("That countdown link isn't valid, showing a default", "error");
    show(c || defaultCountdown());
    fillForm(current);
  }

  // ---------- form ----------
  var theme = "aurora";
  function buildThemes() {
    var box = $("#themes");
    THEMES.forEach(function (th) {
      var b = S3.h("button", { type: "button", "class": "theme-" + th, "aria-pressed": "false", "data-v": th, title: th, text: th });
      b.addEventListener("click", function () { setTheme(th); });
      box.appendChild(b);
    });
  }
  function setTheme(th) { theme = th; $$("#themes button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.v === th)); }); }
  function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function fillForm(c) {
    var d = new Date(c.t);
    $("#fName").value = c.n; $("#fDate").value = ymd(d); $("#fTime").value = pad(d.getHours()) + ":" + pad(d.getMinutes());
    setTheme(c.th);
  }
  $("#form").addEventListener("submit", function (e) {
    e.preventDefault();
    var dv = $("#fDate").value.split("-").map(Number), tv = ($("#fTime").value || "00:00").split(":").map(Number);
    if (dv.length !== 3 || !dv[0]) { S3.toast("Pick a date", "error"); return; }
    var t = new Date(dv[0], dv[1] - 1, dv[2], tv[0] || 0, tv[1] || 0).getTime();
    if (parseTime(String(t)) == null) { S3.toast("That date is out of range", "error"); return; }
    var c = { n: cleanName($("#fName").value) || "Countdown", t: t, th: theme };
    location.hash = toHash(c); // hashchange renders it
    window.scrollTo({ top: 0, behavior: "smooth" });
    S3.done();
  });
  $("#fromView").addEventListener("click", function () { fillForm(current); $("#fName").focus(); });

  // ---------- actions ----------
  function link(c) { return location.href.split("#")[0] + toHash(c); }
  $("#copyLink").addEventListener("click", function () { S3.copy(link(current), "Link copied"); S3.done(); });
  $("#fs").addEventListener("click", function () {
    if (document.fullscreenElement) document.exitFullscreen();
    else if ($("#view").requestFullscreen) $("#view").requestFullscreen().catch(function () { S3.toast("Fullscreen isn't available here", "error"); });
  });
  document.addEventListener("fullscreenchange", function () { var cv = $("#confetti"); (document.fullscreenElement || document.body).appendChild(cv); });

  // ---------- saved ----------
  function loadSaved() {
    var raw = S3.store("cd.saved"), out = [];
    (Array.isArray(raw) ? raw : []).slice(0, 50).forEach(function (x) {
      var t = x && parseTime(String(x.t));
      if (t != null) out.push({ n: cleanName(x.n || "") || "Countdown", t: t, th: THEMES.indexOf(x.th) >= 0 ? x.th : THEMES[0] });
    });
    return out;
  }
  var saved = loadSaved();
  function renderSaved() {
    var ul = $("#saved"); ul.innerHTML = "";
    saved.forEach(function (c, i) {
      var left = c.t - Date.now(), b = breakdown(left);
      var open = S3.h("button", { "class": "btn small", text: "Open" }), del = S3.h("button", { "class": "btn ghost icon small danger", "aria-label": "Delete", html: S3.icon("trash") });
      open.addEventListener("click", function () { location.hash = toHash(c); window.scrollTo({ top: 0, behavior: "smooth" }); });
      del.addEventListener("click", function () { saved.splice(i, 1); S3.store("cd.saved", saved); renderSaved(); });
      ul.appendChild(S3.h("li", null, [S3.h("span", { "class": "sw theme-" + c.th }), S3.h("div", { "class": "info" }, [S3.h("b", { dir: "auto", text: c.n }),
        S3.h("span", { text: left > 0 ? "in " + b.d + "d " + b.h + "h " + b.m + "m" : "passed " + new Date(c.t).toLocaleDateString() })]), open, del]));
    });
    $("#noSaved").hidden = saved.length > 0;
  }
  $("#saveBtn").addEventListener("click", function () {
    if (saved.some(function (x) { return x.t === current.t && x.n === current.n; })) { S3.toast("Already saved"); return; }
    if (saved.length >= 50) { S3.toast("You can keep up to 50 countdowns", "error"); return; }
    saved.unshift({ n: current.n, t: current.t, th: current.th }); S3.store("cd.saved", saved); renderSaved(); S3.toast("Saved on this device"); S3.done();
  });

  // ---------- confetti ----------
  function confetti() {
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var cv = $("#confetti"), c = cv.getContext("2d"), W = cv.width = innerWidth, H = cv.height = innerHeight, parts = [], t0 = performance.now();
    var cols = ["#3dd6d0", "#f5b971", "#ff7b9c", "#8ea2ff", "#6ee7a8", "#facc15", "#ffffff"];
    for (var i = 0; i < 220; i++) parts.push({ x: Math.random() * W, y: -20 - Math.random() * H * 0.5, vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 4, s: 5 + Math.random() * 7, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, c: cols[i % cols.length] });
    (function f(now) {
      var el = now - t0; c.clearRect(0, 0, W, H);
      parts.forEach(function (p) { p.vy += 0.05; p.x += p.vx + Math.sin((el + p.r * 400) / 300); p.y += p.vy; p.r += p.vr; c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.globalAlpha = Math.max(0, 1 - el / 6000); c.fillStyle = p.c; c.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); c.restore(); });
      if (el < 6000) requestAnimationFrame(f); else c.clearRect(0, 0, W, H);
    })(t0);
  }

  // ---------- start ----------
  buildThemes();
  $("#tzNote").textContent = "Uses your time zone (" + (Intl.DateTimeFormat().resolvedOptions().timeZone || "local") + "). Viewers see the same moment in their own local time.";
  window.addEventListener("hashchange", fromLocation);
  fromLocation(); renderSaved();
  timer = setInterval(tick, 250); // display refresh; the remaining time is always target - Date.now()
  setInterval(renderSaved, 60000);

  window.S3_DEMO = function () {
    var t = Date.now() + ((12 * 24 + 7) * 60 + 42) * 60000 + 18000;
    saved = [{ n: "Eid al-Adha trip ✈️", t: t + 40 * 864e5, th: "sunset" }, { n: "Product launch", t: t + 3 * 864e5, th: "ocean" }, { n: "عيد ميلاد سارة", t: t + 90 * 864e5, th: "mint" }];
    renderSaved();
    show({ n: "Our wedding day 💍", t: t, th: "aurora" }); fillForm(current);
  };

  window.S3_SELFTEST = function () {
    var a = parseHash("#n=New%20Year&t=2027-01-01T00:00:00Z&th=ocean");
    var ok1 = a && a.n === "New Year" && a.t === Date.UTC(2027, 0, 1) && a.th === "ocean";
    var b = parseHash("#n=x&t=2027-01-01T00:00:00Z&th=javascript:alert(1)"), ok2 = b && b.th === "aurora";
    var ok3 = [null, "", "#t=abc", "#t=2027-13-01", "#t=99999-01-01T00:00Z", "#n=a", "#t=1e12", "#t=-5", "#t=" + "9".repeat(20), "#t=1000&x=" + "a".repeat(MAX_HASH)].every(function (h) { return parseHash(h) === null; });
    var ok4 = parseHash("#t=1798761600000").t === 1798761600000 && parseHash("#t=1798761600000").n === "Countdown";
    var evil = '<img src=x onerror="window.__pwned=1">', e = parseHash("#n=" + encodeURIComponent(evil) + "&t=2030-01-01T00:00Z");
    var box = S3.h("section", null, [S3.h("h2", { "class": "cd-name" }), S3.h("div", { "class": "cd-when" })]);
    renderInto(box, e);
    var ok5 = e.n === evil && box.querySelector("img") === null && box.querySelector(".cd-name").textContent === evil && !window.__pwned;
    var f = parseHash("#n=" + encodeURIComponent("‮abc\u0000def" + "z".repeat(200)) + "&t=2030-01-01T00:00Z"), ok6 = f.n.indexOf("‮") < 0 && f.n.indexOf("\u0000") < 0 && f.n.length === MAX_NAME;
    var orig = { n: "عيد & party = #1 ?", t: Date.UTC(2026, 11, 31, 21, 30), th: "gold" }, rt = parseHash(toHash(orig));
    var ok7 = rt.n === orig.n && rt.t === orig.t && rt.th === "gold";
    var bd = breakdown(90061000), ok8 = bd.d === 1 && bd.h === 1 && bd.m === 1 && bd.s === 1 && breakdown(-61000).m === 1;
    return !!(ok1 && ok2 && ok3 && ok4 && ok5 && ok6 && ok7 && ok8);
  };
})();
