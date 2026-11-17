// ═══ ui-highlights.js — ONE place for table highlights (row hover + coloured text) ═══
// Edit colours in THEME. Add or change tables in RULES (or ESHHighlight.register({...})).
//
//   table      : CSS selector of the table(s).
//   rowHover   : the whole row gets a tint on hover (default true).
//   skipRows   : CSS selector of rows that must not light up (e.g. total rows).
//   greenText  : selectors (relative to the table) whose text turns the "text" colour.
//
// How it works: CSS only. No JavaScript runs on mouse move, so there is no lag.
// Text boxes inside the hovered row become transparent, so no white box shows on the tint.
// The tint is an inset box-shadow on every cell of the row (row headers too). The cell's own colour
// (plan / actual / N/A / overdue / locked) stays visible. Fades are switched off so all columns change together.
// To keep one table out of the "all" rule, add class "no-hl" to it.
(function () {
    'use strict';
    if (window.ESHHighlight) return;

    // ── Colours ─────────────────────────────────────────────────────────────
    var THEME = {
        light: { row: 'rgba(46,125,50,0.16)',   text: '#1b5e20' },
        dark:  { row: 'rgba(165,214,167,0.18)', text: '#a5d6a7' }
    };

    // ── Tables that use the highlights ──────────────────────────────────────
    var RULES = [
        {   // ESH Calendar: Trainings, Emergency Drills, Corporate Drills
            name: 'esh-calendar',
            table: 'table.esh-table',
            rowHover: true,
            greenText: ['tbody td.esh-td-actual.esh-done input[type="date"]']
        },
        {   // KPM-style compact tables
            name: 'kpm',
            table: 'table.tab-kpm',
            skipRows: 'tr.tot',
            rowHover: true,
            stickyEdge: ['td.c1', 'td.c2']          // sticky columns keep their edge shadow
        },
        {   // Every other table in the dashboard (Exposures, Medical, Permits, Environmental, Personnel, ...)
            name: 'all',
            table: '#main-content table:not(.no-hl):not(.esh-table):not(.tab-kpm)',
            skipRows: 'tr.tot, tr.total, tr.totals, tr.grand-total',
            rowHover: true
        }
    ];

    var PARTS = ['', '::-webkit-datetime-edit', '::-webkit-datetime-edit-fields-wrapper', '::-webkit-datetime-edit-text',
                 '::-webkit-datetime-edit-month-field', '::-webkit-datetime-edit-day-field', '::-webkit-datetime-edit-year-field'];

    var INPUTS = 'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]),select,textarea';

    function cssFor(prefix, t) {
        var out = [];
        RULES.forEach(function (r) {
            if (r.rowHover !== false) {
                var tb = prefix + r.table + ' > tbody > tr' + (r.skipRows ? ':not(' + r.skipRows + ')' : '');
                var tint = 'inset 0 0 0 9999px ' + t.row;
                // 1) No fade on any cell, so every column changes at the same moment (hover and un-hover).
                out.push(prefix + r.table + ' > tbody > tr > :is(td,th),' + prefix + r.table + ' > tbody > tr > :is(td,th) ' + INPUTS.split(',').join(',' + prefix + r.table + ' > tbody > tr > :is(td,th) ') +
                    '{transition:none !important;}');
                // 2) Tint every cell of the row, row headers included. box-shadow is not reset by a cell's
                //    "background:... !important", so locked / N/A / overdue cells light up too.
                out.push(tb + ':hover > td,' + tb + ':hover > th{box-shadow:' + tint + ' !important;}');
                // 3) Text boxes in the row: no box of their own, so the row tint shows through and the whole
                //    row looks like one plain, even colour (same as Total Exposures).
                out.push(tb + ':hover :is(td,th) ' + INPUTS.split(',').join(',' + tb + ':hover :is(td,th) ') +
                    '{background:transparent !important;border-color:transparent !important;box-shadow:none !important;}');
                // 4) Sticky columns that have an edge shadow: keep it.
                (r.stickyEdge || []).forEach(function (sel) {
                    out.push(tb + ':hover > ' + sel + '{box-shadow:' + tint + ',2px 0 3px -2px rgba(0,0,0,.18) !important;}');
                });
            }
            (r.greenText || []).forEach(function (sel) {
                var list = PARTS.map(function (p) { return prefix + r.table + ' ' + sel + p; }).join(',');
                out.push(list + '{color:' + t.text + ' !important;-webkit-text-fill-color:' + t.text + ' !important;font-weight:700 !important;}');
            });
        });
        return out.join('\n');
    }

    function buildCss() {
        var st = document.getElementById('esh-highlight-css');
        if (!st) { st = document.createElement('style'); st.id = 'esh-highlight-css'; document.head.appendChild(st); }
        st.textContent = cssFor('body ', THEME.light) + '\n' + cssFor('body.dark-mode ', THEME.dark);
    }

    // ── Public API ──────────────────────────────────────────────────────────
    window.ESHHighlight = {
        theme: THEME,
        rules: RULES,
        register: function (rule) {            // e.g. ESHHighlight.register({ name:'x', table:'table.my-tbl', skipRows:'tr.total' })
            if (!rule || !rule.table) return;
            for (var i = 0; i < RULES.length; i++) { if (RULES[i].name === rule.name) { RULES[i] = rule; buildCss(); return; } }
            RULES.push(rule); buildCss();
        },
        refresh: buildCss
    };
    buildCss();
})();
