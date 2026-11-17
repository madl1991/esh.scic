

// ═══ Custom tooltip — replaces the browser's native title tooltip everywhere ═══
// Light card in light mode, charcoal card in dark mode, thin border and arrow (see styles.css). Works for any element with a title attribute
// (including ones created later), because it listens on the document.
(function () {
    if (window.__eshTipInit) return;
    window.__eshTipInit = true;

    var tip = null, anchor = null, timer = null;

    function ensureTip() {
        if (tip && tip.isConnected) return tip;
        tip = document.createElement('div');
        tip.id = 'esh-tip';
        tip.setAttribute('role', 'tooltip');
        document.body.appendChild(tip);
        return tip;
    }

    function hide() {
        clearTimeout(timer);
        timer = null;
        anchor = null;
        if (tip) tip.classList.remove('on');
    }

    function show(el, cx, cy) {
        var text = el.getAttribute('data-tip');
        if (!text || !el.isConnected) return;
        var t = ensureTip();
        anchor = el;
        t.textContent = text;
        // Cells marked data-tip-nowrap (e.g. Incident Tabulation): one line per row, no wrapping
        var nw = el.hasAttribute('data-tip-nowrap');
        t.style.whiteSpace = nw ? 'pre' : '';
        t.style.maxWidth   = nw ? 'none' : '';
        t.style.width      = nw ? 'max-content' : '';
        t.classList.remove('on');
        t.style.left = '0px';
        t.style.top = '0px';

        var r = el.getBoundingClientRect();
        // Very large elements (wide cells, whole cards): point at the cursor instead of the whole element
        if (r.width > 240 || r.height > 120) {
            r = { left: cx - 1, right: cx + 1, top: cy - 8, bottom: cy + 8, width: 2, height: 16 };
        }
        var w = t.offsetWidth, h = t.offsetHeight, g = 10, m = 8;
        var vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
        var side = 'right', x = r.right + g, y = r.top + r.height / 2 - h / 2;

        if (x + w > vw - m) { side = 'left'; x = r.left - g - w; }
        if (x < m) {
            side = (r.top - g - h >= m) ? 'top' : 'bottom';
            x = r.left + r.width / 2 - w / 2;
            y = side === 'top' ? r.top - g - h : r.bottom + g;
        }
        x = Math.max(m, Math.min(x, vw - w - m));
        y = Math.max(m, Math.min(y, vh - h - m));

        // Arrow points at the middle of the element
        var ao = (side === 'left' || side === 'right')
            ? (r.top + r.height / 2) - y
            : (r.left + r.width / 2) - x;
        ao = Math.max(14, Math.min(ao, (side === 'left' || side === 'right' ? h : w) - 14));

        t.setAttribute('data-side', side);
        t.style.setProperty('--ao', ao + 'px');
        t.style.left = Math.round(x) + 'px';
        t.style.top = Math.round(y) + 'px';
        t.classList.add('on');
    }

    document.addEventListener('mouseover', function (e) {
        var el = e.target && e.target.closest ? e.target.closest('[title],[data-tip]') : null;
        if (!el || el === anchor) return;
        hide();

        // Take over the native title so the browser doesn't show its own tooltip
        var native = el.getAttribute('title');
        if (native !== null) {
            if (native.trim()) {
                el.setAttribute('data-tip', native);
                if (!el.getAttribute('aria-label') && !(el.textContent || '').trim()) el.setAttribute('aria-label', native);
            }
            el.removeAttribute('title');
        }
        if (!el.getAttribute('data-tip')) return;

        // Cursor by situation (only touches elements that have a tooltip):
        //   disabled / view-only  -> not-allowed
        //   clickable             -> pointer
        //   text input / select   -> keep (text, etc.)
        //   custom cursor (move, grab, resize, zoom, wait ...) -> keep
        //   info only             -> help
        if (el.getAttribute('data-cur-auto')) { el.style.removeProperty('cursor'); el.removeAttribute('data-cur-auto'); }
        var _cs  = getComputedStyle(el).cursor;
        var _tag = el.tagName;
        var _cur = null;
        if (el.disabled || el.getAttribute('aria-disabled') === 'true' || el.classList.contains('disabled') ||
            /^view only/i.test(el.getAttribute('data-tip') || '')) {
            _cur = 'not-allowed';
        } else if (_tag === 'INPUT' || _tag === 'TEXTAREA' || _tag === 'SELECT' || el.isContentEditable) {
            _cur = null;                                   // keep the browser cursor (text, etc.)
        } else if (_cs !== 'auto' && _cs !== 'default' && _cs !== 'pointer' && _cs !== 'help') {
            _cur = null;                                   // custom cursor set on purpose
        } else if (_tag === 'BUTTON' || _tag === 'SUMMARY' || (_tag === 'A' && el.hasAttribute('href')) ||
                   el.getAttribute('role') === 'button' || el.hasAttribute('onclick') || _cs === 'pointer') {
            _cur = 'pointer';
        } else {
            _cur = 'help';
        }
        if (_cur && _cur !== _cs) { el.style.setProperty('cursor', _cur, 'important'); el.setAttribute('data-cur-auto', '1'); }

        var cx = e.clientX, cy = e.clientY;
        timer = setTimeout(function () { show(el, cx, cy); }, 250);
    }, true);

    document.addEventListener('mouseout', function (e) {
        if (!anchor && !timer) return;
        var to = e.relatedTarget;
        var el = e.target && e.target.closest ? e.target.closest('[data-tip]') : null;
        if (el && to && el.contains(to)) return;      // still inside the same element
        hide();
    }, true);

    document.addEventListener('mousemove', function () {
        if (anchor && !anchor.isConnected) hide();    // element was re-rendered while hovered
    }, true);
    ['mousedown', 'keydown', 'wheel', 'scroll', 'blur'].forEach(function (ev) {
        window.addEventListener(ev, hide, true);
    });
})();

// ═══ Chart.js tooltip — same look as the custom tooltip (light card / charcoal card) ═══
// Colors are functions, so they follow dark mode even if the chart was drawn earlier.
window.eshChartTip = function (extra) {
    var dark = function () { return document.body.classList.contains('dark-mode'); };
    return Object.assign({
        backgroundColor: function () { return dark() ? '#2b312d' : '#ffffff'; },
        titleColor: function () { return dark() ? '#eef2ef' : '#1f2a22'; },
        bodyColor: function () { return dark() ? '#eef2ef' : '#1f2a22'; },
        borderColor: function () { return dark() ? '#4a524c' : '#c9d5cc'; },
        borderWidth: 1,
        cornerRadius: 8,
        padding: 10,
        caretSize: 6,
        titleFont: { weight: '500' },
        bodyFont: { weight: '500' }
    }, extra || {});
};

// ═══ Accident/Incident Record — per-project cell tooltip ═══
// Lists the registry entries behind one monthly number: "AIIR title — date of incident", one line each.
// Uses the same rules as syncIncidentClassificationsFromRegistry / syncDaysLostFromLtaRegistry.
window.eshMedCellTip = function (p, row, month, year) {
    try {
        const CLS = {
            'LTA': 'LTA', 'Medical Treatment': 'Medical Treatment', 'First Aid': 'First Aid', 'Fatality': 'Fatality',
            'High-Potential incident': 'High-Potential Incident', 'Dangerous Occurrences': 'Dangerous Occurrence',
            'No. of Identified Near-Miss': 'Near Miss'
        };
        const entries = (p && p.vals && p.vals['lta-registry_entries']) || [];
        const persons = (typeof window.ltaEntryPersons === 'function') ? window.ltaEntryPersons : function (e) { return [e]; };
        const lines = [];
        entries.forEach(function (e) {
            if (!e) return;
            const dateStr = e.dateOfAccident || e.dateReported;
            if (!dateStr) return;
            const label = String(e.aiirNo || '').trim() || String(e.natureOfIncident || '').trim() || 'No AIIR title';
            if (row === 'Days Lost/Charged') {
                // days are split across calendar months, so the accident can be in an earlier month
                let days = 0;
                persons(e).forEach(function (pp) {
                    if (typeof window.ltaEffectiveInjuryType === 'function' && window.ltaEffectiveInjuryType(pp) === 'na') return;
                    if (typeof window.computeDaysChargedByMonth === 'function') days += (window.computeDaysChargedByMonth(pp, year) || [])[month] || 0;
                });
                if (days > 0) lines.push(label + ' \u2014 ' + dateStr + ' (' + days + ' day' + (days === 1 ? '' : 's') + ')');
                return;
            }
            const want = CLS[row];
            if (!want) return;
            const d = new Date(dateStr);
            if (isNaN(d.getTime()) || d.getFullYear() !== year || d.getMonth() + 1 !== month) return;
            let n = 0;
            persons(e).forEach(function (pp) {
                const c = pp.incidentClassification;
                if (Array.isArray(c) ? c.indexOf(want) !== -1 : c === want) n++;
            });
            if (n > 0) lines.push(label + ' \u2014 ' + dateStr + (n > 1 ? ' (x' + n + ')' : ''));
        });
        return lines.join('\n');
    } catch (err) {
        return '';
    }
};
