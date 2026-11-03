// =========================================================
// DİL SƏHİFƏLƏRİNİ YARADIR: /  (az), /en/, /ru/
//
// js/i18n.js-dəki mətnləri dəyişdikdən sonra bu əmri işə salın:
//   node tools/build-lang.js
//
// index.html şablon kimi oxunur, hər dil üçün mətnlər birbaşa HTML-ə yazılır.
// Beləliklə Google üç dildən hər birini ayrıca səhifə kimi görür.
// =========================================================
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const SITE_URL = "https://valiyevvn.github.io/nevotech/";
const LANGS = {
  az: { dir: "", locale: "az_AZ" },
  en: { dir: "en/", locale: "en_US" },
  ru: { dir: "ru/", locale: "ru_RU" },
};

// Load TRANSLATIONS from the same file the browser uses
const context = {};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(ROOT, "js/i18n.js"), "utf8") + "\nthis.TRANSLATIONS = TRANSLATIONS;", context);
const TRANSLATIONS = context.TRANSLATIONS;

const version = (file) =>
  require("crypto").createHash("sha1").update(fs.readFileSync(path.join(ROOT, file))).digest("hex").slice(0, 8);

const escText = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = (s) => escText(s).replace(/"/g, "&quot;");

// Relative link from one language page to another
function linkTo(from, to) {
  const up = LANGS[from].dir ? "../" : "";
  return up + LANGS[to].dir || "./";
}

function seoBlock(lang, t) {
  const url = SITE_URL + LANGS[lang].dir;
  const alternates = Object.keys(LANGS)
    .map((l) => `  <link rel="alternate" hreflang="${l}" href="${SITE_URL + LANGS[l].dir}">`)
    .join("\n");
  const lines = [
    `  <title>${escText(t["meta.title"])}</title>`,
    `  <meta name="description" content="${escAttr(t["meta.description"])}">`,
    `  <link rel="canonical" href="${url}">`,
    alternates,
    `  <link rel="alternate" hreflang="x-default" href="${SITE_URL}">`,
    `  <meta property="og:type" content="website">`,
    `  <meta property="og:locale" content="${LANGS[lang].locale}">`,
    `  <meta property="og:title" content="${escAttr(t["meta.title"])}">`,
    `  <meta property="og:description" content="${escAttr(t["meta.description"])}">`,
    `  <meta property="og:url" content="${url}">`,
    `  <meta property="og:image" content="${SITE_URL}assets/logo-mark.png">`,
  ];
  // Returning visitors who picked another language land on it again
  if (lang === "az") {
    lines.push(`  <script>try { var l = localStorage.getItem("nevotech-lang"); if (l === "en" || l === "ru") location.replace(l + "/" + location.hash); } catch (e) {}</script>`);
  }
  return `  <!-- seo:start -->\n${lines.join("\n")}\n  <!-- seo:end -->`;
}

function langSwitch(lang) {
  return Object.keys(LANGS)
    .map((l) => {
      const current = l === lang ? ` aria-current="page"` : "";
      return `          <a href="${linkTo(lang, l)}" hreflang="${l}" lang="${l}" data-lang="${l}"${current}>${l.toUpperCase()}</a>`;
    })
    .join("\n");
}

function build(template, lang) {
  const t = TRANSLATIONS[lang];
  const missing = new Set();
  const get = (key) => {
    if (!(key in t)) missing.add(key);
    return t[key] ?? TRANSLATIONS.az[key] ?? key;
  };

  let html = template
    .replace(/<html lang="[a-z]+"/, `<html lang="${lang}"`)
    .replace(/  <!-- seo:start -->[\s\S]*?<!-- seo:end -->/, seoBlock(lang, t))
    .replace(/(<nav class="lang"[^>]*>)[\s\S]*?(\s*<\/nav>)/, `$1\n${langSwitch(lang)}$2`)
    // Text content: every element with data-i18n holds plain text only
    .replace(/(<(\w+)\b[^>]*\sdata-i18n="([^"]+)"[^>]*>)([^<]*)(<\/\2>)/g, (m, open, tag, key, _old, close) => open + escText(get(key)) + close)
    // Placeholders and accessible names
    .replace(/(\splaceholder=")[^"]*("[^>]*\sdata-i18n-ph="([^"]+)")/g, (m, a, b, key) => a + escAttr(get(key)) + b)
    .replace(/(\saria-label=")[^"]*("[^>]*\sdata-i18n-aria="([^"]+)")/g, (m, a, b, key) => a + escAttr(get(key)) + b)
    // A content hash in the URL makes browsers drop a cached copy as soon as the file changes
    .replace(/((?:href|src)="((?:css|js)\/[\w-]+\.(?:css|js)))(?:\?v=[0-9a-f]+)?"/g, (m, attr, file) => `${attr}?v=${version(file)}"`);

  // Pages in a sub-folder reach shared files one level up
  if (LANGS[lang].dir) html = html.replace(/(href|src)="(css|js|assets)\//g, `$1="../$2/`);

  if (missing.size) console.warn(`[${lang}] missing keys: ${[...missing].join(", ")}`);
  return html;
}

// The template is always the AZ page with root-relative paths
const template = fs.readFileSync(path.join(ROOT, "index.html"), "utf8").replace(/\r\n/g, "\n");
for (const lang of Object.keys(LANGS)) {
  const out = path.join(ROOT, LANGS[lang].dir, "index.html");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, build(template, lang));
  console.log(`✓ ${path.relative(ROOT, out)}`);
}

// Sitemap with language alternates
const urls = Object.keys(LANGS).map((lang) => {
  const links = Object.keys(LANGS)
    .map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${SITE_URL + LANGS[l].dir}"/>`)
    .join("\n");
  return `  <url>\n    <loc>${SITE_URL + LANGS[lang].dir}</loc>\n${links}\n  </url>`;
});
fs.writeFileSync(
  path.join(ROOT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join("\n")}\n</urlset>\n`
);
console.log("✓ sitemap.xml");
