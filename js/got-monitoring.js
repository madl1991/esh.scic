
(function () {

    var GOT_REGION_ORDER = ["CORPORATE","PLANT OPERATIONS","NCR","SOUTH LUZON","NORTH LUZON","VISAYAS & MINDANAO"];
    var GOT_M = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
    var _gotTab = "tab3";
    var _gotCollapsed = {'NCR':true,'NORTH LUZON':true,'SOUTH LUZON':true,'VISAYAS & MINDANAO':true,'PLANT OPERATIONS':true,'CORPORATE':true};
    var _gotRegionProjIdx = {}; // tracks current project index per region in Compliance tab

    window.gotSetTab = function (t) { _gotTab = t; window.renderGotMonitoring(); };

    window.gotToggleRegion = function (reg, event) {
        if (event && event.target && (event.target.tagName === 'BUTTON' || (event.target.closest && event.target.closest('button')))) return;
        var content  = document.getElementById('got-rcontent-' + reg);
        var banner   = document.getElementById('got-rbanner-' + reg);
        if (!content) return;
        _gotCollapsed[reg] = !_gotCollapsed[reg];
        if (_gotCollapsed[reg]) {
            content.classList.add('collapsed');
            if (banner) banner.classList.add('collapsed');
        } else {
            content.classList.remove('collapsed');
            if (banner) banner.classList.remove('collapsed');
        }
    };

    window.gotNavigateProject = function(reg, delta) {
        var allProjects = (typeof getReportProjects === 'function') ? getReportProjects() : ((state && state.projects) ? state.projects : []);
        var projs = allProjects.filter(function(p){ return p.region === reg && !isProjectOnStoppage(p) && !p.dateFinished; });
        if (!projs.length) return;
        var cur = _gotRegionProjIdx[reg] || 0;
        cur = Math.max(0, Math.min(projs.length - 1, cur + delta));
        _gotRegionProjIdx[reg] = cur;
        gotRenderRegionProjTable(reg, projs, cur);
    };

    function gotRenderRegionProjTable(reg, projs, projIdx) {
        var containerId = 'got-regproj-' + reg.replace(/[^a-zA-Z0-9]/g, '_');
        var container   = document.getElementById(containerId);
        if (!container || !projs.length) return;

        var proj        = projs[projIdx];
        var userEmail   = state.currentUser ? state.currentUser.email : '';
        var canEditReg  = state.isEditing && UserAccounts.canEdit(userEmail, reg) && UserAccounts.canEditTab(userEmail, 'got-monitoring');
        var curMonth    = new Date().getMonth() + 1;
        var projAvg     = gotGoalProjectAvg2(proj);
        var pSafe       = escQ(proj.name);

        var h = '<div class="proj-nav-bar" style="display:flex;align-items:center;justify-content:space-between;padding:8px 14px;background:#e8f5e9;border-bottom:1px solid #c8e6c9;">';
        h += '<button onclick="gotNavigateProject(\'' + escQ(reg) + '\',-1)" ' + (projIdx === 0 ? 'disabled' : '') + ' style="background:' + (projIdx === 0 ? '#ccc' : '#1b5e20') + ';color:white;border:none;border-radius:6px;padding:5px 14px;font-size:0.72rem;font-weight:700;cursor:' + (projIdx === 0 ? 'not-allowed' : 'pointer') + ';opacity:' + (projIdx === 0 ? '0.4' : '1') + ';">';
        h += '<i class="fas fa-chevron-left"></i> Prev</button>';
        h += '<div style="text-align:center;">';
        h += '<div style="font-size:0.72rem;font-weight:800;color:#1b5e20;"><i class="fas fa-hard-hat" style="margin-right:5px;"></i>';
        if (proj.isRenewable) h += '&#127807; ';
        h += proj.name + projStatusBadge(proj) + '</div>';
        h += '<div style="font-size:0.62rem;color:#888;margin-top:2px;">Project ' + (projIdx + 1) + ' of ' + projs.length;
        if (projAvg !== null) h += ' &nbsp;·&nbsp; <span style="color:' + avgClr(projAvg) + ';font-weight:700;">' + fmtAvg(projAvg) + '</span>';
        if (!canEditReg) h += ' &nbsp;<i class="fas fa-lock" style="color:#fbc02d;font-size:0.6rem;" title="Press the Edit button (✏️) to enable input"></i>';
        h += '</div></div>';
        h += '<button onclick="gotNavigateProject(\'' + escQ(reg) + '\',1)" ' + (projIdx === projs.length - 1 ? 'disabled' : '') + ' style="background:' + (projIdx === projs.length - 1 ? '#ccc' : '#1b5e20') + ';color:white;border:none;border-radius:6px;padding:5px 14px;font-size:0.72rem;font-weight:700;cursor:' + (projIdx === projs.length - 1 ? 'not-allowed' : 'pointer') + ';opacity:' + (projIdx === projs.length - 1 ? '0.4' : '1') + ';">';
        h += 'Next <i class="fas fa-chevron-right"></i></button>';
        h += '</div>';

        h += '<div style="overflow-x:auto;overflow-y:auto;max-height:75vh;position:relative;">';
        h += '<table class="got-tbl" style="width:auto;border-collapse:collapse;">';

        h += '<thead style="position:sticky;top:0;z-index:4;">';
        h += '<tr>';
        h += '<th class="got-th-dark got-th-left" rowspan="2" style="position:sticky;left:0;z-index:5;min-width:180px;max-width:180px;white-space:normal;box-shadow:2px 0 4px rgba(0,0,0,0.08);">GOALS</th>';
        h += '<th class="got-th-dark got-th-left" rowspan="2" style="position:sticky;left:180px;z-index:5;min-width:150px;max-width:150px;white-space:normal;">TARGETS</th>';
        h += '<th class="got-th-dark got-th-left" rowspan="2" style="position:sticky;left:330px;z-index:5;min-width:140px;white-space:normal;">RESPONSIBLE</th>';
        h += '<th class="got-th-dark got-th-left" rowspan="2" style="position:sticky;left:470px;z-index:5;min-width:150px;max-width:150px;white-space:normal;box-shadow:3px 0 6px rgba(0,0,0,0.12);">EVIDENCE OF IMPLEMENTATION</th>';
        h += '<th colspan="12" style="background:#1b5e20;color:white;font-size:0.63rem;text-align:center;padding:3px 6px;">MONTHLY RATING</th>';
        h += '<th class="got-th-dark" rowspan="2" style="white-space:nowrap;font-size:0.59rem;">AVG</th>';
        h += '<th class="got-th-dark" rowspan="2" style="white-space:nowrap;">% COMPLIANCE</th>';
        h += '</tr>';
        h += '<tr>';
        GOT_M.forEach(function(m){ h += '<th style="white-space:nowrap;font-size:0.59rem;">' + m + '</th>'; });
        h += '</tr>';
        h += '</thead><tbody>';

        var prevCatR = '';
        COMPLIANCE_GOALS.forEach(function(g) {
            var gCat   = g.id.startsWith('E') ? 'ENVIRONMENTAL' : 'OCCUPATIONAL HEALTH & SAFETY';
            var cColor = gCat === 'ENVIRONMENTAL' ? '#1f4d2e' : '#e65100';
            var cBg    = gCat === 'ENVIRONMENTAL' ? '#e3eee5' : '#fff3e0';
            if (gCat !== prevCatR) {
                prevCatR = gCat;
                h += '<tr style="background:' + cBg + ';">'
                   + '<td colspan="18" style="position:sticky;left:0;z-index:1;font-weight:800;font-size:0.67rem;color:' + cColor + ';padding:4px 10px;background:' + cBg + ';">'
                   + '<i class="fas ' + (gCat === 'ENVIRONMENTAL' ? 'fa-leaf' : 'fa-hard-hat') + '" style="margin-right:5px;"></i>' + gCat + '</td></tr>';
            }

            var gCatColor = g.id.startsWith('E') ? '#2e7d32' : '#e65100';
            var gCatBg    = g.id.startsWith('E') ? '#f6faf6' : '#fff8f0';
            var measures  = GOAL_MEASURES[g.id] || [''];
            var nMeasures = measures.length;

            measures.forEach(function(measure, mi) {
                h += '<tr' + (mi % 2 === 0 ? '' : ' style="background:rgba(0,0,0,0.015);"') + '>';
                if (mi === 0) {
                    h += '<td rowspan="' + nMeasures + '" style="position:sticky;left:0;z-index:2;text-align:left;font-weight:700;font-size:0.66rem;color:' + gCatColor + ';vertical-align:top;padding:5px 8px;white-space:normal;min-width:180px;max-width:180px;background:' + gCatBg + ';box-shadow:2px 0 4px rgba(0,0,0,0.06);">' + g.goal + '</td>';
                    h += '<td rowspan="' + nMeasures + '" style="position:sticky;left:180px;z-index:2;text-align:left;font-size:0.62rem;vertical-align:top;padding:5px 7px;white-space:normal;min-width:150px;max-width:150px;background:' + gCatBg + ';">' + (g.target||'').split('\n').join('<br>') + '</td>';
                    h += '<td rowspan="' + nMeasures + '" style="position:sticky;left:330px;z-index:2;font-size:0.62rem;vertical-align:top;padding:5px 7px;white-space:normal;min-width:140px;background:' + gCatBg + ';">' + (g.responsible||'') + '</td>';
                    h += '<td rowspan="' + nMeasures + '" style="position:sticky;left:470px;z-index:2;text-align:left;font-size:0.62rem;vertical-align:top;padding:5px 7px;white-space:normal;min-width:150px;max-width:150px;background:' + gCatBg + ';box-shadow:3px 0 6px rgba(0,0,0,0.10);">' + (g.evidence||'').split('\n').join('<br>') + '</td>';
                }
                var _gotSelYear = state.selectedYear || new Date().getFullYear();
                for (var m = 1; m <= 12; m++) {
                    var cell     = gotGetCell(proj, g.id, mi, m);
                    var isFuture = m > curMonth;
                    var _gotWsBlocked = isMonthBlacklistedForProject(proj, m, _gotSelYear);
                    if (_gotWsBlocked) {
                        var _gotNotYetStarted = isMonthBeforeProjectStart(proj, m, _gotSelYear);
                        var _gotTip = getMonthExemptTip(proj, m, _gotSelYear).replace(/"/g, '&quot;');
                        h += '<td class="got-td-month" style="background:#eeeeee;cursor:not-allowed;" title="' + _gotTip + '">'
                           + '<select class="got-sel" disabled style="background:#e0e0e0;color:#bbb;border-color:#ddd;cursor:not-allowed;"><option>—</option></select></td>';
                        continue;
                    }
                    var disAttr  = (isFuture || !canEditReg) ? ' disabled' : '';
                    var cellCls  = 'got-td-month' + (isFuture ? ' got-td-future' : '') + (cell.r ? ' ' + ratingCls(cell.r) : '');
                    var tip      = isFuture ? ' title="' + GOT_M[m-1] + ' not yet"' : '';
                    h += '<td class="' + cellCls + '"' + tip + '>';
                    h += '<select class="got-sel"' + disAttr + ' onchange="gotSaveCell(\'' + pSafe + '\',\'' + g.id + '\',' + mi + ',' + m + ',\'r\',this.value)">';
                    h += '<option value="">—</option>';
                    [['0.25','25%'],['0.50','50%'],['0.75','75%'],['1.00','100%']].forEach(function(rv){
                        h += '<option value="' + rv[0] + '"' + (cell.r === rv[0] ? ' selected' : '') + '>' + rv[1] + '</option>';
                    });
                    h += '</select></td>';
                }
                var mAvg = gotMeasureAvg(proj, g.id, mi);
                h += '<td class="got-td-avg" id="got-mavg-' + CSS.escape(proj.name) + '-' + g.id + '-' + mi + '" style="color:' + avgClr(mAvg) + ';white-space:nowrap;">' + fmtAvg(mAvg) + '</td>';
                if (mi === 0) {
                    var goalProjAvg = gotGoalProjectAvg(proj, g.id);
                    h += '<td rowspan="' + nMeasures + '" class="got-td-avg" style="color:' + avgClr(goalProjAvg) + ';font-size:0.72rem;vertical-align:middle;">' + fmtAvg(goalProjAvg) + '</td>';
                }
                h += '</tr>';
            });
        });

        h += '<tr class="got-tr-overall">';
        h += '<td colspan="4" style="position:sticky;left:0;z-index:2;text-align:right;padding:5px 10px;font-size:0.65rem;font-weight:800;color:#1b5e20;background:#e8f5e9;box-shadow:3px 0 6px rgba(0,0,0,0.08);">OVERALL AVERAGE</td>';
        for (var m2 = 1; m2 <= 12; m2++) {
            var monthVals = [];
            COMPLIANCE_GOALS.forEach(function(g) {
                var mm = GOAL_MEASURES[g.id] || [''];
                mm.forEach(function(_, mi2) {
                    var c = gotGetCell(proj, g.id, mi2, m2);
                    var v = parseFloat(c.r);
                    if (!isNaN(v)) monthVals.push(v);
                });
            });
            var mv = monthVals.length ? monthVals.reduce(function(a,b){return a+b;},0)/monthVals.length : null;
            h += '<td style="color:' + avgClr(mv) + ';font-weight:700;font-size:0.63rem;white-space:nowrap;">' + fmtAvg(mv) + '</td>';
        }
        var pAll = gotGoalProjectAvg2(proj);
        h += '<td style="color:' + avgClr(pAll) + ';font-weight:800;white-space:nowrap;">' + fmtAvg(pAll) + '</td>';
        h += '<td style="color:' + avgClr(pAll) + ';font-weight:800;font-size:0.7rem;white-space:nowrap;">' + fmtAvg(pAll) + '</td>';
        h += '</tr>';

        h += '</tbody></table></div>';
        container.innerHTML = h;
    }
    window.gotRenderRegionProjTable = gotRenderRegionProjTable;

    var OTP_ESH_ROWS = [
        { cat: 'ENVIRONMENTAL', goal: 'E1.   Enhance the established environmental programs by promoting sustainable resource management', objective: 'Adopt sustainability initiatives aligned with environmental protection', target: '100% Implemention of environmental programs focused on sustainability such as waste minimization, energy consumption reduction, water conservation, renewable energy utilization and proper waste management.', responsible: 'Project Management Team (PCO)', dept: 'ESH (PCO)', evidence: 'Consolidated implementation of environmental programs in all project sites' },
        { cat: '', goal: 'E2. Ensure compliance to applicable Environmental regulations', objective: 'Monitoring of compliance level to all applicable environmental regulations in all project sites, offices and facilities', target: '100% compliance to Environmental regulations in every project sites, offices and facilities', responsible: 'Project Management Team (PCO)', dept: 'ESH (PCO)', evidence: 'No issuance of Notice of Violations from DENR/LGU or any regulatory bodies on Environmental Compliance.\n\nConsolidated masterlist of ALOR (Environmental) with percentage of compliance' },
        { cat: '', goal: 'E3. Enhance awareness on environmental sustainability', objective: 'Develop an environmentally-conscious workforce and promote sustainable practices.', target: 'Conduct an awareness/seminar on Environmental Sustainability for at least 70% of the SCIC workforce within 12 months.', responsible: 'Project Management Team (PCO)', dept: 'ESH (PCO)', evidence: 'Records of participation in sustainability programs such as clean-up drive, tree planting, circular economy strategies, as well as trainings.\nMemorandum of Understanding (MOU), Memorandum of Agreement (MOA) with NGO/LGU/Community for sustainable projects involving SCIC.' },
        { cat: 'OCCUPATIONAL HEALTH & SAFETY', goal: 'S1. Enhance Occupational Safety and Health Culture in the Workplace', objective: 'Increase Awareness on Occupational Safety and Health protocols', target: 'Ensure that 100% of employees completed the mandatory OSH and other safety related trainings', responsible: 'Project Management Team (Safety Officers, Health Personnel)', dept: 'ESH (Safety Officers & Nurse)', evidence: 'Percentage of implementation on the conduct of OSH Mandatory and other safety related trainings' },
        { cat: '', goal: 'S2. Compliance to applicable legal and other requirements on Occupational Safety and Health', objective: 'Monitoring of Compliance level to all applicable regulations on safety and health', target: 'ZERO Notice of Violation/complaints from Regulatory Bodies and relevant interested parties', responsible: 'Project Management Team (Safety Officers, Health Personnel)', dept: 'ESH (Safety Officers & Nurse)', evidence: 'Record of NOV/complaints received from regulatory and other stakeholders' },
        { cat: '', goal: 'S3. Sustain the occupational safety & health performance', objective: 'Enhance the hazards identification and risks assessment and implement accurate controls to prevent occurrence of accidents and ill-health', target: 'ZERO Lost Time Accidents/Illnesses resulting to fatality or Total Disability', responsible: 'Project Management Team (Safety Officers, Health Personnel)', dept: 'ESH (Safety Officers & Nurse)', evidence: 'Consolidated ESH Statistics showing the LTA or fatality, if any' }
    ];

    var OTP_MON_ROWS = [
        { no: 1,  workProcess: 'Enhance the established environmental programs by promoting sustainable resource management', deliverables: '100% Implemention of environmental programs focused on sustainability', measure: 'waste minimization',           d025: '',                                                                                                     d050: 'partially Implemented', d075: '',                                                                                                                                               d100: 'fully implemented',       rating: 1 },
        { no: '',  workProcess: '', deliverables: '', measure: 'energy consumption reduction',                                                                                                                                                                 d025: '',                                                                                                     d050: 'partially Implemented', d075: '',                                                                                                                                               d100: 'fully implemented',       rating: 1 },
        { no: '',  workProcess: '', deliverables: '', measure: 'water conservation',                                                                                                                                                                           d025: '',                                                                                                     d050: 'partially Implemented', d075: '',                                                                                                                                               d100: 'fully implemented',       rating: 1 },
        { no: '',  workProcess: '', deliverables: '', measure: 'renewable energy utilization',                                                                                                                                                                 d025: '',                                                                                                     d050: 'partially Implemented', d075: '',                                                                                                                                               d100: 'fully implemented',       rating: 1 },
        { no: '',  workProcess: '', deliverables: '', measure: 'proper waste management.',                                                                                                                                                                     d025: '',                                                                                                     d050: 'partially Implemented', d075: '',                                                                                                                                               d100: 'fully implemented',       rating: 1 },
        { no: 2,  workProcess: 'Ensure compliance to applicable Environmental regulations',                deliverables: '100% compliance to Environmental regulations in every project sites, offices and facilities',  measure: 'No issuance of Notice of Violations from DENR/LGU or any regulatory bodies on Environmental Compliance.', d025: 'with issued violation',   d050: '',                      d075: '',                                                                                                                                               d100: 'without issued violations', rating: 1 },
        { no: 3,  workProcess: 'Enhance awareness on environmental sustainability',                        deliverables: 'Conduct an awareness/seminar on Environmental Sustainability for at least 70% of the SCIC workforce within 12 months.',               measure: 'Records of participation in sustainability programs such as clean-up drive, tree planting, circular economy strategies, as well as trainings.\nMemorandum of Understanding (MOU), Memorandum of Agreement (MOA) with NGO/LGU/Community for sustainable projects involving SCIC.', d025: 'no record of sustainability participation programs and training', d050: '', d075: 'Envi seminars and trainings attended by less than 70% of the total manpower, with participation in the sustainability program', d100: 'envi seminars and trainings attended by at least 70% and above of the total manpower and with participation in the sustainability program', rating: 1 },
        { no: 4,  workProcess: 'Enhance Occupational Safety and Health Culture in the Workplace',          deliverables: 'Ensure that 100% of employees completed the mandatory OSH and other safety related trainings',                                         measure: 'Percentage of implementation on the conduct of OSH Mandatory and other safety related trainings',           d025: 'conducted MESH up to 25% of total employees', d050: 'conducted MESH up to 50% of total employees', d075: 'conducted MESH up to 75% of total employees',                                                                   d100: 'conducted MESH up to 100% of total employees', rating: 1 },
        { no: 5,  workProcess: 'Compliance to applicable legal and other requirements on Occupational Safety and Health', deliverables: 'ZERO Notice of Violation/complaints from Regulatory Bodies and relevant interested parties',             measure: 'Record of NOV/complaints received from regulatory and other stakeholders',                               d025: 'with issued violations',                      d050: '',                      d075: '',                                                                                                                                               d100: 'without issued violations', rating: 1 },
        { no: 6,  workProcess: 'Sustain the occupational safety & health performance',                     deliverables: 'ZERO Lost Time Accidents/Illnesses resulting to fatality or Total Disability',                                                        measure: 'Consolidated ESH Statistics showing the LTA or fatality, if any',                                           d025: 'with record of LTA/I resulting to fatality',  d050: '',                      d075: '',                                                                                                                                               d100: 'without record of LTA/I resulting to fatality', rating: 1 }
    ];

    window.COMPLIANCE_GOALS = [
        { cat: 'ENVIRONMENTAL',               id: 'E1', goal: 'E1.   Enhance the established environmental programs by promoting sustainable resource management', target: '100% Implemention of environmental programs focused on sustainability such as waste minimization, energy consumption reduction, water conservation, renewable energy utilization and proper waste management.', responsible: 'Project Management Team (PCO)', evidence: 'Consolidated implementation of environmental programs in all project sites' },
        { cat: '',                             id: 'E2', goal: 'E2. Ensure compliance to applicable Environmental regulations', target: '100% compliance to Environmental regulations in every project sites, offices and facilities', responsible: 'Project Management Team (PCO)', evidence: 'No issuance of Notice of Violations from DENR/LGU or any regulatory bodies on Environmental Compliance.\n\nConsolidated masterlist of ALOR (Environmental) with percentage of compliance' },
        { cat: '',                             id: 'E3', goal: 'E3. Enhance awareness on environmental sustainability', target: 'Conduct an awareness/seminar on Environmental Sustainability for at least 70% of the SCIC workforce within 12 months.', responsible: 'Project Management Team (PCO)', evidence: 'Records of participation in sustainability programs such as clean-up drive, tree planting, circular economy strategies, as well as trainings.\nMemorandum of Understanding (MOU), Memorandum of Agreement (MOA) with NGO/LGU/Community for sustainable projects involving SCIC.' },
        { cat: 'OCCUPATIONAL HEALTH & SAFETY', id: 'S1', goal: 'S1. Enhance Occupational Safety and Health Culture in the Workplace', target: 'Ensure that 100% of employees completed the mandatory OSH and other safety related trainings', responsible: 'Project Management Team (Safety Officers, Health Personnel)', evidence: 'Percentage of implementation on the conduct of OSH Mandatory and other safety related trainings' },
        { cat: '',                             id: 'S2', goal: 'S2. Compliance to applicable legal and other requirements on Occupational Safety and Health', target: 'ZERO Notice of Violation/complaints from Regulatory Bodies and relevant interested parties', responsible: 'Project Management Team (Safety Officers, Health Personnel)', evidence: 'Record of NOV/complaints received from regulatory and other stakeholders' },
        { cat: '',                             id: 'S3', goal: 'S3. Sustain the occupational safety & health performance', target: 'ZERO Lost Time Accidents/Illnesses resulting to fatality or Total Disability', responsible: 'Project Management Team (Safety Officers, Health Personnel)', evidence: 'Consolidated ESH Statistics showing the LTA or fatality, if any' }
    ];

    window.GOAL_MEASURES = {
        E1: ['Consolidated implementation of environmental programs in all project sites'],
        E2: ['No issuance of Notice of Violations from DENR/LGU or any regulatory bodies on Environmental Compliance.'],
        E3: ['Records of participation in sustainability programs (clean-up drive, tree planting, etc.) MOU/MOA with NGO/LGU/Community.'],
        S1: ['Percentage of implementation on the conduct of OSH Mandatory and other safety related trainings'],
        S2: ['Record of NOV/complaints received from regulatory and other stakeholders'],
        S3: ['Consolidated ESH Statistics showing the LTA or fatality, if any']
    };

    function gotKey(goalId, mIdx) { return 'got_' + goalId + '_' + mIdx; }
    window.gotGetCell = function gotGetCell(proj, goalId, mIdx, month) {
        var k = gotKey(goalId, mIdx);
        if (!proj.vals[k]) return { r: '', rem: '' };
        var raw = proj.vals[k][month];
        if (!raw) return { r: '', rem: '' };
        if (typeof raw === 'object') return raw;
        try { return JSON.parse(raw); } catch(e) { return { r: String(raw), rem: '' }; }
    }
    window.gotSaveCell = function(pName, goalId, mIdx, month, field, val) {
        var proj = state.projects.find(function(p){ return p.name === pName; });
        if (!proj) return;
        var k = gotKey(goalId, mIdx);
        if (!proj.vals[k]) proj.vals[k] = new Array(13).fill(null);
        var existing = proj.vals[k][month];
        var cell = { r: '', rem: '' };
        if (existing && typeof existing === 'object') cell = existing;
        else if (existing) { try { cell = JSON.parse(existing); } catch(e) { cell = { r: String(existing), rem: '' }; } }
        cell[field] = val;
        proj.vals[k][month] = cell;
        if (typeof markPendingSync === 'function') markPendingSync();
        _gotRefreshAvg(proj, goalId, mIdx);
    };
    function gotMeasureAvg(proj, goalId, mIdx) {
        var selYear = (state && state.selectedYear) || new Date().getFullYear();
        var vals = [];
        for (var m = 1; m <= 12; m++) {
            if (isMonthBlacklistedForProject(proj, m, selYear)) continue; // skip frozen months
            var v = parseFloat(gotGetCell(proj, goalId, mIdx, m).r);
            if (!isNaN(v) && v > 0) vals.push(v);
        }
        return vals.length ? vals.reduce(function(a,b){return a+b;},0) / vals.length : null;
    }
    function gotGoalProjectAvg(proj, goalId) {
        var measures = GOAL_MEASURES[goalId] || [];
        var avgs = measures.map(function(_, mi){ return gotMeasureAvg(proj, goalId, mi); }).filter(function(v){ return v !== null; });
        return avgs.length ? avgs.reduce(function(a,b){return a+b;},0) / avgs.length : null;
    }
    function gotOverallAvg(projs) {
        if (!projs || !projs.length) return null;
        var ids = ['E1','E2','E3','S1','S2','S3'];
        var totalSlots = 0;
        var totalSum   = 0;
        var anyEntered = false;
        var selYear = (state && state.selectedYear) || new Date().getFullYear();
        projs.forEach(function(proj) {
            if (isProjectOnStoppage(proj)) return; // skip fully stopped projects
            ids.forEach(function(id) {
                var measures = GOAL_MEASURES[id] || [''];
                measures.forEach(function(_, mi) {
                    var curMonth = new Date().getMonth() + 1; // 1-based
                    for (var m = 1; m <= curMonth; m++) {
                        if (isMonthBlacklistedForProject(proj, m, selYear)) continue; // skip frozen months
                        totalSlots++;
                        var raw = gotGetCell(proj, id, mi, m).r;
                        var v   = parseFloat(raw);
                        if (!isNaN(v) && raw !== '' && raw !== null && raw !== undefined) {
                            totalSum  += v;
                            anyEntered = true;
                        }
                    }
                });
            });
        });
        return (anyEntered && totalSlots > 0) ? totalSum / totalSlots : null;
    }
    function fmtAvg(v) { return v !== null ? (v * 100).toFixed(1) + '%' : '—'; }
    function avgClr(v) {
        if (v === null) return '#aaa';
        if (v >= 1.00) return '#1b5e20';
        if (v >= 0.75) return '#388e3c';
        if (v >= 0.50) return '#e65100';
        return '#c62828';
    }
    function ratingCls(r) {
        var v = parseFloat(r);
        if (isNaN(v) || r === '') return '';
        if (v >= 1.00) return 'got-r100';
        if (v >= 0.75) return 'got-r075';
        if (v >= 0.50) return 'got-r050';
        return 'got-r025';
    }
    function _gotRefreshAvg(proj, goalId, mIdx) {
        var esc = CSS.escape(proj.name);
        var mEl = document.getElementById('got-mavg-' + esc + '-' + goalId + '-' + mIdx);
        if (mEl) { var mv = gotMeasureAvg(proj, goalId, mIdx); mEl.textContent = fmtAvg(mv); mEl.style.color = avgClr(mv); }
    }
    function escQ(s) { return (s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }

    function renderTabStrip() {
        return window.tabStrip([
            { key: 'tab3', label: 'Compliance Monitoring', icon: 'fa-chart-bar'  },
            { key: 'tab2', label: 'OTP Monitoring',        icon: 'fa-list-check' },
            { key: 'tab1', label: 'OTP ESH',               icon: 'fa-book-open'  }
        ], _gotTab, 'gotSetTab', 'margin:0 16px 14px;');
    }

    function renderTab1() {
        var CAT_CLS  = { 'ENVIRONMENTAL': 'otp-env', 'OCCUPATIONAL HEALTH & SAFETY': 'otp-ohs' };
        var CAT_ICON = { 'ENVIRONMENTAL': 'fa-leaf', 'OCCUPATIONAL HEALTH & SAFETY': 'fa-hard-hat' };
        function nl2br(s) { return (s || '').split('\n').join('<br>'); }

        var h = '<div class="otp-box"><table class="otp-tbl otp-esh-tbl">';
        h += '<colgroup><col style="width:22%"><col style="width:17%"><col style="width:22%"><col style="width:11%"><col style="width:8%"><col style="width:20%"></colgroup>';
        h += '<thead><tr><th>Goal</th><th>Objective</th><th>Target</th><th>Responsible</th><th>Dept.</th><th>Evidence</th></tr></thead><tbody>';

        var currentCat = '';
        OTP_ESH_ROWS.forEach(function(row) {
            if (row.cat) {
                currentCat = row.cat;
                h += '<tr class="otp-sec ' + (CAT_CLS[currentCat] || 'otp-env') + '"><td colspan="6">'
                   + '<i class="fas ' + (CAT_ICON[currentCat] || 'fa-leaf') + '"></i> ' + currentCat + '</td></tr>';
            }
            h += '<tr>'
               + '<td class="otp-goal">' + (row.goal || '') + '</td>'
               + '<td>' + nl2br(row.objective) + '</td>'
               + '<td>' + nl2br(row.target) + '</td>'
               + '<td>' + nl2br(row.responsible) + '</td>'
               + '<td>' + nl2br(row.dept) + '</td>'
               + '<td>' + nl2br(row.evidence) + '</td>'
               + '</tr>';
        });

        h += '</tbody></table></div>';
        return h;
    }

    function renderTab2() {
        var h = '<div class="otp-box"><table class="otp-tbl otp-mon-tbl">';
        h += '<colgroup><col style="width:3%"><col style="width:19%"><col style="width:19%"><col style="width:20%">'
           + '<col style="width:10%"><col style="width:10%"><col style="width:10%"><col style="width:9%"></colgroup>';

        h += '<thead>'
           + '<tr><th rowspan="2"></th><th colspan="3" class="otp-c">Key performance measures</th><th colspan="4" class="otp-c">Key performance indicator</th></tr>'
           + '<tr><th>Work Process</th><th>Deliverables</th><th>Measure</th><th class="otp-c">25%</th><th class="otp-c">50%</th><th class="otp-c">75%</th><th class="otp-c">100%</th></tr>'
           + '<tr class="otp-remarks"><th colspan="8">Remarks: state specific reason for non-compliance</th></tr>'
           + '</thead><tbody>';

        var prevNo = null, noSpan = {};
        OTP_MON_ROWS.forEach(function(r) { if (r.no !== '') { prevNo = r.no; noSpan[r.no] = 1; } else if (prevNo !== null) { noSpan[prevNo]++; } });

        var grp = -1;
        OTP_MON_ROWS.forEach(function(row) {
            var isGroupStart = row.no !== '';
            if (isGroupStart) { prevNo = row.no; grp++; }
            var shade = (grp % 2 === 1) ? ' class="otp-alt"' : '';

            h += '<tr' + shade + '>';
            if (isGroupStart) {
                var rs = ' rowspan="' + noSpan[prevNo] + '"';
                h += '<td' + rs + ' class="otp-no">' + row.no + '</td>';
                h += '<td' + rs + '>' + (row.workProcess || '') + '</td>';
                h += '<td' + rs + '>' + (row.deliverables || '').replace(/\n/g, '<br>') + '</td>';
            }
            h += '<td class="otp-measure">' + (row.measure || '').replace(/\n/g, '<br>') + '</td>';
            h += '<td class="otp-s25' + (row.d025 ? '' : ' otp-none') + '">' + (row.d025 || '\u2014') + '</td>';
            h += '<td class="otp-s50' + (row.d050 ? '' : ' otp-none') + '">' + (row.d050 || '\u2014') + '</td>';
            h += '<td class="otp-s75' + (row.d075 ? '' : ' otp-none') + '">' + (row.d075 || '\u2014') + '</td>';
            h += '<td class="otp-rating">' + (row.rating !== undefined && row.rating !== '' ? (row.rating * 100).toFixed(0) + '%' : '\u2014') + '</td>';
            h += '</tr>';
        });

        h += '<tr class="otp-total"><td colspan="7">Average Rating</td><td class="otp-rating">100%</td></tr>';
        h += '</tbody></table></div>';
        return h;
    }

    function renderTab3(allProjects, userEmail, canEdit) {
        var h = '';

        var presentRegions = GOT_REGION_ORDER.filter(function(reg) {
            if (reg === 'CORPORATE' || reg === 'PLANT OPERATIONS') return false;
            return allProjects.some(function(p) { return p.region === reg; });
        });

        presentRegions.forEach(function(reg) {
            // Exclude work-stoppage projects from GOT (unless resumed)
            var projs = allProjects.filter(function(p){ return p.region === reg && !isProjectOnStoppage(p) && !p.dateFinished; });
            var regProjsAll = allProjects.filter(function(p){ return p.region === reg; });
            if (!regProjsAll.length) return;
            var _selYr = state.selectedYear || new Date().getFullYear();
            var _cy = new Date().getFullYear(), _curMo = new Date().getMonth() + 1;
            var monthInfos = [];
            for (var _m = 1; _m <= _gotMaxMonth(_selYr); _m++) {
                var _inf = _gotMonthInfo(regProjsAll, _m, _selYr);
                if (_inf.eligible.length) monthInfos.push(_inf);
            }
            var _doneMonths = monthInfos.filter(function(i){ return i.complete === i.eligible.length; }).length;

            var isCollapsed = !!_gotCollapsed[reg];
            var canEditReg  = state.isEditing && UserAccounts.canEdit(userEmail, reg) && UserAccounts.canEditTab(userEmail, 'got-monitoring');
            var regAll      = gotOverallAvg(regProjsAll);
            var safeReg     = reg.replace(/[^a-zA-Z0-9]/g, '_');

            var REG_CLR = {
                'NCR':                 { a: '#1b5e20', b: '#0d3311' },
                'NORTH LUZON':         { a: '#2e7d32', b: '#1b5020' },
                'SOUTH LUZON':         { a: '#388e3c', b: '#1f5e23' },
                'VISAYAS & MINDANAO':  { a: '#43a047', b: '#2a6b2e' }
            };
            var _rc = REG_CLR[reg] || { a: '#2e7d32', b: '#1b5020' };

            h += '<div>';

            // Region banner — same markup/classes as KPM region banner
            h += window.regionBanner({ id: 'got-rbanner-' + reg, reg: reg, icon: 'fa-location-dot', onclick: "gotToggleRegion('" + escQ(reg) + "',event)", collapsed: isCollapsed, editable: canEditReg,
                right: '<span class="rbadge rbadge-count rb-proj">' + projs.length + ' PROJ</span>'
                    + (monthInfos.length ? '<span class="rbadge" style="background:rgba(255,255,255,0.18);color:#c8e6c9;">' + _doneMonths + '/' + monthInfos.length + ' complete</span>' : '') }); // end banner

            // Region content — compact project list
            h += '<div id="got-rcontent-' + reg + '" class="region-content ' + (isCollapsed ? 'collapsed' : '') + '">';

            if (!monthInfos.length) {
                h += '<div style="padding:18px;text-align:center;color:#aaa;font-size:0.76rem;font-style:italic;"><i class="fas fa-inbox" style="margin-right:6px;"></i>No months to report yet for this region.</div>';
            }

            monthInfos.forEach(function(inf) {
                var m       = inf.month;
                var n       = inf.eligible.length;
                var allDone = inf.complete === n;
                var isPast  = (_selYr < _cy) || (_selYr === _cy && m < _curMo);
                var sc      = inf.score;
                var scCls   = sc === null ? (isPast ? 'r' : 'n') : sc >= 0.90 ? 'g' : sc >= 0.75 ? 'a' : 'r';
                var scLabel = sc !== null ? fmtAvg(sc) : (isPast ? 'MISSED' : 'NO DATA');

                var chips = '';
                if (allDone) chips = window._rowStatus('ok', 'All ' + n + ' project' + (n !== 1 ? 's' : '') + ' complete', '', false);
                else {
                    if (inf.complete) chips += window._rowStatus('ok', inf.complete + ' complete', '', true);
                    if (inf.partial)  chips += window._rowStatus('part', inf.partial + ' partial', inf.partialNames.join(', '), true);
                    if (inf.missing)  chips += window._rowStatus('none', inf.missing + ' not filled', inf.missingNames.join(', '), true);
                }

                h += '<div class="ckpm-rw" onclick="window.openGotMonthDialog(\'' + escQ(reg) + '\',' + m + ',false)">';
                h += '<span class="ckpm-mo">' + GOT_M[m - 1].charAt(0) + GOT_M[m - 1].slice(1).toLowerCase() + '</span>';
                h += '<div class="ckpm-fl">' + chips + '</div>';
                h += '<div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">';
                h += '<span class="ckpm-pc ' + scCls + '">' + scLabel + '</span>';
                if (canEditReg) {
                    h += '<button onclick="event.stopPropagation();window.openGotMonthDialog(\'' + escQ(reg) + '\',' + m + ',true)"'
                       + ' title="Edit" style="background:#e3f2fd;color:#1565c0;border:1px solid #90caf9;border-radius:5px;padding:3px 8px;font-size:0.62rem;font-weight:700;cursor:pointer;">'
                       + '<i class="fas fa-pen"></i></button>';
                }
                h += '</div>';
                h += '</div>'; // end month row
            });

            h += '</div>'; // end region content
            h += '</div>'; // end card
        });

        if (!allProjects.length) {
            h += '<div style="text-align:center;padding:40px;color:var(--text-secondary);"><i class="fas fa-database" style="font-size:2rem;margin-bottom:10px;display:block;opacity:0.3;"></i>No projects loaded yet.</div>';
        }
        return h;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // GOT — PER-MONTH VIEW  (Region → Months → Projects inside), same idea
    // as the KPM report. Every month from JAN up to the current month is
    // listed, so a month that was never filled out is flagged right away.
    // ═══════════════════════════════════════════════════════════════════════
    var GOT_M_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    var _gotMonthCtx = null; // { reg, month, names[], canEdit } for the open month dialog

    function _gotEsc(s) {
        return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    // Last month (1-based) that should be listed for the selected year
    // The current month (and any later month) is not open for GOT yet — it opens once it is over.
    // lag 1 → in October, January–September are listed; October opens on 1 November.
    var GOT_OPEN_LAG_MONTHS = 1;
    function _gotMaxMonth(selYr) {
        var now = new Date(), cy = now.getFullYear();
        if (selYr < cy) return 12;
        if (selYr > cy) return 0;
        return Math.max(0, now.getMonth() + 1 - GOT_OPEN_LAG_MONTHS);
    }

    // Flat list of every rating slot (goal x measure)
    function _gotSlots() {
        var s = [];
        COMPLIANCE_GOALS.forEach(function(g) {
            (GOAL_MEASURES[g.id] || ['']).forEach(function(_, mi) { s.push({ g: g, mi: mi }); });
        });
        return s;
    }

    function _gotFindProj(name) {
        return (state.projects || []).find(function(p) { return p.name === name; });
    }

    // How many slots a project filled for one month, and the sum of its ratings
    function _gotProjMonth(proj, m) {
        var slots = _gotSlots(), filled = 0, sum = 0;
        slots.forEach(function(s) {
            var raw = gotGetCell(proj, s.g.id, s.mi, m).r;
            var v = parseFloat(raw);
            if (raw !== '' && raw !== null && raw !== undefined && !isNaN(v)) { filled++; sum += v; }
        });
        return { filled: filled, total: slots.length, sum: sum };
    }

    // Region-level summary for one month (only projects that are required that month)
    function _gotMonthInfo(projs, m, selYr) {
        var eligible = projs.filter(function(p) { return !isMonthBlacklistedForProject(p, m, selYr); });
        var complete = 0, partial = 0, missing = 0, sum = 0, total = 0, any = false;
        var missingNames = [], partialNames = [];
        eligible.forEach(function(p) {
            var pm = _gotProjMonth(p, m);
            total += pm.total; sum += pm.sum;
            if (pm.filled === 0) { missing++; missingNames.push(p.name); }
            else {
                any = true;
                if (pm.filled === pm.total) complete++;
                else { partial++; partialNames.push(p.name); }
            }
        });
        return {
            month: m, eligible: eligible, complete: complete, partial: partial, missing: missing,
            missingNames: missingNames, partialNames: partialNames,
            score: (any && total > 0) ? sum / total : null, anyData: any
        };
    }

    function _gotChip(txt, bg, fg, title) {
        return '<span' + (title ? ' title="' + _gotEsc(title) + '"' : '')
             + ' style="background:' + bg + ';color:' + fg + ';border-radius:9px;padding:1px 8px;font-size:0.6rem;font-weight:700;white-space:nowrap;">' + txt + '</span>';
    }

    function _gotStatusHtml(pm) {
        if (pm.filled === 0)              return _gotChip('✖ Not filled', '#ffebee', '#c62828');
        if (pm.filled === pm.total)       return '';
        return _gotChip('◐ ' + pm.filled + '/' + pm.total, '#fff3e0', '#e65100');
    }

    window.gotCloseMonthDialog = function() {
        var m = document.getElementById('got-compliance-modal');
        if (m) m.remove();
        _gotMonthCtx = null;
        if (state.currentTab === 'got-monitoring' && typeof window.renderGotMonitoring === 'function') window.renderGotMonitoring();
    };

    // ── GOT Month Dialog: all projects of a region for ONE month ────────────
    window.openGotMonthDialog = function(reg, month, editMode) {
        var allProjects = (typeof getReportProjects === 'function') ? getReportProjects() : (state.projects || []);
        var regProjs = allProjects.filter(function(p) { return p.region === reg; });
        if (!regProjs.length) return;

        var selYr     = state.selectedYear || new Date().getFullYear();
        month = Math.min(Math.max(parseInt(month, 10) || 1, 1), 12);
        var userEmail = state.currentUser ? state.currentUser.email : '';
        var hasPerm   = UserAccounts.canEdit(userEmail, reg) && UserAccounts.canEditTab(userEmail, 'got-monitoring');
        var canEdit   = !!editMode && hasPerm;

        // Auto-enable edit mode (same behaviour as the other dialogs)
        if (canEdit && !state.isEditing) {
            state.isEditing = true;
            document.body.classList.add('is-editing');
            var _fb = document.getElementById('floating-edit-btn');
            var _fi = document.getElementById('floating-edit-icon');
            var _ft = document.getElementById('floating-edit-tooltip');
            if (_fb) { _fb.classList.add('save-mode'); _fb.setAttribute('onclick', 'saveData()'); }
            if (_fi) _fi.className = 'fas fa-save';
            if (_ft) _ft.textContent = 'Click to Save';
        }

        // Projects not yet started, or declared finished in/before this month, are hidden from the columns
        var colProjs = regProjs.filter(function(p) { return !isProjectHiddenForMonth(p, month, selYr); });
        _gotMonthCtx = { reg: reg, month: month, names: colProjs.map(function(p) { return p.name; }), canEdit: canEdit };

        var existing = document.getElementById('got-compliance-modal');
        if (existing) existing.remove();

        var info     = _gotMonthInfo(colProjs, month, selYr);

        var modal = document.createElement('div');
        modal.id = 'got-compliance-modal';

        window.eshMountModal(modal, {
            id: 'got-compliance-modal', icon: 'fa-bullseye', width: 'min(1600px,98vw)', bodyFlex: true,
            closeJs: 'window.gotCloseMonthDialog()',
            title: (canEdit ? 'Edit compliance' : 'View compliance') + ' — <span id="gotm-title-month" style="color:#2e7d32;">' + GOT_M_FULL[month - 1] + ' ' + selYr + '</span>',
            sub: window.eshModalSub({ loc: reg, count: info.eligible.length }),
            body: ''
            // Info bar
            + window.eshInfoBar({
                icon: 'fa-bullseye',
                label: 'Goals, Objectives &amp; Targets — all projects in region',
                items: [window.eshInfoField({ icon: 'fa-gauge-high', label: 'Region score:',
                    html: window.eshPill({ id: 'gotm-title-score', text: fmtAvg(info.score), tone: window.eshToneOf(info.score) }) })],
                hint: 'Scroll table horizontally'
            })
            // Table
            + '<div style="overflow-x:auto;max-height:75vh;overflow-y:auto;background:var(--bg-card);">'
            + _gotBuildMonthTable(colProjs, month, selYr, canEdit)
            + '</div>'
            // Legend
            + '<div style="padding:6px 16px;background:#f9fdf9;border-top:1px solid #c8e6c9;display:flex;gap:14px;flex-wrap:wrap;align-items:center;">'
            + '<span style="font-size:0.59rem;color:#c62828;font-weight:700;">25% = Started</span>'
            + '<span style="font-size:0.59rem;color:#e65100;font-weight:700;">50% = Partial</span>'
            + '<span style="font-size:0.59rem;color:#558b2f;font-weight:700;">75% = Mostly Done</span>'
            + '<span style="font-size:0.59rem;color:#2e7d32;font-weight:700;">100% = Fully Implemented</span>'
            + '<span style="font-size:0.59rem;color:#c62828;font-weight:600;margin-left:auto;">Pink cell = not yet filled</span>'
            + '</div>'
            , foot: '' });
    };

    function _gotBuildMonthTable(regProjs, month, selYr, canEdit) {
        var slots = _gotSlots();
        var nP    = regProjs.length;

        // Which projects are required this month (and why not, if they aren't)
        var elig = regProjs.map(function(p) { return !isMonthBlacklistedForProject(p, month, selYr); });
        var why  = regProjs.map(function(p, pi) {
            if (elig[pi]) return '';
            if (isMonthBeforeProjectStart(p, month, selYr)) return 'Project not yet started — starts ' + formatDateDMY(p.dateStarted) + '. Not required.';
            if (isProjectFinishedForMonth(p, month, selYr)) return 'Project finished' + (p.dateFinished ? ' (' + formatDateDMY(p.dateFinished) + ')' : '') + '. Not required.';
            return getMonthExemptTip(p, month, selYr);
        });

        var h = '<table class="got-tbl got-tbl-pill" style="width:auto;border-collapse:collapse;min-width:100%;">';
        h += '<thead style="position:sticky;top:0;z-index:4;"><tr>';
        h += '<th class="got-th-dark got-th-left" style="position:sticky;left:0;z-index:5;min-width:150px;max-width:150px;white-space:normal;box-shadow:2px 0 4px rgba(0,0,0,0.08);">GOALS</th>';
        h += '<th class="got-th-dark got-th-left" style="position:sticky;left:150px;z-index:5;min-width:210px;max-width:210px;white-space:normal;">TARGETS</th>';
        h += '<th class="got-th-dark got-th-left" style="position:sticky;left:360px;z-index:5;min-width:115px;max-width:115px;white-space:normal;">RESPONSIBLE</th>';
        h += '<th class="got-th-dark got-th-left" style="position:sticky;left:475px;z-index:5;min-width:190px;max-width:190px;white-space:normal;box-shadow:3px 0 6px rgba(0,0,0,0.12);">EVIDENCE OF IMPLEMENTATION</th>';
        regProjs.forEach(function(p, pi) {
            h += '<th class="got-th-dark" title="' + _gotEsc(elig[pi] ? p.name : p.name + ' — ' + why[pi]) + '"'
               + ' style="width:150px;min-width:150px;max-width:150px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;vertical-align:middle;' + (elig[pi] ? '' : 'background:#e0e0e0;color:#888;') + '">'
               + (p.isRenewable ? window.icon("leaf") : '') + _gotEsc(p.name)
               + '</th>';
        });
        h += '<th class="got-th-dark" style="white-space:nowrap;font-size:0.59rem;">AVG</th>';
        h += '</tr></thead><tbody>';

        var si = 0, prevCat = '';
        COMPLIANCE_GOALS.forEach(function(g) {
            var gCat   = g.id.charAt(0) === 'E' ? 'ENVIRONMENTAL' : 'OCCUPATIONAL HEALTH & SAFETY';
            var cColor = 'var(--text-primary)';
            var cBg    = '#e3eee5';
            var rowBg  = 'var(--bg-card)';
            if (gCat !== prevCat) {
                prevCat = gCat;
                h += '<tr style="background:' + cBg + ';"><td colspan="' + (nP + 5) + '" style="text-align:left;font-weight:800;font-size:0.67rem;color:' + cColor + ';padding:4px 10px;background:' + cBg + ';">'
                   + '<span style="position:sticky;left:7px;display:inline-block;white-space:nowrap;">'
                   + '<i class="fas ' + (gCat === 'ENVIRONMENTAL' ? 'fa-leaf' : 'fa-hard-hat') + '" style="margin-right:5px;"></i>' + gCat + '</span></td></tr>';
            }
            var measures = GOAL_MEASURES[g.id] || [''];
            measures.forEach(function(measure, mi) {
                h += '<tr>';
                if (mi === 0) {
                    var rs = ' rowspan="' + measures.length + '"';
                    h += '<td' + rs + ' style="position:sticky;left:0;z-index:2;text-align:left;font-weight:700;color:' + cColor + ';vertical-align:top;white-space:normal;min-width:150px;max-width:150px;background:' + rowBg + ';box-shadow:2px 0 4px rgba(0,0,0,0.06);">' + _gotEsc(g.goal || g.id) + '</td>';
                    h += '<td' + rs + ' style="position:sticky;left:150px;z-index:2;text-align:left;vertical-align:top;white-space:normal;min-width:210px;max-width:210px;background:' + rowBg + ';">' + _gotEsc(g.target || '') + '</td>';
                    h += '<td' + rs + ' style="position:sticky;left:360px;z-index:2;vertical-align:top;white-space:normal;min-width:115px;max-width:115px;background:' + rowBg + ';">' + _gotEsc(g.responsible || '') + '</td>';
                }
                h += '<td style="position:sticky;left:475px;z-index:2;text-align:left;vertical-align:top;white-space:normal;min-width:190px;max-width:190px;background:' + rowBg + ';box-shadow:3px 0 6px rgba(0,0,0,0.08);">' + _gotEsc(measure) + '</td>';

                var mySi = si++;
                regProjs.forEach(function(p, pi) {
                    if (!elig[pi]) {
                        h += '<td class="got-td-month" style="background:#eeeeee;cursor:not-allowed;" title="' + _gotEsc(why[pi]) + '">'
                           + '<select class="got-sel" disabled style="background:#e0e0e0;color:#bbb;border-color:#ddd;cursor:not-allowed;"><option>—</option></select></td>';
                        return;
                    }
                    var cell = gotGetCell(p, g.id, mi, month);
                    var cls  = 'got-td-month' + (cell.r ? ' ' + ratingCls(cell.r) : '');
                    h += '<td id="gotm-c-' + pi + '-' + mySi + '" class="' + cls + '"' + (cell.r ? '' : ' style="background:rgba(239,83,80,0.14);"') + '>';
                    h += '<select class="got-sel"' + (canEdit ? '' : ' disabled') + ' onchange="window._gotMonthSet(' + pi + ',' + mySi + ',this.value)">';
                    h += '<option value="">—</option>';
                    [['0.25','25%'],['0.50','50%'],['0.75','75%'],['1.00','100%']].forEach(function(rv) {
                        h += '<option value="' + rv[0] + '"' + (cell.r === rv[0] ? ' selected' : '') + '>' + rv[1] + '</option>';
                    });
                    h += '</select></td>';
                });
                h += '<td id="gotm-ga-' + mySi + '" class="got-td-avg" style="white-space:nowrap;">—</td>';
                h += '</tr>';
            });
        });

        // Overall row: one average per project + region average
        h += '<tr class="got-tr-overall"><td colspan="4" style="position:sticky;left:0;z-index:2;text-align:right;padding:5px 10px;background:#d3e6d8;box-shadow:3px 0 6px rgba(0,0,0,0.08);">OVERALL AVERAGE</td>';
        regProjs.forEach(function(p, pi) { h += '<td id="gotm-po-' + pi + '" style="font-weight:700;white-space:nowrap;">—</td>'; });
        h += '<td id="gotm-f-all" style="font-weight:800;white-space:nowrap;">—</td></tr>';
        h += '</tbody></table>';

        setTimeout(_gotMonthRefresh, 0); // fill averages once the table is in the DOM
        return h;
    }

    // One dropdown changed in the month dialog
    window._gotMonthSet = function(pi, si, val) {
        var ctx = _gotMonthCtx;
        if (!ctx || !ctx.canEdit) return;
        var s = _gotSlots()[si];
        if (!s) return;
        window.gotSaveCell(ctx.names[pi], s.g.id, s.mi, ctx.month, 'r', val);
        var td = document.getElementById('gotm-c-' + pi + '-' + si);
        if (td) {
            td.className = 'got-td-month' + (val ? ' ' + ratingCls(val) : '');
            td.style.background = val ? '' : 'rgba(239,83,80,0.14)';
        }
        _gotMonthRefresh();
    };

    // Recompute AVG column, per-project overall, region average, status chips, header score.
    // Blank counts as 0 (same method as the month list), so a missing entry lowers the score.
    function _gotMonthRefresh() {
        var ctx = _gotMonthCtx;
        if (!ctx) return;
        var selYr = state.selectedYear || new Date().getFullYear();
        var slots = _gotSlots();
        var projs = ctx.names.map(_gotFindProj);
        var elig  = projs.map(function(p) { return !!p && !isMonthBlacklistedForProject(p, ctx.month, selYr); });
        var nElig = elig.filter(Boolean).length;
        var allSum = 0, allAny = false;

        projs.forEach(function(p, pi) {
            if (!elig[pi]) return;
            var pm = _gotProjMonth(p, ctx.month);
            var sc = pm.filled ? pm.sum / pm.total : null;
            allSum += pm.sum; if (pm.filled) allAny = true;
            var po = document.getElementById('gotm-po-' + pi);
            if (po) { po.textContent = fmtAvg(sc); po.style.color = avgClr(sc); }
            var st = document.getElementById('gotm-st-' + pi);
            if (st) st.innerHTML = _gotStatusHtml(pm);
        });

        slots.forEach(function(s, si) {
            var sum = 0, any = false;
            projs.forEach(function(p, pi) {
                if (!elig[pi]) return;
                var raw = gotGetCell(p, s.g.id, s.mi, ctx.month).r, v = parseFloat(raw);
                if (raw !== '' && raw !== null && raw !== undefined && !isNaN(v)) { sum += v; any = true; }
            });
            var avg = (any && nElig) ? sum / nElig : null;
            var el = document.getElementById('gotm-ga-' + si);
            if (el) { el.textContent = fmtAvg(avg); el.style.color = avgClr(avg); }
        });

        var tot = (allAny && nElig) ? allSum / (nElig * slots.length) : null;
        var fa = document.getElementById('gotm-f-all');
        if (fa) { fa.textContent = fmtAvg(tot); fa.style.color = avgClr(tot); }
        window.eshSetPill('gotm-title-score', fmtAvg(tot), window.eshToneOf(tot));
    }

    function gotGoalProjectAvg2(proj) {
        var all = COMPLIANCE_GOALS.map(function(g){ return gotGoalProjectAvg(proj, g.id); }).filter(function(v){ return v !== null; });
        return all.length ? all.reduce(function(a,b){return a+b;},0)/all.length : null;
    }

    window.renderGotMonitoring = function() {
        var container = document.getElementById('got-monitoring-container');
        if (!container) return;
        var allProjects = getReportProjects();
        var canEdit   = true;
        var userEmail = state.currentUser ? state.currentUser.email : '';

        var html = '';

        (function buildGotSummary() {
            var targetRegs = ['NCR','SOUTH LUZON','NORTH LUZON','VISAYAS & MINDANAO'];
            var moShort    = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
            var curMoIdx   = new Date().getMonth(); // 0-based

            function getRegMonthScore(reg, moIdx) {
                var _gsYr = state.selectedYear || new Date().getFullYear();
                var projs = allProjects.filter(function(p){ return p.region === reg && !isProjectOnStoppage(p) && !isProjectFinishedForMonth(p, moIdx + 1, _gsYr); });
                if (!projs.length) return null;
                var month = moIdx + 1; // 1-based

                var totalSlots = 0;
                var totalSum   = 0;
                var anyEntered = false;

                projs.forEach(function(proj) {
                    COMPLIANCE_GOALS.forEach(function(g) {
                        var measures = GOAL_MEASURES[g.id] || [''];
                        measures.forEach(function(_, mi) {
                            totalSlots++;
                            var raw = gotGetCell(proj, g.id, mi, month).r;
                            var v   = parseFloat(raw);
                            if (!isNaN(v) && raw !== '' && raw !== null) {
                                totalSum  += v;
                                anyEntered = true;
                            }
                        });
                    });
                });

                return (anyEntered && totalSlots > 0) ? totalSum / totalSlots : null;
            }

            function cellBg(v){ return v >= 1.00 ? '#c8e6c9' : v >= 0.75 ? '#dcedc8' : v >= 0.50 ? '#fff9c4' : '#ffcdd2'; }
            function cellFg(v){ return v >= 1.00 ? '#1b5e20' : v >= 0.75 ? '#388e3c' : v >= 0.50 ? '#7a5c00' : '#c62828'; }

            var regData = targetRegs.map(function(reg){
                return moShort.map(function(_, mi){ return getRegMonthScore(reg, mi); });
            });

            var regAvg = regData.map(function(row){
                var vals = row.filter(function(v){ return v !== null; });
                return vals.length ? vals.reduce(function(s,v){return s+v;},0)/vals.length : null;
            });

            var moAvg = moShort.map(function(_, mi){
                var vals = regData.map(function(rd){ return rd[mi]; }).filter(function(v){ return v!==null; });
                return vals.length ? vals.reduce(function(s,v){return s+v;},0)/vals.length : null;
            });

            var allVals2 = regAvg.filter(function(v){ return v !== null; });
            var overallAvg = allVals2.length ? allVals2.reduce(function(s,v){return s+v;},0)/allVals2.length : null;

            function _pctSpan(v){ return '<strong class="rpt-pct ' + window.rptTone(v, 'got') + '">' + (v*100).toFixed(1) + '%</strong>'; }
            var recLines = [];
            targetRegs.forEach(function(reg, ri){
                var avg = regAvg[ri];
                if (avg !== null) {
                    if (avg < 0.50) recLines.push('<li><strong>' + reg + '</strong>: Score of ' + _pctSpan(avg) + ' is critically low. Immediate corrective action plan and management intervention required.</li>');
                    else if (avg < 0.75) recLines.push('<li><strong>' + reg + '</strong>: Score of ' + _pctSpan(avg) + ' needs improvement. Strengthen goal implementation and monitoring of deliverables.</li>');
                    else if (avg < 1.00) recLines.push('<li><strong>' + reg + '</strong>: Score of ' + _pctSpan(avg) + ' is on track. Continue monitoring to achieve 100% target compliance by year end.</li>');
                    else recLines.push('<li><strong>' + reg + '</strong>: Score of ' + _pctSpan(avg) + ' — fully compliant. Maintain performance and document best practices for replication.</li>');
                }
            });
            var minMoScore = null, minMoName = '';
            moAvg.forEach(function(s, mi){ if (s !== null && (minMoScore === null || s < minMoScore)){ minMoScore = s; minMoName = moShort[mi]; }});
            if (minMoScore !== null && minMoScore < 0.75) {
                recLines.push('<li><i class="fas fa-calendar-xmark" style="color:#c62828;margin-right:4px;"></i><strong>' + minMoName + '</strong> had the lowest overall average (' + _pctSpan(minMoScore) + '). Review root causes and address compliance gaps for that period.</li>');
            }

            var thCells = window.rptHead('Region', moShort, curMoIdx, true);
            var bodyRows = targetRegs.map(function(reg, ri){
                var cells = window.rptRowHead(reg, '');
                regData[ri].forEach(function(v, mi){ cells += window.rptTd(v, mi, curMoIdx, 'got'); });
                cells += window.rptAvgTd(regAvg[ri], 'got');
                return '<tr>' + cells + '</tr>';
            }).join('') + window.rptTotalRow('OVERALL AVG', moAvg, curMoIdx, overallAvg, 'got');

            var recsHtml = recLines.length
                ? '<ul class="ytd-list">' + recLines.join('').replace(/<i class="fas [^"]*"[^>]*><\/i>/g, '') + '</ul>'
                : '<p class="ytd-empty">No data available yet to generate recommendations.</p>';

            html += window.rptCard('',
                '<span class="rpt-sub-1l">Overall average compliance rating per region per month &bull; Rating: 25%=Started | 50%=Partial | 75%=Mostly Done | 100%=Fully Implemented</span>',
                '', thCells, bodyRows, 'got')
                + '<div class="ytd-card">'
                + '<div class="ytd-head">'
                + '<div class="ytd-title">GOALS, OBJECTIVES &amp; TARGETS — YTD SUMMARY</div>'
                + '<div class="ytd-sub">Recommendations based on year-to-date GOT performance across all regions</div>'
                + '</div>'
                + '<div class="ytd-recs">'
                + '<div class="ytd-recs-title">Recommendations</div>'
                + recsHtml
                + '</div></div>';
        })();

        html += renderTabStrip();

        if (_gotTab === 'tab1')      html += renderTab1();
        else if (_gotTab === 'tab2') html += renderTab2();
        else                         html += renderTab3(allProjects, userEmail, canEdit);

        container.innerHTML = html;
    };

})();
