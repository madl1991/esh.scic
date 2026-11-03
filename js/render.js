
        function render() {
            // Always preserve scroll position — prevents view jumping on edit/save/input
            const _renderMc = document.getElementById('main-content');
            const _renderScroll = _renderMc ? _renderMc.scrollTop : 0;
            try {
            // Universal Excel button visibility (mirrors changeTab logic)
            const _rxNoRoles  = ['superintendent','pco','corp_nurse'];
            const _rxNoTabs   = ['settings'];
            const _rxPersonOk = (state.currentTab !== 'personnel') || (state.isAdmin || state.userRole === 'manager');
            const _rxShowXl   = !_rxNoRoles.includes(state.userRole) && !_rxNoTabs.includes(state.currentTab) && _rxPersonOk;
            const _rxUniBtn   = document.getElementById('export-excel-btn');
            if (_rxUniBtn) _rxUniBtn.style.display = _rxShowXl ? 'inline-block' : 'none';
            const _eshCalTabs = ['esh-calendar-env','esh-calendar-safety','esh-calendar-health','esh-calendar-drills','esh-calendar-corp-drills'];

            // Tabs with their own container / dedicated renderer (see TAB_RENDERERS above render())
            const _tabRenderer = TAB_RENDERERS[state.currentTab];
            if (_tabRenderer) { _tabRenderer(); return; }
            if (_eshCalTabs.includes(state.currentTab)) return;

            const auditNavLock = document.getElementById('audit-nav-lock');
            if (auditNavLock) auditNavLock.style.display = (state.isAdmin || state.userRole === 'pco') ? 'none' : 'inline';

            const container = document.getElementById('dashboard-content');
            let html = '';
            window._pendingTableHeader = null;
            window._pendingTableFooter = null;

            if (state.currentTab === 'rates') {
                html += buildIncidentTabulationHTML();
                html += buildTrendChartHTML('rates');
                html += buildIncidentRecommendationsHTML('rates');
            }

            const complianceProjects = state.projects.filter(p =>
                p.region !== 'CORPORATE' && p.region !== 'PLANT OPERATIONS' && !isProjectOnStoppage(p) && !p.dateFinished
            );
            let grandTotal = 0, grandCount = 0;
            complianceProjects.forEach(p => {
                const perc = getPerc(p);
                if (perc !== null) { grandTotal += perc; grandCount++; }
            });
            const overallAvg = getCompanyOverallCompliance();

            if (state.currentTab === 'overall') {
                html += `
                <div style="margin: 0 20px 10px;">
                    <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                        <div style="flex: 1; min-width: 250px;">
                            <input type="text" id="search-input" placeholder="Search projects..."
                                   autocomplete="off"
                                   oninput="handleSearch(); osShowSearchDropdown(this.value, this)"
                                   onkeyup=""
                                   value="${state.searchTerm || ''}"
                                   style="width: 100%; padding: 6px 12px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.85rem; background: var(--input-bg); color: var(--text-primary); box-sizing: border-box;">
                        </div>
                    </div>
                </div>
                `;
                
                // ── Build monthly compliance card ────────────────────────────────
                const _MC_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
                const _mcNow = new Date();
                const _mcSelYear = state.selectedYear || _mcNow.getFullYear();
                const _mcCurYear = _mcNow.getFullYear();
                const _mcCurMonth = _mcNow.getMonth() + 1; // 1-based
                const _mcMaxMonth = (_mcSelYear === _mcCurYear) ? (_mcCurMonth > 1 ? _mcCurMonth - 1 : 12) : 12; // show up to previous month only — current month data incomplete
                const _mcCv = state.complianceView || 0; // 0=overall, 1-12=month

                let _mcLabel, _mcValue;
                if (_mcCv === 0) {
                    _mcLabel = 'OVERALL COMPLIANCE';
                    _mcValue = overallAvg + '%';
                } else {
                    _mcLabel = _MC_MONTHS[_mcCv - 1].toUpperCase() + ' COMPLIANCE';
                    const _mv = getMonthlyCompliance(_mcCv);
                    _mcValue = _mv !== null ? _mv + '%' : '—';
                }

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

                let _mcSub = '';
                if (_mcCv >= 2) {
                    const _sCur = getMonthlyCompliance(_mcCv), _sPrv = getMonthlyCompliance(_mcCv - 1);
                    if (_sCur !== null && _sCur !== undefined && _sPrv !== null && _sPrv !== undefined) {
                        const _sD = Number(_sCur) - Number(_sPrv);
                        const _sMon = _MC_MONTHS[_mcCv - 2].slice(0, 3);
                        _mcSub = _sD === 0 ? 'No change vs ' + _sMon : (_sD > 0 ? '\u25B2 +' : '\u25BC ') + _sD + '% vs ' + _sMon;
                    }
                }
                const _kpiTotalN = getReportingProjects().length;
                const _kpiOngoingN = complianceProjects.filter(p => p.status === 'on-going').length;
                const _kpiOngoingSub = _kpiTotalN > 0 ? Math.round(_kpiOngoingN / _kpiTotalN * 100) + '% of all projects' : '';

                html += `<div id="grand-stats">
                    <div class="stat-card">
                        <div class="stat-label">TOTAL PROJECTS</div>
                        <div class="stat-value">${getReportingProjects().length}</div>
                    </div>
                    <div class="stat-card" style="border-left-color: var(--safety-yellow); min-width:160px;">
                        <div class="stat-label" style="margin-bottom:2px;">${_mcLabel}</div>
                        <div class="stat-value">${_mcValue}</div>
                        <div class="stat-sub">${_mcSub}</div>
                        <div class="stat-nav" style="display:flex;align-items:center;justify-content:center;margin-top:6px;gap:0;border:none;box-shadow:none;outline:none;">
                            ${_mcPrevBtn}
                            <div style="display:inline-flex;flex-wrap:nowrap;justify-content:center;align-items:center;gap:2px;">${_mcDots}</div>
                            ${_mcNextBtn}
                        </div>
                    </div>
                    <div class="stat-card" style="border-left-color: #1976D2;">
                        <div class="stat-label">${getStatusLabel('on-going')}</div>
                        <div class="stat-value">${_kpiOngoingN}</div>
                        <div class="stat-sub">${_kpiOngoingSub}</div>
                    </div>
                    <div class="stat-card" style="border-left-color: #d32f2f;">
                        <div class="stat-label">${getStatusLabel('work-stoppage')}</div>
                        <div class="stat-value">${state.projects.filter(p => p.region !== 'CORPORATE' && p.region !== 'PLANT OPERATIONS' && p.status === 'work-stoppage').length}</div>
                    </div>
                </div>
                <div class="charts-container">
                    <div class="chart-box"><h3><i class="fas fa-chart-bar"></i> Compliance by Region <span class="cb-hint"><i class="fas fa-hand-pointer"></i> click a bar to see what's missing</span></h3><canvas id="regionChart"></canvas></div>
                    <div class="chart-box"><h3><i class="fas fa-chart-pie"></i> Project Status</h3><div class="chart-wrap-fixed"><canvas id="statusChart"></canvas></div></div>
                </div>
                `;

                // ── Compliance Gap Detector ──────────────────────────────────────────
                (function buildComplianceGapDetector() {
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
                    const _GAP_KEY_TO_DETAIL_LABEL = {
                        kpm:            'KPM Report',
                        dole:           'DOLE Reportorial',
                        got:            'GOT Monitoring',
                        eshCal:         'ESH Calendar',
                        emDrills:       'Emergency Drills',
                        emr:            'Environmental Monthly Report',
                    };

                    const _cv = state.complianceView || 0;
                    // When Overall is selected, show gap analysis for the latest available month
                    const selMonth = _cv === 0 ? _mcMaxMonth : _cv;
                    const moName   = _KPM_MONTHS[selMonth - 1];
                    const mi       = selMonth - 1;
                    const selYear  = state.selectedYear || new Date().getFullYear();
                    const _calStor = (typeof getEshStorage === 'function') ? getEshStorage() : {};
                    const _ESH_DEF_ROWS   = (typeof ESH_TRAININGS !== 'undefined') ? ESH_TRAININGS : {};
                    const _ESH_DRILLS_LIST = (typeof ESH_DRILLS !== 'undefined') ? ESH_DRILLS : [];

                    const regGaps = _TARGET_REGS.map(region => {
                        const projects = (state.projects || []).filter(p =>
                            p.region === region &&
                            !isProjectOnStoppage(p) &&
                            !isProjectFinishedForMonth(p, selMonth, selYear) &&
                            !isMonthBlacklistedForProject(p, selMonth, selYear)
                        );
                        if (projects.length === 0) return null;

                        const acc = {
                            kpm:            { f:0, t:0 },
                            dole:           { f:0, t:0 },
                            got:            { f:0, t:0 },
                            eshCal:         { f:0, t:0 },
                            emDrills:       { f:0, t:0 },
                            emr:            { f:0, t:0 },
                        };

                        projects.forEach(proj => {
                            const vals = proj.vals || {};

                            // Area 1 (Drills & Training) — removed, see getPerc comment for why. Now
                            // covered by "eshCal" (per-training-topic) and "emDrills" (per-drill).

                            // Area 2 – KPM
                            if (!(vals && vals['kpm_na'] === '1')) {
                                acc.kpm.t++;
                                const _dateKey = 'kpm_v3_' + moName + '_dateSubmitted';
                                // Region-wide submission is stored on a single project — don't filter
                                // peers by their own blacklist status, or a frozen holder-project hides
                                // the date from the whole region.
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

                    if (regGaps.length === 0) return;

                    const _gNavPrevOk = selMonth > 1;
                    const _gNavNextOk = selMonth < _mcMaxMonth;
                    const _gNavPrevAction = _gNavPrevOk ? 'state.complianceView=' + (selMonth - 1) + ';renderComplianceCardOnly();' : '';
                    const _gNavNextAction = _gNavNextOk ? 'state.complianceView=' + (selMonth + 1) + ';renderComplianceCardOnly();' : '';

                    html += '<div id="compliance-gap-section">' +
                        cgaHeaderHtml(moName, selYear, cgaNavBtn(_gNavPrevOk, 'prev', _gNavPrevAction), cgaNavBtn(_gNavNextOk, 'next', _gNavNextAction)) +
                        cgaBodyHtml(regGaps, selMonth, moName, selYear, _GAP_KEY_TO_DETAIL_LABEL) +
                        '</div>';
                })();
                // ── End Compliance Gap Detector ──────────────────────────────────────

                renderCharts();
            }

            const displayProjects = state.filteredProjects;

            if (state.currentTab === 'activities' && typeof syncIncidentClassificationsFromRegistry === 'function') syncIncidentClassificationsFromRegistry();
            if (state.currentTab === 'medical') {
                if (typeof syncIncidentClassificationsFromRegistry === 'function') syncIncidentClassificationsFromRegistry();
                if (typeof syncDaysLostFromLtaRegistry === 'function') syncDaysLostFromLtaRegistry();
                html += buildTrendChartHTML('medical');
                html += buildIncidentRecommendationsHTML('medical');
            }

            if (['exposures', 'medical', 'activities', 'nov'].includes(state.currentTab) && displayProjects.length > 0) {
                const hasYTD = ['exposures', 'medical', 'activities', 'nov'].includes(state.currentTab);
                const isNov = state.currentTab === 'nov';
                const _rptSum = ['exposures', 'activities', 'medical'].includes(state.currentTab);
                const _rptNowIdx = ((state.selectedYear || new Date().getFullYear()) === new Date().getFullYear()) ? new Date().getMonth() : -1;
                if (_rptSum) {
                    window.rptSumInjectCss();
                    html += `<div class="rpt-wrap rpt-sum" style="margin:0 16px 20px;">
                        ${window.rptBar({ title: 'OVERALL SUMMARY', sub: 'Consolidated data from all projects across all regions' })}
                        <div class="rpt-card"><div class="rpt-scroll"><table class="env-tbl rpt-table" style="margin:0;">
                        <thead><tr>
                            <th class="first">TYPE</th>
                            <th class="prev-year">PREVIOUS</th>`;
                } else {
                html += `
                    <div style="margin: 0 20px 20px;">
                        <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 14px;background:#2e7d32;border-radius:6px 6px 0 0;position:sticky;top:0;z-index:20;">
                            <div>
                                <div style="font-size:0.85rem;font-weight:800;color:white;letter-spacing:0.05em;">🌐 OVERALL SUMMARY</div>
                                <div style="font-size:0.68rem;color:rgba(255,255,255,0.8);margin-top:1px;">Consolidated data from all projects across all regions</div>
                            </div>
                            <div style="display:flex;gap:6px;">
                                <span style="background:rgba(255,255,255,0.18);color:white;border:1px solid rgba(255,255,255,0.35);border-radius:20px;padding:2px 10px;font-size:0.62rem;font-weight:800;">${displayProjects.length} PROJECTS</span>
                                <span style="background:rgba(255,255,255,0.18);color:white;border:1px solid rgba(255,255,255,0.35);border-radius:20px;padding:2px 10px;font-size:0.62rem;font-weight:800;">ALL REGIONS</span>
                            </div>
                        </div>
                        <div style="overflow-x:auto;border:none;border-radius:0 0 6px 6px;"><table class="env-tbl" style="margin:0;">
                            <tr>
                                <th class="env-th-left env-th-sticky env-th-dark" style="width:250px;">TYPE</th>
                                <th class="prev-year${isNov ? ' nov-narrow-th' : ''}" style="background:#e65100;color:white;">PREVIOUS</th>`;
}
                
                MONTHS.forEach((m, _mhi) => {
                    html += `<th${isNov ? ' class="nov-narrow-th"' : (_rptSum && _rptNowIdx === _mhi ? ' class="now"' : '')}>${m}</th>`;
                });
                
                if (hasYTD) {
                    html += _rptSum ? `<th class="ytd-header avg">RUNNING YTD</th>` : `<th class="ytd-header" style="background:#f9a825;color:#1b5e20;font-weight:800;">RUNNING YTD</th>`;
                }
                
                html += _rptSum ? `</tr></thead><tbody>` : `</tr>`;
                
                // Accident/Incident Record only: hover on a summary cell lists the projects behind the number (one line per project)
                const _osTipAttr = (list) => {
                    if (state.currentTab !== 'medical') return '';
                    const _esc = (t) => String(t == null ? '' : t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
                    const lines = list.filter(e => e.v > 0).map(e => _esc(e.n) + ': ' + fmtNum(e.v));
                    return lines.length ? ' title="' + lines.join('&#10;') + '" data-tip-nowrap' : '';
                };

                SCHEMA[state.currentTab].forEach((row, rowIdx) => {
                    const key = (row === 'No. of Identified Near-Miss') ? 'medical_' + row : `${state.currentTab}_${row}`;
                    const _lblShort = (state.currentTab === 'exposures' && row === 'Total Exposed Man-hour to date') ? 'Exp. Man-hour to date' : row;
                    const _lblTip = String(row).replace(/"/g, '&quot;');
                    html += `<tr><td title="${_lblTip}" style="text-align:left; font-weight:700; background:#e8f5e9; position: sticky; left: 0; z-index: 5;${state.currentTab === 'exposures' ? ' white-space:nowrap;' : ''}">${_lblShort}</td>`;
                    
                    let prevTotal = 0;
                    const _prevList = [];
                    displayProjects.forEach(p => {
                        const val = p.vals[key] ? (p.vals[key][0] ?? "") : "";
                        if (val !== "" && !isNaN(val)) { prevTotal += parseFloat(val); _prevList.push({ n: p.name, v: parseFloat(val) }); }
                    });
                    html += `<td class="prev-year${isNov ? ' nov-narrow-td' : ''}" style="font-weight: 700; font-size: 0.7rem;" ${state.currentTab === 'exposures' ? `data-expsummary-key="${key.replace(/"/g,'&quot;')}" data-expsummary-col="0"` : ''}${prevTotal > 0 ? _osTipAttr(_prevList) : ''}>${prevTotal > 0 ? fmtNum(prevTotal) : ''}</td>`;
                    
                    for (let i = 1; i <= 12; i++) {
                        let monthTotal = 0;
                        const mi = i - 1; // 0-based month index for ESH calendar
                        if (state.currentTab === 'activities' && (row === 'Drills Conducted' || row === 'Training Conducted')) {
                            const eshStor = getEshStorage();
                            const _eshYear1 = state.selectedYear || new Date().getFullYear();
                            displayProjects.forEach(p => {
                                if (row === 'Drills Conducted') {
                                    ESH_DRILLS.forEach((drill, di) => {
                                        const _dsi1 = getDrillStorageIdx(drill, di);
                                        const _ny1 = (state&&state.selectedYear)||2026; const naCellKey1 = `${_ny1}|esh-calendar-drills|${p.name}|${_dsi1}|${mi}|na`;
                                        if (eshStor[naCellKey1]) return; // skip N/A cells
                                        const ak = `${_eshYear1}|esh-calendar-drills|${p.name}|${_dsi1}|${mi}|actual`;
                                        if (eshStor[ak] && eshStor[`${_eshYear1}|esh-calendar-drills|GLOBAL_PLAN|${_dsi1}|${mi}|plan`]) monthTotal++;
                                    });
                                    // ── CORPORATE Drills: also count corp-drills actuals for CORPORATE project ──
                                    if (p.region === 'CORPORATE') {
                                        const _corpBase1 = window.CORP_DRILLS || [];
                                        const _corpCustom1 = (typeof getCorpDrillCustomRows === 'function') ? getCorpDrillCustomRows() : [];
                                        _corpBase1.forEach((_cd1, _cdi1) => {
                                            const _cak1 = `${_eshYear1}|esh-calendar-corp-drills|${p.name}|${_cdi1}|${mi}|actual`;
                                            if (eshStor[_cak1] && eshStor[`${_eshYear1}|esh-calendar-corp-drills|GLOBAL_PLAN|${_cdi1}|${mi}|plan`]) monthTotal++;
                                        });
                                        _corpCustom1.forEach((_ccr1, _cci1) => {
                                            const _cak1c = `${_eshYear1}|esh-calendar-corp-drills|${p.name}|${1000 + _cci1}|${mi}|actual`;
                                            if (eshStor[_cak1c] && eshStor[`${_eshYear1}|esh-calendar-corp-drills|GLOBAL_PLAN|${1000 + _cci1}|${mi}|plan`]) monthTotal++;
                                        });
                                    }
                                } else {
                                    // ── CORPORATE Training Conducted: read from manually entered vals ──
                                    if (p.region === 'CORPORATE') {
                                        const _mIdx1 = mi + 1; // vals array is 1-based
                                        monthTotal += parseFloat(p.vals[key] ? (p.vals[key][_mIdx1] ?? '') : '') || 0;
                                    } else {
                                        const _8HR_LABEL1 = '8-Hr Mandatory OSH Training';
                                        ['esh-calendar-env','esh-calendar-safety','esh-calendar-health'].forEach(tt => {
                                            (ESH_TRAININGS[tt] || []).forEach((tr, ti) => {
                                                // Skip 8-Hr OSH N/A months
                                                if (tr === _8HR_LABEL1) {
                                                    const _naK1 = `${_eshYear1}|${tt}|${p.name}|${ti}|na_row`;
                                                    const _naF1 = eshStor[_naK1] !== undefined ? parseInt(eshStor[_naK1]) : -1;
                                                    if (_naF1 >= 0 && mi >= _naF1) return;
                                                }
                                                const ak = `${_eshYear1}|${tt}|${p.name}|${ti}|${mi}|actual`;
                                                if (eshStor[ak] && eshStor[`${_eshYear1}|${tt}|GLOBAL_PLAN|${ti}|${mi}|plan`]) monthTotal++;
                                            });
                                        });
                                    }
                                }
                            });
                            const _n = new Date(); const _cy = _n.getFullYear(); const _cm = _n.getMonth();
                            const _sy = state.selectedYear || _cy;
                            const _isPast = _sy < _cy || (_sy === _cy && mi <= _cm);
                            const _disp = monthTotal > 0 ? fmtNum(monthTotal) : (_isPast ? '0' : '');
                            html += `<td class="${isNov ? 'nov-narrow-td' : 'monthly-data'}" style="font-weight:600;background:${monthTotal>0?'#f1f8e9':''};">${_disp}</td>`;
                        } else if (state.currentTab === 'rates' && ['LTIR','TRIR','SEVERITY RATE'].includes(row)) {
                            const _cs = window.buildCumulativeSeries(displayProjects, 12);
                            const smh = (i <= _cs.last) ? _cs.mh[i] : 0;
                            let sval = '';
                            if (smh > 0) {
                                const _r = window.calcCumRate(row, _cs.lta[i], _cs.rec[i], _cs.dl[i], smh);
                                if (_r !== null) sval = window.formatRate(row, _r);
                            }
                            const scolor = '#1b5e20';
                            html += `<td class="monthly-data" style="font-weight:600;background:${smh>0?'#f1f8e9':''};text-align:center;cursor:help;" title="${smh>0 ? window.rateCompTipCum(row, _cs, i) : 'Cannot be edited. Auto-computed.'}"${smh>0 ? ' data-tip-nowrap' : ''}>${sval}</td>`;
                        } else if (state.currentTab === 'exposures' && row === 'Total Exposed Man-hour to date') {
                            displayProjects.forEach(p => {
                                const _series = computeExposureToDateSeries(p);
                                monthTotal += _series[i] || 0;
                            });
                            if (isExposureMonthHidden(i)) monthTotal = 0;
                            html += `<td class="monthly-data${(typeof isExposureMonthHidden === 'function' && isExposureMonthHidden(i)) ? ' future' : ''}" style="font-weight:700;text-align:center;">${monthTotal > 0 ? fmtNum(monthTotal) : ''}</td>`;
                        } else {
                            const _mList = [];
                            displayProjects.forEach(p => {
                                if (state.currentTab === 'exposures' && row === 'No. of Days w/o LTA' && isMonthAfterProjectFinish(p, i, state.selectedYear || new Date().getFullYear())) return; // finished project: stale Days w/o LTA after the finish month not counted
                                const val = p.vals[key] ? (p.vals[key][i] ?? "") : "";
                                if (val !== "" && !isNaN(val)) { monthTotal += parseFloat(val); _mList.push({ n: p.name, v: parseFloat(val) }); }
                            });
                            if (isExposureMonthHidden(i, row)) monthTotal = 0;
                            const _osNow = new Date(); const _osCY = _osNow.getFullYear(); const _osCM = _osNow.getMonth() + 1;
                            const _osSY = state.selectedYear || _osCY;
                            const _osMedAutoRows = ['LTA','Medical Treatment','First Aid','Fatality','High-Potential incident','Dangerous Occurrences','No. of Identified Near-Miss','Days Lost/Charged'];
                            const _osIsMedAuto = (state.currentTab === 'medical' || (state.currentTab === 'activities' && row === 'No. of Identified Near-Miss')) && _osMedAutoRows.includes(row);
                            const _osIsPast = _osSY < _osCY || (_osSY === _osCY && i < _osCM);
                            const _osShowZero = _osIsMedAuto && _osIsPast && monthTotal === 0; // current month is ongoing -> dash, not 0
                            const _osDisp = monthTotal > 0 ? fmtNum(monthTotal) : (_osShowZero ? '0' : '');
                            html += `<td class="${isNov ? 'nov-narrow-td' : 'monthly-data'}${(state.currentTab === 'exposures' && typeof isExposureMonthHidden === 'function' && isExposureMonthHidden(i)) ? ' future' : ''}" style="font-weight: 600; background: ${monthTotal > 0 ? '#f1f8e9' : ''}; color: ${_osShowZero ? '#bbb' : ''};" ${state.currentTab === 'exposures' ? `data-expsummary-key="${key.replace(/"/g,'&quot;')}" data-expsummary-col="${i}"` : ''}${monthTotal > 0 ? _osTipAttr(_mList) : ''}>${_osDisp}</td>`;
                        }
                    }
                    
                    if (hasYTD) {
                        let ytdTotal = 0;
                        if (row === "Total Manpower") {
                            // YTD = average of monthly sums (sum all projects per month, then average across months with data)
                            let monthSumTotal = 0;
                            let monthsWithData = 0;
                            for (let _mi = 1; _mi <= 12; _mi++) {
                                if (window.isExposureMonthHidden && window.isExposureMonthHidden(_mi)) continue; // unfinished month
                                let monthSum = 0;
                                let hasData = false;
                                displayProjects.forEach(p => {
                                    const v = parseFloat(p.vals[key] ? (p.vals[key][_mi] ?? '') : '') || 0;
                                    if (v > 0) { monthSum += v; hasData = true; }
                                });
                                if (hasData) { monthSumTotal += monthSum; monthsWithData++; }
                            }
                            ytdTotal = monthsWithData > 0 ? Math.round(monthSumTotal / monthsWithData) : 0;
                            html += `<td class="average-cell" style="font-weight: 800; font-size: 0.7rem;">${ytdTotal > 0 ? fmtNum(ytdTotal) : ''}</td>`;
                        } else if (state.currentTab === 'activities' && (row === 'Drills Conducted' || row === 'Training Conducted')) {
                            const eshStor = getEshStorage();
                            const _eshYear2 = state.selectedYear || new Date().getFullYear();
                            displayProjects.forEach(p => {
                                for (let mi = 0; mi < 12; mi++) {
                                    if (row === 'Drills Conducted') {
                                        ESH_DRILLS.forEach((drill, di) => {
                                            const _dsi2 = getDrillStorageIdx(drill, di);
                                            const _ny2 = (state&&state.selectedYear)||2026; const naCellKey2 = `${_ny2}|esh-calendar-drills|${p.name}|${_dsi2}|${mi}|na`;
                                            if (eshStor[naCellKey2]) return; // skip N/A cells
                                            const ak = `${_eshYear2}|esh-calendar-drills|${p.name}|${_dsi2}|${mi}|actual`;
                                            if (eshStor[ak] && eshStor[`${_eshYear2}|esh-calendar-drills|GLOBAL_PLAN|${_dsi2}|${mi}|plan`]) ytdTotal++;
                                        });
                                        // ── CORPORATE Drills: also count corp-drills actuals for CORPORATE project ──
                                        if (p.region === 'CORPORATE') {
                                            const _corpBase2 = window.CORP_DRILLS || [];
                                            const _corpCustom2 = (typeof getCorpDrillCustomRows === 'function') ? getCorpDrillCustomRows() : [];
                                            _corpBase2.forEach((_cd2, _cdi2) => {
                                                const _cak2 = `${_eshYear2}|esh-calendar-corp-drills|${p.name}|${_cdi2}|${mi}|actual`;
                                                if (eshStor[_cak2] && eshStor[`${_eshYear2}|esh-calendar-corp-drills|GLOBAL_PLAN|${_cdi2}|${mi}|plan`]) ytdTotal++;
                                            });
                                            _corpCustom2.forEach((_ccr2, _cci2) => {
                                                const _cak2c = `${_eshYear2}|esh-calendar-corp-drills|${p.name}|${1000 + _cci2}|${mi}|actual`;
                                                if (eshStor[_cak2c] && eshStor[`${_eshYear2}|esh-calendar-corp-drills|GLOBAL_PLAN|${1000 + _cci2}|${mi}|plan`]) ytdTotal++;
                                            });
                                        }
                                    } else {
                                        // ── CORPORATE Training Conducted: read from manually entered vals ──
                                        if (p.region === 'CORPORATE') {
                                            for (let _mIdx2 = 1; _mIdx2 <= 12; _mIdx2++) {
                                                ytdTotal += parseFloat(p.vals[key] ? (p.vals[key][_mIdx2] ?? '') : '') || 0;
                                            }
                                        } else {
                                            const _8HR_LABEL2 = '8-Hr Mandatory OSH Training';
                                            ['esh-calendar-env','esh-calendar-safety','esh-calendar-health'].forEach(tt => {
                                                (ESH_TRAININGS[tt] || []).forEach((tr, ti) => {
                                                    // Skip 8-Hr OSH N/A months
                                                    if (tr === _8HR_LABEL2) {
                                                        const _naK2 = `${_eshYear2}|${tt}|${p.name}|${ti}|na_row`;
                                                        const _naF2 = eshStor[_naK2] !== undefined ? parseInt(eshStor[_naK2]) : -1;
                                                        if (_naF2 >= 0 && mi >= _naF2) return;
                                                    }
                                                    const ak = `${_eshYear2}|${tt}|${p.name}|${ti}|${mi}|actual`;
                                                    if (eshStor[ak] && eshStor[`${_eshYear2}|${tt}|GLOBAL_PLAN|${ti}|${mi}|plan`]) ytdTotal++;
                                                });
                                            });
                                        }
                                    }
                                }
                            });
                            html += `<td class="ytd-cell" style="font-weight: 800; font-size: 0.7rem;">${ytdTotal > 0 ? fmtNum(ytdTotal) : ''}</td>`;
                        } else if (state.currentTab === 'rates' && ['LTIR','TRIR','SEVERITY RATE'].includes(row)) {
                            const _cs = window.buildCumulativeSeries(displayProjects, 12);
                            const ymh = _cs.mh[12];
                            let yval = '';
                            if (ymh > 0) {
                                const _r = window.calcCumRate(row, _cs.lta[12], _cs.rec[12], _cs.dl[12], ymh);
                                if (_r !== null) yval = window.formatRate(row, _r);
                            }
                            const ycolor = '#1b5e20';
                            html += `<td class="ytd-cell" style="cursor:help;" title="${ymh>0 ? window.rateCompTipCum(row, _cs, 12) : 'Cannot be edited. Auto-computed.'}"${ymh>0 ? ' data-tip-nowrap' : ''}>${yval}</td>`;
                        } else if (state.currentTab === 'exposures' && row === 'Total Exposed Man-hour to date') {
                            displayProjects.forEach(p => {
                                const _series = computeExposureToDateSeries(p);
                                ytdTotal += _series[12] || 0;
                            });
                            html += `<td class="ytd-cell" style="font-weight:800;font-size:0.7rem;">${ytdTotal > 0 ? fmtNum(ytdTotal) : ''}</td>`;
                        } else {
                            const _yList = [];
                            displayProjects.forEach(p => {
                                const ytd = calculateYTD(p.vals[key], rowIdx, row, p);
                                if (ytd > 0) { ytdTotal += ytd; _yList.push({ n: p.name, v: ytd }); }
                            });
                            html += `<td class="ytd-cell" style="font-weight: 800; font-size: 0.7rem;"${ytdTotal > 0 ? _osTipAttr(_yList) : ''}>${ytdTotal > 0 ? fmtNum(ytdTotal) : ''}</td>`;
                        }
                    }
                    
                    html += `</tr>`;
                });
                
                html += _rptSum ? `</tbody></table></div></div></div>` : `</table></div></div>
                
                `;
            }

            if (state.projects.length === 0 && state.currentTab === 'overall') {
                html += `<div style="background: var(--bg-card); border-radius: 12px; padding: 40px; text-align: center; margin: 20px 0; border: 2px dashed var(--border-color);">
                    <i class="fas fa-rocket" style="font-size: 3rem; color: #2e7d32; opacity: 0.6; margin-bottom: 15px;"></i>
                    <h3 style="color: var(--text-primary); margin: 10px 0; font-size: 1.2rem;">Welcome to ESH Compliance Dashboard!</h3>
                    <p style="color: var(--text-secondary); margin: 10px 0 20px; font-size: 0.9rem;">Get started by adding your first project. Click the <strong>EDIT</strong> button above, then use <strong>+ ADD PROJECT</strong> in any region below.</p>
                    <button onclick="toggleEdit()" class="btn btn-primary" style="padding: 12px 30px; font-size: 0.9rem;">
                        <i class="fas fa-plus-circle"></i> START ADDING PROJECTS
                    </button>
                </div>`;
            }

            if (state.currentTab !== 'doe' && state.currentTab !== 'doe-permit') {

                const tabBanners = {
                    'kpm': {
                        icon: 'fa-file-lines',
                        iconColor: '#fbc02d',
                        title: 'MONTHLY REPORT (KPM&I)',
                        sub1: 'Monthly submission required for each project',
                        sub2: `<i class="fas fa-calendar-check"></i> Tracking ${displayProjects.length} project(s) — KPM & Inspection reports`
                    },
                    'emb': {
                        icon: 'fa-leaf',
                        iconColor: '#a5d6a7',
                        title: 'EMB REPORTORIAL',
                        sub1: 'SMR: Quarterly (Due 15th of following month) &nbsp;|&nbsp; CMR: Semi-Annual (Due Jul 15 & Jan 15)',
                        sub2: `<i class="fas fa-seedling"></i> Showing ${displayProjects.length} project(s) — Self-Monitoring & Compliance Reports`
                    },
                    'dole': {
                        icon: 'fa-hard-hat',
                        iconColor: '#fbc02d',
                        title: 'DOLE REPORTORIAL',
                        sub1: 'WAIR/RSO/MOM: Monthly &nbsp;|&nbsp; AEDR due Jan 30 &nbsp;|&nbsp; AMR due Mar 31 (covers the previous year)',
                        sub2: `<i class="fas fa-clipboard-list"></i> Showing ${displayProjects.length} project(s) — Department of Labor and Employment reports`
                    },
                    'exposures': {
                        icon: 'fa-users',
                        iconColor: '#a5d6a7',
                        title: 'TOTAL EXPOSURES',
                        sub1: 'Monthly manpower and manhour exposure tracking · Total Manpower, Manhours &amp; LTA-free days across all regions',
                        sub2: `<i class="fas fa-hard-hat"></i> Showing ${displayProjects.length} project(s) — Total Manpower, Manhours & LTA-free days`
                    },
                    'activities': {
                        icon: 'fa-calendar-check',
                        iconColor: '#fbc02d',
                        title: 'ESH ACTIVITIES AND PROGRAMS',
                        sub1: 'Monthly ESH activities, inspections, near-miss, drills and training records',
                        sub2: `<i class="fas fa-clipboard-list"></i> Tracking ${displayProjects.length} project(s) — ESH Committee, Inspections, Near-Miss, Drills & Trainings`
                    },
                    'rates': {
                        title: 'STATISTICS RATE — AUTO-COMPUTED',
                        sub1: (state.ratesStandard === 'osha')
                            ? 'LTIR, TRIR & Severity Rate · OSHA 200,000 hrs base (US Standard)'
                            : 'LTIR, TRIR & Severity Rate · OSHS 1,000,000 hrs base (PH Standard)',
                        src: 'Data sourced from: Medical Tab (LTA, Medical Treatment, Fatality, High-Potential, Days Lost/Charged) + Exposures Tab (Man-hours)'
                    }
                };

                if (tabBanners[state.currentTab]) {
                    const b = tabBanners[state.currentTab];
                    const _mergedTabs = ['activities', 'medical', 'exposures'];
                    if (state.currentTab === 'exposures') {
                        // Walang banner sa Total Exposures tab
                        window._pendingTableHeader = null;
                    } else if (_mergedTabs.includes(state.currentTab)) {
                        // Plain report bar (same as OVERALL SUMMARY): white card, green title, light pills
                        window.rptSumInjectCss();
                        window._pendingTableHeader = `<div class="rpt-wrap" style="margin:0 16px 4px;position:sticky;top:0;z-index:20;">${window.rptBar({ title: b.title, sub: b.sub1, pills: [getProjectCountLabel(displayProjects), 'ALL REGIONS'] })}</div>`;
                    } else {
                        window._pendingTableHeader = null;
                        html += `
                    <div class="tab-info-bar ${b.src ? 'tib-oneline' : ''}">
                        ${b.src ? '' : `<div class="tib-icon"><i class="fas ${b.icon}"></i></div>`}
                        <div class="tib-body">
                            <p class="tib-title">${b.title}</p>
                            <p class="tib-sub">${b.sub1}</p>
                            ${b.src ? `<span class="tib-info" title="${b.src}">i</span>` : `<p class="tib-sub" style="opacity:0.75;">${b.sub2}</p>`}
                        </div>
                        <div class="tib-badges">
                            <span class="tib-pill tib-pill-green">${getProjectCountLabel(displayProjects)}</span>
                            ${state.currentTab === 'rates' ? `
                            <div class="rates-standard-toggle" title="Switch between PH (OSHS) and US (OSHA) standard">
                                <span class="rst-opt ${(state.ratesStandard||'oshs')==='oshs'?'active':''}"
                                    onclick="setRatesStandard('oshs');"><svg class="rst-flag" viewBox="0 0 24 16" width="18" height="12" aria-hidden="true"><rect width="24" height="8" fill="#0038a8"/><rect y="8" width="24" height="8" fill="#ce1126"/><path d="M0 0L13 8L0 16Z" fill="#fff"/><circle cx="4" cy="8" r="2" fill="#fcd116"/></svg> OSHS</span>
                                <span class="rst-divider"></span>
                                <span class="rst-opt ${state.ratesStandard==='osha'?'active':''}"
                                    onclick="setRatesStandard('osha');"><svg class="rst-flag" viewBox="0 0 24 16" width="18" height="12" aria-hidden="true"><rect width="24" height="16" fill="#fff"/><g fill="#b22234"><rect width="24" height="1.23"/><rect y="2.46" width="24" height="1.23"/><rect y="4.92" width="24" height="1.23"/><rect y="7.38" width="24" height="1.23"/><rect y="9.85" width="24" height="1.23"/><rect y="12.31" width="24" height="1.23"/><rect y="14.77" width="24" height="1.23"/></g><rect width="10" height="8.6" fill="#3c3b6e"/></svg> OSHA</span>
                            </div>` : ''}
                        </div>
                    </div>`;
                    }
                }

                if (window._pendingTableHeader) {
                    html += window._pendingTableHeader;
                    window._pendingTableHeader = null;
                }

                REGIONS.forEach(reg => {
                const CORPORATE_ALLOWED_TABS = ['overall', 'rates', 'exposures', 'medical', 'nov', 'nov-env', 'nov-monitoring', 'activities', 'dole']; // 'dole' included — CORPORATE region shown in DOLE Reportorial
                const RESTRICTED_TABS_FOR_CORPORATE = ['audit', 'cshp', 'reg']; // audit, cshp, reg tabs — completely exclude CORPORATE (monitoring only)
                if (reg === 'CORPORATE' && (!CORPORATE_ALLOWED_TABS.includes(state.currentTab) || RESTRICTED_TABS_FOR_CORPORATE.includes(state.currentTab))) return;

                const PLANT_ALLOWED_TABS = ['overall', 'permits', 'emb', 'env-monitoring', 'env-monthly-report'];
                const RESTRICTED_TABS_FOR_PLANT = ['audit', 'cshp', 'reg']; // audit, cshp, reg tabs — completely exclude PLANT OPERATIONS
                if (reg === 'PLANT OPERATIONS' && (!PLANT_ALLOWED_TABS.includes(state.currentTab) || RESTRICTED_TABS_FOR_PLANT.includes(state.currentTab))) return;

                const projs = displayProjects.filter(p => p.region === reg);
                
                const regComplianceProjs = projs.filter(p => !isProjectOnStoppage(p));
                const regPercValues = regComplianceProjs.map(p => getPerc(p)).filter(v => v !== null);
                const regSum = regPercValues.reduce((sum, v) => sum + v, 0);
                const regionAvg = (reg === 'CORPORATE' || reg === 'PLANT OPERATIONS') ? (regPercValues.length > 0 ? Math.round(regSum / regPercValues.length) : 0) : getRegionOverallCompliance(reg);

                const canEditRegion = UserAccounts.canEdit(state.currentUser?.email, reg) && UserAccounts.canEditTab(state.currentUser?.email, state.currentTab);
                const isCollapsed = isRegionCollapsed(reg);
                
                const isCorporateReg = reg === 'CORPORATE';
                const isPlantReg = reg === 'PLANT OPERATIONS';
                const CORP_DATA_TABS = ['overall', 'rates', 'exposures', 'dole', 'medical', 'nov', 'nov-env', 'nov-monitoring', 'activities', 'esh-calendar-env', 'esh-calendar-safety', 'esh-calendar-health', 'esh-calendar-drills'];
                const isCorporateDataTab = isCorporateReg && CORP_DATA_TABS.includes(state.currentTab);
                const regIcon = isCorporateReg ? 'fa-building-columns' : (isPlantReg ? 'fa-industry' : 'fa-location-dot');
                const regLabel = reg;
                html += window.regionBanner({ id: `region-banner-${reg}`, reg: reg, toggle: 'toggleRegion', collapsed: isCollapsed, editable: canEditRegion, icon: regIcon, label: regLabel, cls: state.currentTab === 'overall' ? 'overall-rb' : '', right: `${(!isCorporateReg || isCorporateDataTab) ? (isCorporateReg ? '' : isPlantReg ? `<span class="rbadge rbadge-count rb-proj">${projs.length} PLANT${projs.length!==1?'S':''}</span>` : `<span class="rbadge rbadge-count rb-proj">${projs.length} PROJECT${projs.length!==1?'S':''}</span>`) : ''}
                            ${!isCorporateReg && !isPlantReg && projs.length > 0 ? `<span class="rbadge rbadge-avg" title="Region compliance only: average of project compliance scores in this region"><span class="rb-dot ${rbAvgDotClass(regionAvg)}"></span>AVG ${regionAvg}%</span>` : ''}
                            ${state.currentTab === 'overall' && (!isCorporateReg || isCorporateDataTab) && !isPlantReg && state.isEditing && canEditRegion ? `<button onclick="event.stopPropagation(); openAddProjectModal('${reg}')" class="btn btn-primary" title="Add new project to ${reg}" aria-label="Add new project to ${reg}" style="font-size:0.68rem;padding:3px 10px;line-height:1.4;">+ ADD</button>` : ''}
                            ${state.currentTab === 'overall' && (!isCorporateReg || isCorporateDataTab) && !isPlantReg && state.isEditing && !canEditRegion ? `<button disabled style="opacity:0.45;cursor:not-allowed;background:#888;font-size:0.68rem;padding:3px 10px;line-height:1.4;" class="btn btn-primary">LOCKED</button>` : ''}` });

                html += `<div id="region-content-${reg}" class="region-content ${isCollapsed ? 'collapsed' : ''}">`;

                {

                if (projs.length === 0 && state.isEditing && state.currentTab === 'overall') {
                    html += `<div style="padding: 20px; text-align: center; color: var(--text-secondary); font-size: 0.85rem; font-style: italic;">
                        <i class="fas fa-folder-open" style="font-size: 2rem; opacity: 0.3; margin-bottom: 10px; display: block;"></i>
                        ${isCorporateDataTab ? 'No CORPORATE entry yet. Click "+ ADD" above to add CORPORATE data.' : 'No projects in this region yet. Click "+ ADD PROJECT" to get started.'}
                    </div>`;
                }

                const _useNavForTab = _TAB_NAV_TABS.includes(state.currentTab) && projs.length > 1;
                let _navProjs = projs;
                let _inlineNav = null; // Prev/Next now live inside the project card
                if (_useNavForTab) {
                    const _nk = _tabNavKey(state.currentTab, reg);
                    let _navProjIdx = Math.min(_tabRegionProjectIdx[_nk] || 0, projs.length - 1);
                    _tabRegionProjectIdx[_nk] = _navProjIdx;
                    _navProjs = [projs[_navProjIdx]];
                    _inlineNav = { tab: state.currentTab, reg: reg, idx: _navProjIdx, total: projs.length };
                }

                _navProjs.forEach(p => {
                    syncProjectStatus(p); // auto-correct status from dates
                    const perc = getPerc(p, true); // include finished projects' historical score, not a dash
                    const isWorkStopped = isProjectOnStoppage(p);
                    const percDisplay = perc !== null ? perc : '—';
                    const percDeg = perc !== null ? perc * 3.6 : 0;
                    // Derive display status from actual dates (source of truth), not stored p.status
                    const _derivedStatus = p.dateFinished ? 'finished' : isWorkStopped ? 'work-stoppage' : 'on-going';
                    
                    const canEdit = UserAccounts.canEdit(state.currentUser?.email, p.region) && UserAccounts.canEditTab(state.currentUser?.email, state.currentTab);
                    const isLocked = !canEdit;
                    const isAuditAdminLocked = state.currentTab === 'audit' && !state.isAdmin;
                    const inputsEditable = state.isEditing && canEdit && !isAuditAdminLocked; // For table inputs
                    const canDelete = UserAccounts.checkPermission(state.currentUser?.email, 'delete', p.region, state.currentTab).allowed;
                    const isDeleteLocked = !canDelete;

                    html += `<div class="project-row ${isLocked ? 'project-locked' : ''}" data-pname="${(p.name||'').replace(/"/g,'&quot;')}" data-region="${(p.region||'').replace(/"/g,'&quot;')}" data-status="${_derivedStatus}" style="${isWorkStopped ? 'opacity:0.7;' : ''}${state.currentTab === 'overall' ? 'cursor:pointer;' : ''}${(state.currentTab !== 'overall' && _inlineNav) ? 'display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px;padding:5px 14px;' : ''}" ${state.currentTab === 'overall' ? `onclick="osOpenModal('${p.name.replace(/'/g, "\\'")}')"`  : ''}>\n                        
                        ${_inlineNav ? (state.currentTab !== 'overall' ? `<div style="justify-self:start;">${_tabNavBtn(_inlineNav.tab, _inlineNav.reg, -1, _inlineNav.idx, _inlineNav.total)}</div>` : _tabNavBtn(_inlineNav.tab, _inlineNav.reg, -1, _inlineNav.idx, _inlineNav.total)) : ''}
                        ${(state.currentTab !== 'overall' || p.region === 'CORPORATE' || p.region === 'PLANT OPERATIONS') ? '' : `<div class="circular-progress" title="Click to see what is missing" onclick="event.stopPropagation();openComplianceGap('${p.name.replace(/'/g, "\\'")}')" style="--percentage: ${percDeg}deg;cursor:pointer;${isWorkStopped ? 'opacity:0.45;' : ''}">
                            <div class="circular-progress-inner" style="${isWorkStopped ? 'font-size:0.62rem;color:#bf360c;' : ''}">${percDisplay}${percDisplay !== '—' ? '%' : ''}</div>
                        </div>`}
                        <div class="project-info" style="${state.currentTab !== 'overall' ? 'align-items:center;text-align:center;gap:1px;min-width:0;' : ''}">
                            <div class="project-name" style="${state.currentTab !== 'overall' ? 'justify-content:center;' : ''}">
                                ${window._dispProjName(p.name)}
                                ${p.isRenewable ? '<i class="fas fa-leaf" title="Renewable Energy" style="color: #4caf50; font-size: 0.9rem; margin-left: 8px;"></i>' : ''}

                            </div>
                            <div class="project-meta" style="${_inlineNav ? 'justify-content:center;' : ''}">${_inlineNav ? `Project ${_inlineNav.idx + 1} of ${_inlineNav.total}` : (p.region === 'CORPORATE' ? 'SCIC Head Office' : p.region === 'PLANT OPERATIONS' ? (p.location || 'Plant Facility') : (p.address || 'Project Address'))}</div>
                        </div>
                        ${(state.currentTab !== 'overall' || p.region === 'CORPORATE' || p.region === 'PLANT OPERATIONS') ? '' : `<div class="project-dates">
                            <div><span class="date-label">Started:</span> ${p.dateStarted ? formatDateDMY(p.dateStarted) : 'Not set'}</div>
                            ${p.dateFinished ? `<div><span class="date-label">Finished:</span> ${formatDateDMY(p.dateFinished)}</div>` : ''}
                            ${p.workStoppageDate ? `<div style="color:#757575;font-size:0.7rem;"><span class="date-label" style="color:#757575;">Stoppage:</span> ${formatDateDMY(p.workStoppageDate)}</div>` : ''}
                            ${p.workResumeDate ? `<div style="color:#2e7d32;font-size:0.7rem;"><span class="date-label" style="color:#2e7d32;">Resume:</span> ${formatDateDMY(p.workResumeDate)}</div>` : ''}
                        </div>`}
                        ${(state.currentTab !== 'overall' || p.region === 'CORPORATE' || p.region === 'PLANT OPERATIONS') ? '' : `${statusBadge(_derivedStatus, { onclick: 'event.stopPropagation(); ' + (isLocked ? 'showLockedMessage()' : `changeProjectStatus('${p.name}', event)`) })}`}
                        ${_inlineNav ? (state.currentTab !== 'overall' ? `<div style="justify-self:end;">${_tabNavBtn(_inlineNav.tab, _inlineNav.reg, 1, _inlineNav.idx, _inlineNav.total)}</div>` : _tabNavBtn(_inlineNav.tab, _inlineNav.reg, 1, _inlineNav.idx, _inlineNav.total)) : ''}
                        ${(state.isEditing && state.currentTab === 'overall') ? `
                            <button ${isLocked ? 'disabled' : ''} onclick="event.stopPropagation(); ${isLocked ? 'showLockedMessage()' : `openEditProjectModal('${p.name.replace(/'/g, "\\'")}', '${p.region}')`}" style="background:none;border:none;cursor:pointer;color:#555;font-size:1rem;padding:4px 6px;margin-right:2px;opacity:${isLocked ? '0.5' : '1'};" title="${isLocked ? 'View Only - Contact admin to edit' : 'Edit Project Details'}">
                                <i class="fas fa-pen"></i>
                            </button>
                            <button ${isDeleteLocked ? 'disabled' : ''} onclick="event.stopPropagation(); ${isDeleteLocked ? 'showLockedMessage()' : `deleteProject('${p.name}')`}" style="background:none;border:none;cursor:pointer;color:#d32f2f;font-size:1rem;padding:4px 6px;opacity:${isDeleteLocked ? '0.5' : '1'};" title="${isDeleteLocked ? 'View Only - Contact admin to delete' : 'Delete Project'}"><i class="fas fa-trash"></i></button>
                        ` : ''}
                    </div>
                    `;


if (state.currentTab === 'dole' && projs.length > 1) {
    const _dolePerc = getPerc(p, true); // include finished projects' historical score, not a dash
    const _dolePercDisplay = _dolePerc !== null ? _dolePerc + '%' : '—';
    const _dolePercColor = _dolePerc !== null ? (_dolePerc >= 90 ? '#2e7d32' : _dolePerc >= 75 ? '#e65100' : '#c62828') : '#888';
    const _dolePercBg = _dolePerc !== null ? (_dolePerc >= 90 ? '#e8f5e9' : _dolePerc >= 75 ? '#fff3e0' : '#ffebee') : '#f5f5f5';
    html += `<div style="display:flex;align-items:center;gap:10px;background:#f0f7f0;border-radius:6px 6px 0 0;padding:7px 14px;margin-top:6px;">
        <i class="fas fa-building" style="color:#2e7d32;font-size:0.85rem;"></i>
        <span style="font-weight:800;font-size:0.82rem;color:#1b5e20;">${p.name}</span>
        ${p.isRenewable ? '<i class="fas fa-leaf" title="Renewable Energy" style="color:#4caf50;font-size:0.75rem;margin-left:5px;"></i>' : ''}

        <span style="background:${_dolePercBg};color:${_dolePercColor};border-radius:10px;font-size:0.65rem;font-weight:800;padding:2px 9px;margin-left:auto;">${_dolePercDisplay} compliant</span>
    </div>`;
}

if (state.currentTab === 'audit') {
    if (!state.isAdmin) {
        html += `<div style="display:flex;align-items:center;gap:12px;background:linear-gradient(135deg,#e8f5e9,#c8e6c9);border:1.5px solid #2e7d32;border-radius:10px;padding:12px 18px;margin-bottom:14px;font-size:0.85rem;color:#1b5e20;font-weight:600;"><i class='fas fa-lock' style='font-size:1.1rem;color:#2e7d32;'></i><span>This tab is <strong>view-only</strong>. Only Admins can input data in the Internal ESH Audit Report.</span></div>`;
    }
    html += `<div class="table-container">

        <table class="audit-table">
            <thead>
                <tr>
                    <th colspan="3" style="border-right: 2px solid #a5d6a7;">Q1 (JAN-MAR)</th>
                    <th colspan="3" style="border-right: 2px solid #a5d6a7;">Q2 (APR-JUN)</th>
                    <th colspan="3" style="border-right: 2px solid #a5d6a7;">Q3 (JUL-SEP)</th>
                    <th colspan="3" style="border-right: 2px solid #a5d6a7;">Q4 (OCT-DEC)</th>
                    <th rowspan="3" class="cell-grand-total" style="border-left: 3px solid #fbc02d; vertical-align: middle; line-height: 1.3;">GRAND<br>TOTAL<br>AVERAGE</th>
                </tr>
                <tr>
                    <th colspan="3" style="border-right: 2px solid #a5d6a7;">Quarterly Score</th>
                    <th colspan="3" style="border-right: 2px solid #a5d6a7;">Quarterly Score</th>
                    <th colspan="3" style="border-right: 2px solid #a5d6a7;">Quarterly Score</th>
                    <th colspan="3" style="border-right: 2px solid #a5d6a7;">Quarterly Score</th>
                </tr>
                <tr>
                    <th style="background: #c5e8c3; color: #1b5e20; font-size: 10px; font-weight: 700;">Implementation</th>
                    <th style="background: #c5e8c3; color: #1b5e20; font-size: 10px; font-weight: 700;">Documentation & Compliance</th>
                    <th style="background: #9ecf9b; color: #1b5e20; font-size: 10px; font-weight: 700; border-right: 2px solid #c8e6c9;">Average</th>
                    
                    <th style="background: #c5e8c3; color: #1b5e20; font-size: 10px; font-weight: 700;">Implementation</th>
                    <th style="background: #c5e8c3; color: #1b5e20; font-size: 10px; font-weight: 700;">Documentation & Compliance</th>
                    <th style="background: #9ecf9b; color: #1b5e20; font-size: 10px; font-weight: 700; border-right: 2px solid #c8e6c9;">Average</th>
                    
                    <th style="background: #c5e8c3; color: #1b5e20; font-size: 10px; font-weight: 700;">Implementation</th>
                    <th style="background: #c5e8c3; color: #1b5e20; font-size: 10px; font-weight: 700;">Documentation & Compliance</th>
                    <th style="background: #9ecf9b; color: #1b5e20; font-size: 10px; font-weight: 700; border-right: 2px solid #c8e6c9;">Average</th>
                    
                    <th style="background: #c5e8c3; color: #1b5e20; font-size: 10px; font-weight: 700;">Implementation</th>
                    <th style="background: #c5e8c3; color: #1b5e20; font-size: 10px; font-weight: 700;">Documentation & Compliance</th>
                    <th style="background: #9ecf9b; color: #1b5e20; font-size: 10px; font-weight: 700; border-right: 2px solid #c8e6c9;">Average</th>
                </tr>
            </thead>
            <tbody>
                <tr>`;

    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    let totalYearAvg = 0;
    
    // Only the WDA System Admin can edit the Internal ESH Audit Report (see UserAccounts.checkPermission).
    // Everyone else: not-allowed cursor on the score cells, with the reason as tooltip.
    // Score cells that cannot be edited get the class 'audit-locked' (cursor: not-allowed, defined in styles.css):
    //   - denied by the audit permission, or no edit access to this project's region / tab  -> tooltip gives the reason
    //   - not in edit mode (inputs are disabled)                                             -> no tooltip
    const _auditPerm = UserAccounts.checkPermission(state.currentUser?.email, 'edit', p.region, 'audit');
    const _auditDenied = !_auditPerm.allowed || !canEdit;
    const _auditLocked = _auditDenied || !inputsEditable;
    const _auditReason = !_auditPerm.allowed
        ? (_auditPerm.reason || 'View only')
        : 'View only: you do not have edit access to this project.';
    const _auditTdCls = _auditLocked ? ' audit-locked' : '';
    const _auditTd  = _auditDenied ? ' title="' + String(_auditReason).replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '"' : '';
    const _auditInp = _auditLocked ? ' class="audit-locked"' : '';
    quarters.forEach(q => {
        const audit = p.auditData?.[q] || { scoreImpl: 0, docuComp: 0 };
        const qAvg = (audit.scoreImpl + audit.docuComp) / 2;
        totalYearAvg += qAvg;

        html += `
            <td class="cell-white${_auditTdCls}"${_auditTd}><input type="number" min="0" max="100" value="${audit.scoreImpl}" ${inputsEditable ? '' : 'disabled'}${_auditInp} oninput="updateAuditData('${p.name}','${q}','scoreImpl',this.value)" placeholder="0"></td>
            <td class="cell-white${_auditTdCls}"${_auditTd}><input type="number" min="0" max="100" value="${audit.docuComp}" ${inputsEditable ? '' : 'disabled'}${_auditInp} oninput="updateAuditData('${p.name}','${q}','docuComp',this.value)" placeholder="0"></td>
            <td class="cell-avg-gray" style="border-right: 2px solid #e0e0e0;">${qAvg.toFixed(2)}</td>`;
    });

    html += `<td class="cell-grand-total">${(totalYearAvg / 4).toFixed(2)}</td>
                </tr>
            </tbody>
        </table>
    </div>`;
}

                  
                // ── ENVI NOV: always define functions so modal works from any tab ──
                (function _defineEnvNovFunctions() {
                    if (window._envNovFunctionsDefined) return;
                    window._envNovFunctionsDefined = true;

                const ENV_NOV_INTERNAL_BODIES = [
                    'Client',
                    'ISO Internal Audit',
                    'ESH Internal Audit'
                ];
                const ENV_NOV_EXTERNAL_BODIES = [
                    'DENR',
                    'EMB',
                    'LLDA',
                    'MGB',
                    'NWRB',
                    'CENRO',
                    'PENRO',
                    'ERDB',
                    'LGU',
                    'BFAR',
                    'DOE',
                    'DPWH',
                    'NIA',
                    'NCIP',
                    'Others'
                ];
                const ENV_NOV_VIOLATION_LAWS = [
                    'PD 1586',
                    'RA 9003',
                    'RA 8749',
                    'RA 9275',
                    'RA 6969',
                    'RA 9147',
                    'PD 705',
                    'RA 11038',
                    'RA 11285',
                    'RA 9175',
                    'RA 7942',
                    'RA 10593',
                    'RA 4850',
                    'DAO 2014-02',
                    'ECC Condition',
                    'Others'
                ];

                const canEditNovEnv = UserAccounts.canEditTab(state.currentUser?.email, 'nov-env');

                const ENV_NOV_INTERNAL_IB_SET = new Set(['Client','ISO Internal Audit','ESH Internal Audit']);

                function migrateNovEnvData(p) {
                    if (!p.vals) p.vals = {};
                    if (p.vals['nov-env_internal_novs'] !== undefined || p.vals['nov-env_external_novs'] !== undefined) return;
                    const oldNovs = p.vals['nov-env_novs'] || [];
                    const internal = [], external = [];
                    oldNovs.forEach(nov => {
                        if (ENV_NOV_INTERNAL_IB_SET.has(nov.issuingBody)) internal.push(nov);
                        else external.push(nov);
                    });
                    p.vals['nov-env_internal_novs'] = internal;
                    p.vals['nov-env_external_novs'] = external;
                    delete p.vals['nov-env_novs'];
                }

                function _autoEditMode() {
                    const _isPastYr = state.selectedYear < Math.max(...availableYears);
                    if (_isPastYr && !state.isAdmin) return; // past year — non-admin view-only
                    if (!state.isEditing) {
                        state.isEditing = true;
                        document.body.classList.add('is-editing');
                        const _fb = document.getElementById('floating-edit-btn');
                        const _fi = document.getElementById('floating-edit-icon');
                        const _ft = document.getElementById('floating-edit-tooltip');
                        if (_fb) { _fb.classList.add('save-mode'); _fb.setAttribute('onclick','saveData()'); }
                        if (_fi) _fi.className = 'fas fa-save';
                        if (_ft) _ft.textContent = 'Click to Save';
                    }
                }

                function addNovEnvNov(pName, type) {
                    const p = state.projects.find(x => x.name === pName);
                    if (!p) return;
                    const _rbac = UserAccounts.checkPermission(state.currentUser?.email, 'edit', p.region, 'nov-env');
                    if (!_rbac.allowed) { showLockedMessage(_rbac.reason); return; }
                    _autoEditMode();
                    migrateNovEnvData(p);
                    const key = type === 'internal' ? 'nov-env_internal_novs' : 'nov-env_external_novs';
                    if (!p.vals[key]) p.vals[key] = [];
                    p.vals[key].push({ dateIssued: '', dateReceived: '', issuingBody: '', refNo: '', violations: [{ violationLaw: '', status: 'Open' }] });
                    saveToFirebase(); if(typeof window.renderNovEnvTab==='function') window.renderNovEnvTab();
                }

                function removeNovEnvNov(pName, type, nIdx) {
                    const p = state.projects.find(x => x.name === pName);
                    if (!p) return;
                    const _rbac = UserAccounts.checkPermission(state.currentUser?.email, 'delete', p.region, 'nov-env');
                    if (!_rbac.allowed) { showLockedMessage(_rbac.reason); return; }
                    migrateNovEnvData(p);
                    const key = type === 'internal' ? 'nov-env_internal_novs' : 'nov-env_external_novs';
                    if (!p.vals[key]) return;
                    const label = `${type === 'internal' ? 'NCR (Client/SCIC Audit)' : 'External NOV'} #${nIdx + 1}`;
                    showDeleteDialog('ENVI NOV', `${label} from ${pName}`).then(confirmed => {
                        if (!confirmed) return;
                        const backup = JSON.parse(JSON.stringify(p.vals[key]));
                        p.vals[key].splice(nIdx, 1);
                        saveToFirebase(); if(typeof window.renderNovEnvTab==='function') window.renderNovEnvTab();
                        showUndoToast(`${label} deleted from ${pName}`, () => {
                            p.vals[key] = backup;
                            saveToFirebase(); if(typeof window.renderNovEnvTab==='function') window.renderNovEnvTab();
                        });
                    });
                }

                function addNovEnvViolation(pName, type, nIdx) {
                    const p = state.projects.find(x => x.name === pName);
                    if (!p) return;
                    const _rbac = UserAccounts.checkPermission(state.currentUser?.email, 'edit', p.region, 'nov-env');
                    if (!_rbac.allowed) { showLockedMessage(_rbac.reason); return; }
                    _autoEditMode();
                    migrateNovEnvData(p);
                    const key = type === 'internal' ? 'nov-env_internal_novs' : 'nov-env_external_novs';
                    if (!p.vals[key] || !p.vals[key][nIdx]) return;
                    p.vals[key][nIdx].violations.push({ violationLaw: '', status: 'Open' });
                    saveToFirebase(); if(typeof window.renderNovEnvTab==='function') window.renderNovEnvTab();
                }

                function removeNovEnvViolation(pName, type, nIdx, vIdx) {
                    const p = state.projects.find(x => x.name === pName);
                    if (!p) return;
                    const _rbac = UserAccounts.checkPermission(state.currentUser?.email, 'delete', p.region, 'nov-env');
                    if (!_rbac.allowed) { showLockedMessage(_rbac.reason); return; }
                    migrateNovEnvData(p);
                    const key = type === 'internal' ? 'nov-env_internal_novs' : 'nov-env_external_novs';
                    const nov = p.vals[key] && p.vals[key][nIdx];
                    if (!nov) return;
                    const label = nov.violations.length === 1
                        ? `${type === 'internal' ? 'NCR (Client/SCIC Audit)' : 'External NOV'} #${nIdx + 1} (entire NOV)`
                        : `Violation #${vIdx + 1} from NOV #${nIdx + 1}`;
                    showDeleteDialog('ENVI NOV Violation', `${label} — ${pName}`).then(confirmed => {
                        if (!confirmed) return;
                        const backup = JSON.parse(JSON.stringify(p.vals[key]));
                        if (nov.violations.length === 1) {
                            p.vals[key].splice(nIdx, 1);
                        } else {
                            nov.violations.splice(vIdx, 1);
                        }
                        saveToFirebase(); if(typeof window.renderNovEnvTab==='function') window.renderNovEnvTab();
                        showUndoToast(`${label} deleted`, () => {
                            p.vals[key] = backup;
                            saveToFirebase(); if(typeof window.renderNovEnvTab==='function') window.renderNovEnvTab();
                        });
                    });
                }

                function updateNovEnvNovField(pName, type, nIdx, field, value) {
                    const p = state.projects.find(x => x.name === pName);
                    if (!p) return;
                    migrateNovEnvData(p);
                    const key = type === 'internal' ? 'nov-env_internal_novs' : 'nov-env_external_novs';
                    if (p.vals[key] && p.vals[key][nIdx]) {
                        p.vals[key][nIdx][field] = value;
                        if (typeof markPendingSync === 'function') markPendingSync();
                        if (typeof saveToFirebaseDebounced === 'function') saveToFirebaseDebounced();
                    }
                }

                function updateNovEnvViolField(pName, type, nIdx, vIdx, field, value) {
                    const p = state.projects.find(x => x.name === pName);
                    if (!p) return;
                    migrateNovEnvData(p);
                    const key = type === 'internal' ? 'nov-env_internal_novs' : 'nov-env_external_novs';
                    const nov = p.vals[key] && p.vals[key][nIdx];
                    if (nov && nov.violations[vIdx]) {
                        nov.violations[vIdx][field] = value;
                        if (typeof markPendingSync === 'function') markPendingSync();
                        if (typeof saveToFirebaseDebounced === 'function') saveToFirebaseDebounced();
                    }
                }

                window.addNovEnvNov = addNovEnvNov;
                window.removeNovEnvNov = removeNovEnvNov;
                window.addNovEnvViolation = addNovEnvViolation;
                window.removeNovEnvViolation = removeNovEnvViolation;
                window.updateNovEnvNovField = updateNovEnvNovField;
                window.updateNovEnvViolField = updateNovEnvViolField;

                function renderNovEnvTab() {
                    // NOV tab must show ALL projects including work-stoppage — they can still have NOVs recorded
                    const displayProjects = (state.filteredProjects || state.projects || []);
                    const envNovContainer = document.getElementById('nov-env-view');
                    if (!envNovContainer) return;

                    // ── Helper: per-project NOV summary ──────────────────────
                    function _envNovSummary(p) {
                        migrateNovEnvData(p);
                        const intNovs = p.vals['nov-env_internal_novs'] || [];
                        const extNovs = p.vals['nov-env_external_novs'] || [];
                        let open = 0, closed = 0;
                        [...intNovs, ...extNovs].forEach(n => {
                            const vs = n.violations || [];
                            if (vs.length === 0) { open++; } else { vs.forEach(v => { if ((v.status||'Open') === 'Closed') closed++; else open++; }); }
                        });
                        return { total: intNovs.length + extNovs.length, int: intNovs.length, ext: extNovs.length, open, closed };
                    }

                    // ── Grand totals ─────────────────────────────────────────
                    let _gtTotal=0,_gtInt=0,_gtExt=0,_gtOpen=0,_gtClosed=0,_gtViol=0;
                    displayProjects.forEach(p => {
                        migrateNovEnvData(p);
                        const intNovs = p.vals['nov-env_internal_novs'] || [];
                        const extNovs = p.vals['nov-env_external_novs'] || [];
                        _gtInt += intNovs.length; _gtExt += extNovs.length;
                        [...intNovs,...extNovs].forEach(n => {
                            const vs = n.violations||[];
                            _gtViol += vs.length;
                            if(vs.length===0){ _gtOpen++; } else { vs.forEach(v => { if((v.status||'Open')==='Closed') _gtClosed++; else _gtOpen++; }); }
                        });
                    });
                    _gtTotal = _gtInt + _gtExt;

                    let envHtml = '';

                    envHtml += window.novBanner({
                        icon: 'leaf', title: 'ENVI REGULATORY ISSUED NOV',
                        sub: 'Notices of Violation — ' + window.icon("dot-red") + ' NCR (Client/SCIC Audit) and ' + window.icon("dot-orange") + ' External NOV (Regulatory Bodies)',
                        stats: [
                            { label: 'Total NOV',        value: _gtTotal,  sub: _gtInt + ' NCR &bull; ' + _gtExt + ' ext', tone: 'ok',   icon: 'file'   },
                            { label: 'Open NOV',         value: _gtOpen,   tone: 'bad',  icon: 'unlock' },
                            { label: 'Closed NOV',       value: _gtClosed, tone: 'ok',   icon: 'ok'     },
                            { label: 'Total Violations', value: _gtViol,   tone: 'viol', icon: 'leaf'   }
                        ]
                    });

                    const ENV_REG_ORDER = ['CORPORATE','PLANT OPERATIONS','NCR','SOUTH LUZON','NORTH LUZON','VISAYAS & MINDANAO'];

                    ENV_REG_ORDER.forEach(reg => {
                        const regProjs = displayProjects.filter(p => p.region === reg);
                        if (!regProjs.length) return;
                        const canEdit = UserAccounts.canEdit(state.currentUser?.email, reg) && UserAccounts.canEditTab(state.currentUser?.email, 'nov-env');
                        const isCollapsed = isRegionCollapsed(reg);
                        const _regSlug = reg.toLowerCase().replace(/\s/g,'-').replace(/[^a-z0-9-]/g,'');
                        const safeReg = reg.replace(/[^a-zA-Z0-9]/g,'_');

                        // Region totals
                        let regTotal=0, regOpen=0, regClosed=0;
                        regProjs.forEach(p => { const s=_envNovSummary(p); regTotal+=s.total; regOpen+=s.open; regClosed+=s.closed; });


                        envHtml += `<div class="nov-region-card">
                            ${window.regionBanner({ id: `nov-env-region-banner-${safeReg}`, reg: reg, onclick: `toggleNovEnvRegion('${reg}',event)`, collapsed: isCollapsed, editable: canEdit, style: 'margin:0;', right: `<span class="rbadge rbadge-count rb-proj">${regProjs.length} PROJ</span>
                                        ${regTotal>0?`<span class="rbadge rbadge-nov">${regTotal} NOV</span>`:''}
                                        ${regOpen>0?`<span class="rbadge rbadge-open">${regOpen} Open</span>`:''}
                                        ${regClosed>0?`<span class="rbadge rbadge-closed">${regClosed} Closed</span>`:''}` })}
                            <div id="nov-env-region-content-${safeReg}" style="border:none;box-shadow:0 2px 8px rgba(0,0,0,0.06);border-radius:0 0 10px 10px;overflow:hidden;background:var(--bg-card);${isCollapsed?'display:none;':''}">`;

                        regProjs.forEach((p, idx) => {
                            const pnSafe = p.name.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
                            const s = _envNovSummary(p);
                            const isWS = isProjectOnStoppage(p);
                            const scoreBg = s.total === 0 ? '#f5f5f5' : s.open > 0 ? '#ffebee' : '#e8f5e9';
                            const scoreFg = s.total === 0 ? '#aaa' : s.open > 0 ? '#c62828' : '#2e7d32';
                            const scoreLabel = s.total === 0 ? '0 NOV' : `${s.total} NOV`;

                            envHtml += `<div class="nov-proj-row" onclick="window.openEnvNovModal('${pnSafe}')">
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

                        envHtml += `</div></div>`;
                    });

                    envNovContainer.innerHTML = envHtml;
                }

                // ── ENVI NOV Full-Screen Modal ─────────────────────────────────────────
                window.openEnvNovModal = function(pName) {
                    const allProjects = state.filteredProjects || state.projects || [];
                    const p = allProjects.find(pr => pr.name === pName);
                    if (!p) return;
                    migrateNovEnvData(p);

                    const userEmail = state.currentUser?.email || '';
                    const canEdit = UserAccounts.canEdit(userEmail, p.region) && UserAccounts.canEditTab(userEmail, 'nov-env');
                    const pnSafe = pName.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
                    const isWS = isProjectOnStoppage(p);

                    const existing = document.getElementById('env-nov-modal');
                    if (existing) existing.remove();

                    function buildEnvNovTable(type, label, emoji, hdrClass, bodies, lawsList) {
                        // Section markup comes from the shared window.novSectionHtml (one row per NOV).
                        var pn = pnSafe, sv = ';saveToFirebase();';
                        return window.novSectionHtml({
                            p: p, type: type, label: label, hdrClass: hdrClass, bodies: bodies,
                            novs: p.vals[type === 'internal' ? 'nov-env_internal_novs' : 'nov-env_external_novs'] || [],
                            secId: 'envn-modal-' + type, toggle: 'toggleEnvNovModalSec',
                            editing: !!(state.isEditing && canEdit), lawHead: 'Violation description per Envi law',
                            lawOpts: function(sel) { return ENV_NOV_VIOLATION_LAWS.map(function(o) { return '<option value="' + o + '"' + (sel === o ? ' selected' : '') + '>' + o + '</option>'; }).join(''); },
                            h: {
                                field:   function(n, f) { return "updateNovEnvNovField('" + pn + "','" + type + "'," + n + ",'" + f + "',this.value)"; },
                                viol:    function(n, v, f) { return "updateNovEnvViolField('" + pn + "','" + type + "'," + n + "," + v + ",'" + f + "',this.value)" + (f === 'status' ? ";saveToFirebase();if(typeof window.renderNovEnvTab==='function')window.renderNovEnvTab();" : ''); },
                                addViol: function(n) { return "addNovEnvViolation('" + pn + "','" + type + "'," + n + ")" + sv + "window.openEnvNovModal('" + pn + "')"; },
                                delNov:  function(n) { return "removeNovEnvNov('" + pn + "','" + type + "'," + n + ")" + sv + "window.openEnvNovModal('" + pn + "')"; },
                                delViol: function(n, v) { return "removeNovEnvViolation('" + pn + "','" + type + "'," + n + "," + v + ")" + sv + "window.openEnvNovModal('" + pn + "')"; }
                            }
                        });
                    }

                    const intNovs = p.vals['nov-env_internal_novs'] || [];
                    const extNovs = p.vals['nov-env_external_novs'] || [];
                    const totalNov = intNovs.length + extNovs.length;
                    let totalOpen=0, totalClosed=0;
                    [...intNovs,...extNovs].forEach(n => { const vs=n.violations||[]; { vs.forEach(v => { if((v.status||'Open')==='Closed') totalClosed++; else totalOpen++; }); } });

                    const modal = document.createElement('div');
                    modal.id = 'env-nov-modal';
                    window.eshMountModal(modal, {
                        id: 'env-nov-modal', icon: 'fa-leaf', width: 'min(1300px,98vw)',
                        title: `ENVI NOV — <span style="color:#2e7d32;">${p.name}</span>${isWS ? ' ' + statusBadge('work-stoppage') : ''}`,
                        sub: `${p.region} &nbsp;·&nbsp; ${totalNov} NOV total &nbsp;·&nbsp; <span style="color:#c62828;">${totalOpen} open violations</span> &nbsp;·&nbsp; <span style="color:#2e7d32;">${totalClosed} closed</span>`,
                        body: `<div style="background:#f1f8e9;border-bottom:1px solid #c8e6c9;padding:6px 16px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                            <span style="font-size:0.63rem;color:#2e7d32;font-weight:600;"><i class="fas fa-leaf" style="margin-right:4px;"></i>ENVI REGULATORY ISSUED NOV</span>
                            ${!canEdit?('<span style="font-size:0.6rem;color:#e65100;"><i class="fas fa-lock" style="margin-right:4px;"></i>View Only — Press ' + window.icon("edit") + ' Edit button to enable editing</span>'):''}
                            <button type="button" class="nvt-btn" style="margin-left:auto;" data-all="0" onclick="novExpandAll('env-nov-modal',this)">Expand all</button>
                        </div>
                        <div style="padding:16px 20px;">
                            ${buildEnvNovTable('internal','NCR (Client/SCIC Audit)','🔴','internal-hdr',ENV_NOV_INTERNAL_BODIES,ENV_NOV_VIOLATION_LAWS)}
                            ${buildEnvNovTable('external','EXTERNAL NOV','🟠','external-hdr',ENV_NOV_EXTERNAL_BODIES,ENV_NOV_VIOLATION_LAWS)}
                        </div>
                        `,
                        foot: (state.isEditing && canEdit) ? `<button class="nov-env-add-btn" onclick="addNovEnvNov('${pnSafe}','internal');saveToFirebase();window.openEnvNovModal('${pnSafe}')"><i class="fas fa-plus"></i> Add NCR NOV</button>
<button class="nov-env-add-btn external-btn" onclick="addNovEnvNov('${pnSafe}','external');saveToFirebase();window.openEnvNovModal('${pnSafe}')"><i class="fas fa-plus"></i> Add External NOV</button>` : ''
                    });
                };

                window.toggleEnvNovModalSec = function(secId) {
                    const content = document.getElementById(secId + '-content');
                    const icon = document.getElementById(secId + '-icon');
                    if (!content) return;
                    const isCollapsed = content.style.maxHeight === '0px';
                    if (isCollapsed) { content.style.maxHeight = '9999px'; content.style.opacity = '1'; if(icon) icon.style.transform=''; }
                    else { content.style.maxHeight = '0px'; content.style.opacity = '0'; if(icon) icon.style.transform='rotate(-90deg)'; }
                };

                // Updated toggleNovEnvRegion for new safeReg chevron ids
                window.toggleNovEnvRegion = function(regionName, event) {
                    if (event && (event.target.tagName === 'BUTTON' || event.target.closest('button'))) return;
                    const safeReg = regionName.replace(/[^a-zA-Z0-9]/g,'_');
                    const content = document.getElementById('nov-env-region-content-' + safeReg);
                    const banner = document.getElementById('nov-env-region-banner-' + safeReg);
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
                };

                window.renderNovEnvTab = renderNovEnvTab;
                })(); // end _defineEnvNovFunctions

                if (state.currentTab === 'nov-env') {
                    const envNovContainer = document.getElementById('nov-env-view');
                    if (!envNovContainer) { container.innerHTML = ''; return; }
                    container.innerHTML = '';
                    if (typeof window.renderNovEnvTab === 'function') window.renderNovEnvTab();
                    return;
                }

            if (state.currentTab === 'nov-monitoring') {
}
else if (state.currentTab !== 'overall' && state.currentTab !== 'audit' && state.currentTab !== 'doe' && state.currentTab !== 'doe-permit' && state.currentTab !== 'lta-registry' && state.currentTab !== 'tabulation' && state.currentTab !== 'dole' && state.currentTab !== 'emb' && state.currentTab !== 'env-monthly-report') {
    const isDateType = ['kpm','dole','permits','emb','cshp','reg','env-monthly-report'].includes(state.currentTab);
    const isCshp = state.currentTab === 'cshp' || state.currentTab === 'reg';
    const _curMonth = new Date().getMonth() + 1; // 1=Jan … 12=Dec — future months are locked
    if (state.currentTab === 'exposures' && typeof clearFutureDaysWithoutLta === 'function') clearFutureDaysWithoutLta(); // wipe stale future-month "Days w/o LTA" before rendering/YTD
    const hasYTD = ['exposures', 'rates', 'medical', 'nov', 'activities'].includes(state.currentTab);
    const isNov = state.currentTab === 'nov';

    let typeColumnWidth = '250px';
    if (state.currentTab === 'permits' || state.currentTab === 'dole') {
        typeColumnWidth = '280px'; // Wider for long permit names
    } else if (state.currentTab === 'emb') {
        typeColumnWidth = '220px';
    }

     // apply to all tabs in this renderer
    if (state.currentTab === 'dole') html += `<div style="background:var(--bg-card);border:none;box-shadow:0 2px 8px rgba(0,0,0,0.06);border-radius:0 0 8px 8px;margin-bottom:14px;overflow:hidden;">`;
    window._pendingTableFooter = null;
    const _isPermitsTbl = state.currentTab === 'permits';
    const _isExpTbl = state.currentTab === 'exposures' || state.currentTab === 'medical' || state.currentTab === 'rates' || state.currentTab === 'activities'; // same KPM-style per-project table
    if (_isExpTbl && window.expProjInjectCss) window.expProjInjectCss();
    html += `<div class="table-container${_isPermitsTbl ? ' permits-wrap' : ''}"><table class="${_isPermitsTbl ? 'got-tbl permits-tbl' : (_isExpTbl ? 'env-tbl exp-proj' : 'env-tbl')}"${_isPermitsTbl ? ' style="width:auto;min-width:100%;"' : ''}>`;
    html += `<tr><th class="${_isPermitsTbl ? 'got-th-left got-th-dark' : 'env-th-left env-th-sticky env-th-dark'}" style="width:${typeColumnWidth}; min-width:${typeColumnWidth}; max-width:${typeColumnWidth}; white-space: normal; padding: 10px 12px; line-height: 1.3; vertical-align: middle;">TYPE</th>`;

    if (isCshp) {
        const headerText = (state.currentTab === 'cshp') ? "DATE APPROVED" : "DATE REGISTERED";
        html += `<th>${headerText}</th>`;
    } else {
        if (state.currentTab !== 'kpm' && state.currentTab !== 'dole' && state.currentTab !== 'emb' && state.currentTab !== 'permits') {
            html += `<th class="prev-year${isNov ? ' nov-narrow-th' : ''}" style="background:#e65100;color:white;">PREVIOUS</th>`;
        }

        if (state.currentTab === 'emb') {
            html += `<th class="env-th-dark">Q1 (JAN-MAR)<br><small style="font-weight: 400; font-size: 0.65rem;">SMR Due: Apr 15</small></th>`;
            html += `<th class="env-th-dark">Q2 (APR-JUN)<br><small style="font-weight: 400; font-size: 0.65rem;">SMR Due: Jul 15</small></th>`;
            html += `<th class="env-th-dark">Q3 (JUL-SEP)<br><small style="font-weight: 400; font-size: 0.65rem;">SMR Due: Oct 15</small></th>`;
            html += `<th class="env-th-dark">Q4 (OCT-DEC)<br><small style="font-weight: 400; font-size: 0.65rem;">SMR Due: Jan 15</small></th>`;
        } else if (state.currentTab === 'permits') {
            html += `<th style="min-width:100px;text-align:center;white-space:nowrap;padding:6px 10px;"><span style="font-size:0.6rem;">CLIENT-PROVIDED</span></th>`;
            html += `<th style="width:32px;min-width:32px;max-width:32px;text-align:center;white-space:nowrap;padding:6px 4px;"><span style="font-size:0.6rem;">N/A</span></th>`;
            html += `<th style="min-width: 200px; white-space: normal; padding: 10px 12px;">PERMIT NO. / ACCREDITATION NO.</th>`;
            html += `<th style="min-width: 140px; white-space: nowrap;">DATE ISSUED</th>`;
            html += `<th style="min-width: 140px; white-space: nowrap;">EXPIRY DATE</th>`;
        } else {
            const isDole = state.currentTab === 'dole';
            const _nowM = new Date(), _nowMi = _nowM.getMonth(), _nowSel = parseInt(state.selectedYear) || _nowM.getFullYear();
            MONTHS.forEach((m, _mi) => {
                const _cls = isNov ? 'nov-narrow-th' : (isDole ? 'dole-narrow-th' : '');
                const _now = (_isExpTbl && _nowSel === _nowM.getFullYear() && _mi === _nowMi) ? ' now' : '';
                const _all = (_cls + _now).trim();
                html += `<th${_all ? ` class="${_all}"` : ''}>${m}</th>`;
            });
        }

        if (hasYTD) {
            html += `<th class="ytd-header" style="background:#f9a825;color:#1b5e20;font-weight:800;">RUNNING YTD</th>`;
        }
    }

    html += `</tr>`;

    if (!SCHEMA[state.currentTab]) {
        html += `</table></div>`;
        return html;
    }

    SCHEMA[state.currentTab].forEach((row, rowIdx) => {
        const key = (row === 'No. of Identified Near-Miss') ? 'medical_' + row : `${state.currentTab}_${row}`;
        
        const isPermitNA = !!(p.vals && p.vals[`${key}__na`] === '1');
        const isPermitClientProvided = !!(p.vals && p.vals[`${key}__cp`] === '1');
        const _permitPnSafe = p.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const _permitKeySafe = key.replace(/'/g, "\\'");
        const rowStyle = '';
        const naBtn = '';
        const _embType = row.startsWith('SMR') ? 'SMR' : (row.startsWith('CMR') ? 'CMR' : '');
        const _embPnSafe = p.name.replace(/'/g, "\\'");
        const embAddBtn = (state.currentTab === 'emb' && inputsEditable && _embType &&
            (row === 'SMR (Quarterly) - Submission Date' || row === 'CMR (Semi-Annual) - Submission Date'))
            ? `<button onclick="addEmbEntry('${_embPnSafe}','${_embType}')"
                 style="background:#2e7d32;color:white;border:none;border-radius:50%;width:22px;height:22px;min-width:22px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:0.65rem;flex-shrink:0;box-shadow:0 2px 6px rgba(46,125,50,0.4);transition:background 0.15s,transform 0.15s;"
                 onmouseover="this.style.background='#388e3c';this.style.transform='scale(1.15)';"
                 onmouseout="this.style.background='#2e7d32';this.style.transform='scale(1)';"
                 title="Add another ${_embType} submission row — for projects with multiple ${_embType} submissions">
                 <i class="fas fa-plus"></i>
               </button>`
            : '';
        const _isExpTab = state.currentTab === 'exposures';
        const _rowShort = (_isExpTab && row === 'Total Exposed Man-hour to date') ? 'Exp. Man-hour to date' : row;
        const _rowTip = String(row).replace(/"/g, '&quot;');
        const _ratesTip = (state.currentTab === 'rates' && ['LTIR','TRIR','SEVERITY RATE'].includes(row))
            ? 'Auto-computed from the Incident &amp; Accident Registry and man-hours. Cumulative from January to the month shown. ' + row + ' = ' + (row === 'LTIR' ? 'LTA cases' : row === 'TRIR' ? 'Recordable cases' : 'Total days lost') + ' × ' + (state.ratesStandard === 'osha' ? '200,000 (OSHA base)' : '1,000,000 (OSHS base)') + ' ÷ man-hours.'
            : '';
        html += `<tr style="${rowStyle}"><td ${_isExpTab ? `title="${_rowTip}"` : (_ratesTip ? `title="${_ratesTip}"` : '')} style="width:${typeColumnWidth}; min-width:${typeColumnWidth}; max-width:${typeColumnWidth}; text-align:left; font-weight:700; background:#e8f5e9; position: sticky; left: 0; z-index: 5; white-space: ${_isExpTab ? 'nowrap' : 'normal'}; padding: 10px 12px; line-height: 1.3; vertical-align: middle;">
            <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
                <span style="flex:1;${_isExpTab ? 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;' : ''}">
                    ${_rowShort}
                    ${(state.currentTab === 'medical' && row === 'Days Lost/Charged')
                        ? `<div style="font-size:0.6rem;font-weight:400;color:#1565c0;margin-top:3px;line-height:1.3;">
                               <i class="fas fa-info-circle"></i> Used for Severity Rate computation <i class="fas fa-sync-alt" title="Auto-sync from Incident &amp; Accident Registry ↗" onclick="changeTab('lta-registry')" style="margin-left:6px;font-size:0.62rem;color:#e65100;cursor:pointer;vertical-align:middle;"></i>
                           </div>`
                        : ''}
                    ${((state.currentTab === 'medical' || state.currentTab === 'activities') && ['LTA','Medical Treatment','First Aid','Fatality','High-Potential incident','Dangerous Occurrences','No. of Identified Near-Miss'].includes(row))
                        ? `<i class="fas fa-sync-alt" title="Auto-synced from Registry ↗" onclick="changeTab('lta-registry')" style="margin-left:6px;font-size:0.62rem;color:#2e7d32;cursor:pointer;vertical-align:middle;"></i>`
                        : ''}
                </span>
                ${naBtn}
                ${embAddBtn}
            </div>
        </td>`;

        // ── CLIENT-PROVIDED & N/A checkbox columns (permits tab only) ──────
        if (state.currentTab === 'permits') {
            html += `<td style="text-align:center;">
                <label style="display:inline-flex;align-items:center;justify-content:center;cursor:${inputsEditable?'pointer':'default'};">
                    <input type="checkbox" ${isPermitClientProvided?'checked':''} ${inputsEditable?'':'disabled'}
                        onchange="(function(chk){var proj=state.projects.find(function(x){return x.name==='${_permitPnSafe}';});if(!proj)return;if(!proj.vals)proj.vals={};proj.vals['${_permitKeySafe}__cp']=chk?'1':'';if(chk)proj.vals['${_permitKeySafe}__na']='';if(typeof markPendingSync==='function')markPendingSync();if(typeof saveToFirebaseDebounced==='function')saveToFirebaseDebounced();render();})(this.checked)"
                        style="cursor:inherit;">
                </label>
            </td>`;
            html += `<td style="text-align:center;">
                <label style="display:inline-flex;align-items:center;justify-content:center;cursor:${inputsEditable?'pointer':'default'};">
                    <input type="checkbox" ${isPermitNA?'checked':''} ${inputsEditable?'':'disabled'}
                        onchange="(function(chk){var proj=state.projects.find(function(x){return x.name==='${_permitPnSafe}';});if(!proj)return;if(!proj.vals)proj.vals={};proj.vals['${_permitKeySafe}__na']=chk?'1':'';if(chk)proj.vals['${_permitKeySafe}__cp']='';if(typeof markPendingSync==='function')markPendingSync();if(typeof saveToFirebaseDebounced==='function')saveToFirebaseDebounced();render();})(this.checked)"
                        style="cursor:inherit;">
                </label>
            </td>`;
        }

        if (isCshp) {
            const v = p.vals[key] ? (p.vals[key][1] ?? "") : "";
            html += `<td><input type="date" value="${v}" ${inputsEditable ? '' : 'disabled'} oninput="updateVal('${p.name}','${key}',1,this.value)"></td>`;
        } else {
            const prevVal = p.vals[key] ? (p.vals[key][0] ?? "") : "";
            const prevValFmt = (!isDateType && prevVal !== '') ? fmtNum(prevVal) : prevVal;
            
            if (state.currentTab !== 'kpm' && state.currentTab !== 'dole' && state.currentTab !== 'emb' && state.currentTab !== 'permits') {
                const _isToDate = state.currentTab === 'exposures' && row === 'Total Exposed Man-hour to date';
                const _onchangeExtra = _isToDate
                    ? `;updateToDateMonthCells('${p.name}')`
                    : ``;

                const _isDrillTraining = state.currentTab === 'activities' && (row === 'Drills Conducted' || row === 'Training Conducted');
                
                const _isRatesAutoRow = state.currentTab === 'rates' && ['LTIR','TRIR','SEVERITY RATE'].includes(row);

                if (_isRatesAutoRow) {
                    const prevMh  = parseFloat(p.vals['exposures_Total Exposed Manhour']?.[0])     || 0;
                    const prevLta = parseFloat(p.vals['medical_LTA']?.[0])                         || 0;
                    const prevMed = parseFloat(p.vals['medical_Medical Treatment']?.[0])           || 0;
                    const prevFat = parseFloat(p.vals['medical_Fatality']?.[0])                   || 0;
                    const prevHip = parseFloat(p.vals['medical_High-Potential incident']?.[0])    || 0;
                    const prevDL  = parseFloat(p.vals['medical_Days Lost/Charged']?.[0])        || 0;
                    const prevRec = prevLta + prevMed + prevFat + prevHip;
                    const _rateBase = (state.ratesStandard === 'osha') ? 200000 : 1000000;
                    const _rateLabel = (state.ratesStandard === 'osha') ? '200K' : '1M';
                    let prevVal = null;
                    let prevColor = '#1b5e20';
                    if (prevMh > 0) {
                        if      (row === 'LTIR')          { prevVal = (prevLta * _rateBase) / prevMh; prevColor = '#1b5e20'; }
                        else if (row === 'TRIR')          { prevVal = (prevRec * _rateBase) / prevMh; prevColor = '#1b5e20'; }
                        else if (row === 'SEVERITY RATE') { prevVal = (prevDL  * _rateBase) / prevMh; prevColor = '#1b5e20'; }
                    }
                    if (prevVal !== null) {
                        if (!p.vals[key]) p.vals[key] = new Array(14).fill('');
                        p.vals[key][0] = window.formatRate(row, prevVal);
                    }
                    const prevDisp = prevVal !== null ? window.formatRate(row, prevVal) : '—';
                    html += `<td class="prev-year" style="text-align:center;cursor:help;" title="${prevVal !== null ? window.rateCompTip(row, row === 'LTIR' ? prevLta : row === 'TRIR' ? prevRec : prevDL, prevMh, 'Previous year') : 'Cannot be edited. Auto-computed from previous year medical &amp; exposures data (' + ((state.ratesStandard==='osha')?'OSHA 200K':'OSHS 1M') + ' base).'}"${prevVal !== null ? ' data-tip-nowrap' : ''}>
                        <div style="font-size:0.72rem;${prevVal !== null ? '' : 'color:#bbb;'}">${prevDisp}</div>
                    </td>`;
                } else if (_isDrillTraining) {
                    html += `<td class="prev-year${isNov ? ' nov-narrow-td' : ''}">
                        <input type="text" inputmode="decimal" data-num
                            value="${prevValFmt}"
                            ${inputsEditable ? '' : 'disabled'}
                            oninput="numFmtInput(this, function(v){updateVal('${p.name}','${key}',0,v)})">
                    </td>`;
                } else {
                    html += `<td class="prev-year${isNov ? ' nov-narrow-td' : ''}">
                    <input type="${isDateType ? 'date' : 'text'}" ${isDateType ? '' : 'inputmode="decimal" data-num'} ${_isExpTbl ? 'placeholder="—"' : ''}
                        value="${prevValFmt}"
                        ${inputsEditable ? '' : 'disabled'}
                        ${isDateType ? `oninput="updateVal('${p.name}','${key}',0,this.value)${_onchangeExtra}"` : `oninput="numFmtInput(this, function(v){updateVal('${p.name}','${key}',0,v)${_onchangeExtra}})"`}>
                </td>`;
                }
            }
            
            if (state.currentTab === 'permits') {
                const naDisabled = inputsEditable ? '' : 'disabled';

                // If CP or NA checked → show single merged exempt cell
                if (isPermitClientProvided || isPermitNA) {
                    const _mergeText = isPermitClientProvided ? 'Care of Client' : 'Not Applicable';
                    html += `<td colspan="3" style="text-align:center;color:var(--text-secondary);font-size:0.78rem;font-style:italic;">${_mergeText}</td>`;
                } else if (row === 'ECC') {
                    {
                    const eccKey = `permits_ECC`;
                    const rawVal = p.vals[eccKey];

                    let entries = rawVal?.entries;
                    if (!entries) {
                        const legacyNo   = rawVal ? (rawVal[1] ?? '') : '';
                        const legacyIss  = rawVal ? (rawVal[2] ?? '') : '';
                        const legacyExp  = rawVal ? (rawVal[3] ?? '') : '';
                        entries = (legacyNo || legacyIss || legacyExp)
                            ? [{ permitNo: legacyNo, dateIssued: legacyIss, expiryDate: legacyExp }]
                            : [{ permitNo: '', dateIssued: '', expiryDate: '' }];
                    }
                    if (entries.length === 0) entries = [{ permitNo: '', dateIssued: '', expiryDate: '' }];

                    entries.forEach((entry, idx) => {
                        const isFirst = idx === 0;
                        if (!isFirst) {
                            html += `</tr><tr style="${rowStyle}"><td style="width:${typeColumnWidth}; min-width:${typeColumnWidth}; max-width:${typeColumnWidth}; text-align:left; font-weight:700; background:#e8f5e9; position: sticky; left: 0; z-index: 5; white-space: normal; padding: 8px 12px; line-height: 1.3; vertical-align: middle;">
                                <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
                                    <span style="flex:1; font-size:0.78rem; color:#555;">ECC #${idx + 1}</span>
                                    ${inputsEditable ? `<span onclick="removeEccEntry('${p.name}',${idx})" title="Remove this entry" style="display:inline-flex;align-items:center;justify-content:center;cursor:pointer;font-size:0.6rem;font-weight:700;padding:2px 7px;border-radius:20px;border:1.5px solid #ef5350;color:#ef5350;background:transparent;user-select:none;white-space:nowrap;">✕ Remove</span>` : ''}
                                </div>
                            </td>
                            <td style="background:${isPermitClientProvided?'#dceefb':isPermitNA?'#eeeeee':''}" ></td>
                            <td style="background:${isPermitClientProvided?'#dceefb':isPermitNA?'#eeeeee':''}" ></td>`;
                        }
                        html += `<td style="min-width:200px;padding:8px 12px;"><input type="text" class="ecc-permit-input" placeholder="Permit/Accreditation #" value="${entry.permitNo ?? ''}" ${naDisabled} oninput="updateEccEntry('${p.name}',${idx},'permitNo',this.value)" style="width:100%;"></td>`;
                        html += `<td style="min-width:140px;padding:8px 12px;"><input type="date" value="${entry.dateIssued ?? ''}" ${naDisabled} oninput="updateEccEntry('${p.name}',${idx},'dateIssued',this.value)" style="width:100%;"></td>`;
                        html += `<td style="min-width:140px;padding:8px 12px;position:relative;">
                            <div style="display:flex;align-items:center;justify-content:center;height:100%;padding:4px 0;">
                                <span class="until-completion-text" style="font-size:0.7rem;font-weight:500;white-space:nowrap;">Until Project Completion</span>
                            </div>
                            ${isFirst && inputsEditable ? `<button onclick="addEccEntry('${p.name}')" class="permit-add-btn" data-tooltip="Add ECC entry"><i class="fas fa-plus"></i></button>` : ''}
                        </td>`;
                    });
                    } // end !isPermitClientProvided for ECC
                } else if (MULTI_ENTRY_PERMITS.includes(row)) {
                    {
                    const _mpKey = 'permits_' + row;
                    const _mpRaw = p.vals[_mpKey];
                    const _mpShort = MULTI_ENTRY_SHORT[row] || row;
                    let _mpEntries = (_mpRaw && _mpRaw.entries) ? _mpRaw.entries : null;
                    if (!_mpEntries) {
                        const _mpOldNo = _mpRaw ? (_mpRaw[1] || '') : '';
                        const _mpOldIss = _mpRaw ? (_mpRaw[2] || '') : '';
                        const _mpOldExp = _mpRaw ? (_mpRaw[3] || '') : '';
                        _mpEntries = (_mpOldNo || _mpOldIss || _mpOldExp)
                            ? [{ permitNo: _mpOldNo, dateIssued: _mpOldIss, expiryDate: _mpOldExp }]
                            : [{ permitNo: '', dateIssued: '', expiryDate: '' }];
                    }
                    if (_mpEntries.length === 0) _mpEntries = [{ permitNo: '', dateIssued: '', expiryDate: '' }];
                    _mpEntries.forEach(function(_mpEntry, _mpIdx) {
                        var _mpIsFirst = _mpIdx === 0;
                        var _mpPn = p.name.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
                        var _mpRn = row.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
                        if (!_mpIsFirst) {
                            html += '<tr style="' + rowStyle + '"><td style="width:' + typeColumnWidth + ';min-width:' + typeColumnWidth + ';max-width:' + typeColumnWidth + ';text-align:left;font-weight:700;background:#e8f5e9;position:sticky;left:0;z-index:5;white-space:normal;padding:8px 12px;line-height:1.3;vertical-align:middle;">';
                            html += '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">';
                            html += '<span style="flex:1;font-size:0.78rem;color:#555;">' + _mpShort + ' #' + (_mpIdx+1) + '</span>';
                            if (inputsEditable) html += '<span onclick="removeMultiPermitEntry(\'' + _mpPn + '\',\'' + _mpRn + '\',' + _mpIdx + ')" style="display:inline-flex;align-items:center;justify-content:center;cursor:pointer;font-size:0.6rem;font-weight:700;padding:2px 7px;border-radius:20px;border:1.5px solid #ef5350;color:#ef5350;background:transparent;user-select:none;">&#10005; Remove</span>';
                            html += '</div></td>';
                            html += '<td style="background:' + (isPermitClientProvided?'#dceefb':isPermitNA?'#eeeeee':'') + '"></td>';
                            html += '<td style="background:' + (isPermitClientProvided?'#dceefb':isPermitNA?'#eeeeee':'') + '"></td>';
                        }
                        var _mpNo  = _mpEntry.permitNo || '';
                        var _mpIss = _mpEntry.dateIssued || '';
                        var _mpExp = _mpEntry.expiryDate || '';
                        html += '<td style="min-width:200px;padding:8px 12px;"><input type="text" placeholder="Permit/Accreditation #" value="' + _mpNo + '" ' + naDisabled + ' oninput="updateMultiPermitEntry(\'' + _mpPn + '\',\'' + _mpRn + '\',' + _mpIdx + ',\'permitNo\',this.value)" style="width:100%;"></td>';
                        html += '<td style="min-width:140px;padding:8px 12px;"><input type="date" value="' + _mpIss + '" ' + naDisabled + ' oninput="updateMultiPermitEntry(\'' + _mpPn + '\',\'' + _mpRn + '\',' + _mpIdx + ',\'dateIssued\',this.value)" style="width:100%;"></td>';
                        var _mpNoExpiry = (window.NO_EXPIRY_PERMITS || []).includes(row);
                        if (_mpNoExpiry) {
                            html += '<td style="min-width:140px;padding:8px 12px;position:relative;text-align:center;vertical-align:middle;"><span class="until-completion-text" style="font-size:0.7rem;font-weight:500;white-space:nowrap;">Until Project Completion</span>';
                        } else {
                            html += '<td style="min-width:140px;padding:8px 12px;position:relative;"><input type="date" value="' + _mpExp + '" data-allow-future ' + naDisabled + ' oninput="updateMultiPermitEntry(\'' + _mpPn + '\',\'' + _mpRn + '\',' + _mpIdx + ',\'expiryDate\',this.value)" style="width:100%;">';
                        }
                        if (_mpIsFirst && inputsEditable) html += '<button onclick="addMultiPermitEntry(\'' + _mpPn + '\',\'' + _mpRn + '\')" class="permit-add-btn" data-tooltip="Add ' + _mpShort + ' entry"><i class="fas fa-plus"></i></button>';
                        html += '</td>';
                    });
                    } // end !isPermitClientProvided for multi-entry
                } else {
                    const permitNo  = p.vals[key] ? (p.vals[key][1] ?? "") : "";
                    const dateIssued = p.vals[key] ? (p.vals[key][2] ?? "") : "";
                    const expiryDate = p.vals[key] ? (p.vals[key][3] ?? "") : "";
                    const _isNoExpiry = (window.NO_EXPIRY_PERMITS || []).includes(row);
                    const _safeKey = key.replace(/'/g, "\\'");
                    {
                        html += `<td style="min-width: 200px; padding: 8px 12px;"><input type="text" placeholder="Permit/Accreditation #" value="${permitNo}" ${inputsEditable ? '' : 'disabled'} oninput="updateVal('${p.name}','${_safeKey}',1,this.value)" style="width: 100%;"></td>`;
                        html += `<td style="min-width: 140px; padding: 8px 12px;"><input type="date" value="${dateIssued}" ${naDisabled} oninput="updateVal('${p.name}','${_safeKey}',2,this.value)" style="width: 100%;"></td>`;
                        if (_isNoExpiry) {
                            html += `<td style="min-width: 140px; padding: 8px 12px; text-align:center; vertical-align:middle;"><span class="until-completion-text" style="font-size:0.7rem;font-weight:500;white-space:nowrap;">Until Project Completion</span></td>`;
                        } else {
                            html += `<td style="min-width: 140px; padding: 8px 12px;"><input type="date" value="${expiryDate}" data-allow-future ${naDisabled} oninput="updateVal('${p.name}','${_safeKey}',3,this.value)" style="width: 100%;"></td>`;
                        }
                    }
                } // end else (not client-provided / not N/A)
            } else if (state.currentTab === 'emb') {
                if (row === "SMR (Quarterly) - Submission Date") {
                    const _nowQ = Math.ceil((new Date().getMonth() + 1) / 3); // current quarter 1-4
                    const _selYr = state.selectedYear || new Date().getFullYear();
                    const _isThisYear = _selYr === new Date().getFullYear();
                    const _now = new Date();
                    function _smrQDeadlinePassed(q) {
                        if (!_isThisYear) return _selYr < _now.getFullYear(); // past year = all overdue
                        if (q === 4) {
                            const dlY = _selYr + 1;
                            if (_now.getFullYear() > dlY) return true;
                            if (_now.getFullYear() === dlY && (_now.getMonth() > 0 || (_now.getMonth() === 0 && _now.getDate() > 15))) return true;
                            return false;
                        }
                        const dlMonth0 = q * 3; // 0-based: Q1=3,Q2=6,Q3=9
                        if (_now.getMonth() > dlMonth0) return true;
                        if (_now.getMonth() === dlMonth0 && _now.getDate() > 15) return true;
                        return false;
                    }
                    for (let i = 1; i <= 4; i++) {
                        const v = p.vals[key] ? (p.vals[key][i] ?? "") : "";
                        const _isFutureQ = _isThisYear && i > _nowQ;
                        const _deadlinePassed = _smrQDeadlinePassed(i);
                        const _qBg = v ? 'background:#e8f5e9;' : (_deadlinePassed ? 'background:#ffebee;' : 'background:#f5f5f5;opacity:0.65;');
                        const _qInputStyle = `style="width:100%;border:1.5px solid ${v?'#a5d6a7':(_deadlinePassed?'#ef9a9a':'var(--border-color)')};border-radius:4px;padding:2px 3px;background:${v?'#f1fff1':(_deadlinePassed?'#fff5f5':'var(--input-bg)')};color:${v?'#2e7d32':(_deadlinePassed?'#c62828':'var(--text-secondary)')};font-size:0.72rem;"`;
                        const _qDeadlineLabel = i===4 ? `Jan 15, ${_selYr+1}` : ['','Apr 15','Jul 15','Oct 15','Jan 15'][i]+`, ${_selYr}`;
                        html += `<td class="monthly-data" style="${_qBg}" title="Q${i} Deadline: ${_qDeadlineLabel}"><input type="date" value="${v}" ${(inputsEditable && !_isFutureQ) ? '' : 'disabled'} ${_qInputStyle} oninput="updateVal('${p.name}','${key}',${i},this.value);_refreshDateCell(this)"></td>`;
                    }
                } else if (row === "SMR (Quarterly) - Reference No.") {
                    for (let i = 1; i <= 4; i++) {
                        const v = p.vals[key] ? (p.vals[key][i] ?? "") : "";
                        html += `<td class="monthly-data"><input type="text" placeholder="Ref #" value="${v}" ${inputsEditable ? '' : 'disabled'} oninput="updateVal('${p.name}','${key}',${i},this.value)"></td>`;
                    }
                } else if (row === "CMR (Semi-Annual) - Submission Date") {
                    const _nowM = new Date().getMonth() + 1; // 1-12
                    const _selYr = state.selectedYear || new Date().getFullYear();
                    const _isThisYear = _selYr === new Date().getFullYear();
                    const v1 = p.vals[key] ? (p.vals[key][1] ?? "") : "";
                    const _p1Due = !_isThisYear || _nowM >= 7;
                    const _p1Bg = _isThisYear ? (v1 ? 'background:#e8f5e9;' : (_p1Due ? 'background:#ffebee;' : '')) : '';
                    const _p1Style = _isThisYear ? `border:1.5px solid ${v1?'#a5d6a7':(_p1Due?'#ef9a9a':'var(--border-color)')};border-radius:4px;padding:3px 6px;background:${v1?'#f1fff1':(_p1Due?'#fff5f5':'var(--input-bg)')};color:${v1?'#2e7d32':(_p1Due?'#c62828':'var(--text-primary)')};width:180px;` : 'width:180px;';
                    html += `<td colspan="2" style="text-align: center; border-right: 2px solid #ddd;${_p1Bg}">
                        <div style="font-size: 0.7rem; color: #666; margin-bottom: 4px; font-weight: 600;">Jan-Jun (Due: Jul 15)</div>
                        <input type="date" value="${v1}" ${inputsEditable ? '' : 'disabled'} oninput="updateVal('${p.name}','${key}',1,this.value);_refreshDateCell(this)" style="${_p1Style}">
                    </td>`;
                    const v2 = p.vals[key] ? (p.vals[key][2] ?? "") : "";
                    const _p2DlYear = _selYr + 1;
                    const _p2Now = new Date();
                    const _p2Overdue = _p2Now.getFullYear() > _p2DlYear ||
                        (_p2Now.getFullYear() === _p2DlYear && (_p2Now.getMonth() > 0 || (_p2Now.getMonth() === 0 && _p2Now.getDate() > 15)));
                    const _p2Bg = _isThisYear ? (v2 ? 'background:#e8f5e9;' : (_p2Overdue ? 'background:#ffebee;' : '')) : '';
                    const _p2Style = _isThisYear ? `border:1.5px solid ${v2?'#a5d6a7':(_p2Overdue?'#ef9a9a':'var(--border-color)')};border-radius:4px;padding:3px 6px;background:${v2?'#f1fff1':(_p2Overdue?'#fff5f5':'var(--input-bg)')};color:${v2?'#2e7d32':(_p2Overdue?'#c62828':'var(--text-primary)')};width:180px;` : 'width:180px;';
                    html += `<td colspan="2" style="text-align: center;${_p2Bg}">
                        <div style="font-size: 0.7rem; color: #666; margin-bottom: 4px; font-weight: 600;">Jul-Dec (Due: Jan 15)</div>
                        <input type="date" value="${v2}" ${inputsEditable ? '' : 'disabled'} oninput="updateVal('${p.name}','${key}',2,this.value);_refreshDateCell(this)" style="${_p2Style}">
                    </td>`;
                } else if (row === "CMR (Semi-Annual) - Reference No.") {
                    const v1 = p.vals[key] ? (p.vals[key][1] ?? "") : "";
                    html += `<td colspan="2" style="text-align: center; border-right: 2px solid #ddd;">
                        <div style="font-size: 0.7rem; color: #666; margin-bottom: 4px; font-weight: 600;">Jan-Jun</div>
                        <input type="text" placeholder="Ref #" value="${v1}" ${inputsEditable ? '' : 'disabled'} oninput="updateVal('${p.name}','${key}',1,this.value)" style="width: 180px;">
                    </td>`;
                    const v2 = p.vals[key] ? (p.vals[key][2] ?? "") : "";
                    html += `<td colspan="2" style="text-align: center;">
                        <div style="font-size: 0.7rem; color: #666; margin-bottom: 4px; font-weight: 600;">Jul-Dec</div>
                        <input type="text" placeholder="Ref #" value="${v2}" ${inputsEditable ? '' : 'disabled'} oninput="updateVal('${p.name}','${key}',2,this.value)" style="width: 180px;">
                    </td>`;
                }
            } else {
                const isDole = state.currentTab === 'dole';
                
                if (isDole && (row === 'AEDR' || row === 'AMR')) {
                    const v = p.vals[key] ? (p.vals[key][1] ?? "") : "";
                    html += `<td colspan="12" style="text-align: center;"><input type="date" value="${v}" ${inputsEditable ? '' : 'disabled'} oninput="updateVal('${p.name}','${key}',1,this.value)" style="width: 180px;"></td>`;
                } else if (state.currentTab === 'activities' && (row === 'Drills Conducted' || row === 'Training Conducted')) {
                    // ── CORPORATE Training Conducted: manual input (no training calendar to source from) ──
                    if (row === 'Training Conducted' && p.region === 'CORPORATE') {
                        const _now = new Date();
                        const _curYear = _now.getFullYear();
                        const _selYear = state.selectedYear || _curYear;
                        for (let mi = 0; mi < 12; mi++) {
                            const _mIdx = mi + 1; // vals array is 1-based for months
                            const vRaw = p.vals[key] ? (p.vals[key][_mIdx] ?? '') : '';
                            const vFmt = vRaw !== '' && !isNaN(vRaw) ? (parseFloat(vRaw) === 0 ? '0' : fmtNum(parseFloat(vRaw))) : (vRaw || '');
                            const _isFutureMo = _selYear > _curYear || (_selYear === _curYear && mi > _now.getMonth());
                            const _cellDis = (!inputsEditable || _isFutureMo) ? 'disabled' : '';
                            const _futureSt = _isFutureMo ? 'style="background:#f5f5f5;opacity:0.65;"' : '';
                            html += `<td class="monthly-data" ${_futureSt}><input type="text" inputmode="decimal" data-num value="${vFmt}" ${_cellDis} oninput="numFmtInput(this, function(v){updateVal('${p.name}','${key}',${_mIdx},v)})" title="Training Conducted — manual input for Corporate Region"></td>`;
                        }
                    } else {
                    const eshStor = getEshStorage();
                    const projName = p.name;
                    const _now = new Date();
                    const _curYear = _now.getFullYear();
                    const _curMonth = _now.getMonth(); // 0-based, same as mi
                    const _selYear = state.selectedYear || _curYear;

                    for (let mi = 0; mi < 12; mi++) {
                        let count = 0;
                        const _eshYear3 = state.selectedYear || new Date().getFullYear();
                        if (row === 'Drills Conducted') {
                            ESH_DRILLS.forEach((drill, di) => {
                                const _dsi3 = getDrillStorageIdx(drill, di);
                                const _ny3 = (state&&state.selectedYear)||2026; const naCellKey3 = `${_ny3}|esh-calendar-drills|${projName}|${_dsi3}|${mi}|na`;
                                if (eshStor[naCellKey3]) return; // skip N/A cells
                                const ak = `${_eshYear3}|esh-calendar-drills|${projName}|${_dsi3}|${mi}|actual`;
                                if (eshStor[ak] && eshStor[`${_eshYear3}|esh-calendar-drills|GLOBAL_PLAN|${_dsi3}|${mi}|plan`]) count++;
                            });
                            // ── CORPORATE Drills: also count corp-drills actuals for CORPORATE project ──
                            if (p.region === 'CORPORATE') {
                                const _corpBase3 = window.CORP_DRILLS || [];
                                const _corpCustom3 = (typeof getCorpDrillCustomRows === 'function') ? getCorpDrillCustomRows() : [];
                                _corpBase3.forEach((_cd3, _cdi3) => {
                                    const _cak3 = `${_eshYear3}|esh-calendar-corp-drills|${projName}|${_cdi3}|${mi}|actual`;
                                    if (eshStor[_cak3] && eshStor[`${_eshYear3}|esh-calendar-corp-drills|GLOBAL_PLAN|${_cdi3}|${mi}|plan`]) count++;
                                });
                                _corpCustom3.forEach((_ccr3, _cci3) => {
                                    const _cak3c = `${_eshYear3}|esh-calendar-corp-drills|${projName}|${1000 + _cci3}|${mi}|actual`;
                                    if (eshStor[_cak3c] && eshStor[`${_eshYear3}|esh-calendar-corp-drills|GLOBAL_PLAN|${1000 + _cci3}|${mi}|plan`]) count++;
                                });
                            }
                        } else {
                            const _8HR_LABEL3 = '8-Hr Mandatory OSH Training';
                            ['esh-calendar-env','esh-calendar-safety','esh-calendar-health'].forEach(tt => {
                                (ESH_TRAININGS[tt] || []).forEach((tr, ti) => {
                                    // Skip 8-Hr OSH N/A months
                                    if (tr === _8HR_LABEL3) {
                                        const _naK3 = `${_eshYear3}|${tt}|${projName}|${ti}|na_row`;
                                        const _naF3 = eshStor[_naK3] !== undefined ? parseInt(eshStor[_naK3]) : -1;
                                        if (_naF3 >= 0 && mi >= _naF3) return;
                                    }
                                    const ak = `${_eshYear3}|${tt}|${projName}|${ti}|${mi}|actual`;
                                    if (eshStor[ak] && eshStor[`${_eshYear3}|${tt}|GLOBAL_PLAN|${ti}|${mi}|plan`]) count++;
                                });
                            });
                        }

                        const isPast = _selYear < _curYear || (_selYear === _curYear && mi < _curMonth);
                        const isCurrent = _selYear === _curYear && mi === _curMonth;

                        const showZero = (isPast || isCurrent) && count === 0;
                        const disp = count > 0 ? count : (showZero ? '0' : '');
                        const dispColor = count > 0 ? '#2e7d32' : (showZero ? '#999' : '#bbb');
                        const dispWeight = count > 0 ? '700' : (showZero ? '600' : '400');
                        const bgColor = count > 0 ? 'rgba(46,125,50,0.1)' : (showZero ? 'rgba(0,0,0,0.02)' : '');

                        html += `<td class="monthly-data" style="text-align:center;background:${bgColor};cursor:default;" title="Auto-computed from ESH Calendar &amp; Drills — cannot be edited manually">
                            <span style="font-weight:${dispWeight};color:${dispColor};font-size:0.8rem;">
                                ${disp}${count>0?'<i class="fas fa-lock" style="font-size:0.5rem;margin-left:3px;opacity:0.5;vertical-align:middle;"></i>':''}
                            </span>
                        </td>`;
                    }
                    } // end CORPORATE Training Conducted manual / auto branch
                } else if (state.currentTab === 'exposures' && row === 'Total Exposed Man-hour to date') {
                    const _toDateSeries = computeExposureToDateSeries(p);
                    for (let i = 1; i <= 12; i++) {
                        const cumulative = _toDateSeries[i];
                        const _finBlank = isMonthAfterProjectFinish(p, i, state.selectedYear || new Date().getFullYear()); // finished project: no autofill after the finish month
                        const displayVal = (isExposureMonthHidden(i) || _finBlank) ? '' : (cumulative > 0 ? fmtNum(cumulative) : (cumulative === 0 ? '0' : ''));
                        html += `<td class="monthly-data" data-todate-proj="${p.name}" data-todate-month="${i}" style="text-align:center;" title="Auto-computed: Previous + sum of Total Exposed Manhour up to this month">
                            <span data-todate-proj="${p.name}" data-todate-month="${i}" style="font-size:0.7rem;color:var(--text-primary);font-weight:700;">${displayVal}</span>
                        </td>`;
                    }
                } else if (state.currentTab === 'rates' && ['LTIR','TRIR','SEVERITY RATE'].includes(row)) {
                    const _rateStdLabel = (state.ratesStandard === 'osha') ? 'OSHA 200K, cumulative YTD' : 'OSHS 1M, cumulative YTD';
                    const _cs = window.buildCumulativeSeries([p], 12);
                    for (let i = 1; i <= 12; i++) {
                        let val = null;
                        const color = '#1b5e20';
                        if (i <= _cs.last) {
                            val = window.calcCumRate(row, _cs.lta[i], _cs.rec[i], _cs.dl[i], _cs.mh[i]);
                            // Man-hours are 0 but the project is active (has manpower): rate is 0.
                            if (val === null && _cs.act[i]) val = 0;
                        }
                        if (val !== null) {
                            if (!p.vals[key]) p.vals[key] = new Array(14).fill('');
                            p.vals[key][i] = window.formatRate(row, val);
                        }
                        const disp = val !== null ? window.formatRate(row, val) : '';
                        const _cTip = val !== null ? window.rateCompTipCum(row, _cs, i) : (getNoDataMonthTip(p, i, state.selectedYear, 'rate') || 'Cannot be edited. Auto-computed (' + _rateStdLabel + ' base).');
                        html += `<td class="monthly-data" style="text-align:center;background:${val !== null && val > 0 ? 'rgba(27,94,32,0.04)' : ''};cursor:help;" title="${_cTip}"${val !== null ? ' data-tip-nowrap' : ''}>
                            ${val !== null
                                ? `<div style="font-size:0.72rem;">${disp}</div>`
                                : `<div style="font-size:0.62rem;color:#ccc;font-style:italic;">—</div>`
                            }
                        </td>`;
                    }
                } else {
                    const _medAutoRows = ['LTA', 'Medical Treatment', 'First Aid', 'Fatality', 'High-Potential incident', 'Dangerous Occurrences', 'No. of Identified Near-Miss', 'Days Lost/Charged'];
                    if ((state.currentTab === 'medical' || state.currentTab === 'activities') && _medAutoRows.includes(row)) {
                        const _medNow = new Date();
                        const _medCurYear = _medNow.getFullYear();
                        const _medCurMonth = _medNow.getMonth() + 1; // 1-based
                        const _medSelYear = state.selectedYear || _medCurYear;
                        for (let i = 1; i <= 12; i++) {
                            const v = parseFloat(p.vals[key]?.[i]) || 0;
                            const _medIsPast = _medSelYear < _medCurYear || (_medSelYear === _medCurYear && i < _medCurMonth);
                            const _medShowZero = _medIsPast; // past months show 0; current (ongoing) and future months show a dash
                            const _medDisp = v > 0 ? v : (_medShowZero ? '0' : '—');
                            const _medColor = v > 0 ? '#1b5e20' : (_medShowZero ? '#bbb' : '#ddd');
                            const _medWeight = v > 0 ? '800' : '600';
                            const _medBg = v > 0 ? 'rgba(27,94,32,0.07)' : '';
                            // Tooltip: one line per incident (AIIR title + date of incident); falls back to the old note when there is nothing to list
                            const _medTipTxt = (v > 0 && typeof window.eshMedCellTip === 'function') ? window.eshMedCellTip(p, row, i, _medSelYear) : '';
                            const _medTitleAttr = _medTipTxt
                                ? ` title="${_medTipTxt.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/\n/g,'&#10;')}" data-tip-nowrap`
                                : ` title="Auto-computed from Incident &amp; Accident Registry — cannot be edited manually"`;
                            html += `<td class="monthly-data" style="text-align:center;background:${_medBg};cursor:default;"${_medTitleAttr}>
                                <span style="font-weight:${_medWeight};color:${_medColor};font-size:0.72rem;">
                                    ${_medDisp}${v > 0 ? '<i class="fas fa-lock" style="font-size:0.5rem;margin-left:3px;opacity:0.5;vertical-align:middle;"></i>' : ''}
                                </span>
                            </td>`;
                        }
                    } else {
                    function _isMoBlacklisted(monthIdx1Based) {
                        const _blkYr = state.selectedYear || new Date().getFullYear();
                        // Total Exposures + ESH Activities and Programs: resume month is open for input
                        // (see isMonthLockedForExposure). e.g. resumed 15 Sep → Sep is enabled.
                        return (state.currentTab === 'exposures' || state.currentTab === 'activities')
                            ? isMonthLockedForExposure(p, monthIdx1Based, _blkYr)
                            : isMonthBlacklistedForProject(p, monthIdx1Based, _blkYr);
                    }
                    for (let i = 1; i <= 12; i++) {
                        const _finStale = state.currentTab === 'exposures' && row === 'No. of Days w/o LTA' && isMonthAfterProjectFinish(p, i, state.selectedYear || new Date().getFullYear()); // finished project: hide stale Days w/o LTA after the finish month
                        const v = (isExposureMonthHidden(i) || _finStale) ? "" : (p.vals[key] ? (p.vals[key][i] ?? "") : "");
                        const vFmt = (!isDateType && v !== '') ? fmtNum(v) : v;
                        const _isFutureMonth = i > _curMonth || isExposureMonthHidden(i);
                        const _isCurrentMonth = i === _curMonth;
                        const _isPastMonth = i < _curMonth;
                        const _wsBlocked = _isMoBlacklisted(i);
                        if (_wsBlocked) {
                            const _notYetStarted = isMonthBeforeProjectStart(p, i, state.selectedYear || new Date().getFullYear());
                            const _wsTip = getMonthExemptTip(p, i, state.selectedYear || new Date().getFullYear()).replace(/"/g, '&quot;');
                            html += `<td class="${isNov ? 'nov-narrow-td' : (isDole ? 'dole-narrow-td' : 'monthly-data')}" style="background:#f0f0f0;cursor:not-allowed;" title="${_wsTip}"><input type="${isDateType ? 'date' : 'text'}" value="${vFmt}" disabled style="width:100%;background:#e8e8e8;color:#aaa;border:1px solid #ddd;border-radius:4px;padding:2px 3px;font-size:0.72rem;cursor:not-allowed;"></td>`;
                            continue;
                        }
                        const _cellDisabled = (!inputsEditable || _isFutureMonth) ? 'disabled' : '';
                        const _futureTip = _isFutureMonth ? ` title="Input locked — ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i-1]} ${i > _curMonth ? 'has not arrived yet' : 'is still ongoing'}"` : '';

                        const _selYear = state.selectedYear || new Date().getFullYear();
                        const _realCurYear = new Date().getFullYear();
                        const _isCurrentYear = _selYear === _realCurYear;

                        // ── DOLE deadline-aware overdue check ─────────────────────────────────
                        // Red only if the actual DOLE submission deadline has PASSED:
                        //   WAIR / MOM / RSO : due on the 20th of the FOLLOWING month
                        //   (AEDR & AMR are annual — handled separately above)
                        // For other tabs, the original logic still applies (_isCurrentMonth || _isPastMonth).
                        function _isDoleDeadlinePassed(monthIdx1Based) {
                            const _now = new Date();
                            const _nowY = _now.getFullYear();
                            const _nowM = _now.getMonth() + 1; // 1-based
                            const _nowD = _now.getDate();
                            if (_selYear < _nowY) return true;   // past year → all overdue
                            if (_selYear > _nowY) return false;  // future year → none overdue
                            // Current year: deadline = 20th of following month
                            const _dlMonth1 = monthIdx1Based === 12 ? 1 : monthIdx1Based + 1;
                            const _dlYear   = monthIdx1Based === 12 ? _nowY + 1 : _nowY;
                            if (_nowY > _dlYear) return true;
                            if (_nowY === _dlYear) {
                                if (_nowM > _dlMonth1) return true;
                                if (_nowM === _dlMonth1 && _nowD > 20) return true;
                            }
                            return false;
                        }

                        const _isOverdue = (isDole && isDateType)
                            ? _isDoleDeadlinePassed(i)
                            : (_isCurrentMonth || _isPastMonth); // original logic for non-DOLE tabs

                        let _dateCellStyle = '';
                        if (isDateType && _isCurrentYear) {
                            if (_isFutureMonth) {
                                _dateCellStyle = 'background:#f5f5f5;opacity:0.65;';
                            } else if (!v && _isOverdue) {
                                _dateCellStyle = 'background:#ffebee;';
                            }
                        } else if (!isDateType && _isFutureMonth) {
                            _dateCellStyle = 'background:#f5f5f5;opacity:0.65;';
                        }

                        const _dateInputStyle = (isDateType && _isCurrentYear && !_isFutureMonth)
                            ? `style="width:100%;border:1.5px solid ${v ? '#a5d6a7' : _isOverdue ? '#ef9a9a' : 'var(--border-color)'};border-radius:4px;padding:2px 3px;font-size:0.72rem;background:${v ? '#c8e6c9' : _isOverdue ? '#fff5f5' : 'var(--input-bg)'};color:${v ? '#2e7d32' : _isOverdue ? '#c62828' : 'var(--text-primary)'};"`
                            : '';

                        html += `<td class="${isNov ? 'nov-narrow-td' : (isDole ? 'dole-narrow-td' : 'monthly-data')}" style="${_dateCellStyle}"><input type="${isDateType ? 'date' : 'text'}" ${isDateType ? '' : 'inputmode="decimal" data-num'} ${_isExpTbl ? 'placeholder="—"' : ''} value="${vFmt}" ${_cellDisabled}${_futureTip} ${_dateInputStyle} ${isDateType ? `oninput="updateVal('${p.name}','${key}',${i},this.value);_refreshDateCell(this)"` : `oninput="numFmtInput(this, function(v){updateVal('${p.name}','${key}',${i},v)})"`}></td>`;
                    }
                    } // end else normal monthly columns
                }
            }
            
            if (hasYTD) {
                let ytdValue = 0;
                if (row === "Total Manpower") {
                    ytdValue = calculateAverage(p.vals[key], rowIdx);
                    html += `<td class="average-cell">${fmtNum(ytdValue)}</td>`;
                } else if (state.currentTab === 'activities' && (row === 'Drills Conducted' || row === 'Training Conducted')) {
                    // ── CORPORATE Training Conducted: YTD = sum of manually entered monthly vals ──
                    if (row === 'Training Conducted' && p.region === 'CORPORATE') {
                        for (let _mIdx = 1; _mIdx <= 12; _mIdx++) {
                            const _v = parseFloat(p.vals[key] ? (p.vals[key][_mIdx] ?? '') : '') || 0;
                            ytdValue += _v;
                        }
                    } else {
                    const eshStor = getEshStorage();
                    const _eshYear4 = state.selectedYear || new Date().getFullYear();
                    for (let mi = 0; mi < 12; mi++) {
                        if (row === 'Drills Conducted') {
                            ESH_DRILLS.forEach((drill, di) => {
                                const _dsi4 = getDrillStorageIdx(drill, di);
                                const _ny4 = (state&&state.selectedYear)||2026; const naCellKey4 = `${_ny4}|esh-calendar-drills|${p.name}|${_dsi4}|${mi}|na`;
                                if (eshStor[naCellKey4]) return; // skip N/A cells
                                if (eshStor[`${_eshYear4}|esh-calendar-drills|${p.name}|${_dsi4}|${mi}|actual`] && eshStor[`${_eshYear4}|esh-calendar-drills|GLOBAL_PLAN|${_dsi4}|${mi}|plan`]) ytdValue++;
                            });
                            // ── CORPORATE Drills: also count corp-drills actuals for CORPORATE project ──
                            if (p.region === 'CORPORATE') {
                                const _corpBase4 = window.CORP_DRILLS || [];
                                const _corpCustom4 = (typeof getCorpDrillCustomRows === 'function') ? getCorpDrillCustomRows() : [];
                                _corpBase4.forEach((_cd4, _cdi4) => {
                                    const _cak4 = `${_eshYear4}|esh-calendar-corp-drills|${p.name}|${_cdi4}|${mi}|actual`;
                                    if (eshStor[_cak4] && eshStor[`${_eshYear4}|esh-calendar-corp-drills|GLOBAL_PLAN|${_cdi4}|${mi}|plan`]) ytdValue++;
                                });
                                _corpCustom4.forEach((_ccr4, _cci4) => {
                                    const _cak4c = `${_eshYear4}|esh-calendar-corp-drills|${p.name}|${1000 + _cci4}|${mi}|actual`;
                                    if (eshStor[_cak4c] && eshStor[`${_eshYear4}|esh-calendar-corp-drills|GLOBAL_PLAN|${1000 + _cci4}|${mi}|plan`]) ytdValue++;
                                });
                            }
                        } else {
                            const _8HR_LABEL4 = '8-Hr Mandatory OSH Training';
                            ['esh-calendar-env','esh-calendar-safety','esh-calendar-health'].forEach(tt => {
                                (ESH_TRAININGS[tt] || []).forEach((tr, ti) => {
                                    // Skip 8-Hr OSH N/A months
                                    if (tr === _8HR_LABEL4) {
                                        const _naK4 = `${_eshYear4}|${tt}|${p.name}|${ti}|na_row`;
                                        const _naF4 = eshStor[_naK4] !== undefined ? parseInt(eshStor[_naK4]) : -1;
                                        if (_naF4 >= 0 && mi >= _naF4) return;
                                    }
                                    if (eshStor[`${_eshYear4}|${tt}|${p.name}|${ti}|${mi}|actual`] && eshStor[`${_eshYear4}|${tt}|GLOBAL_PLAN|${ti}|${mi}|plan`]) ytdValue++;
                                });
                            });
                        }
                    }
                    } // end CORPORATE Training Conducted YTD branch
                    html += `<td class="ytd-cell" style="color:${ytdValue>0?'#2e7d32':''};">${ytdValue > 0 ? fmtNum(ytdValue) : ''}</td>`;
                } else if (state.currentTab === 'exposures' && row === 'Total Exposed Man-hour to date') {
                    const _cum = computeExposureToDateSeries(p)[12];
                    html += `<td class="ytd-cell" data-todate-proj="${p.name}" data-todate-month="ytd">${_cum > 0 ? fmtNum(_cum) : ''}</td>`;
                } else if (state.currentTab === 'rates' && ['LTIR','TRIR','SEVERITY RATE'].includes(row)) {
                    const _cs = window.buildCumulativeSeries([p], 12);
                    const ytdMh = _cs.mh[12];
                    let ytdRate = 0;
                    if (ytdMh > 0) ytdRate = window.calcCumRate(row, _cs.lta[12], _cs.rec[12], _cs.dl[12], ytdMh) || 0;
                    const ytdColor = '#1b5e20';
                    html += `<td class="ytd-cell"${ytdMh > 0 ? ' style="cursor:help;" title="' + window.rateCompTipCum(row, _cs, 12) + '" data-tip-nowrap' : ''}>
                        ${ytdMh > 0 ? window.formatRate(row, ytdRate) : ''}
                    </td>`;
                } else {
                    ytdValue = calculateYTD(p.vals[key], rowIdx, row, p);
                    html += `<td class="ytd-cell">${fmtNum(ytdValue)}</td>`;
                }
            }
        }
        html += `</tr>`;

        if (state.currentTab === 'emb') {
            const _isSmrRef = (rowIdx === 1); // "SMR (Quarterly) - Reference No."
            const _isCmrRef = (rowIdx === 3); // "CMR (Semi-Annual) - Reference No."
            if (_isSmrRef || _isCmrRef) {
                const _eType = _isSmrRef ? 'SMR' : 'CMR';
                const _eKey  = _isSmrRef ? 'emb_extra_smr' : 'emb_extra_cmr';
                const _extras = p.vals[_eKey] || [];
                const _ePnSafe = p.name.replace(/'/g, "\\'");
                const _typeW = typeColumnWidth;

                _extras.forEach((entry, ei) => {
                    const _eNum = ei + 2;
                    const _entryLabel = _isSmrRef
                        ? `SMR (Quarterly) <span style="font-size:0.7em;opacity:0.65;font-weight:600;">#${_eNum}</span>`
                        : `CMR (Semi-Annual) <span style="font-size:0.7em;opacity:0.65;font-weight:600;">#${_eNum}</span>`;
                    const _removeBtnHtml = inputsEditable
                        ? `<button onclick="removeEmbEntry('${_ePnSafe}','${_eType}',${ei})"
                               style="background:transparent;border:1.5px solid #ef5350;color:#ef5350;border-radius:50%;width:20px;height:20px;min-width:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:0.6rem;flex-shrink:0;transition:background 0.15s;"
                               onmouseover="this.style.background='#ef5350';this.style.color='white';"
                               onmouseout="this.style.background='transparent';this.style.color='#ef5350';"
                               title="Remove this ${_eType} entry #${_eNum}">
                               <i class="fas fa-times"></i>
                           </button>`
                        : '';
                    const _tdTypeStyle = `width:${_typeW}; min-width:${_typeW}; max-width:${_typeW}; text-align:left; font-weight:700; background:#e8f5e9; position: sticky; left: 0; z-index: 5; white-space: normal; padding: 10px 12px; line-height: 1.3; vertical-align: middle; border-left: 3px solid #81c784;`;

                    html += `<tr>
                        <td style="${_tdTypeStyle}">
                            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                                <span style="flex:1;">${_entryLabel} - Submission Date</span>
                                ${_removeBtnHtml}
                            </div>
                        </td>`;
                    if (_isSmrRef) {
                        for (let _qi = 1; _qi <= 4; _qi++) {
                            const _v = (entry.sd && entry.sd[_qi]) ? entry.sd[_qi] : '';
                            html += `<td class="monthly-data"><input type="date" value="${_v}" ${inputsEditable ? '' : 'disabled'} oninput="updateEmbEntry('${_ePnSafe}','SMR',${ei},'sd','${_qi}',this.value)"></td>`;
                        }
                    } else {
                        const _v1 = (entry.sd && entry.sd[1]) ? entry.sd[1] : '';
                        const _v2 = (entry.sd && entry.sd[2]) ? entry.sd[2] : '';
                        html += `<td colspan="2" style="text-align:center;border-right:2px solid #ddd;">
                            <div style="font-size:0.7rem;color:#666;margin-bottom:4px;font-weight:600;">Jan-Jun (Due: Jul 15)</div>
                            <input type="date" value="${_v1}" ${inputsEditable ? '' : 'disabled'} oninput="updateEmbEntry('${_ePnSafe}','CMR',${ei},'sd','1',this.value)" style="width:180px;">
                        </td>`;
                        html += `<td colspan="2" style="text-align:center;">
                            <div style="font-size:0.7rem;color:#666;margin-bottom:4px;font-weight:600;">Jul-Dec (Due: Jan 15)</div>
                            <input type="date" value="${_v2}" ${inputsEditable ? '' : 'disabled'} oninput="updateEmbEntry('${_ePnSafe}','CMR',${ei},'sd','2',this.value)" style="width:180px;">
                        </td>`;
                    }
                    html += `</tr>`;

                    html += `<tr>
                        <td style="${_tdTypeStyle}">
                            <div style="display:flex;align-items:center;gap:8px;">
                                <span style="flex:1;">${_entryLabel} - Reference No.</span>
                            </div>
                        </td>`;
                    if (_isSmrRef) {
                        for (let _qi = 1; _qi <= 4; _qi++) {
                            const _v = (entry.rn && entry.rn[_qi]) ? entry.rn[_qi] : '';
                            html += `<td class="monthly-data"><input type="text" placeholder="Ref #" value="${_v}" ${inputsEditable ? '' : 'disabled'} oninput="updateEmbEntry('${_ePnSafe}','SMR',${ei},'rn','${_qi}',this.value)"></td>`;
                        }
                    } else {
                        const _v1 = (entry.rn && entry.rn[1]) ? entry.rn[1] : '';
                        const _v2 = (entry.rn && entry.rn[2]) ? entry.rn[2] : '';
                        html += `<td colspan="2" style="text-align:center;border-right:2px solid #ddd;">
                            <div style="font-size:0.7rem;color:#666;margin-bottom:4px;font-weight:600;">Jan-Jun</div>
                            <input type="text" placeholder="Ref #" value="${_v1}" ${inputsEditable ? '' : 'disabled'} oninput="updateEmbEntry('${_ePnSafe}','CMR',${ei},'rn','1',this.value)" style="width:180px;">
                        </td>`;
                        html += `<td colspan="2" style="text-align:center;">
                            <div style="font-size:0.7rem;color:#666;margin-bottom:4px;font-weight:600;">Jul-Dec</div>
                            <input type="text" placeholder="Ref #" value="${_v2}" ${inputsEditable ? '' : 'disabled'} oninput="updateEmbEntry('${_ePnSafe}','CMR',${ei},'rn','2',this.value)" style="width:180px;">
                        </td>`;
                    }
                    html += `</tr>`;
                });
            }
        }

    });
    html += `</table></div>`;
    window._pendingTableFooter = null;
    if (state.currentTab === 'dole') html += `</div>`; // close dole project card
    
    if (false && state.currentTab === 'dole' && SCHEMA.dole_annual) {
        html += `<div style="margin-top: 30px;">`;
        html += `<div style="background: var(--header-grad); color: white; padding: 10px 15px; border-radius: 6px; font-weight: 700; margin-bottom: 10px;">
                    ${window.icon("calendar")} ANNUAL REPORTS (Submitted Every January)
                 </div>`;
        html += `<div class="table-container"><table>`;
        html += `<tr><th style="width:120px; text-align:left; position: sticky; left: 0; z-index: 10; background: #2e7d32;">TYPE</th><th class="dole-narrow-th">DATE SUBMITTED</th></tr>`;
        
        SCHEMA.dole_annual.forEach((row, rowIdx) => {
            const key = `dole_annual_${row}`;
            const v = p.vals[key] ? (p.vals[key][1] ?? "") : "";
            html += `<tr>
                <td style="text-align:left; font-weight:600; background:var(--border-color); position: sticky; left: 0; z-index: 5;">${row}</td>
                <td class="dole-narrow-td"><input type="date" value="${v}" ${inputsEditable ? '' : 'disabled'} oninput="updateVal('${p.name}','${key}',1,this.value)"></td>
            </tr>`;
        });
        
        html += `</table></div></div>`;
    }
}

                }); // end _navProjs.forEach
                } // end else (non-corporate regions)
                html += `</div>`; // Close region-content
                });
            } // End skip for DOE tabs

            if (['kpm','cshp','reg','audit','env-monthly-report','dole','emb','doe'].includes(state.currentTab)) {
                html = ''; // Rebuild cleanly — no per-project rows needed

                if (state.currentTab === 'dole') {
                    const DOLE_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
                    const DOLE_MONTHLY_ROWS = ['WAIR','RSO','MOM'];
                    const DOLE_ANNUAL_ROWS  = ['AEDR','AMR'];

                    var dSelYear  = state.selectedYear || new Date().getFullYear();
                    var dCurMoIdx = new Date().getMonth();
                    // Current month is still ongoing → hide it. Show only COMPLETED months.
                    // Past year: all 12 months | current year: up to previous month | future year: none
                    var dLastShownIdx = dSelYear < new Date().getFullYear() ? 11 : (dSelYear === new Date().getFullYear() ? dCurMoIdx - 1 : -1);

                    // ── Summary cards ──────────────────────────────────────────────────
                    var dTotalSlots = 0, dFilled = 0, dOverdue = 0;
                    var dNow = new Date();
                    var dNowY = dNow.getFullYear(), dNowM = dNow.getMonth() + 1, dNowD = dNow.getDate();
                    var dActiveProjs = displayProjects.filter(function(dp){ return !isProjectOnStoppage(dp) && dp.region !== 'PLANT OPERATIONS'; });
                    // Count PROJECTS with at least one overdue slot (not total slots) — deadline-aware (due 20th of following month)
                    var dOverdueProjects = new Set();
                    dActiveProjs.forEach(function(dp){
                        DOLE_MONTHLY_ROWS.forEach(function(row){
                            var k = 'dole_' + row;
                            for (var mo = 1; mo <= 12; mo++) {
                                // Skip months where the project was on work stoppage (exempt)
                                if (isMonthBlacklistedForProject(dp, mo, dSelYear)) continue;
                                var dlM = mo === 12 ? 1 : mo + 1;
                                var dlY2 = mo === 12 ? dSelYear + 1 : dSelYear;
                                var deadlinePassed;
                                if (dSelYear < dNowY) { deadlinePassed = true; }
                                else if (dSelYear > dNowY) { deadlinePassed = false; }
                                else { deadlinePassed = (dNowY > dlY2) || (dNowY === dlY2 && dNowM > dlM) || (dNowY === dlY2 && dNowM === dlM && dNowD > 20); }
                                if (!deadlinePassed) continue;
                                dTotalSlots++;
                                var v = dp.vals[k] ? (dp.vals[k][mo] || '') : '';
                                if (v && v.toString().trim() !== '') { dFilled++; }
                                else { dOverdueProjects.add(dp.name); }
                            }
                        });
                    });
                    dOverdue = dOverdueProjects.size;


                    // ── Per-region rows ────────────────────────────────────────────────
                    REGIONS.forEach(function(reg) {
                        if (reg === 'PLANT OPERATIONS') return;
                        var projs = displayProjects.filter(function(p){ return p.region === reg; });
                        if (!projs.length) return;
                        // Active (non-stoppage) projects — used for compliance counting
                        var activeProjs = projs.filter(function(p){ return !isProjectOnStoppage(p) && !p.dateFinished; });
                        var canEditReg = state.isEditing && UserAccounts.canEdit(state.currentUser && state.currentUser.email, reg) && UserAccounts.canEditTab(state.currentUser && state.currentUser.email, 'dole');
                        var isCollapsed = isRegionCollapsed(reg);
                        var regKey = reg.replace(/[^a-zA-Z0-9]/g,'_');
                        var isCorporateDole = reg === 'CORPORATE';

                        // Per-region status for the banner pills (same rules as the old summary cards)
                        var _rgTot = 0, _rgFill = 0, _rgOvd = new Set();
                        projs.filter(function(dp){ return !isProjectOnStoppage(dp); }).forEach(function(dp){
                            DOLE_MONTHLY_ROWS.forEach(function(row){
                                var k = 'dole_' + row;
                                for (var mo = 1; mo <= 12; mo++) {
                                    if (isMonthBlacklistedForProject(dp, mo, dSelYear)) continue;
                                    var dlM = mo === 12 ? 1 : mo + 1;
                                    var dlY2 = mo === 12 ? dSelYear + 1 : dSelYear;
                                    var deadlinePassed;
                                    if (dSelYear < dNowY) { deadlinePassed = true; }
                                    else if (dSelYear > dNowY) { deadlinePassed = false; }
                                    else { deadlinePassed = (dNowY > dlY2) || (dNowY === dlY2 && dNowM > dlM) || (dNowY === dlY2 && dNowM === dlM && dNowD > 20); }
                                    if (!deadlinePassed) continue;
                                    _rgTot++;
                                    var v = dp.vals[k] ? (dp.vals[k][mo] || '') : '';
                                    if (v && v.toString().trim() !== '') { _rgFill++; }
                                    else { _rgOvd.add(dp.name); }
                                }
                            });
                        });

                        // Count months where all ACTIVE (non-exempt) projects have all 3 rows filled
                        var submittedCount = 0;
                        for (var mi = 0; mi <= dLastShownIdx; mi++) {
                            var allFilled = activeProjs.every(function(p){
                                // If project was on stoppage during this month, count it as fulfilled
                                if (isMonthBlacklistedForProject(p, mi+1, dSelYear)) return true;
                                return DOLE_MONTHLY_ROWS.every(function(row){
                                    var v = p.vals['dole_' + row] ? (p.vals['dole_' + row][mi+1] || '') : '';
                                    return v && v.toString().trim() !== '';
                                });
                            });
                            if (allFilled) submittedCount++;
                        }

                        html += window.regionBanner({ id: 'region-banner-' + reg, reg: reg, toggle: 'toggleRegion', collapsed: isCollapsed, editable: canEditReg, icon: isCorporateDole ? 'fa-building-columns' : 'fa-location-dot', right: ''
                            + '<span class="rbadge rbadge-count rb-proj">' + projs.length + ' PROJ</span>'
                            + '<span class="rbadge" style="background:rgba(255,255,255,0.18);color:#c8e6c9;">' + submittedCount + '/' + (dLastShownIdx+1) + ' complete</span>'
                            + window._rbStatusPills(_rgTot, _rgFill, _rgOvd.size, 'overdue')
                            + (canEditReg ? '<button class="lta-add-btn" onclick="event.stopPropagation();window.openDoleDialog(\'' + regKey + '\',\'' + reg.replace(/'/g,"\\'") + '\',null,true)" style="font-size:0.68rem;padding:4px 12px;"><i class="fas fa-plus"></i> Add Entry</button>' : '') })
                            + '<div id="region-content-' + reg + '" class="region-content ' + (isCollapsed?'collapsed':'') + '">';

                        // Month list rows — completed months only (current month is still ongoing, so hidden)
                        var hasAnyRow = false;
                        for (var mi2 = 0; mi2 <= dLastShownIdx; mi2++) {
                            var mo = DOLE_MONTHS[mi2];
                            var isCurMo = (dSelYear === dNowY && mi2 === dCurMoIdx);
                            var filledCount = 0, totalSlotsMo = 0;
                            activeProjs.forEach(function(p){
                                // Skip projects that were on work stoppage during this month
                                if (isMonthBlacklistedForProject(p, mi2+1, dSelYear)) return;
                                DOLE_MONTHLY_ROWS.forEach(function(row){
                                    totalSlotsMo++;
                                    var v = p.vals['dole_' + row] ? (p.vals['dole_' + row][mi2+1] || '') : '';
                                    if (v && v.toString().trim() !== '') filledCount++;
                                });
                            });
                            var allComplete = totalSlotsMo > 0 && filledCount === totalSlotsMo;
                            var noneFilledMo = filledCount === 0;
                            hasAnyRow = true;

                            // ── Deadline-aware status: due on the 20th of the FOLLOWING month ──
                            var _dlMo2 = (mi2 + 1) === 12 ? 1 : (mi2 + 2); // 1-based deadline month
                            var _dlYr2 = (mi2 + 1) === 12 ? dSelYear + 1 : dSelYear;
                            var _deadlinePassed2;
                            if (dSelYear < dNowY) { _deadlinePassed2 = true; }
                            else if (dSelYear > dNowY) { _deadlinePassed2 = false; }
                            else { _deadlinePassed2 = (dNowY > _dlYr2) || (dNowY === _dlYr2 && dNowM > _dlMo2) || (dNowY === _dlYr2 && dNowM === _dlMo2 && dNowD > 20); }

                            var _dKind, _dTxt;
                            if (allComplete) { _dKind = 'ok'; _dTxt = 'Completed'; }
                            else if (isCurMo && noneFilledMo) { _dKind = 'prog'; _dTxt = 'In progress'; }
                            else if (!_deadlinePassed2) { _dKind = 'wait'; _dTxt = 'Pending (due ' + DOLE_MONTHS[_dlMo2 - 1].substring(0,3) + ' 20)'; }
                            else if (noneFilledMo) { _dKind = 'none'; _dTxt = 'Not submitted'; }
                            else { _dKind = 'warn'; _dTxt = 'Incomplete'; }
                            var curBadge = isCurMo ? ' <span style="background:#e3f2fd;color:#1565c0;border-radius:4px;padding:1px 5px;font-size:0.58rem;font-weight:700;vertical-align:middle;">CURRENT</span>' : '';

                            var rowSummary = DOLE_MONTHLY_ROWS.map(function(row){
                                // Only count projects that are NOT on stoppage for this month
                                var eligibleProjs = activeProjs.filter(function(p){ return !isMonthBlacklistedForProject(p, mi2+1, dSelYear); });
                                var filled = eligibleProjs.filter(function(p){ var v = p.vals['dole_'+row] ? (p.vals['dole_'+row][mi2+1]||'') : ''; return v && v.trim(); }).length;
                                return '<span style="color:var(--text-primary,#1a1a1a);font-weight:800;letter-spacing:0.03em;">' + row + ':</span> <span style="color:' + (filled===eligibleProjs.length?'#2e7d32':filled>0?'#e65100':'#c62828') + ';font-weight:700;">' + filled + '/' + eligibleProjs.length + '</span>';
                            }).join(' &nbsp;·&nbsp; ');

                            html += '<div class="ckpm-rw" onclick="window.openDoleDialog(\'' + regKey + '\',\'' + reg.replace(/'/g,"\\'") + '\',\'' + mo + '\',false)">'
                                + '<span class="ckpm-mo">' + mo.substring(0,3) + '</span>'
                                + '<div class="ckpm-fl">' + window._rowStatus(_dKind, _dTxt, '', true) + (isCurMo ? curBadge : '') + '<span class="ckpm-sub">' + rowSummary + '</span></div>'
                                + (canEditReg ? '<div style="display:flex;align-items:center;gap:6px;flex-shrink:0;"><button onclick="event.stopPropagation();window.openDoleDialog(\'' + regKey + '\',\'' + reg.replace(/'/g,"\\'") + '\',\'' + mo + '\',true)" title="Edit" style="background:#e3f2fd;color:#1565c0;border:1px solid #90caf9;border-radius:5px;padding:3px 8px;font-size:0.62rem;font-weight:700;cursor:pointer;"><i class="fas fa-pen"></i></button></div>' : '')
                                + '</div>';
                        }

                        if (!hasAnyRow) {
                            html += '<div style="padding:14px 16px;font-size:0.7rem;color:#888;font-style:italic;border-bottom:1px solid var(--border-color);background:var(--bg-card);">'
                                + '<i class="fas fa-hourglass-half" style="margin-right:6px;"></i>No completed month to display yet.</div>';
                        }

                        html += '</div>'; // close region-content
                    });

                    container.innerHTML = html;

                    // ── AEDR / AMR N/A toggle (per project, per selected year) ─────────
                    window.toggleDoleAnnualNA = function(pName, row, on) {
                        var p = state.projects.find(function(x){ return x.name === pName; });
                        var m = document.getElementById('dole-month-modal');
                        var reopen = function() {
                            window._doleKeepNav = m ? (parseInt(m.getAttribute('data-active-proj')) || 0) : null;
                            if (m && typeof window.openDoleDialog === 'function') {
                                window.openDoleDialog(m.getAttribute('data-regkey'), m.getAttribute('data-reg'), m.getAttribute('data-month'), m.getAttribute('data-canedit') === '1');
                            }
                        };
                        if (!p) return;
                        var _rb = UserAccounts.checkPermission(state.currentUser && state.currentUser.email, 'edit', p.region, 'dole');
                        if (!_rb.allowed) { if (typeof showLockedMessage === 'function') showLockedMessage(_rb.reason); reopen(); return; }
                        if (!p.vals) p.vals = {};
                        p.vals['dole_' + row + '__na'] = on ? '1' : '';
                        if (window.RowSaveManager) window.RowSaveManager.markDirty(pName, 'dole_' + row + '__na');
                        if (typeof markPendingSync === 'function') markPendingSync();
                        if (typeof saveToFirebaseDebounced === 'function') saveToFirebaseDebounced();
                        reopen();
                    };

                    // ── DOLE Dialog ────────────────────────────────────────────────────
                    window.openDoleDialog = function(regKey, reg, month, editMode) {
                        var selYear  = state.selectedYear || new Date().getFullYear();
                        var curMoIdx = new Date().getMonth();
                        var regProjs = (state.filteredProjects || state.projects).filter(function(p){ return p.region === reg; }); // FIX: keep finished projects visible for past-month data
                        if (!regProjs.length) { if (typeof showToast === 'function') showToast('No projects in ' + reg, 'info'); return; }

                        var isNew = !month;
                        // Only COMPLETED months are open for entry (current month is still ongoing)
                        var _lastShown = selYear < new Date().getFullYear() ? 11 : (selYear === new Date().getFullYear() ? curMoIdx - 1 : -1);

                        // Determine which months already have ANY data for ANY project/row in this region
                        var _filledDoleMonths = {};
                        DOLE_MONTHS.forEach(function(mo, mi) {
                            _filledDoleMonths[mo] = regProjs.some(function(p){
                                return DOLE_MONTHLY_ROWS.some(function(row){
                                    var v = p.vals['dole_'+row] ? (p.vals['dole_'+row][mi+1]||'') : '';
                                    return v && v.toString().trim() !== '';
                                });
                            });
                        });
                        var _availDoleMos = DOLE_MONTHS.filter(function(mo, mi){ return !_filledDoleMonths[mo] && mi <= _lastShown; });

                        var activeMo = month || (_availDoleMos.length ? _availDoleMos[0] : DOLE_MONTHS[Math.max(0, _lastShown)]);
                        // Hide columns of projects not yet started / already finished for this month
                        regProjs = regProjs.filter(function(p){ return !isProjectHiddenForMonth(p, DOLE_MONTHS.indexOf(activeMo) + 1, selYear); });
                        var canEdit  = !!editMode || isNew;
                        var dis      = canEdit ? '' : 'disabled';

                        if (canEdit && !state.isEditing) {
                            state.isEditing = true;
                            document.body.classList.add('is-editing');
                            var _fb = document.getElementById('floating-edit-btn');
                            var _fi = document.getElementById('floating-edit-icon');
                            var _ft = document.getElementById('floating-edit-tooltip');
                            if (_fb) { _fb.classList.add('save-mode'); _fb.setAttribute('onclick','saveData()'); }
                            if (_fi) _fi.className = 'fas fa-save';
                            if (_ft) _ft.textContent = 'Click to Save';
                        }

                        var existing = document.getElementById('dole-month-modal');
                        if (existing) existing.remove();

                        var modal = document.createElement('div');
                        modal.id = 'dole-month-modal';
                        modal.setAttribute('data-reg', reg);
                        modal.setAttribute('data-regkey', regKey);
                        modal.setAttribute('data-month', activeMo);
                        modal.setAttribute('data-canedit', canEdit ? '1' : '0');

                        // Build table: rows = WAIR/RSO/MOM, cols = projects
                        var _T = window.ESH_RPT_MODAL_TBL;
                        var projHeaderCols = regProjs.map(function(p){
                            var isStopped = isProjectOnStoppage(p);
                            var isFinished = !!p.dateFinished;
                            var hdrStyle = 'padding:5px 8px;border:1px solid ' + _T.bd + ';font-size:0.67rem;font-weight:700;text-align:center;min-width:160px;white-space:normal;word-break:break-word;'
                                + ((isStopped||isFinished) ? 'background:#f5f5f5;color:#9e9e9e;opacity:0.7;' : 'background:' + _T.proj + ';color:' + _T.txt + ';');
                            return '<th style="' + hdrStyle + '">' + p.name
                                + (isFinished ? ' <span title="Finished — read only"><i class="fas fa-lock"></i></span>' : '')
                                + '</th>';
                        }).join('');

                        var tableRows = DOLE_MONTHLY_ROWS.map(function(row) {
                            var moIdx = DOLE_MONTHS.indexOf(activeMo);
                            var projCells = regProjs.map(function(p) {
                                var isStopped = isProjectOnStoppage(p);
                                var isFinished = !!p.dateFinished;
                                // ── Work-stoppage exempt check (covers resumed projects too) ─────
                                // A month is "stoppage-exempt" if the project was on work stoppage
                                // during that month — even if it has since resumed.
                                var _moIdx1 = moIdx + 1; // 1-based
                                var isStoppageExempt = !isStopped && isMonthBlacklistedForProject(p, _moIdx1, selYear);
                                var cellDis = (isStopped || isStoppageExempt || isFinished || !canEdit) ? 'disabled' : '';
                                var k = 'dole_' + row;
                                var v = p.vals[k] ? (p.vals[k][moIdx+1] || '') : '';
                                var pnSafe = p.name.replace(/\\/g,'\\\\').replace(/'/g,"\\'");

                                // Build exemption label for tooltip (not-yet-started takes priority over stoppage)
                                var _isNotYetStarted = isStoppageExempt && isMonthBeforeProjectStart(p, _moIdx1, selYear);
                                // Finished project: the finish month and every later month are exempt — label them as such, not as a stoppage
                                var _isFinishedMonth = !!p.dateFinished && isProjectFinishedForMonth(p, _moIdx1, selYear) && !isMonthBeforeProjectStart(p, _moIdx1, selYear);
                                var _tooltipText = '';
                                if (_isNotYetStarted) {
                                    _tooltipText = 'Project not yet started (starts ' + formatDateDMY(p.dateStarted) + '). This month is not required.';
                                } else if (_isFinishedMonth) {
                                    _tooltipText = 'Project finished (' + formatDateDMY(p.dateFinished) + '). This month and later months are not required.';
                                } else if (isStoppageExempt && p.workStoppageDate) {
                                    var _sd = new Date(p.workStoppageDate);
                                    var _sdStr = (_sd.getMonth()+1) + '/' + _sd.getDate() + '/' + _sd.getFullYear();
                                    _tooltipText = 'Work stoppage: ' + _sdStr;
                                    if (p.workResumeDate) {
                                        var _rd = new Date(p.workResumeDate);
                                        var _rdStr = (_rd.getMonth()+1) + '/' + _rd.getDate() + '/' + _rd.getFullYear();
                                        _tooltipText += ' → Resumed: ' + _rdStr + '. This month is exempt from DOLE reporting.';
                                    } else {
                                        _tooltipText += '. This month is exempt from DOLE reporting.';
                                    }
                                }

                                // ── DOLE deadline-aware coloring for modal ───────────────────────
                                // Red only AFTER the 20th of the following month has passed.
                                // moIdx is 0-based (0=Jan…11=Dec); selYear is the selected year.
                                var _modalNow = new Date();
                                var _modalNowY = _modalNow.getFullYear();
                                var _modalNowM = _modalNow.getMonth() + 1; // 1-based
                                var _modalNowD = _modalNow.getDate();
                                var _modalMoIdx1 = moIdx + 1; // 1-based month of the report data
                                var _modalDeadlineM = _modalMoIdx1 === 12 ? 1 : _modalMoIdx1 + 1;
                                var _modalDeadlineY = _modalMoIdx1 === 12 ? selYear + 1 : selYear;
                                var _modalDeadlinePassed = false;
                                if (selYear < _modalNowY) {
                                    _modalDeadlinePassed = true; // past year, all overdue
                                } else if (selYear === _modalNowY) {
                                    if (_modalNowY > _modalDeadlineY) { _modalDeadlinePassed = true; }
                                    else if (_modalNowY === _modalDeadlineY) {
                                        if (_modalNowM > _modalDeadlineM) { _modalDeadlinePassed = true; }
                                        else if (_modalNowM === _modalDeadlineM && _modalNowD > 20) { _modalDeadlinePassed = true; }
                                    }
                                }
                                // Stoppage-exempt months are NEVER overdue regardless of deadline
                                var _modalIsOverdue = !v && _modalDeadlinePassed && !isStoppageExempt;
                                var cellBg     = isStopped        ? '#f5f5f5'
                                               : isStoppageExempt ? '#f0f0f0'
                                               : v                ? '#c8e6c9'
                                               : _modalIsOverdue  ? '#ffcdd2'
                                               :                    '#f5f5f5';
                                var cellColor  = isStopped        ? '#9e9e9e'
                                               : isStoppageExempt ? '#9e9e9e'
                                               : v                ? '#14501a'
                                               : _modalIsOverdue  ? '#b71c1c'
                                               :                    '#616161';
                                var inputStyle = 'width:100%;border:none;outline:none;border-radius:4px;padding:3px 6px;font-size:0.72rem;font-weight:700;background:transparent;color:' + cellColor + ';' + ((isStopped || isStoppageExempt) ? 'cursor:not-allowed;' : '');
                                var _tdExtraStyle = (isStopped || isStoppageExempt) ? 'background:#fafafa;opacity:' + (isStoppageExempt ? '0.8' : '0.65') + ';' : '';
                                return '<td style="padding:6px 8px;border:1px solid #c8e6c9;min-width:160px;' + _tdExtraStyle + '" title="' + ((isStoppageExempt || _isFinishedMonth) ? _tooltipText.replace(/"/g,'&quot;') : '') + '">'
                                    + ((isStopped && !_isFinishedMonth)
                                        ? '<div style="font-size:0.62rem;color:#9e9e9e;text-align:center;padding:4px;font-style:italic;"><i class="fas fa-ban"></i> Stopped</div>'
                                        : (isStoppageExempt || _isFinishedMonth)
                                            ? '<div style=\"font-size:0.62rem;color:#9e9e9e;text-align:center;padding:5px 4px;font-style:italic;display:flex;align-items:center;justify-content:center;gap:4px;\" title=\"' + _tooltipText.replace(/"/g,'&quot;') + '"><i class="fas ' + (_isFinishedMonth ? 'fa-flag-checkered' : 'fa-pause-circle') + '" style="font-size:0.75rem;"></i> ' + (_isNotYetStarted ? 'Not Yet Started' : _isFinishedMonth ? 'Finished Project' : 'Exempt (Stoppage)') + '</div>'
                                            : '<input type="date" value="' + v + '" ' + cellDis
                                                + ' name="dolemod-' + row + '-' + p.name.replace(/[^a-zA-Z0-9]/g,'_') + '"'
                                                + ' data-pname="' + pnSafe + '" data-row="' + row + '" data-moIdx="' + (moIdx+1) + '" data-overdue="' + (_modalIsOverdue ? '1' : '0') + '"'
                                                + ' oninput="updateVal(\'' + pnSafe + '\',\'dole_' + row + '\',' + (moIdx+1) + ',this.value);_refreshDateCell(this);this.style.background=\'transparent\';this.style.color=this.value?\'#14501a\':\'#b71c1c\'"'
                                                + ' style="' + inputStyle + '">')
                                    + '</td>';
                            }).join('');
                            var rowDesc = doleFullName(row);
                            return '<tr style="background:' + _T.rowBg + ';border-bottom:1px solid ' + _T.bd + ';">'
                                + '<td style="padding:8px 12px;border:1px solid #c8e6c9;font-weight:800;color:#1b5e20;background:#e8f5e9;position:sticky;left:0;z-index:3;width:320px;min-width:320px;max-width:320px;white-space:normal;box-shadow:inset -1px 0 0 #c8e6c9;">' + doleFullName(row) + '</td>'
                                + projCells + '</tr>';
                        }).join('');

                        // ── AEDR & AMR annual rows ───────────────────────────────────────────
                        var _annNow = new Date();
                        var _annNowY = _annNow.getFullYear();
                        var _annNowM = _annNow.getMonth() + 1;
                        var _annNowD = _annNow.getDate();
                        var _annDefs = [
                            { row: 'AEDR', desc: doleFullName('AEDR'), dlM: 1,  dlD: 30 },
                            { row: 'AMR',  desc: doleFullName('AMR'), dlM: 3,  dlD: 31 }
                        ];
                        var annualRows = _annDefs.map(function(rd) {
                            var dlY = selYear; // deadline is within selYear (AEDR: Jan 30, AMR: Mar 31 of selYear)
                            var passed = (_annNowY > dlY) ||
                                (_annNowY === dlY && _annNowM > rd.dlM) ||
                                (_annNowY === dlY && _annNowM === rd.dlM && _annNowD > rd.dlD);
                            var moNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                            var dlLabel = 'Due: ' + moNames[rd.dlM-1] + ' ' + rd.dlD + ', ' + dlY + ' · Covers ' + (dlY-1);

                            var cells = regProjs.map(function(proj) {
                                var stopped = isProjectOnStoppage(proj);
                                // AEDR & AMR cover the ENTIRE prior year (selYear - 1).
                                // If the project was on work stoppage at any point during selYear-1,
                                // the whole annual report is exempt — no submission required.
                                var _annExempt = !stopped && isDoleAnnualStoppageExempt(proj, selYear);
                                // No covered period yet (project started in/after selYear) → not required, never overdue
                                var _annNotReq = !stopped && !_annExempt && !isDoleAnnualRequired(proj, selYear);
                                var _annNA = isDoleAnnualNA(proj, rd.row);
                                var _annTooltip = '';
                                if (_annNotReq) {
                                    var _nrY = new Date(proj.dateStarted).getFullYear();
                                    _annTooltip = 'Project started in ' + _nrY + ' — no covered period in ' + (selYear-1) + '. The first annual reports (' + doleFullName('AEDR') + ' and ' + doleFullName('AMR') + ') cover ' + _nrY + ' (due ' + (_nrY+1) + ').';
                                }
                                if (_annExempt && proj.workStoppageDate) {
                                    var _asd = new Date(proj.workStoppageDate);
                                    var _asdStr = (_asd.getMonth()+1) + '/' + _asd.getDate() + '/' + _asd.getFullYear();
                                    _annTooltip = 'Project was on work stoppage during ' + (selYear-1) + ' (started ' + _asdStr + ')';
                                    if (proj.workResumeDate) {
                                        var _ard = new Date(proj.workResumeDate);
                                        var _ardStr = (_ard.getMonth()+1) + '/' + _ard.getDate() + '/' + _ard.getFullYear();
                                        _annTooltip += ', resumed ' + _ardStr + '. Annual report not required for stoppage year.';
                                    } else {
                                        _annTooltip += '. Annual report not required for stoppage year.';
                                    }
                                }
                                if (_annNA && !stopped && !_annExempt && !_annNotReq) { _annTooltip = 'Marked N/A — ' + doleFullName(rd.row) + ' is not applicable for this project.'; }
                                var dis = (stopped || _annExempt || _annNotReq || !canEdit) ? 'disabled' : '';
                                var k = 'dole_' + rd.row;
                                var v = proj.vals[k] ? (proj.vals[k][1] || '') : '';
                                if (_annNA) v = ''; // N/A takes priority (stored date is kept, just hidden)
                                var overdue = !v && passed && !_annExempt && !_annNotReq && !_annNA;
                                var bg  = stopped ? '#f5f5f5' : _annExempt ? '#f0f0f0' : v ? '#c8e6c9' : overdue ? '#ffcdd2' : '#f5f5f5';
                                var clr = stopped ? '#9e9e9e' : _annExempt ? '#9e9e9e' : v ? '#14501a' : overdue ? '#b71c1c' : '#616161';
                                var pnEsc = proj.name.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
                                var tdStyle = 'padding:6px 8px;border:1px solid #c8e6c9;min-width:160px;' + ((stopped || _annExempt || _annNotReq) ? 'background:#fafafa;opacity:' + ((_annExempt || _annNotReq) ? '0.8' : '0.65') + ';' : '');
                                var inStyle = 'width:100%;border:none;outline:none;border-radius:4px;padding:3px 6px;font-size:0.72rem;font-weight:700;background:transparent;color:' + clr + ';';
                                var cell;
                                if (stopped) {
                                    cell = '<div style="font-size:0.62rem;color:#9e9e9e;text-align:center;padding:4px;font-style:italic;"><i class="fas fa-ban"></i> Stopped</div>';
                                } else if (_annNotReq) {
                                    cell = '<div style="font-size:0.62rem;color:#9e9e9e;text-align:center;padding:5px 4px;font-style:italic;display:flex;align-items:center;justify-content:center;gap:4px;" title="' + _annTooltip.replace(/"/g,'&quot;') + '"><i class="fas fa-hourglass-start" style="font-size:0.75rem;"></i> Not yet required</div>';
                                } else if (_annExempt) {
                                    cell = '<div style="font-size:0.62rem;color:#9e9e9e;text-align:center;padding:5px 4px;font-style:italic;display:flex;align-items:center;justify-content:center;gap:4px;" title="' + _annTooltip.replace(/"/g,'&quot;') + '"><i class="fas fa-pause-circle" style="font-size:0.75rem;"></i> Exempt (Stoppage)</div>';
                                } else {
                                    var safeName = proj.name.replace(/[^a-zA-Z0-9]/g,'_');
                                    // Date box centered like the monthly rows; N/A checkbox sits to its left (outside the flow, so it never shifts the date box). When N/A is checked the date field turns gray and is disabled (stored date is kept).
                                    var _shownVal = _annNA ? (proj.vals[k] ? (proj.vals[k][1] || '') : '') : v;
                                    var _grayStyle = _annNA ? 'background:rgba(128,128,128,0.25)!important;color:#9e9e9e!important;-webkit-text-fill-color:#9e9e9e!important;cursor:not-allowed;' : '';
                                    var _inDis = (dis || _annNA) ? 'disabled' : '';
                                    var dateInput = '<input type="date" value="' + _shownVal + '" ' + _inDis
                                        + ' name="dolemod-' + rd.row + '-' + safeName + '"'
                                        + ' data-pname="' + pnEsc + '" data-row="' + rd.row + '" data-moIdx="1" data-overdue="' + (overdue ? '1' : '0') + '"'
                                        + ' style="' + inStyle + 'width:150px!important;flex:0 0 150px;' + _grayStyle + '"'
                                        + ' oninput="updateVal(\'' + pnEsc + '\',\'dole_' + rd.row + '\',1,this.value);_refreshDateCell(this);this.style.background=\'transparent\';this.style.color=this.value?\'#14501a\':\'#b71c1c\'">';
                                    var _naChk = '<label style="display:inline-flex!important;align-items:center;gap:4px;width:auto!important;margin:0!important;padding:0!important;font-size:0.6rem;font-weight:600;line-height:1.3;white-space:nowrap;color:#757575;cursor:' + (dis ? 'not-allowed' : 'pointer') + ';" title="' + (_annNA ? 'Undo N/A' : 'Mark as N/A (not applicable)') + '">'
                                        + '<input type="checkbox" style="display:inline-block!important;width:var(--esh-cb-size)!important;min-width:var(--esh-cb-size)!important;height:var(--esh-cb-size)!important;margin:0!important;padding:0!important;" ' + (_annNA ? 'checked ' : '') + (dis ? 'disabled ' : '')
                                        + 'onchange="window.toggleDoleAnnualNA(\'' + pnEsc + '\',\'' + rd.row + '\',this.checked)"><span>N/A</span></label>';
                                    cell = '<div style="position:relative;display:flex;align-items:center;justify-content:center;">' + dateInput + '<span style="position:absolute;top:50%;right:calc(50% + 75px + 8px);transform:translateY(-50%);">' + _naChk + '</span></div>';
                                }
                                return '<td style="' + tdStyle + '" title="' + ((_annExempt || _annNotReq) ? _annTooltip.replace(/"/g,'&quot;') : '') + '">' + cell + '</td>';
                            }).join('');

                            return '<tr style="background:#fff8e1;border-bottom:1px solid #ffe0b2;">'
                                + '<td style="padding:8px 12px;border:1px solid #c8e6c9;font-weight:800;color:#e65100;background:#fff3e0;position:sticky;left:0;z-index:3;width:320px;min-width:320px;max-width:320px;white-space:normal;box-shadow:inset -1px 0 0 #c8e6c9;">'
                                + doleFullName(rd.row) + '<br><span style="font-size:0.55rem;font-weight:600;color:#bf360c;">' + dlLabel + '</span></td>'
                                + cells + '</tr>';
                        }).join('');

                        var tableHtml = '<table class="dole-modal-table" style="border-collapse:collapse;font-size:0.68rem;width:max-content;min-width:100%;">'
                            + '<thead>'
                            + '<tr style="background:' + _T.grp + ';color:' + _T.txt + ';font-size:0.67rem;font-weight:800;text-align:center;">'
                            + '<th rowspan="2" style="padding:6px 8px;border:1px solid ' + _T.bd + ';vertical-align:middle;background:' + _T.grp + ';color:' + _T.txt + ';position:sticky;left:0;z-index:5;width:320px;min-width:320px;max-width:320px;box-shadow:inset -1px 0 0 ' + _T.bd + ';">REPORT</th>'
                            + '<th colspan="' + regProjs.length + '" style="padding:6px 8px;border:1px solid ' + _T.bd + ';background:' + _T.grp + ';color:' + _T.txt + ';"><span style="display:inline-block;position:sticky;left:340px;">DATE SUBMITTED PER PROJECT</span></th>'
                            + '</tr>'
                            + '<tr style="background:' + _T.proj + ';">' + projHeaderCols + '</tr>'
                            + '</thead>'
                            + '<tbody>'
                            + tableRows
                            + (activeMo === 'January' ? annualRows : '') // AEDR & AMR: January only
                            + '</tbody></table>';

                        window.eshMountModal(modal, {
                            id: 'dole-month-modal', icon: 'fa-file-lines', iconImg: window.DOLE_LOGO, width: 'min(640px,96vw)', bodyFlex: true,
                            title: (isNew ? 'New DOLE entry' : (canEdit ? 'Edit DOLE' : 'View DOLE')) + ' — <span style="color:#2e7d32;">' + activeMo + ' ' + selYear + '</span>',
                            sub: '<i class="fas fa-location-dot" style="margin-right:4px;"></i>' + reg + ' · ' + regProjs.length + ' project' + (regProjs.length!==1?'s':''),
                            body: ''
                            // Info bar — includes month dropdown when Add Entry (isNew)
                            + '<div style="border-bottom:1px solid #e8ebe9;padding:8px 14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">'
                            + '<span style="font-size:0.68rem;color:#6b7770;">Reports for ' + activeMo + ' ' + selYear + '</span>'
                            + (isNew ? (function(){
                                var _rk = regKey.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
                                var _rg = reg.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
                                var opts = DOLE_MONTHS.map(function(mo, _oi){
                                    var isFilled = _filledDoleMonths[mo];
                                    var isSel = mo === activeMo;
                                    var isNotYet = _oi > _lastShown; // ongoing / upcoming month
                                    var _ongoingTag = (isNotYet && selYear === new Date().getFullYear() && _oi === curMoIdx) ? ' (ongoing)' : '';
                                    return '<option value="' + mo + '"' + (isSel?' selected':'') + ((isFilled||isNotYet)?' disabled style="color:#bbb;"':'') + '>' + mo + (isFilled?' ✓':'') + _ongoingTag + '</option>';
                                }).join('');
                                return '<label style="display:flex;align-items:center;gap:5px;white-space:nowrap;font-size:0.67rem;color:#555;">'
                                    + '<i class="fas fa-calendar-alt" style="color:#1b5e20;font-size:0.7rem;"></i>'
                                    + '<span style="font-weight:700;font-size:0.64rem;color:#444;">Month:</span>'
                                    + '<select onchange="(function(v){var m=document.getElementById(\'dole-month-modal\');if(m)m.remove();window.openDoleDialog(\'' + _rk + '\',\'' + _rg + '\',v,true);})(this.value)"'
                                    + ' style="border:1px solid #a5d6a7;border-radius:4px;padding:3px 7px;font-size:0.67rem;font-weight:700;background:#e8f5e9;color:#1b5e20;cursor:pointer;min-width:110px;">'
                                    + opts + '</select></label>';
                            })() : '')
                            + '</div>'
                            // Project navigation (same as EMB)
                            + '<div class="emb-sticky"><div class="emb-nav">'
                            + '<button type="button" class="emb-nav-btn" data-dir="-1"><i class="fas fa-chevron-left"></i> Prev</button>'
                            + '<div class="emb-nav-mid"><div class="emb-nav-title"><span class="emb-dot"></span><span class="emb-nav-name"></span></div><span class="emb-nav-count"></span></div>'
                            + '<button type="button" class="emb-nav-btn" data-dir="1">Next <i class="fas fa-chevron-right"></i></button>'
                            + '</div></div>'
                            // Table
                            + '<div style="overflow-x:auto;max-height:55vh;overflow-y:auto;background:var(--bg-card);">' + tableHtml + '</div>'
                            , foot: canEdit ? '<button onclick="window.saveDoleModal()" class="mdl-btn primary"><i class="fas fa-save" style="margin-right:6px;"></i>Save Changes</button>' : '' });
                        modal.classList.add('dole-modal');   // class, not only the id: the close ghost clone has no ids
                        window._doleInitNav(modal, regProjs.map(function(p){
                            return { name: p.name, stopped: !!(isProjectOnStoppage(p) && !p.dateFinished), finished: !!p.dateFinished };
                        }));
                    };

                    // DOLE modal navigation: one project at a time (Prev/Next), same look as the EMB modal.
                    // Every project column stays in the DOM (only hidden), so saveDoleModal still reads every input.
                    window._doleInitNav = function(modal, meta) {
                        var rows = modal.querySelectorAll('.dole-modal-table tbody > tr');
                        var prevBtn = modal.querySelector('.emb-nav-btn[data-dir="-1"]');
                        var nextBtn = modal.querySelector('.emb-nav-btn[data-dir="1"]');
                        var nameEl = modal.querySelector('.emb-nav-name');
                        var countEl = modal.querySelector('.emb-nav-count');
                        var dotEl = modal.querySelector('.emb-nav-mid .emb-dot');
                        var bodyEl = modal.querySelector('.mdl-body');
                        var cur = window._doleKeepNav; window._doleKeepNav = null;
                        var p = (cur !== null && cur !== undefined && cur >= 0 && cur < meta.length) ? cur : 0;

                        function projState(i) {
                            var ins = [];
                            rows.forEach(function(tr){ var c = tr.children[i + 1]; if (c) c.querySelectorAll('input[type="date"]').forEach(function(x){ ins.push(x); }); });
                            if (!ins.length) return 'exempt';
                            var empty = ins.filter(function(x){ return !x.value; });
                            if (!empty.length) return 'done';
                            return empty.some(function(x){ return x.getAttribute('data-overdue') === '1'; }) ? 'late' : 'miss';
                        }
                        function refresh() {
                            rows.forEach(function(tr){
                                for (var i = 0; i < meta.length; i++) { var c = tr.children[i + 1]; if (c) c.classList.toggle('dole-col-off', i !== p); }
                            });
                            nameEl.textContent = meta[p].name;
                            if (meta[p].stopped || meta[p].finished) {
                                var bd = document.createElement('span'); bd.className = 'emb-badge';
                                bd.innerHTML = meta[p].finished ? '<i class="fas fa-lock"></i> Finished' : '<i class="fas fa-pause-circle"></i> On Stoppage';
                                nameEl.appendChild(document.createTextNode(' ')); nameEl.appendChild(bd);
                            }
                            countEl.textContent = (p + 1) + ' of ' + meta.length;
                            dotEl.className = 'emb-dot ' + projState(p);
                            prevBtn.disabled = p <= 0;
                            nextBtn.disabled = p >= meta.length - 1;
                            // Red border only on empty fields that are already overdue
                            modal.querySelectorAll('.dole-modal-table input[type="date"]').forEach(function(i){
                                i.classList.toggle('dole-bad', i.getAttribute('data-overdue') === '1' && !i.value && !i.disabled);
                            });
                            modal.setAttribute('data-active-proj', p);
                        }
                        prevBtn.onclick = function(){ if (p > 0) { p--; refresh(); if (bodyEl) bodyEl.scrollTop = 0; } };
                        nextBtn.onclick = function(){ if (p < meta.length - 1) { p++; refresh(); if (bodyEl) bodyEl.scrollTop = 0; } };
                        modal.addEventListener('input', refresh);
                        modal.addEventListener('change', refresh);
                        refresh();
                    };

                    // ── Annual DOLE input handler (no escape-hell inline) ──────────────
                    // ── Save DOLE Modal (Save Changes button) ────────────────────────────
                    // Each input already calls updateVal() on oninput — same as exposures.
                    // saveDoleModal just re-fires updateVal for any input that wasn't typed
                    // (e.g. pre-filled values), then closes the modal.
                    window.saveDoleModal = function() {
                        var modal = document.getElementById('dole-month-modal');
                        if (!modal) return;

                        // Re-fire updateVal for every input to ensure all values are saved
                        modal.querySelectorAll('[data-pname][data-row]').forEach(function(inp) {
                            var pnSafe = inp.dataset.pname;
                            var row    = inp.dataset.row;
                            var moIdx  = parseInt(inp.dataset.moIdx);
                            if (pnSafe && row && moIdx) {
                                updateVal(pnSafe, 'dole_' + row, moIdx, inp.value);
                            }
                        });

                        modal.remove();
                        render();
                        if (typeof showToast === 'function') showToast('DOLE entry saved.', 'success', 2500);
                    };

                    return;
                } // end dole

                // ══════════════════════════════════════════════════════════════════════
                // ── SHARED HELPER: build a generic modal overlay ──────────────────────
                // ══════════════════════════════════════════════════════════════════════
                function _buildModalOverlay(id, header, infoBar, tableHtml, footerHtml) {
                    // Frame comes from the shared modal (eshOpenModal). Table and inputs are unchanged.
                    return window.eshOpenModal({
                        id: id, icon: 'fa-leaf', iconImg: header.iconImg,
                        title: header.title, sub: header.sub,
                        width: 'min(1600px,99vw)',
                        body: infoBar + '<div class="mt-wrap" style="overflow-x:auto;">' + tableHtml + '</div>',
                        foot: footerHtml
                    });
                }

                function _modalHeader(gradientCss, title, subtitle, closeId) {
                    // Returns plain data for the shared modal header (gradient is no longer used).
                    var t = String(title).replace(/#fbc02d/g, '#2e7d32').replace(/^[\u2600-\u27BF\uFE0F\s]+/, '').replace(/^(?:\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDC00-\uDFFF])+\s*/, '');
                    return { title: t, sub: subtitle };
                }

                function _embInfoBar(text) {
                    // Same as _modalInfoBar but without the horizontal "Scroll if needed" hint (EMB modal shows one project at a time).
                    return '<div style="border-bottom:1px solid #e8ebe9;padding:8px 14px;">'
                        + '<span style="font-size:0.68rem;color:#6b7770;">' + text + '</span>'
                        + '</div>';
                }

                function _modalTable(rowDefs, projCols, projNames) {
                    // rowDefs: [{label, desc, cells:[{pname,key,idx,val,inputType,stopped}]}]
                    var thead = '<tr style="background:#9ecf9b;color:#1b5e20;font-size:0.67rem;font-weight:800;">'
                        + '<th class="mt-c1" style="padding:6px 8px;border:1px solid #c8e6c9;min-width:120px;white-space:nowrap;">FIELD</th>'
                        + '<th class="mt-c2" style="padding:6px 8px;border:1px solid #c8e6c9;min-width:160px;text-align:left;white-space:normal;">DESCRIPTION</th>'
                        + projNames.map(function(n){ return '<th style="padding:5px 8px;border:1px solid #c8e6c9;min-width:160px;white-space:normal;word-break:break-word;background:#b7ddb5;color:#1b5e20;text-align:center;">' + n + '</th>'; }).join('')
                        + '</tr>';
                    var tbody = rowDefs.map(function(rd){
                        var cells = rd.cells.map(function(c){
                            // ── Work-stoppage / not-yet-started: greyed out, exempt from reporting ──
                            if (c.stopped) {
                                var _mtNotStarted = !!c.notStarted;
                                var _mtFinished = !!c.finished && !_mtNotStarted;
                                var _mtLabel = _mtNotStarted ? 'Not Yet Started' : _mtFinished ? 'Finished Project' : 'Work Stoppage — Exempt';
                                var _mtTitle = _mtNotStarted ? ' title="Project has not started this month yet — not required."' : (_mtFinished ? ' title="Project finished — this month and later months are not required."' : ' title="Work Stoppage period — this month is excluded from compliance."');
                                return '<td style="padding:6px 8px;border:1px solid #e0e0e0;min-width:160px;background:#f5f5f5;opacity:0.7;"' + _mtTitle + '>'
                                    + '<div style="display:flex;align-items:center;justify-content:center;gap:5px;color:#9e9e9e;font-size:0.67rem;font-style:italic;padding:4px 0;">'
                                    + '<i class="fas ' + (_mtNotStarted?'fa-hourglass-start':(_mtFinished?'fa-flag-checkered':'fa-ban')) + '" style="font-size:0.65rem;"></i> ' + _mtLabel
                                    + '</div></td>';
                            }
                            var _mOverdue = !!c.overdue;
                            var _mNaGreen = !!c.naChecked;
                            var _mBorder = (_mNaGreen || c.val) ? '#a5d6a7' : (_mOverdue ? '#ef9a9a' : '#ffe082');
                            var _mBg     = (_mNaGreen || c.val) ? '#c8e6c9' : (_mOverdue ? '#ffcdd2' : '#fffde7');
                            var _mColor  = (_mNaGreen || c.val) ? '#2e7d32' : (_mOverdue ? '#c62828' : '#7a5c00');
                            var inputCss = 'width:100%;border:1px solid ' + _mBorder + ';border-radius:4px;padding:3px 6px;font-size:0.72rem;font-weight:700;background:' + _mBg + ';color:' + _mColor + ';';
                            return '<td style="padding:6px 8px;border:1px solid #c8e6c9;min-width:160px;">'
                                + '<input type="' + (c.inputType||'date') + '" value="' + (c.val||'') + '" ' + (c.dis||'')
                                + ' data-pname="' + c.pname + '" data-key="' + c.key + '" data-idx="' + c.idx + '"'
                                + ' oninput="updateVal(this.dataset.pname,this.dataset.key,parseInt(this.dataset.idx),this.value);this.style.background=this.value?\'#c8e6c9\':\'#ffcdd2\';this.style.borderColor=this.value?\'#a5d6a7\':\'#ef9a9a\';this.style.color=this.value?\'#2e7d32\':\'#c62828\'"'
                                + ' style="' + inputCss + '"></td>';
                        }).join('');
                        return '<tr style="background:var(--bg-card);border-bottom:1px solid #c8e6c9;">'
                            + '<td class="mt-c1" style="padding:8px 12px;border:1px solid #c8e6c9;font-weight:800;color:#1b5e20;background:#e8f5e9;white-space:nowrap;">' + rd.label + '</td>'
                            + '<td class="mt-c2" style="padding:8px 12px;border:1px solid #c8e6c9;font-size:0.67rem;color:#555;white-space:normal;">' + rd.desc + '</td>'
                            + cells + '</tr>';
                    }).join('');
                    return '<table style="border-collapse:collapse;font-size:0.68rem;width:max-content;min-width:100%;">'
                        + '<thead>' + thead + '</thead><tbody>' + tbody + '</tbody></table>';
                }

                function _modalFooter(saveCall, openEditCall, closeId) {
                    // Only a Save button. No Close button here, the X in the header closes the modal.
                    return saveCall
                        ? '<button class="mdl-btn primary" onclick="' + saveCall + '"><i class="fas fa-save" style="margin-right:6px;"></i>Save Changes</button>'
                        : '';
                }

                function _activateEditMode() {
                    if (!state.isEditing) {
                        state.isEditing = true;
                        document.body.classList.add('is-editing');
                        var fb=document.getElementById('floating-edit-btn'), fi=document.getElementById('floating-edit-icon'), ft=document.getElementById('floating-edit-tooltip');
                        if(fb){fb.classList.add('save-mode');fb.setAttribute('onclick','saveData()');}
                        if(fi) fi.className='fas fa-save';
                        if(ft) ft.textContent='Click to Save';
                    }
                }

                function _genericSaveModal(modalId, tabName) {
                    var modal = document.getElementById(modalId);
                    if (!modal) return;
                    // Re-fire updateVal for every input — same pattern as DOLE/exposures.
                    // Stopped projects have no input (replaced by exempt badge) so they are
                    // naturally skipped — only [data-pname][data-key][data-idx] inputs are swept.
                    modal.querySelectorAll('[data-pname][data-key][data-idx]').forEach(function(inp) {
                        if (inp.dataset.pname && inp.dataset.key) {
                            // For checkbox inputs, use .checked (boolean) instead of .value
                            var val = (inp.dataset.inputtype === 'checkbox' || inp.type === 'checkbox') ? inp.checked : inp.value;
                            updateVal(inp.dataset.pname, inp.dataset.key, parseInt(inp.dataset.idx), val);
                        }
                    });
                    modal.remove();
                    render();
                    if (typeof showToast === 'function') showToast('Entry saved.', 'success', 2500);
                }

                function _buildRegionMonthList(reg, regKey, periods, canEditReg, openFn) {
                    // periods: [{label, shortLabel, filledCount, totalSlots, periodKey, isCurrent?}]
                    var html2 = '';
                    periods.forEach(function(p2, idx){
                        var pct = p2.totalSlots > 0 ? p2.filledCount/p2.totalSlots : 0;
                        var allComplete = pct === 1;
                        var noneF = p2.filledCount === 0;
                        var isCur = !!p2.isCurrent;
                        var _pKind, _pTxt;
                        if (allComplete) { _pKind = 'ok'; _pTxt = 'Completed'; }
                        else if (noneF && isCur) { _pKind = 'prog'; _pTxt = 'In progress'; }
                        else if (p2.dueDate) {
                            // Periods with a due date (EMB): the status depends on the due date, not on the period.
                            var _pOvd = Date.now() > p2.dueDate.getTime();
                            if (noneF) { _pKind = _pOvd ? 'none' : 'wait'; _pTxt = _pOvd ? 'Overdue' : 'Pending'; }
                            else       { _pKind = _pOvd ? 'warn' : 'prog'; _pTxt = _pOvd ? 'Overdue' : 'In progress'; }
                        }
                        else if (noneF) { _pKind = 'none'; _pTxt = 'Not submitted'; }
                        else { _pKind = 'part'; _pTxt = 'Incomplete'; }
                        var curBadge = isCur ? ' <span style="background:#e3f2fd;color:#1565c0;border-radius:4px;padding:1px 5px;font-size:0.58rem;font-weight:700;vertical-align:middle;">CURRENT</span>' : '';
                        var _mOnly = !!p2.monthOnly; // month rows: show only the month label
                        var _sl = _mOnly ? (String(p2.shortLabel).charAt(0) + String(p2.shortLabel).slice(1).toLowerCase()) : p2.shortLabel;
                        html2 += '<div class="ckpm-rw" onclick="' + openFn + '(\'' + regKey + '\',\'' + reg.replace(/'/g,"\\'") + '\',\'' + p2.periodKey.replace(/'/g,"\\'") + '\',false)">'
                            + (p2.oneLine ? '' : '<span class="ckpm-mo">' + _sl + '</span>')
                            + '<div class="ckpm-fl' + (p2.oneLine ? ' ckpm-grid' : '') + '">' + window._rowStatus(_pKind, _pTxt, '', true)
                            + (_mOnly ? '' : '<span class="ckpm-lbl' + (p2.oneLine ? ' ckpm-c-lbl' : '') + '">' + p2.label + '</span>') + (p2.oneLine ? '<span class="ckpm-c-up">' + (p2.badge || '') + '</span>' : '') + (isCur ? curBadge : '')
                            + '<span class="ckpm-sub">' + p2.sub + '</span></div>'
                            + (canEditReg ? '<div style="display:flex;align-items:center;gap:6px;flex-shrink:0;"><button onclick="event.stopPropagation();' + openFn + '(\'' + regKey + '\',\'' + reg.replace(/'/g,"\\'") + '\',\'' + p2.periodKey.replace(/'/g,"\\'") + '\',true)" title="Edit" style="background:#e3f2fd;color:#1565c0;border:1px solid #90caf9;border-radius:5px;padding:3px 8px;font-size:0.62rem;font-weight:700;cursor:pointer;"><i class="fas fa-pen"></i></button></div>' : '')
                            + '</div>';
                    });
                    return html2;
                }

                // ══════════════════════════════════════════════════════════════════════
                // ── EMB REPORTORIAL ────────────────────────────────────────────────────
                // ══════════════════════════════════════════════════════════════════════
                if (state.currentTab === 'emb') {
                    var embSelYear  = state.selectedYear || new Date().getFullYear();
                    var embCurMo    = new Date().getMonth(); // 0-based
                    var embNow      = new Date();
                    // SMR: Q1=Jan-Mar due Apr15, Q2=Apr-Jun due Jul15, Q3=Jul-Sep due Oct15, Q4=Oct-Dec due Jan15 next yr
                    // CMR: H1=Jan-Jun due Jul15, H2=Jul-Dec due Jan15 next yr
                    // Always render all 4 quarters and both halves so PCO can enter data for any period.
                     // always show all 4 SMR quarters
                     // always show both CMR halves
                    var embActualCurQ = Math.ceil((embCurMo+1)/3); // real current quarter (for upcoming badge)
                    var embActualCurH = embCurMo < 6 ? 1 : 2;     // real current half

                    // Deadline-based counts: only periods whose actual due date has already passed
                    // (used for Missing Fields counter — avoids flagging quarters still within grace period)
                    var _embNowD = embNow.getDate(), _embNowY = embNow.getFullYear();
                    var embDueQ = 0; // how many SMR quarters are past their deadline
                    var embDueH = 0; // how many CMR halves are past their deadline
                    if (embSelYear < _embNowY) {
                        embDueQ = 4; embDueH = 2; // entire past year — all deadlines passed
                    } else if (embSelYear === _embNowY) {
                        // SMR: Q1 due Apr15, Q2 due Jul15, Q3 due Oct15, Q4 due Jan15 next yr
                        if (embCurMo > 3  || (embCurMo === 3  && _embNowD > 15)) embDueQ = 1;
                        if (embCurMo > 6  || (embCurMo === 6  && _embNowD > 15)) embDueQ = 2;
                        if (embCurMo > 9  || (embCurMo === 9  && _embNowD > 15)) embDueQ = 3;
                        // Q4 deadline is Jan 15 of next year — not yet passed while still in selected year
                        // CMR: H1 due Jul15, H2 due Jan15 next yr
                        if (embCurMo > 6  || (embCurMo === 6  && _embNowD > 15)) embDueH = 1;
                        // H2 deadline is Jan 15 of next year — not yet passed while still in selected year
                    }
                    // Note: embCurQ / embCurH still used for region row-display loops below

                    // Helper: check if a project has "Care of Client" or "N/A" set for a specific SMR quarter or CMR half
                    function _isCocExempt(dp, type, idx) {
                        var cocK = type === 'SMR' ? 'emb_SMR (Quarterly) - Care of Client' : 'emb_CMR (Semi-Annual) - Care of Client';
                        var naK  = type === 'SMR' ? 'emb_SMR (Quarterly) - N/A'           : 'emb_CMR (Semi-Annual) - N/A';
                        var v = dp.vals && dp.vals[cocK] && dp.vals[cocK][idx];
                        var n = dp.vals && dp.vals[naK]  && dp.vals[naK][idx];
                        return !!(v === true || v === 'true' || v === '1' || n === true || n === 'true' || n === '1');
                    }

                    // Summary — count only fields for periods whose deadline has passed
                    var embTot=0, embFill=0;
                    var embActProjs = displayProjects.filter(function(dp){ return !isProjectOnStoppage(dp) && !dp.dateFinished && dp.region !== 'PLANT OPERATIONS' && dp.region !== 'CORPORATE'; });
                    embActProjs.forEach(function(dp){
                        for (var q=1; q<=embDueQ; q++) {
                            var _qCoc = _isCocExempt(dp, 'SMR', q);
                            embTot++; if (_qCoc || (dp.vals['emb_SMR (Quarterly) - Submission Date'] && dp.vals['emb_SMR (Quarterly) - Submission Date'][q])) embFill++;
                            embTot++; if (_qCoc || (dp.vals['emb_SMR (Quarterly) - Reference No.'] && dp.vals['emb_SMR (Quarterly) - Reference No.'][q])) embFill++;
                        }
                        for (var h=1; h<=embDueH; h++) {
                            var _hCoc = _isCocExempt(dp, 'CMR', h);
                            embTot++; if (_hCoc || (dp.vals['emb_CMR (Semi-Annual) - Submission Date'] && dp.vals['emb_CMR (Semi-Annual) - Submission Date'][h])) embFill++;
                            embTot++; if (_hCoc || (dp.vals['emb_CMR (Semi-Annual) - Reference No.'] && dp.vals['emb_CMR (Semi-Annual) - Reference No.'][h])) embFill++;
                        }
                    });

                    var SMR_LABELS = ['Q1 (Jan–Mar)', 'Q2 (Apr–Jun)', 'Q3 (Jul–Sep)', 'Q4 (Oct–Dec)'];
                    var SMR_DUE   = ['Due: Apr 15',   'Due: Jul 15',   'Due: Oct 15',   'Due: Jan 15'];
                    var CMR_LABELS = ['H1 (Jan–Jun)', 'H2 (Jul–Dec)'];
                    var CMR_DUE   = ['Due: Jul 15',   'Due: Jan 15'];

                    REGIONS.forEach(function(reg) {
                        if (reg === 'CORPORATE') return;
                        var projs = displayProjects.filter(function(p){ return p.region === reg; });
                        if (!projs.length) return;
                        // Active (non-stoppage) projects for compliance counting
                        var activeProjs = projs.filter(function(p){ return !isProjectOnStoppage(p) && !p.dateFinished; });
                        var canEditReg = state.isEditing && UserAccounts.canEdit(state.currentUser&&state.currentUser.email, reg) && UserAccounts.canEditTab(state.currentUser&&state.currentUser.email, 'emb');
                        var isCollapsed = isRegionCollapsed(reg);
                        var regKey = reg.replace(/[^a-zA-Z0-9]/g,'_');
                        var isPlantOps = reg === 'PLANT OPERATIONS';

                        // Per-region status for the banner pills
                        var _rgTot = 0, _rgFill = 0;
                        activeProjs.forEach(function(dp){
                            for (var q3=1; q3<=embDueQ; q3++) {
                                var _qc3 = _isCocExempt(dp, 'SMR', q3);
                                _rgTot++; if (_qc3 || (dp.vals['emb_SMR (Quarterly) - Submission Date'] && dp.vals['emb_SMR (Quarterly) - Submission Date'][q3])) _rgFill++;
                                _rgTot++; if (_qc3 || (dp.vals['emb_SMR (Quarterly) - Reference No.'] && dp.vals['emb_SMR (Quarterly) - Reference No.'][q3])) _rgFill++;
                            }
                            for (var h3=1; h3<=embDueH; h3++) {
                                var _hc3 = _isCocExempt(dp, 'CMR', h3);
                                _rgTot++; if (_hc3 || (dp.vals['emb_CMR (Semi-Annual) - Submission Date'] && dp.vals['emb_CMR (Semi-Annual) - Submission Date'][h3])) _rgFill++;
                                _rgTot++; if (_hc3 || (dp.vals['emb_CMR (Semi-Annual) - Reference No.'] && dp.vals['emb_CMR (Semi-Annual) - Reference No.'][h3])) _rgFill++;
                            }
                        });

                        // count complete periods (active projects only) — always against all 4Q + 2H
                        // A period is "complete" if every active project has SD+RN filled OR has Care of Client checked
                        var embComplete = 0, embTotal2 = 6;
                        for (var q=1; q<=4; q++) {
                            var _qIdx = q;
                            var qOk = activeProjs.every(function(p){ return _isCocExempt(p,'SMR',_qIdx)||(p.vals['emb_SMR (Quarterly) - Submission Date']&&p.vals['emb_SMR (Quarterly) - Submission Date'][_qIdx]&&p.vals['emb_SMR (Quarterly) - Reference No.']&&p.vals['emb_SMR (Quarterly) - Reference No.'][_qIdx]); });
                            if(qOk) embComplete++;
                        }
                        for (var h=1; h<=2; h++) {
                            var _hIdx = h;
                            var hOk = activeProjs.every(function(p){ return _isCocExempt(p,'CMR',_hIdx)||(p.vals['emb_CMR (Semi-Annual) - Submission Date']&&p.vals['emb_CMR (Semi-Annual) - Submission Date'][_hIdx]&&p.vals['emb_CMR (Semi-Annual) - Reference No.']&&p.vals['emb_CMR (Semi-Annual) - Reference No.'][_hIdx]); });
                            if(hOk) embComplete++;
                        }

                        html += window.regionBanner({ id: 'region-banner-' + reg, reg: reg, toggle: 'toggleRegion', collapsed: isCollapsed, editable: canEditReg, icon: isPlantOps ? 'fa-industry' : 'fa-location-dot', right: ''
                            +'<span class="rbadge rbadge-count rb-proj">'+projs.length+(isPlantOps?' PLANT'+(projs.length!==1?'S':''):' PROJ')+'</span>'
                            +'<span class="rbadge" style="background:rgba(255,255,255,0.18);color:#c8e6c9;">'+embComplete+'/'+embTotal2+' complete</span>'
                            +window._rbStatusPills(_rgTot,_rgFill,_rgTot-_rgFill,'missing') })
                            +'<div id="region-content-'+reg+'" class="region-content '+(isCollapsed?'collapsed':'')+'">'; 

                        var _embSub = function(sd, rn, n) {
                            var col = function(v) { return v===n ? '#2e7d32' : v>0 ? '#e65100' : '#c62828'; };
                            var num = function(v) { return '<span style="color:'+col(v)+';font-weight:700;">'+v+'/'+n+'</span>'; };
                            if (sd === rn) return '<span class="ckpm-c-sd">Submitted: '+num(sd)+'</span>';
                            return '<span class="ckpm-c-sd">Submission Date: '+num(sd)+'</span><span class="ckpm-c-rn">Ref No: '+num(rn)+'</span>';
                        };
                        var periods2 = [];
                        for (var q2=1; q2<=4; q2++) {
                            var _q2 = q2; // capture for closure
                            var sdFill = activeProjs.filter(function(p){ return _isCocExempt(p,'SMR',_q2)||(p.vals['emb_SMR (Quarterly) - Submission Date']&&p.vals['emb_SMR (Quarterly) - Submission Date'][_q2]); }).length;
                            var rnFill = activeProjs.filter(function(p){ return _isCocExempt(p,'SMR',_q2)||(p.vals['emb_SMR (Quarterly) - Reference No.']&&p.vals['emb_SMR (Quarterly) - Reference No.'][_q2]); }).length;
                            var isUpcomingQ = (embSelYear === _embNowY && q2 > embActualCurQ) || embSelYear > _embNowY;
                            var upcomingBadgeQ = isUpcomingQ ? ' &nbsp;<span style="font-size:0.58rem;background:#e3f2fd;color:#1565c0;border-radius:10px;padding:1px 6px;font-weight:700;vertical-align:middle;">Upcoming</span>' : '';
                            periods2.push({
                                label: 'SMR — ' + SMR_LABELS[q2-1] + ' &nbsp;<span style="font-size:0.6rem;color:#888;">'+SMR_DUE[q2-1]+'</span>',
                                badge: upcomingBadgeQ,
                                shortLabel: 'Q'+q2,
                                noNumber: true, oneLine: true,
                                filledCount: sdFill+rnFill, totalSlots: activeProjs.length*2,
                                sub: _embSub(sdFill, rnFill, activeProjs.length),
                                periodKey: 'SMR_Q'+q2,
                                dueDate: (q2===4) ? new Date(embSelYear+1, 0, 15, 23, 59, 59) : new Date(embSelYear, q2*3, 15, 23, 59, 59)
                            });
                        }
                        for (var h2=1; h2<=2; h2++) {
                            var _h2 = h2; // capture for closure
                            var csdFill = activeProjs.filter(function(p){ return _isCocExempt(p,'CMR',_h2)||(p.vals['emb_CMR (Semi-Annual) - Submission Date']&&p.vals['emb_CMR (Semi-Annual) - Submission Date'][_h2]); }).length;
                            var crnFill = activeProjs.filter(function(p){ return _isCocExempt(p,'CMR',_h2)||(p.vals['emb_CMR (Semi-Annual) - Reference No.']&&p.vals['emb_CMR (Semi-Annual) - Reference No.'][_h2]); }).length;
                            var isUpcomingH = (embSelYear === _embNowY && h2 > embActualCurH) || embSelYear > _embNowY;
                            var upcomingBadgeH = isUpcomingH ? ' &nbsp;<span style="font-size:0.58rem;background:#e3f2fd;color:#1565c0;border-radius:10px;padding:1px 6px;font-weight:700;vertical-align:middle;">Upcoming</span>' : '';
                            periods2.push({
                                label: 'CMR — ' + CMR_LABELS[h2-1] + ' &nbsp;<span style="font-size:0.6rem;color:#888;">'+CMR_DUE[h2-1]+'</span>',
                                badge: upcomingBadgeH,
                                shortLabel: 'H'+h2,
                                noNumber: true, oneLine: true,
                                filledCount: csdFill+crnFill, totalSlots: activeProjs.length*2,
                                sub: _embSub(csdFill, crnFill, activeProjs.length),
                                periodKey: 'CMR_H'+h2,
                                dueDate: (h2===2) ? new Date(embSelYear+1, 0, 15, 23, 59, 59) : new Date(embSelYear, 6, 15, 23, 59, 59)
                            });
                        }
                        html += _buildRegionMonthList(reg, regKey, periods2, canEditReg, 'window.openEmbDialog');
                        html += '</div>';
                    });

                    container.innerHTML = html;

                    window.openEmbDialog = function(regKey, reg, periodKey, editMode) {
                        var selYear = state.selectedYear || new Date().getFullYear();
                        var regProjs = (state.filteredProjects||state.projects).filter(function(p){ return p.region===reg; }); // FIX: keep finished projects visible for past-month data
                        if (!regProjs.length) return;
                        var canEdit = !!editMode;
                        var dis = canEdit ? '' : 'disabled';
                        if (canEdit) _activateEditMode();

                        var isSmr = periodKey.startsWith('SMR');
                        var periodIdx = parseInt(periodKey.split('_')[1].replace(/[QH]/,''));
                        var periodLabel = isSmr ? SMR_LABELS[periodIdx-1] : CMR_LABELS[periodIdx-1];
                        var periodDue   = isSmr ? SMR_DUE[periodIdx-1]   : CMR_DUE[periodIdx-1];

                        var sdKey  = isSmr ? 'emb_SMR (Quarterly) - Submission Date' : 'emb_CMR (Semi-Annual) - Submission Date';
                        var rnKey  = isSmr ? 'emb_SMR (Quarterly) - Reference No.'   : 'emb_CMR (Semi-Annual) - Reference No.';
                        var cocKey = isSmr ? 'emb_SMR (Quarterly) - Care of Client'   : 'emb_CMR (Semi-Annual) - Care of Client';
                        var naKey  = isSmr ? 'emb_SMR (Quarterly) - N/A'              : 'emb_CMR (Semi-Annual) - N/A';
                        var extraKey = isSmr ? 'emb_extra_smr' : 'emb_extra_cmr';

                        // Overdue check
                        var _embNow2 = new Date();
                        var _embNowY2 = _embNow2.getFullYear();
                        var _embNowM2 = _embNow2.getMonth();
                        var _embNowD2 = _embNow2.getDate();
                        var _isPeriodOverdue = false;
                        if (selYear < _embNowY2) {
                            _isPeriodOverdue = true;
                        } else if (selYear === _embNowY2) {
                            if (isSmr) {
                                if (periodIdx === 4) {
                                    var _q4dlY = selYear + 1;
                                    if (_embNowY2 > _q4dlY) _isPeriodOverdue = true;
                                    else if (_embNowY2 === _q4dlY && (_embNowM2 > 0 || (_embNowM2 === 0 && _embNowD2 > 15))) _isPeriodOverdue = true;
                                } else {
                                    var _dlM0 = periodIdx * 3;
                                    if (_embNowM2 > _dlM0 || (_embNowM2 === _dlM0 && _embNowD2 > 15)) _isPeriodOverdue = true;
                                }
                            } else {
                                if (periodIdx === 2) {
                                    var _h2dlY = selYear + 1;
                                    if (_embNowY2 > _h2dlY) _isPeriodOverdue = true;
                                    else if (_embNowY2 === _h2dlY && (_embNowM2 > 0 || (_embNowM2 === 0 && _embNowD2 > 15))) _isPeriodOverdue = true;
                                } else {
                                    if (_embNowM2 > 6 || (_embNowM2 === 6 && _embNowD2 > 15)) _isPeriodOverdue = true;
                                }
                            }
                        }

                        // ── Build per-project-column table ─────────────────────────────────────
                        // Columns = projects, Rows = (primary + extra) entries per project
                        // Each entry has: Submission Date, Reference No., Care of Client checkbox

                        function _embCellBg(val) {
                            if (val) return '#c8e6c9';
                            return _isPeriodOverdue ? '#ffcdd2' : '#fffde7';
                        }
                        function _embCellBorder(val) {
                            if (val) return '#a5d6a7';
                            return _isPeriodOverdue ? '#ef9a9a' : '#ffe082';
                        }
                        function _embCellColor(val) {
                            if (val) return '#2e7d32';
                            return _isPeriodOverdue ? '#c62828' : '#7a5c00';
                        }

                        function _buildEmbProjectCol(p, projIdx) {
                            var stopped = isProjectOnStoppage(p);
                            var isFinished = !!p.dateFinished;
                            var pCanEdit = canEdit; // SMR and CMR stay editable even when Finished
                            var pnSafe = p.name.replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'&quot;');
                            var pnJs   = p.name.replace(/\\/g,'\\\\').replace(/'/g,"\\'");

                            // Work-stoppage projects are still shown and editable in EMB modal
                            // (they may still need to file reports for the period before stoppage)

                            // Primary entry (index = periodIdx in the original key)
                            var sdVal  = (p.vals[sdKey]  && p.vals[sdKey][periodIdx])  ? p.vals[sdKey][periodIdx]  : '';
                            var rnVal  = (p.vals[rnKey]  && p.vals[rnKey][periodIdx])  ? p.vals[rnKey][periodIdx]  : '';
                            var cocVal = !!(p.vals[cocKey] && (p.vals[cocKey][periodIdx] === true || p.vals[cocKey][periodIdx] === 'true' || p.vals[cocKey][periodIdx] === '1'));
                            var naVal  = !!(p.vals[naKey]  && (p.vals[naKey][periodIdx]  === true || p.vals[naKey][periodIdx]  === 'true' || p.vals[naKey][periodIdx]  === '1'));

                            // "Care of Client" or "N/A" = project is exempt for this period (green)
                            // Fields are hidden and treated as satisfied/compliant
                            var _cocExempt = cocVal || naVal; // shorthand

                            // Extra entries from emb_extra_smr / emb_extra_cmr
                            var extras = (p.vals[extraKey] && Array.isArray(p.vals[extraKey])) ? p.vals[extraKey] : [];

                            var html = '<td style="padding:8px;border:1px solid '+(stopped?'#e0e0e0':_cocExempt?'#81c784':'#c8e6c9')+';width:220px;min-width:220px;max-width:220px;vertical-align:top;text-align:left;background:'+(stopped?'#fafafa':_cocExempt?'#f1fff1':'')+';">';

                            // Care of Client / N/A: project-level for this period, so it sits above the facility entries (same for every facility)
                            html += '<div class="emb-ex-row">' + _embExemptBox('coc', cocVal, cocKey) + _embExemptBox('na', naVal, naKey) + '</div>';

                            // ── Primary entry block ──
                            var facKey = isSmr ? 'emb_SMR (Quarterly) - Facility' : 'emb_CMR (Semi-Annual) - Facility';
                            var facVal = (p.vals[facKey] && p.vals[facKey][periodIdx]) ? p.vals[facKey][periodIdx] : '';
                            var _sdEffective = _cocExempt ? true : sdVal;
                            var _rnEffective = _cocExempt ? true : rnVal;
                            html += '<div class="emb-entry-block" style="margin-bottom:8px;padding:8px;border:1px solid '+(_cocExempt?'#a5d6a7':'#a5d6a7')+';border-radius:6px;background:'+(_cocExempt?'#e8f5e9':'#f1f8f1')+';position:relative;">';

                            {   // fields stay visible; greyed out + disabled (and cleared) when Care of Client / N/A is set
                                var _exBg = _embCellBg(''), _exBd = _embCellBorder(''), _exC = _embCellColor('');
                                var _emptyAttr = ' data-ebg="' + _exBg + '" data-ebd="' + _exBd + '" data-ec="' + _exC + '"';
                                var _dis = (pCanEdit && !_cocExempt) ? '' : 'disabled';
                                var _vFac = _cocExempt ? '' : facVal, _vSd = _cocExempt ? '' : sdVal, _vRn = _cocExempt ? '' : rnVal;
                                // Facility
                                html += '<div style="margin-bottom:6px;">';
                                html += ('<div style="font-size:0.6rem;color:#555;margin-bottom:3px;font-weight:600;">' + window.icon("plant") + ' Facility</div>');
                                var _facBg = _cocExempt ? '#eeeeee' : _embCellBg(facVal); var _facBd = _cocExempt ? '#dddddd' : _embCellBorder(facVal); var _facC = _cocExempt ? '#9e9e9e' : _embCellColor(facVal);
                                html += '<input type="text" value="' + (_vFac||'').replace(/"/g,'&quot;') + '" ' + _dis
                                    + ' data-pname="' + pnSafe + '" data-key="' + facKey + '" data-idx="' + periodIdx + '"' + _emptyAttr
                                    + ' placeholder="Facility name..."'
                                    + ' style="width:100%;border:1px solid ' + _facBd + ';border-radius:4px;padding:4px 6px;font-size:0.72rem;font-weight:700;background:' + _facBg + ';color:' + _facC + ';box-sizing:border-box;text-align:left;display:block;"'
                                    + ' oninput="updateVal(this.dataset.pname,this.dataset.key,parseInt(this.dataset.idx),this.value);this.style.background=this.value?\'#c8e6c9\':\'#ffcdd2\';this.style.borderColor=this.value?\'#a5d6a7\':\'#ef9a9a\';this.style.color=this.value?\'#2e7d32\':\'#c62828\';this.setAttribute(\'data-tip\',this.value);"'
                                    + ' data-tip="' + (facVal||'').replace(/"/g,'&quot;') + '"'
                                    + '>';
                                html += '</div>';

                                // Submission Date
                                var _sdBg = _cocExempt ? '#eeeeee' : _embCellBg(_sdEffective); var _sdBd = _cocExempt ? '#dddddd' : _embCellBorder(_sdEffective); var _sdC = _cocExempt ? '#9e9e9e' : _embCellColor(_sdEffective);
                                html += '<div style="margin-bottom:6px;">';
                                html += ('<div style="font-size:0.6rem;color:#555;margin-bottom:3px;font-weight:600;">' + window.icon("calendar") + ' Submission Date</div>');
                                html += '<input type="date" value="' + _vSd + '" ' + _dis
                                    + ' data-pname="' + pnSafe + '" data-key="' + sdKey + '" data-idx="' + periodIdx + '"' + _emptyAttr
                                    + ' style="width:100%;border:1px solid ' + _sdBd + ';border-radius:4px;padding:4px 6px;font-size:0.72rem;font-weight:700;background:' + _sdBg + ';color:' + _sdC + ';box-sizing:border-box;text-align:left;display:block;"'
                                    + ' oninput="updateVal(this.dataset.pname,this.dataset.key,parseInt(this.dataset.idx),this.value);this.style.background=this.value?\'#c8e6c9\':\'#ffcdd2\';this.style.borderColor=this.value?\'#a5d6a7\':\'#ef9a9a\';this.style.color=this.value?\'#2e7d32\':\'#c62828\';">';
                                html += '</div>';

                                // Reference No.
                                var _rnBg = _cocExempt ? '#eeeeee' : _embCellBg(_rnEffective); var _rnBd = _cocExempt ? '#dddddd' : _embCellBorder(_rnEffective); var _rnC = _cocExempt ? '#9e9e9e' : _embCellColor(_rnEffective);
                                html += '<div style="margin-bottom:6px;">';
                                html += ('<div style="font-size:0.6rem;color:#555;margin-bottom:3px;font-weight:600;">' + '<i class="fa-solid fa-file-signature"></i>' + ' Reference No.</div>');
                                html += '<input type="text" inputmode="numeric" pattern="[0-9]*" value="' + (_vRn||'').replace(/"/g,'&quot;') + '" ' + _dis
                                    + ' data-pname="' + pnSafe + '" data-key="' + rnKey + '" data-idx="' + periodIdx + '"' + _emptyAttr
                                    + ' placeholder="Ref number..."'
                                    + ' style="width:100%;border:1px solid ' + _rnBd + ';border-radius:4px;padding:4px 6px;font-size:0.72rem;font-weight:700;background:' + _rnBg + ';color:' + _rnC + ';box-sizing:border-box;text-align:left;display:block;"'
                                    + ' onkeypress="return /[0-9]/.test(event.key);"'
                                    + ' oninput="this.value=this.value.replace(/[^0-9]/g,\'\');updateVal(this.dataset.pname,this.dataset.key,parseInt(this.dataset.idx),this.value);this.style.background=this.value?\'#c8e6c9\':\'#ffcdd2\';this.style.borderColor=this.value?\'#a5d6a7\':\'#ef9a9a\';this.style.color=this.value?\'#2e7d32\':\'#c62828\';">';
                                html += '</div>';
                            }

                            // Care of Client + N/A options (side by side). Either one exempts the project for this period; they are mutually exclusive.
                            function _embExemptBox(kind, on, key) {
                                var offLbl = kind === 'coc' ? 'Care of Client' : 'N/A';
                                var b = '<div style="flex:0 0 auto;display:inline-flex;align-items:center;gap:8px;padding:2px 0;cursor:pointer;" onclick="this.querySelector(\'input[type=checkbox]\').click()">';
                                b += '<input type="checkbox"' + (on?' checked':'') + ' ' + (pCanEdit?'':'disabled')
                                    + ' data-pname="' + pnSafe + '" data-key="' + key + '" data-idx="' + periodIdx + '" data-inputtype="checkbox" data-exempt="' + kind + '"'
                                    + ' style="cursor:' + (canEdit?'pointer':'not-allowed') + ';"'
                                    + ' onclick="event.stopPropagation()"'
                                    + ' onchange="window._embToggleExempt(this)">';
                                b += '<span style="font-size:0.78rem;color:#333;cursor:pointer;">' + offLbl + '</span>';
                                b += '</div>';
                                return b;
                            }
                            html += '</div>'; // end primary entry block

                            // ── Extra entries ──
                            extras.forEach(function(entry, eIdx) {
                                var eFac = (entry.fac && entry.fac[periodIdx]) ? entry.fac[periodIdx] : '';
                                var eSd  = (entry.sd && entry.sd[periodIdx]) ? entry.sd[periodIdx] : '';
                                var eRn  = (entry.rn && entry.rn[periodIdx]) ? entry.rn[periodIdx] : '';
                                var _eSdBg = _embCellBg(eSd); var _eSdBd = _embCellBorder(eSd); var _eSdC = _embCellColor(eSd);
                                var _eRnBg = _embCellBg(eRn); var _eRnBd = _embCellBorder(eRn); var _eRnC = _embCellColor(eRn);
                                if (_cocExempt) { _eSdBg = _eRnBg = '#eeeeee'; _eSdBd = _eRnBd = '#dddddd'; _eSdC = _eRnC = '#9e9e9e'; }
                                var _eEmpty = ' data-ebg="' + _embCellBg('') + '" data-ebd="' + _embCellBorder('') + '" data-ec="' + _embCellColor('') + '"';
                                var eType = isSmr ? 'SMR' : 'CMR';

                                html += '<div class="emb-entry-block" style="margin-bottom:8px;padding:8px;border:1px solid #90caf9;border-radius:6px;background:#e3f2fd;position:relative;">';
                                // Remove button only, no Entry # label
                                if (canEdit) {
                                    html += '<div style="display:flex;justify-content:flex-end;margin-bottom:6px;">';
                                    html += '<button onclick="window._removeEmbExtraEntry(\'' + pnJs + '\',\'' + eType + '\',' + eIdx + ')" '
                                        + 'style="background:#ffcdd2;color:#c62828;border:1px solid #ef9a9a;border-radius:4px;padding:1px 6px;font-size:0.6rem;cursor:pointer;line-height:1.4;" '
                                        + 'title="Remove this entry"><i class="fas fa-times"></i> Remove</button>';
                                    html += '</div>';
                                }

                                // Extra Facility
                                html += '<div style="margin-bottom:6px;">';
                                html += ('<div style="font-size:0.6rem;color:#555;margin-bottom:3px;font-weight:600;">' + window.icon("plant") + ' Facility</div>');
                                var _eFacBg = _embCellBg(eFac); var _eFacBd = _embCellBorder(eFac); var _eFacC = _embCellColor(eFac);
                                if (_cocExempt) { _eFacBg = '#eeeeee'; _eFacBd = '#dddddd'; _eFacC = '#9e9e9e'; }
                                html += '<input type="text" value="' + (eFac||'').replace(/"/g,'&quot;') + '" ' + (pCanEdit && !_cocExempt ? '' : 'disabled')
                                    + ' data-pname="' + pnSafe + '" data-extrakey="' + extraKey + '" data-eidx="' + eIdx + '" data-field="fac" data-period="' + periodIdx + '"' + _eEmpty
                                    + ' placeholder="Facility name..."'
                                    + ' style="width:100%;border:1px solid ' + _eFacBd + ';border-radius:4px;padding:4px 6px;font-size:0.72rem;font-weight:700;background:' + _eFacBg + ';color:' + _eFacC + ';box-sizing:border-box;text-align:left;display:block;"'
                                    + ' oninput="updateEmbEntry(this.dataset.pname,\'' + eType + '\',' + eIdx + ',\'fac\',' + periodIdx + ',this.value);this.style.background=this.value?\'#c8e6c9\':\'#ffcdd2\';this.style.borderColor=this.value?\'#a5d6a7\':\'#ef9a9a\';this.style.color=this.value?\'#2e7d32\':\'#c62828\';this.setAttribute(\'data-tip\',this.value);"'
                                    + ' data-tip="' + (eFac||'').replace(/"/g,'&quot;') + '"'
                                    + '>';
                                html += '</div>';

                                // Extra Submission Date
                                html += '<div style="margin-bottom:6px;">';
                                html += ('<div style="font-size:0.6rem;color:#555;margin-bottom:3px;font-weight:600;">' + window.icon("calendar") + ' Submission Date</div>');
                                html += '<input type="date" value="' + eSd + '" ' + (pCanEdit && !_cocExempt ? '' : 'disabled')
                                    + ' data-pname="' + pnSafe + '" data-extrakey="' + extraKey + '" data-eidx="' + eIdx + '" data-field="sd" data-period="' + periodIdx + '"' + _eEmpty
                                    + ' style="width:100%;border:1px solid ' + _eSdBd + ';border-radius:4px;padding:4px 6px;font-size:0.72rem;font-weight:700;background:' + _eSdBg + ';color:' + _eSdC + ';box-sizing:border-box;text-align:left;display:block;"'
                                    + ' oninput="updateEmbEntry(this.dataset.pname,\'' + eType + '\',' + eIdx + ',\'sd\',' + periodIdx + ',this.value);this.style.background=this.value?\'#c8e6c9\':\'#ffcdd2\';this.style.borderColor=this.value?\'#a5d6a7\':\'#ef9a9a\';this.style.color=this.value?\'#2e7d32\':\'#c62828\';">';
                                html += '</div>';

                                // Extra Reference No.
                                html += '<div style="margin-bottom:6px;">';
                                html += ('<div style="font-size:0.6rem;color:#555;margin-bottom:3px;font-weight:600;">' + '<i class="fa-solid fa-file-signature"></i>' + ' Reference No.</div>');
                                html += '<input type="text" inputmode="numeric" pattern="[0-9]*" value="' + (eRn||'').replace(/"/g,'&quot;') + '" ' + (pCanEdit && !_cocExempt ? '' : 'disabled')
                                    + ' data-pname="' + pnSafe + '" data-extrakey="' + extraKey + '" data-eidx="' + eIdx + '" data-field="rn" data-period="' + periodIdx + '"' + _eEmpty
                                    + ' placeholder="Ref number..."'
                                    + ' style="width:100%;border:1px solid ' + _eRnBd + ';border-radius:4px;padding:4px 6px;font-size:0.72rem;font-weight:700;background:' + _eRnBg + ';color:' + _eRnC + ';box-sizing:border-box;text-align:left;display:block;"'
                                    + ' onkeypress="return /[0-9]/.test(event.key);"'
                                    + ' oninput="this.value=this.value.replace(/[^0-9]/g,\'\');updateEmbEntry(this.dataset.pname,\'' + eType + '\',' + eIdx + ',\'rn\',' + periodIdx + ',this.value);this.style.background=this.value?\'#c8e6c9\':\'#ffcdd2\';this.style.borderColor=this.value?\'#a5d6a7\':\'#ef9a9a\';this.style.color=this.value?\'#2e7d32\':\'#c62828\';">';
                                html += '</div>';
                                html += '</div>'; // end extra entry block
                            });

                            // ── + Add Entry button (per project column) ──
                            if (canEdit) {
                                var eType2 = isSmr ? 'SMR' : 'CMR';
                                html += '<button onclick="window._addEmbExtraEntryInModal(\'' + pnJs + '\',\'' + eType2 + '\',\'' + regKey + '\',\'' + reg.replace(/'/g,"\\'") + '\',\'' + periodKey + '\')" '
                                    + 'style="width:100%;padding:6px 10px;background:#e8f5e9;color:#2e7d32;border:1px dashed #81c784;border-radius:6px;font-size:0.68rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px;transition:background 0.15s;" '
                                    + 'onmouseenter="this.style.background=\'#c8e6c9\'" onmouseleave="this.style.background=\'#e8f5e9\'">'
                                    + '<i class="fas fa-plus"></i> Add Entry</button>';
                            }

                            html += '</td>';
                            return html;
                        }

                        // Build the table — header row (project names) + one combined row (all entries per project)
                        var _T = window.ESH_RPT_MODAL_TBL;
                        var projNameHtml = regProjs.map(function(p){
                            var _stopped = isProjectOnStoppage(p) && !p.dateFinished;
                            var _stopBadge = _stopped
                                ? ' ' + statusBadge('work-stoppage', { title: 'Work Stoppage — entries still editable' })
                                : '';
                            return '<th style="padding:8px 10px;border:1px solid ' + _T.bd + ';width:220px;min-width:220px;max-width:220px;text-align:center;background:' + _T.proj + ';color:' + _T.txt + ';font-size:0.67rem;font-weight:800;white-space:normal;word-break:break-word;">'
                                + p.name + _stopBadge
                                + '</th>';
                        }).join('');

                        var projColsHtml = regProjs.map(function(p, i){ return _buildEmbProjectCol(p, i); }).join('');

                        var tableHtml = '<table id="emb-modal-table" class="emb-modal-table" style="border-collapse:collapse;font-size:0.68rem;width:max-content;min-width:100%;">'
                            + '<thead><tr style="background:' + _T.grp + ';color:' + _T.txt + ';font-size:0.67rem;font-weight:800;">'
                            + projNameHtml + '</tr></thead>'
                            + '<tbody><tr style="background:' + _T.rowBg + ';">'
                            + projColsHtml
                            + '</tr></tbody></table>';

                        var header = _modalHeader('linear-gradient(90deg,#0d3d0f,#1b5e20,#2e7d32)',
                            (canEdit?('' + window.icon("edit") + ' Edit'):('' + window.icon("search") + ' View'))+' EMB — <span style="color:#fbc02d;">'+(isSmr?'SMR':'CMR')+' '+periodLabel+'</span>',
                            '<i class="fas fa-location-dot" style="margin-right:4px;"></i>'+reg+' · '+regProjs.length+' project'+(regProjs.length!==1?'s':'')+' &nbsp;·&nbsp; '+selYear,
                            'emb-modal');
                        header.iconImg = window.EMB_LOGO;
                        var infoBar = _embInfoBar(periodDue
                            + (canEdit ? ('<br><small style="margin-top:6px;display:inline-block;">' + window.icon("idea") + ' Click <strong>+ Add Entry</strong> inside a project column to add multiple submissions.</small>') : ''));
                        var footer = _modalFooter(
                            canEdit ? 'window._saveEmbModal()' : null,
                            canEdit ? null : 'window.openEmbDialog(\''+regKey.replace(/'/g,"\\'")+'\',\''+reg.replace(/'/g,"\\'")+'\',\''+periodKey+'\',true)',
                            'emb-modal');

                        // One project at a time: Prev/Next on top, facility toggles below. All projects stay in the DOM (hidden) so Save still reads every input.
                        var _embNavHtml = '<div class="emb-sticky">'
                            + '<div class="emb-nav">'
                            + '<button type="button" class="emb-nav-btn" data-dir="-1"><i class="fas fa-chevron-left"></i> Prev</button>'
                            + '<div class="emb-nav-mid"><div class="emb-nav-title"><span class="emb-dot"></span><span class="emb-nav-name"></span></div><span class="emb-nav-count"></span></div>'
                            + '<button type="button" class="emb-nav-btn" data-dir="1">Next <i class="fas fa-chevron-right"></i></button>'
                            + '</div>'
                            + '<div class="emb-fac-bar"></div>'
                            + '</div>';
                        var modal = window.eshOpenModal({
                            id: 'emb-modal', icon: 'fa-leaf', iconImg: header.iconImg,
                            title: header.title, sub: header.sub,
                            width: 'min(640px,96vw)',
                            body: infoBar + _embNavHtml + '<div class="emb-body">' + tableHtml + '</div>',
                            foot: footer
                        });
                        modal.setAttribute('data-reg', reg);
                        modal.setAttribute('data-period', periodKey);
                        modal.setAttribute('data-regkey', regKey);
                        modal.classList.add('emb-modal');   // class, not only the id: the close ghost clone has no ids
                        window._embInitNav(modal, regProjs.map(function(p){
                            return { name: p.name, stopped: !!(isProjectOnStoppage(p) && !p.dateFinished) };
                        }), _isPeriodOverdue);
                    };

                    // EMB modal navigation: one project at a time (Prev/Next) + facility toggles inside the project.
                    // Nothing is removed from the DOM, other projects/facilities are only hidden, so _saveEmbModal still sees every input.
                    window._embInitNav = function(modal, meta, overdue) {
                        var tds = modal.querySelectorAll('#emb-modal-table tbody tr > td');
                        var prevBtn = modal.querySelector('.emb-nav-btn[data-dir="-1"]');
                        var nextBtn = modal.querySelector('.emb-nav-btn[data-dir="1"]');
                        var nameEl = modal.querySelector('.emb-nav-name');
                        var countEl = modal.querySelector('.emb-nav-count');
                        var dotEl = modal.querySelector('.emb-nav-mid .emb-dot');
                        var facBar = modal.querySelector('.emb-fac-bar');
                        var bodyEl = modal.querySelector('.mdl-body');
                        var cur = { p: 0, f: 0 };
                        var keep = window._embKeepNav; window._embKeepNav = null;
                        if (keep && keep.p >= 0 && keep.p < tds.length) { cur.p = keep.p; cur.f = keep.f; }

                        function blocksOf(td) { return td ? td.querySelectorAll('.emb-entry-block') : []; }
                        function blockState(b) {
                            var _tdx = b.closest('td'); if (_tdx && _tdx.querySelector('input[data-exempt]:checked')) return 'exempt';
                            var ins = b.querySelectorAll('input[type="text"],input[type="date"]'), n = 0, f = 0;
                            ins.forEach(function(i){ n++; if (i.value) f++; });
                            return (n && f === n) ? 'done' : (overdue ? 'late' : 'miss');
                        }
                        function projState(td) {
                            var bl = blocksOf(td), sts = [], i;
                            for (i = 0; i < bl.length; i++) sts.push(blockState(bl[i]));
                            if (!sts.length) return 'miss';
                            for (i = 0; i < sts.length; i++) if (sts[i] === 'late' || sts[i] === 'miss') return sts[i];
                            return sts.every(function(s){ return s === 'exempt'; }) ? 'exempt' : 'done';
                        }
                        function refresh() {
                            var td = tds[cur.p], bl = blocksOf(td);
                            if (cur.f === 'last') cur.f = bl.length - 1;
                            if (cur.f >= bl.length) cur.f = bl.length - 1;
                            if (cur.f < 0) cur.f = 0;
                            tds.forEach(function(t, i){ t.classList.toggle('emb-active', i === cur.p); });
                            bl.forEach(function(b, i){ b.classList.toggle('emb-fac-active', i === cur.f); });
                            nameEl.textContent = meta[cur.p].name;
                            if (meta[cur.p].stopped) {
                                var bd = document.createElement('span'); bd.className = 'emb-badge';
                                bd.innerHTML = '<i class="fas fa-pause-circle"></i> On Stoppage';
                                nameEl.appendChild(document.createTextNode(' ')); nameEl.appendChild(bd);
                            }
                            countEl.textContent = (cur.p + 1) + ' of ' + tds.length;
                            dotEl.className = 'emb-dot ' + projState(td);
                            prevBtn.disabled = cur.p <= 0;
                            nextBtn.disabled = cur.p >= tds.length - 1;
                            // Facility toggles are always shown (even for one entry) so the layout below does not jump between projects
                            if (bl.length >= 1) {
                                facBar.style.display = '';
                                var h = '';
                                bl.forEach(function(b, i){
                                    var fi = b.querySelector('input[type="text"]');
                                    var tip = (fi && fi.value) ? fi.value.replace(/"/g, '&quot;') : '';
                                    h += '<button type="button" class="emb-fac-btn' + (i === cur.f ? ' on' : '') + '" data-f="' + i + '"' + (tip ? ' title="' + tip + '"' : '') + '>'
                                       + '<span class="emb-dot ' + blockState(b) + '"></span>Facility ' + (i + 1) + '</button>';
                                });
                                facBar.innerHTML = h;
                            } else {
                                facBar.style.display = 'none';
                                facBar.innerHTML = '';
                            }
                            modal.setAttribute('data-active-proj', cur.p);
                            modal.setAttribute('data-active-fac', cur.f);
                            // Red border only on empty fields when the period is overdue
                            modal.querySelectorAll('.emb-entry-block input[type="text"],.emb-entry-block input[type="date"]').forEach(function(i){ i.classList.toggle('emb-bad', !!overdue && !i.value && !i.disabled); });
                        }
                        prevBtn.onclick = function(){ if (cur.p > 0) { cur.p--; cur.f = 0; refresh(); if (bodyEl) bodyEl.scrollTop = 0; } };
                        nextBtn.onclick = function(){ if (cur.p < tds.length - 1) { cur.p++; cur.f = 0; refresh(); if (bodyEl) bodyEl.scrollTop = 0; } };
                        facBar.addEventListener('click', function(e){
                            var b = e.target.closest('.emb-fac-btn'); if (!b) return;
                            cur.f = parseInt(b.getAttribute('data-f')); refresh();
                        });
                        // Keep the status dots live while typing / ticking Care of Client or N/A
                        modal.addEventListener('input', refresh);
                        modal.addEventListener('change', refresh);
                        refresh();
                    };

                    // Helper: add extra entry then re-open modal
                    window._addEmbExtraEntryInModal = function(pName, type, regKey, reg, periodKey) {
                        var _m = document.getElementById('emb-modal');
                        window._embKeepNav = _m ? { p: parseInt(_m.getAttribute('data-active-proj')) || 0, f: 'last' } : null;
                        addEmbEntry(pName, type);
                        // Re-open modal after a short delay to let render complete
                        setTimeout(function(){ window.openEmbDialog(regKey, reg, periodKey, true); }, 150);
                    };

                    // Helper: remove extra entry then re-open modal
                    window._removeEmbExtraEntry = function(pName, type, idx) {
                        var modal = document.getElementById('emb-modal');
                        var regKey  = modal ? modal.getAttribute('data-regkey') : '';
                        var reg     = modal ? modal.getAttribute('data-reg') : '';
                        var periodKey = modal ? modal.getAttribute('data-period') : '';
                        window._embKeepNav = modal ? { p: parseInt(modal.getAttribute('data-active-proj')) || 0, f: Math.max(0, (parseInt(modal.getAttribute('data-active-fac')) || 0) - 1) } : null;
                        removeEmbEntry(pName, type, idx);
                        setTimeout(function(){ if(reg && periodKey) window.openEmbDialog(regKey, reg, periodKey, true); }, 350);
                    };

                    // Care of Client / N/A toggle — saves the value, un-checks the other option (mutually exclusive) and refreshes the box styling
                    window._embToggleExempt = function(el) {
                        var td = el.closest('td');
                        // Ticking Care of Client / N/A clears the entries of EVERY facility of this project, so ask first when something would be lost.
                        if (el.checked && td) {
                            var hasData = false;
                            td.querySelectorAll('.emb-entry-block input[type="text"], .emb-entry-block input[type="date"]').forEach(function(i) { if (i.value) hasData = true; });
                            if (hasData && typeof uxDialog === 'function') {
                                uxDialog({
                                    tone: 'warn', icon: 'fa-triangle-exclamation',
                                    title: 'Clear all facility entries?',
                                    message: 'Care of Client and N/A apply to the whole project for this period. The Facility, Submission Date and Reference No. of every facility of this project will be cleared.',
                                    confirmText: 'Clear and continue', cancelText: 'Keep entries', top: true, focus: 'cancel'
                                }).then(function(ok) {
                                    if (ok) { window._embApplyExempt(el); }
                                    else { el.checked = false; el.dispatchEvent(new Event('input', { bubbles: true })); }
                                });
                                return;
                            }
                        }
                        window._embApplyExempt(el);
                    };

                    window._embApplyExempt = function(el) {
                        function _style(inp) { /* the checked box is the only visual change, the text stays the same */ }
                        var v = el.checked;
                        updateVal(el.dataset.pname, el.dataset.key, parseInt(el.dataset.idx), v);
                        var td = el.closest('td');
                        if (v && td) {
                            td.querySelectorAll('input[data-exempt]').forEach(function(o) {
                                if (o !== el && o.checked) {
                                    o.checked = false;
                                    updateVal(o.dataset.pname, o.dataset.key, parseInt(o.dataset.idx), false);
                                    _style(o);
                                }
                            });
                        }
                        _style(el);
                        if (td) {
                            var anyOn = false;
                            td.querySelectorAll('input[data-exempt]').forEach(function(o) { if (o.checked) anyOn = true; });
                            var primary = td.querySelector('.emb-entry-block');
                            if (primary) primary.style.background = v ? '#e8f5e9' : '#f1f8f1';
                            function _grey(f) { f.disabled = true; f.style.background = '#eeeeee'; f.style.borderColor = '#dddddd'; f.style.color = '#9e9e9e'; }
                            function _restore(f) { f.disabled = el.disabled; f.style.background = f.dataset.ebg || ''; f.style.borderColor = f.dataset.ebd || ''; f.style.color = f.dataset.ec || ''; }
                            // Primary entry: Facility / Submission Date / Reference No.
                            td.querySelectorAll('.emb-entry-block input[data-pname][data-key][data-idx]:not([data-exempt])').forEach(function(f) {
                                if (anyOn) {
                                    if (f.value !== '') updateVal(f.dataset.pname, f.dataset.key, parseInt(f.dataset.idx), '');
                                    f.value = '';
                                    _grey(f);
                                } else { _restore(f); }
                            });
                            // Extra facilities of the same project
                            td.querySelectorAll('.emb-entry-block input[data-extrakey]').forEach(function(f) {
                                if (anyOn) {
                                    if (f.value !== '') updateEmbEntry(f.dataset.pname, f.dataset.extrakey === 'emb_extra_smr' ? 'SMR' : 'CMR', parseInt(f.dataset.eidx), f.dataset.field, parseInt(f.dataset.period), '');
                                    f.value = '';
                                    _grey(f);
                                } else { _restore(f); }
                            });
                        }
                        render();
                    };

                    window._saveEmbModal = function() {
                        var modal = document.getElementById('emb-modal');
                        if (!modal) return;
                        // Save primary entries (data-pname/data-key/data-idx inputs)
                        modal.querySelectorAll('[data-pname][data-key][data-idx]').forEach(function(inp) {
                            if (inp.dataset.pname && inp.dataset.key) {
                                var val = (inp.dataset.inputtype === 'checkbox' || inp.type === 'checkbox') ? inp.checked : inp.value;
                                updateVal(inp.dataset.pname, inp.dataset.key, parseInt(inp.dataset.idx), val);
                            }
                        });
                        // Extra entries are already saved live via updateEmbEntry() on oninput
                        modal.remove();
                        render();
                        if (typeof showToast === 'function') showToast('Entry saved.', 'success', 2500);
                    };
                    
                    
                    return;
                } // end emb

                // ══════════════════════════════════════════════════════════════════════
                // ── DOE REPORTORIAL (Renewable Energy) ─────────────────────────────────
                // ══════════════════════════════════════════════════════════════════════
                if (state.currentTab === 'doe') {
                    var doeSelYear = state.selectedYear || new Date().getFullYear();
                    var doeNow = new Date();
                    var doeCurQ = Math.ceil((doeNow.getMonth()+1)/3);
                    var DOE_KEY = 'doe_DOE Quarterly Report Submission Date';
                    var DOE_Q_LABELS = ['Q1 (Jan–Mar)', 'Q2 (Apr–Jun)', 'Q3 (Jul–Sep)', 'Q4 (Oct–Dec)'];

                    // Deadline-based count: only quarters whose due date has actually passed
                    // DOE: Q1 due Apr20, Q2 due Jul20, Q3 due Oct20, Q4 due Jan20 next year
                    var _doeNowM = doeNow.getMonth(), _doeNowD = doeNow.getDate(), _doeNowY = doeNow.getFullYear();
                    var doeDueQ = 0;
                    if (doeSelYear < _doeNowY) {
                        doeDueQ = 4; // past year — all deadlines have passed
                    } else if (doeSelYear === _doeNowY) {
                        if (_doeNowM > 3  || (_doeNowM === 3  && _doeNowD > 20)) doeDueQ = 1;
                        if (_doeNowM > 6  || (_doeNowM === 6  && _doeNowD > 20)) doeDueQ = 2;
                        if (_doeNowM > 9  || (_doeNowM === 9  && _doeNowD > 20)) doeDueQ = 3;
                        // Q4 deadline is Jan 20 of next year — not yet passed while still in selected year
                    }
                    // Note: doeCurQ still used for region row-display loops below

                    var doeActProjs = displayProjects.filter(function(p){ return p.isRenewable && !isProjectOnStoppage(p) && !p.dateFinished; });

                    if (!doeActProjs.length) {
                        html += '<div style="background:var(--bg-card);padding:40px;margin:20px;border-radius:12px;text-align:center;border:2px dashed var(--border-color);">'
                            + '<i class="fas fa-solar-panel" style="font-size:3rem;color:var(--text-secondary);margin-bottom:15px;display:block;"></i>'
                            + '<h3 style="color:var(--text-primary);margin-bottom:10px;">No Renewable Energy Projects</h3>'
                            + '<p style="color:var(--text-secondary);font-size:0.9rem;">Mark projects as "Renewable Energy" when adding/editing them to see them here.</p>'
                            + '</div>';
                        container.innerHTML = html;
                        return;
                    }

                    var doeTot=0, doeFill=0;
                    doeActProjs.forEach(function(p){
                        var _doeSQ = getDoeStartQuarterForYear(p, doeSelYear);
                        for(var q=1;q<=doeDueQ;q++){
                            if(q<_doeSQ) continue;
                            if(isQuarterBlacklistedForProject(p, q, doeSelYear)) continue; // work-stoppage quarter — excluded from compliance
                            doeTot++; if(p.vals[DOE_KEY]&&p.vals[DOE_KEY][q]) doeFill++;
                        }
                    });

                    REGIONS.forEach(function(reg) {
                        var regProjs = doeActProjs.filter(function(p){ return p.region===reg; });
                        if (!regProjs.length) return;
                        var canEditReg = state.isEditing && UserAccounts.canEdit(state.currentUser&&state.currentUser.email, reg) && UserAccounts.canEditTab(state.currentUser&&state.currentUser.email, 'doe');
                        var isCollapsed = isRegionCollapsed(reg);
                        var regKey = reg.replace(/[^a-zA-Z0-9]/g,'_');

                        var doeComplete = 0;
                        for(var q=1;q<=doeCurQ;q++){ var qOk=regProjs.every(function(p){ var _sq=getDoeStartQuarterForYear(p, doeSelYear); return q<_sq || isQuarterBlacklistedForProject(p, q, doeSelYear) || (p.vals[DOE_KEY]&&p.vals[DOE_KEY][q]); }); if(qOk) doeComplete++; }

                        html += window.regionBanner({ id: 'region-banner-' + reg, reg: reg, toggle: 'toggleRegion', collapsed: isCollapsed, editable: canEditReg, icon: 'fa-location-dot', right: ''
                            +'<span class="rbadge rbadge-count rb-proj">'+regProjs.length+' PROJ</span>'
                            +'<span class="rbadge" style="background:rgba(255,255,255,0.18);color:#c8e6c9;">'+doeComplete+'/'+doeCurQ+' complete</span>' })
                            +'<div id="region-content-'+reg+'" class="region-content '+(isCollapsed?'collapsed':'')+'"><div style="overflow-x:auto;padding:12px 14px;">';

                        // Build inline table: PROJECT | Q1 | Q2 | Q3 | Q4
                        html += '<table class="got-tbl" style="width:auto;min-width:100%;">';

                        // Header row
                        html += '<thead><tr>'
                            + '<th class="got-th-left got-th-dark" style="min-width:180px;text-align:left;padding-left:10px;">PROJECT</th>';
                        var _qDueLabels = ['Due: Apr 20','Due: Jul 20','Due: Oct 20','Due: Jan 20'];
                        for(var qh=1;qh<=4;qh++){
                            var _qPast = qh <= doeDueQ;
                            html += '<th style="min-width:155px;'+(!_qPast?'opacity:0.5;':'')+'">'
                                + DOE_Q_LABELS[qh-1]
                                + '<br><small style="font-weight:400;font-size:0.6rem;color:'+(_qPast?'#b71c1c':'#999')+';letter-spacing:0.2px;">'+_qDueLabels[qh-1]+'</small>'
                                + '</th>';
                        }
                        html += '</tr></thead><tbody>';

                        regProjs.forEach(function(p){
                            var _isCP = !!(p.vals && (p.vals['doe_client_provided']==='1' || p.vals['doe-permit_client_provided']==='1'));
                            var _pnSafe = p.name.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
                            var _stopped = isProjectOnStoppage(p);

                            html += '<tr>';

                            // Project name
                            html += '<td class="got-td-proj" style="text-align:left;background:#e8f5e9;position:sticky;left:0;z-index:5;border-right:2px solid #c8e6c9;">'
                                + '<i class="fas fa-leaf" style="color:#4caf50;margin-right:5px;"></i>'
                                + p.name
                                + (_stopped?' <span style="background:#e0e0e0;color:#757575;border-radius:3px;padding:1px 4px;font-size:0.58rem;margin-left:3px;"><i class="fas fa-pause-circle"></i></span>':'')
                                + '</td>';

                            // Q1–Q4 cells
                            var _doeStartQ = getDoeStartQuarterForYear(p, doeSelYear);
                            for(var q=1;q<=4;q++){
                                var _val = (p.vals && p.vals[DOE_KEY]) ? (p.vals[DOE_KEY][q]||'') : '';
                                var _doeNow2 = new Date();
                                var _doeThisYr = doeSelYear === _doeNow2.getFullYear();
                                var _doeFutQ = _doeThisYr && q > doeCurQ;
                                var _doeBeforeStart = q < _doeStartQ;
                                var _dueMon = {1:[3,20],2:[6,20],3:[9,20],4:[0,20]};
                                var _dm = _dueMon[q];
                                var _dueDt = q===4 ? new Date(doeSelYear+1,_dm[0],_dm[1]) : new Date(doeSelYear,_dm[0],_dm[1]);
                                var _isPastDue = !_doeFutQ && _doeNow2 > _dueDt;

                                if (_doeBeforeStart && !_isCP) {
                                    html += '<td style="background:#f5f5f5;text-align:center;opacity:0.55;font-size:0.62rem;color:#aaa;padding:5px;font-style:italic;" title="Project not yet started (starts '+formatDateDMY(p.dateStarted)+'). Not required.">Not Started</td>';

                                } else if (_isCP) {
                                    // One merged cell across Q1–Q4; skip the other quarters
                                    if (q === 1) html += '<td colspan="4" style="text-align:center;color:var(--text-secondary);font-size:0.78rem;font-style:italic;">Care of Client</td>';

                                } else if (_doeFutQ) {
                                    html += '<td style="background:#f5f5f5;text-align:center;opacity:0.55;font-size:0.68rem;color:#bbb;padding:5px;">—</td>';

                                } else if (isQuarterBlacklistedForProject(p, q, doeSelYear)) {
                                    var _dqR = getQuarterExemptReason(p, q, doeSelYear);
                                    html += '<td style="background:#fce4ec;text-align:center;padding:5px;" title="' + getQuarterExemptTip(p, q, doeSelYear).replace(/"/g, '&quot;') + '">'
                                        + (_dqR === 'not-started' ? '<span style="color:#880e4f;font-size:0.65rem;font-weight:700;"><i class="fas fa-hourglass-start" style="margin-right:3px;"></i>Not Started</span>' : statusBadge(_dqR === 'finished' ? 'finished' : 'work-stoppage'))
                                        + '</td>';

                                } else {
                                    var _bg  = _val ? '#e8f5e9' : (_isPastDue ? '#ffebee' : '#fff8e1');
                                    var _brd = _val ? '#a5d6a7' : (_isPastDue ? '#ef9a9a' : '#ffe082');
                                    var _ibg = _val ? '#f1fff1' : (_isPastDue ? '#fff5f5' : '#fffde7');
                                    var _clr = _val ? '#2e7d32' : (_isPastDue ? '#c62828' : '#7a5c00');
                                    html += '<td style="background:'+_bg+';text-align:center;padding:4px 5px;">'
                                        + '<input type="date" value="'+_val+'" '+(canEditReg&&!_stopped?'':'disabled')+' '
                                        + 'oninput="updateVal(\''+_pnSafe+'\',\''+DOE_KEY+'\','+q+',this.value);_refreshDateCell(this)" '
                                        + 'style="border:1.5px solid '+_brd+';border-radius:4px;padding:3px 4px;background:'+_ibg+';color:'+_clr+';width:140px;font-size:0.67rem;">'
                                        + '</td>';
                                }
                            }

                            html += '</tr>';
                        });

                        html += '</tbody></table></div></div>';
                    });

                } // end doe

                // ══════════════════════════════════════════════════════════════════════
                // ── ENVIRONMENTAL MONTHLY REPORT ───────────────────────────────────────
                // ══════════════════════════════════════════════════════════════════════
                if (state.currentTab === 'env-monthly-report') {
                    var emrSelYear  = state.selectedYear || new Date().getFullYear();
                    var emrCurMoIdx = new Date().getMonth();
                    // Current month is still ongoing -> hide it. Show only COMPLETED months.
                    // Past year: all 12 | current year: up to previous month | future year: none
                    var emrLastShownIdx = emrSelYear < new Date().getFullYear() ? 11 : (emrSelYear === new Date().getFullYear() ? emrCurMoIdx - 1 : -1);
                    var EMR_KEY = 'env-monthly-report_Environmental Monthly Report (EMR)';
                    var EMR_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
                    // Inline EMR table: save the moment a date is entered (same updateVal the old modal used), then refresh the counts once typing stops
                    window._emrChange = function(el) {
                        updateVal(el.dataset.pname, el.dataset.key, parseInt(el.dataset.idx, 10), el.value);
                        el.style.borderColor = el.value ? '#a5d6a7' : '#ef9a9a';
                        el.style.background  = el.value ? '#c8e6c9' : '#fff5f5';
                        clearTimeout(window._emrRenderT);
                        var _wait = function() {
                            var a = document.activeElement;
                            if (a && a.classList && a.classList.contains('emr-in')) { window._emrRenderT = setTimeout(_wait, 1200); return; }
                            render();
                        };
                        window._emrRenderT = setTimeout(_wait, 1200);
                    };
                    var _emrEsc = function(s) { return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); };
                    var _emrFmt = function(v) { var q = String(v).split('-'); return q.length === 3 ? q[1] + '/' + q[2] + '/' + q[0] : v; };

                    var emrActProjs = displayProjects.filter(function(p){ return !isProjectOnStoppage(p) && p.region !== 'CORPORATE' && p.region !== 'PLANT OPERATIONS'; });
                    var emrTot=0, emrFill=0;
                    // Only count months BEFORE the current one as overdue (current month hasn't ended yet)
                    // emrCurMoIdx is 0-based; mo is 1-based → loop mo=1 to emrCurMoIdx (excludes current)
                    emrActProjs.forEach(function(p){
                        for(var m=1;m<=emrCurMoIdx;m++){
                            if (isMonthBlacklistedForProject(p, m, emrSelYear)) continue; // not yet started / work stoppage — not required
                            emrTot++;
                            if(p.vals[EMR_KEY]&&p.vals[EMR_KEY][m]) emrFill++;
                        }
                    });

                    REGIONS.forEach(function(reg) {
                        if (reg === 'CORPORATE' || reg === 'PLANT OPERATIONS') return; // Not included in EMR reporting
                        var projs = displayProjects.filter(function(p){ return p.region===reg; });
                        if (!projs.length) return;
                        // Active (non-stoppage) projects for compliance counting
                        var activeProjs = projs.filter(function(p){ return !isProjectOnStoppage(p); }); // finished projects stay counted until their finish month (handled per-month below)
                        var canEditReg = state.isEditing && UserAccounts.canEdit(state.currentUser&&state.currentUser.email, reg) && UserAccounts.canEditTab(state.currentUser&&state.currentUser.email, 'env-monthly-report');
                        var isCollapsed = isRegionCollapsed(reg);
                        var regKey = reg.replace(/[^a-zA-Z0-9]/g,'_');

                        // Per-region status for the banner pills
                        var _rgTot = 0, _rgFill = 0;
                        activeProjs.forEach(function(p){
                            for (var mm=1; mm<=emrCurMoIdx; mm++) {
                                if (isMonthBlacklistedForProject(p, mm, emrSelYear)) continue;
                                _rgTot++;
                                if (p.vals[EMR_KEY] && p.vals[EMR_KEY][mm]) _rgFill++;
                            }
                        });

                        var emrComplete = 0;
                        for(var m=1;m<=emrLastShownIdx+1;m++){
                            var nonNaProjs = activeProjs.filter(function(p){ return !isProjectHiddenForMonth(p,m,emrSelYear); });
                            var mOk = nonNaProjs.length>0 && nonNaProjs.every(function(p){ return p.vals[EMR_KEY]&&p.vals[EMR_KEY][m]; });
                            if(mOk) emrComplete++;
                        }

                        html += window.regionBanner({ id: 'region-banner-' + reg, reg: reg, toggle: 'toggleRegion', collapsed: isCollapsed, editable: canEditReg, icon: 'fa-location-dot', right: ''
                            +'<span class="rbadge rbadge-count rb-proj">'+projs.length+' PROJ</span>'
                            +'<span class="rbadge" style="background:rgba(255,255,255,0.18);color:#c8e6c9;">'+emrComplete+'/'+(emrLastShownIdx+1)+' complete</span>'
                            +window._rbStatusPills(_rgTot,_rgFill,_rgTot-_rgFill,'overdue') })
                            +'<div id="region-content-'+reg+'" class="region-content '+(isCollapsed?'collapsed':'')+'">';

                        // One table per region: rows = projects, columns = completed months. Date inputs save as soon as a date is entered.
                        var emrMonths = [];
                        for (var m2 = 1; m2 <= emrLastShownIdx + 1; m2++) emrMonths.push(m2);
                        if (!emrMonths.length) {
                            html += '<div style="padding:14px 16px;font-size:0.75rem;color:#888;">No completed months yet for ' + emrSelYear + '.</div>';
                        } else {
                            html += '<div class="table-container"><table class="got-tbl hl-tbl" style="width:auto;min-width:100%;"><thead><tr>'
                                + '<th class="got-th-left got-th-dark" style="min-width:250px;text-align:left;padding-left:10px;position:sticky;left:0;z-index:6;">PROJECT</th>'
                                + emrMonths.map(function(m){ return '<th style="min-width:130px;">' + EMR_MONTHS[m-1].substring(0,3).toUpperCase() + '</th>'; }).join('')
                                + '</tr></thead><tbody>';
                            projs.forEach(function(p) {
                                var pnA = _emrEsc(p.name);
                                html += '<tr><td class="got-td-proj" style="text-align:left;position:sticky;left:0;z-index:5;border-right:2px solid #c8e6c9;">'
                                    + (p.isRenewable ? '<i class="fas fa-leaf" style="color:#4caf50;margin-right:5px;" title="Renewable Energy"></i>' : '') + p.name + '</td>';
                                emrMonths.forEach(function(m) {
                                    if (isProjectHiddenForMonth(p, m, emrSelYear)) {
                                        html += '<td style="color:#bbb;" title="Project not active this month">—</td>';
                                        return;
                                    }
                                    var notStarted = isMonthBeforeProjectStart(p, m, emrSelYear);
                                    var stopped = isProjectOnStoppage(p) || isMonthBlacklistedForProject(p, m, emrSelYear);
                                    if (stopped) {
                                        var finished = !!isProjectFinishedForMonth(p, m, emrSelYear) && !notStarted;
                                        html += '<td style="color:#9e9e9e;font-style:italic;" title="' + (notStarted ? 'Project has not started this month yet — not required.' : (finished ? 'Project finished — this month and later months are not required.' : 'Work Stoppage period — this month is excluded from compliance.')) + '">'
                                            + (notStarted ? 'Not yet started' : (finished ? 'Finished' : 'Work stoppage')) + '</td>';
                                        return;
                                    }
                                    var v = p.vals[EMR_KEY] ? (p.vals[EMR_KEY][m] || '') : '';
                                    if (canEditReg && !p.dateFinished) {
                                        html += '<td><input type="date" class="emr-in" value="' + v + '" data-pname="' + pnA + '" data-key="' + EMR_KEY + '" data-idx="' + m + '"'
                                            + ' onchange="window._emrChange(this)"'
                                            + ' style="border:1px solid ' + (v ? '#a5d6a7' : '#ef9a9a') + ';border-radius:4px;padding:3px 6px;font-family:inherit;font-size:inherit;background:' + (v ? '#c8e6c9' : '#fff5f5') + ';"></td>';
                                    } else {
                                        html += v ? '<td>' + _emrFmt(v) + '</td>' : '<td style="color:#c62828;font-weight:700;">Missing</td>';
                                    }
                                });
                                html += '</tr>';
                            });
                            // Submitted count per month (replaces the old "Submitted: x/y" line of the month list)
                            html += '<tr class="tot"><td style="text-align:left;position:sticky;left:0;z-index:5;background:var(--tbl-head-bg);color:var(--tbl-head-fg);font-weight:700;">SUBMITTED</td>'
                                + emrMonths.map(function(m) {
                                    var nonNa = activeProjs.filter(function(p){ return !isProjectHiddenForMonth(p, m, emrSelYear); });
                                    var fill = nonNa.filter(function(p){ return p.vals[EMR_KEY] && p.vals[EMR_KEY][m]; }).length;
                                    var col = (nonNa.length > 0 && fill === nonNa.length) ? '#2e7d32' : (fill > 0 ? '#e65100' : '#c62828');
                                    return '<td style="background:var(--tbl-head-bg);color:' + col + ';font-weight:700;">' + fill + '/' + nonNa.length + '</td>';
                                }).join('') + '</tr>';
                            html += '</tbody></table></div>';
                        }
                        html += '</div>';
                    });

                    container.innerHTML = html;


                    return;
                } // end env-monthly-report

                if (state.currentTab === 'kpm') {
                    window.KPM_ESH_ROWS = [
                        { id:'e1',  kpm:'1', wp:'ESH Program Implementation ', del:'ESH Meetings',
                          dw:0.10, measure:'Conduct of ESH Meetings (ESH and ESH Committee)',
                          kpi:['75%',null,'85%','90%',null],
                          ind:["No ESH Meetings conducted", "", "1 ESH Meetings conducted within the month", "1 < ESH Meetings conducted within the month", ""] },
                        { id:'e2',  kpm:'',  wp:'', del:'Zero LTA',
                          dw:0.10, measure:'Safe man-hours',
                          kpi:['75%','80%','85%','90%','95%'],
                          ind:["accident resulting to Lost Time", "6-10 medical treatments", "1-5 medical treatment", "no medical treatment for the month", "Million Safe man-hours milestone achievement"] },
                        { id:'e3',  kpm:'',  wp:'', del:'Incident/Accident Investigation',
                          dw:0.08, measure:'Incident/Accident Investigation conducted on time',
                          kpi:['75%',null,'85%',null,'95%'],
                          ind:["Incident/accident investigtion conducted after 24 hours", "", "Incident/accident investigtion conducted within 24 hours", "", "Incident/accident investigtion conducted within 4 hours"] },
                        { id:'e4',  kpm:'',  wp:'', del:'Emergency Preparedness & Response',
                          dw:0.08, measure:'Conduct of Emergency Drills',
                          kpi:['75%',null,'85%','90%',null],
                          ind:["Emergency Drills not conducted in a month based on schedule", "", "ESH Drills conducted in a month based on schedule", "ESH Drills conducted ahead of  schedule", ""] },
                        { id:'e5',  kpm:'',  wp:'', del:'ESH Orientations & Trainings',
                          dw:0.08, measure:'Conduct ESH Orientations & Trainings',
                          kpi:['75%',null,'85%','90%',null],
                          ind:["No ESH orientation conducted of SCIC personnel, subcontractors, visitors and other stakeholders", "", "ESH orientation conducted of SCIC personnel, subcontractors, visitors and other stakeholders", "100% ESH orientations of SCIC personnel, subcontractors, visitors and other stakeholders", ""] },
                        { id:'e6',  kpm:'',  wp:'', del:'Permit to Work System',
                          dw:0.08, measure:'Full implementation of Permit to Work system',
                          kpi:['75%',null,'85%','90%','95%'],
                          ind:["No issuance of NOV due to working without permit.", "", "Issuance of NOV due to working without permit", "greater than 50 % issued NOV due to working without permit are closed.", "100 % issued NOV due to working without permit are closed."] },
                        { id:'e7',  kpm:'',  wp:'', del:'ESH Inspections',
                          dw:0.08, measure:'Conduct of ESH Inspections',
                          kpi:['75%',null,'85%','90%',null],
                          ind:["No updated monitoring of Status of ESH Inspection Findings", "", "Updated monitoring of Status of ESH Inspection Findings", "100%o  ESH  inspections findings closed within the month.", ""] },
                        { id:'e8',  kpm:'2', wp:'Compliance to ESH Laws and Regulations',
                          del:'Submission of ESH Compliance Reports to Regulatory Agencies',
                          dw:0.09, measure:'Timeliness of the Submission of ESH Compliance Reports to Regulatory Agencies',
                          kpi:['75%',null,'85%','90%',null],
                          ind:["ESH Reports Submitted to Regulatory Agencies after the due date.", "", "ESH Reports Submitted to Regulatory Agenciess On-Time", "ESH Reports Submitted to Regulatory Agencies ahead before the schedule", ""] },
                        { id:'e9',  kpm:'3', wp:'Compliance to HIRAC AIIAC ',
                          del:'Monitoring and control of Identified new Hazards/Aspects and Risks/Impacts in the workplace',
                          dw:0.08, measure:'Review and update of HIRAC and AIIAC',
                          kpi:['75%',null,null,'90%',null],
                          ind:["HIRAC/AIIAC are not reviewed and updated", "", "", "HIRAC/AIIAC are  reviewed and updated", ""] },
                        { id:'e10', kpm:'',  wp:'', del:'',
                          dw:0.08, measure:'Monitoring of Implementation of ROTPs',
                          kpi:['75%',null,'85%','90%',null],
                          ind:["ROTP's are not reviwed and updated", "", "ROTP's are  reviewed and updated", "100% ROTPs are implemented", ""] },
                        { id:'e11', kpm:'4', wp:'Compliance ',
                          del:'Environmental Programs',
                          dw:0.07, measure:'Zero environmental complaints, violations or environmental findings',
                          kpi:['75%',null,null,null,'95%'],
                          ind:["with environmental violations,  ESH committee findings or environmental complaints from other stakeholders", "", "", "", "ZERO environmental violation report,  ESH committee findings or environmental complaints from other stakeholders"] },
                        { id:'e12', kpm:'',  wp:'',
                          del:'Occupational Safety and Health Programs',
                          dw:0.08, measure:'Zero OS&H accidents/incidents, violations, complaints and findings',
                          kpi:['75%',null,null,null,'95%'],
                          ind:["incurred accidents,OSH violations and complaints or with ESH Committee findings", "", "", "", "ZERO accident, OSH violation, complaints or ESH Committee findings"] },
                    ];

                    const KPM_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
                    (function buildKpmSummary() {
                        var selYear = state.selectedYear || new Date().getFullYear();

                        var moList = KPM_MONTHS;
                        var moShort = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
                        var targetRegs = ['NCR','SOUTH LUZON','NORTH LUZON','VISAYAS & MINDANAO'];
                        var currentMoIdx = new Date().getMonth();

                        function getRegMonthScore(reg, mo) {
                            // Mirror exactly what kpmRegionMonthScore returns —
                            // same value shown in the region banner/list.
                            return kpmRegionMonthScore(reg, mo);
                        }

                        function cellBg(v){ return v >= 0.90 ? '#e8f5e9' : v >= 0.85 ? '#fff8e1' : '#ffebee'; }
                        function cellFg(v){ return v >= 0.90 ? '#1b5e20' : v >= 0.85 ? '#7a5c00' : '#c62828'; }

                        var regData = targetRegs.map(function(reg){
                            return moList.map(function(mo){ return getRegMonthScore(reg, mo); });
                        });

                        var regAvg = regData.map(function(row){
                            var vals = row.filter(function(v){ return v !== null; });
                            return vals.length ? vals.reduce(function(s,v){return s+v;},0)/vals.length : null;
                        });

                        var moAvg = moList.map(function(mo, mi){
                            var vals = regData.map(function(rd){ return rd[mi]; }).filter(function(v){ return v!==null; });
                            return vals.length ? vals.reduce(function(s,v){return s+v;},0)/vals.length : null;
                        });

                        var allVals = regAvg.filter(function(v){ return v !== null; });
                        var overallAvg = allVals.length ? allVals.reduce(function(s,v){return s+v;},0)/allVals.length : null;

                        function _pctSpan(v){ return '<strong class="rpt-pct ' + window.rptTone(v, 'kpm') + '">' + (v*100).toFixed(1) + '%</strong>'; }
                        var recLines = [];
                        targetRegs.forEach(function(reg, ri){
                            var avg = regAvg[ri];
                            if (avg !== null) {
                                if (avg < 0.85) recLines.push('<li><strong>' + reg + '</strong>: Score of ' + _pctSpan(avg) + ' is below target. Recommend immediate review of ESH program implementation and corrective action plan.</li>');
                                else if (avg < 0.90) recLines.push('<li><strong>' + reg + '</strong>: Score of ' + _pctSpan(avg) + ' is satisfactory but has room for improvement. Focus on consistency and closing compliance gaps.</li>');
                                else recLines.push('<li><strong>' + reg + '</strong>: Score of ' + _pctSpan(avg) + ' is excellent. Sustain performance and share best practices with other regions.</li>');
                            }
                        });
                        var minMoScore = null, minMoName = '';
                        moAvg.forEach(function(s, mi){ if (s !== null && (minMoScore === null || s < minMoScore)){ minMoScore = s; minMoName = moShort[mi]; }});
                        if (minMoScore !== null && minMoScore < 0.90) {
                            recLines.push('<li><i class="fas fa-calendar-xmark" style="color:#c62828;margin-right:4px;"></i><strong>' + minMoName + '</strong> had the lowest overall average (' + _pctSpan(minMoScore) + '). Investigate root causes and strengthen monitoring during similar periods.</li>');
                        }

                        var thCells = window.rptHead('Region', moShort, currentMoIdx, true);
                        var bodyRows = targetRegs.map(function(reg, ri){
                            var cells = window.rptRowHead(reg, '');
                            regData[ri].forEach(function(v, mi){ cells += window.rptTd(v, mi, currentMoIdx, 'kpm'); });
                            cells += window.rptAvgTd(regAvg[ri], 'kpm');
                            return '<tr>' + cells + '</tr>';
                        }).join('') + window.rptTotalRow('OVERALL AVG', moAvg, currentMoIdx, overallAvg, 'kpm');

                        var recsHtml = recLines.length
                            ? '<ul class="ytd-list">' + recLines.join('').replace(/<i class="fas [^"]*"[^>]*><\/i>/g, '') + '</ul>'
                            : '<p class="ytd-empty">No data available yet to generate recommendations.</p>';

                        html += window.rptCard('',
                            'Monthly ESH consolidated KPM — FM-RNI-04-04 Rev.4 | Eff. Date: 06 Aug 2018 &bull; Overall weighted % per region per month &bull; Year: ' + selYear,
                            '', thCells, bodyRows, 'kpm')
                            + '<div class="ytd-card">'
                            + '<div class="ytd-head">'
                            + '<div class="ytd-title">KEY PERFORMANCE MEASURES — YTD SUMMARY</div>'
                            + '<div class="ytd-sub">Recommendations based on year-to-date KPM performance across all regions</div>'
                            + '</div>'
                            + '<div class="ytd-recs">'
                            + '<div class="ytd-recs-title">Recommendations</div>'
                            + recsHtml
                            + '</div></div>';
                    })();

                    function kpmSet(pName, month, role, field, val) {
                        const p = state.projects.find(x => x.name === pName);
                        if (!p) return;
                        const rbac = UserAccounts.checkPermission(state.currentUser?.email, 'edit', p.region, 'kpm');
                        if (!rbac.allowed) { showLockedMessage(rbac.reason); return; }
                        const k = `kpm_v2_${month}_${role}`;
                        if (!p.vals[k]) p.vals[k] = {};
                        p.vals[k][field] = val;
                        if (typeof markPendingSync === 'function') markPendingSync();
                        if (typeof saveToFirebaseDebounced === 'function') saveToFirebaseDebounced();
                        // NOTE: Do NOT rebuild here — causes scroll jump and focus loss.
                        // Data is saved to state and will persist on next full render.
                    }
                    window.kpmSet = kpmSet;

                    function kpmIsNA(p) {
                        return p && p.vals && p.vals['kpm_na'] === '1';
                    }

                    if (!window._kpmActiveMo) window._kpmActiveMo = {};
                    if (!window._kpmActiveRole) window._kpmActiveRole = {};

                    // ── KPM: region banners → monthly list (per region) → dialog ────
                    function kpmRegionMonthScore(reg, mo) {
                        // Only active (non-stopped, non-NA) projects count toward score
                        var _selYear = state.selectedYear || new Date().getFullYear();
                        var _moIdx1 = KPM_MONTHS.indexOf(mo) + 1; // 1-based
                        var projs = state.projects.filter(function(p) {
                            if (p.region !== reg) return false;
                            if (kpmIsNA(p)) return false;
                            // Exclude full work-stoppage (no resume) AND month-blacklisted (resumed but still in frozen window)
                            if (isMonthBlacklistedForProject(p, _moIdx1, _selYear)) return false;
                            return true;
                        });
                        if (!projs.length) return null;
                        var grand = 0, hasAny = false;
                        KPM_ESH_ROWS.forEach(function(row) {
                            // All active projects in the region are included in the denominator.
                            // Projects with no input yet are treated as 0 — not excluded.
                            var allEPs = projs.map(function(p) {
                                var v = p.vals['kpm_v3_' + mo + '_' + row.id];
                                var n = parseFloat(String(v||'').replace('%','').trim());
                                return isNaN(n) ? 0 : n / 100;
                            });
                            var hasInput = allEPs.some(function(v){ return v > 0; });
                            if (hasInput) {
                                hasAny = true;
                                grand += (allEPs.reduce(function(s,v){return s+v;},0) / allEPs.length) * row.dw;
                            }
                        });
                        return hasAny ? grand : null;
                    }

                    var selYear = state.selectedYear || new Date().getFullYear();
                    var curMoIdx = new Date().getMonth();

                    // ── DEBUG: log why any project is missing from KPM ──────────────
                    (function() {
                        var allRegProjs = state.projects.filter(function(p) {
                            return p.region !== 'CORPORATE' && p.region !== 'PLANT OPERATIONS';
                        });
                        allRegProjs.forEach(function(p) {
                            var excluded = [];
                            if (kpmIsNA(p))          excluded.push('kpm_na=1');
                            if (p.dateFinished)      excluded.push('dateFinished=' + p.dateFinished);
                            if (excluded.length) {
                            } else {
                            }
                        });
                    })();
                    // ── END DEBUG ─────────────────────────────────────────────────────

                    REGIONS.forEach(function(reg) {
                        if (reg === 'CORPORATE' || reg === 'PLANT OPERATIONS') return;
                        // Use state.projects directly so work-stoppage projects always appear regardless of status filter
                        var projs = state.projects.filter(function(p) { return p.region === reg && !kpmIsNA(p); }); // FIX: keep finished projects visible for past-month data
                        if (!projs.length) return;
                        // Active projects (not stopped, not N/A) — used for score computations only
                        var activeProjs = projs.filter(function(p) { return !isProjectOnStoppage(p); });
                        var canEditReg = state.isEditing && UserAccounts.canEdit(state.currentUser && state.currentUser.email, reg) && UserAccounts.canEditTab(state.currentUser && state.currentUser.email, 'kpm');
                        var isCollapsed = isRegionCollapsed(reg);
                        var regKey = reg.replace(/[^a-zA-Z0-9]/g,'_');

                        // Count how many months have been submitted (any ACTIVE project in region has dateSubmitted)
                        var submittedCount = 0;
                        KPM_MONTHS.forEach(function(mo, mi) {
                            if (mi > curMoIdx) return;
                            var anySubm = activeProjs.some(function(p){ return p.vals['kpm_v3_' + mo + '_dateSubmitted']; });
                            if (anySubm) submittedCount++;
                        });

                        html += window.regionBanner({ id: 'region-banner-' + reg, reg: reg, toggle: 'toggleRegion', collapsed: isCollapsed, editable: canEditReg, icon: 'fa-location-dot', right: ''
                            + '<span class="rbadge rbadge-count rb-proj">' + projs.length + ' PROJ</span>'
                            + '<span class="rbadge" style="background:rgba(255,255,255,0.18);color:#c8e6c9;">' + submittedCount + '/' + (curMoIdx+1) + ' submitted</span>'
                            + (canEditReg ? '<button class="lta-add-btn" onclick="event.stopPropagation();window.openKpmDialog(\'' + regKey + '\',\'' + reg + '\',null,true)" style="font-size:0.68rem;padding:4px 12px;"><i class="fas fa-plus"></i> Add Entry</button>' : '') })
                            + '<div id="region-content-' + reg + '" class="region-content ' + (isCollapsed?'collapsed':'') + '">';

                        // Monthly list rows (only past/current months that have any data OR are pending)
                        var hasAnyRow = false;
                        KPM_MONTHS.forEach(function(mo, mi) {
                            if (mi > curMoIdx) return;
                            var score = kpmRegionMonthScore(reg, mo);
                            var anySubm = activeProjs.some(function(p){ return p.vals['kpm_v3_' + mo + '_dateSubmitted']; });
                            var anyData = activeProjs.some(function(p){ return KPM_ESH_ROWS.some(function(r){ return p.vals['kpm_v3_' + mo + '_' + r.id]; }); });
                            // Per-project fill status for this month (only projects required that month)
                            var _kElig = projs.filter(function(p){ return !isMonthBlacklistedForProject(p, mi + 1, selYear); });
                            if (!_kElig.length) return;
                            if (!anySubm && !anyData && mi >= curMoIdx) return; // current month: show only once data exists
                            var _kDone = 0, _kPart = 0, _kNone = 0, _kPartNames = [], _kNoneNames = [];
                            _kElig.forEach(function(p){
                                var f = KPM_ESH_ROWS.filter(function(r){
                                    var v = p.vals && p.vals['kpm_v3_' + mo + '_' + r.id];
                                    return v !== undefined && v !== null && v.toString().trim() !== '';
                                }).length;
                                if (f === 0) { _kNone++; _kNoneNames.push(p.name); }
                                else if (f === KPM_ESH_ROWS.length) _kDone++;
                                else { _kPart++; _kPartNames.push(p.name); }
                            });
                            var _kAllDone = _kDone === _kElig.length;
                            var _kChips = '';
                            if (_kAllDone) _kChips = window._rowStatus('ok', 'All ' + _kElig.length + ' project' + (_kElig.length !== 1 ? 's' : '') + ' complete', '', false);
                            else {
                                if (_kDone) _kChips += window._rowStatus('ok', _kDone + ' complete', '', true);
                                if (_kPart) _kChips += window._rowStatus('part', _kPart + ' partial', _kPartNames.join(', '), true);
                                if (_kNone) _kChips += window._rowStatus('none', _kNone + ' not filled', _kNoneNames.join(', '), true);
                            }
                            hasAnyRow = true;

                            var scoreCls = score === null ? 'n' : score >= 0.90 ? 'g' : score >= 0.85 ? 'a' : 'r';
                            var scoreLabel = score === null ? '—' : (score*100).toFixed(1) + '%';
                            if (score === null && !anySubm && !anyData) { scoreCls = 'r'; scoreLabel = 'MISSED'; }
                            var submFg = anySubm ? '' : '#c62828';
                            // Collect unique submitted dates from active projects
                            var submDates = activeProjs.map(function(p){ return p.vals['kpm_v3_' + mo + '_dateSubmitted'] || ''; }).filter(Boolean);
                            var submLabel = submDates.length ? submDates[0] : 'Not submitted';

                            html += '<div class="ckpm-rw" onclick="window.openKpmDialog(\'' + regKey + '\',\'' + reg.replace(/'/g,"\\'") + '\',\'' + mo + '\',false)">'
                                + '<span class="ckpm-mo">' + mo.substring(0,3) + '</span>'
                                + '<div class="ckpm-fl">' + _kChips + '</div>'
                                + '<span class="ckpm-dt">Submitted <span' + (submFg ? ' style="color:' + submFg + ';font-weight:600;"' : '') + '>' + submLabel + '</span></span>'
                                + '<div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">'
                                + '<span class="ckpm-pc ' + scoreCls + '">' + scoreLabel + '</span>'
                                + (canEditReg ? '<button onclick="event.stopPropagation();window.openKpmDialog(\'' + regKey + '\',\'' + reg.replace(/'/g,"\\'") + '\',\'' + mo + '\',true)" title="Edit" style="background:#e3f2fd;color:#1565c0;border:1px solid #90caf9;border-radius:5px;padding:3px 8px;font-size:0.62rem;font-weight:700;cursor:pointer;"><i class="fas fa-pen"></i></button>' : '')
                                + '</div>'
                                + '</div>';
                        });


                        if (!hasAnyRow) {
                            html += '<div style="padding:18px;text-align:center;color:#aaa;font-size:0.76rem;font-style:italic;">'
                                + '<i class="fas fa-inbox" style="margin-right:6px;"></i>No KPM entries yet for this region.'
                                + (canEditReg ? ' Click "+ Add Entry" to begin.' : '') + '</div>';
                        }

                        html += '</div>'; // close region-content
                    });

                    container.innerHTML = html;

                    window.kpmRefreshRegion = function() { render(); };
                    window.kpmRefreshProject = window.kpmRefreshRegion;
                    window._kpmColHidden = window._kpmColHidden || {};

                    // ── KPM Dialog: opens for a specific region + month ───────────────
                    window.openKpmDialog = function(regKey, reg, month, editMode) {
                        var selYear = state.selectedYear || new Date().getFullYear();
                        var curMoIdx = new Date().getMonth();
                        // Always use state.projects (not filteredProjects) so work-stoppage projects appear
                        // even when the status filter is set to "on-going" only
                        var regProjs = state.projects.filter(function(p){ return p.region === reg && (!kpmIsNA(p) || isProjectOnStoppage(p)); }); // FIX: keep finished projects visible for past-month data
                        if (!regProjs.length) { if (typeof showToast === 'function') showToast('No active projects in ' + reg, 'info'); return; }

                        var isNew = !month; // ← declare here, used for month dropdown

                        // Determine which months already have data (any EP value or dateSubmitted set for any project in region)
                        var _kpmRowIds = ['e1','e2','e3','e4','e5','e6','e7','e8','e9','e10','e11','e12'];
                        var _filledMonths = {};
                        KPM_MONTHS.forEach(function(mo) {
                            var hasFill = regProjs.some(function(p) {
                                if (p.vals && p.vals['kpm_v3_' + mo + '_dateSubmitted']) return true;
                                return _kpmRowIds.some(function(id) {
                                    var v = p.vals && p.vals['kpm_v3_' + mo + '_' + id];
                                    return v && v.toString().trim() !== '';
                                });
                            });
                            _filledMonths[mo] = hasFill;
                        });

                        // Available months for Add Entry = months without data yet
                        var _availMonths = KPM_MONTHS.filter(function(mo) { return !_filledMonths[mo]; });

                        // If month is null (Add Entry), default to first available month or current month
                        var activeMo = month;
                        if (!activeMo) {
                            activeMo = _availMonths.length ? _availMonths[0] : KPM_MONTHS[curMoIdx];
                        }
                        var canEdit = editMode;
                        var dis = canEdit ? '' : 'disabled';

                        // Auto-enable edit mode
                        if (canEdit && !state.isEditing) {
                            state.isEditing = true;
                            document.body.classList.add('is-editing');
                            var _fb = document.getElementById('floating-edit-btn');
                            var _fi = document.getElementById('floating-edit-icon');
                            var _ft = document.getElementById('floating-edit-tooltip');
                            if (_fb) { _fb.classList.add('save-mode'); _fb.setAttribute('onclick','saveData()'); }
                            if (_fi) _fi.className = 'fas fa-save';
                            if (_ft) _ft.textContent = 'Click to Save';
                        }

                        var existing = document.getElementById('kpm-month-modal');
                        if (existing) existing.remove();

                        var modal = document.createElement('div');
                        modal.id = 'kpm-month-modal';
                        modal.setAttribute('data-reg', reg);
                        modal.setAttribute('data-regkey', regKey);
                        modal.setAttribute('data-month', activeMo);
                        modal.setAttribute('data-canedit', canEdit ? '1' : '0');
                        var _modalDateKey  = 'kpm_v3_' + activeMo + '_dateSubmitted';
                        var _modalDateVal  = (regProjs[0] && regProjs[0].vals && regProjs[0].vals[_modalDateKey]) || '';
                        var _modalProjSafe = regProjs[0] ? regProjs[0].name.replace(/\\/g,'\\\\').replace(/'/g,"\\'") : '';
                        var _regSafe = reg.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
                        var _regKeySafe = regKey.replace(/\\/g,'\\\\').replace(/'/g,"\\'");

                        // Build month dropdown HTML (only for Add Entry / isNew)
                        var _monthDropHtml = '';
                        if (isNew) {
                            var _moOpts = KPM_MONTHS.map(function(mo) {
                                var isFilled = _filledMonths[mo];
                                var isSelected = mo === activeMo;
                                return '<option value="' + mo + '"' + (isSelected ? ' selected' : '') + (isFilled ? ' disabled style="color:#bbb;"' : '') + '>'
                                    + mo + (isFilled ? ' ✓' : '') + '</option>';
                            }).join('');
                            _monthDropHtml = '<label style="display:flex;align-items:center;gap:5px;white-space:nowrap;font-size:0.67rem;color:#555;">'
                                + '<i class="fas fa-calendar-alt" style="color:#1b5e20;font-size:0.7rem;"></i>'
                                + '<span style="font-weight:700;font-size:0.64rem;color:#444;">Month:</span>'
                                + '<select id="kpm-modal-month-sel"'
                                + ' onchange="(function(v){var m=document.getElementById(\'kpm-month-modal\');if(m)m.remove();window.openKpmDialog(\'' + _regKeySafe + '\',\'' + _regSafe + '\',v,true);})(this.value)"'
                                + ' style="border:1px solid #a5d6a7;border-radius:4px;padding:3px 7px;font-size:0.67rem;font-weight:700;background:#e8f5e9;color:#1b5e20;cursor:pointer;min-width:110px;">'
                                + _moOpts
                                + '</select>'
                                + '</label>';
                        }

                        // Meta bar: region label + Month dropdown (Add Entry only) + Date Submitted input + scroll hint
                        var _kpmDateField = ''
                            + '<label style="display:flex;align-items:center;gap:5px;white-space:nowrap;font-size:0.67rem;color:#555;margin-left:4px;">'
                            + '<i class="fas fa-calendar-check" style="color:' + (_modalDateVal?'#2e7d32':'#c62828') + ';font-size:0.7rem;"></i>'
                            + '<span style="font-weight:700;font-size:0.64rem;color:#444;">Date Submitted:</span>'
                            + '<input type="date" id="kpm-modal-date-submitted" value="' + _modalDateVal + '" ' + (canEdit ? '' : 'disabled')
                            + ' oninput="(function(el,v){var p=state.projects.find(function(x){return x.name===\'' + _modalProjSafe + '\';});if(p){if(!p.vals)p.vals={};p.vals[\'' + _modalDateKey + '\']=v;if(typeof markPendingSync===\'function\')markPendingSync();}var ok=!!v;el.style.background=ok?\'#c8e6c9\':\'#ffcdd2\';el.style.color=ok?\'#2e7d32\':\'#c62828\';el.style.borderColor=ok?\'#a5d6a7\':\'#ef9a9a\';var ico=el.parentElement.querySelector(\'i\');if(ico)ico.style.color=ok?\'#2e7d32\':\'#c62828\';window._kpmDateSync&&window._kpmDateSync(el);})(this,this.value)"'
                            + ' style="border:1px solid ' + (_modalDateVal?'#a5d6a7':'#ef9a9a') + ';border-radius:4px;padding:3px 7px;font-size:0.67rem;font-weight:700;background:' + (_modalDateVal?'#c8e6c9':'#ffcdd2') + ';color:' + (_modalDateVal?'#2e7d32':'#c62828') + ';cursor:' + (canEdit?'pointer':'not-allowed') + ';">'
                            + '</label>';
                        var metaHtml = window.eshInfoBar({ icon: 'fa-table', label: 'All projects in region', items: [_monthDropHtml, _kpmDateField], hint: 'Scroll table horizontally' });

                        // Build KPM table
                        var tableHtml = window._kpmBuildModalTable(regProjs, activeMo, dis, regKey);

                        var _kpmSubMo = KPM_MONTHS.indexOf(activeMo) + 1;
                        var _kpmSubActive  = regProjs.filter(function(p){ return !isProjectOnStoppage(p) && !isMonthBlacklistedForProject(p, _kpmSubMo, selYear); }).length;
                        var _kpmSubStopped = regProjs.filter(function(p){ return isProjectOnStoppage(p); }).length;
                        var _kpmSubHidden  = regProjs.filter(function(p){ return !!p.dateFinished && isProjectHiddenForMonth(p, _kpmSubMo, selYear); }).length;
                        window.eshMountModal(modal, {
                            id: 'kpm-month-modal', icon: 'fa-gauge-high', width: 'min(1600px,99vw)', bodyFlex: true,
                            title: (isNew ? 'New KPM entry' : (canEdit ? 'Edit KPM' : 'View KPM')) + ' — <span style="color:#2e7d32;">' + activeMo + ' ' + selYear + '</span>',
                            sub: window.eshModalSub({ loc: reg, count: _kpmSubActive, extra: [
                                _kpmSubStopped ? '<span style="color:#ad1457;font-size:0.63rem;"><i class="fas fa-pause-circle" style="margin-right:3px;"></i>' + _kpmSubStopped + ' on work stop (excluded)</span>' : '',
                                _kpmSubHidden ? '<span style="color:#757575;font-size:0.63rem;"><i class="fas fa-eye-slash" style="margin-right:3px;"></i>' + _kpmSubHidden + ' finished (hidden)</span>' : ''
                            ] }),
                            body: ''
                            // Per-project submission meta
                            + metaHtml
                            // Table
                            + '<div style="overflow:auto;flex:1 1 auto;min-height:0;background:var(--bg-card);">'
                            + tableHtml
                            + '</div>'
                            // Legend
                            + '<div style="padding:6px 16px;background:#f9fdf9;border-top:1px solid #c8e6c9;display:flex;gap:12px;flex-wrap:wrap;align-items:center;">'
                            + '<span style="font-size:0.59rem;color:#1b5e20;font-weight:600;display:flex;align-items:center;gap:4px;"><span style="width:9px;height:9px;border-radius:2px;background:#c8e6c9;display:inline-block;"></span>≥90% Excellent</span>'
                            + '<span style="font-size:0.59rem;color:#7a5c00;font-weight:600;display:flex;align-items:center;gap:4px;"><span style="width:9px;height:9px;border-radius:2px;background:#fff9c4;display:inline-block;"></span>85–89% Satisfactory</span>'
                            + '<span style="font-size:0.59rem;color:#c62828;font-weight:600;display:flex;align-items:center;gap:4px;"><span style="width:9px;height:9px;border-radius:2px;background:#ffcdd2;display:inline-block;"></span>&lt;85% Needs Improvement</span>'
                            + '<span style="font-size:0.59rem;color:#880e4f;font-weight:600;display:flex;align-items:center;gap:4px;"><span style="width:9px;height:9px;border-radius:2px;background:#fce4ec;border:1px solid #f48fb1;display:inline-block;"></span>Pink column = Work Stoppage (hover for details)</span>'
                            + '<span style="font-size:0.59rem;color:#888;margin-left:auto;">FM-RNI-04-04 | Rev. No.:4 | Eff. Date: 06 Aug 2018</span>'
                            + '</div>'
                            , foot: canEdit ? '<button onclick="window.saveKpmModal()" class="mdl-btn primary"><i class="fas fa-save" style="margin-right:6px;"></i>Save Changes</button>' : '' });
                        if (window._kpmDateSync) window._kpmDateSync(document.getElementById('kpm-modal-date-submitted'));
                    };

                    window._kpmBuildModalTable = function(regProjs, activeMo, dis, regKey) {
                        var rows = KPM_ESH_ROWS;
                        var modKey = 'mod_' + regKey;
                        var totalDW = rows.reduce(function(s,r){return s+r.dw;},0);
                        var grandTotal = 0;
                        var tableRows = '';
                        var selYear = state.selectedYear || new Date().getFullYear();
                        var moIdx1Based = KPM_MONTHS.indexOf(activeMo) + 1; // 1-based month index
                        var _anchorProj = regProjs[0]; // improvement plan stays stored on the region's first project
                        // Projects declared finished in/before this month are hidden (not part of this month's compliance)
                        regProjs = regProjs.filter(function(pp) { return !isProjectHiddenForMonth(pp, moIdx1Based, selYear); }); // hides not-yet-started (start month & earlier) and finished (months after finish month)

                        // Pre-compute which projects are frozen for this specific month
                        // A project column is frozen (blank, "—") if: (a) it is on work-stoppage (entire column frozen), or
                        // (b) this specific month is blacklisted for it. These months genuinely have no data.
                        var _projWsFrozen = regProjs.map(function(pp) {
                            return isProjectOnStoppage(pp) || isMonthBlacklistedForProject(pp, moIdx1Based, selYear);
                        });
                        // Finished projects: read-only (cannot input new data, excluded from compliance),
                        // but any real historical value already saved for this month must still be shown — not blanked out.
                        var _projFinished = regProjs.map(function(pp) { return isProjectFinishedForMonth(pp, moIdx1Based, selYear); });

                        rows.forEach(function(row, _ri) {
                            // Merge # and Work Process cells across the deliverables they cover
                            var _grpSpan = 0;
                            if (row.kpm) { _grpSpan = 1; for (var _gi = _ri + 1; _gi < rows.length && !rows[_gi].kpm; _gi++) _grpSpan++; }
                            var projEPs = regProjs.map(function(pp, pi) {
                                if (_projWsFrozen[pi] || _projFinished[pi]) return ''; // exclude frozen/finished projects from avg
                                var k = 'kpm_v3_' + activeMo + '_' + row.id;
                                var raw = String(pp.vals[k]||'').replace('%','').trim();
                                var n = parseFloat(raw);
                                return isNaN(n) ? '' : n/100;
                            });
                            var validEPs = projEPs.filter(function(v){ return v !== ''; });
                            var avgEp = validEPs.length ? validEPs.reduce(function(s,v){return s+v;},0)/validEPs.length : '';
                            var rowTotal = avgEp !== '' ? avgEp * row.dw : '';
                            if (rowTotal !== '') grandTotal += rowTotal;
                            var dwDisplay = (row.dw*100).toFixed(0)+'%';
                            var avgEpDisplay = avgEp !== '' ? (avgEp*100).toFixed(1)+'%' : '—';
                            var rowTotalDisplay = rowTotal !== '' ? (rowTotal*100).toFixed(2)+'%' : '—';
                            var epColor = avgEp !== '' ? (avgEp>=0.90?'#2e7d32':avgEp>=0.85?'#e65100':'#c62828') : '#aaa';

                            var kpiCells = [0,1,2,3,4].map(function(i){
                                var v = row.ind ? row.ind[i] : (row.kpi ? row.kpi[i] : null);
                                return '<td style="text-align:center;padding:3px 4px;border:1px solid #d5e3d8;font-size:0.64rem;font-weight:400;line-height:1.25;background:transparent;color:#2b3a2f;white-space:normal;word-wrap:break-word;vertical-align:middle;">'+(v||'')+'</td>';
                            }).join('');

                            var projCells = regProjs.map(function(pp, pi) {
                                if (_projWsFrozen[pi]) {
                                    // Work-stoppage / month-blacklisted — genuinely no data for this month
                                    var _pcNotYetStarted = isMonthBeforeProjectStart(pp, moIdx1Based, selYear);
                                    var _pcRsn = getMonthExemptReason(pp, moIdx1Based, selYear);
                                    var _pcTip = _pcNotYetStarted ? ('Project not yet started — starts ' + formatDateDMY(pp.dateStarted) + '. Not required.') : (_pcRsn === 'finished' ? ('Project finished (' + formatDateDMY(pp.dateFinished) + '). Not required.') : 'Work Stoppage — excluded from compliance');
                                    return '<td style="text-align:center;padding:2px 6px;border:1px solid #d5e3d8;width:68px;min-width:68px;max-width:68px;background:#fce4ec;">'
                                        + '<input type="text" value="—" disabled title="' + _pcTip + '"'
                                        + ' style="width:52px;text-align:center;border:none;outline:none;border-radius:3px;padding:3px 2px;font-size:0.72rem;font-weight:700;color:#880e4f;background:transparent;cursor:not-allowed;">'
                                        + '</td>';
                                }
                                var pk = pp.name.replace(/[^a-zA-Z0-9]/g,'_');
                                var pnSafeInner = pp.name.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
                                var k = 'kpm_v3_' + activeMo + '_' + row.id;
                                var rawVal = pp.vals[k] !== undefined ? pp.vals[k] : '';
                                var n = parseFloat(String(rawVal).replace('%',''));
                                var inputColor = (isNaN(n)||n===0)?'#555':n/100>=0.90?'#2e7d32':n/100>=0.85?'#e65100':'#c62828';
                                var validKpiOptsMod = (row.kpi||[]).filter(function(v){ return v !== null && v !== undefined && v !== ''; });
                                var optionsHtmlMod = '<option value="">—</option>' + validKpiOptsMod.map(function(opt){
                                    return '<option value="' + opt + '"' + (rawVal === opt ? ' selected' : '') + '>' + opt + '</option>';
                                }).join('');
                                // Finished projects: still show their real saved value, but frozen (disabled) — cannot be edited, excluded from compliance avg above.
                                var _isFin = _projFinished[pi];
                                return '<td style="text-align:center;padding:2px 6px;border:1px solid #d5e3d8;width:68px;min-width:68px;max-width:68px;' + (_isFin ? 'background:#f5f5f5;' : '') + '">'
                                    + '<select id="kpmmod-ep-' + modKey + '-' + row.id + '-' + pk + '"'
                                    + ((dis || _isFin) ? ' disabled' : '')
                                    + (_isFin ? ' title="Finished — read only, excluded from compliance"' : '')
                                    + ' data-regkey="' + modKey + '" data-rowid="' + row.id + '" data-dw="' + row.dw + '" data-pname="' + pnSafeInner + '" data-activemo="' + activeMo + '"'
                                    + ' onchange="window.kpmEpSelectChangeMod(this)"'
                                    + ' style="width:56px;text-align:center;' + ((dis||_isFin) ? 'border:none;outline:none;-webkit-appearance:none;-moz-appearance:none;appearance:none;opacity:1;' : 'border:1px solid #d5e3d8;') + 'border-radius:3px;padding:2px 1px;font-size:0.72rem;font-weight:700;color:' + (_isFin?'#9e9e9e':inputColor) + ';background:' + (_isFin?'#eee':(dis?'transparent':'#fff')) + ';cursor:' + (_isFin?'not-allowed':'pointer') + ';">'
                                    + optionsHtmlMod
                                    + '</select>'
                                    + '</td>';
                            }).join('');

                            var impKey = 'kpm_v3_imp_' + activeMo + '_' + row.id;
                            var impProj = _anchorProj;
                            var immAct = impProj.vals[impKey+'_ia']||'';
                            var rootC  = impProj.vals[impKey+'_rc']||'';
                            var corrAc = impProj.vals[impKey+'_ca']||'';
                            var doImpl = impProj.vals[impKey+'_doi']||'';
                            var status = impProj.vals[impKey+'_st']||'';

                            tableRows += '<tr style="background:transparent;border-bottom:1px solid #d5e3d8;">'
                                + (_grpSpan ? '<td rowspan="' + _grpSpan + '" style="text-align:center;vertical-align:middle;font-weight:700;color:#1f4d2e;padding:3px 2px;border:1px solid #d5e3d8;font-size:0.73rem;width:26px;min-width:26px;max-width:26px;white-space:nowrap;overflow:hidden;">' + row.kpm + '</td>' : '')
                                + (_grpSpan ? '<td rowspan="' + _grpSpan + '" style="text-align:center;vertical-align:middle;padding:4px 7px;border:1px solid #d5e3d8;font-size:0.68rem;color:#1f4d2e;font-weight:600;min-width:120px;white-space:normal;max-width:130px;">' + row.wp + '</td>' : '')
                                + '<td style="padding:4px 7px;border:1px solid #d5e3d8;font-size:0.68rem;color:#2b3a2f;min-width:120px;white-space:normal;max-width:130px;">' + row.del + '</td>'
                                + '<td style="text-align:center;padding:4px 5px;border:1px solid #d5e3d8;font-size:0.72rem;font-weight:700;color:#1f4d2e;min-width:40px;">' + dwDisplay + '</td>'
                                + '<td style="padding:4px 7px;border:1px solid #d5e3d8;font-size:0.68rem;color:#2b3a2f;min-width:140px;white-space:normal;max-width:150px;">' + row.measure + '</td>'
                                + kpiCells + projCells
                                + '<td id="kpmmod-avg-ep-' + modKey + '-' + row.id + '" style="text-align:center;padding:4px 5px;border:1px solid #d5e3d8;font-size:0.73rem;font-weight:800;color:' + epColor + ';min-width:56px;">' + avgEpDisplay + '</td>'
                                + '<td id="kpmmod-row-tot-' + modKey + '-' + row.id + '" style="text-align:center;padding:4px 5px;border:1px solid #d5e3d8;font-size:0.73rem;font-weight:800;color:' + epColor + ';min-width:62px;">' + rowTotalDisplay + '</td>'
                                + '<td style="padding:3px 4px;border:1px solid #d5e3d8;min-width:90px;"><textarea '+(dis?'disabled':'')+' placeholder="Immediate Action" rows="2" name="kpmmod-imp-ia-' + row.id + '" style="width:100%;font-size:0.63rem;border:1px solid #ccc;border-radius:3px;resize:vertical;">' + immAct + '</textarea></td>'
                                + '<td style="padding:3px 4px;border:1px solid #d5e3d8;min-width:80px;"><textarea '+(dis?'disabled':'')+' placeholder="Root Cause" rows="2" name="kpmmod-imp-rc-' + row.id + '" style="width:100%;font-size:0.63rem;border:1px solid #ccc;border-radius:3px;resize:vertical;">' + rootC + '</textarea></td>'
                                + '<td style="padding:3px 4px;border:1px solid #d5e3d8;min-width:90px;"><textarea '+(dis?'disabled':'')+' placeholder="Corrective Action" rows="2" name="kpmmod-imp-ca-' + row.id + '" style="width:100%;font-size:0.63rem;border:1px solid #ccc;border-radius:3px;resize:vertical;">' + corrAc + '</textarea></td>'
                                + '<td style="padding:3px 4px;border:1px solid #d5e3d8;min-width:80px;"><input type="date" value="' + doImpl + '" '+(dis?'disabled':'')+' name="kpmmod-imp-doi-' + row.id + '" style="width:100%;font-size:0.62rem;border:1px solid #ccc;border-radius:3px;padding:2px;"></td>'
                                + '<td style="padding:3px 4px;border:1px solid #d5e3d8;min-width:72px;"><select '+(dis?'disabled':'')+' name="kpmmod-imp-st-' + row.id + '" style="width:100%;font-size:0.63rem;border:1px solid #ccc;border-radius:3px;padding:2px;">'
                                + '<option value="">—</option>'
                                + '<option value="Closed"'+(status==='Closed'?' selected':'')+'>Closed</option>'
                                + '<option value="Not Effective"'+(status==='Not Effective'?' selected':'')+'>Not Effective</option>'
                                + '</select></td>'
                                + '</tr>';
                        });

                        var grandColor = grandTotal>=0.90?'#2e7d32':grandTotal>=0.85?'#e65100':'#c62828';
                        // Inject marquee CSS + JS once per page load
                        if (!window._kpmMarqueeInstalled) {
                            window._kpmMarqueeInstalled = true;

                            // JS marquee: scroll left to end, scroll back right, then stop
                            document.addEventListener('mouseover', function(e) {
                                var wrap = e.target.closest('.kpm-proj-name-wrap');
                                if (!wrap) return;
                                var txt = wrap.querySelector('.kpm-proj-name-txt');
                                if (!txt || wrap._kpmAnimating) return;
                                var overflow = txt.scrollWidth - wrap.clientWidth;
                                if (overflow <= 2) return; // no overflow, nothing to scroll
                                wrap._kpmAnimating = true;
                                var duration = Math.max(1500, overflow * 18); // ~18ms per px
                                var start = null;
                                function scrollLeft(ts) {
                                    if (!start) start = ts;
                                    var progress = Math.min((ts - start) / duration, 1);
                                    txt.style.transform = 'translateX(-' + (overflow * progress) + 'px)';
                                    if (progress < 1) {
                                        wrap._rafId = requestAnimationFrame(scrollLeft);
                                    } else {
                                        // pause briefly at the end then scroll back
                                        wrap._rafId = null;
                                        setTimeout(function() {
                                            if (!wrap._kpmAnimating) return;
                                            var start2 = null;
                                            function scrollRight(ts2) {
                                                if (!start2) start2 = ts2;
                                                var p2 = Math.min((ts2 - start2) / duration, 1);
                                                txt.style.transform = 'translateX(-' + (overflow * (1 - p2)) + 'px)';
                                                if (p2 < 1) {
                                                    wrap._rafId = requestAnimationFrame(scrollRight);
                                                } else {
                                                    txt.style.transform = 'translateX(0)';
                                                    wrap._kpmAnimating = false;
                                                    wrap._rafId = null;
                                                }
                                            }
                                            wrap._rafId = requestAnimationFrame(scrollRight);
                                        }, 600);
                                    }
                                }
                                wrap._rafId = requestAnimationFrame(scrollLeft);
                            });
                            document.addEventListener('mouseout', function(e) {
                                var wrap = e.target.closest('.kpm-proj-name-wrap');
                                if (!wrap) return;
                                // Only reset if mouse truly left the wrap element
                                if (wrap.contains(e.relatedTarget)) return;
                                if (wrap._rafId) { cancelAnimationFrame(wrap._rafId); wrap._rafId = null; }
                                var txt = wrap.querySelector('.kpm-proj-name-txt');
                                if (txt) txt.style.transform = 'translateX(0)';
                                wrap._kpmAnimating = false;
                            });
                        }

                        var projHeaderCols = regProjs.map(function(pp, pi){
                            var isFrozen = _projWsFrozen[pi];
                            var isFullStop = isProjectOnStoppage(pp);
                            var isFinished = !!pp.dateFinished;
                            // Both full-stop and month-blacklisted use pink header; finished use grey-blue
                            var hBg    = isFrozen ? '#fce4ec' : '#e3eee5';
                            var hColor = isFrozen ? '#c62828' : '#1b5e20';
                            // Tooltip: always show full project name + status if not normal
                            var statusNote = (isFinished && isProjectFinishedForMonth(pp, moIdx1Based, selYear) && !isMonthBeforeProjectStart(pp, moIdx1Based, selYear))
                                ? ' [FINISHED: ' + formatDateDMY(pp.dateFinished) + ' — this month is not required]'
                                : (isFinished && !isFrozen)
                                ? ' [FINISHED: ' + formatDateDMY(pp.dateFinished) + ' — this month was still active]'
                                : isMonthBeforeProjectStart(pp, moIdx1Based, selYear)
                                    ? ' [NOT YET STARTED — project starts ' + formatDateDMY(pp.dateStarted) + ']'
                                    : isFullStop
                                        ? ' [WORK STOPPAGE — excluded from computation]'
                                        : isFrozen
                                            ? ' [MONTH EXCLUDED — work stoppage period]'
                                            : '';
                            var tooltipText = (pp.name + statusNote).replace(/"/g, '&quot;');
                            return '<th style="padding:5px 6px;border:1px solid #d5e3d8;color:' + hColor + ';font-size:0.62rem;font-weight:700;text-align:center;width:68px;min-width:68px;max-width:68px;background:' + hBg + ';" title="' + tooltipText + '">'
                                + '<span class="kpm-proj-name-wrap"><span class="kpm-proj-name-txt">' + pp.name + '</span></span>'
                                + '</th>';
                        }).join('');
                        var projGradeRow3Cols = regProjs.map(function(pp, pi){
                            var isFrozen = _projWsFrozen[pi];
                            var isFullStop = isProjectOnStoppage(pp);
                            var isFinished = !!pp.dateFinished;
                            var statusNote = (isFinished && isProjectFinishedForMonth(pp, moIdx1Based, selYear) && !isMonthBeforeProjectStart(pp, moIdx1Based, selYear))
                                ? ' [FINISHED: ' + formatDateDMY(pp.dateFinished) + ' — this month is not required]'
                                : (isFinished && !isFrozen)
                                ? ' [FINISHED: ' + formatDateDMY(pp.dateFinished) + ' — this month was still active]'
                                : isMonthBeforeProjectStart(pp, moIdx1Based, selYear)
                                    ? ' [NOT YET STARTED — project starts ' + formatDateDMY(pp.dateStarted) + ']'
                                    : isFullStop
                                        ? ' [WORK STOPPAGE — excluded from computation]'
                                        : isFrozen
                                            ? ' [MONTH EXCLUDED — work stoppage period]'
                                            : '';
                            var tooltipText = (pp.name + statusNote).replace(/"/g, '&quot;');
                            return '<th style="padding:4px 6px;border:1px solid #d5e3d8;color:' + (isFrozen?'#c62828':'#1f4d2e') + ';font-size:0.6rem;font-style:italic;text-align:center;width:68px;min-width:68px;max-width:68px;background:' + (isFrozen?'#fce4ec':'#e3eee5') + ';" title="' + tooltipText + '">EP (%)</th>';
                        }).join('');

                        return '<table style="border-collapse:collapse;font-size:0.68rem;width:max-content;min-width:100%;table-layout:fixed;">'
                            + '<thead>'
                            + '<tr style="background:#4f7a5a;color:#fff;font-size:0.67rem;font-weight:700;text-align:center;">'
                            + '<th rowspan="3" style="background:#e3eee5;color:#1f4d2e;padding:4px 2px;border:1px solid #d5e3d8;vertical-align:middle;width:26px;min-width:26px;max-width:26px;text-align:center;white-space:nowrap;overflow:hidden;">#</th>'
                            + '<th colspan="4" style="padding:6px 4px;border:1px solid #d5e3d8;">KEY PERFORMANCE MEASURES</th>'
                            + '<th colspan="5" style="padding:6px 4px;border:1px solid #d5e3d8;">KEY PERFORMANCE INDICATORS</th>'
                            + '<th colspan="' + regProjs.length + '" style="padding:6px 4px;border:1px solid #d5e3d8;background:#2f5d3e;color:#fff;font-weight:700;">ACTUAL PERFORMANCE RATING — EP</th>'
                            + '<th rowspan="3" style="background:#e3eee5;color:#1f4d2e;padding:6px 4px;border:1px solid #d5e3d8;vertical-align:middle;min-width:56px;white-space:normal;">AVG<br>EP</th>'
                            + '<th rowspan="3" style="background:#e3eee5;color:#1f4d2e;padding:6px 4px;border:1px solid #d5e3d8;vertical-align:middle;min-width:62px;white-space:normal;">Total %<br><span style="font-size:0.55rem;font-weight:400;">(EP×DW)</span></th>'
                            + '<th colspan="5" style="padding:6px 4px;border:1px solid #d5e3d8;font-size:0.56rem;font-weight:400;font-style:italic;color:#e3eee5;">Improvement Plan (if &lt;3)</th>'
                            + '</tr>'
                            + '<tr style="background:#e3eee5;color:#1f4d2e;font-size:0.62rem;font-weight:700;text-align:center;">'
                            + '<th rowspan="2" style="padding:5px 4px;border:1px solid #d5e3d8;vertical-align:middle;min-width:120px;white-space:normal;">Work Process</th>'
                            + '<th rowspan="2" style="padding:5px 4px;border:1px solid #d5e3d8;vertical-align:middle;min-width:120px;white-space:normal;">Deliverables</th>'
                            + '<th rowspan="2" style="padding:5px 4px;border:1px solid #d5e3d8;vertical-align:middle;min-width:40px;">DW</th>'
                            + '<th rowspan="2" style="padding:5px 4px;border:1px solid #d5e3d8;vertical-align:middle;min-width:140px;white-space:normal;">Measure</th>'
                            + '<th style="padding:5px 2px;border:1px solid #d5e3d8;width:120px;min-width:120px;max-width:120px;">75%</th>'
                            + '<th style="padding:5px 2px;border:1px solid #d5e3d8;width:120px;min-width:120px;max-width:120px;">80%</th>'
                            + '<th style="padding:5px 2px;border:1px solid #d5e3d8;width:120px;min-width:120px;max-width:120px;">85%</th>'
                            + '<th style="padding:5px 2px;border:1px solid #d5e3d8;width:120px;min-width:120px;max-width:120px;">90%</th>'
                            + '<th style="padding:5px 2px;border:1px solid #d5e3d8;width:120px;min-width:120px;max-width:120px;">95%</th>'
                            + projHeaderCols
                            + '<th colspan="5" style="padding:5px 4px;border:1px solid #d5e3d8;font-size:0.56rem;font-weight:400;font-style:italic;background:#d3e6d8;color:#1f4d2e;">IMPROVEMENT PLAN</th>'
                            + '</tr>'
                            + '<tr style="background:#e3eee5;color:#1f4d2e;font-size:0.63rem;font-weight:700;text-align:center;">'
                            + '<th style="padding:4px 2px;border:1px solid #d5e3d8;">1</th>'
                            + '<th style="padding:4px 2px;border:1px solid #d5e3d8;">2</th>'
                            + '<th style="padding:4px 2px;border:1px solid #d5e3d8;">3</th>'
                            + '<th style="padding:4px 2px;border:1px solid #d5e3d8;">4</th>'
                            + '<th style="padding:4px 2px;border:1px solid #d5e3d8;">5</th>'
                            + projGradeRow3Cols
                            + '<th style="padding:4px 2px;border:1px solid #d5e3d8;background:#e3eee5;color:#1f4d2e;">Immediate Action</th>'
                            + '<th style="padding:4px 2px;border:1px solid #d5e3d8;background:#e3eee5;color:#1f4d2e;">Root Cause</th>'
                            + '<th style="padding:4px 2px;border:1px solid #d5e3d8;background:#e3eee5;color:#1f4d2e;">Corrective Action</th>'
                            + '<th style="padding:4px 2px;border:1px solid #d5e3d8;background:#e3eee5;color:#1f4d2e;">Date Impl.</th>'
                            + '<th style="padding:4px 2px;border:1px solid #d5e3d8;background:#e3eee5;color:#1f4d2e;">Status</th>'
                            + '</tr></thead>'
                            + '<tbody>' + tableRows + '</tbody>'
                            + '<tfoot><tr style="background:#e3eee5;color:#1f4d2e;font-weight:800;border-top:2px solid #4f7a5a;">'
                            + '<td style="border:1px solid #d5e3d8;padding:3px 2px;width:26px;min-width:26px;max-width:26px;white-space:nowrap;overflow:hidden;"></td>'
                            + '<td colspan="2" style="border:1px solid #d5e3d8;padding:6px 8px;font-size:0.7rem;color:#1f4d2e;">TOTAL</td>'
                            + '<td style="text-align:center;color:#1f4d2e;font-size:0.75rem;font-weight:800;border:1px solid #d5e3d8;">' + (totalDW*100).toFixed(0) + '%</td>'
                            + '<td colspan="' + (5 + regProjs.length + 1) + '" style="border:1px solid #d5e3d8;"></td>'
                            + '<td style="text-align:center;font-size:0.82rem;font-weight:800;color:' + grandColor + ';border:1px solid #d5e3d8;">' + (grandTotal>0?(grandTotal*100).toFixed(2)+'%':'—') + '</td>'
                            + '<td colspan="5" style="border:1px solid #d5e3d8;"></td>'
                            + '</tr></tfoot></table>';
                    };

                    // Handler for the new dropdown EP selector (modal view)
                    window.kpmEpSelectChangeMod = function(sel) {
                        var regKey   = sel.dataset.regkey;
                        var rowId    = sel.dataset.rowid;
                        var dw       = parseFloat(sel.dataset.dw);
                        var pnSafe   = sel.dataset.pname;
                        var activeMo = sel.dataset.activemo;
                        var val      = sel.value;
                        var n = parseFloat(String(val).replace('%',''));
                        sel.style.color = (!val || isNaN(n)) ? '#555' : n/100 >= 0.90 ? '#2e7d32' : n/100 >= 0.85 ? '#e65100' : '#c62828';
                        var pObj = state.projects.find(function(x){ return x.name === pnSafe; });
                        if (pObj) {
                            var _rbac = UserAccounts.checkPermission(state.currentUser && state.currentUser.email, 'edit', pObj.region, 'kpm');
                            if (!_rbac.allowed) { showLockedMessage(_rbac.reason); sel.value = pObj.vals['kpm_v3_' + activeMo + '_' + rowId] || ''; return; }
                            pObj.vals['kpm_v3_' + activeMo + '_' + rowId] = val;
                            if (typeof markPendingSync==='function') markPendingSync();
                        }
                        var epSelects = document.querySelectorAll('[id^="kpmmod-ep-' + regKey + '-' + rowId + '-"]');
                        var sum=0,count=0;
                        epSelects.forEach(function(s){ if(s.disabled) return; var r=parseFloat((s.value||'').replace('%','').trim()); if(!isNaN(r)&&r>0){sum+=r/100;count++;} });
                        var avgEp = count>0?sum/count:0;
                        var total = avgEp*dw;
                        var avgEl = document.getElementById('kpmmod-avg-ep-' + regKey + '-' + rowId);
                        var totEl = document.getElementById('kpmmod-row-tot-' + regKey + '-' + rowId);
                        var ec = avgEp>=0.90?'#2e7d32':avgEp>=0.85?'#e65100':avgEp>0?'#c62828':'#aaa';
                        if (avgEl){ avgEl.textContent = avgEp>0?(avgEp*100).toFixed(1)+'%':'—'; avgEl.style.color=ec; }
                        if (totEl){ totEl.textContent = total>0?(total*100).toFixed(2)+'%':'—'; totEl.style.color=ec; }
                    };

                    // Save & close
                    // Date Submitted indicator: red pulse + "Required" tag while empty
                    window._kpmDateSync = function(el) {
                        if (!el || el.disabled) return;
                        var ok = !!el.value;
                        el.classList.toggle('kpm-date-pulse', !ok);
                        var h = document.getElementById('kpm-date-hint');
                        if (!h) {
                            h = document.createElement('span');
                            h.id = 'kpm-date-hint';
                            h.className = 'kpm-date-hint';
                            h.innerHTML = '<i class="fas fa-arrow-left"></i>Required: fill in the date';
                            if (el.parentElement) el.parentElement.appendChild(h);
                        }
                        h.style.display = ok ? 'none' : 'inline-flex';
                    };

                    // Ask first if Date Submitted is empty, then run the real save
                    window.saveKpmModal = function() {
                        var modal = document.getElementById('kpm-month-modal');
                        if (!modal) return;
                        var dateEl = document.getElementById('kpm-modal-date-submitted');
                        if (dateEl && !dateEl.disabled && !dateEl.value) {
                            var old = document.getElementById('kpm-date-confirm');
                            if (old) old.remove();
                            var box = document.createElement('div');
                            box.id = 'kpm-date-confirm';
                            box.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:100000;display:flex;align-items:center;justify-content:center;padding:16px;';
                            box.innerHTML = '<div style="background:var(--bg-card,#fff);border-radius:12px;max-width:420px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.45);overflow:hidden;">'
                                + '<div style="background:#fff3e0;border-bottom:1px solid #ffcc80;padding:14px 18px;display:flex;align-items:center;gap:10px;">'
                                + '<i class="fas fa-triangle-exclamation" style="color:#e65100;font-size:1.2rem;"></i>'
                                + '<div style="font-weight:800;font-size:0.9rem;color:#bf360c;">Date Submitted is empty</div></div>'
                                + '<div style="padding:16px 18px;font-size:0.8rem;line-height:1.5;color:var(--text-main,#333);">'
                                + 'You did not fill in the <b>Date Submitted</b>. Without it, this month is counted as <b>not submitted</b> in the compliance score.<br><br>Do you still want to save?</div>'
                                + '<div style="padding:12px 18px;display:flex;justify-content:flex-end;gap:10px;border-top:1px solid var(--border-color,#ddd);">'
                                + '<button id="kpm-date-confirm-save" style="background:#fff;color:#c62828;border:1px solid #ef9a9a;border-radius:7px;padding:8px 16px;font-size:0.76rem;font-weight:700;cursor:pointer;">Save anyway</button>'
                                + '<button id="kpm-date-confirm-fill" style="background:#2e7d32;color:#fff;border:none;border-radius:7px;padding:8px 18px;font-size:0.76rem;font-weight:700;cursor:pointer;">Go back and fill in</button>'
                                + '</div></div>';
                            document.body.appendChild(box);
                            document.getElementById('kpm-date-confirm-fill').onclick = function() {
                                box.remove();
                                var el = document.getElementById('kpm-modal-date-submitted');
                                if (el) {
                                    el.scrollIntoView({ block: 'center', inline: 'center' });
                                    el.classList.remove('kpm-date-shake'); void el.offsetWidth;
                                    el.classList.add('kpm-date-shake');
                                    el.focus();
                                    if (typeof el.showPicker === 'function') { try { el.showPicker(); } catch (e) {} }
                                }
                            };
                            document.getElementById('kpm-date-confirm-save').onclick = function() {
                                box.remove();
                                window._kpmDoSave();
                            };
                            return;
                        }
                        window._kpmDoSave();
                    };

                    window._kpmDoSave = function() {
                        var modal = document.getElementById('kpm-month-modal');
                        if (!modal) return;

                        var reg = modal.getAttribute('data-reg');
                        var activeMo = modal.getAttribute('data-month');
                        if (!reg || !activeMo) { modal.remove(); render(); return; }

                        var regProjs = state.projects.filter(function(p){ return p.region === reg && (!kpmIsNA(p) || isProjectOnStoppage(p)); }); // FIX: keep finished projects visible for past-month data

                        // RBAC check on first project
                        if (regProjs.length) {
                            var _rbac = UserAccounts.checkPermission(state.currentUser && state.currentUser.email, 'edit', reg, 'kpm');
                            if (!_rbac.allowed) { showLockedMessage(_rbac.reason); return; }
                        }

                        // Save EP values (live-written on blur, but sweep once more)
                        modal.querySelectorAll('[data-activemo]').forEach(function(inp) {
                            var rowId = inp.dataset.rowid;
                            var ppName = inp.dataset.pname;
                            var pp = state.projects.find(function(x){ return x.name===ppName; });
                            if (pp && rowId) pp.vals['kpm_v3_' + activeMo + '_' + rowId] = inp.value;
                        });

                        // Save improvement plan
                        var impProj = regProjs[0];
                        if (impProj) {
                            KPM_ESH_ROWS.forEach(function(row) {
                                var impKey = 'kpm_v3_imp_' + activeMo + '_' + row.id;
                                var iaEl  = modal.querySelector('[name="kpmmod-imp-ia-'  + row.id + '"]');
                                var rcEl  = modal.querySelector('[name="kpmmod-imp-rc-'  + row.id + '"]');
                                var caEl  = modal.querySelector('[name="kpmmod-imp-ca-'  + row.id + '"]');
                                var doiEl = modal.querySelector('[name="kpmmod-imp-doi-' + row.id + '"]');
                                var stEl  = modal.querySelector('[name="kpmmod-imp-st-'  + row.id + '"]');
                                if (iaEl)  impProj.vals[impKey+'_ia']  = iaEl.value;
                                if (rcEl)  impProj.vals[impKey+'_rc']  = rcEl.value;
                                if (caEl)  impProj.vals[impKey+'_ca']  = caEl.value;
                                if (doiEl) impProj.vals[impKey+'_doi'] = doiEl.value;
                                if (stEl)  impProj.vals[impKey+'_st']  = stEl.value;
                            });
                        }

                        if (typeof markPendingSync==='function') markPendingSync();
                        if (typeof saveToFirebaseDebounced==='function') saveToFirebaseDebounced();
                        modal.remove();
                        render();
                        if (typeof showToast==='function') showToast('KPM entry saved.', 'success', 2500);
                    };

                    return; // ── KPM rendering done, skip the rest ──
                }

                if (state.currentTab === 'env-monthly-report') {
                    html += `
                    <div class="tab-info-bar">
                        <div class="tib-icon"><i class="fas fa-leaf"></i></div>
                        <div class="tib-body">
                            <p class="tib-title">Environmental Monthly Report</p>
                            <p class="tib-sub">Monthly submission required per project — Environmental compliance tracking</p>
                            <p class="tib-sub" style="opacity:0.75;"><i class="fas fa-recycle"></i> Waste &bull; Water &bull; Air &bull; Noise &bull; Hazardous Materials</p>
                        </div>
                        <div class="tib-badges">
                            <span class="tib-pill tib-pill-green">${displayProjects.length} PROJECTS</span>
                            <span class="tib-pill tib-pill-yellow">MONTHLY</span>
                        </div>
                    </div>`;
                }

                const isCshpReg = (state.currentTab === 'cshp' || state.currentTab === 'reg');
                const isAudit   = (state.currentTab === 'audit');

                REGIONS.forEach(reg => {
                    if (reg === 'CORPORATE') return; // CORPORATE not shown in this tab
                    if (reg === 'PLANT OPERATIONS') return; // PLANT OPERATIONS not shown in audit/cshp/reg tabs (monitoring only)
                    const projs = displayProjects.filter(p => p.region === reg);
                    if (projs.length === 0) return;

                    const regPercVals2 = projs.map(p => getPerc(p)).filter(v => v !== null);
                    const regSum  = regPercVals2.reduce((sum, v) => sum + v, 0);
                    const regAvg  = getRegionOverallCompliance(reg);
                    const canEditRegion = UserAccounts.canEdit(state.currentUser?.email, reg) && UserAccounts.canEditTab(state.currentUser?.email, state.currentTab);
                    const isCollapsed = isRegionCollapsed(reg);

                    const isCorporateReg2 = reg === 'CORPORATE';
                    const regIcon2 = isCorporateReg2 ? 'fa-building-columns' : 'fa-location-dot';
                    const regLabel2 = isCorporateReg2 ? 'CORPORATE' : reg;
                    html += window.regionBanner({ id: `region-banner-${reg}`, reg: reg, toggle: 'toggleRegion', collapsed: isCollapsed, editable: canEditRegion, icon: regIcon2, label: regLabel2, right: `<span class="rbadge rbadge-count rb-proj">${projs.length} PROJ</span>
                                <span class="rbadge rbadge-avg" title="Region compliance only: average of project compliance scores in this region"><span class="rb-dot ${rbAvgDotClass(regAvg)}"></span>AVG ${regAvg}%</span>
                                ${state.currentTab === 'overall' && state.isEditing && canEditRegion ? `<button onclick="event.stopPropagation(); openAddProjectModal('${reg}')" class="btn btn-primary" style="font-size:0.68rem;padding:3px 10px;line-height:1.4;">+ ADD</button>` : ''}
                                ${state.currentTab === 'overall' && state.isEditing && !canEditRegion ? `<button disabled style="opacity:0.45;cursor:not-allowed;background:#888;font-size:0.68rem;padding:3px 10px;line-height:1.4;" class="btn btn-primary">LOCKED</button>` : ''}` });
                    
                    html += `<div id="region-content-${reg}" class="region-content ${isCollapsed ? 'collapsed' : ''}">`;

                    if (isCshpReg) {
                        const headerText = (state.currentTab === 'cshp') ? 'DATE APPROVED' : 'DATE REGISTERED';
                        const schemaRow  = SCHEMA[state.currentTab][0];
                        const key        = `${state.currentTab}_${schemaRow}`;

                        html += `<div class="table-container"><table class="got-tbl hl-tbl" style="width:auto;min-width:100%;">
                            <thead><tr>
                                <th class="got-th-left got-th-dark" style="min-width:250px;text-align:left;padding-left:10px;">PROJECT</th>
                                <th>${headerText}</th>
                                <th>PDF DOCUMENT</th>
                            </tr></thead><tbody>`;

                        projs.forEach(p => {
                            const v = p.vals[key] ? (p.vals[key][1] ?? "") : "";
                            const pdfKey = `${key}_pdf`;
                            const pdfData = p.vals[pdfKey] ? p.vals[pdfKey][1] : null;
                            const _pnSafe = p.name.replace(/'/g, "\\\\'");
                            const _pkSafe = pdfKey.replace(/'/g, "\\\\'");

                            let pdfCell = '';
                            if (pdfData) {
                                pdfCell = `
                                    <span class="pdf-file-info">
                                        <button class="pdf-view-btn" onclick="window.open('${pdfData.url}','_blank')" title="View PDF">
                                            <i class="fas fa-file-pdf"></i> View
                                        </button>
                                        ${state.isEditing && canEditRegion ? `
                                            <button class="pdf-delete-btn" onclick="window.triggerPdfUpload('${_pnSafe}','${_pkSafe}',true)" title="Replace PDF">
                                                <i class="fas fa-sync-alt"></i> Replace
                                            </button>
                                            <button class="pdf-delete-btn" onclick="deletePDF('${_pnSafe}','${_pkSafe}')" title="Delete PDF" style="background:#ef5350;">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        ` : ''}
                                    </span>`;
                            } else {
                                if (state.isEditing && canEditRegion) {
                                    pdfCell = `
                                        <div>
                                            <button class="pdf-upload-btn" onclick="window.triggerPdfUpload('${_pnSafe}','${_pkSafe}',false)">
                                                <i class="fas fa-upload"></i> Upload
                                            </button>
                                            <div style="font-size:10px;color:#e65100;margin-top:3px;font-style:italic;">
                                                📄 Stamped file page only<br>(1 page)
                                            </div>
                                        </div>`;
                                } else {
                                    pdfCell = '<span style="color: var(--text-secondary); font-size: 0.75rem;">No PDF</span>';
                                }
                            }
                            
                            const _cshpDateId = `cshp-date-${p.name.replace(/[^a-zA-Z0-9]/g,'_')}`;
                            // Format date value as MM/DD/YYYY for display badge
                            const _vDisplay = v ? (function(d){ var p=d.split('-'); return p.length===3?p[1]+'/'+p[2]+'/'+p[0]:d; })(v) : '';
                            html += `<tr style="${!v ? 'background:#ffcdd2;' : ''}">
                                <td class="got-td-proj" style="text-align:left;background:${v ? '#e8f5e9' : '#ffcdd2'};color:${v ? '#2e7d32' : '#c62828'};position:sticky;left:0;z-index:5;border-right:2px solid #c8e6c9;">
                                    ${p.isRenewable ? '<i class="fas fa-leaf" style="color: #4caf50; margin-right: 5px;" title="Renewable Energy"></i>' : ''}
                                    ${p.name}
                                </td>
                                <td id="cshp-td-${p.name.replace(/[^a-zA-Z0-9]/g,'_')}" style="white-space:nowrap;text-align:center;">
                                    ${(state.isEditing && canEditRegion) ? `
                                    <input type="date" id="${_cshpDateId}"
                                        value="${v}"
                                        data-saved-value="${v}"
                                        onfocus="(function(el){el.dataset.savedValue=el.value;})(this)"
                                        oninput="(function(el){
                                            updateVal('${p.name}','${key}',1,el.value);
                                            var td=el.closest('td'); if(td) td.style.background='';
                                            var tr=el.closest('tr'); if(tr){tr.style.background=el.value?'':'#ffcdd2'; var stickyTd=tr.querySelector('td[style*=\\'sticky\\']'); if(stickyTd) stickyTd.style.background=el.value?'#e8f5e9':'#ffcdd2';}
                                            var clrBtn=document.getElementById('cshp-clr-${p.name.replace(/[^a-zA-Z0-9]/g,'_')}'); if(clrBtn) clrBtn.style.display=el.value?'inline':'none';
                                        })(this)"
                                        onchange="(function(el){
                                            updateVal('${p.name}','${key}',1,el.value);
                                            var td=el.closest('td'); if(td) td.style.background='';
                                            var tr=el.closest('tr'); if(tr){tr.style.background=el.value?'':'#ffcdd2'; var stickyTd=tr.querySelector('td[style*=\\'sticky\\']'); if(stickyTd) stickyTd.style.background=el.value?'#e8f5e9':'#ffcdd2';}
                                            var clrBtn=document.getElementById('cshp-clr-${p.name.replace(/[^a-zA-Z0-9]/g,'_')}'); if(clrBtn) clrBtn.style.display=el.value?'inline':'none';
                                        })(this)"
                                        style="border:1px solid ${v ? '#a5d6a7' : '#ef9a9a'};border-radius:4px;padding:3px 6px;font-family:inherit;font-size:inherit;${v ? 'background:#c8e6c9;' : 'background:#fff5f5;'}">
                                    <button id="cshp-clr-${p.name.replace(/[^a-zA-Z0-9]/g,'_')}" title="Clear date" style="display:${v ? 'inline' : 'none'};margin-left:4px;background:none;border:none;cursor:pointer;color:#ef5350;font-size:0.85rem;padding:2px 4px;vertical-align:middle;" tabindex="-1" onclick="(function(btn){
                                        var inp=document.getElementById('cshp-date-${p.name.replace(/[^a-zA-Z0-9]/g,'_')}');
                                        if(inp){inp.value='';updateVal('${p.name}','${key}',1,'');}
                                        var td=btn.closest('td'); if(td) td.style.background='';
                                        var tr=btn.closest('tr'); if(tr){tr.style.background='#ffcdd2'; var stickyTd=tr.querySelector('td[style*=\\'sticky\\']'); if(stickyTd) stickyTd.style.background='#ffcdd2';}
                                        btn.style.display='none';
                                    })(this)"><i class='fas fa-times-circle'></i></button>
                                    ` : (v ? `<span style="display:inline-block;color:#33691e;font-weight:600;letter-spacing:0.03em;">${_vDisplay}</span>` : `<span style="display:inline-block;color:#c62828;font-weight:600;letter-spacing:0.03em;">mm/dd/yyyy</span>`)}
                                </td>
                                <td style="${!v ? 'background:#ffcdd2;' : ''}">${pdfCell}</td>
                            </tr>`;
                        });

                        html += `</tbody></table></div>`;

                    } else if (isAudit) {
                        // Table style follows DOE Reportorial (got-tbl)
                        const _auEdit = (state.isEditing && canEditRegion);
                        const _auQ = [['Q1','Q1 (JAN-MAR)'],['Q2','Q2 (APR-JUN)'],['Q3','Q3 (JUL-SEP)'],['Q4','Q4 (OCT-DEC)']];
                        const _auSub = 'font-size:0.64rem!important;padding:4px 3px!important;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:help;text-align:center;vertical-align:middle;';
                        html += `<div class="table-container audit-sum-wrap">
                            <table class="got-tbl hl-tbl audit-sum-tbl" style="width:100%;min-width:0;table-layout:fixed;">
                                <colgroup>
                                    <col style="width:17%">
                                    ${_auQ.map(() => '<col><col><col>').join('')}
                                    <col style="width:7%">
                                </colgroup>
                                <thead>
                                    <tr>
                                        <th rowspan="3" class="got-th-left got-th-dark" style="text-align:center;vertical-align:middle;position:sticky;left:0;z-index:6;">PROJECT</th>
                                        ${_auQ.map(x => `<th colspan="3">${x[1]}</th>`).join('')}
                                        <th rowspan="3" style="border-left:3px solid #fbc02d;line-height:1.3;white-space:normal;">GRAND<br>TOTAL<br>AVERAGE</th>
                                    </tr>
                                    <tr>
                                        ${_auQ.map(() => `<th colspan="3">Quarterly Score</th>`).join('')}
                                    </tr>
                                    <tr>
                                        ${_auQ.map(() => `<th style="${_auSub}" title="Implementation">Impl.</th><th style="${_auSub}" title="Documentation &amp; Compliance">Docu. &amp; Comp.</th><th style="${_auSub}" title="Average">Avg.</th>`).join('')}
                                    </tr>
                                </thead>
                                <tbody>`;

                        projs.forEach(p => {
                            let totalYearAvg = 0;
                            html += `<tr style="height:46px;"><td class="got-td-proj" title="${String(p.name||'').replace(/"/g,'&quot;')}" style="text-align:left;background:#e8f5e9;position:sticky;left:0;z-index:5;border-right:2px solid #c8e6c9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                                ${p.isRenewable ? '<i class="fas fa-leaf" style="color:#4caf50;margin-right:5px;" title="Renewable Energy"></i>' : ''}${p.name}
                            </td>`;
                            ['Q1','Q2','Q3','Q4'].forEach(q => {
                                const audit = p.auditData?.[q] || { scoreImpl: 0, docuComp: 0 };
                                const qAvg  = (audit.scoreImpl + audit.docuComp) / 2;
                                totalYearAvg += qAvg;
                                const _auInp = (field, val) => `<td style="text-align:center;padding:4px 5px;"><input type="number" min="0" max="100" value="${val}" ${_auEdit ? '' : 'disabled'}
                                        oninput="updateAuditData('${p.name}','${q}','${field}',this.value)" placeholder="0"
                                        style="${_auEdit ? 'border:1.5px solid #a5d6a7;background:#f1fff1;color:#2e7d32;' : 'border:1.5px solid transparent;background:transparent;color:inherit;font-weight:500;'}border-radius:4px;padding:3px 4px;width:100%;max-width:70px;min-width:0;box-sizing:border-box;font-size:0.75rem;text-align:center;"></td>`;
                                html += _auInp('scoreImpl', audit.scoreImpl) + _auInp('docuComp', audit.docuComp)
                                    + `<td style="color:#1b5e20;font-weight:700;text-align:center;border-right:2px solid #a5d6a7;">${qAvg.toFixed(2)}</td>`;
                            });
                            html += `<td style="color:#7a5c00;font-weight:800;text-align:center;border-left:3px solid #fbc02d;">${(totalYearAvg/4).toFixed(2)}</td></tr>`;
                        });

                        html += `</tbody></table></div>`;

                    } else {
                        const schemaKey = state.currentTab === 'env-monthly-report' ? 'env-monthly-report' : 'kpm';
                        html += `<div class="table-container"><table class="env-tbl">
                            <tr><th class="env-th-left env-th-sticky env-th-dark" style="width:220px;">PROJECT NAME</th>`;
                        MONTHS.forEach(m => html += `<th style="width:100px;min-width:100px;max-width:100px;">${m}</th>`);
                        html += `</tr>`;

                        projs.forEach(p => {
                            SCHEMA[schemaKey].forEach(row => {
                                const key = `${schemaKey}_${row}`;
                                html += `<tr>
                                    <td style="text-align:left;font-weight:600;background:var(--border-color); position: sticky; left: 0; z-index: 5;">
                                        ${p.isRenewable ? '<i class="fas fa-leaf" style="color: #4caf50; margin-right: 5px;" title="Renewable Energy"></i>' : ''}
                                        ${p.name}
                                    </td>`;
                                for (let i = 1; i <= 12; i++) {
                                    const v = p.vals[key] ? (p.vals[key][i] ?? "") : "";
                                    const _isFutureMo = i > (new Date().getMonth() + 1);
                                    const _moDisabled = (!(state.isEditing && canEditRegion) || _isFutureMo) ? 'disabled' : '';
                                    const _moTip = _isFutureMo ? ` title="Input locked — ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i-1]} has not arrived yet"` : '';
                                    html += `<td class="monthly-data" style="${_isFutureMo ? 'background:#f5f5f5;opacity:0.65;' : ''}"><input type="date" value="${v}"
                                        ${_moDisabled}${_moTip}
                                        oninput="updateVal('${p.name}','${key}',${i},this.value)"></td>`;
                                }
                                html += `</tr>`;
                            });
                        });

                        html += `</table></div>`;
                    }
                html += `</div>`; // Close region-content
                });
            }

            if (state.currentTab === 'doe') {
                html = ''; // Start fresh
                
                const renewableProjects = displayProjects.filter(p => p.isRenewable === true);
                
                if (renewableProjects.length === 0) {
                    html += `
                        <div style="background: var(--bg-card); padding: 40px; margin: 20px; border-radius: 12px; text-align: center; border: 2px dashed var(--border-color);">
                            <i class="fas fa-solar-panel" style="font-size: 3rem; color: var(--text-secondary); margin-bottom: 15px;"></i>
                            <h3 style="color: var(--text-primary); margin-bottom: 10px;">No Renewable Energy Projects</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem;">
                                DOE Reportorial only applies to Renewable Energy projects.<br>
                                Mark projects as "Renewable Energy" when adding/editing them to see them here.
                            </p>
                        </div>
                    `;
                } else {
                    html += `<div style="margin: 0 20px 0;">
                        <div style="background:#fff;border:none;box-shadow:0 2px 8px rgba(0,0,0,0.06);border-radius:10px 10px 0 0;padding:10px 16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
                            <div style="font-size:0.7rem;color:#555;">Quarterly submission • Due: 20th of the month after each quarter</div>
                            <div style="display:flex;gap:6px;">
                                <span style="background:#e8f5e9;color:#1b5e20;border:1px solid #a5d6a7;border-radius:20px;padding:3px 11px;font-size:0.62rem;font-weight:800;letter-spacing:0.04em;white-space:nowrap;">${renewableProjects.length} ACTIVE</span>
                                <span style="background:#e8f5e9;color:#1b5e20;border:1px solid #a5d6a7;border-radius:20px;padding:3px 11px;font-size:0.62rem;font-weight:800;letter-spacing:0.04em;white-space:nowrap;">QUARTERLY</span>
                            </div>
                        </div>
                    `;

                    const key = 'doe_DOE Quarterly Report Submission Date';

                    // Stat cards removed — status now shows on each region banner
                    html += '<div style="height:14px;"></div></div>';
                    const _rbDoeNow = new Date();
                    const _rbDoeSelY = state.selectedYear || _rbDoeNow.getFullYear();
                    const _rbDoeM = _rbDoeNow.getMonth(), _rbDoeD = _rbDoeNow.getDate(), _rbDoeY = _rbDoeNow.getFullYear();
                    let _rbDoeDueQ = 0;
                    if (_rbDoeSelY < _rbDoeY) {
                        _rbDoeDueQ = 4;
                    } else if (_rbDoeSelY === _rbDoeY) {
                        if (_rbDoeM > 3  || (_rbDoeM === 3  && _rbDoeD > 20)) _rbDoeDueQ = 1;
                        if (_rbDoeM > 6  || (_rbDoeM === 6  && _rbDoeD > 20)) _rbDoeDueQ = 2;
                        if (_rbDoeM > 9  || (_rbDoeM === 9  && _rbDoeD > 20)) _rbDoeDueQ = 3;
                    }

                    REGIONS.forEach(reg => {
                        const regProjects = renewableProjects.filter(p => p.region === reg);
                        if (regProjects.length === 0) return;
                        
                        const canEditRegion = UserAccounts.canEdit(state.currentUser?.email, reg) && UserAccounts.canEditTab(state.currentUser?.email, state.currentTab);
                        const isCollapsed = isRegionCollapsed(reg);
                        
                        html += window.regionBanner({ id: `region-banner-${reg}`, reg: reg, toggle: 'toggleRegion', collapsed: isCollapsed, editable: canEditRegion, icon: 'fa-location-dot', right: `<span class="rbadge rbadge-count rb-proj">${regProjects.length} PROJ</span>
                                    ${(function(){
                                        var _t = 0, _f = 0;
                                        regProjects.filter(function(p){ return !(p.vals && (p.vals['doe_client_provided'] === '1' || p.vals['doe-permit_client_provided'] === '1')); }).forEach(function(p){
                                            for (var q = 1; q <= _rbDoeDueQ; q++) {
                                                if (isQuarterBlacklistedForProject(p, q, _rbDoeSelY)) continue;
                                                _t++;
                                                if (p.vals[key] && p.vals[key][q]) _f++;
                                            }
                                        });
                                        return window._rbStatusPills(_t, _f, _t - _f, 'overdue');
                                    })()}` });
                        
                        html += `<div id="region-content-${reg}" class="region-content ${isCollapsed ? 'collapsed' : ''}">`;
                        
                        html += `
                        <div class="table-container doe-wrap">
                            <table class="env-tbl doe-clean">
                                <tr>
                                    <th class="env-th-left env-th-sticky env-th-dark" style="width: 280px;">PROJECT NAME</th>
                                    <th>Q1 (JAN-MAR)<small>Due: Apr 20</small></th>
                                    <th>Q2 (APR-JUN)<small>Due: Jul 20</small></th>
                                    <th>Q3 (JUL-SEP)<small>Due: Oct 20</small></th>
                                    <th>Q4 (OCT-DEC)<small>Due: Jan 20</small></th>
                                </tr>
                        `;

                        regProjects.forEach(p => {
                            const _doeClient = !!(p.vals && (p.vals['doe_client_provided'] === '1' || p.vals['doe-permit_client_provided'] === '1'));
                            const _doeStopped = isProjectOnStoppage(p);

                            html += `<tr><td class="doe-nm"><i class="fas fa-leaf"></i>${p.name}${_doeStopped ? ' ' + statusBadge('work-stoppage') : ''}</td>`;

                            if (_doeClient) {
                                // Single merged cell spanning all 4 quarters
                                html += `<td colspan="4" class="doe-x">Care of Client</td>`;
                            } else {
                                const _doeNow2 = new Date();
                                const _doeNowQ = Math.ceil((_doeNow2.getMonth() + 1) / 3);
                                const _doeSelYr = state.selectedYear || _doeNow2.getFullYear();
                                const _doeThisYear = _doeSelYr === _doeNow2.getFullYear();
                                const _doePastYear = _doeSelYr < _doeNow2.getFullYear();
                                const _doeDueDates = { 1: [3,20], 2: [6,20], 3: [9,20], 4: [0,20] }; // [month0based, day]
                                const _doeDueLbl = { 1: 'Apr 20', 2: 'Jul 20', 3: 'Oct 20', 4: 'Jan 20' };

                                // Work out each quarter first, so neighbours with the same reason can be merged into one cell
                                const _doeCells = [];
                                for (let q = 1; q <= 4; q++) {
                                    const _doeFutureQ = _doeThisYear && q > _doeNowQ;
                                    const _doeQBlacklisted = !_doeFutureQ && isQuarterBlacklistedForProject(p, q, _doeSelYr);
                                    if (_doeQBlacklisted) {
                                        _doeCells.push({ x: true, reason: getQuarterExemptReason(p, q, _doeSelYr), tip: getQuarterExemptTip(p, q, _doeSelYr) });
                                    } else {
                                        _doeCells.push({ x: false, q: q, futureQ: _doeFutureQ });
                                    }
                                }

                                for (let ci = 0; ci < 4; ci++) {
                                    const c = _doeCells[ci];
                                    if (c.x) {
                                        let span = 1;
                                        while (ci + span < 4 && _doeCells[ci + span].x && _doeCells[ci + span].reason === c.reason && _doeCells[ci + span].tip === c.tip) span++;
                                        const _doeCellHtml = c.reason === 'not-started' ? '<i class="fas fa-hourglass-start"></i>Not Started' : statusBadge(c.reason === 'finished' ? 'finished' : 'work-stoppage');
                                        html += `<td${span > 1 ? ' colspan="' + span + '"' : ''} class="doe-x" title="${String(c.tip || '').replace(/"/g, '&quot;')}">${_doeCellHtml}</td>`;
                                        ci += span - 1;
                                        continue;
                                    }
                                    const q = c.q;
                                    const val = p.vals[key] ? (p.vals[key][q] ?? '') : '';
                                    const hasPdf = p.doePdfFiles && p.doePdfFiles[`Q${q}`];
                                    const _doeDueArr = _doeDueDates[q];
                                    const _doeDueDate = q === 4
                                        ? new Date(_doeSelYr + 1, _doeDueArr[0], _doeDueArr[1])
                                        : new Date(_doeSelYr, _doeDueArr[0], _doeDueArr[1]);
                                    const _doeIsPastDue = _doePastYear || (_doeThisYear && !c.futureQ && _doeNow2 > _doeDueDate);
                                    const _doeEditable = state.isEditing && canEditRegion && !c.futureQ;

                                    if (_doeEditable) {
                                        html += `<td>
                                    <input type="date" class="doe-in"
                                           value="${val}"
                                           oninput="updateVal('${p.name}','${key}',${q},this.value)">

                                    ${`
                                        <div class="pdf-upload-container">
                                            ${hasPdf ? `
                                                <span class="pdf-file-info">
                                                    <i class="fas fa-file-pdf" style="color: #d32f2f;"></i>
                                                    <span style="font-size: 0.65rem; color: var(--text-secondary);">
                                                        ${p.doePdfFiles[`Q${q}`].fileName.substring(0, 12)}...
                                                    </span>
                                                    <button class="pdf-view-btn"
                                                            onclick="viewDoePdf('${p.name}', ${q})"
                                                            title="View PDF">
                                                        <i class="fas fa-eye"></i>
                                                    </button>
                                                    <button class="pdf-delete-btn"
                                                            onclick="deleteDoePdf('${p.name}', ${q})"
                                                            title="Delete PDF">
                                                        <i class="fas fa-trash"></i>
                                                    </button>
                                                </span>
                                            ` : `
                                                <div>
                                                    <button class="pdf-upload-btn"
                                                            onclick="uploadDoePdf('${p.name}', ${q})"
                                                            title="Upload Certificate PDF">
                                                        <i class="fas fa-upload"></i> Upload
                                                    </button>
                                                    <div style="font-size:10px;color:#e65100;margin-top:3px;font-style:italic;">
                                                        ${window.icon("file")} Stamped file page only<br>(1 page)
                                                    </div>
                                                </div>
                                            `}
                                        </div>
                                    `}
                                </td>`;
                                    } else if (val) {
                                        const _m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(val));
                                        html += `<td><span class="doe-ok"><i class="fas fa-circle-check"></i>${_m ? _m[2] + '/' + _m[3] + '/' + _m[1] : val}</span></td>`;
                                    } else if (_doeIsPastDue) {
                                        html += `<td><span class="doe-late"><i class="fas fa-circle-exclamation"></i>Overdue</span></td>`;
                                    } else {
                                        html += `<td><span class="doe-soon">Due ${_doeDueLbl[q]}</span></td>`;
                                    }
                                }
                            }

                            html += `</tr>`;
                        });

                        html += `
                            </table>
                        </div>
                        `;
                        html += `</div>`; // Close region-content
                    });
                }
            }

            if (state.currentTab === 'doe-permit') {
                html = ''; // Start fresh
                
                const renewableProjects = displayProjects.filter(p => p.isRenewable === true);
                
                if (renewableProjects.length === 0) {
                    html += `
                        <div style="background: var(--bg-card); padding: 40px; margin: 20px; border-radius: 12px; text-align: center; border: 2px dashed var(--border-color);">
                            <i class="fas fa-id-card" style="font-size: 3rem; color: var(--text-secondary); margin-bottom: 15px;"></i>
                            <h3 style="color: var(--text-primary); margin-bottom: 10px;">No Renewable Energy Projects</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem;">
                                DOE Safety Officer Permit only applies to Renewable Energy projects.<br>
                                Mark projects as "Renewable Energy" when adding/editing them to see them here.
                            </p>
                        </div>
                    `;
                } else {
                    html += `<div style="margin: 0 16px;">`;
                    html += `
                        <div style="background:var(--bg-card);box-shadow:0 2px 8px rgba(0,0,0,0.06);border-radius:10px 10px 0 0;padding:10px 16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
                            <div style="display:flex;align-items:center;gap:10px;">
                                
                                <div>
                                    <div style="font-size:0.72rem;font-weight:600;color:var(--text-primary);">Dept. Circular DC2012-11-0009 — RE Safety, Health and Environment Rules</div>
                                </div>
                            </div>
                            <div style="display:flex;gap:6px;">
                                <span style="background:#eef0f2;color:#374151;border:1px solid #d1d5db;border-radius:20px;padding:2px 10px;font-size:0.62rem;font-weight:800;">${renewableProjects.length} PROJECTS</span>
                                <span style="background:#eef0f2;color:#374151;border:1px solid #d1d5db;border-radius:20px;padding:2px 10px;font-size:0.62rem;font-weight:800;">RENEWABLE</span>
                            </div>
                        </div>
                    `;
                    
                    const key = 'doe-permit_DOE Safety Officer Permit';

                    // ── Summary cards ────────────────────────────────────────────────
                    const _dpNow = new Date();
                    const _dpActProjs = renewableProjects.filter(p => !isProjectOnStoppage(p) && p.vals && p.vals['doe-permit_client_provided'] !== '1');
                    const _dpClientProjs = renewableProjects.filter(p => p.vals && p.vals['doe-permit_client_provided'] === '1');
                    let _dpWithPermit = 0, _dpExpired = 0, _dpExpiringSoon = 0, _dpMissing = 0;
                    _dpActProjs.forEach(function(p) {
                        const permitNo = p.vals[key] ? (p.vals[key][1] || '') : '';
                        const validUntil = p.vals[key] ? (p.vals[key][2] || '') : '';
                        if (!permitNo && !validUntil) { _dpMissing++; return; }
                        _dpWithPermit++;
                        if (validUntil) {
                            const expDate = new Date(validUntil);
                            const diffDays = Math.ceil((expDate - _dpNow) / (1000 * 60 * 60 * 24));
                            if (diffDays < 0) _dpExpired++;
                            else if (diffDays <= 90) _dpExpiringSoon++;
                        }
                    });
                    const _dpTotal = _dpActProjs.length;
                    const _dpCompliant = _dpWithPermit - _dpExpired;
                    const _dpPct = _dpTotal > 0 ? Math.round(_dpCompliant / _dpTotal * 100) : 0;
                    const _dpPctC = _dpPct >= 90 ? '#2e7d32' : _dpPct >= 75 ? '#e65100' : '#c62828';
                    const _dpPctBg = _dpPct >= 90 ? '#e8f5e9' : _dpPct >= 75 ? '#fff3e0' : '#ffebee';
                    const _dpPctBd = _dpPct >= 90 ? '#a5d6a7' : _dpPct >= 75 ? '#ffcc80' : '#ef9a9a';

                    (function(){
                        function _mkCard2(bg,border,icon,iconColor,label,value,sub,valueColor){
                            return '<div style="flex:1;min-width:130px;background:'+bg+';padding:12px 16px;display:flex;flex-direction:column;gap:3px;border-right:none;">'
                                +'<div style="font-size:0.6rem;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:0.5px;"><i class="fas '+icon+'" style="color:'+iconColor+';margin-right:5px;"></i>'+label+'</div>'
                                +'<div style="font-size:1.5rem;font-weight:900;color:'+valueColor+';line-height:1;">'+value+'</div>'
                                +'<div style="font-size:0.6rem;color:#888;">'+sub+'</div>'
                                +'</div>';
                        }
                        html += '<div style="display:flex;flex-wrap:wrap;border:none;box-shadow:0 2px 8px rgba(0,0,0,0.06);border-radius:0 0 10px 10px;overflow:hidden;margin-bottom:14px;">'
                            + _mkCard2('#e8f5e9','#a5d6a7','fa-solar-panel','#2e7d32','RE Projects',renewableProjects.length,_dpClientProjs.length+' client-handled, '+_dpActProjs.length+' self-managed','#1b5e20')
                            + _mkCard2(_dpPctBg,_dpPctBd,'fa-chart-pie',_dpPctC,'Permit Compliance',_dpPct+'%',_dpCompliant+' of '+_dpTotal+' with valid permit',_dpPctC)
                            + _mkCard2(_dpExpiringSoon>0?'#fff3e0':'#e8f5e9',_dpExpiringSoon>0?'#ffcc80':'#a5d6a7','fa-clock',_dpExpiringSoon>0?'#e65100':'#2e7d32','Expiring Soon',_dpExpiringSoon,'Within 90 days',_dpExpiringSoon>0?'#e65100':'#2e7d32')
                            + _mkCard2((_dpExpired+_dpMissing)>0?'#ffebee':'#e8f5e9',(_dpExpired+_dpMissing)>0?'#ef9a9a':'#a5d6a7','fa-exclamation-circle',(_dpExpired+_dpMissing)>0?'#c62828':'#2e7d32','Expired / Missing',_dpExpired+_dpMissing,_dpExpired+' expired · '+_dpMissing+' no permit',(_dpExpired+_dpMissing)>0?'#c62828':'#2e7d32')
                            + '</div>';
                    })();

                    REGIONS.forEach(reg => {
                        const regProjects = renewableProjects.filter(p => p.region === reg);
                        if (regProjects.length === 0) return;
                        
                        const canEditRegion = UserAccounts.canEdit(state.currentUser?.email, reg) && UserAccounts.canEditTab(state.currentUser?.email, state.currentTab);
                        const isCollapsed = isRegionCollapsed(reg);
                        
                        html += window.regionBanner({ id: `region-banner-${reg}`, reg: reg, toggle: 'toggleRegion', collapsed: isCollapsed, editable: canEditRegion, icon: 'fa-location-dot', right: `<span class="rbadge rbadge-count rb-proj">${regProjects.length} PROJ</span>` });
                        
                        html += `<div id="region-content-${reg}" class="region-content ${isCollapsed ? 'collapsed' : ''}">`;
                        
                        html += `
                        <div class="table-container">
                            <table class="got-tbl hl-tbl" style="width:auto;min-width:100%;">
                                <tr>
                                    <th class="got-th-left got-th-dark" style="min-width:280px;text-align:left;padding-left:10px;">PROJECT</th>
                                    <th style="white-space:nowrap;">Client-Provided</th>
                                    <th>SAFETY OFFICER PERMIT NUMBER</th>
                                    <th>VALID UNTIL</th>
                                    <th>PDF FILE</th>
                                </tr>
                        `;
                        
                        regProjects.forEach(p => {
                            const _dpClient = !!(p.vals && p.vals['doe-permit_client_provided'] === '1');
                            const _dpPnSafe = p.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                            const permitNumber = p.vals[key] ? (p.vals[key][1] ?? "") : "";
                            const rawValidUntil = p.vals[key] ? (p.vals[key][2] ?? "") : "";

                            const normalizeDate = (s) => {
                                if (!s) return "";
                                if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
                                const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
                                if (m) return `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;
                                return "";
                            };
                            const validUntil = normalizeDate(rawValidUntil);

                            if (validUntil !== rawValidUntil && p.vals[key]) {
                                p.vals[key][2] = validUntil;
                                if (typeof saveToFirebaseDebounced === 'function') saveToFirebaseDebounced();
                            }

                            const hasPdf = p.vals[key] && p.vals[key][3];

                            let pdfCell = '';
                            if (state.isEditing && canEditRegion) {
                                if (hasPdf) {
                                    pdfCell = `
                                        <span class="pdf-file-info">
                                            <button class="pdf-view-btn" onclick="viewDoePermitPdf('${p.name}')" title="View PDF">
                                                <i class="fas fa-file-pdf"></i> View
                                            </button>
                                            <button class="pdf-delete-btn" onclick="deleteDoePermitPdf('${p.name}')" title="Replace PDF">
                                                <i class="fas fa-sync-alt"></i> Replace
                                            </button>
                                        </span>
                                    `;
                                } else {
                                    pdfCell = `
                                        <div>
                                            <button class="pdf-upload-btn" onclick="uploadDoePermitPdf('${p.name}')" title="Upload Permit PDF">
                                                <i class="fas fa-upload"></i> Upload
                                            </button>
                                            <div style="font-size:10px;color:#e65100;margin-top:3px;font-style:italic;">
                                                ${window.icon("file")} Stamped file page only<br>(1 page)
                                            </div>
                                        </div>
                                    `;
                                }
                            } else {
                                if (hasPdf) {
                                    pdfCell = `
                                        <button class="pdf-view-btn" onclick="viewDoePermitPdf('${p.name}')" title="View PDF">
                                            <i class="fas fa-file-pdf"></i> View
                                        </button>
                                    `;
                                } else {
                                    pdfCell = '<span style="color: var(--text-secondary); font-size: 0.75rem;">No PDF</span>';
                                }
                            }

                            const _dpGap = !_dpClient && (!String(permitNumber).trim() || !validUntil);
                            html += `<tr class="dp-row${_dpGap ? ' dp-gap' : ''}">
                                <td class="got-td-proj" style="text-align:left;position:sticky;left:0;z-index:5;border-right:2px solid #c8e6c9;">
                                    <i class="fas fa-leaf" style="color: #4caf50; margin-right: 5px;"></i>
                                    ${p.name}
                                </td>
                                <td style="text-align:center;">
                                    <label style="display:inline-flex;align-items:center;justify-content:center;cursor:${(state.isEditing&&canEditRegion)?'pointer':'default'};">
                                        <input type="checkbox" ${_dpClient?'checked':''} ${(state.isEditing&&canEditRegion)?'':' disabled'}
                                            onchange="(function(chk){var proj=state.projects.find(function(x){return x.name==='${_dpPnSafe}';});if(!proj)return;if(!proj.vals)proj.vals={};proj.vals['doe-permit_client_provided']=chk?'1':'';proj.vals['doe_client_provided']=chk?'1':'';if(typeof markPendingSync==='function')markPendingSync();if(typeof saveToFirebaseDebounced==='function')saveToFirebaseDebounced();render();})(this.checked)"
                                            style="cursor:inherit;">
                                    </label>
                                </td>
                                ${_dpClient ? `
                                <td colspan="3" style="text-align:center;color:var(--text-secondary);font-size:0.78rem;font-style:italic;">Care of Client</td>` : `
                                <td><input type="text" placeholder="e.g., HOEMD-2025-486" value="${permitNumber}" ${(state.isEditing && canEditRegion) ? '' : 'disabled'} oninput="updateVal('${_dpPnSafe}','${key}',1,this.value);window._dpRowFill(this)" style="width: 100%;"></td>
                                <td><input type="date" value="${validUntil}" data-allow-future ${(state.isEditing && canEditRegion) ? '' : 'disabled'} onchange="updateVal('${_dpPnSafe}','${key}',2,this.value);window._dpRowFill(this)" style="width: 100%;"></td>
                                <td style="text-align: center;">${pdfCell}</td>`}
                            </tr>`;
                        });
                        
                        html += `
                            </table>
                        </div>
                        `;
                        html += `</div>`; // Close region-content
                    });
                }
            }

            if (state.currentTab === 'nov-monitoring') {
                html = ''; // Clear previous HTML
                if (typeof window.rptInjectCss === 'function') window.rptInjectCss(); // shared KPM-report look (bar / card / pill)

                const _novMonths = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
                const _novEsc = (v) => String(v == null ? '' : v).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
                const _novHead = (firstLabel) => `<thead><tr>
                    <th class="first">${firstLabel}</th>
                    <th class="h-prev">Previous</th>
                    ${_novMonths.map(m => `<th>${m}</th>`).join('')}
                    <th class="h-open">Open</th><th class="h-pend">Pending</th><th class="h-closed">Closed</th><th class="h-total">Total</th>
                </tr></thead>`;
                const _novRate = (label, pct) => `<div class="nov-kpm-rate">
                    <span class="nov-rate-label"><i class="fas fa-chart-line"></i>${label} completion rate</span>
                    <span class="nov-rate-bar"><i style="width:${Math.max(0, Math.min(100, parseFloat(pct) || 0))}%"></i></span>
                    <b>${pct}%</b>
                </div>`;

                let overallTotals = {
                    prev: 0,
                    months: new Array(12).fill(0),
                    open: 0,
                    pending: 0,
                    closed: 0,
                    total: 0
                };

                REGIONS.forEach(reg => {
                    const projs = displayProjects.filter(p => p.region === reg);
                    if (projs.length === 0) return;

                    projs.forEach(p => {
                        const key = 'nov-monitoring_data';
                        if (!p.vals[key]) p.vals[key] = new Array(17).fill("");

                        overallTotals.prev += parseFloat(p.vals[key][0]) || 0;

                        for (let i = 1; i <= 12; i++) {
                            const val = parseFloat(p.vals[key][i]) || 0;
                            overallTotals.months[i-1] += val;
                            overallTotals.total += val;
                        }

                        overallTotals.open += parseFloat(p.vals[key][13]) || 0;
                        overallTotals.pending += parseFloat(p.vals[key][14]) || 0;
                        overallTotals.closed += parseFloat(p.vals[key][15]) || 0;
                    });
                });

                const overallPercentage = overallTotals.total > 0
                    ? ((overallTotals.closed / overallTotals.total) * 100).toFixed(2)
                    : '0.00';

                // ── Overall summary: same bar + card look as the Corporate KPM report ──
                html += `
                <div class="rpt-wrap nov-kpm-wrap">
                    ${window.rptBar({ title: 'ESH NOV Monitoring', sub: 'Consolidated data from all projects' })}
                    <div class="rpt-card">
                        <div class="rpt-scroll"><table class="nov-monitoring-table nov-kpm">
                            ${_novHead('Type')}
                            <tbody>
                                <tr class="overall-total">
                                    <td class="project-name"><div class="pn">Overall Total</div></td>
                                    <td class="c-prev">${fmtNum(overallTotals.prev)}</td>
                                    ${overallTotals.months.map(v => `<td>${fmtNum(v)}</td>`).join('')}
                                    <td class="c-open">${fmtNum(overallTotals.open)}</td>
                                    <td class="c-pend">${fmtNum(overallTotals.pending)}</td>
                                    <td class="c-closed">${fmtNum(overallTotals.closed)}</td>
                                    <td class="c-total">${fmtNum(overallTotals.total)}</td>
                                </tr>
                            </tbody>
                        </table></div>
                        ${_novRate('Overall', overallPercentage)}
                    </div>
                </div>`;

                REGIONS.forEach(reg => {
                    const projs = displayProjects.filter(p => p.region === reg);
                    if (projs.length === 0) return;

                    const canEditRegion = UserAccounts.canEdit(state.currentUser?.email, reg) && UserAccounts.canEditTab(state.currentUser?.email, state.currentTab);
                    const isCollapsed = isRegionCollapsed(reg);

                    html += window.regionBanner({ id: `region-banner-${reg}`, reg: reg, toggle: 'toggleRegion', collapsed: isCollapsed, editable: canEditRegion, right: `<span class="rbadge rbadge-count rb-proj">${projs.length} PROJ</span>` });

                    html += `<div id="region-content-${reg}" class="region-content nov-mon-rc ${isCollapsed ? 'collapsed' : ''}">`;

                    html += `<div class="table-container">
                        <table class="nov-monitoring-table nov-kpm">
                            ${_novHead('Project Name')}
                            <tbody>`;

                    let regionalTotals = {
                        prev: 0,
                        months: new Array(12).fill(0),
                        open: 0,
                        pending: 0,
                        closed: 0,
                        total: 0
                    };

                    const _novCanEdit = !!(state.isEditing && canEditRegion);
                    const _novCell = (idx, p, key) => `<input type="text" inputmode="decimal" data-num min="0" value="${fmtNum(p.vals[key][idx] || '')}" ${_novCanEdit ? '' : 'disabled'}
                                    oninput="numFmtInput(this, function(v){updateVal('${p.name}','${key}',${idx},v)})">`;

                    projs.forEach(p => {
                        const key = 'nov-monitoring_data';
                        if (!p.vals[key]) p.vals[key] = new Array(17).fill("");

                        html += `<tr>
                            <td class="project-name" title="${_novEsc(p.name)}"><div class="pn">${p.isRenewable ? '<i class="fas fa-leaf" style="color:#4caf50;margin-right:5px;" title="Renewable Energy"></i>' : ''}${p.name}</div></td>
                            <td class="prev-year c-prev">${_novCell(0, p, key)}</td>`;

                        regionalTotals.prev += parseFloat(p.vals[key][0]) || 0;

                        let rowTotal = 0;
                        for (let i = 1; i <= 12; i++) {
                            const val = parseFloat(p.vals[key][i]) || 0;
                            const _novFuture = i > (new Date().getMonth() + 1);
                            const _novDisabled = (!_novCanEdit || _novFuture) ? 'disabled' : '';
                            const _novTip = _novFuture ? ` title="Input locked — ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i-1]} has not arrived yet"` : '';
                            html += `<td class="month-col${_novFuture ? ' future' : ''}">
                                <input type="text" inputmode="decimal" data-num min="0" value="${fmtNum(p.vals[key][i] || '')}" ${_novDisabled}${_novTip}
                                    oninput="numFmtInput(this, function(v){updateVal('${p.name}','${key}',${i},v)})">
                            </td>`;
                            regionalTotals.months[i-1] += val;
                            rowTotal += val;
                        }

                        const openVal = parseFloat(p.vals[key][13]) || 0;
                        const pendingVal = parseFloat(p.vals[key][14]) || 0;
                        const closedVal = parseFloat(p.vals[key][15]) || 0;

                        html += `<td class="summary-col c-open">${_novCell(13, p, key)}</td>
                        <td class="summary-col c-pend">${_novCell(14, p, key)}</td>
                        <td class="summary-col c-closed">${_novCell(15, p, key)}</td>
                        <td class="total-col c-total">${fmtNum(rowTotal)}</td>
                        </tr>`;

                        regionalTotals.open += openVal;
                        regionalTotals.pending += pendingVal;
                        regionalTotals.closed += closedVal;
                        regionalTotals.total += rowTotal;
                    });

                    const regionalPercentage = regionalTotals.total > 0
                        ? ((regionalTotals.closed / regionalTotals.total) * 100).toFixed(2)
                        : '0.00';

                    html += `<tr class="regional-total">
                        <td class="project-name"><div class="pn">Regional Total</div></td>
                        <td>${fmtNum(regionalTotals.prev)}</td>
                        ${regionalTotals.months.map(v => `<td>${fmtNum(v)}</td>`).join('')}
                        <td>${fmtNum(regionalTotals.open)}</td>
                        <td>${fmtNum(regionalTotals.pending)}</td>
                        <td>${fmtNum(regionalTotals.closed)}</td>
                        <td>${fmtNum(regionalTotals.total)}</td>
                    </tr>`;

                    html += `</tbody></table></div>`;
                    html += _novRate(reg, regionalPercentage);
                    html += `</div>`; // Close region-content
                });
            }

            // Keep the existing chart boxes (canvas + live Chart.js instance) across this repaint,
            // so charts update in place instead of being rebuilt and re-animated from zero (flicker).
            const _keepChartBoxes = {};
            ['regionChart', 'statusChart'].forEach(function(_cid) {
                const _cv = document.getElementById(_cid);
                const _bx = _cv && _cv.closest('.chart-box');
                if (_bx && container.contains(_bx) && window.Chart && Chart.getChart(_cv)) _keepChartBoxes[_cid] = _bx;
            });

            container.innerHTML = html;

            Object.keys(_keepChartBoxes).forEach(function(_cid) {
                const _fresh = document.getElementById(_cid);
                const _freshBox = _fresh && _fresh.closest('.chart-box');
                if (_freshBox && _freshBox !== _keepChartBoxes[_cid]) _freshBox.replaceWith(_keepChartBoxes[_cid]);
            });

            
            applyNumFmtToInputs();
            
            if (state.currentTab === 'rates' || state.currentTab === 'medical') {
                setTimeout(() => {
                    populateProjectFilter(state.currentTab);
                    updateTrendChart(state.currentTab);
                }, 100);
            }

            // Restore scroll position after render — prevents view jumping
            if (_renderMc && _renderScroll > 0) {
                requestAnimationFrame(() => { _renderMc.scrollTop = _renderScroll; });
            }
            } catch(renderErr) {
                console.error('❌ render() crashed:', renderErr);
                const _rc = document.getElementById('dashboard-content');
                if (_rc) {
                    _rc.innerHTML = `<div style="padding:40px;text-align:center;color:#c62828;">
                        <i class="fas fa-triangle-exclamation" style="font-size:2rem;margin-bottom:12px;display:block;"></i>
                        <div style="font-weight:700;margin-bottom:8px;">Display Error — ${renderErr.message}</div>
                        <div style="font-size:0.8rem;color:#888;margin-bottom:16px;">Try switching to another tab or refreshing the page.</div>
                        <button onclick="changeTab('overall')" style="padding:8px 20px;background:#2e7d32;color:white;border:none;border-radius:6px;cursor:pointer;font-size:0.8rem;">↩ Go to Dashboard</button>
                    </div>`;
                }
            }
        }

        
document.addEventListener('click', closeAllStatusDropdowns);


        function settingsToggle(headerEl) {
            const body = headerEl.nextElementSibling;
            const chevron = headerEl.querySelector('.settings-card-chevron');
            const isOpen = body.classList.contains('open');
            document.querySelectorAll('.settings-card-body').forEach(b => b.classList.remove('open'));
            document.querySelectorAll('.settings-card-chevron').forEach(c => c.classList.remove('open'));
            if (!isOpen) {
                body.classList.add('open');
                if (chevron) chevron.classList.add('open');
            }
        }

        function togglePwd(fieldId, btn) {
            const input = document.getElementById(fieldId);
            const icon = btn.querySelector('i');
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.replace('fa-eye', 'fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.replace('fa-eye-slash', 'fa-eye');
            }
        }

        document.addEventListener('input', function(e) {
            if (e.target.id === 'new-password') {
                const pwd = e.target.value;
                const strengthDiv = document.getElementById('pwd-strength');
                
                if (!strengthDiv) return;
                
                if (!pwd) {
                    strengthDiv.innerHTML = '';
                    return;
                }

                let strength = 0;
                let feedback = [];
                
                if (pwd.length >= 8) {
                    strength += 25;
                } else {
                    feedback.push('min 8 characters');
                }
                
                if (/[0-9]/.test(pwd)) {
                    strength += 25;
                } else {
                    feedback.push('add numbers');
                }
                
                if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) {
                    strength += 25;
                } else {
                    feedback.push('add special chars (!@#$)');
                }
                
                if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) {
                    strength += 25;
                } else {
                    feedback.push('mix upper & lowercase');
                }

                let color, label;
                if (strength < 50) {
                    color = '#e53935'; label = '❌ Weak';
                } else if (strength < 75) {
                    color = '#ff9800'; label = '⚠️ Moderate';
                } else if (strength < 100) {
                    color = '#fbc02d'; label = '✓ Good';
                } else {
                    color = '#2e7d32'; label = '✅ Strong';
                }

                let html = `<span style="color: ${color}; font-weight: 600;">${label}</span>`;
                if (feedback.length > 0) {
                    html += ` <span style="color: #666; font-size: 11px;">— Need: ${feedback.join(', ')}</span>`;
                }
                
                strengthDiv.innerHTML = html;
            }
        });

        function toggleUsernameEdit() {
            const fields = document.getElementById('username-edit-fields');
            const isVisible = fields.style.display !== 'none';
            fields.style.display = isVisible ? 'none' : 'block';
            if (!isVisible) {
                const current = document.getElementById('current-display-name-text').textContent;
                document.getElementById('new-display-name').value = (current === '—' || current === 'ESH User') ? '' : current;
                document.getElementById('new-display-name').focus();
            }
        }

        async function saveDisplayName() {
            const nameVal = document.getElementById('new-display-name').value.trim();
            const msgEl = document.getElementById('name-msg');
            const btn = document.getElementById('save-name-btn');

            showSettingsMsg('name-msg', '', '');
            if (!nameVal) { showSettingsMsg('name-msg', 'Please enter a display name', 'error'); return; }
            if (nameVal.length < 2) { showSettingsMsg('name-msg', 'Name must be at least 2 characters', 'error'); return; }

            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> SAVING...';
            showSettingsMsg('name-msg', 'Updating display name...', 'loading');

            try {
                if (firebaseReady && window.firebaseDb && state.currentUser) {
                    const userId = getCurrentUserId();
                    const docRef = window.firebase.doc(window.firebaseDb, 'users', userId);
                    await window.firebase.setDoc(docRef, { displayName: nameVal }, { merge: true });
                }
                state.currentUser.displayName = nameVal;
                localStorage.setItem('esh_displayname_' + state.currentUser.email, nameVal);

                document.getElementById('current-display-name-text').textContent = nameVal;
                document.getElementById('settings-display-name').textContent = nameVal;
                const badge = document.getElementById('user-badge');
                if (badge) badge.innerHTML = `<i class="fas fa-user-circle"></i> ${nameVal}`;

                document.getElementById('username-edit-fields').style.display = 'none';
                showSettingsMsg('name-msg', 'Display name updated successfully!', 'success');
            } catch (err) {
                console.error('❌ Name update error:', err);
                showSettingsMsg('name-msg', 'Failed to update: ' + err.message, 'error');
            }

            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save"></i> SAVE NAME';
        }
