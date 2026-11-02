
        function getPerc(proj, includeFinished) {
            window.getPerc = getPerc; // expose globally so Executive Summary sync (syncExecutiveSummary) can use it
            // includeFinished (default false): region/company-wide averages call getPerc(p) as
            // before and still get null for finished projects, so they stay excluded from those
            // pools exactly like today. Pass includeFinished=true only where a SPECIFIC project's
            // own historical score should be shown (its card, its detail modal, its export row) —
            // there it should reflect how well it complied while it was active, not a blank dash.
            // ── OVERALL COMPLIANCE (equal-weight per area, full year) ──────────────
            // 10 areas, each area = 1/N of the final score (N = applicable areas).
            // Areas that do not apply to a project are excluded from the average.
            // Area scores are 0–1; final score = average × 100.
            //
            // Area 1  — Drills & Training          (monthly, 2 fields)
            // Area 2  — KPM                        (monthly, region-wide; N/A → exempt)
            // Area 3  — DOLE (WAIR, RSO, MOM)      (monthly, 3 fields)
            // Area 4  — GOT Monitoring             (monthly, 6 goals)
            // Area 5  — ESH Calendar               (monthly, 3 sub-areas averaged)
            // Area 6  — Emergency Drills           (planned months only; none planned → excluded)
            // Area 7  — Envi Reportorial (EMR)     (monthly)
            // Area 8  — SMR Quarterly              (4 quarters; CoC quarter → exempt)
            // Area 9  — CMR Semi-Annual            (2 periods; CoC period → exempt)
            // Area 10 — DOE Reportorial            (4 quarters; renewable only; client-provided → exempt)

            if (proj.workStoppageDate && !proj.workResumeDate) return null;
            if (proj.dateFinished && !includeFinished) return null;

            const selectedYear = (state && state.selectedYear) || new Date().getFullYear();
            // Per-project score uses the FULL year (Jan–Dec): months not yet due count as not submitted,
            // so 100% is reached only when every report for the year is in.
            const _cutM = 12;
            function isMonthBlacklisted(monthIdx1Based) {
                return isMonthBlacklistedForProject(proj, monthIdx1Based, selectedYear);
            }

            const vals = proj.vals || {};
            const areaScores = [];
            const _KPM_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
            const _calYear   = selectedYear;
            const _calStor   = (typeof getEshStorage === 'function') ? getEshStorage() : {};
            const _ESH_DEF_ROWS  = (typeof ESH_TRAININGS !== 'undefined') ? ESH_TRAININGS : {};
            const _ESH_DRILLS_LIST = (typeof ESH_DRILLS !== 'undefined') ? ESH_DRILLS : [];

            // ── Area 1: Drills & Training — REMOVED (was reading vals['activities_Drills Conducted'] /
            // vals['activities_Training Conducted'], fields that are auto-computed for display and never
            // actually saved into vals, so this area was always counted as ~0% regardless of real data,
            // unfairly dragging every project's score down. Drills/training compliance is already covered
            // accurately by "ESH Calendar" (Area 5) and "Emergency Drills" (Area 6) below.) ──

            // ── Area 2: KPM (monthly, region-wide check; N/A → excluded) ──
            if (!(vals['kpm_na'] === '1')) {
                const _kpmProjRegion = (proj.region || '').toUpperCase();
                let kF = 0, kT = 0;
                _KPM_MONTHS.forEach((mo, idx) => {
                    const _moIdx1 = idx + 1;
                    if (_moIdx1 > _cutM || isMonthBlacklisted(_moIdx1)) return;
                    kT++;
                    // Peers for this specific month: region-wide submission is stored on a single
                    // project, so we must NOT filter peers by their own blacklist status here — a
                    // project being individually frozen doesn't mean the region didn't submit.
                    const _kpmRegionPeers = (state.projects || []).filter(p =>
                        !(p.vals && p.vals['kpm_na'] === '1') &&
                        (p.region || '').toUpperCase() === _kpmProjRegion
                    );
                    const _dateKey = 'kpm_v3_' + mo + '_dateSubmitted';
                    const _submitted = _kpmRegionPeers.some(p => {
                        const v = p.vals && p.vals[_dateKey];
                        return v && v.toString().trim() !== '';
                    });
                    if (_submitted) { const _kst = window.kpmProjectFillStatus(proj, mo); kF += _kst.filled / _kst.total; }
                });
                if (kT > 0) areaScores.push(kF / kT);
            }
            // N/A → area entirely excluded from average

            // ── Area 3: DOLE — WAIR, RSO, MOM (3 fields × 12 months) ──
            let dF = 0, dT = 0;
            ['dole_WAIR', 'dole_RSO', 'dole_MOM'].forEach(key => {
                for (let i = 1; i <= _cutM; i++) {
                    if (isMonthBlacklisted(i)) continue;
                    dT++;
                    const v = vals[key] && vals[key][i];
                    if (v !== undefined && v !== null && v !== '' && v !== '0') dF++;
                }
            });
            if (dT > 0) areaScores.push(dF / dT);

            // ── Area 4: GOT Monitoring (6 goals × 12 months) ──
            if (typeof window.gotGetCell === 'function') {
                let gF = 0, gT = 0;
                ['E1','E2','E3','S1','S2','S3'].forEach(goalId => {
                    for (let i = 1; i <= _cutM; i++) {
                        if (isMonthBlacklisted(i)) continue;
                        gT++;
                        const _gotVal = window.gotGetCell(proj, goalId, 0, i).r;
                        if (_gotVal && _gotVal.toString().trim() !== '') gF++;
                    }
                });
                if (gT > 0) areaScores.push(gF / gT);
            }

            // ── Area 5: ESH Calendar — env, safety, health (3 sub-areas, equally averaged) ──
            // Only counts topics actually PLANNED for that month (GLOBAL_PLAN flag), same as Emergency
            // Drills below — not every topic in ESH_TRAININGS every month.
            const _ESH_CAL_TYPES = ['esh-calendar-env', 'esh-calendar-safety', 'esh-calendar-health'];
            const calSubScores = [];
            _ESH_CAL_TYPES.forEach(tt => {
                const rows = _ESH_DEF_ROWS[tt] || [];
                let cF = 0, cT = 0;
                rows.forEach((_, ti) => {
                    const naRowKey = `${_calYear}|${tt}|${proj.name}|${ti}|na_row`;
                    const naFrom   = _calStor[naRowKey] !== undefined ? parseInt(_calStor[naRowKey]) : -1;
                    for (let mi = 0; mi < _cutM; mi++) {
                        const monthIdx1 = mi + 1;
                        if (isMonthBlacklisted(monthIdx1)) continue;
                        if (naFrom >= 0 && mi >= naFrom) continue; // N/A from this month onward
                        const planKey = `${_calYear}|${tt}|GLOBAL_PLAN|${ti}|${mi}|plan`;
                        if (!_calStor[planKey]) continue; // not planned this month — not required
                        cT++;
                        const actualKey = `${_calYear}|${tt}|${proj.name}|${ti}|${mi}|actual`;
                        if (_calStor[actualKey] && _calStor[actualKey] !== '') cF++;
                    }
                });
                if (cT > 0) calSubScores.push(cF / cT); // nothing required here = exempt (not counted as 100%)
            });
            if (calSubScores.length > 0) {
                areaScores.push(calSubScores.reduce((a, b) => a + b, 0) / calSubScores.length);
            }

            // ── Area 6: Emergency Drills (planned entries only; none planned → excluded) ──
            let drF = 0, drT = 0;
            _ESH_DRILLS_LIST.forEach((drill, di) => {
                const _drillSi = (typeof getDrillStorageIdx === 'function')
                    ? getDrillStorageIdx(drill, di)
                    : (drill.id !== undefined ? drill.id : di);
                for (let mi = 0; mi < _cutM; mi++) {
                    const monthIdx1 = mi + 1;
                    if (isMonthBlacklisted(monthIdx1)) continue;
                    const planKey = `${_calYear}|esh-calendar-drills|GLOBAL_PLAN|${_drillSi}|${mi}|plan`;
                    if (!_calStor[planKey] || _calStor[planKey] === '__DELETED__') continue;
                    const naCellKey = `${_calYear}|esh-calendar-drills|${proj.name}|${_drillSi}|${mi}|na`;
                    if (_calStor[naCellKey]) continue;
                    drT++;
                    const actualKey = `${_calYear}|esh-calendar-drills|${proj.name}|${_drillSi}|${mi}|actual`;
                    if (_calStor[actualKey] && _calStor[actualKey] !== '' && _calStor[actualKey] !== '__DELETED__') drF++;
                }
            });
            if (drT > 0) areaScores.push(drF / drT);
            // No planned drills this year → area not counted

            // ── Area 7: Envi Reportorial — EMR (monthly) ──
            const _emrKey   = 'env-monthly-report_Environmental Monthly Report (EMR)';
            let emrF = 0, emrT = 0;
            for (let i = 1; i <= _cutM; i++) {
                if (isMonthBlacklisted(i)) continue;
                emrT++;
                const v = vals[_emrKey] && vals[_emrKey][i];
                if (v && v.toString().trim() !== '') emrF++;
            }
            if (emrT > 0) areaScores.push(emrF / emrT);

            // ── Area 8: SMR Quarterly (4 quarters; Care-of-Client quarter → exempt) ──
            const _smrKey    = 'emb_SMR (Quarterly) - Submission Date';
            const _smrCocKey = 'emb_SMR (Quarterly) - Care of Client';
            const _smrNaKey  = 'emb_SMR (Quarterly) - N/A';
            let smrF = 0, smrT = 0;
            for (let q = 1; q <= 4; q++) {
                if (q * 3 > _cutM) continue; // quarter not due yet
                if (typeof getDoeStartQuarterForYear === 'function' && q < getDoeStartQuarterForYear(proj, selectedYear)) continue; // quarter before the project existed — not required (same rule as DOE)
                if (isQuarterAfterProjectFinish(proj, q, selectedYear)) continue; // after project finished
                const _coc  = vals[_smrCocKey] && vals[_smrCocKey][q];
                const _isCoC = _coc === true || _coc === 'true' || _coc === '1' || _coc === 1;
                if (_isCoC) continue; // exempt quarter
                const _na   = vals[_smrNaKey] && vals[_smrNaKey][q];
                if (_na === true || _na === 'true' || _na === '1' || _na === 1) continue; // N/A quarter
                smrT++;
                const v = vals[_smrKey] && vals[_smrKey][q];
                if (v && v.toString().trim() !== '') smrF++;
            }
            if (smrT > 0) areaScores.push(smrF / smrT);
            // All quarters CoC → area excluded

            // ── Area 9: CMR Semi-Annual (2 periods; Care-of-Client period → exempt) ──
            const _cmrKey    = 'emb_CMR (Semi-Annual) - Submission Date';
            const _cmrCocKey = 'emb_CMR (Semi-Annual) - Care of Client';
            const _cmrNaKey  = 'emb_CMR (Semi-Annual) - N/A';
            let cmrF = 0, cmrT = 0;
            for (let p2 = 1; p2 <= 2; p2++) {
                if (p2 * 6 > _cutM) continue; // period not due yet
                if (typeof getDoeStartQuarterForYear === 'function' && p2 < Math.ceil(getDoeStartQuarterForYear(proj, selectedYear) / 2)) continue; // half before the project existed — not required
                if (isPeriodAfterProjectFinish(proj, p2, selectedYear)) continue; // after project finished
                const _coc  = vals[_cmrCocKey] && vals[_cmrCocKey][p2];
                const _isCoC = _coc === true || _coc === 'true' || _coc === '1' || _coc === 1;
                if (_isCoC) continue;
                const _na   = vals[_cmrNaKey] && vals[_cmrNaKey][p2];
                if (_na === true || _na === 'true' || _na === '1' || _na === 1) continue; // N/A period
                cmrT++;
                const v = vals[_cmrKey] && vals[_cmrKey][p2];
                if (v && v.toString().trim() !== '') cmrF++;
            }
            if (cmrT > 0) areaScores.push(cmrF / cmrT);

            // ── Area 10: DOE Reportorial (renewable projects only; client-provided → exempt) ──
            if (proj.isRenewable === true) {
                const _doeIsCP = vals['doe_client_provided'] === '1' || vals['doe-permit_client_provided'] === '1';
                if (!_doeIsCP) {
                    const _doeKey = 'doe_DOE Quarterly Report Submission Date';
                    const _doeStartQ = (typeof getDoeStartQuarterForYear === 'function') ? getDoeStartQuarterForYear(proj, selectedYear) : 1;
                    let doeF = 0, doeT = 0;
                    for (let q = 1; q <= 4; q++) {
                        if (q < _doeStartQ) continue; // quarter before project existed — not required
                        if (q * 3 > _cutM) continue; // quarter not due yet
                if (isQuarterAfterProjectFinish(proj, q, selectedYear)) continue; // after project finished
                        doeT++;
                        const v = vals[_doeKey] && vals[_doeKey][q];
                        if (v && v.toString().trim() !== '') doeF++;
                    }
                    if (doeT > 0) areaScores.push(doeF / doeT);
                }
                // client-provided → area excluded
            }
            // Non-renewable project → Area 10 not applicable

            return areaScores.length > 0
                ? Math.round(areaScores.reduce((a, b) => a + b, 0) / areaScores.length * 100)
                : 0;
        }

        // ── COMPLIANCE GAP BREAKDOWN (click the circular rate) ──────────────────────────────────
        // Mirrors getPerc() area by area, but records WHAT is missing and whether it is OVERDUE
        // (month already ended) or NOT YET DUE (current / future month). Does not change any score.
        function getComplianceBreakdown(proj) {
            if (!proj) return null;
            if (proj.workStoppageDate && !proj.workResumeDate) return { stopped: true };
            const selectedYear = (state && state.selectedYear) || new Date().getFullYear();
            const _now = new Date(); const _curY = _now.getFullYear();
            const dueMo = selectedYear < _curY ? 12 : (selectedYear > _curY ? 0 : _now.getMonth()); // months already ended
            const MO = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            const KPM_MO = ['January','February','March','April','May','June','July','August','September','October','November','December'];
            const vals = proj.vals || {};
            const blk = m => isMonthBlacklistedForProject(proj, m, selectedYear);
            const stor = (typeof getEshStorage === 'function') ? getEshStorage() : {};
            const TR = (typeof ESH_TRAININGS !== 'undefined') ? ESH_TRAININGS : {};
            const DR = (typeof ESH_DRILLS !== 'undefined') ? ESH_DRILLS : [];
            const areas = [];
            const newArea = (name) => { const a = { name, T: 0, F: 0, O: 0, U: 0, od: [], up: [], subs: null }; areas.push(a); return a; };
            const unit = (a, filled, what, when, isDue) => {
                a.T++; a.F += filled;
                const miss = 1 - filled;
                if (miss > 0.0001) {
                    if (isDue) { a.O += miss; a.od.push({ what, when }); }
                    else       { a.U += miss; a.up.push({ what, when }); }
                }
            };
            const has = v => v !== undefined && v !== null && v.toString().trim() !== '';
            const notes = [];

            // KPM
            if (vals['kpm_na'] === '1') { notes.push('KPM is marked N/A'); }
            else {
                const a = newArea('KPM');
                const reg = (proj.region || '').toUpperCase();
                const peers = (state.projects || []).filter(p => !(p.vals && p.vals['kpm_na'] === '1') && (p.region || '').toUpperCase() === reg);
                KPM_MO.forEach((mo, idx) => {
                    const m = idx + 1;
                    if (blk(m)) return;
                    const submitted = peers.some(p => has(p.vals && p.vals['kpm_v3_' + mo + '_dateSubmitted']));
                    let frac = 0;
                    if (submitted && window.kpmProjectFillStatus) { const st = window.kpmProjectFillStatus(proj, mo); frac = st.total ? st.filled / st.total : 0; }
                    unit(a, frac, submitted ? 'KPM report (incomplete)' : 'KPM report', MO[idx], m <= dueMo);
                });
            }
            // DOLE
            { const a = newArea('DOLE Reports');
              [['dole_WAIR','WAIR'],['dole_RSO','RSO'],['dole_MOM','MOM']].forEach(([k, lbl]) => {
                for (let m = 1; m <= 12; m++) {
                    if (blk(m)) continue;
                    const v = vals[k] && vals[k][m];
                    unit(a, (v !== undefined && v !== null && v !== '' && v !== '0') ? 1 : 0, lbl, MO[m-1], m <= dueMo);
                }
              });
            }
            // GOT
            if (typeof window.gotGetCell === 'function') {
                const a = newArea('GOT Monitoring');
                ['E1','E2','E3','S1','S2','S3'].forEach(g => {
                    for (let m = 1; m <= 12; m++) {
                        if (blk(m)) continue;
                        const r = window.gotGetCell(proj, g, 0, m).r;
                        unit(a, has(r) ? 1 : 0, 'GOT ' + g, MO[m-1], m <= dueMo);
                    }
                });
            }
            // ESH Calendar (3 sub-areas, equal weight)
            { const a = newArea('ESH Calendar'); a.subs = [];
              [['esh-calendar-env','Environment'],['esh-calendar-safety','Safety'],['esh-calendar-health','Health']].forEach(([tt, tl]) => {
                const sub = { name: tl, T: 0, F: 0, O: 0, U: 0, od: [], up: [] };
                (TR[tt] || []).forEach((title, ti) => {
                    const naFrom = stor[`${selectedYear}|${tt}|${proj.name}|${ti}|na_row`] !== undefined ? parseInt(stor[`${selectedYear}|${tt}|${proj.name}|${ti}|na_row`]) : -1;
                    for (let mi = 0; mi < 12; mi++) {
                        if (blk(mi + 1)) continue;
                        if (naFrom >= 0 && mi >= naFrom) continue;
                        if (!stor[`${selectedYear}|${tt}|GLOBAL_PLAN|${ti}|${mi}|plan`]) continue;
                        const done = has(stor[`${selectedYear}|${tt}|${proj.name}|${ti}|${mi}|actual`]);
                        unit(sub, done ? 1 : 0, title, MO[mi], (mi + 1) <= dueMo);
                    }
                });
                a.subs.push(sub);
              });
              a.subs.forEach(s => { s.od.forEach(x => a.od.push({ what: x.what, when: x.when })); s.up.forEach(x => a.up.push({ what: x.what, when: x.when })); });
            }
            // Emergency Drills
            { const a = newArea('Emergency Drills');
              DR.forEach((drill, di) => {
                const si = (typeof getDrillStorageIdx === 'function') ? getDrillStorageIdx(drill, di) : (drill.id !== undefined ? drill.id : di);
                for (let mi = 0; mi < 12; mi++) {
                    if (blk(mi + 1)) continue;
                    const pl = stor[`${selectedYear}|esh-calendar-drills|GLOBAL_PLAN|${si}|${mi}|plan`];
                    if (!pl || pl === '__DELETED__') continue;
                    if (stor[`${selectedYear}|esh-calendar-drills|${proj.name}|${si}|${mi}|na`]) continue;
                    const act = stor[`${selectedYear}|esh-calendar-drills|${proj.name}|${si}|${mi}|actual`];
                    unit(a, (has(act) && act !== '__DELETED__') ? 1 : 0, drill.name + ' drill', MO[mi], (mi + 1) <= dueMo);
                }
              });
            }
            // EMR
            { const a = newArea('Environmental Monthly Report (EMR)');
              const k = 'env-monthly-report_Environmental Monthly Report (EMR)';
              for (let m = 1; m <= 12; m++) { if (blk(m)) continue; unit(a, has(vals[k] && vals[k][m]) ? 1 : 0, 'EMR', MO[m-1], m <= dueMo); }
            }
            // SMR / CMR
            const flag = v => v === true || v === 'true' || v === '1' || v === 1;
            { const a = newArea('SMR (Quarterly)');
              for (let q = 1; q <= 4; q++) {
                if (q < getDoeStartQuarterForYear(proj, selectedYear)) continue; // quarter before the project existed
                if (typeof isQuarterAfterProjectFinish === 'function' && isQuarterAfterProjectFinish(proj, q, selectedYear)) continue;
                if (flag(vals['emb_SMR (Quarterly) - Care of Client'] && vals['emb_SMR (Quarterly) - Care of Client'][q])) continue;
                if (flag(vals['emb_SMR (Quarterly) - N/A'] && vals['emb_SMR (Quarterly) - N/A'][q])) continue;
                unit(a, has(vals['emb_SMR (Quarterly) - Submission Date'] && vals['emb_SMR (Quarterly) - Submission Date'][q]) ? 1 : 0, 'SMR', 'Q' + q, q * 3 <= dueMo);
              }
            }
            { const a = newArea('CMR (Semi-Annual)');
              for (let h = 1; h <= 2; h++) {
                if (h < Math.ceil(getDoeStartQuarterForYear(proj, selectedYear) / 2)) continue; // half before the project existed
                if (typeof isPeriodAfterProjectFinish === 'function' && isPeriodAfterProjectFinish(proj, h, selectedYear)) continue;
                if (flag(vals['emb_CMR (Semi-Annual) - Care of Client'] && vals['emb_CMR (Semi-Annual) - Care of Client'][h])) continue;
                if (flag(vals['emb_CMR (Semi-Annual) - N/A'] && vals['emb_CMR (Semi-Annual) - N/A'][h])) continue;
                unit(a, has(vals['emb_CMR (Semi-Annual) - Submission Date'] && vals['emb_CMR (Semi-Annual) - Submission Date'][h]) ? 1 : 0, 'CMR', 'H' + h, h * 6 <= dueMo);
              }
            }
            // DOE (renewable projects only)
            if (proj.isRenewable === true) {
                if (vals['doe_client_provided'] === '1' || vals['doe-permit_client_provided'] === '1') { notes.push('DOE report is Client-Provided'); }
                else {
                    const a = newArea('DOE Quarterly Report');
                    const startQ = (typeof getDoeStartQuarterForYear === 'function') ? getDoeStartQuarterForYear(proj, selectedYear) : 1;
                    for (let q = 1; q <= 4; q++) {
                        if (q < startQ) continue;
                        if (typeof isQuarterAfterProjectFinish === 'function' && isQuarterAfterProjectFinish(proj, q, selectedYear)) continue;
                        unit(a, has(vals['doe_DOE Quarterly Report Submission Date'] && vals['doe_DOE Quarterly Report Submission Date'][q]) ? 1 : 0, 'DOE report', 'Q' + q, q * 3 <= dueMo);
                    }
                }
            }

            const subScore = (s, clear) => s.T > 0 ? (s.F + (clear ? s.O : 0)) / s.T : 1;
            const areaScore = (a, clear) => a.subs ? a.subs.reduce((t, s) => t + subScore(s, clear), 0) / a.subs.length : (a.F + (clear ? a.O : 0)) / a.T;
            const active = areas.filter(a => a.subs || a.T > 0);
            const avg = clear => active.length ? Math.round(active.reduce((t, a) => t + areaScore(a, clear), 0) / active.length * 100) : 0;

            // Months not counted
            const before = [], other = [];
            for (let m = 1; m <= 12; m++) {
                if (!blk(m)) continue;
                if (typeof isMonthBeforeProjectStart === 'function' && isMonthBeforeProjectStart(proj, m, selectedYear)) before.push(m); else other.push(m);
            }
            const range = arr => { const out = []; let s = null, p = null; arr.forEach(m => { if (s === null) { s = p = m; } else if (m === p + 1) { p = m; } else { out.push([s, p]); s = p = m; } }); if (s !== null) out.push([s, p]); return out.map(([a, b]) => a === b ? MO[a-1] : MO[a-1] + '–' + MO[b-1]).join(', '); };
            if (before.length) notes.unshift(range(before) + ': project had not started yet');
            if (other.length) notes.push(range(other) + ': project finished or on work stoppage');

            return {
                stopped: false, year: selectedYear,
                now: avg(false), ifCleared: avg(true),
                areas: active.map(a => ({ name: a.name, score: Math.round(areaScore(a, false) * 100), od: a.od, up: a.up,
                    clear: Math.round(areaScore(a, true) * 100), got: a.F + a.O, of: a.T,
                    parts: a.subs ? a.subs.map(s => ({ name: s.name, got: s.F + s.O, of: s.T })) : null })),
                overdueCount: active.reduce((t, a) => t + a.od.length, 0),
                upcomingCount: active.reduce((t, a) => t + a.up.length, 0),
                notes
            };
        }
        window.getComplianceBreakdown = getComplianceBreakdown;

        function openComplianceGap(projName) { osOpenModal(projName, 'gap'); } // reuses the standard project modal
        window.openComplianceGap = openComplianceGap;

        // ── MONTHLY COMPLIANCE: computes compliance rate for a specific month (1-based)
        // Each area has EQUAL weight (1/7 each): Drills+Training, KPM, DOLE, GOT, ESH Calendar, Emergency Drills, EMR
        // Per project: score = average of area scores (0-1 each). Grand score = average across all projects.
        function getMonthlyCompliance(monthIdx1Based) {
            const selectedYear = (state && state.selectedYear) || new Date().getFullYear();
            const projects = (state.projects || []).filter(p =>
                p.region !== 'CORPORATE' && p.region !== 'PLANT OPERATIONS' &&
                !isProjectOnStoppage(p) &&
                !isProjectFinishedForMonth(p, monthIdx1Based, selectedYear) &&
                !isMonthBlacklistedForProject(p, monthIdx1Based, selectedYear)
            );
            if (projects.length === 0) return null;

            const _KPM_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
            const moName = _KPM_MONTHS[monthIdx1Based - 1];
            const _calYear = selectedYear;
            const _calStor = (typeof getEshStorage === 'function') ? getEshStorage() : {};
            const _ESH_DEF_ROWS = (typeof ESH_TRAININGS !== 'undefined') ? ESH_TRAININGS : {};
            const _ESH_DRILLS_LIST = (typeof ESH_DRILLS !== 'undefined') ? ESH_DRILLS : [];
            const mi = monthIdx1Based - 1; // 0-based

            let grandSum = 0;

            projects.forEach(proj => {
                const vals = proj.vals || {};
                const areaScores = [];

                // ── Area 1: Drills & Training — REMOVED (buggy: read vals['activities_Drills Conducted']
                // / vals['activities_Training Conducted'], which are never populated. See getPerc for full
                // explanation. Covered by "ESH Calendar" and "Emergency Drills" below instead.) ──

                // ── Area 2: KPM (1 field — submitted or not) ──
                if (!(vals && vals['kpm_na'] === '1')) {
                    const _kpmProjRegion = (proj.region || '').toUpperCase();
                    // Region-wide submission is stored on a single project — don't filter peers
                    // by their own blacklist status, or a frozen holder-project hides the date
                    // from the whole region.
                    const _kpmRegionPeers = (state.projects || []).filter(p =>
                        !(p.vals && p.vals['kpm_na'] === '1') &&
                        (p.region || '').toUpperCase() === _kpmProjRegion
                    );
                    const _dateKey = 'kpm_v3_' + moName + '_dateSubmitted';
                    const _kpmSubmitted = _kpmRegionPeers.some(p => {
                        const v = p.vals && p.vals[_dateKey];
                        return v && v.toString().trim() !== '';
                    });
                    { const _kst = window.kpmProjectFillStatus(proj, moName); areaScores.push(_kpmSubmitted ? (_kst.filled / _kst.total) : 0); }
                } else {
                    areaScores.push(1); // marked N/A — exempt, count as full
                }

                // ── Area 3: DOLE (3 fields) ──
                let dF = 0;
                ['dole_WAIR','dole_RSO','dole_MOM'].forEach(key => {
                    const v = vals[key] && vals[key][monthIdx1Based];
                    if (v !== undefined && v !== null && v !== '' && v !== '0') dF++;
                });
                areaScores.push(dF / 3);

                // ── Area 4: GOT Monitoring (6 fields) ──
                if (typeof window.gotGetCell === 'function') {
                    let gF = 0;
                    ['E1','E2','E3','S1','S2','S3'].forEach(goalId => {
                        const _gotVal = window.gotGetCell(proj, goalId, 0, monthIdx1Based).r;
                        if (_gotVal && _gotVal.toString().trim() !== '') gF++;
                    });
                    areaScores.push(gF / 6);
                }

                // ── Area 5: ESH Calendar — env, safety, health (3 sub-areas averaged equally) ──
                // Only counts topics actually PLANNED for that month (GLOBAL_PLAN flag).
                const _ESH_CAL_TYPES = ['esh-calendar-env', 'esh-calendar-safety', 'esh-calendar-health'];
                const calSubScores = [];
                _ESH_CAL_TYPES.forEach(tt => {
                    const rows = _ESH_DEF_ROWS[tt] || [];
                    let cF = 0, cT = 0;
                    rows.forEach((_, ti) => {
                        const naRowKey = `${_calYear}|${tt}|${proj.name}|${ti}|na_row`;
                        const naFrom   = _calStor[naRowKey] !== undefined ? parseInt(_calStor[naRowKey]) : -1;
                        if (naFrom >= 0 && mi >= naFrom) return; // N/A
                        const planKey = `${_calYear}|${tt}|GLOBAL_PLAN|${ti}|${mi}|plan`;
                        if (!_calStor[planKey]) return; // not planned this month — not required
                        cT++;
                        const actualKey = `${_calYear}|${tt}|${proj.name}|${ti}|${mi}|actual`;
                        if (_calStor[actualKey] && _calStor[actualKey] !== '') cF++;
                    });
                    if (cT > 0) calSubScores.push(cF / cT); // nothing required here = exempt (not counted as 100%)
                });
                if (calSubScores.length > 0) {
                    areaScores.push(calSubScores.reduce((a, b) => a + b, 0) / calSubScores.length);
                }

                // ── Area 6: Emergency Drills (planned months only) ──
                let drF = 0, drT = 0;
                _ESH_DRILLS_LIST.forEach((drill, di) => {
                    const _drillSi = (typeof getDrillStorageIdx === 'function')
                        ? getDrillStorageIdx(drill, di)
                        : (drill.id !== undefined ? drill.id : di);
                    const planKey   = `${_calYear}|esh-calendar-drills|GLOBAL_PLAN|${_drillSi}|${mi}|plan`;
                    if (!_calStor[planKey] || _calStor[planKey] === '__DELETED__') return;
                    const naCellKey = `${_calYear}|esh-calendar-drills|${proj.name}|${_drillSi}|${mi}|na`;
                    if (_calStor[naCellKey]) return;
                    drT++;
                    const actualKey = `${_calYear}|esh-calendar-drills|${proj.name}|${_drillSi}|${mi}|actual`;
                    if (_calStor[actualKey] && _calStor[actualKey] !== '' && _calStor[actualKey] !== '__DELETED__') drF++;
                });
                if (drT > 0) areaScores.push(drF / drT);
                // No planned drills this month — area not counted (excluded from average)

                // ── Area 7: Envi Reportorial - EMR (1 field) ──
                const _emrKey   = 'env-monthly-report_Environmental Monthly Report (EMR)';
                const _emrVal = vals[_emrKey] && vals[_emrKey][monthIdx1Based];
                areaScores.push((_emrVal && _emrVal.toString().trim() !== '') ? 1 : 0);

                // ── Project score = equal average of all applicable areas ──
                if (areaScores.length > 0) {
                    grandSum += areaScores.reduce((a, b) => a + b, 0) / areaScores.length;
                }
            });

            return Math.round((grandSum / projects.length) * 100);
        }

        window.getMonthlyCompliance = getMonthlyCompliance;

        // ── PER-REGION MONTHLY COMPLIANCE: same equal-weight logic as getMonthlyCompliance but filtered to one region
        function getMonthlyComplianceByRegion(monthIdx1Based, region) {
            const selectedYear = (state && state.selectedYear) || new Date().getFullYear();
            const projects = (state.projects || []).filter(p =>
                p.region === region &&
                !isProjectOnStoppage(p) &&
                !isProjectFinishedForMonth(p, monthIdx1Based, selectedYear) &&
                !isMonthBlacklistedForProject(p, monthIdx1Based, selectedYear)
            );
            if (projects.length === 0) return 0;

            const _KPM_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
            const moName = _KPM_MONTHS[monthIdx1Based - 1];
            const _calYear = selectedYear;
            const _calStor = (typeof getEshStorage === 'function') ? getEshStorage() : {};
            const _ESH_DEF_ROWS = (typeof ESH_TRAININGS !== 'undefined') ? ESH_TRAININGS : {};
            const _ESH_DRILLS_LIST = (typeof ESH_DRILLS !== 'undefined') ? ESH_DRILLS : [];
            const mi = monthIdx1Based - 1;

            let grandSum = 0;

            projects.forEach(proj => {
                const vals = proj.vals || {};
                const areaScores = [];

                // ── Area 1: Drills & Training — REMOVED (buggy: read vals['activities_Drills Conducted']
                // / vals['activities_Training Conducted'], which are never populated. See getPerc for full
                // explanation. Covered by "ESH Calendar" and "Emergency Drills" below instead.) ──

                // ── Area 2: KPM ──
                if (!(vals && vals['kpm_na'] === '1')) {
                    const _kpmProjRegion = (proj.region || '').toUpperCase();
                    // Region-wide submission is stored on a single project — don't filter peers
                    // by their own blacklist status, or a frozen holder-project hides the date
                    // from the whole region.
                    const _kpmRegionPeers = (state.projects || []).filter(p =>
                        !(p.vals && p.vals['kpm_na'] === '1') &&
                        (p.region || '').toUpperCase() === _kpmProjRegion
                    );
                    const _dateKey = 'kpm_v3_' + moName + '_dateSubmitted';
                    const _kpmSubmitted = _kpmRegionPeers.some(p => {
                        const v = p.vals && p.vals[_dateKey];
                        return v && v.toString().trim() !== '';
                    });
                    { const _kst = window.kpmProjectFillStatus(proj, moName); areaScores.push(_kpmSubmitted ? (_kst.filled / _kst.total) : 0); }
                } else {
                    areaScores.push(1);
                }

                // ── Area 3: DOLE (3 fields) ──
                let dF = 0;
                ['dole_WAIR','dole_RSO','dole_MOM'].forEach(key => {
                    const v = vals[key] && vals[key][monthIdx1Based];
                    if (v !== undefined && v !== null && v !== '' && v !== '0') dF++;
                });
                areaScores.push(dF / 3);

                // ── Area 4: GOT Monitoring (6 fields) ──
                if (typeof window.gotGetCell === 'function') {
                    let gF = 0;
                    ['E1','E2','E3','S1','S2','S3'].forEach(goalId => {
                        const _gotVal = window.gotGetCell(proj, goalId, 0, monthIdx1Based).r;
                        if (_gotVal && _gotVal.toString().trim() !== '') gF++;
                    });
                    areaScores.push(gF / 6);
                }

                // ── Area 5: ESH Calendar — env, safety, health (3 sub-areas averaged equally) ──
                // Only counts topics actually PLANNED for that month (GLOBAL_PLAN flag).
                const _ESH_CAL_TYPES = ['esh-calendar-env', 'esh-calendar-safety', 'esh-calendar-health'];
                const calSubScores = [];
                _ESH_CAL_TYPES.forEach(tt => {
                    const rows = _ESH_DEF_ROWS[tt] || [];
                    let cF = 0, cT = 0;
                    rows.forEach((_, ti) => {
                        const naRowKey = `${_calYear}|${tt}|${proj.name}|${ti}|na_row`;
                        const naFrom   = _calStor[naRowKey] !== undefined ? parseInt(_calStor[naRowKey]) : -1;
                        if (naFrom >= 0 && mi >= naFrom) return;
                        const planKey = `${_calYear}|${tt}|GLOBAL_PLAN|${ti}|${mi}|plan`;
                        if (!_calStor[planKey]) return; // not planned this month — not required
                        cT++;
                        const actualKey = `${_calYear}|${tt}|${proj.name}|${ti}|${mi}|actual`;
                        if (_calStor[actualKey] && _calStor[actualKey] !== '') cF++;
                    });
                    if (cT > 0) calSubScores.push(cF / cT); // nothing required here = exempt (not counted as 100%)
                });
                if (calSubScores.length > 0) {
                    areaScores.push(calSubScores.reduce((a, b) => a + b, 0) / calSubScores.length);
                }

                // ── Area 6: Emergency Drills ──
                let drF = 0, drT = 0;
                _ESH_DRILLS_LIST.forEach((drill, di) => {
                    const _drillSi = (typeof getDrillStorageIdx === 'function')
                        ? getDrillStorageIdx(drill, di)
                        : (drill.id !== undefined ? drill.id : di);
                    const planKey   = `${_calYear}|esh-calendar-drills|GLOBAL_PLAN|${_drillSi}|${mi}|plan`;
                    if (!_calStor[planKey] || _calStor[planKey] === '__DELETED__') return;
                    const naCellKey = `${_calYear}|esh-calendar-drills|${proj.name}|${_drillSi}|${mi}|na`;
                    if (_calStor[naCellKey]) return;
                    drT++;
                    const actualKey = `${_calYear}|esh-calendar-drills|${proj.name}|${_drillSi}|${mi}|actual`;
                    if (_calStor[actualKey] && _calStor[actualKey] !== '' && _calStor[actualKey] !== '__DELETED__') drF++;
                });
                if (drT > 0) areaScores.push(drF / drT);

                // ── Area 7: Envi Reportorial - EMR (1 field) ──
                const _emrKey   = 'env-monthly-report_Environmental Monthly Report (EMR)';
                const _emrVal = vals[_emrKey] && vals[_emrKey][monthIdx1Based];
                areaScores.push((_emrVal && _emrVal.toString().trim() !== '') ? 1 : 0);

                if (areaScores.length > 0) {
                    grandSum += areaScores.reduce((a, b) => a + b, 0) / areaScores.length;
                }
            });

            return Math.round((grandSum / projects.length) * 100);
        }
        window.getMonthlyComplianceByRegion = getMonthlyComplianceByRegion;

        // ── OVERALL = MONTHLY-BASED: sum of the monthly compliance (Jan → cutoff month) ÷ 12.
        // Same numbers the monthly chart shows. Months not yet due count as 0 in the sum, so the
        // divisor stays 12. A month where the region had no applicable project (not started yet,
        // finished, frozen) is left out of both the sum and the divisor.
        // Region % is an average of that month's projects, so number of projects per region does not inflate it.
        function getRegionOverallCompliance(region) {
            const selY = (state && state.selectedYear) || new Date().getFullYear();
            const cut = getComplianceCutoffMonth(selY);
            let sum = 0, skipped = 0;
            for (let m = 1; m <= cut; m++) {
                const has = (state.projects || []).some(p =>
                    p.region === region && !isProjectOnStoppage(p) &&
                    !isProjectFinishedForMonth(p, m, selY) && !isMonthBlacklistedForProject(p, m, selY));
                if (!has) { skipped++; continue; }
                sum += getMonthlyComplianceByRegion(m, region);
            }
            const div = 12 - skipped;
            return div > 0 ? Math.round(sum / div) : 0;
        }
        window.getRegionOverallCompliance = getRegionOverallCompliance;

        function getCompanyOverallCompliance() {
            const selY = (state && state.selectedYear) || new Date().getFullYear();
            const cut = getComplianceCutoffMonth(selY);
            let sum = 0, skipped = 0;
            for (let m = 1; m <= cut; m++) {
                const v = getMonthlyCompliance(m);
                if (v === null || v === undefined) { skipped++; continue; }
                sum += v;
            }
            const div = 12 - skipped;
            return div > 0 ? Math.round(sum / div) : 0;
        }
        window.getCompanyOverallCompliance = getCompanyOverallCompliance;

        // ── KPM per-project fill status ─────────────────────────────────────────
        // The region's "Date Submitted" is saved on only ONE project, so it only proves the
        // REGION submitted. Each project must still have its own KPM entries filled for the month.
        // A project counts as submitted only if ALL KPM rows (e1..e12) have a value.
        window.kpmProjectFillStatus = function(proj, moName) {
            const ids = (Array.isArray(window.KPM_ESH_ROWS) && window.KPM_ESH_ROWS.length)
                ? window.KPM_ESH_ROWS.map(r => r.id)
                : ['e1','e2','e3','e4','e5','e6','e7','e8','e9','e10','e11','e12'];
            const v = (proj && proj.vals) || {};
            let filled = 0;
            ids.forEach(id => {
                const x = v['kpm_v3_' + moName + '_' + id];
                if (x !== undefined && x !== null && x.toString().trim() !== '') filled++;
            });
            return { filled, total: ids.length, complete: filled === ids.length, none: filled === 0 };
        };

        // ── COMPLIANCE GAP BREAKDOWN ────────────────────────────────────────────
        // Explains exactly WHY a region isn't at 100%, by listing every missing
        // field/entry per project per area. monthIdx1Based = 0 → OVERALL (full-year,
        function getComplianceGapDetails(region, monthIdx1Based) {
            const selectedYear = (state && state.selectedYear) || new Date().getFullYear();
            const isOverall = !monthIdx1Based;
            const _cutM = getComplianceCutoffMonth(selectedYear); // Overall = only months already due
            const _KPM_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
            const _calYear = selectedYear;
            const _calStor = (typeof getEshStorage === 'function') ? getEshStorage() : {};
            const _ESH_DEF_ROWS = (typeof ESH_TRAININGS !== 'undefined') ? ESH_TRAININGS : {};
            const _ESH_DRILLS_LIST = (typeof ESH_DRILLS !== 'undefined') ? ESH_DRILLS : [];

            function isBlk(p, mo) { return isMonthBlacklistedForProject(p, mo, selectedYear); }

            let projects = (state.projects || []).filter(p => p.region === region);
            if (isOverall) {
                projects = projects.filter(p => !(p.workStoppageDate && !p.workResumeDate) && !p.dateFinished);
            } else {
                projects = projects.filter(p =>
                    !isProjectOnStoppage(p) &&
                    !isProjectFinishedForMonth(p, monthIdx1Based, selectedYear) &&
                    !isBlk(p, monthIdx1Based)
                );
            }

            // gaps: { area, count of missing, items: [{project, detail}] }
            const areaGaps = {}; // areaLabel -> { missing:0, required:0, items:[] }
            function addGap(area, project, detail) {
                if (!areaGaps[area]) areaGaps[area] = { missing: 0, required: 0, items: [] };
                areaGaps[area].missing++;
                areaGaps[area].items.push({ project: project.name, detail });
            }
            function addRequired(area, count) {
                if (!areaGaps[area]) areaGaps[area] = { missing: 0, required: 0, items: [] };
                areaGaps[area].required += count;
            }

            projects.forEach(proj => {
                const vals = proj.vals || {};
                const moList = isOverall
                    ? Array.from({length:12}, (_,i)=>i+1).filter(m => m <= _cutM && !isBlk(proj, m))
                    : [monthIdx1Based];

                // Area 1: Drills & Training — REMOVED. This used to check vals['activities_Drills Conducted']
                // / vals['activities_Training Conducted'], but those fields are auto-computed display-only
                // counts (see Activities tab render logic) and are never actually written into vals, so this
                // area was always 100% "missing" regardless of real data. The real source of truth for
                // drills/training is the ESH Calendar storage, which is already covered specifically below
                // by "ESH Calendar" (Area 5, per-training-topic) and "Emergency Drills" (Area 6, per-drill).

                // Area 2: KPM (region-wide submission)
                if (!(vals['kpm_na'] === '1')) {
                    moList.forEach(mo => {
                        addRequired('KPM Report', 1);
                        // Region-wide submission is stored on a single project — don't filter peers
                        // by their own blacklist status (isBlk), or a frozen holder-project hides the
                        // date from the whole region even though it really was submitted.
                        const _kpmRegionPeers = (state.projects || []).filter(p =>
                            !(p.vals && p.vals['kpm_na'] === '1') &&
                            (p.region || '').toUpperCase() === (proj.region || '').toUpperCase()
                        );
                        const _dateKey = 'kpm_v3_' + _KPM_MONTHS[mo-1] + '_dateSubmitted';
                        const _submitted = _kpmRegionPeers.some(p => { const v = p.vals && p.vals[_dateKey]; return v && v.toString().trim() !== ''; });
                        const _kst = window.kpmProjectFillStatus(proj, _KPM_MONTHS[mo-1]);
                        if (!_kst.complete || !_submitted) {
                            let _kd;
                            if (_kst.none) _kd = `${_KPM_MONTHS[mo-1]} — no KPM entry for this project`;
                            else if (!_kst.complete) _kd = `${_KPM_MONTHS[mo-1]} — KPM partial (${_kst.filled}/${_kst.total} rows filled)`;
                            else _kd = `${_KPM_MONTHS[mo-1]} — no KPM submission date from region`;
                            if (!_submitted && !_kst.complete) _kd += ' · region submission date also missing';
                            addGap('KPM Report', proj, _kd);
                        }
                    });
                }

                // Area 3: DOLE
                ['dole_WAIR','dole_RSO','dole_MOM'].forEach(key => {
                    const lbl = key.split('_')[1];
                    moList.forEach(mo => {
                        addRequired('DOLE Reportorial', 1);
                        const v = vals[key] && vals[key][mo];
                        if (v === undefined || v === null || v === '' || v === '0') {
                            addGap('DOLE Reportorial', proj, `${_KPM_MONTHS[mo-1]} — ${lbl} missing`);
                        }
                    });
                });

                // Area 4: GOT Monitoring
                if (typeof window.gotGetCell === 'function') {
                    ['E1','E2','E3','S1','S2','S3'].forEach(goalId => {
                        moList.forEach(mo => {
                            addRequired('GOT Monitoring', 1);
                            const _gotVal = window.gotGetCell(proj, goalId, 0, mo).r;
                            if (!_gotVal || _gotVal.toString().trim() === '') {
                                addGap('GOT Monitoring', proj, `${_KPM_MONTHS[mo-1]} — Goal ${goalId} not updated`);
                            }
                        });
                    });
                }

                // Area 5: ESH Calendar (env/safety/health) — trainings come from ESH_TRAININGS (plain
                // string topic names per calendar type). Only counts topics actually PLANNED for that
                // month (GLOBAL_PLAN flag, same mechanism as Emergency Drills below) — not every topic
                // in the master list every month.
                const _ESH_CAL_TYPES = [['esh-calendar-env','Environmental'], ['esh-calendar-safety','Safety'], ['esh-calendar-health','Health']];
                _ESH_CAL_TYPES.forEach(([tt, ttLabel]) => {
                    const rows = _ESH_DEF_ROWS[tt] || [];
                    rows.forEach((row, ti) => {
                        const naRowKey = `${_calYear}|${tt}|${proj.name}|${ti}|na_row`;
                        const naFrom = _calStor[naRowKey] !== undefined ? parseInt(_calStor[naRowKey]) : -1;
                        moList.forEach(mo => {
                            const mi = mo - 1;
                            if (naFrom >= 0 && mi >= naFrom) return; // N/A — exempt
                            const planKey = `${_calYear}|${tt}|GLOBAL_PLAN|${ti}|${mi}|plan`;
                            if (!_calStor[planKey]) return; // not planned this month — not required
                            addRequired('ESH Calendar', 1);
                            const actualKey = `${_calYear}|${tt}|${proj.name}|${ti}|${mi}|actual`;
                            if (!_calStor[actualKey] || _calStor[actualKey] === '') {
                                const _rowLabel = (typeof row === 'string') ? row : (row.name || row.label || ('Item ' + (ti+1)));
                                addGap('ESH Calendar', proj, `${_KPM_MONTHS[mo-1]} — ${ttLabel}: "${_rowLabel}" not conducted/logged`);
                            }
                        });
                    });
                });

                // Area 6: Emergency Drills (planned only)
                _ESH_DRILLS_LIST.forEach((drill, di) => {
                    const _drillSi = (typeof getDrillStorageIdx === 'function') ? getDrillStorageIdx(drill, di) : (drill.id !== undefined ? drill.id : di);
                    moList.forEach(mo => {
                        const mi = mo - 1;
                        const planKey = `${_calYear}|esh-calendar-drills|GLOBAL_PLAN|${_drillSi}|${mi}|plan`;
                        if (!_calStor[planKey] || _calStor[planKey] === '__DELETED__') return; // not planned this month
                        const naCellKey = `${_calYear}|esh-calendar-drills|${proj.name}|${_drillSi}|${mi}|na`;
                        if (_calStor[naCellKey]) return;
                        addRequired('Emergency Drills', 1);
                        const actualKey = `${_calYear}|esh-calendar-drills|${proj.name}|${_drillSi}|${mi}|actual`;
                        if (!_calStor[actualKey] || _calStor[actualKey] === '' || _calStor[actualKey] === '__DELETED__') {
                            addGap('Emergency Drills', proj, `${_KPM_MONTHS[mo-1]} — "${drill.name || drill.label || ('Drill ' + (di+1))}" not conducted/logged`);
                        }
                    });
                });

                // Area 7: EMR
                const _emrKey = 'env-monthly-report_Environmental Monthly Report (EMR)';
                moList.forEach(mo => {
                    addRequired('Environmental Monthly Report', 1);
                    const v = vals[_emrKey] && vals[_emrKey][mo];
                    if (!v || v.toString().trim() === '') {
                        addGap('Environmental Monthly Report', proj, `${_KPM_MONTHS[mo-1]} — EMR Date missing`);
                    }
                });

                // Overall-only areas (quarterly/semi-annual — not shown in the monthly view)
                if (isOverall) {
                    // Area 8: SMR Quarterly
                    const _smrKey = 'emb_SMR (Quarterly) - Submission Date';
                    const _smrCocKey = 'emb_SMR (Quarterly) - Care of Client';
                    const _smrNaKey  = 'emb_SMR (Quarterly) - N/A';
                    for (let q = 1; q <= 4; q++) {
                        if (q * 3 > _cutM) continue; // quarter not due yet
                        if (typeof getDoeStartQuarterForYear === 'function' && q < getDoeStartQuarterForYear(proj, selectedYear)) continue; // quarter before the project existed — not required (same rule as DOE)
                        const _coc = vals[_smrCocKey] && vals[_smrCocKey][q];
                        if (_coc === true || _coc === 'true' || _coc === '1' || _coc === 1) continue;
                        const _na = vals[_smrNaKey] && vals[_smrNaKey][q];
                        if (_na === true || _na === 'true' || _na === '1' || _na === 1) continue;
                        addRequired('EMB Reportorial (SMR)', 1);
                        const v = vals[_smrKey] && vals[_smrKey][q];
                        if (!v || v.toString().trim() === '') addGap('EMB Reportorial (SMR)', proj, `Q${q} — SMR Submission Date missing`);
                    }
                    // Area 9: CMR Semi-Annual
                    const _cmrKey = 'emb_CMR (Semi-Annual) - Submission Date';
                    const _cmrCocKey = 'emb_CMR (Semi-Annual) - Care of Client';
                    const _cmrNaKey  = 'emb_CMR (Semi-Annual) - N/A';
                    for (let p2 = 1; p2 <= 2; p2++) {
                        if (p2 * 6 > _cutM) continue; // period not due yet
                        if (typeof getDoeStartQuarterForYear === 'function' && p2 < Math.ceil(getDoeStartQuarterForYear(proj, selectedYear) / 2)) continue; // half before the project existed — not required
                        const _coc = vals[_cmrCocKey] && vals[_cmrCocKey][p2];
                        if (_coc === true || _coc === 'true' || _coc === '1' || _coc === 1) continue;
                        const _na = vals[_cmrNaKey] && vals[_cmrNaKey][p2];
                        if (_na === true || _na === 'true' || _na === '1' || _na === 1) continue;
                        addRequired('EMB Reportorial (CMR)', 1);
                        const v = vals[_cmrKey] && vals[_cmrKey][p2];
                        if (!v || v.toString().trim() === '') addGap('EMB Reportorial (CMR)', proj, `Period ${p2} — CMR Submission Date missing`);
                    }
                    // Area 10: DOE Reportorial (renewable only)
                    if (proj.isRenewable === true) {
                        const _doeIsCP = vals['doe_client_provided'] === '1' || vals['doe-permit_client_provided'] === '1';
                        if (!_doeIsCP) {
                            const _doeKey = 'doe_DOE Quarterly Report Submission Date';
                            const _doeStartQ = (typeof getDoeStartQuarterForYear === 'function') ? getDoeStartQuarterForYear(proj, selectedYear) : 1;
                            for (let q = 1; q <= 4; q++) {
                        if (q * 3 > _cutM) continue; // quarter not due yet
                                if (q < _doeStartQ) continue;
                                addRequired('DOE Reportorial (Renewable)', 1);
                                const v = vals[_doeKey] && vals[_doeKey][q];
                                if (!v || v.toString().trim() === '') addGap('DOE Reportorial (Renewable)', proj, `Q${q} — DOE Submission Date missing`);
                            }
                        }
                    }
                }
            });

            return { region, monthIdx1Based, projectCount: projects.length, areaGaps };
        }
        window.getComplianceGapDetails = getComplianceGapDetails;

        function showComplianceGapModal(region, monthIdx1Based, focusAreaLabel) {
            const data = getComplianceGapDetails(region, monthIdx1Based);
            const monthLabel = monthIdx1Based ? ['January','February','March','April','May','June','July','August','September','October','November','December'][monthIdx1Based-1] : ('Overall (January–' + ['January','February','March','April','May','June','July','August','September','October','November','December'][window.getComplianceCutoffMonth() - 1] + ')');
            const areaKeys = Object.keys(data.areaGaps);
            const totalRequired = areaKeys.reduce((s,k)=>s+data.areaGaps[k].required,0);
            const totalMissing  = areaKeys.reduce((s,k)=>s+data.areaGaps[k].missing,0);
            // Headline score = same number the region bar shows (average of project scores),
            // not the item-count ratio, so the modal and the bar always match.
            let scorePct;
            if (monthIdx1Based) {
                scorePct = getMonthlyComplianceByRegion(monthIdx1Based, region);
            } else {
                scorePct = getRegionOverallCompliance(region);
            }

            let bodyHtml = '';
            if (data.projectCount === 0) {
                bodyHtml = '<div style="text-align:center;padding:30px;color:#888;">No active projects requiring data for this period in ' + region + '.</div>';
            } else if (totalMissing === 0) {
                bodyHtml = '<div style="text-align:center;padding:30px;color:#2e7d32;font-weight:700;"><i class="fas fa-check-circle" style="font-size:2rem;display:block;margin-bottom:10px;"></i>All required fields are complete — ' + region + ' is at 100% for ' + monthLabel + '!</div>';
            } else {
                let _gapAreaIdx = 0;
                areaKeys.forEach(area => {
                    const g = data.areaGaps[area];
                    if (g.missing === 0) return; // fully complete area — skip
                    _gapAreaIdx++;
                    const _areaId = 'gapArea' + _gapAreaIdx;
                    const _areaPct = g.required > 0 ? Math.round(((g.required - g.missing) / g.required) * 100) : 100;
                    // Group items by project for a per-project expandable breakdown
                    const _byProject = {};
                    g.items.forEach(item => {
                        if (!_byProject[item.project]) _byProject[item.project] = [];
                        _byProject[item.project].push(item.detail);
                    });
                    const _projectNames = Object.keys(_byProject);

                    bodyHtml += '<div style="margin-bottom:12px;border:none;box-shadow:0 2px 8px rgba(0,0,0,0.06);border-radius:8px;overflow:hidden;">';
                    // ── Area summary header (always visible, click to expand) ──
                    bodyHtml += '<div data-arealabel="' + area.replace(/"/g,'&quot;') + '" onclick="var b=document.getElementById(\'' + _areaId + '\');var i=document.getElementById(\'' + _areaId + 'Icon\');'
                        + 'if(b.style.display===\'none\'){b.style.display=\'block\';i.style.transform=\'rotate(90deg)\';}'
                        + 'else{b.style.display=\'none\';i.style.transform=\'rotate(0deg)\';}" '
                        + 'style="background:#f6f8f6;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;user-select:none;">';
                    bodyHtml += '<strong style="color:#1b5e20;font-size:0.85rem;"><i id="' + _areaId + 'Icon" class="fas fa-chevron-right" style="font-size:0.68rem;margin-right:6px;transition:transform 0.15s;"></i>' + area + '</strong>';
                    bodyHtml += '<span style="display:flex;align-items:center;gap:8px;">'
                        + '<span style="font-size:0.68rem;color:#6b7770;">' + _areaPct + '% done</span>'
                        + '<span style="background:#fdecea;color:#b3261e;font-size:0.72rem;font-weight:700;padding:2px 8px;border-radius:10px;">' + g.missing + ' / ' + g.required + ' missing</span>'
                        + '</span>';
                    bodyHtml += '</div>';
                    // ── Expandable per-project detail (collapsed by default) ──
                    bodyHtml += '<div id="' + _areaId + '" class="gap-area-body" style="display:none;padding:8px 14px;max-height:220px;overflow-y:auto;background:#fff;">';
                    _projectNames.forEach(pname => {
                        bodyHtml += '<div style="margin-bottom:8px;">';
                        bodyHtml += '<div class="gap-proj" style="font-weight:700;color:#333;font-size:0.78rem;margin-bottom:2px;"><i class="fas fa-building" style="font-size:0.68rem;color:#999;margin-right:4px;"></i>' + pname + ' <span style="color:#b3261e;font-weight:600;">(' + _byProject[pname].length + ')</span></div>';
                        _byProject[pname].forEach(detail => {
                            bodyHtml += '<div class="gap-det" style="padding:3px 0 3px 20px;border-bottom:1px solid #eef1ef;font-size:0.75rem;color:#666;">' + detail + '</div>';
                        });
                        bodyHtml += '</div>';
                    });
                    bodyHtml += '</div></div>';
                });
            }

            const modalHtml = `
                <div id="complianceGapModalOverlay" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;">
                    ${window._mdlHtml({
                        icon:'fa-clipboard-list',
                        title:`Why isn't ${region} at 100%?<span style="display:block;font-weight:400;font-size:0.76rem;color:#6b7770;margin-top:2px;">${monthLabel} · Current score: ${scorePct}% · ${totalRequired-totalMissing} of ${totalRequired} required items complete</span>`,
                        width:640,
                        closeJs:"document.getElementById('complianceGapModalOverlay').remove()",
                        body:`<div id="gapModalBody" style="padding:14px 16px;">${totalMissing > 0 ? `<div style="display:flex;justify-content:flex-end;gap:10px;margin-bottom:10px;"><a onclick="document.getElementById('gapModalBody').querySelectorAll('[id^=gapArea]:not([id$=Icon])').forEach(b=>b.style.display='block');document.getElementById('gapModalBody').querySelectorAll('[id$=Icon]').forEach(i=>i.style.transform='rotate(90deg)');" style="font-size:0.7rem;color:#1b5e20;cursor:pointer;font-weight:600;">Expand all</a><a onclick="document.getElementById('gapModalBody').querySelectorAll('[id^=gapArea]:not([id$=Icon])').forEach(b=>b.style.display='none');document.getElementById('gapModalBody').querySelectorAll('[id$=Icon]').forEach(i=>i.style.transform='rotate(0deg)');" style="font-size:0.7rem;color:#888;cursor:pointer;font-weight:600;">Collapse all</a></div>` : ''}${bodyHtml}</div>`,
                    })}
                </div>`;
            const existing = document.getElementById('complianceGapModalOverlay');
            if (existing) existing.remove();
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            // If opened from a specific area row, auto-expand + scroll straight to it
            if (focusAreaLabel) {
                setTimeout(() => {
                    const _target = document.querySelector('#complianceGapModalOverlay [data-arealabel="' + focusAreaLabel.replace(/"/g,'\\"') + '"]');
                    if (_target) {
                        _target.click();
                        _target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 30);
            }
        }
        window.showComplianceGapModal = showComplianceGapModal;

        function calculateYTD(vals, rowIndex, row) {
            if (!vals) return 0;
            let sum = 0;
            for (let i = 1; i <= 12; i++) {
                if (window.isExposureMonthHidden && window.isExposureMonthHidden(i, row)) continue; // Total Exposures: unfinished months are not counted
                const val = parseFloat(vals[i]) || 0;
                if (val > 0) sum += val;
            }
            return sum;
        }

        function calculateAverage(vals, rowIndex) {
            if (!vals) return 0;
            let sum = 0;
            let count = 0;
            for (let i = 1; i <= 12; i++) {
                if (window.isExposureMonthHidden && window.isExposureMonthHidden(i)) continue; // Total Exposures: unfinished months are not counted
                const val = parseFloat(vals[i]) || 0;
                if (val > 0) {
                    sum += val;
                    count++;
                }
            }
            return count > 0 ? Math.round(sum / count) : 0;
        }

        function renderCharts() {
            const chartProjects = state.projects.filter(p => p.region !== 'CORPORATE' && p.region !== 'PLANT OPERATIONS');
            const chartRegions = REGIONS.filter(r => r !== 'CORPORATE' && r !== 'PLANT OPERATIONS');

            // ── Determine data: overall vs monthly ───────────────────────────────
            const _rcv = state.complianceView || 0; // 0=overall, 1-12=month
            const _RC_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
            const _rcNow = new Date();
            const _rcSelYear = state.selectedYear || _rcNow.getFullYear();
            const _rcCurYear = _rcNow.getFullYear();
            const _rcMaxMonth = (_rcSelYear === _rcCurYear) ? (_rcNow.getMonth() > 0 ? _rcNow.getMonth() : 12) : 12; // previous month only

            let regionAvgs;
            if (_rcv === 0) {
                // Overall: same as before
                regionAvgs = chartRegions.map(r => getRegionOverallCompliance(r)); // monthly-based Overall
            } else {
                // Monthly: use per-region monthly compliance
                regionAvgs = chartRegions.map(r => getMonthlyComplianceByRegion(_rcv, r));
            }

            const statusCounts = { 'on-going': 0, 'work-stoppage': 0, 'finished': 0 };
            chartProjects.forEach(p => statusCounts[p.status] = (statusCounts[p.status] || 0) + 1);

            setTimeout(() => {
                // ── Inject prev/next nav into chart-box header (inside setTimeout so DOM is ready) ──
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

                const regionCtx = document.getElementById('regionChart');
                if (regionCtx) {
                    // --- Smooth animated update: reuse existing chart if still attached to this canvas ---
                    const _attachedChart = Chart.getChart(regionCtx);
                    if (state.charts.region && _attachedChart === state.charts.region) {
                        const _upBgColors = regionAvgs.map(v => v === null || v === undefined ? '#9e9e9e' : v >= 90 ? '#4EAE5E' : v >= 75 ? '#FF9123' : '#DE4531');
                        const _upGradientFn = (context) => {
                            const { chart, dataIndex } = context;
                            if (!chart.chartArea) return _upBgColors[dataIndex];
                            return _barVerticalGradient(chart.ctx, chart.chartArea, _upBgColors[dataIndex]);
                        };
                        state.charts.region.data.datasets[0].data = regionAvgs;
                        state.charts.region.data.datasets[0].backgroundColor = _upGradientFn;
                        state.charts.region.data.datasets[0].hoverBackgroundColor = _upGradientFn;
                        state.charts.region.data.datasets[0].borderWidth = 0;
                        state.charts.region.data.datasets[0].hoverBorderWidth = 0;
                        state.charts.region.update({
                            duration: 600,
                            easing: 'easeInOutQuart'
                        });
                    } else {
                    // Instance is stale or canvas was re-created — destroy and recreate
                    if (state.charts.region) { state.charts.region.destroy(); state.charts.region = null; }
                    const existingChart = Chart.getChart(regionCtx);
                    if (existingChart) existingChart.destroy();

                    // ── Status-only colors: no per-region identity, color = compliance level ──
                    function _compBorderColor(v) {
                        if (v === null || v === undefined) return '#9e9e9e';
                        return v >= 90 ? '#4EAE5E' : v >= 75 ? '#FF9123' : '#DE4531';
                    }
                    const _bgColors = regionAvgs.map(_compBorderColor);
                     // unused but kept to avoid breakage

                    // ── Threshold + value label plugin (animation-aware, no external dependency) ──
                    const _thresholdPlugin = {
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
                                    if (!chart.chartArea) return _bgColors[dataIndex];
                                    return _barVerticalGradient(chart.ctx, chart.chartArea, _bgColors[dataIndex]);
                                },
                                hoverBackgroundColor: (context) => {
                                    const { chart, dataIndex } = context;
                                    if (!chart.chartArea) return _bgColors[dataIndex];
                                    return _barVerticalGradient(chart.ctx, chart.chartArea, _bgColors[dataIndex]);
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
                                    backgroundColor: 'rgba(0,0,0,0.8)',
                                    padding: 12,
                                    cornerRadius: 8,
                                    callbacks: {
                                        title: (items) => chartRegions[items[0].dataIndex],
                                        label: (item) => ` ${item.raw !== null ? item.raw : '—'}% compliance`
                                    }
                                }
                            },
                            scales: {
                                y: { beginAtZero: true, max: 100, grid: { color: function () { return document.body.classList.contains('dark-mode') ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'; } } },
                                x: { grid: { display: false }, ticks: { maxRotation: 0, minRotation: 0, autoSkip: false, font: { size: 12, weight: '600' } } }
                            }
                        },
                        plugins: [_thresholdPlugin]
                    });
                    } // end else (first render)
                }

                const statusCtx = document.getElementById('statusChart');
                if (statusCtx) {
                    // Project Status donut drawn as SVG (vector): edges stay sharp at any zoom or screen density.
                    const _stColors = ['#1976D2', '#d32f2f', '#616161']; // On-Going, Work Stoppage, Finished
                    const _stLabels = [getStatusLabel('on-going'), getStatusLabel('work-stoppage'), getStatusLabel('finished')];
                    const _stData = [statusCounts['on-going'], statusCounts['work-stoppage'], statusCounts['finished']];
                    const _stTotal = _stData.reduce((a, b) => a + b, 0);

                    if (!document.getElementById('status-donut-css')) {
                        const _st = document.createElement('style');
                        _st.id = 'status-donut-css';
                        _st.textContent =
                            '.status-donut{display:flex;flex-direction:column;width:100%;height:100%;}' +
                            '.status-donut svg{flex:1 1 auto;min-height:0;width:100%;display:block;}' +
                            '.status-donut .sd-slice{cursor:pointer;}' +
                            '.status-donut .sd-gap{stroke:var(--hv-panel,var(--bg-card,#fff));stroke-width:6;}' +
                            '.status-donut text{font-family:Inter,sans-serif;text-anchor:middle;dominant-baseline:middle;pointer-events:none;}' +
                            '.status-donut .sd-pct{font-weight:700;font-size:36px;fill:#1b5e20;}' +
                            '.status-donut .sd-lbl{font-size:17px;fill:#666;}' +
                            '.status-donut .sd-sub{font-size:13px;fill:#8a948c;}' +
                            'body.dark-mode .status-donut .sd-pct{fill:#66bb6a;}' +
                            'body.dark-mode .status-donut .sd-lbl{fill:#c4c4c4;}' +
                            'body.dark-mode .status-donut .sd-sub{fill:#9aa8a0;}' +
                            '.status-donut .sd-legend{display:flex;flex-wrap:wrap;justify-content:center;gap:6px 16px;padding:8px 0 0;font-size:12px;color:#666;}' +
                            'body.dark-mode .status-donut .sd-legend{color:#b0b0b0;}' +
                            '.status-donut .sd-leg{display:flex;align-items:center;gap:6px;cursor:pointer;user-select:none;}' +
                            '.status-donut .sd-leg.off{opacity:.4;text-decoration:line-through;}' +
                            '.status-donut .sd-dot{width:9px;height:9px;border-radius:50%;display:inline-block;}';
                        document.head.appendChild(_st);
                    }

                    statusCtx.style.display = 'none';
                    let host = statusCtx.parentNode.querySelector('.status-donut');
                    if (!host) {
                        host = document.createElement('div');
                        host.className = 'status-donut';
                        statusCtx.parentNode.appendChild(host);
                    }
                    const hidden = [false, false, false];
                    const CX = 150, CY = 150, R_OUT = 140, R_IN = 98; // cutout 70%
                    const pt = (r, a) => [CX + r * Math.cos(a), CY + r * Math.sin(a)];
                    const f = n => n.toFixed(3);

                    function slicePath(a0, a1) {
                        if (a1 - a0 >= Math.PI * 2 - 1e-6) {
                            return 'M' + f(CX + R_OUT) + ' ' + f(CY) +
                                'A' + R_OUT + ' ' + R_OUT + ' 0 1 1 ' + f(CX - R_OUT) + ' ' + f(CY) +
                                'A' + R_OUT + ' ' + R_OUT + ' 0 1 1 ' + f(CX + R_OUT) + ' ' + f(CY) + 'Z' +
                                'M' + f(CX + R_IN) + ' ' + f(CY) +
                                'A' + R_IN + ' ' + R_IN + ' 0 1 0 ' + f(CX - R_IN) + ' ' + f(CY) +
                                'A' + R_IN + ' ' + R_IN + ' 0 1 0 ' + f(CX + R_IN) + ' ' + f(CY) + 'Z';
                        }
                        const large = (a1 - a0) > Math.PI ? 1 : 0;
                        const o0 = pt(R_OUT, a0), o1 = pt(R_OUT, a1), i0 = pt(R_IN, a0), i1 = pt(R_IN, a1);
                        return 'M' + f(o0[0]) + ' ' + f(o0[1]) +
                            'A' + R_OUT + ' ' + R_OUT + ' 0 ' + large + ' 1 ' + f(o1[0]) + ' ' + f(o1[1]) +
                            'L' + f(i1[0]) + ' ' + f(i1[1]) +
                            'A' + R_IN + ' ' + R_IN + ' 0 ' + large + ' 0 ' + f(i0[0]) + ' ' + f(i0[1]) + 'Z';
                    }

                    function draw(hov) {
                        const vis = _stData.map((v, i) => hidden[i] ? 0 : v);
                        const visTotal = vis.reduce((a, b) => a + b, 0);
                        let svg = '<svg viewBox="0 0 300 300" preserveAspectRatio="xMidYMid meet" shape-rendering="geometricPrecision">';
                        let ang = -Math.PI / 2, gaps = '';
                        const nonZero = vis.filter(v => v > 0).length;
                        vis.forEach((v, i) => {
                            if (v <= 0) return;
                            const sweep = visTotal > 0 ? (v / visTotal) * Math.PI * 2 : 0;
                            svg += '<path class="sd-slice" data-i="' + i + '" fill="' + _stColors[i] + '" fill-rule="evenodd" d="' + slicePath(ang, ang + sweep) + '"/>';
                            if (nonZero > 1) {
                                const p0 = pt(R_OUT + 2, ang), q0 = pt(R_IN - 2, ang);
                                gaps += '<line class="sd-gap" x1="' + f(p0[0]) + '" y1="' + f(p0[1]) + '" x2="' + f(q0[0]) + '" y2="' + f(q0[1]) + '"/>';
                            }
                            ang += sweep;
                        });
                        svg += gaps;
                        let pctText, lblText, subText = '', pctStyle = '';
                        if (hov >= 0) {
                            pctText = (_stTotal > 0 ? (_stData[hov] / _stTotal * 100).toFixed(1) : 0) + '%';
                            lblText = _stLabels[hov] + ' \u00b7 ' + _stData[hov];
                            pctStyle = ' style="fill:' + _stColors[hov] + '"';
                        } else {
                            pctText = (_stTotal > 0 ? Math.round(_stData[0] / _stTotal * 100) : 0) + '%';
                            lblText = getStatusLabel('on-going');
                            subText = _stData[0] + ' of ' + _stTotal + ' projects';
                        }
                        svg += '<text class="sd-pct"' + pctStyle + ' x="150" y="127">' + pctText + '</text>' +
                               '<text class="sd-lbl" x="150" y="157">' + lblText + '</text>' +
                               (subText ? '<text class="sd-sub" x="150" y="184">' + subText + '</text>' : '') +
                               '</svg>';
                        let leg = '<div class="sd-legend">';
                        _stLabels.forEach((l, i) => {
                            leg += '<span class="sd-leg' + (hidden[i] ? ' off' : '') + '" data-i="' + i + '"><span class="sd-dot" style="background:' + _stColors[i] + '"></span>' + l + ' \u00b7 ' + _stData[i] + '</span>';
                        });
                        leg += '</div>';
                        host.innerHTML = svg + leg;
                        host.querySelectorAll('.sd-slice').forEach(el => {
                            el.addEventListener('mouseenter', () => draw(+el.getAttribute('data-i')));
                        });
                        const sv = host.querySelector('svg');
                        if (sv) sv.addEventListener('mouseleave', () => draw(-1));
                        host.querySelectorAll('.sd-leg').forEach(el => {
                            el.addEventListener('click', () => {
                                const i = +el.getAttribute('data-i');
                                hidden[i] = !hidden[i];
                                draw(-1);
                            });
                        });
                    }
                    draw(-1);
                    state.charts.status = null;
                }
            }, 100);
        }


        function _v(proj, key, idx) {
            if (key === 'activities_No. of Identified Near-Miss') key = 'medical_No. of Identified Near-Miss';
            const arr = proj && proj.vals && proj.vals[key];
            if (!Array.isArray(arr)) return '';
            const v = arr[idx];
            return (v === null || v === undefined) ? '' : String(v);
        }
        function _ytd(proj, key) {
            let s = 0, any = false;
            for (let m = 1; m <= 12; m++) {
                const n = parseFloat(_v(proj, key, m));
                if (!isNaN(n)) { s += n; any = true; }
            }
            return any ? s : '';
        }
        function _auditVal(proj, qtr, field) {
            const v = proj && proj.auditData && proj.auditData[qtr] && proj.auditData[qtr][field];
            return (v !== undefined && v !== null && v !== 0) ? v : '';
        }
        function _s(v) {
            return String(v ?? '')
                .replace(/[\x00-\x1F\x7F]/g, ' ')   // control chars
                .replace(/[\u00A0\u00AD\u200B\u200C\u200D\u200E\u200F\u202F\u205F\u2060\uFEFF]/g, ' ') // NBSP, soft-hyphen, zero-width, BOM
                .replace(/\u00A0/g, ' ')               // extra pass for NBSP
                .replace(/ {2,}/g, ' ')                // collapse multiple spaces
                .trim();
        }
        function showUI() {
            const loginOverlay = document.getElementById('login-overlay');
            if (loginOverlay) loginOverlay.style.display = 'none';
            const _mainSidebar = document.getElementById('main-sidebar');
            if (_mainSidebar) {
                _mainSidebar.classList.remove('hidden');
                _mainSidebar.classList.remove('sidebar-collapsed'); // always start expanded on login
            }
            const _hamburgerBtn = document.getElementById('hamburger-btn');
            if (_hamburgerBtn) {
                const _icon = _hamburgerBtn.querySelector('i');
                if (_icon) _icon.className = 'fas fa-times'; // matches expanded state
            }
            document.getElementById('main-content').classList.remove('hidden');
            const _fBtn = document.getElementById('floating-edit-btn');
            const _canEditRole = (state.userRole === 'pco' || state.userRole === 'envi_head'
                                  || state.userRole === 'admin' || state.userRole === 'superintendent');
            if (_fBtn) _fBtn.style.display = _canEditRole ? 'flex' : 'none';

            const isPCO = state.userRole === 'pco';
            const isManager = state.userRole === 'manager';

            const personnelNavItem = document.querySelector('.nav-item[data-tab="personnel"]');
            if (personnelNavItem) personnelNavItem.style.display = isPCO ? 'none' : '';

            const oshNavItem = document.querySelector('.nav-item[data-tab="osh-requirement"]');
            if (oshNavItem) oshNavItem.style.display = isPCO ? 'none' : '';

            // ── CORPORATE KPM nav item: visible to wda admin + designated viewers ──
            const _CORP_KPM_ALLOWED = [
                'esh@wda.com.ph',      // WDA Admin — full edit
                'esh@scic.com.ph',     // ESH Admin — view only
                'esh@tgm.com.ph',      // TGM Manager — view only
                'esh@mab.com.ph',      // MAB Manager — view only
                'esh@lmp.com.ph',      // LMP Manager — view only
                'esh@corpdc.com.ph',   // Corporate Doc Controller — view only
                'esh@cbmganda.com.ph', // Environmental Head — view only
            ];
            const _corpKpmNav = document.querySelector('.nav-item[data-tab="corporate-kpm"]');
            if (_corpKpmNav) {
                const _canSeeCorporateKpm = _CORP_KPM_ALLOWED.includes(state.currentUser?.email);
                _corpKpmNav.style.display = _canSeeCorporateKpm ? '' : 'none';
            }

            // PCO (not Envi Head): hide every sidebar tab outside UserAccounts.PCO_NAV_TABS, and any group left empty.
            // Items hidden here are marked so the next login (any role) restores them.
            document.querySelectorAll('[data-role-hidden]').forEach(el => { el.style.display = ''; el.removeAttribute('data-role-hidden'); });
            if (isPCO) {
                document.querySelectorAll('.nav-item[data-tab]').forEach(el => {
                    if (el.style.display !== 'none' && !UserAccounts.PCO_NAV_TABS.includes(el.dataset.tab)) {
                        el.style.display = 'none'; el.setAttribute('data-role-hidden', '1');
                    }
                });
                document.querySelectorAll('.nav-group').forEach(g => {
                    const items = [...g.querySelectorAll('.nav-item')];
                    if (items.length && items.every(i => i.style.display === 'none')) { g.style.display = 'none'; g.setAttribute('data-role-hidden', '1'); }
                });
            }

            const pcoNonEnvTabs = ['rates','exposures','activities','kpm','dole','doe','doe-permit',
                                   'medical','nov','nov-monitoring','cshp','reg']; // 'audit' excluded — uses #audit-nav-lock instead
            pcoNonEnvTabs.forEach(tab => {
                const el = document.querySelector(`.nav-item[data-tab="${tab}"]`);
                if (!el) return;
                // PCO: no grey/italic/padlock styling — access is already enforced by RBAC
                el.style.opacity = '';
                el.style.fontStyle = '';
                const lockIcon = el.querySelector('.pco-lock-icon');
                if (lockIcon) lockIcon.remove();
            });

            const auditEl = document.querySelector('.nav-item[data-tab="audit"]');
            if (auditEl) {
                auditEl.style.opacity = '';
                auditEl.style.fontStyle = '';
            }

            if (isManager) {
                const personnelNavItemMgr = document.querySelector('.nav-item[data-tab="personnel"]');
                if (personnelNavItemMgr) personnelNavItemMgr.style.display = '';
                document.querySelectorAll('.nav-item').forEach(navEl => {
                    if (!navEl.querySelector('.mgr-eye-icon')) {
                        const icon = document.createElement('i');
                        icon.className = 'fas fa-eye mgr-eye-icon';
                        icon.style.cssText = 'font-size:0.55rem;margin-left:5px;color:#78909c;vertical-align:middle;opacity:0.7;';
                        icon.title = 'View Only';
                        navEl.appendChild(icon);
                    }
                });
            }

            // Doc Controller — show view-only eye on all nav items
            const _isViewOnlyRole = (state.userRole === 'doc_controller');
            if (_isViewOnlyRole) {
                document.querySelectorAll('.nav-item').forEach(navEl => {
                    if (!navEl.querySelector('.ro-eye-icon')) {
                        const icon = document.createElement('i');
                        icon.className = 'fas fa-eye ro-eye-icon';
                        icon.style.cssText = 'font-size:0.55rem;margin-left:5px;color:#78909c;vertical-align:middle;opacity:0.7;';
                        icon.title = 'View Only — Document Controller has read-only access';
                        navEl.appendChild(icon);
                    }
                });
            }

            // Corp Nurse — show lock icon on non-health tabs
            if (state.userRole === 'corp_nurse') {
                document.querySelectorAll('.nav-item').forEach(navEl => {
                    if (!navEl.querySelector('.ro-eye-icon')) {
                        const icon = document.createElement('i');
                        icon.className = 'fas fa-eye ro-eye-icon';
                        icon.style.cssText = 'font-size:0.55rem;margin-left:5px;color:#78909c;vertical-align:middle;opacity:0.7;';
                        icon.title = 'View Only — Corporate Nurse has read-only access';
                        navEl.appendChild(icon);
                    }
                });
            }

            const _validTabs = NAV_ITEMS.filter(i => i.tab !== 'settings').map(i => i.tab);
            const _storedTab = localStorage.getItem('esh_last_tab') || 'overall';
            let lastTab = _validTabs.includes(_storedTab) ? _storedTab : 'overall';
            if (state.userRole === 'pco' && !UserAccounts.PCO_NAV_TABS.includes(lastTab)) {
                lastTab = 'overall';
            }
            if (state.userRole === 'pco' && (lastTab === 'personnel' || lastTab === 'osh-requirement')) {
                lastTab = 'overall';
            }
            try { changeTab(lastTab); } catch(e) {
                console.error('❌ changeTab on load failed, falling back to overall:', e);
                try { changeTab('overall'); } catch(e2) { console.error('❌ Fallback also failed:', e2); }
            }
            // Restore scroll position after tab is rendered
            const _storedScrollKey = 'esh_last_scroll_' + lastTab;
            const _storedScroll = parseInt(localStorage.getItem(_storedScrollKey) || '0', 10);
            if (_storedScroll > 0) {
                setTimeout(() => {
                    const _mc = document.getElementById('main-content');
                    if (_mc) _mc.scrollTop = _storedScroll;
                }, 200);
            }
        }

        function showToast(message, type = 'success', duration = 3500) {
            const container = document.getElementById('toast-container');
            if (!container) return;
            
            const meta = {
                success: { icon: '<i class="fas fa-check"></i>',   title: 'Success' },
                error:   { icon: '<i class="fas fa-times"></i>',   title: 'Error'   },
                warning: { icon: '<i class="fas fa-exclamation"></i>', title: 'Warning' },
                info:    { icon: '<i class="fas fa-info"></i>',    title: 'Info'    },
            };
            const m = meta[type] || meta.info;

            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.innerHTML = `
                <span class="toast-icon">${m.icon}</span>
                <span class="toast-message">${message}</span>
            `;
            toast.title = 'Click to dismiss';
            
            container.appendChild(toast);
            
            const toasts = container.querySelectorAll('.toast');
            if (toasts.length > 4) toasts[0].remove();

            const timer = setTimeout(() => {
                toast.classList.add('hiding');
                setTimeout(() => toast.remove(), 320);
            }, duration);

            toast.addEventListener('click', () => { clearTimeout(timer); toast.remove(); });
        }

        let _syncPillTimer = null;
        let _pendingSync = false;

        function showSyncPill(state_str, label) {
            let pill = document.getElementById('sync-status-pill');
            if (!pill) {
                pill = document.createElement('div');
                pill.id = 'sync-status-pill';
                pill.innerHTML = `<div class="pill-dot"></div><span class="pill-label"></span>`;
                document.body.appendChild(pill);
            }
            pill.className = `sync-status-pill`;
            pill.id = 'sync-status-pill';
            pill.classList.add(`pill-${state_str}`, 'visible');
            pill.querySelector('.pill-label').textContent = label;
            clearTimeout(_syncPillTimer);
        }

        function hideSyncPill(delay = 2500) {
            clearTimeout(_syncPillTimer);
            _syncPillTimer = setTimeout(() => {
                const pill = document.getElementById('sync-status-pill');
                if (pill) pill.classList.remove('visible');
            }, delay);
        }

        function markPendingSync() {
            _pendingSync = true;
            showSyncPill('pending', 'Unsaved changes — not yet synced to cloud');
        }

        function markSyncComplete() {
            _pendingSync = false;
            showSyncPill('synced', 'Synced to cloud');
            hideSyncPill(2500);
        }

        function markSyncFailed() {
            _pendingSync = true;
            showSyncPill('pending', 'Saved locally — waiting to sync');
        }

        window.showSyncPill    = showSyncPill;
        window.hideSyncPill    = hideSyncPill;
        window.markPendingSync = markPendingSync;
        window.markSyncComplete= markSyncComplete;
        window.markSyncFailed  = markSyncFailed;
        window.showToast       = showToast;

        // ── Auto-save debounce via RowSaveManager ──────────────────────────
        // When markPendingSync fires, schedule a saveAllDirty after 1.5s of
        // inactivity. This gives users a brief window to finish typing before
        // the row silently saves — no button click needed unless they want
        // to force-save immediately via the per-row Save button.
        let _rsmAutoSaveTimer = null;
        const _origMarkPending = markPendingSync;
        window.markPendingSync = function() {
            _origMarkPending();
            if (window._appInitializing) return;
            clearTimeout(_rsmAutoSaveTimer);
            _rsmAutoSaveTimer = setTimeout(() => {
                if (window.RowSaveManager?.hasDirty()) {
                    window.RowSaveManager.saveAllDirty().catch(() => {});
                }
            }, 800);
        };
        // ──────────────────────────────────────────────────────────────────

        window.addEventListener('beforeunload', (e) => {
            // ── BEFOREUNLOAD SAVE GUARD ────────────────────────────────────
            // If there are unsaved dirty rows, attempt a synchronous save
            // and show a browser confirmation dialog to warn the user.
            // Modern browsers ignore custom messages but will still show
            // a generic "Leave site?" dialog when returnValue is set.
            if (window.RowSaveManager?.hasDirty()) {
                // Trigger save (best-effort, may not complete if tab closes fast)
                window.RowSaveManager.saveAllDirty().catch(() => {});
                // Show browser's native "unsaved changes" dialog
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
                return e.returnValue;
            }
        });
        
        function showLockedMessage(reason) {
            const userEmail = state.currentUser?.email;
            const info = UserAccounts.getUserInfo(userEmail);
            let msg = reason || 'Read-Only Access — You do not have permission to modify this record.';
            if (!reason) {
                if (info.role === 'superintendent') {
                    msg = `Read-Only Access — Superintendents can only edit records in their assigned region (${info.region}).`;
                } else if (info.role === 'pco') {
                    msg = 'Read-Only Access — PCO accounts can only edit Environmental modules within their region.';
                } else if (info.role === 'guest') {
                    msg = 'Not authenticated. Please log in.';
                }
            }
            showToast(msg, 'warning', 5000);
        }

        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (state.isEditing) {
                    saveData();
                    showToast('Saving data...', 'info', 1500);
                }
            }
            
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault();
                if (!state.isEditing) {
                    toggleEdit();
                    showToast('Edit mode enabled', 'info', 1500);
                }
            }
            
            if (e.key === 'Escape') {
                const modals = document.querySelectorAll('.modal.show');
                if (modals.length > 0) {
                    showToast('Please use Cancel or Save button to close', 'info', 2000);
                    return;
                }
                
                if (state.isEditing) {
                    requestCancelEdit(); // discards in place — no page reload
                }
            }
        });

        const _EXP_KEY = 'esh_expanded_regions';
        const expandedRegions = new Set(JSON.parse(localStorage.getItem(_EXP_KEY) || '[]'));

        function toggleRegion(regionName, event) {
            if (event && (event.target.tagName === 'BUTTON' || event.target.tagName === 'SELECT' ||
                         event.target.closest('button') || event.target.closest('select'))) {
                return;
            }

            const regionContent = document.getElementById(`region-content-${regionName}`);
            const regionBanner  = document.getElementById(`region-banner-${regionName}`);
            if (!regionContent || !regionBanner) return;

            if (expandedRegions.has(regionName)) {
                expandedRegions.delete(regionName);
                _animateRegion(regionContent, true);
                regionBanner.classList.add('collapsed');
            } else {
                expandedRegions.add(regionName);
                _animateRegion(regionContent, false);
                regionBanner.classList.remove('collapsed');
            }

            localStorage.setItem(_EXP_KEY, JSON.stringify([...expandedRegions]));
        }

        function _animateRegion(el, collapse) {
            clearTimeout(el._rhT);
            if (collapse) {
                el.style.height = el.offsetHeight + 'px';
                void el.offsetHeight;
                el.classList.add('collapsed');
                el.style.height = '0px';
            } else {
                el.classList.remove('collapsed');
                el.style.height = '0px';
                const target = el.scrollHeight + (el.offsetHeight - el.clientHeight);
                void el.offsetHeight;
                el.style.height = target + 'px';
                el._rhT = setTimeout(function () { el.style.height = ''; }, 300);
            }
        }

        function isRegionCollapsed(regionName) {
            return !expandedRegions.has(regionName);
        }

        const LTA_NATURE_OF_INCIDENT = [
            'Struck-By',
            'Struck Against',
            'Caught-In',
            'Caught-On',
            'Caught in Between',
            'Caught By',
            'Electric Shock',
            'Arc Flashes',
            'Contact With',
            'Fall to Surface',
            'Fall to Below',
            'Burns',
            'Chemical Burns',
            'Manual Handling',
            'Overexertion',
            'Inhalation of Toxic Fumes',
            'Skin Irritation',
            'Fire and Explosions',
            'Heat Stress',
            'Cold Exposure',
            'Hearing Loss',
            'Vehicular Accident',
            'Health Concern',
            'Animal/Insect Bite',
            'Environmental Accident',
            'Others'
        ];

        const LTA_INCIDENT_CLASSIFICATION = [
            'LTA',
            'Restricted Work Case (RWC)',
            'Medical Treatment',
            'First Aid',
            'Fatality',
            'High-Potential Incident',
            'Dangerous Occurrence',
            'Near Miss'
        ];

        const LTA_INCIDENT_CLASSIFICATION_DESC = {
            'LTA':                      'Lost Time Accident — An injury that prevents the worker from returning to work on the next scheduled work shift. Results in days lost/charged.',
            'Restricted Work Case (RWC)': 'Restricted Work Case — The injured worker can still report to work but is temporarily assigned to lighter or restricted duties due to the injury.',
            'Medical Treatment':        'An injury requiring treatment beyond first aid by a physician or medical professional, but does not result in lost workdays.',
            'First Aid':                'A minor injury treated on-site with basic medical supplies. The worker can return to work immediately with no lost time.',
            'Fatality':                 'An incident resulting in the death of one or more workers, either immediately or as a consequence of a work-related injury or illness.',
            'High-Potential Incident':  'An incident that did not result in injury but had the potential to cause a serious or fatal injury under different circumstances.',
            'Dangerous Occurrence':     'A near-disaster event (e.g., collapse, explosion, fire) required to be reported to DOLE under the OSH Law, even if no injury occurred.',
            'Near Miss':                'An unplanned event that did not result in injury or damage but could have, under slightly different circumstances.'
        };

        const LTA_FOLLOWUP_RESULTS = [
            'Effective Corrective Action / For Close-out',
            'For Continuous Monitoring',
            'Ineffective (For CAR Issuance)'
        ];

        const LTA_FACTOR_CATEGORIES = {
            'PEOPLE': [
                'Lack of Awareness or Training',
                'Fatigue and Stress',
                'Negligence or Complacency',
                'Ignoring Safety Procedures',
                'Distractions',
                'Poor Communication',
                'Improper Use of Equipment',
                'Risk-Taking Behavior'
            ],
            'EQUIPMENT': [
                'Faulty Equipment',
                'Improper Use of Tools',
                'Lack of Maintenance',
                'Failure to Use PPE',
                'Uncalibrated/Outdated Equipment'
            ],
            'MATERIALS': [
                'Flammable or Toxic Substances',
                'Improper Storage',
                'Defective Materials',
                'Spills and Leaks'
            ],
            'ENVIRONMENT': [
                'Poor Housekeeping',
                'Defective Equipment',
                'Hazardous Substances',
                'Weather Conditions',
                'Inadequate Ventilation',
                'Inadequate Lighting',
                'Excessive Noise',
                'Excessive Vibration',
                'Congested Work Areas'
            ],
            'ORGANIZATIONAL': [
                'Lack of Safety Training',
                'Poor Supervision',
                'Inadequate Risk Assessments',
                'Pressure to Meet Deadlines',
                'Lack of Proper PPE',
                'Failure to Maintain Equipment'
            ]
        };

        const LTA_NATURE_OF_INJURY = [
            'Abrasion', 'Avulsion', 'Amputation',
            'Bee Sting / Insect Bite', 'Bone Fracture',
            'Burn', 'Contusion / Bruise',
            'Cut / Lacerated Wound',
            'Corrosion',
            'Crush Injury',
            'Difficulty of Breathing',
            'Dislocation',
            'Embedded Foreign Object (Eye)',
            'Foreign Body Entering Through Natural Opening (Eyes/Ears/Respiratory Tract/GIT/GUT)',
            'Eye Injury / Strain',
            'Head Injury / Head Trauma',
            'Injury of Blood Vessel/s',
            'Injury of Muscles and Tendons',
            'Injury of Nerve/s',
            'Minor Abrasion',
            'Muscle Spasm / Strain',
            'Nail Puncture / Punctured Wound',
            'Open Wound',
            'Partial Avulsion',
            'Snake Bite',
            'Sprain',
            'Superficial Injury',
            'Swelling / Hematoma',
            'Toxic Effect of Substances (Non-Medicinal)',
            'N/A',
            'Others'
        ];

        const LTA_BODY_PARTS = [
            'Head', 'Face', 'Forehead', 'Scalp',
            'Eye/s (Left)', 'Eye/s (Right)', 'Both Eyes',
            'Ear/s', 'Nose', 'Chin', 'Glabella',
            'Neck', 'Shoulder (Left)', 'Shoulder (Right)',
            'Chest / Thoracic Cage', 'Back (Upper)', 'Back (Lower/Lumbar)',
            'Trunk', 'Abdomen', 'Spine', 'Hip / Pelvis',
            'Thigh (Left)', 'Thigh (Right)',
            'Arm (Left)', 'Arm (Right)',
            'Elbow (Left)', 'Elbow (Right)',
            'Forearm (Left)', 'Forearm (Right)',
            'Wrist (Left)', 'Wrist (Right)',
            'Hand (Left)', 'Hand (Right)',
            'Thumb (Left)', 'Thumb (Right)',
            'Finger/s (Left)', 'Finger/s (Right)',
            'Index Finger (Left)', 'Index Finger (Right)',
            'Middle Finger (Left)', 'Middle Finger (Right)',
            'Ring Finger (Left)', 'Ring Finger (Right)',
            'Little Finger (Left)', 'Little Finger (Right)',
            'Leg (Left)', 'Leg (Right)',
            'Knee (Left)', 'Knee (Right)',
            'Ankle (Left)', 'Ankle (Right)',
            'Foot (Left)', 'Foot (Right)',
            'Toe/s (Left)', 'Toe/s (Right)',
            'Whole Body',
            'Multiple Body Parts',
            'N/A',
            'Others'
        ];

        const LTA_CAUSE_OF_INJURY = [
            'Falls of Persons',
            'Struck by Falling Objects',
            'Stepping On / Striking Against / Struck by Objects (Excluding Falling Objects)',
            'Caught By or In Between Objects',
            'Over-exertion or Strenuous Movements',
            'Exposure to or Contact with Extreme Temperatures',
            'Exposure to or Contact with Electric Current',
            'Exposure to or Contact with Harmful Substances',
            'Exposure to Radiation',
            'Others (Please Specify)'
        ];

        const LTA_AGENT_OF_INJURY = [
            'Building / Structures',
            'Prime Movers',
            'Distribution Systems',
            'Hand Tools',
            'Machines / Equipment',
            'Conveying / Transport / Packaging Equipment or Vehicles',
            'Materials / Object',
            'Chemical Substances',
            'Humans / Animals / Plants',
            'Others (Please Specify)'
        ];
        window.LTA_AGENT_OF_INJURY = LTA_AGENT_OF_INJURY;

        const SCHEDULED_CHARGES = {
            'Thumb — Distal Phalange':           300,
            'Thumb — Proximal Phalange':         600,
            'Thumb — Metacarpal':                900,
            'Index Finger — Distal Phalange':    100,
            'Index Finger — Middle Phalange':    200,
            'Index Finger — Proximal Phalange':  400,
            'Index Finger — Metacarpal':         600,
            'Middle Finger — Distal Phalange':   75,
            'Middle Finger — Middle Phalange':   150,
            'Middle Finger — Proximal Phalange': 300,
            'Middle Finger — Metacarpal':        500,
            'Ring Finger — Distal Phalange':     60,
            'Ring Finger — Middle Phalange':     120,
            'Ring Finger — Proximal Phalange':   240,
            'Ring Finger — Metacarpal':          450,
            'Little Finger — Distal Phalange':   50,
            'Little Finger — Middle Phalange':   100,
            'Little Finger — Proximal Phalange': 200,
            'Little Finger — Metacarpal':        400,
            'Great Toe — Distal Phalange':       150,
            'Great Toe — Proximal Phalange':     300,
            'Great Toe — Metatarsal':            600,
            'Other Toe — Distal Phalange':       35,
            'Other Toe — Middle Phalange':       75,
            'Other Toe — Proximal Phalange':     150,
            'Other Toe — Metatarsal':            350,
            'Foot at Ankle':                     2400,
            'Arm — Above Elbow (incl. joint)':   4500,
            'Arm — Above Ankle / Below Elbow':   3600,
            'Leg — Above Knee':                  4500,
            'Leg — Above Ankle / Below Knee':    300,
            'One Eye (Loss of Sight)':           1800,
            'Both Eyes (Loss of Sight)':         6000,
            'One Ear (Complete Hearing Loss)':   600,
            'Both Ears (Complete Hearing Loss)': 3000,
            'Unrepaired Hernia':                 50,
            'Fatality':                          6000,
        };

        const SCHEDULED_CHARGES_GROUPS = [
            { group: '🖐 Thumb',         items: ['Thumb — Distal Phalange','Thumb — Proximal Phalange','Thumb — Metacarpal'] },
            { group: '☝ Index Finger',  items: ['Index Finger — Distal Phalange','Index Finger — Middle Phalange','Index Finger — Proximal Phalange','Index Finger — Metacarpal'] },
            { group: '🖕 Middle Finger', items: ['Middle Finger — Distal Phalange','Middle Finger — Middle Phalange','Middle Finger — Proximal Phalange','Middle Finger — Metacarpal'] },
            { group: '💍 Ring Finger',   items: ['Ring Finger — Distal Phalange','Ring Finger — Middle Phalange','Ring Finger — Proximal Phalange','Ring Finger — Metacarpal'] },
            { group: '🤙 Little Finger', items: ['Little Finger — Distal Phalange','Little Finger — Middle Phalange','Little Finger — Proximal Phalange','Little Finger — Metacarpal'] },
            { group: '🦶 Great Toe',     items: ['Great Toe — Distal Phalange','Great Toe — Proximal Phalange','Great Toe — Metatarsal'] },
            { group: '🦶 Other Toe',     items: ['Other Toe — Distal Phalange','Other Toe — Middle Phalange','Other Toe — Proximal Phalange','Other Toe — Metatarsal'] },
            { group: '🦶 Foot / Ankle',  items: ['Foot at Ankle'] },
            { group: '💪 Arm',           items: ['Arm — Above Elbow (incl. joint)','Arm — Above Ankle / Below Elbow'] },
            { group: '🦵 Leg',           items: ['Leg — Above Knee','Leg — Above Ankle / Below Knee'] },
            { group: '👁 Vision / Hearing', items: ['One Eye (Loss of Sight)','Both Eyes (Loss of Sight)','One Ear (Complete Hearing Loss)','Both Ears (Complete Hearing Loss)','Unrepaired Hernia'] },
            { group: '☠ Fatality',       items: ['Fatality'] },
        ];

        const LTA_INJURY_TYPES = [
            { value: 'temporary',  label: 'Temporary / Recoverable',      useScheduled: false, note: 'Use Actual Days Lost (Date of Accident → RTW)' },
            { value: 'permanent',  label: 'Permanent Impairment',         useScheduled: true,  note: 'Use Scheduled Charges (Table 6)' },
            { value: 'amputation', label: 'Amputation',                   useScheduled: true,  note: 'Use Scheduled Charges (Table 6) — Required' },
            { value: 'vision',     label: 'Loss of Vision',               useScheduled: true,  note: 'Use Scheduled Charges (Table 6)' },
            { value: 'hearing',    label: 'Loss of Hearing',              useScheduled: true,  note: 'Use Scheduled Charges (Table 6)' },
            { value: 'fatality',   label: 'Fatality',                     useScheduled: true,  note: 'Use Scheduled Charges (Table 6) — 6,000 days' },
            { value: 'confinement',label: 'Confinement Only (Temporary)', useScheduled: false, note: 'Use Actual Days Lost (Date of Accident → RTW)' },
            { value: 'na',         label: 'N/A — No Days Lost / Not Applicable', useScheduled: false, note: 'Will NOT be counted in Days Lost computation' },
        ];

        
        function computeDaysLost(dateOfAccident, dateRTW) {
            if (!dateOfAccident || !dateRTW) return 0;
            const start = new Date(dateOfAccident);
            const end   = new Date(dateRTW);
            start.setDate(start.getDate() + 1); // day AFTER accident
            if (start >= end) return 0;
            let days = 0;
            const cur = new Date(start);
            while (cur < end) {
                if (cur.getDay() !== 0) days++; // exclude Sundays
                cur.setDate(cur.getDate() + 1);
            }
            return days;
        }

        
        // ── Classification → Days Lost rule ─────────────────────────────────
        // High-Potential, Dangerous Occurrence and Near Miss have no lost days
        //                              -> always N/A.
        // Fatality                     -> fixed 6,000 days (Table 6).
        // RWC                          -> no actual days; scheduled charge only
        //                                 (permanent injury), otherwise N/A.
        // LTA / Medical Treatment / First Aid / blank / unknown
        //                              -> free choice (user picks Actual days,
        //                                 Scheduled charge or Not applicable).
        const LTA_NO_DL_CLASS_RE = /high[\s-]*potential|dangerous\s*occ|near[\s-]*miss/i;
        function ltaClassKind(cls) {
            const list = (Array.isArray(cls) ? cls : [cls]).map(v => String(v == null ? '' : v).trim()).filter(Boolean);
            if (!list.length) return 'lta';
            const kinds = list.map(v => /fatal/i.test(v) ? 'fatality'
                : (/^lta$|lost\s*time/i.test(v) ? 'lta'
                : (/restricted|rwc/i.test(v) ? 'rwc'
                : (LTA_NO_DL_CLASS_RE.test(v) ? 'none' : 'lta'))));
            for (const k of ['fatality', 'lta', 'rwc']) if (kinds.includes(k)) return k;
            return 'none';
        }
        // LTA, Medical Treatment and First Aid always use Actual days or Scheduled charge.
        // Not applicable is NOT allowed for them.
        const LTA_NO_NA_CLASS_RE = /^lta$|lost\s*time|medical\s*treatment|first\s*aid/i;
        function ltaClassNoNa(cls) {
            if (ltaClassKind(cls) !== 'lta') return false;
            const list = (Array.isArray(cls) ? cls : [cls]).map(v => String(v == null ? '' : v).trim()).filter(Boolean);
            return list.some(v => LTA_NO_NA_CLASS_RE.test(v));
        }
        function ltaClassDlRule(cls) {
            const kind = ltaClassKind(cls);
            const label = (Array.isArray(cls) ? cls.join(', ') : String(cls || '')).trim();
            if (kind === 'none')     return { lock: 'na',       reason: label + ' has no lost days, so Days Lost is set to Not applicable.' };
            if (kind === 'fatality') return { lock: 'fatality', reason: 'Fatality is charged the fixed 6,000 days (Table 6).' };
            if (kind === 'rwc')      return { lock: 'rwc',      reason: 'RWC has no lost days, so Actual days is off. Use Scheduled charge only for a permanent injury. Otherwise keep Not applicable.' };
            if (ltaClassNoNa(cls))   return { lock: 'nona',     reason: '' };
            return { lock: '', reason: '' };
        }
        // The injury type that is really used for computation (also fixes old saved entries).
        function ltaEffectiveInjuryType(entry) {
            const t = entry.injuryType || 'temporary';
            const k = ltaClassKind(entry.incidentClassification);
            if (k === 'none') return 'na';
            if (k === 'fatality') return 'fatality';
            if (k === 'rwc') return (t === 'temporary' || t === 'confinement' || t === 'fatality') ? 'na' : t;
            if (t === 'na' && ltaClassNoNa(entry.incidentClassification)) return 'temporary'; // LTA / Medical Treatment / First Aid: no N/A
            return t;
        }
        function ltaEffectiveScheduledItem(entry) {
            if (ltaClassKind(entry.incidentClassification) === 'fatality') return 'Fatality';
            return entry.scheduledChargeItem || '';
        }
        window.ltaClassKind = ltaClassKind;
        window.ltaClassDlRule = ltaClassDlRule;
        window.ltaClassNoNa = ltaClassNoNa;
        window.ltaEffectiveInjuryType = ltaEffectiveInjuryType;
        window.ltaEffectiveScheduledItem = ltaEffectiveScheduledItem;

        // -- Injured persons of one entry -------------------------------------
        // Person 1 = the entry's own fields (so old entries need no change).
        // Persons 2..N = entry.additionalPersons.
        // The date of accident is shared by the whole incident.
        // If the injured person is "N/A", the entry is counted once by its own classification.
        function ltaEntryHasInjured(entry) {
            return !!entry && String(entry.injuredPersonName == null ? '' : entry.injuredPersonName).trim().toUpperCase() !== 'N/A';
        }
        function ltaEntryPersons(entry) {
            if (!entry) return [];
            const pick = (s, cls) => ({
                injuredPersonName: s.injuredPersonName, occupation: s.occupation,
                natureOfInjury: s.natureOfInjury, bodyPartsAffected: s.bodyPartsAffected,
                causeOfInjury: s.causeOfInjury, causeOfInjuryOther: s.causeOfInjuryOther,
                agentOfInjury: s.agentOfInjury, agentOfInjuryOther: s.agentOfInjuryOther,
                incidentClassification: cls,
                injuryType: s.injuryType, scheduledChargeItem: s.scheduledChargeItem,
                dateOfAccident: entry.dateOfAccident, dateReported: entry.dateReported,
                dateRTW: s.dateRTW
            });
            const list = [pick(entry, entry.incidentClassification)];
            if (ltaEntryHasInjured(entry) && Array.isArray(entry.additionalPersons)) {
                entry.additionalPersons.forEach(x => {
                    if (x) list.push(pick(x, x.incidentClassification || entry.incidentClassification));
                });
            }
            return list;
        }

        function computeDaysCharged(entry) {
            const injuryType = ltaEffectiveInjuryType(entry);

            // N/A — explicitly excluded from all days-lost computation
            if (injuryType === 'na') {
                return { daysCharged: 0, method: 'na', scheduledItem: null };
            }

            const injuryTypeDef = LTA_INJURY_TYPES.find(t => t.value === injuryType);
            const useScheduled = injuryTypeDef ? injuryTypeDef.useScheduled : false;

            if (useScheduled) {
                const item = ltaEffectiveScheduledItem(entry);
                const val  = item ? (SCHEDULED_CHARGES[item] || 0) : 0;
                return { daysCharged: val, method: 'scheduled', scheduledItem: item };
            } else {
                const dl = computeDaysLost(entry.dateOfAccident, entry.dateRTW);
                return { daysCharged: dl, method: 'actual', scheduledItem: null };
            }
        }

        // ANSI Z16.1 / OSH severity-rate convention: actual (TTD) lost days are
        // charged to the calendar month(s) in which the days themselves fall —
        // NOT lumped entirely into the month the accident happened. This lets
        // Severity Rate taper down naturally across the months a case is still
        // "open" instead of spiking once then dropping straight to zero.
        // Scheduled charges (fatality / permanent disability — a fixed ANSI
        // day-charge, not an actual absence) remain lump-summed to the
        // accident's month, since they don't represent real calendar days off.
        function computeDaysChargedByMonth(entry, year) {
            const monthTotals = new Array(13).fill(0); // index 1-12
            const injuryType = ltaEffectiveInjuryType(entry);
            if (injuryType === 'na') return monthTotals;

            const injuryTypeDef = LTA_INJURY_TYPES.find(t => t.value === injuryType);
            const useScheduled = injuryTypeDef ? injuryTypeDef.useScheduled : false;

            if (useScheduled) {
                if (!entry.dateOfAccident) return monthTotals;
                const accDate = new Date(entry.dateOfAccident);
                if (accDate.getFullYear() !== year) return monthTotals;
                const item = ltaEffectiveScheduledItem(entry);
                const val  = item ? (SCHEDULED_CHARGES[item] || 0) : 0;
                monthTotals[accDate.getMonth() + 1] += val;
                return monthTotals;
            }

            // Actual/TTD case — walk day-by-day from the day AFTER the accident
            // through RTW, crediting each non-Sunday day to the calendar month
            // (within the target year) it actually falls in.
            if (!entry.dateOfAccident || !entry.dateRTW) return monthTotals;
            const start = new Date(entry.dateOfAccident);
            const end   = new Date(entry.dateRTW);
            start.setDate(start.getDate() + 1); // day AFTER accident
            if (start >= end) return monthTotals;

            const cur = new Date(start);
            while (cur < end) {
                if (cur.getDay() !== 0 && cur.getFullYear() === year) { // exclude Sundays; only count days within target year
                    monthTotals[cur.getMonth() + 1] += 1;
                }
                cur.setDate(cur.getDate() + 1);
            }
            return monthTotals;
        }

        // Days charged of a whole entry = sum of every injured person (same formula per person).
        function computeEntryDaysCharged(entry) {
            const per = ltaEntryPersons(entry).map(pp => computeDaysCharged(pp));
            const total = per.reduce((s, r) => s + (r.daysCharged || 0), 0);
            const method = per.some(r => r.method === 'scheduled') ? 'scheduled'
                : (per.some(r => r.method === 'actual') ? 'actual' : 'na');
            return { daysCharged: total, method: method, perPerson: per };
        }
        // "No. of Days w/o LTA" is per incident: it resets if any injured person is LTA.
        function ltaEntryHasLta(entry) {
            return ltaEntryPersons(entry).some(pp => (pp.incidentClassification || 'LTA') === 'LTA');
        }
        // Distinct classifications of an entry for display, e.g. "LTA / First Aid".
        function ltaEntryClassLabel(entry) {
            const seen = [];
            ltaEntryPersons(entry).forEach(pp => {
                const c = Array.isArray(pp.incidentClassification) ? pp.incidentClassification.join(', ') : String(pp.incidentClassification || '').trim();
                if (c && seen.indexOf(c) === -1) seen.push(c);
            });
            return seen.join(' / ');
        }

        // Expose to global scope so functions outside showUI() (e.g. computeAggregateTabulation)
        // can compute Days Lost/Charged directly from the Incident & Accident Registry —
        // same single source of truth used for the Medical Tab auto-sync.
        window.SCHEDULED_CHARGES  = SCHEDULED_CHARGES;
        window.LTA_INJURY_TYPES   = LTA_INJURY_TYPES;
        window.computeDaysLost    = computeDaysLost;
        window.computeDaysCharged = computeDaysCharged;
        window.ltaEffectiveInjuryType = ltaEffectiveInjuryType;
        window.computeDaysChargedByMonth = computeDaysChargedByMonth;
        window.ltaEntryHasInjured = ltaEntryHasInjured;
        window.ltaEntryPersons = ltaEntryPersons;
        window.computeEntryDaysCharged = computeEntryDaysCharged;
        window.ltaEntryHasLta = ltaEntryHasLta;
        window.ltaEntryClassLabel = ltaEntryClassLabel;

        
        function syncDaysLostFromLtaRegistry() {
            const selectedYear = (state && state.selectedYear) ? parseInt(state.selectedYear) : new Date().getFullYear();
            state.projects.forEach(p => {
                const entries = p.vals['lta-registry_entries'] || [];
                const monthTotals = new Array(14).fill(0);
                let hasCurrentYearEntries = false;
                entries.forEach(e => {
                    // One computation per injured person (old entries = one person)
                    ltaEntryPersons(e).forEach(pp => {
                        if (ltaEffectiveInjuryType(pp) === 'na') return; // skip N/A (also First Aid, Medical Treatment, etc.)
                        const byMonth = computeDaysChargedByMonth(pp, selectedYear);
                        for (let i = 1; i <= 12; i++) {
                            if (byMonth[i] > 0) {
                                monthTotals[i] += byMonth[i];
                                hasCurrentYearEntries = true;
                            }
                        }
                    });
                });
                if (hasCurrentYearEntries) {
                    if (!p.vals['medical_Days Lost/Charged']) {
                        p.vals['medical_Days Lost/Charged'] = new Array(14).fill('');
                    }
                    for (let i = 1; i <= 12; i++) {
                        p.vals['medical_Days Lost/Charged'][i] = monthTotals[i] > 0 ? monthTotals[i].toString() : '0';
                    }
                }
            });
        }

        // "No. of Days w/o LTA" is manual input only (no formula). Users encode the value per month.


        // "No. of Days w/o LTA" must NEVER carry a value in a month that hasn't arrived yet.
        // Future-month cells are locked in the UI, so any value there is stale/auto-filled data
        // (e.g. an old sync that wrote full calendar days). Blank them out (in memory) and flag the
        // cells dirty so the next Save also removes them from Firebase. Also keeps Running YTD honest.
        function clearFutureDaysWithoutLta() {
            const DAYS_KEY = 'exposures_No. of Days w/o LTA';
            const selYear = (state && state.selectedYear) ? parseInt(state.selectedYear) : new Date().getFullYear();
            const now = new Date();
            const realYear = now.getFullYear();
            const realMonth = now.getMonth() + 1; // 1-12
            const isFutureMo = m => selYear > realYear || (selYear === realYear && m > realMonth);
            let cleared = 0;
            (state.projects || []).forEach(p => {
                const arr = p.vals && p.vals[DAYS_KEY];
                if (!arr) return;
                for (let i = 1; i <= 12; i++) {
                    if (!isFutureMo(i)) continue;
                    if (arr[i] !== '' && arr[i] !== null && arr[i] !== undefined) {
                        arr[i] = '';
                        cleared++;
                        if (window.RowSaveManager) window.RowSaveManager.markDirty(p.name, `${DAYS_KEY}_${i}`);
                    }
                }
            });
            return cleared;
        }
        window.clearFutureDaysWithoutLta = clearFutureDaysWithoutLta;


        
        function syncIncidentClassificationsFromRegistry() {
            const classMap = {
                'LTA':                      'medical_LTA',
                'Medical Treatment':        'medical_Medical Treatment',
                'First Aid':                'medical_First Aid',
                'Fatality':                 'medical_Fatality',
                'High-Potential Incident':  'medical_High-Potential incident',
                'Dangerous Occurrence':     'medical_Dangerous Occurrences',
                'Near Miss':                'medical_No. of Identified Near-Miss',
            };

            state.projects.forEach(p => {
                const entries = p.vals['lta-registry_entries'] || [];

                const counts = {};
                Object.values(classMap).forEach(k => { counts[k] = new Array(14).fill(0); });

                const _syncYear = (state && state.selectedYear) ? parseInt(state.selectedYear) : new Date().getFullYear();
                entries.forEach(e => {
                    const dateStr = e.dateOfAccident || e.dateReported;
                    if (!dateStr) return;
                    const accYear = new Date(dateStr).getFullYear();
                    if (accYear !== _syncYear) return; // ← skip other years
                    const month = new Date(dateStr).getMonth() + 1; // 1–12
                    if (month < 1 || month > 12) return;
                    // One count per injured person. If the injured person is N/A, the entry is counted once.
                    ltaEntryPersons(e).forEach(pp => {
                        const medKey = classMap[pp.incidentClassification];
                        if (!medKey) return;
                        counts[medKey][month]++;
                    });
                });

                Object.keys(counts).forEach(medKey => {
                    if (!p.vals[medKey]) p.vals[medKey] = new Array(14).fill('');
                    for (let i = 1; i <= 12; i++) {
                        p.vals[medKey][i] = counts[medKey][i].toString();
                    }
                });
            });

            syncDaysLostFromLtaRegistry();
        }

        function _ltaAutoEditMode() {
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

        function removeLtaEntry(pName, idx) {
            const p = state.projects.find(x => x.name === pName);
            if (!p) return;
            const _rbac = UserAccounts.checkPermission(state.currentUser?.email, 'delete', p.region, 'medical');
            if (!_rbac.allowed) { showLockedMessage(_rbac.reason); return; }
            const entry = p.vals['lta-registry_entries']?.[idx];
            const label = entry?.name || `LTA entry #${idx + 1}`;
            showDeleteDialog('LTA Entry', `${label} from ${pName}`).then(confirmed => {
                if (!confirmed) return;
                // Close the entry modal immediately if it's open (so deleted entry disappears right away)
                const _openModal = document.getElementById('lta-entry-modal');
                if (_openModal) _openModal.remove();
                p.vals['lta-registry_entries'].splice(idx, 1);
                syncIncidentClassificationsFromRegistry();
                syncDaysLostFromLtaRegistry();
                saveToFirebase();
                renderLtaRegistryTab();
            });
        }

        function updateLtaField(pName, idx, field, value) {
            const p = state.projects.find(x => x.name === pName);
            if (!p) return;
            if (!p.vals['lta-registry_entries'] || !p.vals['lta-registry_entries'][idx]) return;
            p.vals['lta-registry_entries'][idx][field] = value;
            if (field === 'dateOfAccident' || field === 'dateRTW' || field === 'incidentClassification' || field === 'dateReported'
                || field === 'injuryType' || field === 'scheduledChargeItem') {
                syncIncidentClassificationsFromRegistry();
                syncDaysLostFromLtaRegistry();
                const badge = document.getElementById(`lta-dl-${pName.replace(/[^a-zA-Z0-9]/g,'_')}-${idx}`);
                if (badge) {
                    const e = p.vals['lta-registry_entries'][idx];
                    const { daysCharged, method } = computeEntryDaysCharged(e);
                    badge.textContent = daysCharged + (method === 'scheduled' ? ' (SC)' : '');
                    badge.style.background = daysCharged > 0 ? '#c62828' : '#e8f5e9';
                    badge.style.color = daysCharged > 0 ? 'white' : '#2e7d32';
                }
                if (field === 'injuryType') {
                    // FIX: Targeted re-render of only the Days Lost section
                    // instead of full renderLtaRegistryTab() which wipes unsaved fields.
                    const _pId = pName.replace(/[^a-zA-Z0-9]/g,'_');
                    const _dlSection = document.getElementById(`lta-dl-section-${_pId}-${idx}`);
                    if (_dlSection && typeof renderLtaDLSection === 'function') {
                        _dlSection.outerHTML = renderLtaDLSection(p, idx, pName, !(state && state.isEditing));
                    } else {
                        // Fallback: full re-render only if targeted element not found
                        renderLtaRegistryTab();
                    }
                    return;
                }
            }
            if (typeof markPendingSync === 'function') markPendingSync();
            if (window.RowSaveManager) window.RowSaveManager.markDirty(pName, `lta_${idx}_${field}`);
            if (typeof saveToFirebaseDebounced === 'function') saveToFirebaseDebounced();
        }

        // ════════════════════════════════════════════════════════════════
        // AIIR IMPORT — read an Accident/Incident Investigation Report
        // (FM-ESH-13-01 .docx / .pdf) and pre-fill a new LTA registry entry
        // ════════════════════════════════════════════════════════════════
        function _aiirParseDate(str) {
            if (!str) return '';
            const MON = {jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
            const pad = n => String(n).padStart(2, '0');
            let m = str.match(/(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})/);
            if (m) return `${m[3]}-${pad(+m[1])}-${pad(+m[2])}`;
            m = str.match(/([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/);
            if (m && MON[m[1].slice(0,3).toLowerCase()]) return `${m[3]}-${pad(MON[m[1].slice(0,3).toLowerCase()])}-${pad(+m[2])}`;
            m = str.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})/);
            if (m && MON[m[2].slice(0,3).toLowerCase()]) return `${m[3]}-${pad(MON[m[2].slice(0,3).toLowerCase()])}-${pad(+m[1])}`;
            return '';
        }

        function _aiirGrab(T, startRe, endRes) {
            const m = startRe.exec(T);
            if (!m) return '';
            const from = m.index + m[0].length;
            const rest = T.slice(from);
            let cut = rest.length;
            endRes.forEach(re => { const x = re.exec(rest); if (x && x.index < cut) cut = x.index; });
            return rest.slice(0, cut).replace(/^[\s:.\-–]+/, '').replace(/\s+/g, ' ').trim();
        }

        function _aiirPick(list, text, rules) {
            const out = [];
            rules.forEach(([re, val]) => { if (re.test(text) && list.includes(val) && !out.includes(val)) out.push(val); });
            return out;
        }


        // Negation-aware pick: ignores matches preceded by "no / not / without / none"
        function _aiirPickNeg(list, text, rules) {
            const out = [];
            rules.forEach(([re, val]) => {
                if (!list.includes(val) || out.includes(val)) return;
                const g = new RegExp(re.source, 'ig');
                let m;
                while ((m = g.exec(text))) {
                    // skip a hit when a negation (no / not / without / none / nil) sits earlier in the same sentence
                    const pre = text.slice(Math.max(0, m.index - 40), m.index);
                    if (!/\b(no|not|without|none|nil)\b[^.;]*$/i.test(pre)) { out.push(val); break; }
                }
            });
            return out;
        }

        // Scheduled Charge Item (Table 6) — only exact matches; never guesses
        function _aiirScheduledItem(txt, cls) {
            const has = k => typeof SCHEDULED_CHARGES !== 'undefined' && SCHEDULED_CHARGES[k] !== undefined;
            if (cls === 'Fatality') return { item: 'Fatality' };
            if (/loss of (sight|vision)|blind|lost (his|her) (eye|sight)/i.test(txt))
                return { type: 'vision', item: /both eyes|two eyes/i.test(txt) ? 'Both Eyes (Loss of Sight)' : 'One Eye (Loss of Sight)' };
            if (/complete hearing loss|loss of hearing|\bdeaf/i.test(txt))
                return { type: 'hearing', item: /both ears/i.test(txt) ? 'Both Ears (Complete Hearing Loss)' : 'One Ear (Complete Hearing Loss)' };
            if (/unrepaired hernia/i.test(txt)) return { item: 'Unrepaired Hernia' };
            if (!/amputat|severed/i.test(txt)) return {};

            const lvl = (w, toe) => /distal|tip of/i.test(w) ? 'Distal Phalange'
                : /middle phalan/i.test(w) ? 'Middle Phalange'
                : /proximal/i.test(w) ? 'Proximal Phalange'
                : (toe ? (/metatars/i.test(w) ? 'Metatarsal' : '') : (/metacarp/i.test(w) ? 'Metacarpal' : ''));
            let m;
            if ((m = txt.match(/\b(great|big)\s+toe\b|hallux/i))) {
                const l = lvl(txt.slice(m.index, m.index + 140), true);
                const k = l ? `Great Toe — ${l}` : '';
                return has(k) ? { item: k } : { note: 'Great Toe amputation — no level found (distal/proximal/metatarsal). Select the Scheduled Charge Item manually.' };
            }
            if ((m = txt.match(/\btoes?\b/i))) {
                const l = lvl(txt.slice(m.index, m.index + 140), true);
                const k = l ? `Other Toe — ${l}` : '';
                return has(k) ? { item: k } : { note: 'Toe amputation — no level found. Select the Scheduled Charge Item manually.' };
            }
            if ((m = txt.match(/\b(index|middle|ring|little|pinky)\s+finger\b|\bthumb\b/i))) {
                const w = m[1] ? ({ pinky: 'Little' }[m[1].toLowerCase()] || (m[1][0].toUpperCase() + m[1].slice(1).toLowerCase())) + ' Finger' : 'Thumb';
                const l = lvl(txt.slice(m.index, m.index + 140), false);
                const k = l ? `${w} — ${l}` : '';
                return has(k) ? { item: k } : { note: `${w} amputation — no level found (distal/middle/proximal/metacarpal). Select the Scheduled Charge Item manually.` };
            }
            if (/\bfoot\b[^.]{0,40}\bankle|at (the )?ankle/i.test(txt)) return { item: 'Foot at Ankle' };
            if (/above[\s\-]+(the\s+)?elbow/i.test(txt)) return { item: 'Arm — Above Elbow (incl. joint)' };
            if (/below[\s\-]+(the\s+)?elbow|forearm/i.test(txt)) return { item: 'Arm — Above Ankle / Below Elbow' };
            if (/above[\s\-]+(the\s+)?knee/i.test(txt)) return { item: 'Leg — Above Knee' };
            if (/below[\s\-]+(the\s+)?knee/i.test(txt)) return { item: 'Leg — Above Ankle / Below Knee' };
            if (/\bhand\b[^.]{0,60}wrist|wrist[\s\-]level|at the wrist|amputation of (the )?(left |right )?hand/i.test(txt))
                return { item: 'Arm — Above Ankle / Below Elbow',
                         note: 'Hand/wrist amputation — there is no exact "Hand at Wrist" item in the table, so "Arm — Above Ankle / Below Elbow" (closest match) was selected. Please verify.' };
            return { note: 'Amputation — the Scheduled Charge Item could not be determined. Select it manually.' };
        }
