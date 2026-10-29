//    Sequence Manipulation Suite - minimal EN/ZH switcher.
//
//    Each page's own English text is the lookup key into scripts/i18n.zh.js,
//    so a page only needs the two script tags and <div class="i18n-switch">
//    to become bilingual. Nothing is fetched, so file:// keeps working.

(function () {
  var dict = window.SMS_I18N_ZH || {};
  var STORAGE_KEY = "sms.lang";
  var LANGS = [
    ["en", "EN"],
    ["zh", "\u4e2d\u6587"]
  ];
  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, NOSCRIPT: 1 };
  var records = [];
  var buttons = [];

  function remember(en, set) {
    records.push({ en: en, set: set });
  }

  function collect(el) {
    for (var n = el.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3) {
        if (/\S/.test(n.nodeValue)) {
          remember(n.nodeValue, textSetter(n));
        }
      } else if (n.nodeType === 1 && !SKIP[n.nodeName]) {
        if (n.nodeName === "INPUT" && /^(button|submit|reset)$/i.test(n.type)) {
          remember(n.value, valueSetter(n));
        }
        collect(n);
      }
    }
  }

  function textSetter(node) {
    return function (v) {
      node.nodeValue = v;
    };
  }

  function valueSetter(node) {
    return function (v) {
      node.value = v;
    };
  }

  // Keeps the surrounding whitespace of the original text node and ignores
  // the source line wrapping inside it, so keys can be written on one line.
  function translate(en, lang) {
    if (lang !== "zh") {
      return en;
    }
    var lead = /^\s*/.exec(en)[0];
    var rest = en.slice(lead.length);
    var trail = /\s*$/.exec(rest)[0];
    var key = rest.slice(0, rest.length - trail.length).replace(/\s+/g, " ");
    var zh = dict[key];
    return zh ? lead + zh + trail : en;
  }

  function storedLang() {
    try {
      return localStorage.getItem(STORAGE_KEY) === "zh" ? "zh" : "en";
    } catch (e) {
      return "en";
    }
  }

  function apply(lang) {
    for (var i = 0; i < records.length; i++) {
      records[i].set(translate(records[i].en, lang));
    }
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    for (var j = 0; j < buttons.length; j++) {
      var on = buttons[j].getAttribute("data-lang") === lang;
      buttons[j].style.background = on ? "#3b4471" : "#ffffff";
      buttons[j].style.color = on ? "#ffffff" : "#3b4471";
    }
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {}
  }

  function buildSwitch() {
    var box = document.querySelector(".i18n-switch");
    if (!box) {
      return;
    }
    box.style.cssText = "margin:0 0 6px 0;";
    for (var i = 0; i < LANGS.length; i++) {
      (function (lang, label) {
        var b = document.createElement("button");
        b.type = "button";
        b.setAttribute("data-lang", lang);
        b.textContent = label;
        b.style.cssText =
          "font:12px arial,sans-serif;margin-right:4px;padding:1px 8px;" +
          "border:1px solid #3b4471;cursor:pointer;";
        b.onclick = function () {
          apply(lang);
        };
        box.appendChild(b);
        buttons.push(b);
      })(LANGS[i][0], LANGS[i][1]);
    }
  }

  if (document.body) {
    remember(document.title, function (v) {
      document.title = v;
    });
    collect(document.body);
    buildSwitch();
    apply(storedLang());
  }
})();
