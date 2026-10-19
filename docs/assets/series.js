/* DevSecOps Learning Series - shared engine (MIT) - Georges MOMO
   No dependencies. Progressive enhancement: the page is readable without JS. */
(function () {
  "use strict";

  var SERIES = [
    { id: "github", chip: "GH", color: "#2457D6", name: "GitHub Actions DevSecOps", url: "https://georgesmomo.github.io/devsecops-actions-lab/" },
    { id: "gitlab", chip: "GL", color: "#6B3FC9", name: "GitLab CI/CD DevSecOps", url: "__GITLAB_PAGES_URL__" },
    { id: "k8s", chip: "K8", color: "#0B7F86", name: "Kubernetes + Helm", url: "https://georgesmomo.github.io/k8s-helm-lab/" }
  ];

  var root = document.documentElement;
  var course = root.getAttribute("data-course") || "course";
  var KEY = "dsls:" + course + ":";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- safe storage (private windows, previews) ---------- */
  var mem = {};
  function load(k, d) {
    try { var v = localStorage.getItem(KEY + k); return v === null ? d : JSON.parse(v); }
    catch (e) { return k in mem ? mem[k] : d; }
  }
  function save(k, v) {
    mem[k] = v;
    try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (e) { /* keep in memory */ }
  }

  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function h(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "class") e.className = attrs[k]; else if (k === "text") e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]);
    });
    if (html != null) e.innerHTML = html;
    return e;
  }
  function readJSON(el) {
    var s = el.querySelector(':scope > script[type="application/json"]');
    if (!s) return null;
    try { return JSON.parse(s.textContent); } catch (e) { console.error("Bad JSON in", el, e); return null; }
  }

  /* ---------- theme ---------- */
  var theme = load("theme", null);
  if (theme) root.setAttribute("data-theme", theme);
  var themeBtn = $("#theme-btn");
  if (themeBtn) themeBtn.addEventListener("click", function () {
    var dark = root.getAttribute("data-theme") === "dark" ||
      (!root.getAttribute("data-theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
    var next = dark ? "light" : "dark";
    root.setAttribute("data-theme", next); save("theme", next);
  });

  /* ---------- mobile rail ---------- */
  var menuBtn = $("#menu-btn");
  if (menuBtn) menuBtn.addEventListener("click", function () {
    var open = document.body.classList.toggle("rail-open");
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
  });
  document.addEventListener("click", function (e) {
    if (document.body.classList.contains("rail-open") && e.target.closest(".rail a")) {
      document.body.classList.remove("rail-open");
      if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
    }
  });

  /* ---------- modules, route rail, progress ---------- */
  var modules = $$("section.module");
  var done = load("done", []);
  var rail = $("#route-rail");
  var fill;
  if (rail) {
    fill = h("span", { class: "fill", "aria-hidden": "true" });
    rail.appendChild(fill);
    modules.forEach(function (m, i) {
      var title = m.getAttribute("data-title") || ($("h2", m) || {}).textContent || m.id;
      var li = h("li", { "data-id": m.id });
      if (m.hasAttribute("data-terminus")) li.className = "terminus";
      li.innerHTML = '<span class="stop" aria-hidden="true"></span><a href="#' + m.id + '"><span class="rt">' +
        title + '</span><span class="rm">' + (m.getAttribute("data-time") || "") + "</span></a>";
      rail.appendChild(li);
      // numbered head
      var num = $(".mod-num", m);
      if (num && !num.textContent.trim()) num.textContent = m.hasAttribute("data-terminus") ? "★" : String(i);
    });
  }
  modules.forEach(function (m) {
    if (m.hasAttribute("data-no-done")) return;
    var wrap = h("div", { class: "mod-done" });
    var b = h("button", { class: "btn ghost", type: "button", "aria-pressed": "false" });
    var note = h("span");
    wrap.appendChild(b); wrap.appendChild(note); m.appendChild(wrap);
    function paint() {
      var on = done.indexOf(m.id) > -1;
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.className = on ? "btn" : "btn ghost";
      b.textContent = on ? "Station completed" : "Mark this station as completed";
      note.textContent = on ? "Saved in this browser. Click again to undo." : "Your progress stays in this browser only.";
      m.classList.toggle("done", on);
    }
    b.addEventListener("click", function () {
      var i = done.indexOf(m.id);
      if (i > -1) done.splice(i, 1); else done.push(m.id);
      save("done", done); paint(); paintProgress();
    });
    paint();
  });
  function paintProgress() {
    var n = modules.filter(function (m) { return !m.hasAttribute("data-no-done"); }).length;
    var d = done.filter(function (id) { return document.getElementById(id); }).length;
    var meter = $("#meter");
    if (meter) meter.innerHTML = "<b>" + d + "/" + n + '</b> <span class="txt">stations completed</span>';
    if (rail) {
      var lis = $$("li", rail), lastDone = -1;
      lis.forEach(function (li, i) {
        var on = done.indexOf(li.getAttribute("data-id")) > -1;
        li.classList.toggle("done", on);
        if (on) lastDone = i;
      });
      if (fill && lis.length) {
        var target = lastDone < 0 ? 0 : lis[lastDone].offsetTop + 17 - 12;
        fill.style.height = Math.max(0, target) + "px";
      }
    }
  }
  paintProgress();
  window.addEventListener("resize", paintProgress);
  var resetBtn = $("#reset-progress");
  if (resetBtn) resetBtn.addEventListener("click", function () {
    done = []; save("done", done); save("quiz", {});
    location.reload();
  });

  if ("IntersectionObserver" in window && rail) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        $$("li", rail).forEach(function (li) { li.classList.toggle("here", li.getAttribute("data-id") === en.target.id); });
      });
    }, { rootMargin: "-30% 0px -60% 0px" });
    modules.forEach(function (m) { io.observe(m); });
  }

  /* ---------- series transfers ---------- */
  var tr = $("#transfers");
  if (tr) SERIES.forEach(function (c) {
    var li = h("li");
    var cur = c.id === course;
    var url = c.url.indexOf("__") === 0 ? "#" : c.url;
    li.innerHTML = '<a href="' + (cur ? "#top" : url) + '"' + (cur ? ' aria-current="page"' : "") +
      '><span class="chip" style="background:' + c.color + '">' + c.chip + "</span><span>" + c.name +
      (cur ? "<br><small>you are here</small>" : "") + "</span></a>";
    tr.appendChild(li);
  });
  $$("[data-series-link]").forEach(function (a) {
    var c = SERIES.filter(function (s) { return s.id === a.getAttribute("data-series-link"); })[0];
    if (c && c.url.indexOf("__") !== 0) a.href = c.url;
  });

  /* ---------- code blocks: copy + replay ---------- */
  $$(".code").forEach(function (box) {
    var pre = $("pre", box);
    if (!pre) return;
    var bar = h("div", { class: "c-bar" });
    bar.innerHTML = '<span class="dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="c-name">' +
      (box.getAttribute("data-title") || "") + "</span>";
    var btns = h("span");
    bar.appendChild(btns);
    var copy = h("button", { class: "copy", type: "button", text: "Copy" });
    btns.appendChild(copy);
    box.insertBefore(bar, pre);
    copy.addEventListener("click", function () {
      var clone = pre.cloneNode(true);
      $$(".pin", clone).forEach(function (p) { p.remove(); });   // numbered pins are not part of the code
      var txt = clone.textContent;
      var lines = txt.split("\n");
      var cmds = lines.filter(function (l) { return /^\$ /.test(l); });
      var out = cmds.length ? cmds.map(function (l) { return l.replace(/^\$ /, ""); }).join("\n") : txt;
      out = out.replace(/\s*[①-⑳]\s*$/gm, "");
      function ok() { copy.textContent = cmds.length ? "Commands copied" : "Copied"; setTimeout(function () { copy.textContent = "Copy"; }, 1600); }
      if (navigator.clipboard) navigator.clipboard.writeText(out).then(ok, function () { fallback(out); ok(); });
      else { fallback(out); ok(); }
    });
    if (box.hasAttribute("data-play")) {
      var play = h("button", { class: "play", type: "button", text: "Replay" });
      btns.insertBefore(play, copy);
      // wrap each line
      var html = pre.innerHTML.split("\n").map(function (l) { return '<span class="line">' + (l || " ") + "</span>"; }).join("\n");
      pre.innerHTML = html;
      var running = false;
      function run() {
        if (running) return; running = true;
        var lines = $$(".line", pre);
        if (reduce) { lines.forEach(function (l) { l.classList.add("shown"); }); running = false; return; }
        box.classList.add("typing");
        lines.forEach(function (l) { l.classList.remove("shown", "caret"); });
        var i = 0;
        (function next() {
          if (i > 0) lines[i - 1].classList.remove("caret");
          if (i >= lines.length) { running = false; return; }
          var l = lines[i++]; l.classList.add("shown");
          var isCmd = /^\$ /.test(l.textContent);
          if (isCmd) l.classList.add("caret");
          setTimeout(next, isCmd ? 650 : 70);
        })();
      }
      play.addEventListener("click", run);
      box.classList.add("typing");
      if ("IntersectionObserver" in window) {
        var o = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { run(); o.disconnect(); } }, { threshold: .4 });
        o.observe(box);
      } else run();
    }
  });
  function fallback(t) {
    var ta = h("textarea"); ta.value = t; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    ta.remove();
  }

  /* ---------- glossary ---------- */
  var gEl = $("#glossary-data"), GLOSS = {};
  if (gEl) { try { GLOSS = JSON.parse(gEl.textContent); } catch (e) { console.error(e); } }
  var lower = {};
  Object.keys(GLOSS).forEach(function (k) { lower[k.toLowerCase()] = k; });
  var pop = null;
  function closePop() { if (pop) { pop.remove(); pop = null; } }
  $$(".term").forEach(function (t) {
    var key = lower[(t.getAttribute("data-t") || t.textContent).toLowerCase()];
    if (!key) { console.warn("Glossary term missing:", t.getAttribute("data-t") || t.textContent); return; }
    var b = h("button", { class: "term", type: "button", "aria-label": t.textContent + ": show definition" });
    b.textContent = t.textContent;
    t.replaceWith(b);
    function show() {
      closePop();
      pop = h("div", { class: "pop", role: "tooltip" });
      pop.innerHTML = "<b></b><span></span>";
      pop.firstChild.textContent = key; pop.lastChild.innerHTML = GLOSS[key];
      pop._owner = b; pop._t = Date.now();
      document.body.appendChild(pop);
      var r = b.getBoundingClientRect();
      var left = Math.min(window.scrollX + r.left, window.scrollX + document.documentElement.clientWidth - pop.offsetWidth - 12);
      pop.style.left = Math.max(8, left) + "px";
      pop.style.top = (window.scrollY + r.bottom + 8) + "px";
    }
    b.addEventListener("click", function (e) {
      e.stopPropagation();
      // a tap also fires mouseenter: keep the popover that hover just opened, toggle only on a later click
      if (pop && pop._owner === b && Date.now() - pop._t > 400) closePop(); else show();
    });
    b.addEventListener("mouseenter", show);
    b.addEventListener("mouseleave", closePop);
    b.addEventListener("blur", closePop);
  });
  document.addEventListener("click", closePop);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closePop(); });
  var gl = $("#glossary");
  if (gl) {
    var search = h("input", { class: "glossary-search", type: "search", placeholder: "Filter " + Object.keys(GLOSS).length + " terms", "aria-label": "Filter glossary" });
    var dl = h("dl", { class: "glossary" });
    Object.keys(GLOSS).sort(function (a, b) { return a.localeCompare(b); }).forEach(function (k) {
      var dt = h("dt"); dt.textContent = k; var dd = h("dd"); dd.innerHTML = GLOSS[k];
      dl.appendChild(dt); dl.appendChild(dd);
    });
    gl.appendChild(search); gl.appendChild(dl);
    search.addEventListener("input", function () {
      var q = search.value.toLowerCase();
      var kids = dl.children;
      for (var i = 0; i < kids.length; i += 2) {
        var hit = !q || kids[i].textContent.toLowerCase().indexOf(q) > -1 || kids[i + 1].textContent.toLowerCase().indexOf(q) > -1;
        kids[i].classList.toggle("hide", !hit); kids[i + 1].classList.toggle("hide", !hit);
      }
    });
  }

  /* ---------- quizzes ---------- */
  var scores = load("quiz", {});
  $$(".quiz").forEach(function (qz, qi) {
    var data = readJSON(qz);
    if (!data) return;
    var id = qz.id || ("quiz" + qi);
    var final = qz.hasAttribute("data-final");
    var head = h("div", { class: "q-head" });
    head.innerHTML = "<strong></strong><span class=\"q-score\"></span>";
    head.firstChild.textContent = qz.getAttribute("data-title") || (final ? "Final check" : "Check your understanding");
    qz.appendChild(head);
    var answered = 0, right = 0;
    var scoreEl = $(".q-score", head);
    function paintScore() {
      scoreEl.textContent = answered ? right + " / " + data.length + " correct" : data.length + " questions";
      if (answered === data.length) {
        scores[id] = right; save("quiz", scores);
        if (final) {
          var res = $(".finish-result");
          if (res) {
            var pct = Math.round(100 * right / data.length);
            res.innerHTML = '<div class="big">' + pct + "%</div><p>" +
              (pct >= 80 ? "You passed. You can explain these ideas to someone else, which is the real test. Pick a challenge below and build it." :
                "Not yet at 80%. Re-read the stations you missed (the explanations above point to them), then press Try again.") + "</p>";
          }
        }
      }
    }
    data.forEach(function (item, n) {
      var q = h("div", { class: "q" });
      var p = h("p"); p.innerHTML = (n + 1) + ". " + item.q; q.appendChild(p);
      var opts = h("div", { class: "opts", role: "group", "aria-label": "Answers" });
      var why = h("div", { class: "why", "aria-live": "polite" }); why.hidden = true;
      item.o.forEach(function (o, k) {
        var b = h("button", { class: "opt", type: "button" });
        b.innerHTML = '<span class="k">' + "ABCDEF"[k] + "</span><span></span>";
        b.lastChild.innerHTML = o;
        b.addEventListener("click", function () {
          $$(".opt", opts).forEach(function (x, j) {
            x.disabled = true;
            if (j === item.a) x.classList.add("right");
          });
          var ok = k === item.a;
          if (!ok) b.classList.add("wrong");
          answered++; if (ok) right++;
          why.hidden = false; why.className = "why" + (ok ? "" : " no");
          why.innerHTML = "<b>" + (ok ? "Correct." : "Not quite.") + "</b> " + (item.why || "");
          paintScore();
        });
        opts.appendChild(b);
      });
      q.appendChild(opts); q.appendChild(why); qz.appendChild(q);
    });
    var foot = h("div", { class: "q-foot" });
    var again = h("button", { class: "iconbtn", type: "button", text: "Try again" });
    again.addEventListener("click", function () {
      answered = right = 0;
      $$(".opt", qz).forEach(function (x) { x.disabled = false; x.classList.remove("right", "wrong"); });
      $$(".why", qz).forEach(function (w) { w.hidden = true; });
      paintScore();
    });
    foot.appendChild(again); qz.appendChild(foot);
    paintScore();
  });

  /* ---------- annotated screenshots ---------- */
  $$(".shot").forEach(function (f) {
    var spots; try { spots = JSON.parse(f.getAttribute("data-hs") || "[]"); } catch (e) { spots = []; }
    var img = $("img", f);
    if (!img) return;
    if (!img.getAttribute("loading")) img.setAttribute("loading", "lazy");
    var frame = h("div", { class: "frame" });
    img.parentNode.insertBefore(frame, img); frame.appendChild(img);
    if (!spots.length) return;
    var notes = h("ol", { class: "notes" });
    spots.forEach(function (s, i) {
      var b = h("button", { class: "hs", type: "button", "aria-expanded": "false", "aria-label": "Callout " + (i + 1) });
      b.textContent = i + 1;
      b.style.left = s[0] + "%"; b.style.top = s[1] + "%";
      frame.appendChild(b);
      var li = h("li"); li.innerHTML = '<span class="n">' + (i + 1) + "</span><span></span>"; li.lastChild.innerHTML = s[2];
      notes.appendChild(li);
      b.addEventListener("click", function () {
        $$(".hs", frame).forEach(function (x) { x.setAttribute("aria-expanded", "false"); });
        $$("li", notes).forEach(function (x) { x.classList.remove("on"); });
        b.setAttribute("aria-expanded", "true"); li.classList.add("on");
        li.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
      });
    });
    var cap = $("figcaption", f);
    f.insertBefore(notes, cap ? cap.nextSibling : null);
  });

  /* ---------- line maps (clickable pipeline diagrams) ---------- */
  $$(".linemap").forEach(function (lm) {
    var stops = readJSON(lm);
    if (!stops) return;
    var head = h("div", { class: "lm-head" });
    head.innerHTML = "<strong></strong><span></span>";
    head.firstChild.textContent = lm.getAttribute("data-title") || "";
    head.lastChild.textContent = lm.getAttribute("data-sub") || "Click a station to see what happens there.";
    var track = h("div", { class: "lm-track" });
    var train = h("span", { class: "lm-train", "aria-hidden": "true" });
    track.appendChild(train);
    var panel = h("div", { class: "lm-panel", "aria-live": "polite" });
    var btns = [];
    stops.forEach(function (s, i) {
      var b = h("button", { class: "lm-stop" + (s.gate ? " gate" : ""), type: "button", "aria-pressed": "false" });
      b.innerHTML = "<i></i><span></span>";
      b.lastChild.innerHTML = s.n + (s.s ? "<small>" + s.s + "</small>" : "");
      b.addEventListener("click", function () { stopAuto(); go(i); });
      track.appendChild(b); btns.push(b);
    });
    var ctr = h("div", { class: "lm-controls" });
    var prev = h("button", { class: "iconbtn", type: "button", text: "Previous" });
    var next = h("button", { class: "iconbtn", type: "button", text: "Next" });
    var auto = h("button", { class: "iconbtn", type: "button", text: "Ride the whole line" });
    ctr.appendChild(prev); ctr.appendChild(next); ctr.appendChild(auto);
    lm.appendChild(head); lm.appendChild(track); lm.appendChild(panel); lm.appendChild(ctr);
    if (lm.hasAttribute("data-legend")) {
      var lg = h("div", { class: "legend" });
      lg.innerHTML = "<span><i></i>step</span><span><i class=\"gate\"></i>security gate: the train stops here if a check fails</span>";
      lm.appendChild(lg);
    }
    var cur = 0, timer = null;
    function go(i) {
      cur = (i + stops.length) % stops.length;
      btns.forEach(function (b, j) { b.setAttribute("aria-pressed", j === cur ? "true" : "false"); });
      var b = btns[cur];
      train.style.left = (b.offsetLeft + b.offsetWidth / 2 - 11) + "px";
      var s = stops[cur];
      panel.innerHTML = "<h3></h3><p></p>" + (s.tool ? '<div class="lm-tool"></div>' : "");
      panel.firstChild.innerHTML = (cur + 1) + ". " + (s.h || s.n);
      panel.children[1].innerHTML = s.p || "";
      if (s.tool) panel.children[2].innerHTML = s.tool;
    }
    function stopAuto() { if (timer) { clearInterval(timer); timer = null; auto.textContent = "Ride the whole line"; } }
    prev.addEventListener("click", function () { stopAuto(); go(cur - 1); });
    next.addEventListener("click", function () { stopAuto(); go(cur + 1); });
    auto.addEventListener("click", function () {
      if (timer) return stopAuto();
      auto.textContent = "Stop the ride";
      go(0);
      timer = setInterval(function () { if (cur === stops.length - 1) return stopAuto(); go(cur + 1); }, 2600);
    });
    requestAnimationFrame(function () { go(0); });
    window.addEventListener("resize", function () { go(cur); });
    // the one orchestrated moment: the hero train rides once on load
    if (lm.hasAttribute("data-autoplay") && !reduce) setTimeout(function () { auto.click(); }, 900);
  });

  /* ---------- tabs ---------- */
  $$(".tabs").forEach(function (t, ti) {
    var panes = $$(":scope > [data-tab]", t);
    var list = h("div", { role: "tablist" });
    var tabs = panes.map(function (p, i) {
      var b = h("button", { role: "tab", type: "button", id: "tab" + ti + "-" + i, "aria-controls": "pane" + ti + "-" + i, "aria-selected": i ? "false" : "true", tabindex: i ? "-1" : "0" });
      b.textContent = p.getAttribute("data-tab");
      p.setAttribute("role", "tabpanel"); p.id = "pane" + ti + "-" + i; p.setAttribute("aria-labelledby", b.id); p.hidden = i > 0;
      b.addEventListener("click", function () { sel(i); });
      b.addEventListener("keydown", function (e) {
        if (e.key === "ArrowRight") { sel((i + 1) % panes.length); tabs[(i + 1) % panes.length].focus(); }
        if (e.key === "ArrowLeft") { sel((i - 1 + panes.length) % panes.length); tabs[(i - 1 + panes.length) % panes.length].focus(); }
      });
      list.appendChild(b); return b;
    });
    function sel(i) {
      tabs.forEach(function (b, j) { b.setAttribute("aria-selected", j === i ? "true" : "false"); b.tabIndex = j === i ? 0 : -1; });
      panes.forEach(function (p, j) { p.hidden = j !== i; });
    }
    t.insertBefore(list, t.firstChild);
  });

  /* ---------- persistent checklists ---------- */
  var checks = load("checks", {});
  $$(".checklist input[type=checkbox]").forEach(function (c, i) {
    var id = c.getAttribute("data-id") || ("c" + i);
    c.checked = !!checks[id];
    c.addEventListener("change", function () { checks[id] = c.checked; save("checks", checks); });
  });

  /* hook for page-specific widgets */
  window.Series = { load: load, save: save, h: h, $: $, $$: $$, reduce: reduce };
})();
