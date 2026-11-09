// ── ENV_REGIONS: single list of regions for every Environmental Monitoring tab + its Excel export. Add a new region HERE only. ──
window.ENV_REGIONS = Object.freeze(['CORPORATE', 'PLANT OPERATIONS', 'NCR', 'SOUTH LUZON', 'NORTH LUZON', 'VISAYAS & MINDANAO']);

// ── ICONS (Font Awesome 6.4.0) — one place for every UI icon. Usage: icon('warn') ──────────
window._dispProjName = function (n) { return n === 'Corporate' ? 'ESH Corporate' : n; }; // display only: real name stays 'Corporate' (used as data key)
window.ESH_ICONS = { "warn": "fa-triangle-exclamation", "error": "fa-circle-xmark", "lock": "fa-lock", "ok": "fa-circle-check", "info": "fa-circle-info", "wait": "fa-hourglass-half", "edit": "fa-pen", "pin": "fa-location-dot", "pinned": "fa-thumbtack", "trash": "fa-trash", "view": "fa-eye", "list": "fa-clipboard-list", "dot-red": [ "fa-circle", "#e53935" ], "file": "fa-file-lines", "building": "fa-building", "plant": "fa-industry", "dot-orange": [ "fa-circle", "#fb8c00" ], "search": "fa-magnifying-glass", "calendar": "fa-calendar-days", "refresh": "fa-rotate", "stop": "fa-ban", "globe": "fa-globe", "block": "fa-ban", "shield": "fa-shield-halved", "nophone": "fa-mobile-screen", "weather": "fa-cloud-sun", "numbers": "fa-hashtag", "idea": "fa-lightbulb", "key": "fa-key", "alert": "fa-bell", "leaf": "fa-leaf", "upload": "fa-upload", "water": "fa-droplet", "save": "fa-floppy-disk", "chart": "fa-chart-column", "sq-green": [ "fa-square", "#43a047" ], "sq-yellow": [ "fa-square", "#fdd835" ], "sq-red": [ "fa-square", "#e53935" ], "sq-dark": [ "fa-square", "#424242" ], "cloud": "fa-cloud", "download": "fa-download", "tool": "fa-wrench", "sun": "fa-sun", "city": "fa-city", "moon": "fa-moon", "newmoon": [ "fa-circle", "#424242" ], "checked": "fa-square-check", "gear": "fa-gear", "bolt": "fa-bolt", "plus": "fa-plus", "lock2": "fa-lock", "robot": "fa-robot", "plug": "fa-plug", "fuel": "fa-gas-pump", "hardhat": "fa-helmet-safety", "unlock": "fa-lock-open", "home": "fa-house", "seedling": "fa-seedling", "chevron-down": "fa-chevron-down", "chevron-right": "fa-chevron-right", "folder": "fa-folder-open", "calc": "fa-calculator", "times": "fa-xmark", "plus-circle": "fa-circle-plus", "snowflake": "fa-snowflake", "desktop": "fa-desktop" };
window.icon = function (name, extraClass, attrs) {   // attrs = extra attributes as a string, e.g. 'id="x" style="font-size:.8rem"' (do not pass style for icons that have a color in the pack)
    var d = window.ESH_ICONS[name]; if (!d) return '';
    var cls = Array.isArray(d) ? d[0] : d, col = Array.isArray(d) ? d[1] : '';
    return '<i class="fa-solid ' + cls + (extraClass ? ' ' + extraClass : '') + '"' + (attrs ? ' ' + attrs : '') + (col ? ' style="color:' + col + '"' : '') + '></i>';
};
// ── HEADER ICONS: colored PNG files in the icons/ folder (next to index.html), same idea as the DOLE / DOE / EMB icons. Usage: hdrIcon('kpm') gives <img class="hdr-ico">.
// To change an icon: replace the file in icons/ (same name) and raise HDR_ICON_VER so the browser does not show the old one. Size: .hdr-ico / .tib-icon-img in styles.css (36px). ──
window.HDR_ICON_DIR = 'icons/';
window.HDR_ICON_VER = 2;
window.HDR_ICONS = {'trainings':'trainings.png','audit':'audit.png','violation':'violation.png','tabulation':'tabulation.png','registry':'registry.png','record':'record.png','alert':'alert.png','health':'health.png','envmon':'envmon.png','envrep':'envrep.png','got':'got.png','kpm':'kpm.png','activities':'activities.png','requirement':'requirement.png','personnel':'personnel.png','exposure':'exposure.png','rates':'rates.png','home':'home.png','dashboard':'dashboard.png'};
window.hdrIcon = function (key) { var f = window.HDR_ICONS[key]; return f ? '<img class="hdr-ico" src="' + window.HDR_ICON_DIR + f + '?v=' + window.HDR_ICON_VER + '" alt="" aria-hidden="true" draggable="false">' : ''; };
// ── TOP BAR TITLE ICON (the title next to the hamburger button) ──
// The title text is set by other code, so this watches the <h2 class="header-title"> and adds the matching icon from HDR_ICONS by the title text.
// Titles that match nothing get no icon. A title that already has its own icon (<i>, <img>, <svg>) is left alone. DOLE, DOE and EMB are never touched.
// To fix a missing / wrong icon: edit the line for that title in HDR_TITLE_ICONS (pattern is matched against the UPPERCASE title text).
window.HDR_TITLE_ICONS = [
    [/^HOME\b|^HEADLINES/, 'home'],
    [/^OVERALL SUMMARY/, 'dashboard'],
    [/TOTAL EXPOSURE/, 'exposure'],
    [/ACTIVITIES AND PROGRAMS|^ESH ACTIVITIES/, 'activities'],
    [/STATISTICS? RATE/, 'rates'],
    [/\bKPM\b|^MONTHLY REPORT|KEY PERFORMANCE MEASURES?/, 'kpm'],
    [/TRAININGS? (AND|&) DRILLS|ESH CALENDAR/, 'trainings'],
    [/INTERNAL ESH AUDIT|AUDIT REPORT/, 'audit'],
    [/\bNOV\b|VIOLATION/, 'violation'],
    [/INCIDENT.*TABULATION/, 'tabulation'],
    [/REGISTRY/, 'registry'],
    [/(ACCIDENT|INCIDENT).*RECORD/, 'record'],
    [/SAFETY ALERT/, 'alert'],
    [/HEALTH REPORT/, 'health'],
    [/ENVIRONMENTAL MONITORING|ENVI MONITORING/, 'envmon'],
    [/ENVIRONMENTAL (MONTHLY )?REPORT|ENVI REPORTORIAL/, 'envrep'],
    [/\bGOT\)? MONITORING|GOALS,? OBJECTIVES/, 'got'],
    [/PERSONNEL REQUIREMENT|OSH REQUIREMENT/, 'requirement'],
    [/PERSONNEL MONITORING|ESH PERSONNEL/, 'personnel']
];
window.applyHeaderTitleIcon = function () {
    var h = document.querySelector('header .header-title');
    if (!h) return;
    var cur = h.querySelector('img.hdr-ico');
    if (!cur && h.querySelector('i, img, svg')) return;      // the title already has its own icon
    var txt = (h.textContent || '').replace(/\s+/g, ' ').trim().toUpperCase(), key = null;
    if (txt && !/\b(DOLE|DOE|EMB)\b/.test(txt)) {
        for (var i = 0; i < window.HDR_TITLE_ICONS.length; i++) {
            if (window.HDR_TITLE_ICONS[i][0].test(txt)) { key = window.HDR_TITLE_ICONS[i][1]; break; }
        }
    }
    if (cur && key && cur.getAttribute('data-k') === key) return;
    if (cur) cur.remove();
    h.classList.toggle('has-hdr-ico', !!key);
    if (key) h.insertAdjacentHTML('afterbegin', window.hdrIcon(key).replace('<img ', '<img data-k="' + key + '" '));
};
(function () {
    function init() {
        var hd = document.querySelector('header');
        if (!hd || hd._hdrIcoObs) return;
        var obs = new MutationObserver(function () { window.applyHeaderTitleIcon(); obs.takeRecords(); });
        hd._hdrIcoObs = obs;
        obs.observe(hd, { childList: true, subtree: true, characterData: true });
        window.applyHeaderTitleIcon(); obs.takeRecords();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
// Expand/collapse chevron: swaps the two pack icons on an <i> made with icon('chevron-down' | 'chevron-right').
window.eshChevron = function (el, open) {
    if (!el) return;
    el.classList.toggle(window.ESH_ICONS['chevron-down'], !!open);
    el.classList.toggle(window.ESH_ICONS['chevron-right'], !open);
};
// Shared underline tab strip — ONE source for every tab bar (Incident Tabulation, GOT, ...). Styles: .tk-tabs in styles.css.
// tabs = [{ key, label, icon: 'fa-...' }], active = key, onclickFn = name of a global function called with the key, style = optional inline style for the wrapper.
window.tabStrip = function (tabs, active, onclickFn, style) {
    var h = '<div class="tk-tabs"' + (style ? ' style="' + style + '"' : '') + '>';
    tabs.forEach(function (t) {
        h += '<button type="button" class="' + (t.key === active ? 'on' : '') + '" onclick="' + onclickFn + '(\'' + t.key + '\')"><i class="fas ' + t.icon + '"></i> ' + t.label + '</button>';
    });
    return h + '</div>';
};
window.regionSlug = function (reg) { return String(reg).toLowerCase().replace(/\s/g, '-').replace(/[^a-z0-9-]/g, ''); };
// ONE region banner (the clickable bar). Every tab builds its banner with this, so markup/classes live in ONE place and styles.css does the rest.
// o = { id, reg, toggle (global fn name, called as fn('REG', event)) | onclick (full js string), collapsed, editable,
//       cls (extra class), style (inline), icon ('fa-...' override), label (text override), right (html placed before the chevron), iconAttrs (extra attributes on the chevron <i>, e.g. 'id="x"') }
window.regionBanner = function (o) {
    var reg = o.reg, slug = window.regionSlug(reg);
    var icon = o.icon || (reg === 'CORPORATE' ? 'fa-building-columns' : reg === 'PLANT OPERATIONS' ? 'fa-industry' : 'fa-location-dot');
    var onclick = o.onclick || (o.toggle + "('" + String(reg).replace(/'/g, "\\'") + "',event)");
    return '<div id="' + o.id + '" class="region-banner region-' + slug + (o.cls ? ' ' + o.cls : '') + (o.collapsed ? ' collapsed' : '') + (o.editable ? ' rb-editable' : '') + '" onclick="' + onclick + '"' + (o.style ? ' style="' + o.style + '"' : '') + '>'
         + '<div class="region-banner-inner"><div class="region-banner-left"><i class="fas ' + icon + ' region-icon"></i><span class="region-name">' + (o.label || reg) + '</span></div>'
         + '<div class="region-banner-right">' + (o.right || '') + '<i class="fas fa-chevron-down region-toggle-icon"' + (o.iconAttrs ? ' ' + o.iconAttrs : '') + '></i></div></div></div>';
};
// Shared collapsible region section — banner + body.
// o = { id, reg, badges (html), body (html), collapsed (bool), editable (bool) }
window._rsCollapsed = window._rsCollapsed || {};
window.regionSection = function (o) {
    var col = o.collapsed ? ' collapsed' : '';
    return window.regionBanner({ id: 'rs-banner-' + o.id, reg: o.reg, onclick: "regionToggle('" + o.id + "',event)", collapsed: o.collapsed, editable: o.editable, right: o.badges })
         + '<div id="rs-body-' + o.id + '" class="region-content' + col + '">' + (o.body || '') + '</div>';
};
window.regionToggle = function (id, ev) {
    if (ev && ev.target && ev.target.closest && ev.target.closest('button')) return;
    var b = document.getElementById('rs-banner-' + id), c = document.getElementById('rs-body-' + id);
    if (!b || !c) return;
    var collapse = !c.classList.contains('collapsed');
    window._rsCollapsed[id] = collapse;
    clearTimeout(c._rhT);
    if (collapse) {
        c.style.height = c.offsetHeight + 'px'; void c.offsetHeight;
        c.classList.add('collapsed'); c.style.height = '0px'; b.classList.add('collapsed');
    } else {
        c.classList.remove('collapsed'); c.style.height = '0px';
        var t = c.scrollHeight + (c.offsetHeight - c.clientHeight); void c.offsetHeight;
        c.style.height = t + 'px'; c._rhT = setTimeout(function () { c.style.height = ''; }, 300); b.classList.remove('collapsed');
    }
};
// Chart.js draws on <canvas>, which CSS cannot reach. One default so every chart uses the same font.
if (window.Chart && Chart.defaults && Chart.defaults.font) { Chart.defaults.font.family = "'Inter', sans-serif"; }

// Shared month-row status: icon (+ short text unless complete). Used by KPM, GOT, DOLE, EMB and EMR rows.
window._rowStatus = function(kind, txt, title, showTxt) {
    var ic = { ok:'fa-circle-check', part:'fa-circle-half-stroke', none:'fa-circle-xmark', wait:'fa-clock', prog:'fa-clock', warn:'fa-triangle-exclamation' }[kind] || 'fa-circle';
    var show = (showTxt !== undefined) ? showTxt : (kind !== 'ok');
    var t = title || (show ? '' : txt) || '';
    t = String(t).replace(/&/g,'&amp;').replace(/"/g,'&quot;');
    return '<span class="ckpm-stw"' + (t ? ' title="' + t + '"' : '') + '><i class="fas ' + ic + ' ckpm-ck ' + kind + '"></i>'
         + (show && txt ? '<span class="ckpm-st ' + kind + '">' + txt + '</span>' : '') + '</span>';
};

// ESH: status pills shown on every region banner (replaces the old 4 stat cards above the banners)
window._rbStatusPills = function(tot, fill, ovd, ovdLabel) {
    var h = '';
    if (tot > 0) {
        var pct = Math.round(fill / tot * 100);
        var bg = pct >= 90 ? '#e8f5e9' : pct >= 75 ? '#fff3e0' : '#ffebee';
        var fg = pct >= 90 ? '#1b5e20' : pct >= 75 ? '#e65100' : '#c62828';
        h += '<span class="rbadge" title="Compliance: ' + fill + ' of ' + tot + ' filled" style="background:' + bg + ';color:' + fg + ';font-weight:800;">' + pct + '% compliant</span>';
    }
    var hasOvd = ovd > 0;
    h += '<span class="rbadge" title="Past-due, not yet filled" style="background:' + (hasOvd ? '#ffebee' : '#e8f5e9') + ';color:' + (hasOvd ? '#c62828' : '#1b5e20') + ';font-weight:800;">' + ovd + ' ' + (ovdLabel || 'overdue') + '</span>';
    return h;
};

// ESH: KPM-report look for the Overall Summary tables (Total Exposures, ESH Activities). Scoped to .rpt-sum.
window.rptSumInjectCss = function() { window.rptInjectCss(); };  // table look: .esh-tbl block in styles.css

// ESH: same look as the Overall Summary, for the per-project tables of Total Exposures. Scoped to .exp-proj.
window.expProjInjectCss = function() {};  // table look: .esh-tbl block in styles.css

// ESH: KPM-report look for the Environmental Monitoring overall summaries (Electricity, Water, Waste, Appliances, Fuel). Scoped to .env-sum-kpm.
window.envKpmInjectCss = function() { if (typeof window.rptInjectCss === 'function') window.rptInjectCss(); };  // table look: .esh-tbl block in styles.css
// ── rptBar: the one header bar for every report (title + subtitle + pills) ──
// o: { title, sub, pills: [ 'text' | { text, id, cls } ], html, icon (key of HDR_ICONS, shown left of the title) }   html = extra raw markup (kept as-is)
window.rptBar = function(o) {
    var pills = (o.pills || []).map(function(p) {
        if (typeof p === 'string') p = { text: p };
        return '<span class="rpt-pill' + (p.cls ? ' ' + p.cls : '') + '"' + (p.id ? ' id="' + p.id + '"' : '') + '>' + p.text + '</span>';
    }).join('');
    return '<div class="rpt-bar">' + (o.title ? '<h2>' + (o.icon ? window.hdrIcon(o.icon) : '') + o.title + '</h2>' : '')
        + (o.sub != null ? '<div class="rpt-sub">' + o.sub + '</div>' : '') + pills + (o.html || '') + '</div>';
};
// ── novBanner: the one banner (title + subtitle + stat tiles) for NOV tabs ──
// o: { icon, hdr (key of HDR_ICONS: colored icon instead of icon), title, sub, stats: [ { label, value, sub, tone: 'ok'|'bad'|'viol', icon } ] }   styles: .esh-ban in styles.css
window.novBanner = function(o) {
    var stats = o.stats.map(function(s) {
        return '<div class="esh-stat ' + s.tone + '"><div class="esh-stat-l">' + window.icon(s.icon) + s.label + '</div>'
            + '<div class="esh-stat-n">' + s.value + '</div>' + (s.sub ? '<div class="esh-stat-s">' + s.sub + '</div>' : '') + '</div>';
    }).join('');
    return '<div class="esh-ban"><div class="esh-ban-h">' + (o.hdr ? window.hdrIcon(o.hdr) : window.icon(o.icon)) + '<div><div class="esh-ban-t">' + o.title
        + '</div><div class="esh-ban-s">' + o.sub + '</div></div></div><div class="esh-ban-g">' + stats + '</div></div>';
};
// ── envSummaryTable: ONE builder for every Environmental Monitoring "Overall Summary" (Electricity, Water, Waste, Appliances, Fuel) ──
// One container, one table: the title bar is the table's <caption>, the totals are the GRAND TOTAL row. Styles: .env-sum-kpm in styles.css
// o: { title, pill, pillId,
//      groups: [ { label, span } ]            header cells right after Region + Projects (span = how many columns it covers)
//      cols:   [ { label, dec, fixed } ]      one per data column. label '' on all = no 2nd header row. dec = max decimals, fixed = exact decimals
//      rows:   [ { region, projs, values: [] } ]   values in the same order as cols
//      totals: [ ]                            GRAND TOTAL values, same order as cols
//      icon (name from window.ESH_ICONS: used by the note and the empty state), note (html: what the tab is for, shown under the title bar),
//      hasData, emptyText,
//      extraRows (raw <tr> html appended to tbody, optional) }
window.envFmtNum = function(v, dec) {
    v = Number(v) || 0;
    return v > 0 ? v.toLocaleString(undefined, { maximumFractionDigits: dec == null ? 3 : dec }) : '\u2014';
};
window.envSummaryTable = function(o) {
    window.envKpmInjectCss();
    var cell = function(v, c, vals) {
        v = Number(v) || 0;
        var tipAttr = '';
        if (c.tip && v > 0) {
            var lines = c.tip(vals, v);
            if (lines && lines.length) tipAttr = ' title="' + lines.map(function(x) { return String(x).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }).join('&#10;') + '" data-tip-nowrap';
        }
        return '<td' + tipAttr + '>' + (c.fixed != null ? (v > 0 ? v.toFixed(c.fixed) : '\u2014') : window.envFmtNum(v, c.dec)) + '</td>';
    };
    var note = o.note ? '<div style="display:flex;align-items:center;gap:10px;padding:11px 16px;border-bottom:1px solid var(--tbl-line,#e3e9e4);text-align:left;font-weight:400;text-transform:none;letter-spacing:0;">'
        + '<span style="color:#2e7d32;font-size:1.2rem;">' + window.icon(o.icon || 'seedling') + '</span>'
        + '<div style="font-size:0.74rem;line-height:1.6;flex:1;color:var(--text-primary);">' + o.note + '</div></div>' : '';
    var cap = window.rptBar({ title: o.title, sub: o.sub || 'Consolidated data from all projects across all regions', pills: o.pill ? [{ text: o.pill, id: o.pillId }] : [] })
        .replace('class="rpt-bar"', 'class="rpt-bar" style="margin:0;border:0;border-bottom:1px solid var(--tbl-line,#e3e9e4);border-radius:0;"');
    var head1 = '<th>Region</th><th>Projects</th>' + o.groups.map(function(g) { return '<th colspan="' + (g.span || 1) + '">' + g.label + '</th>'; }).join('');
    var head2 = o.cols.some(function(c) { return c.label; })
        ? '<tr><th></th><th></th>' + o.cols.map(function(c) { return '<th>' + (c.label || '') + '</th>'; }).join('') + '</tr>' : '';
    var body = o.rows.map(function(r) {
        return '<tr><td>' + r.region + '</td><td>' + r.projs + '</td>' + o.cols.map(function(c, i) { return cell(r.values[i], c, r.values); }).join('') + '</tr>';
    }).join('');
    var foot = '<tr><td colspan="2">GRAND TOTAL</td>'
        + o.cols.map(function(c, i) { return cell(o.totals[i], c, o.totals); }).join('') + '</tr>';
    var empty = o.hasData ? '' : '<div style="padding:24px;text-align:center;color:var(--text-secondary);font-size:0.78rem;font-style:italic;"><span style="opacity:0.2;font-size:1.8rem;display:block;margin-bottom:8px;">'
        + window.icon(o.icon || 'seedling') + '</span>' + (o.emptyText || 'No data entered yet.') + '</div>';
    return '<div class="rpt-wrap env-sum-kpm"><div class="rpt-card"><div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:0.68rem;">'
        + '<caption style="caption-side:top;padding:0;text-align:left;">' + cap + note + '</caption>'
        + '<thead><tr>' + head1 + '</tr>' + head2 + '</thead><tbody>' + body + (o.extraRows || '') + '</tbody><tfoot>' + foot + '</tfoot></table></div>' + empty + '</div></div>';
};

// ═══════════════════════════════════════════════════════════════════════════
// ESH POPUP ANIMATOR — one uniform open/close animation for EVERY popup.
//
//  • Static modals (#addProjectModal, #confirmModal, …) →  eshModalShow(el) / eshModalHide(el)
//  • Dynamic popups (the many `document.createElement('div')` overlays) are
//    detected automatically and animated on open. When their existing code
//    calls `.remove()`, a visual "ghost" copy plays the exit animation, so none
//    of the existing close handlers had to change.
//
// Timings / easing live in styles.css  (:root  --esh-pop-in / --esh-pop-out / --esh-pop-ease)
// To exclude a popup:  overlay.setAttribute('data-esh-noanim', '')
// ═══════════════════════════════════════════════════════════════════════════
(function () {
    'use strict';
    if (window.__eshPopAnimator) return;
    window.__eshPopAnimator = true;

    var OUT_MS = 200;                       // keep in sync with --esh-pop-out in styles.css
    var _remove = Element.prototype.remove;
    var recentGhosts = {};

    function reduceMotion() {
        return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    // ── A) STATIC MODALS ────────────────────────────────────────────────────
    window.eshModalShow = function (el) {
        if (!el) return;
        if (el._eshHideT) { clearTimeout(el._eshHideT); el._eshHideT = null; }
        el.classList.remove('esh-closing');
        el.classList.add('esh-modal');
        el.style.display = 'flex';
        if (el.classList.contains('modal')) el.classList.add('show');
    };

    window.eshModalHide = function (el) {
        if (!el) return;
        var visible = el.isConnected && el.style.display !== 'none' &&
                      getComputedStyle(el).display !== 'none';
        el.classList.remove('show');                       // state checks (classList.contains('show')) stay accurate
        if (!visible || reduceMotion()) {
            if (el._eshHideT) { clearTimeout(el._eshHideT); el._eshHideT = null; }
            el.classList.remove('esh-closing');
            el.style.display = 'none';
            return;
        }
        if (el._eshHideT) return;                          // already closing
        el.classList.add('esh-closing');
        el._eshHideT = setTimeout(function () {
            el._eshHideT = null;
            el.classList.remove('esh-closing');
            if (el.classList.contains('show')) return;     // re-opened while closing
            el.style.display = 'none';
        }, OUT_MS);
    };

    // ── B) DYNAMIC POPUPS: detect on insert ─────────────────────────────────
    function isCandidate(n) {
        if (n.nodeType !== 1 || n.__eshPop || n.hasAttribute('data-esh-noanim')) return false;
        var cls = typeof n.className === 'string' ? n.className : '';
        if (cls.indexOf('esh-pop-ghost') > -1) return false;
        return (n.style && n.style.position === 'fixed') ||
               /overlay|modal|dialog|popup|lightbox/i.test(cls);
    }

    function isDimmedFullScreen(n) {
        var cs = getComputedStyle(n);
        if (cs.position !== 'fixed' || cs.display === 'none' || cs.visibility === 'hidden') return false;
        var r = n.getBoundingClientRect();
        if (r.width < window.innerWidth * 0.9 || r.height < window.innerHeight * 0.9) return false;
        var bg = cs.backgroundColor || '';
        var m = /rgba?\(([^)]+)\)/.exec(bg);
        if (!m) return false;
        var alpha = 1, slash = /\/\s*([\d.]+)/.exec(m[1]);
        if (slash) alpha = parseFloat(slash[1]);
        else { var p = m[1].split(','); if (p.length > 3) alpha = parseFloat(p[3]); }
        return alpha >= 0.15;
    }

    function arm(n) {
        n.__eshPop = true;
        n.classList.add('esh-blur');
        // Same popup re-rendered in the same tick (remove old + insert new, same id)
        // → treat as an in-place update: no exit ghost, no second entrance.
        var g = n.id && recentGhosts[n.id];
        if (g && performance.now() - g.t < 150) {
            _remove.call(g.el);
            delete recentGhosts[n.id];
            return;
        }
        if (reduceMotion()) return;
        var an = getComputedStyle(n).animationName;
        if (an && an !== 'none') return;                   // already has its own (real) entrance animation
        n.classList.add('esh-pop-overlay');
        for (var i = 0; i < n.children.length; i++) {      // cards centred with transform → fade only (no jump)
            if (getComputedStyle(n.children[i]).transform !== 'none') n.children[i].classList.add('esh-fade-only');
        }
    }

    function startObserver() {
        if (!document.body || window.__eshPopObserver) return;
        window.__eshPopObserver = new MutationObserver(function (muts) {
            for (var i = 0; i < muts.length; i++) {
                var added = muts[i].addedNodes;
                for (var j = 0; j < added.length; j++) {
                    var n = added[j];
                    try { if (isCandidate(n) && isDimmedFullScreen(n)) arm(n); } catch (e) {}
                }
            }
        });
        window.__eshPopObserver.observe(document.body, { childList: true, subtree: true });
    }
    if (document.body) startObserver();
    else document.addEventListener('DOMContentLoaded', startObserver);

    // ── C) DYNAMIC POPUPS: exit animation via a visual ghost ────────────────
    function makeGhost(el) {
        var cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05) return null;
        if (el.getElementsByTagName('*').length > 3000) return null;      // too heavy to clone

        var g = el.cloneNode(true);
        var all = g.querySelectorAll('*'), orig = el.querySelectorAll('*'), i;

        // neutralise the copy so it can never clash with the live page
        g.removeAttribute('id');
        g.classList.remove('esh-pop-overlay');
        g.classList.add('esh-pop-ghost');
        g.setAttribute('inert', ''); g.setAttribute('aria-hidden', 'true');
        for (i = 0; i < all.length; i++) {
            var a = all[i];
            a.removeAttribute('id'); a.removeAttribute('name'); a.removeAttribute('autofocus');
        }
        // heavy / live content can't be cloned faithfully → blank placeholder of the same size
        for (i = 0; i < orig.length; i++) {
            if (/^(IFRAME|VIDEO|AUDIO|EMBED|OBJECT|SCRIPT)$/.test(orig[i].tagName)) {
                var ph = document.createElement('div');
                var r = orig[i].getBoundingClientRect();
                ph.style.cssText = 'width:' + r.width + 'px;height:' + r.height + 'px;';
                all[i].parentNode && all[i].parentNode.replaceChild(ph, all[i]);
            }
        }
        // keep what the person sees: canvases (charts), typed values, scroll positions
        var oc = el.querySelectorAll('canvas'), gc = g.querySelectorAll('canvas');
        for (i = 0; i < oc.length && i < gc.length; i++) {
            try { gc[i].width = oc[i].width; gc[i].height = oc[i].height; gc[i].getContext('2d').drawImage(oc[i], 0, 0); } catch (e) {}
        }
        var of = el.querySelectorAll('input,textarea,select'), gf = g.querySelectorAll('input,textarea,select');
        for (i = 0; i < of.length && i < gf.length; i++) {
            try { gf[i].value = of[i].value; if (of[i].type === 'checkbox' || of[i].type === 'radio') gf[i].checked = of[i].checked; } catch (e) {}
        }
        g._scrolls = [];
        if (el.scrollTop) g._scrolls.push([g, el.scrollTop]);
        for (i = 0; i < orig.length; i++) {
            if (orig[i].scrollTop && all[i]) g._scrolls.push([all[i], orig[i].scrollTop]);
        }
        return g;
    }

    Element.prototype.remove = function () {
        var self = this;
        try {
            if (self.__eshPop && self.isConnected && self.parentNode && !reduceMotion()) {
                var g = makeGhost(self);
                if (g) {
                    self.parentNode.insertBefore(g, self.nextSibling);
                    for (var k = 0; k < g._scrolls.length; k++) g._scrolls[k][0].scrollTop = g._scrolls[k][1];
                    if (self.id) recentGhosts[self.id] = { el: g, t: performance.now() };
                    setTimeout(function () { _remove.call(g); }, OUT_MS + 40);
                }
            }
        } catch (e) { /* never let the animation break closing */ }
        return _remove.call(self);
    };
})();

// ── FORM MODAL GUARD — "Discard changes?" when closing a form modal that has unsaved input ──
// Only watches typing/changing by the user (trusted events) and the close buttons. Save logic is not touched.
(function eshFormGuard() {
    var IDS = ['addProjectModal', 'addPersonnelModal', 'editPersonnelModal', 'transferPersonnelModal', 'editProjectModal', 'pc-upload-modal'];
    var SEL = IDS.map(function (i) { return '#' + i; }).join(',');
    var CLOSE = /^\s*(close\w*Modal|pcCloseUpload)\s*\(/;
    function mark(e) {
        if (!e.isTrusted || !e.target.closest) return;
        var m = e.target.closest(SEL);
        if (m) m._eshDirty = true;
    }
    document.addEventListener('input', mark, true);
    document.addEventListener('change', mark, true);
    document.addEventListener('click', function (e) {
        if (!e.target.closest) return;
        var btn = e.target.closest('[onclick]');
        if (!btn) return;
        var m = btn.closest(SEL);
        if (!m || !m._eshDirty) return;
        if (!CLOSE.test(btn.getAttribute('onclick') || '')) return;
        if (btn._eshBypass) { btn._eshBypass = false; return; }
        e.preventDefault(); e.stopImmediatePropagation();
        if (typeof showModernDialog !== 'function') { m._eshDirty = false; btn._eshBypass = true; btn.click(); return; }
        var p = showModernDialog('Discard changes?', 'You have unsaved changes. Close without saving?', true, 'Discard', 'Keep editing');
        var ovs = document.querySelectorAll('.ux-dialog-overlay');
        if (ovs.length) ovs[ovs.length - 1].style.zIndex = '100001';   // above every modal
        p.then(function (ok) { if (ok) { m._eshDirty = false; btn._eshBypass = true; btn.click(); } });
    }, true);
    function watch() {
        var mo = new MutationObserver(function () {
            IDS.forEach(function (id) {
                var m = document.getElementById(id);
                if (m && m._eshDirty && getComputedStyle(m).display === 'none') m._eshDirty = false;   // closed or saved → clean
            });
        });
        IDS.forEach(function (id) {
            var m = document.getElementById(id);
            if (m) mo.observe(m, { attributes: true, attributeFilter: ['class', 'style'] });
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();
})();

// ── Bar gradient helper: turns a flat hex color into a vertical gradient (light bottom → dark top). Colors themselves are untouched, only the fill style. Global scope — used by chart render code inside separate IIFEs below. ──
function _hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    return { r: parseInt(hex.substring(0, 2), 16), g: parseInt(hex.substring(2, 4), 16), b: parseInt(hex.substring(4, 6), 16) };
}
function _lightenColor(color, percent) {
    if (!color || color[0] !== '#') return color;
    const { r, g, b } = _hexToRgb(color);
    const lr = Math.round(r + (255 - r) * percent);
    const lg = Math.round(g + (255 - g) * percent);
    const lb = Math.round(b + (255 - b) * percent);
    return `rgb(${lr}, ${lg}, ${lb})`;
}
function _wrapRegionLabel(name) {
    const words = String(name).split(' ');
    const lines = [];
    let cur = '';
    words.forEach(w => {
        if (!cur) { cur = w; }
        else if ((cur + ' ' + w).length <= 10) { cur += ' ' + w; }
        else { lines.push(cur); cur = w; }
    });
    if (cur) lines.push(cur);
    return lines.length > 1 ? lines : lines[0];
}
function _barVerticalGradient(ctx, chartArea, color) {
    if (!chartArea) return color;
    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    gradient.addColorStop(0, color);                        // top = original color (solid)
    gradient.addColorStop(0.8, color);                      // stays solid through most of the bar
    gradient.addColorStop(1, _lightenColor(color, 0.2));    // very light fade at the bottom only
    return gradient;
}
// ── DOLE report full names (display only — data keys stay WAIR / RSO / MOM / AEDR / AMR) ──
var DOLE_FULL_NAMES = {
    WAIR: 'Work Accident/Illness Report',
    RSO:  'Report on Safety and Health Organization',
    MOM:  'Minutes of the Meeting',
    AEDR: 'Annual Work Accident/Illness Exposure Data Report',
    AMR:  'Annual Medical Report'
};
function doleFullName(id) { return DOLE_FULL_NAMES[id] || id; }
// Annual report (AEDR / AMR) N/A flag per project (per year) — stored as p.vals['dole_<ROW>__na'] = '1'
function isDoleAnnualNA(p, row) { return !!(p && p.vals && p.vals['dole_' + row + '__na'] === '1'); }
function isDoleAedrNA(p) { return isDoleAnnualNA(p, 'AEDR'); }
function isDoleAmrNA(p) { return isDoleAnnualNA(p, 'AMR'); }
window.DOLE_FULL_NAMES = DOLE_FULL_NAMES;
window.doleFullName = doleFullName;
window.isDoleAedrNA = isDoleAedrNA;
window.isDoleAmrNA = isDoleAmrNA;
window.isDoleAnnualNA = isDoleAnnualNA;


var _TAB_NAV_TABS = ['exposures','activities','medical','nov','nov-env','rates','emb','permits','env-monitoring','lta-registry','health-report','kpm'];
var _tabRegionProjectIdx = {};
function _tabNavKey(t, r) { return t + '|' + r; }

function getDrillStorageIdx(drill, arrayIdx) {
    if (drill._custom) return 500 + (drill._customIdx || 0);
    return (drill.id !== undefined) ? drill.id : arrayIdx;
}
window.getDrillStorageIdx = getDrillStorageIdx;

// ═══ OSH manpower — read from Total Exposures (Total Manpower), no manual input ═══
// Value  = Total Manpower of the last completed month that has data, in the selected year
//          (the current month is still ongoing, so it is skipped, same as the Total Exposures YTD).
// Finished project: 0 once the reference month is after the finish month.
//          (Reference month = current month for this year, December for past years, January for future years.)
// Used by: OSH Personnel Requirement Monitoring, OSH deficiency notifications, project modal, Excel export.
function getOshManpowerInfo(p) {
    var MN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    var info = { value: 0, month: 0, year: 0, finished: false, tip: '' };
    if (!p) return info;
    var now = new Date(), cy = now.getFullYear(), cm = now.getMonth() + 1;
    var sy = (typeof state !== 'undefined' && state && parseInt(state.selectedYear)) || cy;
    info.year = sy;
    var refMonth = sy < cy ? 12 : (sy === cy ? cm : 1);
    if (p.dateFinished && typeof isMonthAfterProjectFinish === 'function' && isMonthAfterProjectFinish(p, refMonth, sy)) {
        info.finished = true;
        info.tip = 'Finished project: manpower is 0';
        return info;
    }
    var cutoff = sy > cy ? 0 : (sy === cy ? cm - 1 : 12);
    var arr = p.vals && p.vals['exposures_Total Manpower'];
    if (arr) {
        for (var m = cutoff; m >= 1; m--) {
            var v = parseFloat(arr[m]);
            if (v > 0) { info.value = Math.round(v); info.month = m; break; }
        }
    }
    info.tip = info.value > 0
        ? 'From Total Exposures, Total Manpower: ' + MN[info.month - 1] + ' ' + sy
        : 'No Total Manpower in Total Exposures yet';
    return info;
}
function getOshManpower(p) { return getOshManpowerInfo(p).value; }
window.getOshManpowerInfo = getOshManpowerInfo;
window.getOshManpower = getOshManpower;
