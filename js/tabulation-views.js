
function renderTabulation() {
    const container = document.getElementById('tabulation-view');
    if (!container) return;

    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    const C = {
        header: '#1b5e20',
        headerLight: '#2e7d32',
        headerDark: '#0d3d0f',
        accent: '#fbc02d',
        tblHdrDark: '#b7ddb5',
        tblHdrLight: '#c5e8c3',
        tblBorder: '#c8e6c9',
        rowAlt: '#e8f5e9',
        rowAlt2: '#f1f8e9',
        rowWhite: 'white',
        totalRow: 'linear-gradient(90deg,#e8f5e9,#f1f8e9)',
        grandHdr: 'linear-gradient(135deg,#0d3d0f 0%,#1b5e20 60%,#2e7d32 100%)',
        fatality: '#b71c1c',
        lta: '#388e3c',
        firstaid: '#2e7d32',
        medical: '#43a047',
        nearmiss: '#558b2f',
        env: '#00695c',
        total: '#1b5e20',
        mechHdr: '#b7ddb5',
        mechHdrDark: '#9ecf9b',
        mechTotal: '#1b5e20',
        factorHdr: '#b7ddb5',
        factorHdrDark: '#9ecf9b',
        factorTotal: '#1b5e20',
        factorPeople: '#1b5e20',
        factorEquip: '#2e7d32',
        factorMat: '#388e3c',
        factorEnv: '#43a047',
        factorOrg: '#558b2f',
    };

    // ── KPM-style compact tables (same look as Total Exposures / Accident-Incident Record) ──
    (function tabKpmInjectCss() {
        if (document.getElementById('tab-kpm-css')) return;
        var st = document.createElement('style');
        st.id = 'tab-kpm-css';
        var SH = 'box-shadow:2px 0 3px -2px rgba(0,0,0,.18)';
        st.textContent = [
            '.tab-kpm{width:100%;table-layout:fixed;border-collapse:separate;border-spacing:0;font-size:.72rem;font-variant-numeric:tabular-nums}',
            '.tab-kpm th,.tab-kpm td{padding:4px 6px;text-align:center;white-space:nowrap;border:0;border-right:1px solid #e3e9e4;border-bottom:1px solid #e3e9e4;line-height:1.35}',
            '.tab-kpm thead th{background:#b9dfbb;color:#1b5e20;font-size:.62rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:8px 3px}',
            '.tab-kpm thead th.now{background:#e65100;color:#fff}',
            '.tab-kpm thead th.h-tt{background:#ffe082;font-weight:800;border-left:2px solid #ffe082}',
            '.tab-kpm th:last-child,.tab-kpm td:last-child{border-right:0}',
            '.tab-kpm thead th.c1,.tab-kpm thead th.c2{text-align:left;padding-left:14px;position:sticky;left:0;z-index:4;' + SH + '}',
            '.tab-kpm thead th.c2{left:130px;z-index:4;padding-left:10px}',
            '.tab-kpm tbody td{background:#fff;color:#1b5e20;font-weight:700}',
            '.tab-kpm tbody tr:nth-child(even) td{background:#f4faf4}',
            '.tab-kpm tbody td.c1,.tab-kpm tbody td.c2{text-align:left;padding-left:14px;color:#1f2d23;position:sticky;left:0;z-index:2;overflow:hidden;text-overflow:ellipsis;' + SH + '}',
            '.tab-kpm tbody td.c2{left:130px;padding-left:10px;font-weight:600}',
            '.tab-kpm.two thead th.c1,.tab-kpm.two tbody td.c1{box-shadow:none}',
            '.tab-kpm tbody tr td.z{color:#c4cbc6;font-weight:400}',
            '.tab-kpm tbody tr td.red{color:#c62828}',
            '.tab-kpm tbody tr td.prev{background:#fff4ec;color:#e65100}',
            '.tab-kpm tbody tr td.prev.z{color:#f0c9ad}',
            '.tab-kpm tbody tr td.tt{background:#fffbe6;font-weight:800;border-left:2px solid #ffe082}',
            '.tab-kpm tbody tr.grp td{border-top:1px solid #a5d6a7}',
            '.tab-kpm tbody tr.tot td{background:#1b5e20!important;color:#fff!important;border-color:#2c6f31;font-weight:800}',
            '.tab-kpm tbody tr.tot td.tt{background:#0d3d0f!important;color:#fbc02d!important;border-left-color:#0d3d0f}',
            'body.dark-mode .tab-kpm thead th{background:#2e5a34;color:#e8f5e9}',
            'body.dark-mode .tab-kpm thead th.now{background:#e65100;color:#fff}',
            'body.dark-mode .tab-kpm thead th.h-tt{background:#7a6a1f;color:#fff}',
            'body.dark-mode .tab-kpm th,body.dark-mode .tab-kpm td{border-color:#2f4034}',
            'body.dark-mode .tab-kpm tbody td{background:var(--bg-card,#1e2a22);color:#c8e6c9}',
            'body.dark-mode .tab-kpm tbody tr:nth-child(even) td{background:#243329}',
            'body.dark-mode .tab-kpm tbody td.c1,body.dark-mode .tab-kpm tbody td.c2{color:#e8f5e9}',
            'body.dark-mode .tab-kpm tbody tr td.z{color:#4a5a4e}',
            'body.dark-mode .tab-kpm tbody tr td.prev{background:#3a2a1e;color:#ffccbc}',
            'body.dark-mode .tab-kpm tbody tr td.tt{background:#3d3a1c;color:#ffe082}'
        ].join('');
        document.head.appendChild(st);
    })();

    const _tkNow = new Date();
    const _tkCur = (y) => (y === _tkNow.getFullYear()) ? _tkNow.getMonth() : (y < _tkNow.getFullYear() ? 11 : -1);
    // last month whose zero is shown as 0. The current month is still ongoing, so its zero shows as a dash.
    const _tkZeroCur = (y) => (y === _tkNow.getFullYear()) ? _tkNow.getMonth() - 1 : _tkCur(y);
    const _tkMonthTh = (m, mi, cur) => `<th${mi === cur ? ' class="now"' : ''}>${m}</th>`;
    // month cell: value > 0 → bold, 0 → muted 0, month not yet arrived → dash
    const _tkTip = (t) => t ? ` title="${String(t).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/\n/g,'&#10;')}" style="cursor:help" data-tip-nowrap` : '';
    const _tkVal = (v, mi, cur, red, tip) => {
        if (v === null || v === undefined) return `<td class="z">—</td>`;
        if (v) return `<td${red ? ' class="red"' : ''}${_tkTip(tip)}>${v}</td>`;
        return `<td class="z">${mi > cur ? '—' : '0'}</td>`;
    };

    function renderSummaryTable(year, data) {
        const hasAccum = data.headers.includes('Accumulated') || data.headers.includes('Running');
        const accumLabel = data.headers.includes('Accumulated') ? 'Accumulated' : 'Running';
        const months = data.headers.slice(2, data.headers.length - (hasAccum ? 2 : 1));
        const cur = _tkCur(year);

        let html = `<table class="tab-kpm" style="min-width:1150px;">
            <colgroup><col style="width:210px"><col>${months.map(() => '<col style="width:58px">').join('')}<col style="width:68px">${hasAccum ? '<col style="width:112px">' : ''}</colgroup>
            <thead><tr>
                <th class="c1">Incident / Accident</th>
                <th>Previous</th>
                ${months.map((m, mi) => _tkMonthTh(m, mi, cur)).join('')}
                <th class="h-tt">Total</th>
                ${hasAccum ? `<th class="h-tt">${accumLabel}</th>` : ''}
            </tr></thead><tbody>`;

        data.rows.forEach(row => {
            const name = row[0];
            const prev = row[1];
            const vals = row.slice(2, row.length - (hasAccum ? 2 : 1));
            const total = row[row.length - (hasAccum ? 2 : 1)];
            const accum = hasAccum ? row[row.length - 1] : null;
            const isTot = name === 'Total';
            const red = /^(fatality|lta)$/i.test(String(name).trim());
            const tp = data.tips && data.tips[String(name).trim()];
            html += `<tr${isTot ? ' class="tot"' : ''}>
                <td class="c1"${name.startsWith('  ') ? ' style="padding-left:26px"' : ''}>${name.trim()}</td>
                <td class="prev${prev ? '' : ' z'}"${prev ? _tkTip(tp && tp.prev) : ''}>${prev ?? '—'}</td>
                ${vals.map((v, mi) => _tkVal(v, mi, _tkZeroCur(year), red, tp && tp.months[mi])).join('')}
                <td class="tt${total ? '' : ' z'}"${total ? _tkTip(tp && tp.total) : ''}>${total ?? '—'}</td>
                ${hasAccum ? `<td class="tt${accum ? '' : ' z'}"${accum ? _tkTip(tp && tp.accum) : ''}>${accum ?? '—'}</td>` : ''}
            </tr>`;
        });

        if (data.total) {
            const trow = data.total;
            const prev = trow[1];
            const tvals = trow.slice(2, trow.length - (hasAccum ? 2 : 1));
            const ttotal = trow[trow.length - (hasAccum ? 2 : 1)];
            const taccum = hasAccum ? trow[trow.length - 1] : null;
            html += `<tr class="tot">
                <td class="c1">Total</td>
                <td>${prev ?? '—'}</td>
                ${tvals.map((v, mi) => `<td>${(v || mi <= _tkZeroCur(year)) ? (v ?? 0) : '—'}</td>`).join('')}
                <td class="tt">${ttotal ?? '—'}</td>
                ${hasAccum ? `<td class="tt">${taccum ?? '—'}</td>` : ''}
            </tr>`;
        }

        html += `</tbody></table>`;
        if (data.note) html += `<div style="font-size:0.68rem;color:#888;margin-top:6px;padding:0 4px;"><i class="fas fa-info-circle"></i> ${data.note}</div>`;
        return html;
    }

    function renderMechanismTable(data, year) {
        const cur = _tkCur(year);
        const nCols = ((data.rows[0] || data.total || []).length - 1) || 12;
        const months = data.headers.slice(1, 1 + nCols);
        let html = `<table class="tab-kpm" style="min-width:960px;">
            <colgroup><col style="width:220px">${months.map(() => '<col>').join('')}<col></colgroup>
            <thead><tr>
                <th class="c1">Incident Mechanism</th>
                ${months.map((m, mi) => _tkMonthTh(m, mi, cur)).join('')}
                <th class="h-tt">Total</th>
            </tr></thead><tbody>`;
        data.rows.forEach(row => {
            const vals = row.slice(1);
            const total = vals.reduce((a, b) => a + (b || 0), 0);
            html += `<tr>
                <td class="c1">${row[0]}</td>
                ${vals.map((v, mi) => _tkVal(v, mi, _tkZeroCur(year), false)).join('')}
                <td class="tt${total > 0 ? '' : ' z'}">${total}</td>
            </tr>`;
        });
        html += `<tr class="tot">
            <td class="c1">TOTAL</td>
            ${data.total.map((v, mi) => `<td>${(v || mi <= _tkZeroCur(year)) ? (v ?? 0) : '—'}</td>`).join('')}
            <td class="tt">${data.total.reduce((a, b) => a + (b || 0), 0)}</td>
        </tr></tbody></table>`;
        return html;
    }

    function renderAgentTable(data, year) {
        const cur = _tkCur(year);
        const nCols = ((data.rows[0] || data.total || []).length - 1) || 12;
        const months = data.headers.slice(1, 1 + nCols);
        let html = `<table class="tab-kpm" style="min-width:960px;">
            <colgroup><col style="width:320px">${months.map(() => '<col>').join('')}<col></colgroup>
            <thead><tr>
                <th class="c1">Agent of Injury</th>
                ${months.map((m, mi) => _tkMonthTh(m, mi, cur)).join('')}
                <th class="h-tt">Total</th>
            </tr></thead><tbody>`;
        data.rows.forEach(row => {
            const vals = row.slice(1);
            const total = vals.reduce((a, b) => a + (b || 0), 0);
            html += `<tr>
                <td class="c1">${row[0]}</td>
                ${vals.map((v, mi) => _tkVal(v, mi, _tkZeroCur(year), false)).join('')}
                <td class="tt${total > 0 ? '' : ' z'}">${total}</td>
            </tr>`;
        });
        html += `<tr class="tot">
            <td class="c1">TOTAL</td>
            ${data.total.map((v, mi) => `<td>${(v || mi <= _tkZeroCur(year)) ? (v ?? 0) : '—'}</td>`).join('')}
            <td class="tt">${data.total.reduce((a, b) => a + (b || 0), 0)}</td>
        </tr></tbody></table>`;
        return html;
    }

    function renderFactorsTable(data, year) {
        const cur = _tkCur(year);
        const factorColors = { 'PEOPLE': C.factorPeople, 'EQUIPMENT': C.factorEquip, 'MATERIALS': C.factorMat, 'ENVIRONMENT': C.factorEnv, 'ORGANIZATIONAL': C.factorOrg };
        const nCols = ((data.rows[0] || data.total || []).length - 2) || 12;
        const months = data.headers.slice(2, 2 + nCols);
        let currentColor = C.factorPeople;
        let html = `<table class="tab-kpm two" style="min-width:1000px;">
            <colgroup><col style="width:130px"><col style="width:270px">${months.map(() => '<col>').join('')}<col></colgroup>
            <thead><tr>
                <th class="c1">Category</th>
                <th class="c2">Contributing Factor</th>
                ${months.map((m, mi) => _tkMonthTh(m, mi, cur)).join('')}
                <th class="h-tt">Total</th>
            </tr></thead><tbody>`;
        data.rows.forEach((row, i) => {
            const factor = row[0];
            const subfactor = row[1];
            const vals = row.slice(2);
            const total = vals.reduce((a, b) => a + (b || 0), 0);
            if (factor) currentColor = factorColors[factor] || C.factorPeople;
            html += `<tr${factor && i > 0 ? ' class="grp"' : ''}>
                <td class="c1"${factor ? ` style="color:${currentColor};"` : ''}>${factor || ''}</td>
                <td class="c2">${subfactor}</td>
                ${vals.map((v, mi) => _tkVal(v, mi, _tkZeroCur(year), false)).join('')}
                <td class="tt${total > 0 ? '' : ' z'}">${total}</td>
            </tr>`;
        });
        html += `<tr class="tot">
            <td class="c1">TOTAL</td>
            <td class="c2"></td>
            ${data.total.map((v, mi) => `<td>${(v || mi <= _tkZeroCur(year)) ? (v ?? 0) : '—'}</td>`).join('')}
            <td class="tt">${data.total.reduce((a, b) => a + (b || 0), 0)}</td>
        </tr></tbody></table>`;
        return html;
    }

    const year = state.selectedYear || 2026;
    const availableYears = (function(){ const _yr=[]; for(let y=(typeof YEAR_RANGE!=='undefined'?YEAR_RANGE.min:2026); y<=Math.max(new Date().getFullYear(),(typeof YEAR_RANGE!=='undefined'?YEAR_RANGE.max:2030)); y++) _yr.push(y); return _yr; })();

    let d;
    if (year >= 2026) {
        const projects = getReportProjects();
        const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

        // Year-aware slot for an NOV: earlier year -> 0 (Previous), same year -> month 1-12, later year -> skipped
        function novSlot(dateStr, yr) {
            if (!dateStr) return null;
            const parts = (dateStr + '').split('-');
            const y = parseInt(parts[0]);
            const m = parseInt(parts[1]);
            if (isNaN(m) || m < 1 || m > 12) return null;
            if (!isNaN(y)) {
                if (y < yr) return 0;
                if (y > yr) return null;
            }
            return m;
        }

        const rows = {
            fatality:           new Array(14).fill(0),
            lta:                new Array(14).fill(0),
            firstAid:           new Array(14).fill(0),
            medical:            new Array(14).fill(0),
            highPotential:      new Array(14).fill(0),
            dangerousOccurrence:new Array(14).fill(0),
            oshNov:             new Array(14).fill(0),
            envNov:             new Array(14).fill(0),
        };

        // Tooltip sources: which project contributed to each cell (for tracing)
        const _srcMap = {};
        function addSrc(key, col, proj, n, note) {
            const k = key + '|' + col;
            (_srcMap[k] = _srcMap[k] || []).push({ proj: proj, n: n, note: note || '' });
        }
        function novNote(nov) {
            return 'issued ' + (nov.dateIssued || 'no date') + (nov.refNo && String(nov.refNo).toLowerCase() !== 'none' ? ', ref ' + nov.refNo : '');
        }
        const _srcFields = [
            ['fatality', 'medical_Fatality'], ['lta', 'medical_LTA'], ['firstAid', 'medical_First Aid'],
            ['medical', 'medical_Medical Treatment'], ['highPotential', 'medical_High-Potential incident'],
            ['dangerousOccurrence', 'medical_Dangerous Occurrences']
        ];

        projects.forEach(p => {
            if (!p.vals) return;

            for (let i = 0; i <= 13; i++) {
                rows.fatality[i]            += parseFloat(p.vals['medical_Fatality']?.[i]) || 0;
                rows.lta[i]                 += parseFloat(p.vals['medical_LTA']?.[i]) || 0;
                rows.firstAid[i]            += parseFloat(p.vals['medical_First Aid']?.[i]) || 0;
                rows.medical[i]             += parseFloat(p.vals['medical_Medical Treatment']?.[i]) || 0;
                rows.highPotential[i]       += parseFloat(p.vals['medical_High-Potential incident']?.[i]) || 0;
                rows.dangerousOccurrence[i] += parseFloat(p.vals['medical_Dangerous Occurrences']?.[i]) || 0;
                _srcFields.forEach(function (f) {
                    const n = parseFloat(p.vals[f[1]]?.[i]) || 0;
                    if (n) addSrc(f[0], i, p.name, n);
                });
            }

            const oshNovs = [
                ...(p.vals['osh-nov_internal_novs'] || []),
                ...(p.vals['osh-nov_external_novs'] || []),
            ];
            oshNovs.forEach(nov => {
                const m = novSlot(nov.dateIssued, year);
                if (m !== null) { rows.oshNov[m]++; addSrc('oshNov', m, p.name, 1, novNote(nov)); }
            });

            const envNovs = [
                ...(p.vals['nov-env_internal_novs'] || []),
                ...(p.vals['nov-env_external_novs'] || []),
            ];
            envNovs.forEach(nov => {
                const m = novSlot(nov.dateIssued, year);
                if (m !== null) { rows.envNov[m]++; addSrc('envNov', m, p.name, 1, novNote(nov)); }
            });
        });

        function buildRow(label, arr) {
            const prev = Math.round(arr[0]);
            const months = [];
            let total = 0;
            for (let i = 1; i <= 12; i++) {
                const v = Math.round(arr[i]);
                months.push(v);
                total += v;
            }
            const accum = prev + total;
            return [label, prev, ...months, total, accum];
        }

        const summaryRows = [
            buildRow('Fatality', rows.fatality),
            buildRow('LTA', rows.lta),
            buildRow('First Aid', rows.firstAid),
            buildRow('Medical Treatment', rows.medical),
            buildRow('High-Potential Incident', rows.highPotential),
            buildRow('Dangerous Occurrences', rows.dangerousOccurrence),
            buildRow('OSH Regulatory Issued NOV', rows.oshNov),
            buildRow('ENVI Regulatory Issued NOV', rows.envNov),
        ];

        // Tooltip text per cell: list of projects (and NOV issue dates) behind each number
        const _MONTHS_LONG = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        function _tipFor(label, key, cols, title) {
            const byProj = {};
            cols.forEach(function (c) {
                (_srcMap[key + '|' + c] || []).forEach(function (s) {
                    const e = byProj[s.proj] = byProj[s.proj] || { n: 0, notes: [] };
                    e.n += s.n;
                    if (s.note) e.notes.push(s.note);
                });
            });
            const names = Object.keys(byProj);
            if (!names.length) return '';
            const lines = names.map(function (nm) {
                const e = byProj[nm];
                return nm + ': ' + e.n + (e.notes.length ? ' (' + e.notes.join('; ') + ')' : '');
            });
            return lines.join('\n');
        }
        const _tipKeys = [
            ['Fatality', 'fatality'], ['LTA', 'lta'], ['First Aid', 'firstAid'], ['Medical Treatment', 'medical'],
            ['High-Potential Incident', 'highPotential'], ['Dangerous Occurrences', 'dangerousOccurrence'],
            ['OSH Regulatory Issued NOV', 'oshNov'], ['ENVI Regulatory Issued NOV', 'envNov']
        ];
        const summaryTips = {};
        _tipKeys.forEach(function (k) {
            const m12 = [1,2,3,4,5,6,7,8,9,10,11,12];
            summaryTips[k[0]] = {
                prev:   _tipFor(k[0], k[1], [0], 'Previous'),
                months: m12.map(function (m) { return _tipFor(k[0], k[1], [m], _MONTHS_LONG[m - 1] + ' ' + year); }),
                total:  _tipFor(k[0], k[1], m12, 'Total ' + year),
                accum:  _tipFor(k[0], k[1], [0].concat(m12), 'Accumulated')
            };
        });

        // totalRow layout (after slice(1) consumed by renderer):
        // [0]=prev, [1..12]=Jan-Dec months, [13]=Total, [14]=Accumulated
        // We build it as a 16-element array (index 0 unused) matching summaryRow layout,
        // then slice(1) in the d= assignment removes index 0.
        const totalRow = new Array(16).fill(0);
        summaryRows.forEach(row => {
            // Sum only prev (index 1) and 12 months (indices 2-13); skip pre-calc total[14] & accum[15]
            for (let c = 1; c <= 13; c++) {
                totalRow[c] = (totalRow[c] || 0) + (row[c] || 0);
            }
        });
        // index 14 = Total (sum of months indices 2-13)
        let _tMonthSum = 0;
        for (let c = 2; c <= 13; c++) _tMonthSum += totalRow[c];
        totalRow[14] = _tMonthSum;
        // index 15 = Accumulated (prev + total)
        totalRow[15] = totalRow[1] + _tMonthSum;

        const yearlyTotal = summaryRows.reduce((sum, row) => {
            return sum + (row[14] || 0);
        }, 0);

        d = {
            summary: {
                headers: ['Incident / Accident', 'Previous', ...MONTHS_SHORT, 'Total', 'Accumulated'],
                rows: summaryRows,
                tips: summaryTips,
                total: totalRow, // index 0 unused (renderer reads from index 1 like summaryRows)
            },
            mechanism: computeMechanismFromLta(projects),
            factors:   computeFactorsFromLta(projects),
            agent:     computeAgentOfInjuryFromLta(projects),
            yearlyTotal: yearlyTotal,
            isAutoComputed: true,
        };
    } else {
        d = {
            summary: { headers: ['Incident / Accident', 'Previous', 'Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Total'], rows: [], total: [] },
            mechanism: null,
            factors: null,
            agent: null,
            yearlyTotal: 0
        };
    }

    const tabDefs = [
        { key: 'summary',   label: 'Incident Summary',         icon: 'fa-list-check' },
        ...(d.mechanism ? [{ key: 'mechanism', label: 'Incident Mechanism', icon: 'fa-gear' }] : []),
        ...(d.factors   ? [{ key: 'factors',   label: 'Contributing Factors', icon: 'fa-circle-exclamation' }] : []),
        ...(d.agent     ? [{ key: 'agent',     label: 'Agent of Injury', icon: 'fa-triangle-exclamation' }] : []),
    ];
    if (!tabDefs.find(t => t.key === _tabulationTab)) _tabulationTab = 'summary';
    const curTab = _tabulationTab;

    let tabStrip = window.tabStrip(tabDefs, curTab, 'tabulationSetTab');

    let tabContent = '';
    if (curTab === 'summary') {
        tabContent = `
            <div style="overflow-x:auto;">${renderSummaryTable(year, d.summary)}</div>`;
    } else if (curTab === 'mechanism' && d.mechanism) {
        tabContent = `<div style="overflow-x:auto;">${renderMechanismTable(d.mechanism, year)}</div>`;
    } else if (curTab === 'factors' && d.factors) {
        tabContent = `<div style="overflow-x:auto;">${renderFactorsTable(d.factors, year)}</div>`;
    } else if (curTab === 'agent' && d.agent) {
        tabContent = `<div style="overflow-x:auto;">${renderAgentTable(d.agent, year)}</div>`;
    }

    let html = `
    <div style="max-width:1500px;margin:0 auto;">

        
        <div class="tab-info-bar tib-oneline" style="margin:10px 0 12px;">
            <div class="tib-body">
                <p class="tib-title">SCIC Incident / Accident Tabulation</p>
                <p class="tib-sub">Showing data for ${year} · FM-ESH-01-42</p>
            </div>
            <div class="tib-badges">
                ${d.isAutoComputed ? `<span class="tib-pill tib-pill-yellow">${window.icon("bolt")} AUTO-COMPUTED</span>` : ''}
                <span class="tib-pill tib-pill-green">${d.yearlyTotal} INCIDENTS ${year}</span>
            </div>
        </div>

        
        ${tabStrip}

        
        <div style="background:var(--bg-card);border-radius:12px;margin-bottom:20px;overflow:hidden;box-shadow:0 2px 12px rgba(46,125,50,0.08);border:none;">
            
                        <div style="padding:0;">
                ${tabContent}
            </div>
        </div>

    </div>`;

    container.innerHTML = html;
}

        function renderOshNovTab() {
            const container = document.getElementById('osh-nov-view');
            if (!container) return;
            const displayProjects = (state.filteredProjects || state.projects || []);

            // ── Helper: compute per-project NOV summary ──────────────────────
            function _oshNovSummary(p) {
                migrateOshNovData(p);
                const intNovs = p.vals['osh-nov_internal_novs'] || [];
                const extNovs = p.vals['osh-nov_external_novs'] || [];
                let open = 0, closed = 0;
                [...intNovs, ...extNovs].forEach(n => {
                    const vs = n.violations || [];
                    if (vs.length === 0) { open++; } else { vs.forEach(v => { if ((v.status||'Open') === 'Closed') closed++; else open++; }); }
                });
                return { total: intNovs.length + extNovs.length, int: intNovs.length, ext: extNovs.length, open, closed };
            }

            // ── Grand totals ─────────────────────────────────────────────────
            let _gtTotal=0,_gtInt=0,_gtExt=0,_gtOpen=0,_gtClosed=0,_gtViol=0,_gtViolOpen=0,_gtViolClosed=0;
            displayProjects.forEach(p => {
                migrateOshNovData(p);
                const intNovs = p.vals['osh-nov_internal_novs'] || [];
                const extNovs = p.vals['osh-nov_external_novs'] || [];
                _gtInt += intNovs.length; _gtExt += extNovs.length;
                [...intNovs,...extNovs].forEach(n => {
                    const vs = n.violations||[];
                    _gtViol += vs.length;
                    vs.forEach(v => { if((v.status||'Open')==='Closed') _gtViolClosed++; else _gtViolOpen++; });
                    if(vs.length===0){ _gtOpen++; } else { vs.forEach(v => { if((v.status||'Open')==='Closed') _gtClosed++; else _gtOpen++; }); }
                });
            });
            _gtTotal = _gtInt + _gtExt;

            let html = '';

            html += window.novBanner({
                icon: 'hardhat', title: 'OSH REGULATORY ISSUED NOV',
                sub: 'Notices of Violation — ' + window.icon("dot-red") + ' NCR (Client/SCIC Audit) and ' + window.icon("dot-orange") + ' External NOV (Regulatory Bodies)',
                stats: [
                    { label: 'Total NOV',        value: _gtTotal,  sub: _gtInt + ' NCR &bull; ' + _gtExt + ' ext', tone: 'ok',   icon: 'file'   },
                    { label: 'Open NOV',         value: _gtOpen,   tone: 'bad', icon: 'unlock' },
                    { label: 'Closed NOV',       value: _gtClosed, tone: 'ok',  icon: 'ok'     },
                    { label: 'Total Violations', value: _gtViol,   sub: _gtViolOpen + ' open &bull; ' + _gtViolClosed + ' closed', tone: 'viol', icon: 'list' }
                ]
            });

            const NOV_REG_ORDER = ['CORPORATE','PLANT OPERATIONS','NCR','SOUTH LUZON','NORTH LUZON','VISAYAS & MINDANAO'];

            NOV_REG_ORDER.forEach(reg => {
                const regProjs = displayProjects.filter(p => p.region === reg);
                if (!regProjs.length) return;
                const canEdit = UserAccounts.canEdit(state.currentUser?.email, reg) && UserAccounts.canEditTab(state.currentUser?.email, 'nov');
                const isCollapsed = !expandedRegions.has(reg);
                const safeReg = reg.replace(/[^a-zA-Z0-9]/g,'_');

                // Region totals
                let regTotal=0, regOpen=0, regClosed=0;
                regProjs.forEach(p => { const s=_oshNovSummary(p); regTotal+=s.total; regOpen+=s.open; regClosed+=s.closed; });


                html += `<div class="nov-region-card">
                    ${window.regionBanner({ id: `osh-nov-region-banner-${safeReg}`, reg: reg, toggle: 'toggleOshNovRegion', collapsed: isCollapsed, editable: canEdit, style: 'margin:0;',
                        right: `<span class="rbadge rbadge-count rb-proj">${regProjs.length} PROJ</span>`
                            + (regTotal>0?`<span class="rbadge rbadge-nov">${regTotal} NOV</span>`:'')
                            + (regOpen>0?`<span class="rbadge rbadge-open">${regOpen} Open</span>`:'')
                            + (regClosed>0?`<span class="rbadge rbadge-closed">${regClosed} Closed</span>`:'') })}
                    <div id="osh-nov-region-content-${safeReg}" style="border:none;box-shadow:0 2px 8px rgba(0,0,0,0.06);border-radius:0 0 10px 10px;overflow:hidden;background:var(--bg-card);${isCollapsed?'display:none;':''}">`;

                regProjs.forEach((p, idx) => {
                    const pnSafe = p.name.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
                    const s = _oshNovSummary(p);
                    const isWS = isProjectOnStoppage(p);
                    // Score badge coloring
                    const scoreBg = s.total === 0 ? '#f5f5f5' : s.open > 0 ? '#ffebee' : '#e8f5e9';
                    const scoreFg = s.total === 0 ? '#aaa' : s.open > 0 ? '#c62828' : '#2e7d32';
                    const scoreLabel = s.total === 0 ? '0 NOV' : `${s.total} NOV`;

                    html += `<div class="nov-proj-row" onclick="window.openOshNovModal('${pnSafe}')">
                        <span style="background:#1b5e20;color:white;border-radius:50%;width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;font-size:0.65rem;font-weight:800;flex-shrink:0;">${idx+1}</span>
                        <div style="flex:1;min-width:0;">
                            <div style="font-size:0.73rem;font-weight:700;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${isWS?'opacity:0.7;':''}">${window._dispProjName(p.name)}${isWS?' '+statusBadge('work-stoppage'):''}</div>
                            <div style="font-size:0.62rem;color:#888;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${reg === 'CORPORATE' ? 'SCIC Head Office' : reg === 'PLANT OPERATIONS' ? (p.location || 'Plant Facility') : (p.address || 'Project Address')}</div>
                        </div>
                        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
                            <span style="background:${scoreBg};color:${scoreFg};border-radius:10px;padding:3px 10px;font-size:0.68rem;font-weight:800;">${scoreLabel}</span>
                            ${s.open>0?`<span style="background:#ffebee;color:#c62828;border-radius:10px;padding:2px 8px;font-size:0.63rem;font-weight:700;border:1px solid #ef9a9a;">${s.open} Open</span>`:''}
                            ${s.closed>0?`<span style="background:#e8f5e9;color:#2e7d32;border-radius:10px;padding:2px 8px;font-size:0.63rem;font-weight:700;border:1px solid #a5d6a7;">${s.closed} Closed</span>`:''}
                            <i class="fas fa-chevron-right" style="color:#bbb;font-size:0.7rem;"></i>
                        </div>
                    </div>`;
                });

                html += `</div></div>`;
            });

            container.innerHTML = html;

        }

        // ── OSH NOV Full-Screen Modal ──────────────────────────────────────────
        window.openOshNovModal = function(pName) {
            const allProjects = state.filteredProjects || state.projects || [];
            const p = allProjects.find(pr => pr.name === pName);
            if (!p) return;
            migrateOshNovData(p);

            const userEmail = state.currentUser?.email || '';
            const canEdit = UserAccounts.canEdit(userEmail, p.region) && UserAccounts.canEditTab(userEmail, 'nov');
            const pnSafe = pName.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
            const isWS = isProjectOnStoppage(p);

            const existing = document.getElementById('osh-nov-modal');
            if (existing) existing.remove();

            function buildNovTable(type, label, emoji, hdrClass, bodies) {
                // Section markup comes from the shared window.novSectionHtml (one row per NOV).
                var pn = pnSafe;
                return window.novSectionHtml({
                    p: p, type: type, label: label, hdrClass: hdrClass, bodies: bodies,
                    novs: p.vals[type === 'internal' ? 'osh-nov_internal_novs' : 'osh-nov_external_novs'] || [],
                    secId: 'oshn-modal-' + type, toggle: 'toggleOshNovModalSec',
                    editing: !!(state.isEditing && canEdit), lawHead: 'Violation description per DOLE',
                    lawOpts: function(sel) { return buildOshLawOpts(sel); },
                    h: {
                        field:   function(n, f) { return "updateOshNovNovField('" + pn + "','" + type + "'," + n + ",'" + f + "',this.value)"; },
                        viol:    function(n, v, f) { return "updateOshNovViolField('" + pn + "','" + type + "'," + n + "," + v + ",'" + f + "',this.value)"; },
                        addViol: function(n) { return "addOshNovViolation('" + pn + "','" + type + "'," + n + ");window.openOshNovModal('" + pn + "')"; },
                        delNov:  function(n) { return "removeOshNovEntry('" + pn + "','" + type + "'," + n + ");window.openOshNovModal('" + pn + "')"; },
                        delViol: function(n, v) { return "removeOshNovViolation('" + pn + "','" + type + "'," + n + "," + v + ");window.openOshNovModal('" + pn + "')"; }
                    }
                });
            }

            const intNovs = p.vals['osh-nov_internal_novs'] || [];
            const extNovs = p.vals['osh-nov_external_novs'] || [];
            const totalNov = intNovs.length + extNovs.length;
            let totalOpen=0, totalClosed=0;
            [...intNovs,...extNovs].forEach(n => { const vs=n.violations||[]; { vs.forEach(v => { if((v.status||'Open')==='Closed') totalClosed++; else totalOpen++; }); } });

            const modal = document.createElement('div');
            modal.id = 'osh-nov-modal';
            window.eshMountModal(modal, {
                id: 'osh-nov-modal', icon: 'fa-hard-hat', width: 'min(1300px,98vw)',
                title: `OSH NOV — <span style="color:#2e7d32;">${p.name}</span>${isWS ? ' ' + statusBadge('work-stoppage') : ''}`,
                sub: `${p.region} &nbsp;·&nbsp; ${totalNov} NOV total &nbsp;·&nbsp; <span style="color:#c62828;">${totalOpen} open violations</span> &nbsp;·&nbsp; <span style="color:#2e7d32;">${totalClosed} closed</span>`,
                body: `<div style="background:#f1f8e9;border-bottom:1px solid #c8e6c9;padding:6px 16px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <span style="font-size:0.63rem;color:#2e7d32;font-weight:600;"><i class="fas fa-hard-hat" style="margin-right:4px;"></i>OSH REGULATORY ISSUED NOV</span>
                    ${!canEdit?('<span style="font-size:0.6rem;color:#e65100;"><i class="fas fa-lock" style="margin-right:4px;"></i>View Only — Press ' + window.icon("edit") + ' Edit button to enable editing</span>'):''}
                    <button type="button" class="nvt-btn" style="margin-left:auto;" data-all="0" onclick="novExpandAll('osh-nov-modal',this)">Expand all</button>
                </div>
                <div style="padding:16px 20px;">
                    ${buildNovTable('internal','INTERNAL NOV','🔴','internal-hdr',OSH_NOV_INTERNAL_BODIES)}
                    ${buildNovTable('external','EXTERNAL NOV','🟠','external-hdr',OSH_NOV_EXTERNAL_BODIES)}
                </div>
                `,
                foot: (state.isEditing && canEdit) ? `<button class="osh-nov-add-btn" onclick="addOshNovEntry('${pnSafe}','internal');window.openOshNovModal('${pnSafe}')"><i class="fas fa-plus"></i> Add Internal NOV</button>
<button class="osh-nov-add-btn external-btn" onclick="addOshNovEntry('${pnSafe}','external');window.openOshNovModal('${pnSafe}')"><i class="fas fa-plus"></i> Add External NOV</button>` : ''
            });
        };

        window.toggleOshNovModalSec = function(secId) {
            const content = document.getElementById(secId + '-content');
            const icon = document.getElementById(secId + '-icon');
            if (!content) return;
            const isCollapsed = content.style.maxHeight === '0px' || content.classList.contains('collapsed');
            if (isCollapsed) { content.style.maxHeight = '9999px'; content.style.opacity = '1'; if(icon) icon.style.transform=''; }
            else { content.style.maxHeight = '0px'; content.style.opacity = '0'; if(icon) icon.style.transform='rotate(-90deg)'; }
        };

        // Updated toggleOshNovRegion to support new safeReg chevron ids
        function _toggleOshNovRegion2(regionName, event) {
            if (event && (event.target.tagName === 'BUTTON' || event.target.closest('button'))) return;
            const safeReg = regionName.replace(/[^a-zA-Z0-9]/g,'_');
            const content = document.getElementById('osh-nov-region-content-' + safeReg);
            const banner = document.getElementById('osh-nov-region-banner-' + safeReg);
            if (!content) return;
            if (expandedRegions.has(regionName)) {
                expandedRegions.delete(regionName);
                content.style.display = 'none';
                if (banner) banner.classList.add('collapsed');
            } else {
                expandedRegions.add(regionName);
                content.style.display = '';
                if (banner) banner.classList.remove('collapsed');
            }
            localStorage.setItem(_EXP_KEY, JSON.stringify([...expandedRegions]));
        }

 // kept for legacy refs
        window.toggleOshNovRegion = _toggleOshNovRegion2;
        window.renderOshNovTab = renderOshNovTab;

        function toggleNovEnvRegion(regionName, event) {
            if (event && (event.target.tagName === 'BUTTON' || event.target.closest('button'))) return;
            const banner = document.getElementById('nov-env-region-banner-' + regionName);
            const cont   = document.getElementById('nov-env-region-content-' + regionName);
            if (!banner || !cont) return;
            if (expandedRegions.has(regionName)) {
                expandedRegions.delete(regionName);
                cont.classList.add('collapsed');
                banner.classList.add('collapsed');
            } else {
                expandedRegions.add(regionName);
                cont.classList.remove('collapsed');
                banner.classList.remove('collapsed');
            }
            localStorage.setItem(_EXP_KEY, JSON.stringify([...expandedRegions]));
        }
        window.toggleNovEnvRegion = toggleNovEnvRegion;

        function _getScrollEl() {
            return document.getElementById('main-content') || document.documentElement;
        }
        function safeRender() {
            const _mc = _getScrollEl();
            const _sy = _mc.scrollTop || 0;
            render();
            if (_sy > 0) {
                requestAnimationFrame(() => { _mc.scrollTop = _sy; });
            }
        }
        window.safeRender = safeRender;

        if (!window._pdfSetStatus) {
            window._pdfSetStatus = function(msg, type) {
                var el = document.getElementById('_pdf-upload-status-bar');
                if (type === 'clear') { if (el) el.remove(); return; }
                var colors = {
                    uploading: { bg: '#e3f2fd', border: '#1976D2', text: '#0d47a1', icon: 'fa-spinner fa-spin' },
                    saving:    { bg: '#fff8e1', border: '#f57c00', text: '#e65100', icon: 'fa-cloud-arrow-up fa-pulse' },
                    success:   { bg: '#e8f5e9', border: '#2e7d32', text: '#1b5e20', icon: 'fa-circle-check' },
                    error:     { bg: '#ffebee', border: '#c62828', text: '#b71c1c', icon: 'fa-triangle-exclamation' }
                };
                var c = colors[type] || colors.uploading;
                if (!el) {
                    el = document.createElement('div');
                    el.id = '_pdf-upload-status-bar';
                    el.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:9999;min-width:320px;max-width:520px;border-radius:10px;padding:10px 18px;display:flex;align-items:center;gap:10px;box-shadow:0 4px 20px rgba(0,0,0,0.18);font-size:0.85rem;font-weight:600;transition:background 0.3s,border-color 0.3s;';
                    document.body.appendChild(el);
                }
                el.style.background = c.bg;
                el.style.border = '2px solid ' + c.border;
                el.style.color = c.text;
                el.innerHTML = '<i class="fas ' + c.icon + '" style="font-size:1.1rem;flex-shrink:0;"></i><span>' + msg + '</span>';
            };
        }

        // ── Renders ONLY the region bar chart — never touches statusChart ──────────
        window.renderRegionChartOnly = function() {
            const chartProjects = state.projects.filter(p => p.region !== 'CORPORATE' && p.region !== 'PLANT OPERATIONS');
            const chartRegions = REGIONS.filter(r => r !== 'CORPORATE' && r !== 'PLANT OPERATIONS');
            const _rcv = state.complianceView || 0;
            const _RC_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
            const _rcNow = new Date();
            const _rcSelYear = state.selectedYear || _rcNow.getFullYear();
            const _rcCurYear = _rcNow.getFullYear();
            const _rcMaxMonth = (_rcSelYear === _rcCurYear) ? (_rcNow.getMonth() + 1) : 12;

            let regionAvgs;
            if (_rcv === 0) {
                regionAvgs = chartRegions.map(r => getRegionOverallCompliance(r)); // monthly-based Overall
            } else {
                regionAvgs = chartRegions.map(r => getMonthlyComplianceByRegion(_rcv, r));
            }

            // Update chart-box nav label
            const _rcBox = document.querySelector('.chart-box:has(#regionChart)') ||
                           (() => { const c = document.getElementById('regionChart'); return c ? c.closest('.chart-box') : null; })();
            if (_rcBox) {
                let _rcNav = _rcBox.querySelector('.rc-month-nav');
                if (!_rcNav) {
                    _rcNav = document.createElement('div');
                    _rcNav.className = 'rc-month-nav';
                    _rcNav.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:6px;margin:2px 0 8px;';
                    const _rcH3 = _rcBox.querySelector('h3');
                    if (_rcH3) _rcH3.after(_rcNav);
                    else _rcBox.prepend(_rcNav);
                }
                const _rcPrevOk = _rcv > 0;
                const _rcNextOk = _rcv < _rcMaxMonth;
                const _rcMonthLabel = _rcv === 0 ? 'Overall Average' : _RC_MONTHS[_rcv - 1];
                _rcNav.innerHTML =
                    `<span style="font-size:0.72rem;font-weight:700;color:${_rcv === 0 ? 'var(--hv-muted)' : 'var(--hv-brand)'};min-width:100px;text-align:center;letter-spacing:0.03em;">${_rcMonthLabel}</span>`;
            }

            setTimeout(() => {
                const regionCtx = document.getElementById('regionChart');
                if (!regionCtx) return;

                // --- Smooth animated update: reuse only if instance is still attached to this canvas ---
                const _attachedChart = Chart.getChart(regionCtx);
                if (state.charts.region && _attachedChart === state.charts.region) {
                    const _rcUpBgColors = regionAvgs.map(v => v === null || v === undefined ? '#9e9e9e' : v >= 90 ? '#4EAE5E' : v >= 75 ? '#FF9123' : '#DE4531');
                    const _rcUpGradientFn = (context) => {
                        const { chart, dataIndex } = context;
                        if (!chart.chartArea) return _rcUpBgColors[dataIndex];
                        return _barVerticalGradient(chart.ctx, chart.chartArea, _rcUpBgColors[dataIndex]);
                    };
                    state.charts.region.data.datasets[0].data = regionAvgs;
                    state.charts.region.data.datasets[0].backgroundColor = _rcUpGradientFn;
                    state.charts.region.data.datasets[0].hoverBackgroundColor = _rcUpGradientFn;
                    state.charts.region.data.datasets[0].borderWidth = 0;
                    state.charts.region.data.datasets[0].hoverBorderWidth = 0;
                    state.charts.region.update({
                        duration: 600,
                        easing: 'easeInOutQuart'
                    });
                    return;
                }

                // Stale or first render: destroy any orphan chart then create fresh
                if (state.charts.region) { state.charts.region.destroy(); state.charts.region = null; }
                const existingChart = Chart.getChart(regionCtx);
                if (existingChart) existingChart.destroy();

                // ── Status-only colors: color = compliance level, no per-region identity ──
                function _rcCompColor(v) {
                    if (v === null || v === undefined) return '#9e9e9e';
                    return v >= 90 ? '#4EAE5E' : v >= 75 ? '#FF9123' : '#DE4531';
                }
                const _rcBgColors = regionAvgs.map(_rcCompColor);

                // ── Threshold + value label plugin (animation-aware, no external dependency) ──
                const _rcThresholdPlugin = {
                    id: 'thresholdLine',
                    afterDraw(chart) {
                        const { ctx: c, chartArea: { left, right }, scales: { y } } = chart;
                        // Threshold lines — always visible
                        [{val:90,color:'#4EAE5E',label:'90%'},{val:75,color:'#FF9123',label:'75%'}].forEach(({val,color,label}) => {
                            const yPos = y.getPixelForValue(val);
                            c.save();
                            c.setLineDash([5,4]);
                            c.strokeStyle = color;
                            c.lineWidth = 1.5;
                            c.globalAlpha = 0.75;
                            c.beginPath(); c.moveTo(left, yPos); c.lineTo(right, yPos); c.stroke();
                            c.setLineDash([]);
                            c.globalAlpha = 1;
                            c.fillStyle = color;
                            c.font = 'bold 12px Inter, sans-serif';
                            c.fillText(label, right + 4, yPos + 4);
                            c.restore();
                        });
                        // Value labels — only after animation completes
                        if (chart._animatingLabels === false) {
                            const ds = chart.data.datasets[0];
                            chart.getDatasetMeta(0).data.forEach((bar, i) => {
                                const val = ds.data[i];
                                if (val === null || val === undefined) return;
                                const color = val >= 90 ? '#4EAE5E' : val >= 75 ? '#FF9123' : '#DE4531';
                                c.save();
                                c.fillStyle = color;
                                c.font = 'bold 13px Inter, sans-serif';
                                c.textAlign = 'center';
                                c.fillText(val + '%', bar.x, bar.y - 6);
                                c.restore();
                            });
                        }
                    }
                };

                state.charts.region = new Chart(regionCtx, {
                    type: 'bar',
                    data: {
                        labels: chartRegions.map(_wrapRegionLabel),
                        datasets: [{
                            label: 'Compliance %',
                            data: regionAvgs,
                            backgroundColor: (context) => {
                                const { chart, dataIndex } = context;
                                if (!chart.chartArea) return _rcBgColors[dataIndex];
                                return _barVerticalGradient(chart.ctx, chart.chartArea, _rcBgColors[dataIndex]);
                            },
                            hoverBackgroundColor: (context) => {
                                const { chart, dataIndex } = context;
                                if (!chart.chartArea) return _rcBgColors[dataIndex];
                                return _barVerticalGradient(chart.ctx, chart.chartArea, _rcBgColors[dataIndex]);
                            },
                            borderWidth: 0,
                            hoverBorderWidth: 0,
                            borderSkipped: false,
                            borderRadius: { topLeft: 6, topRight: 6 },
                            maxBarThickness: 96
                        }]
                    },
                    options: {
                        animation: {
                            duration: 700,
                            easing: 'easeOutQuart',
                            onStart(anim) { anim.chart._animatingLabels = true; },
                            onComplete(anim) { anim.chart._animatingLabels = false; anim.chart.draw(); }
                        },
                        transitions: {
                            active: { animation: { duration: 0 } }
                        },
                        responsive: true,
                        maintainAspectRatio: false,
                        layout: { padding: { top: 20, right: 44 } },
                        onClick: (evt, elements) => {
                            if (!elements || !elements.length) return;
                            const idx = elements[0].index;
                            const clickedRegion = chartRegions[idx];
                            showComplianceGapModal(clickedRegion, state.complianceView || 0); // read live view at click time — chart is reused on month change, so a captured _rcv goes stale
                        },
                        onHover: (evt, elements) => {
                            evt.native.target.style.cursor = elements.length ? 'pointer' : 'default';
                        },
                        plugins: {
                            legend: { display: false },
                            tooltip: { enabled: false, 
                                backgroundColor: 'rgba(0,0,0,0.8)', padding: 12, cornerRadius: 8,
                                callbacks: { title: (i) => chartRegions[i[0].dataIndex], label: (i) => ` ${i.raw !== null ? i.raw : '—'}% compliance` }
                            }
                        },
                        scales: {
                            y: { beginAtZero: true, max: 100, grid: { color: function () { return document.body.classList.contains('dark-mode') ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'; } } },
                            x: { grid: { display: false }, ticks: { maxRotation: 0, minRotation: 0, autoSkip: false, font: { size: 12, weight: '600' } } }
                        }
                    },
                    plugins: [_rcThresholdPlugin]
                });
            }, 100);
        };

        // ── Lightweight compliance card updater — avoids full re-render on prev/next ──
        window.renderComplianceCardOnly = function() {
            // 1. Recompute label + value
            const _MC_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
            const _mcNow = new Date();
            const _mcSelYear = state.selectedYear || _mcNow.getFullYear();
            const _mcCurYear = _mcNow.getFullYear();
            const _mcCurMonth = _mcNow.getMonth() + 1;
            const _mcMaxMonth = (_mcSelYear === _mcCurYear) ? (_mcCurMonth > 1 ? _mcCurMonth - 1 : 12) : 12; // show up to previous month only — current month data incomplete
            const _mcCv = state.complianceView || 0;

            // Compute overallAvg inline
            const _cpProjects = state.projects.filter(p =>
                p.region !== 'CORPORATE' && p.region !== 'PLANT OPERATIONS' && !isProjectOnStoppage(p) && !p.dateFinished
            );
            let _gTotal = 0, _gCount = 0;
            _cpProjects.forEach(p => { const v = getPerc(p); if (v !== null) { _gTotal += v; _gCount++; } });
            const _overallAvg = getCompanyOverallCompliance();

            let _mcLabel, _mcValue;
            if (_mcCv === 0) {
                _mcLabel = 'OVERALL COMPLIANCE';
                _mcValue = _overallAvg + '%';
            } else {
                _mcLabel = _MC_MONTHS[_mcCv - 1].toUpperCase() + ' COMPLIANCE';
                const _mv = getMonthlyCompliance(_mcCv);
                _mcValue = _mv !== null ? _mv + '%' : '—';
            }

            // 2. Update the compliance stat-card DOM (2nd card in #grand-stats)
            const _grandStats = document.getElementById('grand-stats');
            if (_grandStats) {
                const _compCard = _grandStats.querySelectorAll('.stat-card')[1];
                if (_compCard) {
                    const _lbl = _compCard.querySelector('.stat-label');
                    const _val = _compCard.querySelector('.stat-value');
                    if (_lbl) _lbl.textContent = _mcLabel;
                    if (_val) _val.textContent = _mcValue;
                    let _mcSub2 = '';
                    if (_mcCv >= 2) {
                        const _tCur = getMonthlyCompliance(_mcCv), _tPrv = getMonthlyCompliance(_mcCv - 1);
                        if (_tCur !== null && _tCur !== undefined && _tPrv !== null && _tPrv !== undefined) {
                            const _tD = Number(_tCur) - Number(_tPrv);
                            const _tMon = _MC_MONTHS[_mcCv - 2].slice(0, 3);
                            _mcSub2 = _tD === 0 ? 'No change vs ' + _tMon : (_tD > 0 ? '\u25B2 +' : '\u25BC ') + _tD + '% vs ' + _tMon;
                        }
                    }
                    const _subEl = _compCard.querySelector('.stat-sub');
                    if (_subEl) _subEl.textContent = _mcSub2;

                    // Rebuild dots + nav
                    let _mcDots = '';
                    for (let _di = 0; _di <= _mcMaxMonth; _di++) {
                        const _active = _di === _mcCv;
                        const _tip = _di === 0 ? 'Overall' : _MC_MONTHS[_di-1].slice(0,3);
                        _mcDots += '<span title="' + _tip + '" onclick="state.complianceView=' + _di + ';renderComplianceCardOnly();" style="' +
                            'display:inline-block;width:' + (_active?'10':'7') + 'px;height:' + (_active?'10':'7') + 'px;' +
                            'border-radius:50%;background:' + (_active?'#fbc02d':'#ccc') + ';' +
                            'cursor:pointer;margin:0 1px;flex-shrink:0;vertical-align:middle;' +
                            'transition:all 0.15s;border:' + (_active?'1.5px solid #e5a800':'1px solid #bbb') + ';' +
                        '"></span>';
                    }
                    _mcDots = '<span class="stat-nav-label" style="border:none;box-shadow:none;outline:none;">' + (_mcCv === 0 ? 'Overall' : _MC_MONTHS[_mcCv - 1].slice(0, 3)) + '</span>';
                    const _mcPrevOk = _mcCv > 0;
                    const _mcNextOk = _mcCv < _mcMaxMonth;
                    const _mcPrevBtn = '<span onclick="' + (_mcPrevOk ? 'state.complianceView=' + (_mcCv-1) + ';renderComplianceCardOnly();' : '') + '" style="' +
                        'cursor:' + (_mcPrevOk?'pointer':'default') + ';color:' + (_mcPrevOk?'#555':'#ccc') + ';' +
                        'font-size:1.1rem;font-weight:700;padding:0 4px;user-select:none;">&#8249;</span>';
                    const _mcNextBtn = '<span onclick="' + (_mcNextOk ? 'state.complianceView=' + (_mcCv+1) + ';renderComplianceCardOnly();' : '') + '" style="' +
                        'cursor:' + (_mcNextOk?'pointer':'default') + ';color:' + (_mcNextOk?'#555':'#ccc') + ';' +
                        'font-size:1.1rem;font-weight:700;padding:0 4px;user-select:none;">&#8250;</span>';

                    const _navRow = _compCard.querySelector('div[style*="display:flex"]') || _compCard.lastElementChild;
                    if (_navRow) {
                        _navRow.innerHTML = _mcPrevBtn +
                            '<div style="display:inline-flex;flex-wrap:nowrap;justify-content:center;align-items:center;gap:2px;">' + _mcDots + '</div>' +
                            _mcNextBtn;
                    }
                }
            }

            // 3. Only re-render the region bar chart — statusChart stays untouched
            renderRegionChartOnly();

            // 4. Re-render the gap analysis section
            if (typeof window.renderGapSectionOnly === 'function') window.renderGapSectionOnly();
        };

        // ── Compliance gap panel ───────────────────────────────────────────────
        // Markup only. Every color, size and font lives in styles.css (.cga-*).
        window.cgaStatus = function(p) { return p >= 90 ? 'ok' : p >= 70 ? 'warn' : 'bad'; };
        window.cgaNavBtn = function(ok, dir, action) {
            return '<span class="cga-nav' + (ok ? '' : ' is-off') + '"' + (ok ? ' onclick="' + action + '"' : '') +
                   ' title="' + (dir === 'prev' ? 'Previous month' : 'Next month') + '">' +
                   (dir === 'prev' ? '&#8249;' : '&#8250;') + '</span>';
        };
        window.cgaHeaderHtml = function(moName, selYear, prevBtn, nextBtn) {
            return '<div class="cga-head">' +
                '<div class="cga-head-left">' +
                    '<i class="fas fa-magnifying-glass-chart cga-icon"></i>' +
                    '<div>' +
                        '<div class="cga-title">Monthly Compliance Gap Analysis</div>' +
                        '<div class="cga-sub">Detected gaps for <strong>' + moName + ' ' + selYear + '</strong> — areas that reduced compliance below 100%. Click a region or area for the full breakdown.</div>' +
                    '</div>' +
                '</div>' +
                '<div class="cga-month">' + prevBtn + '<span class="cga-month-label">' + moName + ' ' + selYear + '</span>' + nextBtn + '</div>' +
            '</div>' +
            '<div class="cga-legend">' +
                '<span><i class="cga-dot cga-bar-ok"></i>90% and above</span>' +
                '<span><i class="cga-dot cga-bar-warn"></i>70% to 89%</span>' +
                '<span><i class="cga-dot cga-bar-bad"></i>Below 70%</span>' +
            '</div>';
        };
        window.cgaBodyHtml = function(regGaps, selMonth, moName, selYear, detailLabels) {
            if (regGaps.length === 0) {
                return '<div class="cga-grid"><div class="cga-empty"><i class="fas fa-circle-check"></i>No gaps detected for ' + moName + ' ' + selYear + '.</div></div>';
            }
            var maxRows = Math.max.apply(null, regGaps.map(function (r) { return r.gaps.length; }));
            var out = '<div class="cga-grid">';
            regGaps.forEach(function (r) {
                var region = r.region, score = r.score, gaps = r.gaps;
                var regionSafe = region.replace(/'/g, "\\'");
                var rows = '';
                if (gaps.length === 0) {
                    rows = '<div class="cga-done"><i class="fas fa-circle-check"></i> All compliance areas complete!</div>';
                } else {
                    gaps.forEach(function (g) {
                        var pct = Math.round(g.rate * 100);
                        var focus = ((detailLabels && detailLabels[g.key]) || g.label).replace(/'/g, "\\'");
                        rows += '<div class="cga-item cga-' + cgaStatus(pct) + '" onclick="event.stopPropagation();showComplianceGapModal(\'' + regionSafe + '\', ' + selMonth + ', \'' + focus + '\');" title="Click to see which projects/fields are missing">' +
                                    '<div class="cga-line"><span>' + g.label + '</span><span class="cga-count"><b>' + g.missing + '</b> missing / ' + g.total + '</span></div>' +
                                    '<div class="cga-track"><div class="cga-fill cga-bar-' + cgaStatus(pct) + '" style="width:' + pct + '%"></div></div>' +
                                '</div>';
                    });
                    if (gaps.length < maxRows) rows += '<div class="cga-clear">No other gaps this month</div>';
                }
                out += '<div class="cga-card cga-' + cgaStatus(score) + '" onclick="showComplianceGapModal(\'' + regionSafe + '\', ' + selMonth + ');" title="Click for full compliance breakdown">' +
                           '<div class="cga-top"><span class="cga-region">' + region + ' <i class="fas fa-circle-info cga-info"></i></span><span class="cga-pill">' + score + '%</span></div>' +
                           rows +
                       '</div>';
            });
            return out + '</div>';
        };

        // ── renderGapSectionOnly: re-renders just the gap analysis container ──
        window.renderGapSectionOnly = function() {
            const _gapWrap = document.getElementById('compliance-gap-section');
            if (!_gapWrap) return;

            const _KPM_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
            const _TARGET_REGS = ['NCR','SOUTH LUZON','NORTH LUZON','VISAYAS & MINDANAO'];
            const _AREA_LABELS = {
                kpm:            'KPM Submission',
                dole:           'DOLE Reportorial',
                got:            'GOT Monitoring',
                eshCal:         'ESH Calendar',
                emDrills:       'Emergency Drills',
                emr:            'Environmental Report (EMR)',
            };
            // Maps this table's short area keys to the exact area labels used inside
            // the detail modal (getComplianceGapDetails), so a row click can jump straight to it.
            const _GAP_KEY_TO_DETAIL_LABEL = {
                kpm:            'KPM Report',
                dole:           'DOLE Reportorial',
                got:            'GOT Monitoring',
                eshCal:         'ESH Calendar',
                emDrills:       'Emergency Drills',
                emr:            'Environmental Monthly Report',
            };

            const _mcNow = new Date();
            const _mcSelYear = state.selectedYear || _mcNow.getFullYear();
            const _mcCurYear = _mcNow.getFullYear();
            const _mcCurMonth = _mcNow.getMonth() + 1;
            const _mcMaxMonth = (_mcSelYear === _mcCurYear) ? (_mcCurMonth > 1 ? _mcCurMonth - 1 : 12) : 12;
            const _cv = state.complianceView || 0;

            // When Overall is selected, show gap analysis for the latest available month
            const selMonth = _cv === 0 ? _mcMaxMonth : _cv;
            _gapWrap.style.display = 'block';
            const moName   = _KPM_MONTHS[selMonth - 1];
            const selYear  = _mcSelYear;
            const mi       = selMonth - 1;
            const _calStor = (typeof getEshStorage === 'function') ? getEshStorage() : {};
            const _ESH_DEF_ROWS   = (typeof ESH_TRAININGS !== 'undefined') ? ESH_TRAININGS : {};
            const _ESH_DRILLS_LIST = (typeof ESH_DRILLS !== 'undefined') ? ESH_DRILLS : [];

            const _prevOk = _cv > 1;
            const _nextOk = _cv < _mcMaxMonth;

            const _prevAction = _prevOk ? 'state.complianceView=' + (_cv - 1) + ';renderComplianceCardOnly();' : '';
            const _nextAction = _nextOk ? 'state.complianceView=' + (_cv + 1) + ';renderComplianceCardOnly();' : '';
            const _prevBtn = cgaNavBtn(_prevOk, 'prev', _prevAction);
            const _nextBtn = cgaNavBtn(_nextOk, 'next', _nextAction);

            const regGaps = _TARGET_REGS.map(region => {
                const projects = (state.projects || []).filter(p =>
                    p.region === region &&
                    !isProjectOnStoppage(p) &&
                    !isProjectFinishedForMonth(p, selMonth, selYear) &&
                    !isMonthBlacklistedForProject(p, selMonth, selYear)
                );
                if (projects.length === 0) return null;

                const acc = {
                    kpm:{f:0,t:0}, dole:{f:0,t:0},
                    got:{f:0,t:0}, eshCal:{f:0,t:0}, emDrills:{f:0,t:0}, emr:{f:0,t:0}
                };

                projects.forEach(proj => {
                    const vals = proj.vals || {};

                    // Area 1 (Drills & Training) — removed, see getPerc comment for why. Now covered by
                    // "ESH Calendar" (eshCal, per-training-topic) and "Emergency Drills" (emDrills, per-drill).

                    // Area 2 – KPM
                    if (!(vals && vals['kpm_na'] === '1')) {
                        acc.kpm.t++;
                        const _dateKey = 'kpm_v3_' + moName + '_dateSubmitted';
                        // Region-wide submission is stored on a single project — don't filter peers
                        // by their own blacklist status, or a frozen holder-project hides the date
                        // from the whole region.
                        const _peers = (state.projects || []).filter(p =>
                            !(p.vals && p.vals['kpm_na'] === '1') &&
                            (p.region || '').toUpperCase() === region
                        );
                        if (_peers.some(p => { const v = p.vals && p.vals[_dateKey]; return v && v.toString().trim() !== ''; }) && window.kpmProjectFillStatus(proj, moName).complete) acc.kpm.f++;
                    }

                    // Area 3 – DOLE
                    acc.dole.t++;
                    const _doleAllFilled = ['dole_WAIR','dole_RSO','dole_MOM'].every(key => {
                        const v = vals[key] && vals[key][selMonth];
                        return v !== undefined && v !== null && v !== '' && v !== '0';
                    });
                    if (_doleAllFilled) acc.dole.f++;

                    // Area 4 – GOT
                    if (typeof window.gotGetCell === 'function') {
                        acc.got.t++;
                        const _gotAllFilled = ['E1','E2','E3','S1','S2','S3'].every(goalId => {
                            const _gotVal = window.gotGetCell(proj, goalId, 0, selMonth).r;
                            return _gotVal && _gotVal.toString().trim() !== '';
                        });
                        if (_gotAllFilled) acc.got.f++;
                    }

                    // Area 5 – ESH Calendar (only topics PLANNED for this month count as required)
                    ['esh-calendar-env','esh-calendar-safety','esh-calendar-health'].forEach(tt => {
                        const rows = _ESH_DEF_ROWS[tt] || [];
                        rows.forEach((_, ti) => {
                            const naRowKey = `${selYear}|${tt}|${proj.name}|${ti}|na_row`;
                            const naFrom   = _calStor[naRowKey] !== undefined ? parseInt(_calStor[naRowKey]) : -1;
                            if (naFrom >= 0 && mi >= naFrom) return;
                            const planKey = `${selYear}|${tt}|GLOBAL_PLAN|${ti}|${mi}|plan`;
                            if (!_calStor[planKey]) return; // not planned this month — not required
                            acc.eshCal.t++;
                            const actualKey = `${selYear}|${tt}|${proj.name}|${ti}|${mi}|actual`;
                            if (_calStor[actualKey] && _calStor[actualKey] !== '') acc.eshCal.f++;
                        });
                    });

                    // Area 6 – Emergency Drills
                    _ESH_DRILLS_LIST.forEach((drill, di) => {
                        const _si = (typeof getDrillStorageIdx === 'function') ? getDrillStorageIdx(drill, di) : (drill.id !== undefined ? drill.id : di);
                        const planKey = `${selYear}|esh-calendar-drills|GLOBAL_PLAN|${_si}|${mi}|plan`;
                        if (!_calStor[planKey] || _calStor[planKey] === '__DELETED__') return;
                        const naCellKey = `${selYear}|esh-calendar-drills|${proj.name}|${_si}|${mi}|na`;
                        if (_calStor[naCellKey]) return;
                        acc.emDrills.t++;
                        const actualKey = `${selYear}|esh-calendar-drills|${proj.name}|${_si}|${mi}|actual`;
                        if (_calStor[actualKey] && _calStor[actualKey] !== '' && _calStor[actualKey] !== '__DELETED__') acc.emDrills.f++;
                    });

                    // Area 7 – EMR
                    acc.emr.t++;
                    const _emrVal = vals['env-monthly-report_Environmental Monthly Report (EMR)'] && vals['env-monthly-report_Environmental Monthly Report (EMR)'][selMonth];
                    if (_emrVal && _emrVal.toString().trim() !== '') acc.emr.f++;
                });

                const gaps = [];
                Object.entries(acc).forEach(([key, {f, t}]) => {
                    if (t === 0) return;
                    const rate = f / t;
                    if (rate < 1) gaps.push({ key, label: _AREA_LABELS[key], rate, missing: t - f, total: t });
                });
                gaps.sort((a, b) => a.rate - b.rate);

                const score = getMonthlyComplianceByRegion(selMonth, region);
                return { region, score, gaps, projCount: projects.length };
            }).filter(r => r !== null && r.score !== null && r.projCount > 0);

            _gapWrap.innerHTML = cgaHeaderHtml(moName, selYear, _prevBtn, _nextBtn) + cgaBodyHtml(regGaps, selMonth, moName, selYear, _GAP_KEY_TO_DETAIL_LABEL);
        };
        // ── End renderGapSectionOnly ──────────────────────────────────────────

        // ── render() registry: tabs that draw into their own container and skip the generic table builder ──
        const TAB_RENDERERS = {
            'lta-registry':    () => { if (typeof renderLtaRegistryTab === 'function') renderLtaRegistryTab(); },
            'headlines':       () => {
                if (typeof initSafetyAlertAwardListeners === 'function') initSafetyAlertAwardListeners();
                if (typeof renderSafetyAlertAwardPanel === 'function') renderSafetyAlertAwardPanel();
            },
            'safety-alerts':   () => {
                if (typeof initSafetyAlertAwardListeners === 'function') initSafetyAlertAwardListeners();
                if (typeof renderSafetyAlertsPage === 'function') renderSafetyAlertsPage();
            },
            'corporate-kpm':   () => { if (typeof window.renderCorporateKpm === 'function') window.renderCorporateKpm(); },
            'personnel':       () => { if (typeof renderPTable === 'function') renderPTable(); },
            'got-monitoring':  () => { if (window.renderGotMonitoring) window.renderGotMonitoring(); },
            'osh-requirement': () => { if (typeof renderOsh2 === 'function') renderOsh2(); },
            'nov':             () => { if (typeof renderOshNovTab === 'function') renderOshNovTab(); },
            'env-monitoring':  () => { if (typeof envRender === 'function') envRender(); },
            'settings':        () => {}
        };
