(function () {
  const LANGS = ["az", "en", "ru"];
  const STORAGE_KEY = "nevotech-lang";
  let currentLang = SITE_CONFIG.defaultLang;

  const t = (key) => (TRANSLATIONS[currentLang] && TRANSLATIONS[currentLang][key]) || key;
  const waUrl = (text) => `https://wa.me/${SITE_CONFIG.whatsappNumber}?text=${encodeURIComponent(text)}`;

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
    document.querySelectorAll("#lang button").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.lang === lang);
    });

    // Generic WhatsApp links get a greeting in the current language
    document.querySelectorAll(".js-wa-link").forEach((a) => {
      a.href = waUrl(t("wa.default"));
      a.target = "_blank";
      a.rel = "noopener";
    });

    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
  }

  document.querySelectorAll("#lang button").forEach((btn) => {
    btn.addEventListener("click", () => applyLang(btn.dataset.lang));
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
  const header = document.getElementById("header");
  const burger = document.getElementById("burger");
  const nav = document.getElementById("nav");

  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 20);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  burger.addEventListener("click", () => {
    burger.classList.toggle("open");
    nav.classList.toggle("open");
  });
  nav.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      burger.classList.remove("open");
      nav.classList.remove("open");
    })
  );

  // Highlight active nav link
  const sections = document.querySelectorAll("main section[id]");
  const navLinks = nav.querySelectorAll("a");
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === `#${entry.target.id}`));
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );
  sections.forEach((s) => sectionObserver.observe(s));

  // ---------- Reveal on scroll ----------
  const revealEls = document.querySelectorAll(".card, .why__item, .step, .project, .faq details, .section__head, .about__text, .contact__info, .form");
  revealEls.forEach((el) => el.classList.add("reveal"));
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  revealEls.forEach((el) => revealObserver.observe(el));

  // ---------- Contact form → WhatsApp ----------
  const form = document.getElementById("contactForm");
  const formError = document.getElementById("formError");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const name = data.get("name").trim();
    const phone = data.get("phone").trim();
    const message = data.get("message").trim();
    const service = t(data.get("service"));

    if (!name || !phone) {
      formError.hidden = false;
      return;
    }
    formError.hidden = true;

    const L = WA_LABELS[currentLang];
    const lines = [
      t("wa.greeting"),
      "",
      `${L.name}: ${name}`,
      `${L.phone}: ${phone}`,
      `${L.service}: ${service}`,
    ];
    if (message) lines.push(`${L.message}: ${message}`);

    window.open(waUrl(lines.join("\n")), "_blank", "noopener");
  });

  // ---------- Init ----------
  let saved = null;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) {}
  applyLang(saved || SITE_CONFIG.defaultLang);
})();
