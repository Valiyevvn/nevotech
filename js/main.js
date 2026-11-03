(function () {
  const LANGS = ["az", "en", "ru"];
  const STORAGE_KEY = "nevotech-lang";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let currentLang = SITE_CONFIG.defaultLang;

  const t = (key) => (TRANSLATIONS[currentLang] && TRANSLATIONS[currentLang][key]) || key;
  const waUrl = (text) => `https://wa.me/${SITE_CONFIG.whatsappNumber}?text=${encodeURIComponent(text)}`;

  // Runs `onEnter` / `onLeave` as an element scrolls in and out of view
  function watchVisibility(el, onEnter, onLeave, margin = "0px") {
    new IntersectionObserver(([entry]) => (entry.isIntersecting ? onEnter() : onLeave && onLeave()), { rootMargin: margin })
      .observe(el);
  }

  // ---------- Modules: one shared selection for bento cells and form ----------
  const selected = new Set();
  const cells = document.querySelectorAll(".cell[data-module]");
  const formChecks = document.querySelectorAll('.chip input[name="modules"]');
  const pickedCount = document.getElementById("pickedCount");

  function renderSelection() {
    cells.forEach((cell) => {
      const on = selected.has(cell.dataset.module);
      cell.classList.toggle("is-selected", on);
      cell.querySelector(".pick").setAttribute("aria-pressed", on);
    });
    formChecks.forEach((input) => (input.checked = selected.has(input.value)));

    const n = selected.size;
    pickedCount.textContent = n === 0 ? t("picked.none") : n === 1 ? t("picked.one") : t("picked.many").replace("{n}", n);
  }

  function setModule(id, on) {
    if (on) selected.add(id); else selected.delete(id);
    renderSelection();
  }

  cells.forEach((cell) => {
    const id = cell.dataset.module;
    cell.querySelector(".pick").addEventListener("click", () => setModule(id, !selected.has(id)));
  });
  formChecks.forEach((input) => input.addEventListener("change", () => setModule(input.value, input.checked)));

  // ---------- Language ----------
  function applyLang(lang) {
    if (!LANGS.includes(lang)) lang = SITE_CONFIG.defaultLang;
    currentLang = lang;

    document.documentElement.lang = lang;
    document.title = t("meta.title");

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
      el.placeholder = t(el.dataset.i18nPh);
    });
    document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
      el.setAttribute("aria-label", t(el.dataset.i18nAria));
    });
    document.querySelectorAll("#lang button").forEach((btn) => {
      btn.setAttribute("aria-pressed", btn.dataset.lang === lang);
    });

    // Generic WhatsApp links get a greeting in the current language
    document.querySelectorAll(".js-wa-link").forEach((a) => {
      a.href = waUrl(t("wa.default"));
      a.target = "_blank";
      a.rel = "noopener";
    });

    renderSelection();
    renderThemeToggle();
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
  }

  document.querySelectorAll("#lang button").forEach((btn) => {
    btn.addEventListener("click", () => applyLang(btn.dataset.lang));
  });

  // ---------- Day / night theme ----------
  const root = document.documentElement;
  const themeToggle = document.getElementById("themeToggle");
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const isLight = () => root.dataset.theme === "light";

  function renderThemeToggle() {
    const label = t(isLight() ? "theme.toDark" : "theme.toLight");
    themeToggle.setAttribute("aria-label", label);
    themeToggle.title = label;
    themeMeta.content = isLight() ? "#ffffff" : "#000000";
  }

  themeToggle.addEventListener("click", () => {
    if (isLight()) delete root.dataset.theme; else root.dataset.theme = "light";
    try { localStorage.setItem("nevotech-theme", isLight() ? "light" : "dark"); } catch (e) {}
    renderThemeToggle();
    buildGrid();
    if (reduceMotion) drawStill();
  });

  // ---------- Config values ----------
  document.querySelectorAll(".js-phone").forEach((el) => {
    el.textContent = SITE_CONFIG.phoneDisplay;
    el.href = `tel:+${SITE_CONFIG.whatsappNumber}`;
  });
  document.querySelectorAll(".js-map").forEach((el) => (el.href = SITE_CONFIG.mapUrl));
  document.querySelectorAll(".js-instagram").forEach((el) => {
    el.href = `https://instagram.com/${SITE_CONFIG.instagram}`;
    el.textContent = `@${SITE_CONFIG.instagram}`;
  });
  document.getElementById("year").textContent = new Date().getFullYear();

  // ---------- Header & mobile menu ----------
  const burger = document.getElementById("burger");
  const nav = document.getElementById("nav");

  const setMenu = (open) => {
    burger.setAttribute("aria-expanded", open);
    nav.classList.toggle("open", open);
  };
  burger.addEventListener("click", () => setMenu(burger.getAttribute("aria-expanded") !== "true"));
  nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav.classList.contains("open")) { setMenu(false); burger.focus(); }
  });

  // Highlight active nav link
  const navLinks = nav.querySelectorAll("a");
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((a) => {
          const on = a.getAttribute("href") === `#${entry.target.id}`;
          a.classList.toggle("active", on);
          if (on) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
        });
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );
  document.querySelectorAll("main section[id]").forEach((s) => sectionObserver.observe(s));

  // ---------- Hero: light grid with beams flowing out of the mark ----------
  const beams = document.getElementById("beams");
  const canvas = document.getElementById("beamsCanvas");
  const beacon = document.getElementById("beacon");
  const ctx = canvas.getContext("2d");
  const COLORS = ["255,107,0", "255,178,36", "255,77,109", "255,140,40"];
  let grid = null, rays = [], comets = [], apex = { x: 0, y: 0 }, W = 0, H = 0, dpr = 1;
  let running = false, lastSpawn = 0, lastTime = 0, frame = 0;

  function buildGrid() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = beams.clientWidth; H = beams.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    apex = { x: W / 2, y: beacon.offsetTop };

    // Rays fan out from the mark to (and past) the bottom edge
    const count = W < 640 ? 18 : 30;
    const spread = W * (W < 640 ? 0.16 : 0.09);
    rays = Array.from({ length: count }, (_, i) => ({ x: apex.x + (i - (count - 1) / 2) * spread, y: H }));

    grid = document.createElement("canvas");
    grid.width = canvas.width; grid.height = canvas.height;
    const g = grid.getContext("2d");
    g.scale(dpr, dpr);
    g.strokeStyle = isLight() ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.075)";
    g.lineWidth = 1;
    rays.forEach((r) => { g.beginPath(); g.moveTo(apex.x, apex.y); g.lineTo(r.x, r.y); g.stroke(); });

    // Horizontal lines get denser towards the horizon, like a floor in perspective
    const left = rays[0], right = rays[rays.length - 1];
    for (let k = 1; k <= 11; k++) {
      const f = Math.pow(k / 11, 1.9);
      const y = apex.y + (H - apex.y) * f;
      g.beginPath();
      g.moveTo(apex.x + (left.x - apex.x) * f, y);
      g.lineTo(apex.x + (right.x - apex.x) * f, y);
      g.stroke();
    }
  }

  function spawnComet() {
    const ray = rays[Math.floor(Math.random() * rays.length)];
    comets.push({
      ray, t: 0.04,
      speed: 0.22 + Math.random() * 0.28,
      len: 0.1 + Math.random() * 0.12,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    });
  }

  function pointAt(ray, t) {
    return { x: apex.x + (ray.x - apex.x) * t, y: apex.y + (ray.y - apex.y) * t };
  }

  function draw(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(grid, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Soft pulsing glow under the mark
    const pulse = (isLight() ? 0.22 : 0.32) + Math.sin(now / 900) * 0.06;
    const glow = ctx.createRadialGradient(apex.x, apex.y, 0, apex.x, apex.y, Math.min(200, apex.y - 10));
    glow.addColorStop(0, `rgba(255,107,0,${pulse})`);
    glow.addColorStop(1, "rgba(255,107,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    if (now - lastSpawn > 110 && comets.length < 46) { spawnComet(); lastSpawn = now; }

    ctx.globalCompositeOperation = isLight() ? "source-over" : "lighter";
    comets = comets.filter((c) => {
      c.t += c.speed * dt * (0.6 + c.t);  // speeds up as it comes "closer"
      const head = pointAt(c.ray, c.t);
      const tail = pointAt(c.ray, Math.max(0.02, c.t - c.len));
      const grad = ctx.createLinearGradient(tail.x, tail.y, head.x, head.y);
      grad.addColorStop(0, `rgba(${c.color},0)`);
      grad.addColorStop(1, `rgba(${c.color},0.95)`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1 + c.t * 1.6;
      ctx.beginPath(); ctx.moveTo(tail.x, tail.y); ctx.lineTo(head.x, head.y); ctx.stroke();
      return c.t - c.len < 1.05;
    });
    ctx.globalCompositeOperation = "source-over";

    if (running) frame = requestAnimationFrame(draw);
  }

  function startBeams() {
    if (running || reduceMotion) return;
    running = true; lastTime = performance.now();
    frame = requestAnimationFrame(draw);
  }
  function stopBeams() { running = false; cancelAnimationFrame(frame); }

  // One still frame with a few beams already on their way
  function drawStill() {
    comets = [];
    for (let i = 0; i < 24; i++) { spawnComet(); comets[i].t = 0.15 + Math.random() * 0.7; }
    lastTime = performance.now(); draw(lastTime + 16);
  }

  buildGrid();
  if (reduceMotion) drawStill();
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { buildGrid(); if (reduceMotion) drawStill(); }, 120);
  });
  watchVisibility(beams, startBeams, stopBeams);
  document.addEventListener("visibilitychange", () => (document.hidden ? stopBeams() : startBeams()));

  // The mark leans gently towards the pointer
  if (!reduceMotion && window.matchMedia("(pointer: fine)").matches) {
    const hero = document.getElementById("home");
    hero.addEventListener("pointermove", (e) => {
      const r = beacon.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / window.innerWidth;
      const dy = (e.clientY - (r.top + r.height / 2)) / window.innerHeight;
      beacon.style.setProperty("--tilt-y", `${dx * 40}deg`);
      beacon.style.setProperty("--tilt-x", `${-dy * 40}deg`);
    });
    hero.addEventListener("pointerleave", () => {
      beacon.style.setProperty("--tilt-y", "0deg");
      beacon.style.setProperty("--tilt-x", "0deg");
    });
  }

  // ---------- Bento: small live demos that only run while on screen ----------
  // Reveals [data-step] children one after another, holds, then starts over
  function sequencer(el) {
    const steps = [...el.querySelectorAll("[data-step]")];
    const gap = Number(el.dataset.seq) || 1000;
    let i = 0, timer = null;
    const tick = () => {
      if (i < steps.length) { steps[i++].classList.add("on"); timer = setTimeout(tick, gap); }
      else { timer = setTimeout(() => { steps.forEach((s) => s.classList.remove("on")); i = 0; timer = setTimeout(tick, 600); }, 3200); }
    };
    return { start: () => { if (!timer) tick(); }, stop: () => { clearTimeout(timer); timer = null; } };
  }

  // Stock levels drop with each sale; the watched item runs low and raises an alert
  function stockSim(el) {
    const rows = [...el.querySelectorAll(".stock__row")];
    const start = rows.map((r) => Number(r.dataset.qty));
    let qty = [...start], timer = null;
    const render = () => rows.forEach((r, i) => {
      r.style.setProperty("--p", `${Math.max(3, (qty[i] / 500) * 100)}%`);
      r.querySelector(".stock__qty").textContent = qty[i];
      const low = r.hasAttribute("data-watch") && qty[i] < 20;
      r.classList.toggle("is-low", low);
      if (r.hasAttribute("data-watch")) el.classList.toggle("is-low", low);
    });
    const tick = () => {
      qty = qty.map((q, i) => Math.max(0, q - Math.ceil(Math.random() * (i === 3 ? 4 : 14))));
      if (qty[3] <= 4) qty = [...start];
      render();
      timer = setTimeout(tick, 1300);
    };
    render();
    return { start: () => { if (!timer) timer = setTimeout(tick, 600); }, stop: () => { clearTimeout(timer); timer = null; } };
  }

  // System log: one sale travels through every module, lighting up its node in the pipeline
  const logLines = document.getElementById("logLines");
  const pipeNodes = document.querySelectorAll(".pipeline__node");
  const LOG_SOURCES = [["kassa", "var(--orange-text)"], ["anbar", "var(--amber-text)"], ["hesabat", "var(--ok-text)"], ["telefon", "var(--muted)"]];
  function logSim() {
    let order = 1042, step = 0, timer = null, clock = new Date(2026, 9, 14, 10, 42, 1);
    const sums = [86.4, 42.9, 128, 15.6, 64.2];
    let day = 1284;
    const push = () => {
      const sum = sums[(order - 1042) % sums.length];
      const [src, color] = LOG_SOURCES[step];
      const text = t(`log.${step}`).replace("{n}", order).replace("{sum}", sum.toFixed(2)).replace("{day}", Math.round(day + sum));
      clock = new Date(clock.getTime() + (step === 0 ? 37000 : 600));
      const li = document.createElement("li");
      li.innerHTML = `<time>${clock.toTimeString().slice(0, 8)}</time><b style="--src:${color}">${t("log.src." + src)}</b><span></span>`;
      li.lastChild.textContent = text;
      logLines.append(li);
      while (logLines.children.length > 7) logLines.firstChild.remove();
      const node = pipeNodes[step];
      node.classList.add("on");
      setTimeout(() => node.classList.remove("on"), 900);
      step = (step + 1) % LOG_SOURCES.length;
      if (step === 0) { order++; day += sum; }
      timer = setTimeout(push, step === 0 ? 1500 : 650);
    };
    return { start: () => { if (!timer) push(); }, stop: () => { clearTimeout(timer); timer = null; } };
  }

  const demos = [];
  document.querySelectorAll("[data-seq]").forEach((el) => demos.push([el, sequencer(el)]));
  demos.push([document.getElementById("stockViz"), stockSim(document.getElementById("stockViz"))]);
  demos.push([logLines, logSim()]);

  demos.forEach(([el, demo]) => {
    if (reduceMotion) {
      el.querySelectorAll("[data-step]").forEach((s) => s.classList.add("on"));
      if (el === logLines) { for (let i = 0; i < 4; i++) demo.start(), demo.stop(); }
      return;
    }
    watchVisibility(el, demo.start, demo.stop);
  });

  // CSS-driven demos (charts, flowing wires) only animate while visible
  document.querySelectorAll(".viz, .pipeline").forEach((el) => {
    if (!reduceMotion) watchVisibility(el, () => el.classList.add("is-live"), () => el.classList.remove("is-live"));
  });

  // The floating WhatsApp button steps aside while the contact form is on screen
  const waFloat = document.querySelector(".wa-float");
  watchVisibility(document.getElementById("contact"), () => waFloat.classList.add("is-hidden"), () => waFloat.classList.remove("is-hidden"));

  // ---------- Contact form → WhatsApp ----------
  const form = document.getElementById("contactForm");
  const formError = document.getElementById("formError");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const name = data.get("name").trim();
    const phone = data.get("phone").trim();
    const message = data.get("message").trim();

    [[form.name, !name], [form.phone, !phone]].forEach(([input, invalid]) => {
      input.setAttribute("aria-invalid", invalid);
      if (invalid) input.setAttribute("aria-describedby", "formError");
      else input.removeAttribute("aria-describedby");
    });
    if (!name || !phone) {
      formError.hidden = false;
      (name ? form.phone : form.name).focus();
      return;
    }
    formError.hidden = true;

    const modules = data.getAll("modules").map((id) => t(`mod.${id}`));
    const L = WA_LABELS[currentLang];
    const lines = [
      t("wa.greeting"),
      "",
      `${L.name}: ${name}`,
      `${L.phone}: ${phone}`,
      `${L.modules}: ${modules.length ? modules.join(", ") : t("wa.noModules")}`,
    ];
    if (message) lines.push(`${L.message}: ${message}`);

    window.open(waUrl(lines.join("\n")), "_blank", "noopener");
  });

  // ---------- Init ----------
  let saved = null;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) {}
  applyLang(saved || SITE_CONFIG.defaultLang);
})();
