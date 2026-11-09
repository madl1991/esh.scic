
async function exportCurrentTabToExcel() {
    const tab = state.currentTab;
    if (typeof ExcelJS === 'undefined') {
        showToast('Excel library not loaded. Refresh and try again.', 'error');
        return;
    }

    // Route to dedicated exporters for tabs that already have them
    if (tab === 'personnel')       { exportPersonnelExcel();       return; }
    if (tab === 'emb')             { exportEmbExcel();             return; }
    if (tab === 'corporate-kpm')   { exportCorporateKpmExcel();    return; }
    if (tab === 'kpm')             { exportKpmExcel();             return; }
    if (tab === 'dole')            { exportDoleExcel();            return; }
    if (tab === 'env-monitoring')  { exportEnvMonitoringExcel();   return; }

    const year  = state.selectedYear || new Date().getFullYear();
    const projs = getReportProjects();
    const title = (function _eTabTitleLocal(t){
        return ({
            'overall':'OVERALL ESH SUMMARY','rates':'ESH STATISTICS RATES',
            'exposures':'SAFETY EXPOSURES & MANHOURS','medical':'ACCIDENT / INCIDENT RECORD',
            'activities':'ESH ACTIVITIES AND PROGRAMS','nov':'OSH REGULATORY ISSUED NOV',
            'nov-env':'ENVIRONMENTAL REGULATORY ISSUED NOV','dole':'DOLE REPORTORIAL',
            'permits':'ENVIRONMENTAL PERMITS / LICENSES / CLEARANCE',
            'cshp':'CONSTRUCTION SAFETY & HEALTH PROGRAM','reg':'DOLE CERTIFICATE OF REGISTRATION',
            'doe-permit':'DOE SAFETY OFFICER PERMIT','audit':'INTERNAL ESH AUDIT REPORT',
            'lta-registry':'INCIDENT AND ACCIDENT REGISTRY','tabulation':'INCIDENT / ACCIDENT TABULATION',
            'osh-requirement':'OSH PERSONNEL REQUIREMENT MONITORING',
            'got-monitoring':'GOALS, OBJECTIVES & TARGETS (GOT) MONITORING',
            'doe':'DOE REPORTORIAL - RENEWABLE ENERGY PROJECTS',
            'env-monthly-report':'ENVIRONMENTAL MONTHLY REPORT',
            'nov-monitoring':'NOV MONITORING',
            'esh-calendar-env':'ESH CALENDAR — ENVIRONMENTAL',
            'esh-calendar-safety':'ESH CALENDAR — SAFETY',
            'esh-calendar-health':'ESH CALENDAR — HEALTH',
            'esh-calendar-drills':'ESH CALENDAR — DRILLS',
            'esh-calendar-corp-drills':'ESH CALENDAR — CORPORATE DRILLS',
        })[t] || t.toUpperCase().replace(/-/g,' ');
    })(tab);

    showToast('Generating Excel file...', 'info');

    // ── Shared ExcelJS styles (matches exportPersonnelExcel palette) ──────────
    const C_HDR_BG  = '2E7D32';
    const C_BAN_BG  = '1B5E20';
    const C_TOT_BG  = 'E8F5E9';
    const C_ALT     = 'F1F8E9';
    const C_WHITE   = 'FFFFFFFF';
    const MO_SHORT  = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    const MO_LONG   = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const REGIONS   = ['NCR','SOUTH LUZON','NORTH LUZON','VISAYAS & MINDANAO'];

    function _xHdr(cell) {
        cell.font      = { bold:true, color:{argb:C_WHITE}, size:10, name:'Calibri' };
        cell.fill      = { type:'pattern', pattern:'solid', fgColor:{argb:'FF'+C_HDR_BG} };
        cell.alignment = { horizontal:'center', vertical:'middle', wrapText:true };
        cell.border    = { top:{style:'thin',color:{argb:'FF'+C_HDR_BG}}, bottom:{style:'thin',color:{argb:'FF'+C_HDR_BG}},
                           left:{style:'thin',color:{argb:'FF'+C_HDR_BG}}, right:{style:'thin',color:{argb:'FF'+C_HDR_BG}} };
    }
    function _xBan(cell, text) {
        cell.value     = text;
        cell.font      = { bold:true, color:{argb:C_WHITE}, size:10, name:'Calibri' };
        cell.fill      = { type:'pattern', pattern:'solid', fgColor:{argb:'FF'+C_BAN_BG} };
        cell.alignment = { horizontal:'left', vertical:'middle' };
    }
    function _xData(cell, align) {
        cell.font      = { size:9, name:'Calibri' };
        cell.alignment = { vertical:'middle', horizontal:align||'center', wrapText:false };
    }
    function _xAlt(row, colCount) {
        for (let ci = 1; ci <= colCount; ci++) {
            const c = row.getCell(ci);
            if (!c.fill || !c.fill.fgColor || c.fill.fgColor.argb === C_WHITE || !c.fill.fgColor.argb) {
                c.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FF'+C_ALT} };
            }
        }
    }
    function _xTitle(ws, text, colCount) {
        const cell     = ws.getCell('A1');
        cell.value     = text;
        cell.font      = { bold:true, color:{argb:C_WHITE}, size:13, name:'Calibri' };
        cell.fill      = { type:'pattern', pattern:'solid', fgColor:{argb:'FF'+C_BAN_BG} };
        cell.alignment = { horizontal:'center', vertical:'middle' };
        ws.mergeCells(1, 1, 1, colCount);
        ws.getRow(1).height = 24;
    }
    function _xSave(wb, tabName) {
        return eshDownloadXlsx(wb, 'SCIC_ESH_' + tabName.replace(/[^a-zA-Z0-9]/g,'_').toUpperCase()
                         + '_' + year + '_' + new Date().toISOString().slice(0,10) + '.xlsx').then(function() {
            showToast('Excel exported successfully!', 'success');
        });
    }

    // ── _SCHEMA monthly tabs: exposures, rates, medical, activities, nov, dole, env-monthly-report ──
    const _SCHEMA_LOCAL = {
        exposures:          ['Total Manpower','Total Exposed Manhour','Total Exposed Man-hour to date','No. of Days w/o LTA'],
        rates:              ['LTIR','TRIR','SEVERITY RATE'],
        medical:            ['Medical Treatment','First Aid','LTA','Fatality','High-Potential incident','Dangerous Occurrences','Days Lost/Charged'],
        nov:                ['OSH Internal Issues','OSH External Issues'],
        activities:         ['No. of ESH Committee Conducted','No. of ESH inspection','No. of Identified Near-Miss','Drills Conducted','Training Conducted'],
        dole:               ['WAIR','RSO','MOM','AEDR','AMR'],
        'env-monthly-report':['Environmental Monthly Report (EMR)'],
    };

    function _v(proj, key, idx) {
            if (key === 'activities_No. of Identified Near-Miss') key = 'medical_No. of Identified Near-Miss';
        const arr = proj && proj.vals && proj.vals[key];
        if (!Array.isArray(arr)) return '';
        const v = arr[idx];
        return (v === null || v === undefined) ? '' : String(v);
    }
    function _ytd(proj, key, capMo) {
        const cap = capMo || 12;
        let s = 0, any = false;
        for (let m = 1; m <= cap; m++) { const n = parseFloat(_v(proj,key,m)); if (!isNaN(n)){s+=n;any=true;} }
        return any ? s : '';
    }

    try {
    // ════════════════════════════════════════════════════════════════════════
    // TOTAL EXPOSURES — monthly per sheet
    // ════════════════════════════════════════════════════════════════════════
    if (tab === 'exposures') {
        // ── Measure definitions with individual color theming ─────────────────
        const EXP_MEASURES = [
            { key: 'Total Manpower',                label: 'Total Manpower',                color: '1B5E20', fill: 'E8F5E9' },
            { key: 'Total Exposed Manhour',          label: 'Total Exposed Manhour',          color: '0D47A1', fill: 'E3F2FD' },
            { key: 'Total Exposed Man-hour to date', label: 'Total Exposed Man-hour to date', color: '4A148C', fill: 'F3E5F5' },
            { key: 'No. of Days w/o LTA',            label: 'No. of Days w/o LTA',            color: 'BF360C', fill: 'FBE9E7' },
        ];

        // ── Value helpers ─────────────────────────────────────────────────────
        function expGetVal(proj, measureKey, monthIdx) {
            if (measureKey === 'Total Exposed Man-hour to date') {
                // Straight cumulative running total per OSHS Rule 1050 exposure hours (see computeExposureToDateSeries)
                const _series = (typeof computeExposureToDateSeries === 'function') ? computeExposureToDateSeries(proj) : null;
                const cum = _series ? (_series[monthIdx] || 0) : 0;
                return cum > 0 ? cum : null;
            }
            const raw = _v(proj, 'exposures_' + measureKey, monthIdx);
            const num = parseFloat(raw);
            return (!isNaN(num) && raw !== '') ? num : null;
        }
        function expYtd(proj, measureKey) {
            if (measureKey === 'Total Exposed Man-hour to date') {
                return expGetVal(proj, measureKey, 12);
            }
            let s = 0, any = false;
            for (let m = 1; m <= 12; m++) {
                const v = expGetVal(proj, measureKey, m);
                if (v !== null) { s += v; any = true; }
            }
            return any ? s : null;
        }

        // ── Project / region ordering ─────────────────────────────────────────
        const EXP_REG_ORDER = ['NCR', 'SOUTH LUZON', 'NORTH LUZON', 'VISAYAS & MINDANAO'];
        const _expSortedReg  = EXP_REG_ORDER.filter(function(r) {
            return projs.some(function(p) { return (p.region||'').toUpperCase() === r; });
        });
        const _expOtherReg = [];
        projs.forEach(function(p) {
            const r = (p.region||'').toUpperCase();
            if (!EXP_REG_ORDER.includes(r) && r !== 'CORPORATE' && r !== 'PLANT OPERATIONS' && !_expOtherReg.includes(r)) _expOtherReg.push(r);
        });
        const expRegOrder = [..._expSortedReg, ..._expOtherReg];
        const expProjsByReg = {};
        expRegOrder.forEach(function(r) {
            expProjsByReg[r] = projs.filter(function(p) { return (p.region||'').toUpperCase() === r; });
        });
        const expOrderedProjs = expRegOrder.reduce(function(acc, r) { return acc.concat(expProjsByReg[r]); }, []);

        // ── Column map: [MEASURE label] + [proj cols + REGION TOTAL per region] + [OVERALL TOTAL] ──
        const EXP_LEFT = 1; // single left column: MEASURE
        const expColMap = [];
        expRegOrder.forEach(function(region) {
            expProjsByReg[region].forEach(function(proj) { expColMap.push({ type: 'proj', proj: proj, region: region }); });
            expColMap.push({ type: 'total', region: region });
        });
        expColMap.push({ type: 'overall' });
        const expTotalCols = EXP_LEFT + expColMap.length;

        // ── Shared style constants (matches KPM palette) ──────────────────────
        const EXP_C_DARK   = '1B5E20';
        const EXP_C_MED    = '2E7D32';
        const EXP_C_GRAY   = 'F5F5F5';
        const EXP_C_COLHDR = '37474F';
        const EXP_C_WHITE  = 'FFFFFF';

        // ── Style helpers ─────────────────────────────────────────────────────
        function expApplyHdr(cell, bgArgb, fgArgb) {
            cell.font      = { bold: true, color: { argb: fgArgb || EXP_C_WHITE }, size: 9, name: 'Calibri' };
            cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + (bgArgb || EXP_C_COLHDR) } };
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            cell.border    = { top:{style:'thin',color:{argb:'FFB0BEC5'}}, bottom:{style:'thin',color:{argb:'FFB0BEC5'}}, left:{style:'thin',color:{argb:'FFB0BEC5'}}, right:{style:'thin',color:{argb:'FFB0BEC5'}} };
        }
        function expApplyData(cell, val, mIdx) {
            cell.border = { top:{style:'thin',color:{argb:'FFB0BEC5'}}, bottom:{style:{style:'thin',color:{argb:'FFB0BEC5'}}}, left:{style:'thin',color:{argb:'FFB0BEC5'}}, right:{style:'thin',color:{argb:'FFB0BEC5'}} };
            cell.border = { top:{style:'thin',color:{argb:'FFB0BEC5'}}, bottom:{style:'thin',color:{argb:'FFB0BEC5'}}, left:{style:'thin',color:{argb:'FFB0BEC5'}}, right:{style:'thin',color:{argb:'FFB0BEC5'}} };
            if (val === null || val === undefined) {
                cell.value = '—';
                cell.font  = { size: 9, name: 'Calibri', color: { argb: 'FF9E9E9E' } };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                const m = EXP_MEASURES[mIdx];
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFAFA' } };
                return;
            }
            const m = EXP_MEASURES[mIdx];
            cell.value     = val;
            cell.font      = { bold: true, size: 9, name: 'Calibri' };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
        }
        function expApplyRegTotal(cell, val, mIdx) {
            cell.border = { top:{style:'medium',color:{argb:'FF'+EXP_C_MED}}, bottom:{style:'medium',color:{argb:'FF'+EXP_C_MED}}, left:{style:'medium',color:{argb:'FF'+EXP_C_MED}}, right:{style:'medium',color:{argb:'FF'+EXP_C_MED}} };
            if (val === null || val === 0) {
                cell.value = '—'; cell.font = { size: 9, name: 'Calibri', color: { argb: 'FF9E9E9E' } };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
                return;
            }
            cell.value     = val;
            cell.font      = { bold: true, size: 9, name: 'Calibri', color: { argb: 'FF' + EXP_C_MED } };
            cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
        function expApplyOverall(cell, val) {
            cell.border = { top:{style:'medium',color:{argb:'FF1A237E'}}, bottom:{style:'medium',color:{argb:'FF1A237E'}}, left:{style:'medium',color:{argb:'FF1A237E'}}, right:{style:'medium',color:{argb:'FF1A237E'}} };
            if (val === null || val === 0) {
                cell.value = '—'; cell.font = { size: 9, name: 'Calibri', color: { argb: 'FF9E9E9E' } };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EAF6' } };
                return;
            }
            cell.value     = val;
            cell.font      = { bold: true, size: 9, name: 'Calibri', color: { argb: 'FF1A237E' } };
            cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EAF6' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
        function expMeasureLabel(cell, mIdx) {
            const m = EXP_MEASURES[mIdx];
            cell.font      = { bold: true, size: 9, name: 'Calibri', color: { argb: 'FF' + m.color } };
            cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + m.fill } };
            cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true };
            cell.border    = { top:{style:'thin',color:{argb:'FFB0BEC5'}}, bottom:{style:'thin',color:{argb:'FFB0BEC5'}}, left:{style:'thin',color:{argb:'FFB0BEC5'}}, right:{style:'medium',color:{argb:'FF'+EXP_C_MED}} };
        }
        function expMonthLabel(cell) {
            cell.font      = { bold: true, size: 9, name: 'Calibri' };
            cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + EXP_C_GRAY } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border    = { top:{style:'thin',color:{argb:'FFB0BEC5'}}, bottom:{style:'thin',color:{argb:'FFB0BEC5'}}, left:{style:'thin',color:{argb:'FFB0BEC5'}}, right:{style:'medium',color:{argb:'FF'+EXP_C_MED}} };
        }
        function expAddNotes(ws, txt) {
            const r = ws.addRow([txt]);
            ws.mergeCells(r.number, 1, r.number, expTotalCols);
            const c = r.getCell(1);
            c.font      = { size: 8, name: 'Calibri', color: { argb: 'FF5D4037' }, italic: true };
            c.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF9C4' } };
            c.alignment = { vertical: 'middle', wrapText: true };
            r.height    = 22;
            return r;
        }
        function expAddTitle(ws, txt) {
            const r = ws.addRow([txt]);
            ws.mergeCells(r.number, 1, r.number, expTotalCols);
            const c = r.getCell(1);
            c.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12, name: 'Calibri' };
            c.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + EXP_C_DARK } };
            c.alignment = { horizontal: 'center', vertical: 'middle' };
            r.height    = 26;
            return r;
        }
        function expAddRegionHdrRow(ws) {
            const rr = ws.addRow(Array(expTotalCols).fill(''));
            rr.height = 20;
            let cOff = EXP_LEFT + 1;
            expRegOrder.forEach(function(region) {
                const pc = expProjsByReg[region].length;
                const spanEnd = cOff + pc; // +1 for TOTAL col
                const c = rr.getCell(cOff);
                c.value     = region;
                c.font      = { bold: true, color: { argb: EXP_C_WHITE }, size: 10, name: 'Calibri' };
                c.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + EXP_C_DARK } };
                c.alignment = { horizontal: 'center', vertical: 'middle' };
                if (spanEnd > cOff) ws.mergeCells(rr.number, cOff, rr.number, spanEnd);
                cOff += pc + 1;
            });
            const oc = rr.getCell(cOff);
            oc.value = 'OVERALL'; oc.font = { bold: true, color: { argb: EXP_C_WHITE }, size: 10, name: 'Calibri' };
            oc.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A237E' } };
            oc.alignment = { horizontal: 'center', vertical: 'middle' };
            for (let ci = 1; ci <= EXP_LEFT; ci++) rr.getCell(ci).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + EXP_C_DARK } };
            return rr;
        }
        function expAddColHdrRow(ws, leftLabel) {
            const hdrData = [leftLabel || 'MEASURE'];
            expColMap.forEach(function(cm) {
                hdrData.push(cm.type === 'proj' ? (cm.proj.name || '') : cm.type === 'overall' ? 'OVERALL\nTOTAL' : 'REGION\nTOTAL');
            });
            const hr = ws.addRow(hdrData);
            hr.height = 45;
            expApplyHdr(hr.getCell(1), EXP_C_COLHDR, EXP_C_WHITE);
            expColMap.forEach(function(cm, i) {
                const ci = EXP_LEFT + 1 + i;
                if (cm.type === 'total')   expApplyHdr(hr.getCell(ci), EXP_C_MED, EXP_C_WHITE);
                else if (cm.type === 'overall') expApplyHdr(hr.getCell(ci), '1A237E', EXP_C_WHITE);
                else expApplyHdr(hr.getCell(ci), EXP_C_COLHDR, EXP_C_WHITE);
            });
            return hr;
        }
        function expSetColWidths(ws) {
            ws.getColumn(1).width = 32;
            expColMap.forEach(function(cm, i) {
                ws.getColumn(EXP_LEFT + 1 + i).width = cm.type === 'total' ? 12 : cm.type === 'overall' ? 14 : 16;
            });
        }

        // ── Core sheet builder: rows=measures, cols=projects (KPM-style) ──────
        function buildExpMatrixSheet(ws, sheetTitle, getValFn) {
            expAddNotes(ws, 'SAFETY EXPOSURES & MANHOURS — Values as submitted per project. REGION TOTAL and OVERALL TOTAL are sums across all projects.');
            expAddTitle(ws, sheetTitle);
            ws.addRow([]); ws.getRow(ws.rowCount).height = 5;
            expAddRegionHdrRow(ws);
            expAddColHdrRow(ws, 'MEASURE');

            // Data rows — one per measure
            EXP_MEASURES.forEach(function(meas, mIdx) {
                const rowArr = [meas.label];
                expColMap.forEach(function(cm) {
                    if (cm.type === 'proj') {
                        rowArr.push(getValFn(cm.proj, meas.key));
                    } else if (cm.type === 'total') {
                        let s = 0, any = false;
                        expProjsByReg[cm.region].forEach(function(p) {
                            const v = getValFn(p, meas.key);
                            if (v !== null) { s += v; any = true; }
                        });
                        rowArr.push(any ? s : null);
                    } else {
                        let s = 0, any = false;
                        expOrderedProjs.forEach(function(p) {
                            const v = getValFn(p, meas.key);
                            if (v !== null) { s += v; any = true; }
                        });
                        rowArr.push(any ? s : null);
                    }
                });
                const dr = ws.addRow(rowArr);
                dr.height = 24;
                expMeasureLabel(dr.getCell(1), mIdx);
                expColMap.forEach(function(cm, i) {
                    const ci = EXP_LEFT + 1 + i;
                    const cell = dr.getCell(ci);
                    const val  = rowArr[EXP_LEFT + i];
                    if (cm.type === 'overall') expApplyOverall(cell, val);
                    else if (cm.type === 'total') expApplyRegTotal(cell, val, mIdx);
                    else expApplyData(cell, val, mIdx);
                });
            });

            expSetColWidths(ws);
            ws.views = [{ state: 'frozen', xSplit: EXP_LEFT, ySplit: 5, activeCell: 'B6' }];
        }

        const wb = eshNewWorkbook('ESH Monitoring System');

        // ── Sheet 1: YTD Summary (matrix) ────────────────────────────────────
        const expYtdWs = wb.addWorksheet('YTD Summary');
        buildExpMatrixSheet(expYtdWs, 'SAFETY EXPOSURES & MANHOURS — YTD SUMMARY ' + year,
            function(proj, key) { return expYtd(proj, key); });

        // ── Sheets 2-13: One matrix sheet per month ───────────────────────────
        MO_LONG.forEach(function(moName, moIdx) {
            const moNum = moIdx + 1;
            const mWs = wb.addWorksheet(moName);
            buildExpMatrixSheet(mWs, 'SAFETY EXPOSURES & MANHOURS — ' + moName.toUpperCase() + ' ' + year,
                function(proj, key) { return expGetVal(proj, key, moNum); });
        });

        // ── Sheet 14: OVERALL SUMMARY — per measure, rows=months, cols=projects ─
        const expSumWs = wb.addWorksheet('OVERALL SUMMARY');
        expAddNotes(expSumWs, 'SAFETY EXPOSURES & MANHOURS — Monthly breakdown per measure. Each section shows values for all projects grouped by region.');
        expAddTitle(expSumWs, 'SAFETY EXPOSURES & MANHOURS — OVERALL SUMMARY ' + year);

        EXP_MEASURES.forEach(function(meas, mIdx) {
            // Spacer
            expSumWs.addRow([]); expSumWs.getRow(expSumWs.rowCount).height = 6;
            // Measure section banner
            const mbr = expSumWs.addRow(['📊 ' + meas.label]);
            expSumWs.mergeCells(mbr.number, 1, mbr.number, expTotalCols);
            const mbc = mbr.getCell(1);
            mbc.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10, name: 'Calibri' };
            mbc.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + meas.color } };
            mbc.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
            mbr.height    = 20;
            // Region header
            expAddRegionHdrRow(expSumWs);
            // Column header
            expAddColHdrRow(expSumWs, 'MONTH');

            // One row per month
            MO_LONG.forEach(function(moName, moIdx) {
                const moNum = moIdx + 1;
                const mRowData = [MO_SHORT[moIdx]];
                expColMap.forEach(function(cm) {
                    if (cm.type === 'proj') {
                        mRowData.push(expGetVal(cm.proj, meas.key, moNum));
                    } else if (cm.type === 'total') {
                        let s = 0, any = false;
                        expProjsByReg[cm.region].forEach(function(p) {
                            const v = expGetVal(p, meas.key, moNum);
                            if (v !== null) { s += v; any = true; }
                        });
                        mRowData.push(any ? s : null);
                    } else {
                        let s = 0, any = false;
                        expOrderedProjs.forEach(function(p) {
                            const v = expGetVal(p, meas.key, moNum);
                            if (v !== null) { s += v; any = true; }
                        });
                        mRowData.push(any ? s : null);
                    }
                });
                const mRow = expSumWs.addRow(mRowData);
                mRow.height = 18;
                expMonthLabel(mRow.getCell(1));
                expColMap.forEach(function(cm, i) {
                    const ci = EXP_LEFT + 1 + i;
                    const cell = mRow.getCell(ci);
                    const val  = mRowData[EXP_LEFT + i];
                    if (cm.type === 'overall') expApplyOverall(cell, val);
                    else if (cm.type === 'total') expApplyRegTotal(cell, val, mIdx);
                    else expApplyData(cell, val, mIdx);
                });
            });

            // YTD row
            const ytdData = ['YTD'];
            expColMap.forEach(function(cm) {
                if (cm.type === 'proj') {
                    ytdData.push(expYtd(cm.proj, meas.key));
                } else if (cm.type === 'total') {
                    let s = 0, any = false;
                    expProjsByReg[cm.region].forEach(function(p) {
                        const v = expYtd(p, meas.key);
                        if (v !== null) { s += v; any = true; }
                    });
                    ytdData.push(any ? s : null);
                } else {
                    let s = 0, any = false;
                    expOrderedProjs.forEach(function(p) {
                        const v = expYtd(p, meas.key);
                        if (v !== null) { s += v; any = true; }
                    });
                    ytdData.push(any ? s : null);
                }
            });
            const ytdRow = expSumWs.addRow(ytdData);
            ytdRow.height = 22;
            const ytdLbl = ytdRow.getCell(1);
            ytdLbl.value     = 'YTD';
            ytdLbl.font      = { bold: true, size: 9, name: 'Calibri', color: { argb: 'FFFFFFFF' } };
            ytdLbl.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + meas.color } };
            ytdLbl.alignment = { horizontal: 'center', vertical: 'middle' };
            ytdLbl.border    = { top:{style:'medium',color:{argb:'FFB0BEC5'}}, bottom:{style:'medium',color:{argb:'FFB0BEC5'}}, left:{style:'medium',color:{argb:'FFB0BEC5'}}, right:{style:'medium',color:{argb:'FFB0BEC5'}} };
            expColMap.forEach(function(cm, i) {
                const ci = EXP_LEFT + 1 + i;
                const cell = expSumWs.getCell(ytdRow.number, ci);
                const val  = ytdData[EXP_LEFT + i];
                const bgColor = cm.type === 'overall' ? '1A237E' : cm.type === 'total' ? EXP_C_MED : meas.color;
                cell.value     = (val !== null && val !== undefined) ? val : '—';
                cell.font      = { bold: true, size: 9, name: 'Calibri', color: { argb: 'FFFFFFFF' } };
                cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + bgColor } };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border    = { top:{style:'medium',color:{argb:'FFB0BEC5'}}, bottom:{style:'medium',color:{argb:'FFB0BEC5'}}, left:{style:'medium',color:{argb:'FFB0BEC5'}}, right:{style:'medium',color:{argb:'FFB0BEC5'}} };
            });
        });

        expSetColWidths(expSumWs);
        expSumWs.views = [{ state: 'frozen', xSplit: EXP_LEFT, ySplit: 2, activeCell: 'B3' }];

        await _xSave(wb, 'total-exposures'); return;
    }

    // ════════════════════════════════════════════════════════════════════════
    // ESH ACTIVITIES AND PROGRAMS — monthly per sheet
    // ════════════════════════════════════════════════════════════════════════
    if (tab === 'activities') {
        const ACT_MEASURES = [
            { key: 'No. of ESH Committee Conducted', label: 'No. of ESH Committee Conducted', color: '1B5E20', fill: 'E8F5E9' },
            { key: 'No. of ESH inspection',           label: 'No. of ESH Inspection',           color: '0D47A1', fill: 'E3F2FD' },
            { key: 'Drills Conducted',                label: 'Drills Conducted',                color: '6A1B9A', fill: 'F3E5F5' },
            { key: 'Training Conducted',              label: 'Training Conducted',              color: '880E4F', fill: 'FCE4EC' },
        ];

        // ── Build region/project order (same pattern as KPM/GOT) ─────────
        const _ACT_REG_ORDER = ['NCR','SOUTH LUZON','NORTH LUZON','VISAYAS & MINDANAO'];
        const _actAllProjs   = projs.filter(function(p) {
            const r = (p.region || '').toUpperCase();
            return r !== 'PLANT OPERATIONS';
        });
        const _actSortedReg  = _ACT_REG_ORDER.filter(function(r) {
            return _actAllProjs.some(function(p) { return (p.region||'').toUpperCase() === r; });
        });
        const _actOtherReg = [];
        _actAllProjs.forEach(function(p) {
            const r = (p.region||'').toUpperCase();
            if (!_ACT_REG_ORDER.includes(r) && !_actOtherReg.includes(r)) _actOtherReg.push(r);
        });
        const actRegOrder    = [..._actSortedReg, ..._actOtherReg];
        const actProjsByReg  = {};
        actRegOrder.forEach(function(r) {
            actProjsByReg[r] = _actAllProjs.filter(function(p) { return (p.region||'').toUpperCase() === r; });
        });
        const actOrderedProjs = actRegOrder.reduce(function(arr, r) { return arr.concat(actProjsByReg[r]); }, []);

        // ── Value helpers ─────────────────────────────────────────────────
        function actGetVal(proj, measureKey, monthIdx) {
            const mi  = monthIdx - 1;
            const key = 'activities_' + measureKey;
            if (measureKey === 'Drills Conducted') {
                const eshStor  = (typeof getEshStorage === 'function') ? getEshStorage() : {};
                const projName = proj.name;
                let count = 0;
                (typeof ESH_DRILLS !== 'undefined' ? ESH_DRILLS : []).forEach(function(drill, di) {
                    const dsi = (typeof getDrillStorageIdx === 'function') ? getDrillStorageIdx(drill, di) : di;
                    if (eshStor[year + '|esh-calendar-drills|' + projName + '|' + dsi + '|' + mi + '|na']) return;
                    if (eshStor[year + '|esh-calendar-drills|' + projName + '|' + dsi + '|' + mi + '|actual']) count++;
                });
                if ((proj.region||'').toUpperCase() === 'CORPORATE') {
                    const corpBase   = window.CORP_DRILLS || [];
                    const corpCustom = (typeof getCorpDrillCustomRows === 'function') ? getCorpDrillCustomRows() : [];
                    corpBase.forEach(function(_cd, cdi) {
                        if (eshStor[year + '|esh-calendar-corp-drills|' + projName + '|' + cdi + '|' + mi + '|actual']) count++;
                    });
                    corpCustom.forEach(function(_ccr, cci) {
                        if (eshStor[year + '|esh-calendar-corp-drills|' + projName + '|' + (1000+cci) + '|' + mi + '|actual']) count++;
                    });
                }
                return count > 0 ? count : null;
            }
            if (measureKey === 'Training Conducted') {
                if ((proj.region||'').toUpperCase() === 'CORPORATE') {
                    const raw = _v(proj, key, monthIdx);
                    return raw !== '' ? (parseFloat(raw) || null) : null;
                }
                const eshStor  = (typeof getEshStorage === 'function') ? getEshStorage() : {};
                const projName = proj.name;
                const _8HR     = '8-Hr Mandatory OSH Training';
                let count = 0;
                ['esh-calendar-env','esh-calendar-safety','esh-calendar-health'].forEach(function(tt) {
                    ((typeof ESH_TRAININGS !== 'undefined' && ESH_TRAININGS[tt]) || []).forEach(function(tr, ti) {
                        if (tr === _8HR) {
                            const naK = year + '|' + tt + '|' + projName + '|' + ti + '|na_row';
                            const naF = eshStor[naK] !== undefined ? parseInt(eshStor[naK]) : -1;
                            if (naF >= 0 && mi >= naF) return;
                        }
                        if (eshStor[year + '|' + tt + '|' + projName + '|' + ti + '|' + mi + '|actual']) count++;
                    });
                });
                return count > 0 ? count : null;
            }
            const raw = _v(proj, key, monthIdx);
            return raw !== '' ? (parseFloat(raw) || null) : null;
        }

        function actYtd(proj, measureKey) {
            let total = 0, any = false;
            for (let m = 1; m <= 12; m++) {
                const v = actGetVal(proj, measureKey, m);
                if (v !== null) { total += v; any = true; }
            }
            return any ? total : null;
        }

        function actRegTotal(region, measureKey, moNum) {
            let total = 0, any = false;
            actProjsByReg[region].forEach(function(p) {
                const v = moNum ? actGetVal(p, measureKey, moNum) : actYtd(p, measureKey);
                if (v !== null) { total += v; any = true; }
            });
            return any ? total : null;
        }

        function actOverallTotal(measureKey, moNum) {
            let total = 0, any = false;
            actOrderedProjs.forEach(function(p) {
                const v = moNum ? actGetVal(p, measureKey, moNum) : actYtd(p, measureKey);
                if (v !== null) { total += v; any = true; }
            });
            return any ? total : null;
        }

        // ── colMap: same KPM/GOT pattern ─────────────────────────────────
        const actColMap = [];
        actRegOrder.forEach(function(region) {
            actProjsByReg[region].forEach(function(proj) { actColMap.push({ type:'proj', proj, region }); });
            actColMap.push({ type:'avg', region });
        });
        actColMap.push({ type:'overall' });

        const A_LEFT  = 1; // ACTIVITY / PROGRAM
        const A_TOTAL = A_LEFT + actColMap.length;
        const A_DK_GRN = '1B5E20', A_MD_GRN = '2E7D32', A_HDR_BG = '37474F', A_HDR_FG = 'FFFFFF';

        function aApplyHdr(cell, bg, fg) {
            cell.font      = { bold:true, color:{argb:'FF'+(fg||A_HDR_FG)}, size:9, name:'Calibri' };
            cell.fill      = { type:'pattern', pattern:'solid', fgColor:{argb:'FF'+(bg||A_HDR_BG)} };
            cell.alignment = { horizontal:'center', vertical:'middle', wrapText:true };
            cell.border    = { top:{style:'thin',color:{argb:'FFB0BEC5'}}, bottom:{style:'thin',color:{argb:'FFB0BEC5'}}, left:{style:'thin',color:{argb:'FFB0BEC5'}}, right:{style:'thin',color:{argb:'FFB0BEC5'}} };
        }
        function aApplyVal(cell, val, am) {
            cell.value     = val !== null ? val : '';
            cell.font      = { bold: val !== null, size:9, name:'Calibri', color:{argb: val !== null ? 'FF'+am.color : 'FF9E9E9E'} };
            cell.alignment = { horizontal:'center', vertical:'middle' };
            cell.fill      = val !== null ? { type:'pattern', pattern:'solid', fgColor:{argb:'FF'+am.fill} } : { type:'pattern', pattern:'solid', fgColor:{argb:'FFFFFFFF'} };
            cell.border    = { top:{style:'thin',color:{argb:'FFB0BEC5'}}, bottom:{style:'thin',color:{argb:'FFB0BEC5'}}, left:{style:'thin',color:{argb:'FFB0BEC5'}}, right:{style:'thin',color:{argb:'FFB0BEC5'}} };
        }
        function aApplyTotal(cell, val, am, isOverall) {
            cell.value     = val !== null ? val : '—';
            cell.font      = { bold:true, size:9, name:'Calibri', color:{argb: val !== null ? 'FF'+(isOverall?'FFFFFF':am.color) : 'FF9E9E9E'} };
            cell.alignment = { horizontal:'center', vertical:'middle' };
            cell.fill      = { type:'pattern', pattern:'solid', fgColor:{argb: isOverall ? 'FF'+am.color : (val !== null ? 'FF'+am.fill : 'FFF5F5F5')} };
            cell.border    = { top:{style:'medium',color:{argb:'FF'+A_MD_GRN}}, bottom:{style:'medium',color:{argb:'FF'+A_MD_GRN}}, left:{style:'medium',color:{argb:'FF'+A_MD_GRN}}, right:{style:'medium',color:{argb:'FF'+A_MD_GRN}} };
        }

        function buildActSheet(ws, sheetTitle, getValFn, getRegFn, getOvFn) {
            // Row 1: title note
            const noteRow = ws.addRow([sheetTitle]);
            ws.mergeCells(noteRow.number, 1, noteRow.number, A_TOTAL);
            const nc = noteRow.getCell(1);
            nc.font = { bold:true, size:11, name:'Calibri', color:{argb:'FF'+A_DK_GRN} };
            nc.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFE8F5E9'} };
            nc.alignment = { vertical:'middle' };
            noteRow.height = 22;

            // Row 2: spacer
            ws.addRow([]); ws.getRow(2).height = 6;

            // Row 3: Region header spans
            const regHdrRow = ws.addRow(Array(A_TOTAL).fill(''));
            regHdrRow.height = 20;
            let colOff = A_LEFT + 1;
            actRegOrder.forEach(function(region) {
                const pc = actProjsByReg[region].length;
                const c  = regHdrRow.getCell(colOff);
                c.value = region;
                c.font  = { bold:true, color:{argb:'FF'+A_HDR_FG}, size:10, name:'Calibri' };
                c.fill  = { type:'pattern', pattern:'solid', fgColor:{argb:'FF'+A_DK_GRN} };
                c.alignment = { horizontal:'center', vertical:'middle' };
                if (pc > 0) ws.mergeCells(regHdrRow.number, colOff, regHdrRow.number, colOff + pc);
                colOff += pc + 1;
            });
            const ovRegC = regHdrRow.getCell(colOff);
            ovRegC.value = 'OVERALL'; ovRegC.font = { bold:true, color:{argb:'FF'+A_HDR_FG}, size:10, name:'Calibri' };
            ovRegC.fill  = { type:'pattern', pattern:'solid', fgColor:{argb:'FF1A237E'} };
            ovRegC.alignment = { horizontal:'center', vertical:'middle' };
            regHdrRow.getCell(1).fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FF'+A_DK_GRN} };

            // Row 4: Column headers
            const hdrData = ['ACTIVITY / PROGRAM'];
            actColMap.forEach(function(cm) {
                if (cm.type === 'proj')    hdrData.push(cm.proj.name || '');
                else if (cm.type === 'avg') hdrData.push('REGION\nTOTAL');
                else                        hdrData.push('OVERALL\nTOTAL');
            });
            const hdrRow = ws.addRow(hdrData);
            hdrRow.height = 45;
            aApplyHdr(hdrRow.getCell(1), A_HDR_BG, A_HDR_FG);
            actColMap.forEach(function(cm, i) {
                const ci = A_LEFT + 1 + i;
                if (cm.type === 'avg')         aApplyHdr(hdrRow.getCell(ci), A_MD_GRN, 'FFFFFF');
                else if (cm.type === 'overall') aApplyHdr(hdrRow.getCell(ci), '1A237E', 'FFFFFF');
                else                            aApplyHdr(hdrRow.getCell(ci), A_HDR_BG, A_HDR_FG);
            });

            // Data rows: one per activity measure
            ACT_MEASURES.forEach(function(am) {
                const rowArr = [am.label];
                actColMap.forEach(function(cm) {
                    if (cm.type === 'proj')    rowArr.push(getValFn(cm.proj, am.key) || '');
                    else if (cm.type === 'avg') rowArr.push(getRegFn(cm.region, am.key) || '');
                    else                        rowArr.push(getOvFn(am.key) || '');
                });
                const dr = ws.addRow(rowArr);
                dr.height = 28;

                // Activity label cell
                const lc = dr.getCell(1);
                lc.value     = am.label;
                lc.font      = { bold:true, size:9, name:'Calibri', color:{argb:'FF'+am.color} };
                lc.alignment = { vertical:'middle', wrapText:true };
                lc.fill      = { type:'pattern', pattern:'solid', fgColor:{argb:'FF'+am.fill} };
                lc.border    = { top:{style:'thin',color:{argb:'FFB0BEC5'}}, bottom:{style:'thin',color:{argb:'FFB0BEC5'}}, left:{style:'thin',color:{argb:'FFB0BEC5'}}, right:{style:'medium',color:{argb:'FF'+A_MD_GRN}} };

                // Value cells
                actColMap.forEach(function(cm, i) {
                    const ci   = A_LEFT + 1 + i;
                    const cell = dr.getCell(ci);
                    if (cm.type === 'proj') {
                        aApplyVal(cell, getValFn(cm.proj, am.key), am);
                    } else if (cm.type === 'overall') {
                        aApplyTotal(cell, getOvFn(am.key), am, true);
                    } else {
                        aApplyTotal(cell, getRegFn(cm.region, am.key), am, false);
                    }
                });
            });

            // Column widths
            ws.getColumn(1).width = 30;
            actColMap.forEach(function(cm, i) {
                ws.getColumn(A_LEFT + 1 + i).width = cm.type === 'avg' ? 10 : cm.type === 'overall' ? 12 : 14;
            });
            ws.views = [{ state:'frozen', xSplit:A_LEFT, ySplit:4, activeCell:'B5' }];
        }

        const wb = eshNewWorkbook('ESH');
        const MO_LONG_A = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        const MO_SH_A   = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

        // Sheet 1: OVERALL SUMMARY (YTD)
        const sumWs = wb.addWorksheet('OVERALL SUMMARY');
        buildActSheet(sumWs,
            'ESH ACTIVITIES AND PROGRAMS — OVERALL SUMMARY ' + year,
            function(proj, mk) { return actYtd(proj, mk); },
            function(reg,  mk) { return actRegTotal(reg, mk, null); },
            function(mk)       { return actOverallTotal(mk, null); }
        );

        // Sheets 2–13: One per month
        MO_LONG_A.forEach(function(moName, moIdx) {
            const moNum  = moIdx + 1;
            const shName = ('ACT-' + MO_SH_A[moIdx] + '-' + year).substring(0, 31);
            const mWs    = wb.addWorksheet(shName);
            buildActSheet(mWs,
                'ESH ACTIVITIES AND PROGRAMS — ' + moName.toUpperCase() + ' ' + year,
                function(proj, mk) { return actGetVal(proj, mk, moNum); },
                function(reg,  mk) { return actRegTotal(reg, mk, moNum); },
                function(mk)       { return actOverallTotal(mk, moNum); }
            );
        });

        await _xSave(wb, 'esh-activities'); return;
    }

    // ════════════════════════════════════════════════════════════════════════
    // STATISTICS RATE — KPM/GOT-style layout (columns = projects, rows = rates)
    // ════════════════════════════════════════════════════════════════════════
    if (tab === 'rates') {
        const _rateBase = (state.ratesStandard === 'osha') ? 200000 : 1000000;
        const _rateStdLabel = (state.ratesStandard === 'osha') ? 'OSHA (200,000 hrs)' : 'OSHS (1,000,000 hrs)';
        // Previous month only — current month data is still incomplete (same rule as Overall export)
        const _ratesMaxMo = (year === new Date().getFullYear()) ? (new Date().getMonth() || 12) : 12;

        // ── Build region/project order (same pattern as KPM/GOT) ─────────
        const _RATE_REGION_ORDER = ['NCR','SOUTH LUZON','NORTH LUZON','VISAYAS & MINDANAO'];
        const _rateProjs = projs.filter(function(p) {
            const r = (p.region || '').toUpperCase();
            return r !== 'CORPORATE' && r !== 'PLANT OPERATIONS';
        });
        const _rateSortedReg = _RATE_REGION_ORDER.filter(function(r) {
            return _rateProjs.some(function(p) { return (p.region||'').toUpperCase() === r; });
        });
        const _rateOtherReg = [];
        _rateProjs.forEach(function(p) {
            const r = (p.region||'').toUpperCase();
            if (!_RATE_REGION_ORDER.includes(r) && !_rateOtherReg.includes(r)) _rateOtherReg.push(r);
        });
        const allRegionOrder = [..._rateSortedReg, ..._rateOtherReg];
        const projsByRegion  = {};
        allRegionOrder.forEach(function(r) {
            projsByRegion[r] = _rateProjs.filter(function(p) { return (p.region||'').toUpperCase() === r; });
        });
        const orderedProjs = allRegionOrder.reduce(function(arr, r) { return arr.concat(projsByRegion[r]); }, []);

        const RATE_ROWS = [
            { key: 'LTIR',          label: 'LTIR',          desc: 'Lost Time Incident Rate',       color: '1B5E20', fill: 'E8F5E9' },
            { key: 'TRIR',          label: 'TRIR',          desc: 'Total Recordable Incident Rate', color: '1565C0', fill: 'E3F2FD' },
            { key: 'SEVERITY RATE', label: 'SEVERITY RATE', desc: 'Severity Rate',                 color: 'B71C1C', fill: 'FFEBEE' },
        ];

        // Cumulative Jan → month. Same helper as the dashboard so the export matches the screen.
        function _cumRateFrom(projList, rateKey, moNum) {
            const cs = window.buildCumulativeSeries(projList, _ratesMaxMo);
            const m = moNum || _ratesMaxMo;
            if (m > _ratesMaxMo) return null; // future/ongoing month — not yet complete
            if (moNum && moNum > cs.last) return null;
            return window.calcCumRate(rateKey, cs.lta[m], cs.rec[m], cs.dl[m], cs.mh[m]);
        }
        function getRateVal(proj, rateKey, moNum) { return _cumRateFrom([proj], rateKey, moNum); }
        function getRateYtd(proj, rateKey) { return _cumRateFrom([proj], rateKey, 0); }
        function fmtRate(v, key) { return v === null ? '' : window.formatRate(key, v); }
        function regionRateVal(region, rateKey, moNum) { return _cumRateFrom(projsByRegion[region], rateKey, moNum); }
        function overallRateVal(rateKey, moNum) { return _cumRateFrom(orderedProjs, rateKey, moNum); }

        // colMap: same KPM/GOT pattern
        const rColMap = [];
        allRegionOrder.forEach(function(region) {
            projsByRegion[region].forEach(function(proj) { rColMap.push({ type:'proj', proj, region }); });
            rColMap.push({ type:'avg', region });
        });
        rColMap.push({ type:'overall' });

        const R_LEFT   = 2; // RATE | DESCRIPTION
        const R_TOTAL  = R_LEFT + rColMap.length;
        const C_DK_GRN = '1B5E20', C_MD_GRN = '2E7D32', C_GRY = 'F5F5F5', C_HDR_BG = '37474F', C_HDR_FG = 'FFFFFF';

        function rApplyHdr(cell, bg, fg) {
            cell.font      = { bold:true, color:{argb:'FF'+(fg||C_HDR_FG)}, size:9, name:'Calibri' };
            cell.fill      = { type:'pattern', pattern:'solid', fgColor:{argb:'FF'+(bg||C_HDR_BG)} };
            cell.alignment = { horizontal:'center', vertical:'middle', wrapText:true };
            cell.border    = { top:{style:'thin',color:{argb:'FFB0BEC5'}}, bottom:{style:'thin',color:{argb:'FFB0BEC5'}}, left:{style:'thin',color:{argb:'FFB0BEC5'}}, right:{style:'thin',color:{argb:'FFB0BEC5'}} };
        }
        function rApplyVal(cell, val, rateRow) {
            const txt = fmtRate(val, rateRow.key);
            cell.value     = txt || '';
            cell.font      = { bold:!!txt, size:9, name:'Calibri', color:{argb: txt ? 'FF'+rateRow.color : 'FF9E9E9E'} };
            cell.alignment = { horizontal:'center', vertical:'middle' };
            cell.fill      = txt ? { type:'pattern', pattern:'solid', fgColor:{argb:'FF'+rateRow.fill} } : { type:'pattern', pattern:'solid', fgColor:{argb:'FFFFFFFF'} };
            cell.border    = { top:{style:'thin',color:{argb:'FFB0BEC5'}}, bottom:{style:'thin',color:{argb:'FFB0BEC5'}}, left:{style:'thin',color:{argb:'FFB0BEC5'}}, right:{style:'thin',color:{argb:'FFB0BEC5'}} };
        }
        function rApplyAvg(cell, val, rateRow) {
            const txt = fmtRate(val, rateRow.key);
            cell.value     = txt || '—';
            cell.font      = { bold:true, size:9, name:'Calibri', color:{argb: txt ? 'FF'+rateRow.color : 'FF9E9E9E'} };
            cell.alignment = { horizontal:'center', vertical:'middle' };
            cell.fill      = txt ? { type:'pattern', pattern:'solid', fgColor:{argb:'FF'+rateRow.fill} } : { type:'pattern', pattern:'solid', fgColor:{argb:'FFF5F5F5'} };
            cell.border    = { top:{style:'medium',color:{argb:'FF'+C_MD_GRN}}, bottom:{style:'medium',color:{argb:'FF'+C_MD_GRN}}, left:{style:'medium',color:{argb:'FF'+C_MD_GRN}}, right:{style:'medium',color:{argb:'FF'+C_MD_GRN}} };
        }

        function buildRatesSheet(ws, sheetTitle, getValFn) {
            // Row 1: notes
            const noteRow = ws.addRow(['Standard: ' + _rateStdLabel + '  |  Cumulative Jan to month  |  LTIR = LTA × base ÷ MH  |  TRIR = (LTA+MTC+FAT+HIP) × base ÷ MH  |  Severity Rate = Days Lost × base ÷ MH']);
            ws.mergeCells(noteRow.number, 1, noteRow.number, R_TOTAL);
            const nc = noteRow.getCell(1);
            nc.font = { size:8, name:'Calibri', color:{argb:'FF5D4037'}, italic:true };
            nc.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFFFF9C4'} };
            nc.alignment = { vertical:'middle', wrapText:true };
            noteRow.height = 18;

            // Row 2: spacer
            ws.addRow([]); ws.getRow(2).height = 6;

            // Row 3: Region header spans
            const regHdrRow = ws.addRow(Array(R_TOTAL).fill(''));
            regHdrRow.height = 20;
            let colOff = R_LEFT + 1;
            allRegionOrder.forEach(function(region) {
                const pc = projsByRegion[region].length;
                const c  = regHdrRow.getCell(colOff);
                c.value = region;
                c.font  = { bold:true, color:{argb:'FF'+C_HDR_FG}, size:10, name:'Calibri' };
                c.fill  = { type:'pattern', pattern:'solid', fgColor:{argb:'FF'+C_DK_GRN} };
                c.alignment = { horizontal:'center', vertical:'middle' };
                if (pc > 0) ws.mergeCells(regHdrRow.number, colOff, regHdrRow.number, colOff + pc);
                colOff += pc + 1;
            });
            const ovRegC = regHdrRow.getCell(colOff);
            ovRegC.value = 'OVERALL'; ovRegC.font = { bold:true, color:{argb:'FF'+C_HDR_FG}, size:10, name:'Calibri' };
            ovRegC.fill  = { type:'pattern', pattern:'solid', fgColor:{argb:'FF1A237E'} };
            ovRegC.alignment = { horizontal:'center', vertical:'middle' };
            for (let ci = 1; ci <= R_LEFT; ci++) regHdrRow.getCell(ci).fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FF'+C_DK_GRN} };

            // Row 4: col headers
            const hdrData = ['RATE', 'DESCRIPTION'];
            rColMap.forEach(function(cm) {
                if (cm.type === 'proj')    hdrData.push(cm.proj.name || '');
                else if (cm.type === 'avg') hdrData.push('REGION\nAVG');
                else                        hdrData.push('OVERALL\nAVG');
            });
            const hdrRow = ws.addRow(hdrData);
            hdrRow.height = 45;
            for (let ci = 1; ci <= R_LEFT; ci++) rApplyHdr(hdrRow.getCell(ci), C_HDR_BG, C_HDR_FG);
            rColMap.forEach(function(cm, i) {
                const ci = R_LEFT + 1 + i;
                if (cm.type === 'avg')         rApplyHdr(hdrRow.getCell(ci), C_MD_GRN, 'FFFFFF');
                else if (cm.type === 'overall') rApplyHdr(hdrRow.getCell(ci), '1A237E', 'FFFFFF');
                else                            rApplyHdr(hdrRow.getCell(ci), C_HDR_BG, C_HDR_FG);
            });

            // Data rows: one per rate
            RATE_ROWS.forEach(function(rr) {
                const rowArr = [rr.label, rr.desc];
                rColMap.forEach(function(cm) {
                    if (cm.type === 'proj')    rowArr.push(fmtRate(getValFn(cm.proj, rr.key), rr.key) || '');
                    else if (cm.type === 'avg') rowArr.push(fmtRate(getValFn(null, rr.key, cm.region), rr.key) || '');
                    else                        rowArr.push(fmtRate(getValFn(null, rr.key, 'overall'), rr.key) || '');
                });
                const dr = ws.addRow(rowArr);
                dr.height = 28;

                // Left: RATE label
                const lc = dr.getCell(1);
                lc.value     = rr.label;
                lc.font      = { bold:true, size:10, name:'Calibri', color:{argb:'FF'+rr.color} };
                lc.alignment = { vertical:'middle', horizontal:'center' };
                lc.fill      = { type:'pattern', pattern:'solid', fgColor:{argb:'FF'+rr.fill} };
                lc.border    = { top:{style:'thin',color:{argb:'FFB0BEC5'}}, bottom:{style:'thin',color:{argb:'FFB0BEC5'}}, left:{style:'thin',color:{argb:'FFB0BEC5'}}, right:{style:'medium',color:{argb:'FF'+C_MD_GRN}} };

                // Left: description
                const dc = dr.getCell(2);
                dc.value     = rr.desc;
                dc.font      = { size:8.5, name:'Calibri', italic:true };
                dc.alignment = { vertical:'middle', wrapText:true };
                dc.fill      = { type:'pattern', pattern:'solid', fgColor:{argb:'FF'+C_GRY} };
                dc.border    = { top:{style:'thin',color:{argb:'FFB0BEC5'}}, bottom:{style:'thin',color:{argb:'FFB0BEC5'}}, left:{style:'thin',color:{argb:'FFB0BEC5'}}, right:{style:'medium',color:{argb:'FF'+C_MD_GRN}} };

                // Project value cells
                rColMap.forEach(function(cm, i) {
                    const ci   = R_LEFT + 1 + i;
                    const cell = dr.getCell(ci);
                    if (cm.type === 'proj') {
                        rApplyVal(cell, getValFn(cm.proj, rr.key), rr);
                    } else if (cm.type === 'overall') {
                        rApplyAvg(cell, getValFn(null, rr.key, 'overall'), rr);
                        cell.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFE8EAF6'} };
                        cell.font = { bold:true, size:9, name:'Calibri', color:{argb:'FF1A237E'} };
                    } else {
                        rApplyAvg(cell, getValFn(null, rr.key, cm.region), rr);
                    }
                });
            }); // end RATE_ROWS.forEach

            // Col widths
            ws.getColumn(1).width = 16;
            ws.getColumn(2).width = 28;
            rColMap.forEach(function(cm, i) {
                ws.getColumn(R_LEFT + 1 + i).width = cm.type === 'avg' ? 10 : cm.type === 'overall' ? 12 : 14;
            });
            ws.views = [{ state:'frozen', xSplit:R_LEFT, ySplit:4, activeCell:'C5' }];
        } // end buildRatesSheet

        const wb = eshNewWorkbook('ESH');
        const MO_LONG_R = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        const MO_SH_R   = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

        // OVERALL SUMMARY sheet (YTD across all months)
        const sumWsR = wb.addWorksheet('OVERALL SUMMARY');
        buildRatesSheet(sumWsR, 'STATISTICS RATE — OVERALL SUMMARY ' + year,
            function(proj, rateKey, aggType) {
                if (aggType === 'overall') return overallRateVal(rateKey, null);
                if (aggType)              return regionRateVal(aggType, rateKey, null);
                return getRateYtd(proj, rateKey);
            }
        );

        // Monthly sheets — only up to previous complete month (current/ongoing & future months excluded)
        MO_LONG_R.forEach(function(moName, moIdx) {
            const moNum  = moIdx + 1;
            if (moNum > _ratesMaxMo) return; // e.g. viewing August → skip AUG..DEC sheets
            const shName = ('RATES-' + MO_SH_R[moIdx] + '-' + year).substring(0, 31);
            const mWs    = wb.addWorksheet(shName);
            buildRatesSheet(mWs, 'STATISTICS RATE — ' + moName.toUpperCase() + ' ' + year,
                function(proj, rateKey, aggType) {
                    if (aggType === 'overall') return overallRateVal(rateKey, moNum);
                    if (aggType)              return regionRateVal(aggType, rateKey, moNum);
                    return getRateVal(proj, rateKey, moNum);
                }
            );
        });

        await _xSave(wb, 'statistics-rates'); return;
    }

    // ════════════════════════════════════════════════════════════════════════
    // MONTHLY SCHEMA TABS
    // ════════════════════════════════════════════════════════════════════════
    if (_SCHEMA_LOCAL[tab]) {
        const schemaRows = _SCHEMA_LOCAL[tab];
        const isDate     = ['cshp','reg','doe-permit','env-monthly-report'].includes(tab);
        // Previous month only — current/ongoing month not yet complete (mirrors Overall & Rates export rule).
        // Applies to non-date numeric tabs reaching this generic builder: medical (ACCIDENT/INCIDENT RECORD), nov.
        const _schemaMaxMo = (year === new Date().getFullYear()) ? (new Date().getMonth() || 12) : 12;
        const wb = eshNewWorkbook('ESH');

        // Sheet 1 — Summary (YTD totals per project)
        const sumWs = wb.addWorksheet('Summary');
        // For date tabs: columns are PROJECT + REGION + 12 months per measure
        // For numeric tabs: columns are PROJECT + REGION + YTD per measure
        const sumCols = isDate ? 2 + 12 : 2 + schemaRows.length;
        const sumHdrCells = isDate
            ? ['PROJECT','REGION',...MO_SHORT]
            : ['PROJECT','REGION',...schemaRows.map(function(r){return r.toUpperCase();})];
        _xTitle(sumWs, title + ' — ' + year, sumCols);
        const sumHdr = sumWs.addRow(sumHdrCells);
        sumHdr.height = 22; sumHdr.eachCell(_xHdr);

        // For date tabs with multiple measures: one row per measure per project
        let ri = 3;
        REGIONS.forEach(function(region) {
            const rp = projs.filter(function(p){return (p.region||'').toUpperCase()===region;});
            if (!rp.length) return;
            const ban = sumWs.addRow([region,'']);
            sumWs.mergeCells(ri,1,ri,sumCols);
            _xBan(ban.getCell(1), '📌 '+region+' ('+rp.length+' project'+(rp.length!==1?'s':'')+')');
            ban.height=16; ri++;
            rp.forEach(function(proj, pIdx) {
                if (isDate) {
                    // One row per measure (date tabs may have multiple measures e.g. env-monthly-report)
                    schemaRows.forEach(function(row, rowIdx) {
                        const key = tab+'_'+row;
                        const raw = proj.vals && proj.vals[key];
                        const moVals = MO_SHORT.map(function(_,i){ return raw&&raw[i+1]?String(raw[i+1]):''; });
                        const projLabel = rowIdx===0 ? (proj.name||'') : '';
                        const regionLabel = rowIdx===0 ? (proj.region||'') : '';
                        const dr = sumWs.addRow([projLabel, regionLabel, ...moVals]);
                        dr.height=15;
                        dr.getCell(1).font={bold:true,size:9,name:'Calibri'}; dr.getCell(1).alignment={vertical:'middle'};
                        dr.getCell(2).font={size:9,name:'Calibri'}; dr.getCell(2).alignment={vertical:'middle'};
                        for (let ci=3; ci<=sumCols; ci++) { _xData(dr.getCell(ci),'center'); }
                        if (pIdx%2===0) _xAlt(dr, sumCols);
                        ri++;
                    });
                } else {
                    const vals = schemaRows.map(function(row){
                        const key = tab+'_'+row;
                        if (row === 'Total Exposed Man-hour to date') {
                            // Cumulative: prevBase + sum of monthly manhours, straight running total (no reset)
                            const cum = (typeof computeExposureToDateSeries === 'function') ? computeExposureToDateSeries(proj)[12] : 0;
                            return cum > 0 ? cum : '';
                        }
                        const ytd = _ytd(proj, key, isDate ? 12 : _schemaMaxMo);
                        return ytd !== '' ? ytd : '';
                    });
                    const dr = sumWs.addRow([proj.name||'', proj.region||'', ...vals]);
                    dr.height=15;
                    dr.getCell(1).font={bold:true,size:9,name:'Calibri'}; dr.getCell(1).alignment={vertical:'middle'};
                    dr.getCell(2).font={size:9,name:'Calibri'}; dr.getCell(2).alignment={vertical:'middle'};
                    for (let ci=3; ci<=sumCols; ci++) { _xData(dr.getCell(ci),'center'); }
                    if (pIdx%2===0) _xAlt(dr, sumCols);
                    ri++;
                }
            });
            sumWs.getRow(ri).height=5; ri++;
        });
        sumWs.getColumn(1).width=36; sumWs.getColumn(2).width=22;
        for (let ci=3;ci<=sumCols;ci++) sumWs.getColumn(ci).width=isDate?14:18;
        sumWs.views=[{state:'frozen',ySplit:2,activeCell:'A3'}];

        // Sheet 2 — Monthly detail (each row = project, cols = months)
        schemaRows.forEach(function(measure) {
            const ws2 = wb.addWorksheet(measure.replace(/[*?:/\\[\]]/g,'').substring(0,31));
            const cols2 = isDate ? 2+12 : 2+12+1; // no YTD column for date tabs
            _xTitle(ws2, measure.toUpperCase()+' — '+year, cols2);
            const hdr2 = ws2.addRow(isDate ? ['PROJECT','REGION',...MO_SHORT] : ['PROJECT','REGION',...MO_SHORT,'YTD / TOTAL']);
            hdr2.height=22; hdr2.eachCell(_xHdr);
            const isToDate = (measure === 'Total Exposed Man-hour to date');
            let ri2=3;
            REGIONS.forEach(function(region){
                const rp2=projs.filter(function(p){return (p.region||'').toUpperCase()===region;});
                if (!rp2.length) return;
                const ban2=ws2.addRow([region]);
                ws2.mergeCells(ri2,1,ri2,cols2);
                _xBan(ban2.getCell(1),'📌 '+region); ban2.height=16; ri2++;
                rp2.forEach(function(proj,pIdx){
                    const key=tab+'_'+measure;
                    let moVals;
                    if (isDate) {
                        const raw=proj.vals&&proj.vals[key];
                        moVals = MO_SHORT.map(function(_,i){ return raw&&raw[i+1]?String(raw[i+1]):''; });
                    } else if (isToDate) {
                        // Cumulative: prevBase (index[0]) + running sum of Total Exposed Manhour.
                        // Straight running total per OSHS Rule 1050 — does not reset on LTA/Fatality.
                        const _series = (typeof computeExposureToDateSeries === 'function') ? computeExposureToDateSeries(proj) : null;
                        moVals = MO_SHORT.map(function(_,i){
                            const cum = _series ? (_series[i+1] || 0) : 0;
                            return cum > 0 ? cum : '';
                        });
                    } else {
                        moVals = MO_SHORT.map(function(_,i){ return (i+1) > _schemaMaxMo ? '' : _v(proj,key,i+1); });
                    }
                    const ytdVal = isToDate
                        ? (function(){
                            const cum = (typeof computeExposureToDateSeries === 'function') ? computeExposureToDateSeries(proj)[12] : 0;
                            return cum > 0 ? cum : '';
                          })()
                        : (function(){const y=_ytd(proj,key,isDate?12:_schemaMaxMo);return y!==''?y:'';})();
                    const rowData = isDate
                        ? [proj.name||'', proj.region||'', ...moVals]
                        : [proj.name||'', proj.region||'', ...moVals, ytdVal];
                    const dr2 = ws2.addRow(rowData);
                    dr2.height=15;
                    dr2.getCell(1).font={bold:true,size:9,name:'Calibri'}; dr2.getCell(1).alignment={vertical:'middle'};
                    dr2.getCell(2).font={size:9,name:'Calibri'}; dr2.getCell(2).alignment={vertical:'middle'};
                    for (let ci=3;ci<=cols2;ci++){_xData(dr2.getCell(ci),'center');}
                    if (pIdx%2===0) _xAlt(dr2,cols2);
                    ri2++;
                });
                ws2.getRow(ri2).height=5; ri2++;
            });
            ws2.getColumn(1).width=36; ws2.getColumn(2).width=22;
            for (let ci=3;ci<=cols2;ci++) ws2.getColumn(ci).width=isDate?14:9;
            ws2.views=[{state:'frozen',ySplit:2,activeCell:'A3'}];
        });
        await _xSave(wb, tab); return;
    }

    // ════════════════════════════════════════════════════════════════════════
    // PERMITS
    // ════════════════════════════════════════════════════════════════════════
    if (tab === 'permits') {
        const PERMIT_ROWS = ['ECC','Company Registration System (CRS)','CNC','Certificate of Accreditation (DENR-EMB)','Certificate of Accreditation (LLDA)','LLDA Clearance','Permit to Transport (PTT)','Permit to Operate (PTO)','Discharge Permit (DP)',"Hazardous Waste Generator's ID",'Permit to Transport (Haz Waste)','Permit to Transport (Logs)','Tree Cutting Permit (STCP or S/PLTP)','Permit to Cut Coconut Tree','NWRB Water Permit'];
        const wb = eshNewWorkbook('ESH');
        const ws = wb.addWorksheet('Permits');
        const cols = 6;
        _xTitle(ws, title+' — '+year, cols);
        const hdr = ws.addRow(['PROJECT','PERMIT TYPE','PERMIT NO. / ACCREDITATION NO.','DATE ISSUED','EXPIRY DATE','STATUS']);
        hdr.height=22; hdr.eachCell(_xHdr);

        function fmtDate(d){
            if (!d) return '—';
            try{const dt=new Date(d);return isNaN(dt)?d:dt.toLocaleDateString('en-PH',{year:'numeric',month:'short',day:'numeric'});}catch(e){return d;}
        }
        function getEntries(proj,row){
            const key='permits_'+row; const raw=proj.vals&&proj.vals[key];
            if (!raw) return [{permitNo:'',dateIssued:'',expiryDate:''}];
            if (raw.entries&&raw.entries.length) return raw.entries;
            return [{permitNo:raw[1]||'',dateIssued:raw[2]||'',expiryDate:raw[3]||''}];
        }
        function permitStatus(expiryDate,row){
            if ((window.NO_EXPIRY_PERMITS||[]).includes(row)) return 'Until Completion';
            if (!expiryDate) return '—';
            const exp=new Date(expiryDate), now=new Date();
            const diff=(exp-now)/(1000*60*60*24);
            if (diff<0) return 'EXPIRED'; if (diff<=90) return 'EXPIRING SOON'; return 'VALID';
        }

        let ri=3;
        REGIONS.forEach(function(region){
            const rp=projs.filter(function(p){return (p.region||'').toUpperCase()===region;});
            if (!rp.length) return;
            const ban=ws.addRow([region]);
            ws.mergeCells(ri,1,ri,cols); _xBan(ban.getCell(1),'📌 '+region); ban.height=16; ri++;
            rp.forEach(function(proj,pIdx){
                let firstRow=true;
                PERMIT_ROWS.forEach(function(row){
                    const key='permits_'+row;
                    const raw=proj.vals&&proj.vals[key];
                    if (raw&&raw.na) return;
                    const entries=getEntries(proj,row);
                    entries.forEach(function(e){
                        const status=permitStatus(e.expiryDate,row);
                        const dr=ws.addRow([firstRow?proj.name||'':'',row,e.permitNo||'',fmtDate(e.dateIssued),fmtDate(e.expiryDate),status]);
                        dr.height=15;
                        dr.getCell(1).font={bold:true,size:9,name:'Calibri'}; dr.getCell(1).alignment={vertical:'middle'};
                        dr.getCell(2).font={italic:true,size:8.5,name:'Calibri'}; dr.getCell(2).alignment={vertical:'middle',wrapText:true};
                        dr.getCell(3).font={size:9,name:'Calibri'}; dr.getCell(3).alignment={vertical:'middle',horizontal:'center'};
                        dr.getCell(4).font={size:9,name:'Calibri'}; dr.getCell(4).alignment={vertical:'middle',horizontal:'center'};
                        dr.getCell(5).font={size:9,name:'Calibri'}; dr.getCell(5).alignment={vertical:'middle',horizontal:'center'};
                        const sc=dr.getCell(6);
                        sc.font={bold:true,size:9,name:'Calibri'}; sc.alignment={vertical:'middle',horizontal:'center'};
                        if (status==='VALID')        {sc.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFC8E6C9'}};sc.font.color={argb:'FF1B5E20'};}
                        else if (status==='EXPIRED') {sc.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFFFCDD2'}};sc.font.color={argb:'FFB71C1C'};}
                        else if (status==='EXPIRING SOON'){sc.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFFFF9C4'}};sc.font.color={argb:'FF82500D'};}
                        if (pIdx%2===0&&!['VALID','EXPIRED','EXPIRING SOON'].includes(status)) _xAlt(dr,cols);
                        firstRow=false; ri++;
                    });
                });
                ws.getRow(ri).height=4; ri++;
            });
        });
        ws.getColumn(1).width=32; ws.getColumn(2).width=40; ws.getColumn(3).width=28;
        ws.getColumn(4).width=16; ws.getColumn(5).width=18; ws.getColumn(6).width=16;
        ws.views=[{state:'frozen',ySplit:2,activeCell:'A3'}];
        await _xSave(wb,'permits'); return;
    }

    // ════════════════════════════════════════════════════════════════════════
    // CSHP / REG / DOE-PERMIT (single date value per project)
    // ════════════════════════════════════════════════════════════════════════
    if (['cshp','reg','doe-permit'].includes(tab)) {
        const labelMap = {cshp:'CSHP Approval Date',reg:'DOLE Cert. of Registration Date','doe-permit':'DOE Safety Officer Permit'};
        const colLabel = labelMap[tab]||'DATE';
        const wb = eshNewWorkbook('ESH');
        const ws = wb.addWorksheet(tab.toUpperCase());
        _xTitle(ws, title+' — '+year, 3);
        const hdr = ws.addRow(['PROJECT','REGION',colLabel]);
        hdr.height=22; hdr.eachCell(_xHdr);
        let ri=3;
        REGIONS.forEach(function(region){
            const rp=projs.filter(function(p){return (p.region||'').toUpperCase()===region;});
            if (!rp.length) return;
            const ban=ws.addRow([region]);
            ws.mergeCells(ri,1,ri,3); _xBan(ban.getCell(1),'📌 '+region); ban.height=16; ri++;
            rp.forEach(function(proj,pIdx){
                const key=tab+'_'+labelMap[tab];
                const raw=proj.vals&&proj.vals[key];
                const dateVal=raw&&raw[1]?String(raw[1]):'—';
                const dr=ws.addRow([proj.name||'',proj.region||'',dateVal]);
                dr.height=15;
                dr.getCell(1).font={bold:true,size:9,name:'Calibri'}; dr.getCell(1).alignment={vertical:'middle'};
                dr.getCell(2).font={size:9,name:'Calibri'}; dr.getCell(2).alignment={vertical:'middle'};
                _xData(dr.getCell(3),'center');
                if (pIdx%2===0) _xAlt(dr,3);
                ri++;
            });
            ws.getRow(ri).height=5; ri++;
        });
        ws.getColumn(1).width=36; ws.getColumn(2).width=22; ws.getColumn(3).width=26;
        ws.views=[{state:'frozen',ySplit:2,activeCell:'A3'}];
        await _xSave(wb,tab); return;
    }

    // ════════════════════════════════════════════════════════════════════════
    // AUDIT
    // ════════════════════════════════════════════════════════════════════════
    if (tab === 'audit') {
        function _auditVal(proj,qtr,field){const v=proj&&proj.auditData&&proj.auditData[qtr]&&proj.auditData[qtr][field];return (v!==undefined&&v!==null&&v!==0)?v:'';}
        const wb = eshNewWorkbook('ESH');
        const ws = wb.addWorksheet('Audit');
        const cols=16;
        _xTitle(ws, title+' — '+year, cols);
        const hdr=ws.addRow(['PROJECT','REGION','Q1 IMPL','Q1 DOC','Q1 AVG','Q2 IMPL','Q2 DOC','Q2 AVG','Q3 IMPL','Q3 DOC','Q3 AVG','Q4 IMPL','Q4 DOC','Q4 AVG','GRAND AVG','REMARKS']);
        hdr.height=22; hdr.eachCell(_xHdr);
        let ri=3;
        REGIONS.forEach(function(region){
            const rp=projs.filter(function(p){return (p.region||'').toUpperCase()===region;});
            if (!rp.length) return;
            const ban=ws.addRow([region]);
            ws.mergeCells(ri,1,ri,cols); _xBan(ban.getCell(1),'📌 '+region); ban.height=16; ri++;
            rp.forEach(function(proj,pIdx){
                const rowArr=[proj.name||'',proj.region||''];
                const allAvgs=[];
                ['Q1','Q2','Q3','Q4'].forEach(function(q){
                    const impl=_auditVal(proj,q,'scoreImpl');
                    const dc=_auditVal(proj,q,'docuComp');
                    const avg=(impl!==''&&dc!=='')?((+impl+ +dc)/2).toFixed(1):'';
                    rowArr.push(impl!==''?impl:'—',dc!==''?dc:'—',avg!==''?avg:'—');
                    if (avg!=='') allAvgs.push(parseFloat(avg));
                });
                const grand=allAvgs.length?(allAvgs.reduce(function(a,b){return a+b;},0)/allAvgs.length).toFixed(1):'—';
                rowArr.push(grand,proj.auditRemarks||'');
                const dr=ws.addRow(rowArr); dr.height=15;
                dr.getCell(1).font={bold:true,size:9,name:'Calibri'}; dr.getCell(1).alignment={vertical:'middle'};
                dr.getCell(2).font={size:9,name:'Calibri'}; dr.getCell(2).alignment={vertical:'middle'};
                for (let ci=3;ci<=14;ci++){_xData(dr.getCell(ci),'center');}
                // Grand avg color
                const gCell=dr.getCell(15); const gv=parseFloat(grand);
                gCell.font={bold:true,size:9,name:'Calibri'}; gCell.alignment={vertical:'middle',horizontal:'center'};
                if (!isNaN(gv)){
                    if (gv>=90){gCell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFC8E6C9'}};gCell.font.color={argb:'FF1B5E20'};}
                    else if (gv>=75){gCell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFFFF9C4'}};gCell.font.color={argb:'FF82500D'};}
                    else {gCell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFFFCDD2'}};gCell.font.color={argb:'FFB71C1C'};}
                }
                dr.getCell(16).font={italic:true,size:8.5,name:'Calibri'}; dr.getCell(16).alignment={vertical:'middle',wrapText:true};
                if (pIdx%2===0) _xAlt(dr,cols);
                ri++;
            });
            ws.getRow(ri).height=5; ri++;
        });
        ws.getColumn(1).width=36; ws.getColumn(2).width=22;
        for (let ci=3;ci<=14;ci++) ws.getColumn(ci).width=9;
        ws.getColumn(15).width=12; ws.getColumn(16).width=28;
        ws.views=[{state:'frozen',ySplit:2,activeCell:'A3'}];
        await _xSave(wb,'audit'); return;
    }

    // ════════════════════════════════════════════════════════════════════════
    // LTA REGISTRY
    // ════════════════════════════════════════════════════════════════════════
    if (tab === 'lta-registry') {
        function getDlOne(e){
            let dl=e.daysLostComputed||'';
            if (!dl){if(e.injuryType==='na'){dl=0;}else if(e.scheduledChargeItem&&typeof SCHEDULED_CHARGES!=='undefined'&&SCHEDULED_CHARGES[e.scheduledChargeItem])dl=SCHEDULED_CHARGES[e.scheduledChargeItem];else if(e.dateOfAccident&&e.dateRTW&&typeof computeDaysLost==='function')dl=computeDaysLost(e.dateOfAccident,e.dateRTW);}
            return dl||'—';
        }
        // Days lost of an entry = sum of every injured person (same rule per person)
        function getDl(e){
            const ps=(typeof window.ltaEntryPersons==='function')?window.ltaEntryPersons(e):[e];
            if (ps.length<2) return getDlOne(e);
            let tot=0, known=false;
            ps.forEach(function(pp){const v=getDlOne(pp); if (v!=='?'&&v!=='—'&&v!==''){tot+=Number(v)||0; known=true;}});
            return known?tot:getDlOne(ps[0]);
        }
        // Classification count: one per injured person
        function _cnt(list,name){
            let n=0;
            list.forEach(function(e){
                const ps=(typeof window.ltaEntryPersons==='function')?window.ltaEntryPersons(e):[e];
                ps.forEach(function(pp){if (pp.incidentClassification===name) n++;});
            });
            return n;
        }
        const wb=eshNewWorkbook('ESH');
        // Summary sheet
        const sumWs=wb.addWorksheet('Summary');
        _xTitle(sumWs,'INCIDENT & ACCIDENT REGISTRY — '+year,7);
        const sHdr=sumWs.addRow(['REGION','TOTAL','LTA','MEDICAL TREATMENT','FIRST AID','FATALITY','HIGH POTENTIAL']);
        sHdr.height=22; sHdr.eachCell(_xHdr);
        let sri=3;
        REGIONS.forEach(function(region){
            const rp=projs.filter(function(p){return (p.region||'').toUpperCase()===region;});
            if (!rp.length) return;
            const rE=rp.flatMap(function(p){return p.vals&&p.vals['lta-registry_entries']?p.vals['lta-registry_entries']:[];});
            const dr=sumWs.addRow([region,rE.length,_cnt(rE,'LTA'),_cnt(rE,'Medical Treatment'),_cnt(rE,'First Aid'),_cnt(rE,'Fatality'),_cnt(rE,'High-Potential incident')]);
            dr.height=16; dr.getCell(1).font={bold:true,size:9,name:'Calibri'}; dr.getCell(1).alignment={vertical:'middle'};
            for (let ci=2;ci<=7;ci++){_xData(dr.getCell(ci),'center');}
            const ltaCell=dr.getCell(3); const ltaV=parseInt(dr.getCell(3).value);
            if (!isNaN(ltaV)&&ltaV>0){ltaCell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFFFCDD2'}};ltaCell.font={bold:true,size:9,name:'Calibri',color:{argb:'FFB71C1C'}};}
            if (sri%2===0) _xAlt(dr,7);
            sri++;
        });
        sumWs.getColumn(1).width=28; for (let ci=2;ci<=7;ci++) sumWs.getColumn(ci).width=18;
        sumWs.views=[{state:'frozen',ySplit:2,activeCell:'A3'}];

        // One sheet per region with detail rows
        REGIONS.forEach(function(region){
            const rp=projs.filter(function(p){return (p.region||'').toUpperCase()===region;});
            if (!rp.length) return;
            const sheetName=region.replace(/[*?:/\\[\]]/g,'').substring(0,31);
            const ws=wb.addWorksheet(sheetName);
            const cols=12;
            _xTitle(ws,region+' — INCIDENT REGISTRY — '+year,cols);
            const hdr=ws.addRow(['#','PROJECT','AIIR NO.','DATE OF ACCIDENT','CLASSIFICATION','INJURED PERSON','NATURE OF INJURY','BODY PARTS AFFECTED','CAUSE OF INJURY','AGENT OF INJURY','DAYS LOST','ROOT CAUSE']);
            hdr.height=22; hdr.eachCell(_xHdr);
            let ri=3,rowNum=1;
            rp.forEach(function(proj){
                const entries=(proj.vals&&proj.vals['lta-registry_entries'])||[];
                entries.forEach(function(e,pIdx){
                    const _ps=(typeof window.ltaEntryPersons==='function')?window.ltaEntryPersons(e):[e];
                    const _jn=function(f){return _ps.length<2?f(_ps[0]):_ps.map(function(pp,i){return (i+1)+') '+f(pp);}).join(' | ');};
                    const nat=_jn(function(pp){return Array.isArray(pp.natureOfInjury)?pp.natureOfInjury.join(', '):(pp.natureOfInjury||'');});
                    const bpa=_jn(function(pp){return Array.isArray(pp.bodyPartsAffected)?pp.bodyPartsAffected.join(', '):(pp.bodyPartsAffected||'');});
                    const cai=_jn(function(pp){return Array.isArray(pp.causeOfInjury)?pp.causeOfInjury.map(function(v){return window._ltaCbLabel?window._ltaCbLabel(v,pp.causeOfInjuryOther):v;}).join(', '):(pp.causeOfInjury||'');});
                    const agi=_jn(function(pp){return Array.isArray(pp.agentOfInjury)?pp.agentOfInjury.map(function(v){return window._ltaCbLabel?window._ltaCbLabel(v,pp.agentOfInjuryOther):v;}).join(', '):(pp.agentOfInjury||'');});
                    const cl=_ps.length<2?(e.incidentClassification||''):_ps.map(function(pp,i){return (i+1)+') '+(pp.incidentClassification||'');}).join(' | ');
                    const _isLta=_ps.some(function(pp){return pp.incidentClassification==='LTA';});
                    const _isFat=_ps.some(function(pp){return pp.incidentClassification==='Fatality';});
                    const dr=ws.addRow([rowNum++,proj.name||'',e.aiirNo||'',e.dateOfAccident||'',cl,_jn(function(pp){return pp.injuredPersonName||'';}),nat,bpa,cai,agi,getDl(e),(e.rootCause||'').substring(0,200)]);
                    dr.height=16;
                    dr.getCell(1).font={size:9,name:'Calibri'}; dr.getCell(1).alignment={vertical:'middle',horizontal:'center'};
                    dr.getCell(2).font={bold:true,size:9,name:'Calibri'}; dr.getCell(2).alignment={vertical:'middle'};
                    for (let ci=3;ci<=12;ci++){_xData(dr.getCell(ci),ci<=3||ci===11?'center':'left');}
                    const clCell=dr.getCell(5);
                    if (_isLta){clCell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFFFCDD2'}};clCell.font={bold:true,size:9,name:'Calibri',color:{argb:'FFB71C1C'}};}
                    else if (_isFat){clCell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFB71C1C'}};clCell.font={bold:true,size:9,name:'Calibri',color:{argb:'FFFFFFFF'}};}
                    if (pIdx%2===0) _xAlt(dr,cols);
                    ri++;
                });
            });
            ws.getColumn(1).width=5; ws.getColumn(2).width=30; ws.getColumn(3).width=16;
            ws.getColumn(4).width=14; ws.getColumn(5).width=20; ws.getColumn(6).width=22;
            ws.getColumn(7).width=22; ws.getColumn(8).width=22; ws.getColumn(9).width=26; ws.getColumn(10).width=26; ws.getColumn(11).width=10; ws.getColumn(12).width=36;
            ws.views=[{state:'frozen',ySplit:2,activeCell:'A3'}];
        });
        await _xSave(wb,'lta-registry'); return;
    }

    // ════════════════════════════════════════════════════════════════════════
    // TABULATION
    // ════════════════════════════════════════════════════════════════════════
    if (tab === 'tabulation') {
        const tRows={fatality:new Array(14).fill(0),lta:new Array(14).fill(0),firstAid:new Array(14).fill(0),medical:new Array(14).fill(0),highPotential:new Array(14).fill(0),dangerousOccurrence:new Array(14).fill(0),oshNov:new Array(14).fill(0),envNov:new Array(14).fill(0)};
        const _tYear = state.selectedYear || new Date().getFullYear();
        function _tNovSlot(d){
            if(!d) return null;
            const parts=(d+'').split('-'); const y=parseInt(parts[0]); const m=parseInt(parts[1]);
            if(isNaN(m)||m<1||m>12) return null;
            if(!isNaN(y)){ if(y<_tYear) return 0; if(y>_tYear) return null; }
            return m;
        }
        projs.forEach(function(p){
            if (!p.vals) return;
            for (let i=0;i<=13;i++){
                tRows.fatality[i]            +=parseFloat(p.vals['medical_Fatality']?.[i])||0;
                tRows.lta[i]                 +=parseFloat(p.vals['medical_LTA']?.[i])||0;
                tRows.firstAid[i]            +=parseFloat(p.vals['medical_First Aid']?.[i])||0;
                tRows.medical[i]             +=parseFloat(p.vals['medical_Medical Treatment']?.[i])||0;
                tRows.highPotential[i]       +=parseFloat(p.vals['medical_High-Potential incident']?.[i])||0;
                tRows.dangerousOccurrence[i] +=parseFloat(p.vals['medical_Dangerous Occurrences']?.[i])||0;
            }
            const oshNovs=[...(p.vals['osh-nov_internal_novs']||[]),...(p.vals['osh-nov_external_novs']||[])];
            oshNovs.forEach(function(n){const m=_tNovSlot(n.dateIssued);if(m!==null)tRows.oshNov[m]++;});
            const envNovs=[...(p.vals['nov-env_internal_novs']||[]),...(p.vals['nov-env_external_novs']||[])];
            envNovs.forEach(function(n){const m=_tNovSlot(n.dateIssued);if(m!==null)tRows.envNov[m]++;});
        });
        function buildRow(label,arr){const prev=Math.round(arr[0]);const months=[];let total=0;for(let i=1;i<=12;i++){const v=Math.round(arr[i]);months.push(v);total+=v;}return[label,prev,...months,total,prev+total];}
        const summaryRows=[buildRow('Fatality',tRows.fatality),buildRow('LTA',tRows.lta),buildRow('First Aid',tRows.firstAid),buildRow('Medical Treatment',tRows.medical),buildRow('High-Potential Incident',tRows.highPotential),buildRow('Dangerous Occurrences',tRows.dangerousOccurrence),buildRow('OSH Regulatory Issued NOV',tRows.oshNov),buildRow('ENVI Regulatory Issued NOV',tRows.envNov)];
        const wb=eshNewWorkbook('ESH');
        const ws=wb.addWorksheet('Tabulation');
        const cols=16;
        _xTitle(ws,'INCIDENT / ACCIDENT TABULATION — '+year,cols);
        const hdr=ws.addRow(['CATEGORY','PREV YEAR',...MO_SHORT,'YEARLY TOTAL','ACCUMULATED TOTAL']);
        hdr.height=22; hdr.eachCell(_xHdr);
        let ri=3;
        summaryRows.forEach(function(row,pIdx){
            const dr=ws.addRow(row); dr.height=18;
            dr.getCell(1).font={bold:true,size:10,name:'Calibri'}; dr.getCell(1).alignment={vertical:'middle'};
            for (let ci=2;ci<=cols;ci++){const c=dr.getCell(ci);c.font={bold:ci>=15?true:false,size:10,name:'Calibri'};c.alignment={vertical:'middle',horizontal:'center'};}
            // Highlight LTA and Fatality rows
            if (row[0]==='LTA'||row[0]==='Fatality'){
                for (let ci=2;ci<=cols;ci++){const c=dr.getCell(ci);const v=parseInt(c.value);if(!isNaN(v)&&v>0){c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFFFCDD2'}};c.font={bold:true,size:10,name:'Calibri',color:{argb:'FFB71C1C'}};}}
            }
            if (pIdx%2===0) _xAlt(dr,cols);
            ri++;
        });
        // Grand total row
        const grand=[' TOTAL']; for (let ci=1;ci<=15;ci++){grand.push(summaryRows.reduce(function(s,r){return s+(parseInt(r[ci])||0);},0));}
        const gdr=ws.addRow(grand); gdr.height=20;
        gdr.eachCell(function(c,ci){c.font={bold:true,size:10,name:'Calibri'};c.alignment={vertical:'middle',horizontal:ci===1?'left':'center'};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF'+C_TOT_BG}};});
        ws.getColumn(1).width=36; ws.getColumn(2).width=12;
        for (let ci=3;ci<=14;ci++) ws.getColumn(ci).width=8;
        ws.getColumn(15).width=14; ws.getColumn(16).width=18;
        ws.views=[{state:'frozen',ySplit:2,activeCell:'A3'}];

        // ── Sheet 2: Incident Mechanism ──────────────────────────────────────
        const mechData = computeMechanismFromLta(projs);
        const mechWs   = wb.addWorksheet('Incident Mechanism');
        const mechCols = 14; // Mechanism + 12 months + Total
        _xTitle(mechWs, 'INCIDENT MECHANISM — ' + year, mechCols);
        const mechHdr = mechWs.addRow(['INCIDENT MECHANISM', ...MO_SHORT, 'TOTAL']);
        mechHdr.height = 22; mechHdr.eachCell(_xHdr);
        mechData.rows.forEach(function(row, pIdx) {
            const mechanism = row[0];
            const months    = row.slice(1); // 12 month values
            const total     = months.reduce(function(s, v) { return s + (parseInt(v) || 0); }, 0);
            const dr = mechWs.addRow([mechanism, ...months, total]);
            dr.height = 16;
            dr.getCell(1).font      = { bold: true, size: 9, name: 'Calibri' };
            dr.getCell(1).alignment = { vertical: 'middle' };
            for (let ci = 2; ci <= mechCols; ci++) {
                const c = dr.getCell(ci);
                c.font      = { bold: ci === mechCols, size: 9, name: 'Calibri' };
                c.alignment = { vertical: 'middle', horizontal: 'center' };
                if (ci === mechCols && parseInt(c.value) > 0) {
                    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
                    c.font = { bold: true, size: 9, name: 'Calibri', color: { argb: 'FF1B5E20' } };
                }
            }
            if (pIdx % 2 === 0) _xAlt(dr, mechCols);
        });
        // Grand total row
        const mechGrand = ['TOTAL'];
        for (let ci = 0; ci < 12; ci++) { mechGrand.push(mechData.total[ci] || 0); }
        mechGrand.push(mechData.total.reduce(function(s, v) { return s + (v || 0); }, 0));
        const mechGdr = mechWs.addRow(mechGrand);
        mechGdr.height = 20;
        mechGdr.eachCell(function(c, ci) {
            c.font      = { bold: true, size: 10, name: 'Calibri' };
            c.alignment = { vertical: 'middle', horizontal: ci === 1 ? 'left' : 'center' };
            c.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_TOT_BG } };
        });
        mechWs.getColumn(1).width = 36;
        for (let ci = 2; ci <= mechCols; ci++) mechWs.getColumn(ci).width = ci === mechCols ? 10 : 8;
        mechWs.views = [{ state: 'frozen', ySplit: 2, activeCell: 'A3' }];

        // ── Sheet 3: Contributing Factors ────────────────────────────────────
        const factData  = computeFactorsFromLta(projs);
        const factWs    = wb.addWorksheet('Contributing Factors');
        const factCols  = 15; // Category + Sub-Factor + 12 months + Total
        _xTitle(factWs, 'CONTRIBUTING FACTORS — ' + year, factCols);
        const factHdr = factWs.addRow(['CATEGORY', 'CONTRIBUTING FACTOR', ...MO_SHORT, 'TOTAL']);
        factHdr.height = 22; factHdr.eachCell(_xHdr);
        let lastCat = '';
        factData.rows.forEach(function(row, pIdx) {
            const cat    = row[0];
            const sub    = row[1];
            const months = row.slice(2); // 12 month values
            const total  = months.reduce(function(s, v) { return s + (parseInt(v) || 0); }, 0);
            // Category banner row when category changes
            if (cat && cat !== lastCat) {
                const banIdx = factWs.rowCount + 1;
                const banRow = factWs.addRow([cat]);
                factWs.mergeCells(banIdx, 1, banIdx, factCols);
                _xBan(banRow.getCell(1), '▶  ' + cat);
                banRow.height = 16;
                lastCat = cat;
            }
            const dr = factWs.addRow(['', sub, ...months, total]);
            dr.height = 16;
            dr.getCell(1).value = '';
            dr.getCell(2).font      = { bold: false, size: 9, name: 'Calibri' };
            dr.getCell(2).alignment = { vertical: 'middle' };
            for (let ci = 3; ci <= factCols; ci++) {
                const c = dr.getCell(ci);
                c.font      = { bold: ci === factCols, size: 9, name: 'Calibri' };
                c.alignment = { vertical: 'middle', horizontal: 'center' };
                if (ci === factCols && parseInt(c.value) > 0) {
                    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
                    c.font = { bold: true, size: 9, name: 'Calibri', color: { argb: 'FF1B5E20' } };
                }
            }
            if (pIdx % 2 === 0) _xAlt(dr, factCols);
        });
        // Grand total row
        const factGrand = ['', 'TOTAL'];
        for (let ci = 0; ci < 12; ci++) { factGrand.push(factData.total[ci] || 0); }
        factGrand.push(factData.total.reduce(function(s, v) { return s + (v || 0); }, 0));
        const factGdr = factWs.addRow(factGrand);
        factGdr.height = 20;
        factGdr.eachCell(function(c, ci) {
            c.font      = { bold: true, size: 10, name: 'Calibri' };
            c.alignment = { vertical: 'middle', horizontal: ci <= 2 ? 'left' : 'center' };
            c.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_TOT_BG } };
        });
        factWs.getColumn(1).width = 18;
        factWs.getColumn(2).width = 36;
        for (let ci = 3; ci <= factCols; ci++) factWs.getColumn(ci).width = ci === factCols ? 10 : 8;
        factWs.views = [{ state: 'frozen', ySplit: 2, activeCell: 'A3' }];

        // ── Sheet 4: Agent of Injury ─────────────────────────────────────────
        const agData  = computeAgentOfInjuryFromLta(projs);
        const agWs    = wb.addWorksheet('Agent of Injury');
        const agCols  = 14; // Agent + 12 months + Total
        _xTitle(agWs, 'AGENT OF INJURY — ' + year, agCols);
        const agHdr = agWs.addRow(['AGENT OF INJURY', ...MO_SHORT, 'TOTAL']);
        agHdr.height = 22; agHdr.eachCell(_xHdr);
        agData.rows.forEach(function(row, pIdx) {
            const months = row.slice(1);
            const total  = months.reduce(function(s, v) { return s + (parseInt(v) || 0); }, 0);
            const dr = agWs.addRow([row[0], ...months, total]);
            dr.height = 16;
            dr.getCell(1).font      = { bold: true, size: 9, name: 'Calibri' };
            dr.getCell(1).alignment = { vertical: 'middle' };
            for (let ci = 2; ci <= agCols; ci++) {
                const c = dr.getCell(ci);
                c.font      = { bold: ci === agCols, size: 9, name: 'Calibri' };
                c.alignment = { vertical: 'middle', horizontal: 'center' };
                if (ci === agCols && parseInt(c.value) > 0) {
                    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
                    c.font = { bold: true, size: 9, name: 'Calibri', color: { argb: 'FF1B5E20' } };
                }
            }
            if (pIdx % 2 === 0) _xAlt(dr, agCols);
        });
        const agGrand = ['TOTAL'];
        for (let ci = 0; ci < 12; ci++) { agGrand.push(agData.total[ci] || 0); }
        agGrand.push(agData.total.reduce(function(s, v) { return s + (v || 0); }, 0));
        const agGdr = agWs.addRow(agGrand);
        agGdr.height = 20;
        agGdr.eachCell(function(c, ci) {
            c.font      = { bold: true, size: 10, name: 'Calibri' };
            c.alignment = { vertical: 'middle', horizontal: ci === 1 ? 'left' : 'center' };
            c.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_TOT_BG } };
        });
        agWs.getColumn(1).width = 52;
        for (let ci = 2; ci <= agCols; ci++) agWs.getColumn(ci).width = ci === agCols ? 10 : 8;
        agWs.views = [{ state: 'frozen', ySplit: 2, activeCell: 'A3' }];

        await _xSave(wb,'tabulation'); return;
    }

    // ════════════════════════════════════════════════════════════════════════
    // OSH REQUIREMENT
    // ════════════════════════════════════════════════════════════════════════
    if (tab === 'osh-requirement') {
        function _oshMpLocal(p){return (typeof getOshManpower==='function')?getOshManpower(p):0;}
        const filtered=projs.filter(function(p){return p.region!=='CORPORATE'&&p.region!=='PLANT OPERATIONS';});
        const wb=eshNewWorkbook('ESH');
        const ws=wb.addWorksheet('OSH Requirement');
        const cols=7;
        _xTitle(ws,title+' — '+year,cols);
        const hdr=ws.addRow(['PROJECT','REGION','MANPOWER','REQ. 1ST AIDER','REQ. SAFETY OFFICER','REQ. OH NURSE','REQ. OH PHYSICIAN']);
        hdr.height=22; hdr.eachCell(_xHdr);
        let ri=3;
        REGIONS.forEach(function(region){
            const rp=filtered.filter(function(p){return (p.region||'').toUpperCase()===region;});
            if (!rp.length) return;
            const ban=ws.addRow([region]); ws.mergeCells(ri,1,ri,cols);
            _xBan(ban.getCell(1),'📌 '+region+' ('+rp.length+' project'+(rp.length!==1?'s':'')+')'); ban.height=16; ri++;
            rp.forEach(function(proj,pIdx){
                const mp=_oshMpLocal(proj);
                const req=(typeof computeOshRequirements==='function')?computeOshRequirements(mp):null;
                const dr=ws.addRow([proj.name||'',proj.region||'',mp>0?mp:'—',req?req.firstAider:'—',req?(req.safetyOfficer+(req.soLabel?' ('+req.soLabel+')':'')):  '—',req?(req.ohNurse+(req.nurseLabel?' ('+req.nurseLabel+')':'')):'—',req?(req.ohPhysician>0?req.ohPhysician+(req.physLabel?' ('+req.physLabel+')':''):'0'):'—']);
                dr.height=15;
                dr.getCell(1).font={bold:true,size:9,name:'Calibri'}; dr.getCell(1).alignment={vertical:'middle'};
                dr.getCell(2).font={size:9,name:'Calibri'}; dr.getCell(2).alignment={vertical:'middle'};
                for (let ci=3;ci<=cols;ci++){_xData(dr.getCell(ci),'center');}
                if (mp===0){for (let ci=3;ci<=cols;ci++){dr.getCell(ci).font={italic:true,size:9,name:'Calibri',color:{argb:'FF9E9E9E'}};}}
                if (pIdx%2===0) _xAlt(dr,cols);
                ri++;
            });
            ws.getRow(ri).height=5; ri++;
        });
        ws.getColumn(1).width=36; ws.getColumn(2).width=22; ws.getColumn(3).width=12;
        for (let ci=4;ci<=cols;ci++) ws.getColumn(ci).width=22;
        ws.views=[{state:'frozen',ySplit:2,activeCell:'A3'}];
        await _xSave(wb,'osh-requirement'); return;
    }

    // ════════════════════════════════════════════════════════════════════════
    // DOE REPORTORIAL (Renewable Energy)
    // ════════════════════════════════════════════════════════════════════════
    if (tab === 'doe') {
        const KEY='doe_DOE Quarterly Report Submission Date';
        const reProjs=projs.filter(function(p){return p.isRenewable===true;});
        const wb=eshNewWorkbook('ESH');
        const ws=wb.addWorksheet('DOE Reportorial');
        const cols=6;
        _xTitle(ws,'DOE REPORTORIAL — RENEWABLE ENERGY — '+year,cols);
        const hdr=ws.addRow(['PROJECT','REGION','Q1 SUBMISSION','Q2 SUBMISSION','Q3 SUBMISSION','Q4 SUBMISSION']);
        hdr.height=22; hdr.eachCell(_xHdr);
        function fmtDate(d){if(!d)return '—';try{const dt=new Date(d);return isNaN(dt)?d:dt.toLocaleDateString('en-PH',{year:'numeric',month:'short',day:'numeric'});}catch(e){return d;}}
        let ri=3;
        REGIONS.forEach(function(region){
            const rp=reProjs.filter(function(p){return (p.region||'').toUpperCase()===region;});
            if (!rp.length) return;
            const ban=ws.addRow([region]); ws.mergeCells(ri,1,ri,cols);
            _xBan(ban.getCell(1),'📌 '+region); ban.height=16; ri++;
            rp.forEach(function(proj,pIdx){
                const v=proj.vals&&proj.vals[KEY];
                const dr=ws.addRow([proj.name||'',proj.region||'',fmtDate(v&&v[1]),fmtDate(v&&v[2]),fmtDate(v&&v[3]),fmtDate(v&&v[4])]);
                dr.height=15;
                dr.getCell(1).font={bold:true,size:9,name:'Calibri'}; dr.getCell(1).alignment={vertical:'middle'};
                dr.getCell(2).font={size:9,name:'Calibri'}; dr.getCell(2).alignment={vertical:'middle'};
                for (let ci=3;ci<=cols;ci++){_xData(dr.getCell(ci),'center');}
                if (pIdx%2===0) _xAlt(dr,cols);
                ri++;
            });
            ws.getRow(ri).height=5; ri++;
        });
        ws.getColumn(1).width=36; ws.getColumn(2).width=22;
        for (let ci=3;ci<=cols;ci++) ws.getColumn(ci).width=18;
        ws.views=[{state:'frozen',ySplit:2,activeCell:'A3'}];
        await _xSave(wb,'doe-reportorial'); return;
    }

    // ════════════════════════════════════════════════════════════════════════
    // GOT MONITORING — KPM-style layout (columns = projects, rows = goals)
    // ════════════════════════════════════════════════════════════════════════
    if (tab === 'got-monitoring') {
        if (typeof window.COMPLIANCE_GOALS==='undefined'||typeof window.gotGetCell==='undefined'){
            showToast('GOT Monitoring data not available for export.','info'); return;
        }
        const COMPLIANCE_GOALS = window.COMPLIANCE_GOALS;
        const GOAL_MEASURES    = window.GOAL_MEASURES || {};
        const gotGetCell       = window.gotGetCell;

        // ── Helpers ───────────────────────────────────────────────────────
        function fmtRating(raw) {
            if (!raw || raw === '') return '';
            const v = parseFloat(raw);
            return isNaN(v) ? '' : Math.round(v * 100) + '%';
        }
        function ratingColor(raw) {
            const v = parseFloat(raw);
            if (isNaN(v) || !raw) return null;
            if (v >= 1.00) return { bg: 'C8E6C9', fg: '1B5E20' };
            if (v >= 0.75) return { bg: 'FFF9C4', fg: '82500D' };
            if (v >= 0.50) return { bg: 'FFF9C4', fg: 'E65100' };
            return { bg: 'FFCDD2', fg: 'B71C1C' };
        }
        function goalMonthAvg(proj, gId, mo) {
            const measures = GOAL_MEASURES[gId] || [''];
            const vals = measures.map(function(_, mi) {
                const v = parseFloat(gotGetCell(proj, gId, mi, mo).r);
                return isNaN(v) ? null : v;
            }).filter(function(v) { return v !== null; });
            return vals.length ? vals.reduce(function(a,b){return a+b;},0)/vals.length : null;
        }
        function goalOverallAvg(proj, gId) {
            const vals = [];
            for (let mo = 1; mo <= 12; mo++) {
                const v = goalMonthAvg(proj, gId, mo);
                if (v !== null) vals.push(v);
            }
            return vals.length ? vals.reduce(function(a,b){return a+b;},0)/vals.length : null;
        }
        function projMonthAvg(proj, mo) {
            const vals = [];
            COMPLIANCE_GOALS.forEach(function(g) {
                const v = goalMonthAvg(proj, g.id, mo);
                if (v !== null) vals.push(v);
            });
            return vals.length ? vals.reduce(function(a,b){return a+b;},0)/vals.length : null;
        }
        function projOverallAvg(proj) {
            const vals = [];
            COMPLIANCE_GOALS.forEach(function(g) {
                const v = goalOverallAvg(proj, g.id);
                if (v !== null) vals.push(v);
            });
            return vals.length ? vals.reduce(function(a,b){return a+b;},0)/vals.length : null;
        }

        // ── Build project column map (same as KPM) ────────────────────────
        const GOT_REGIONS = ['NCR','SOUTH LUZON','NORTH LUZON','VISAYAS & MINDANAO'];
        const gotAllProjs = (state.filteredProjects || state.projects || []).filter(function(p) {
            const r = (p.region || '').toUpperCase();
            return r !== 'CORPORATE' && r !== 'PLANT OPERATIONS' && !p.dateFinished && p.status !== 'work-stoppage';
        });
        const sortedReg  = GOT_REGIONS.filter(function(r) { return gotAllProjs.some(function(p) { return (p.region||'').toUpperCase()===r; }); });
        const otherReg   = [...new Set(gotAllProjs.map(function(p){ return (p.region||'').toUpperCase(); }).filter(function(r){ return !GOT_REGIONS.includes(r); }))];
        const allRegOrder = [...sortedReg, ...otherReg];
        const projsByReg  = {};
        allRegOrder.forEach(function(r) { projsByReg[r] = gotAllProjs.filter(function(p){ return (p.region||'').toUpperCase()===r; }); });
        const orderedProjs = allRegOrder.flatMap(function(r){ return projsByReg[r]; });

        // colMap: { type: 'proj'|'avg'|'overall', proj?, region? }
        const colMap = [];
        allRegOrder.forEach(function(region) {
            projsByReg[region].forEach(function(proj) { colMap.push({ type: 'proj', proj, region }); });
            colMap.push({ type: 'avg', region });
        });
        colMap.push({ type: 'overall' });

        // LEFT fixed cols: CATEGORY | GOAL | TARGET | MEASURE
        const LEFT_COLS  = 4;
        const totalCols  = LEFT_COLS + colMap.length;

        const C_DARK_GREEN = '1B5E20';
        const C_MED_GREEN  = '2E7D32';
        const C_GRAY_HDR   = 'F5F5F5';
        const C_COL_HDR_BG = '37474F';
        const C_COL_HDR_FG = 'FFFFFF';

        // ── Style helpers (same as KPM) ───────────────────────────────────
        function applyHdr(cell, bgArgb, fgArgb) {
            cell.font      = { bold: true, color: { argb: 'FF' + (fgArgb || C_COL_HDR_FG) }, size: 9, name: 'Calibri' };
            cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + (bgArgb || C_COL_HDR_BG) } };
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            cell.border    = { top:{style:'thin',color:{argb:'FFB0BEC5'}}, bottom:{style:'thin',color:{argb:'FFB0BEC5'}}, left:{style:'thin',color:{argb:'FFB0BEC5'}}, right:{style:'thin',color:{argb:'FFB0BEC5'}} };
        }
        function applyLeft(cell, bold) {
            cell.font      = { bold: !!bold, size: 8.5, name: 'Calibri' };
            cell.alignment = { vertical: 'middle', wrapText: true };
            cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_GRAY_HDR } };
            cell.border    = { top:{style:'thin',color:{argb:'FFB0BEC5'}}, bottom:{style:'thin',color:{argb:'FFB0BEC5'}}, left:{style:'thin',color:{argb:'FFB0BEC5'}}, right:{style:'medium',color:{argb:'FF'+C_MED_GREEN}} };
        }
        function applyRatingCell(cell, rawVal) {
            const thinBorder = { top:{style:'thin',color:{argb:'FFB0BEC5'}}, bottom:{style:'thin',color:{argb:'FFB0BEC5'}}, left:{style:'thin',color:{argb:'FFB0BEC5'}}, right:{style:'thin',color:{argb:'FFB0BEC5'}} };
            cell.border    = thinBorder;
            const txt = fmtRating(rawVal);
            cell.value     = txt || '';
            cell.font      = { bold: !!txt, size: 9, name: 'Calibri' };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            if (txt) {
                const c = ratingColor(rawVal);
                if (c) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + c.bg } };
                    cell.font = { bold: true, size: 9, name: 'Calibri', color: { argb: 'FF' + c.fg } };
                }
            }
        }
        function applyAvgCell(cell, score) {
            cell.border = { top:{style:'medium',color:{argb:'FF'+C_MED_GREEN}}, bottom:{style:'medium',color:{argb:'FF'+C_MED_GREEN}}, left:{style:'medium',color:{argb:'FF'+C_MED_GREEN}}, right:{style:'medium',color:{argb:'FF'+C_MED_GREEN}} };
            if (score === null) { cell.value='—'; cell.font={size:9,name:'Calibri',color:{argb:'FF9E9E9E'}}; cell.alignment={horizontal:'center',vertical:'middle'}; return; }
            const pct = Math.round(score * 100) + '%';
            cell.value     = pct;
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            const c = ratingColor(score);
            if (c) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + c.bg } };
                cell.font = { bold: true, size: 10, name: 'Calibri', color: { argb: 'FF' + c.fg } };
            }
        }
        function addNotesRow(ws) {
            const noteRow = ws.addRow(['NOTES: Rating scale — 25%: Started  |  50%: Partial  |  75%: Mostly Done  |  100%: Fully Implemented']);
            ws.mergeCells(noteRow.number, 1, noteRow.number, totalCols);
            const nc = noteRow.getCell(1);
            nc.font      = { size: 8, name: 'Calibri', color: { argb: 'FF5D4037' }, italic: true };
            nc.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF9C4' } };
            nc.alignment = { vertical: 'middle', wrapText: true };
            noteRow.height = 18;
        }

        // ── Build one sheet ───────────────────────────────────────────────
        function buildGotKpmSheet(ws, sheetTitle, getValFn, getAvgFn) {
            // Row 1: Notes
            addNotesRow(ws);
            // Row 2: Spacer
            ws.addRow([]); ws.getRow(2).height = 6;

            // Row 3: Region header spans
            const regHdrRow = ws.addRow(Array(totalCols).fill(''));
            regHdrRow.height = 20;
            let colOffset = LEFT_COLS + 1;
            allRegOrder.forEach(function(region) {
                const pc = projsByReg[region].length;
                const spanStart = colOffset;
                const spanEnd   = colOffset + pc;
                const c = regHdrRow.getCell(spanStart);
                c.value = region;
                c.font  = { bold: true, color: { argb: 'FF' + C_COL_HDR_FG }, size: 10, name: 'Calibri' };
                c.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_DARK_GREEN } };
                c.alignment = { horizontal: 'center', vertical: 'middle' };
                if (spanEnd > spanStart) ws.mergeCells(regHdrRow.number, spanStart, regHdrRow.number, spanEnd);
                colOffset += pc + 1;
            });
            // OVERALL label
            const ovRegCell = regHdrRow.getCell(colOffset);
            ovRegCell.value = 'OVERALL'; ovRegCell.font = { bold: true, color: { argb: 'FF' + C_COL_HDR_FG }, size: 10, name: 'Calibri' };
            ovRegCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A237E' } };
            ovRegCell.alignment = { horizontal: 'center', vertical: 'middle' };
            for (let ci = 1; ci <= LEFT_COLS; ci++) {
                regHdrRow.getCell(ci).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_DARK_GREEN } };
            }

            // Row 4: Column headers
            const hdrData = ['Category', 'Goal', 'Target', 'Measure'];
            colMap.forEach(function(cm) {
                if (cm.type === 'proj') hdrData.push(cm.proj.name || '');
                else if (cm.type === 'avg') hdrData.push('REGION\nAVG');
                else hdrData.push('OVERALL\nAVG');
            });
            const hdrRow = ws.addRow(hdrData);
            hdrRow.height = 45;
            for (let ci = 1; ci <= LEFT_COLS; ci++) applyHdr(hdrRow.getCell(ci), C_COL_HDR_BG, C_COL_HDR_FG);
            colMap.forEach(function(cm, i) {
                const ci = LEFT_COLS + 1 + i;
                if (cm.type === 'avg')         applyHdr(hdrRow.getCell(ci), C_MED_GREEN, 'FFFFFF');
                else if (cm.type === 'overall') applyHdr(hdrRow.getCell(ci), '1A237E', 'FFFFFF');
                else                            applyHdr(hdrRow.getCell(ci), C_COL_HDR_BG, C_COL_HDR_FG);
                if (cm.type === 'avg')          hdrRow.getCell(ci).value = 'REGION\nAVG';
                else if (cm.type === 'overall') hdrRow.getCell(ci).value = 'OVERALL\nAVG';
            });

            // Data rows: one per goal × measure
            const DATA_START = 5;
            let dataRowIdx = DATA_START;
            // Track category merge ranges
            const catMerges  = []; // { start, end, label }
            const goalMerges = []; // { start, end, label }
            let catStart = DATA_START, curCat = '';

            COMPLIANCE_GOALS.forEach(function(g) {
                const cat      = g.id.startsWith('E') ? 'ENVIRONMENTAL' : 'OCCUPATIONAL HEALTH & SAFETY';
                const measures = GOAL_MEASURES[g.id] || [''];
                const goalRowStart = dataRowIdx;

                measures.forEach(function(measure, mi) {
                    const rowArr = [
                        cat,
                        g.goal || g.id,
                        g.target || '',
                        measure || 'Measure ' + (mi + 1)
                    ];
                    // Project values
                    colMap.forEach(function(cm) {
                        if (cm.type === 'proj') {
                            rowArr.push(fmtRating(getValFn(cm.proj, g.id, mi)));
                        } else if (cm.type === 'overall') {
                            const vals = orderedProjs.map(function(p){ const v = parseFloat(getValFn(p, g.id, mi)); return isNaN(v)?null:v; }).filter(function(v){return v!==null;});
                            const avg  = vals.length ? vals.reduce(function(a,b){return a+b;},0)/vals.length : null;
                            rowArr.push(avg !== null ? fmtRating(String(avg)) : '');
                        } else {
                            const rp   = projsByReg[cm.region];
                            const vals = rp.map(function(p){ const v = parseFloat(getValFn(p, g.id, mi)); return isNaN(v)?null:v; }).filter(function(v){return v!==null;});
                            const avg  = vals.length ? vals.reduce(function(a,b){return a+b;},0)/vals.length : null;
                            rowArr.push(avg !== null ? fmtRating(String(avg)) : '');
                        }
                    });

                    const dataRow = ws.addRow(rowArr);
                    dataRow.height = 36;

                    // Left cols styling
                    applyLeft(dataRow.getCell(1), true);  // Category
                    applyLeft(dataRow.getCell(2), false); // Goal
                    applyLeft(dataRow.getCell(3), false); // Target
                    const mCell = dataRow.getCell(4);
                    mCell.font      = { size: 8, name: 'Calibri', italic: true };
                    mCell.alignment = { vertical: 'middle', wrapText: true };
                    mCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_GRAY_HDR } };
                    mCell.border    = { top:{style:'thin',color:{argb:'FFB0BEC5'}}, bottom:{style:'thin',color:{argb:'FFB0BEC5'}}, left:{style:'thin',color:{argb:'FFB0BEC5'}}, right:{style:'medium',color:{argb:'FF'+C_MED_GREEN}} };

                    // Score cells
                    colMap.forEach(function(cm, i) {
                        const ci   = LEFT_COLS + 1 + i;
                        const cell = dataRow.getCell(ci);
                        if (cm.type === 'proj') {
                            applyRatingCell(cell, getValFn(cm.proj, g.id, mi));
                        } else if (cm.type === 'overall') {
                            const vals = orderedProjs.map(function(p){ const v = parseFloat(getValFn(p, g.id, mi)); return isNaN(v)?null:v; }).filter(function(v){return v!==null;});
                            const avg  = vals.length ? vals.reduce(function(a,b){return a+b;},0)/vals.length : null;
                            applyAvgCell(cell, avg);
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EAF6' } };
                            cell.font = { bold: true, size: 9, name: 'Calibri', color: { argb: 'FF1A237E' } };
                        } else {
                            const rp   = projsByReg[cm.region];
                            const vals = rp.map(function(p){ const v = parseFloat(getValFn(p, g.id, mi)); return isNaN(v)?null:v; }).filter(function(v){return v!==null;});
                            const avg  = vals.length ? vals.reduce(function(a,b){return a+b;},0)/vals.length : null;
                            applyAvgCell(cell, avg);
                        }
                    });

                    dataRowIdx++;
                });

                // Track goal merge range
                goalMerges.push({ start: goalRowStart, end: dataRowIdx - 1, label: g.goal || g.id, target: g.target || '' });
                // Track category
                if (cat !== curCat) {
                    if (curCat) catMerges.push({ start: catStart, end: goalRowStart - 1, label: curCat });
                    curCat = cat; catStart = goalRowStart;
                }
            });
            // Flush last category
            if (curCat) catMerges.push({ start: catStart, end: dataRowIdx - 1, label: curCat });

            // Apply vertical merges for Category, Goal, Target cols
            catMerges.forEach(function(m) {
                if (m.end > m.start) ws.mergeCells(m.start, 1, m.end, 1);
                const c = ws.getCell(m.start, 1);
                c.value     = m.label;
                c.font      = { bold: true, size: 8.5, name: 'Calibri', color: { argb: m.label === 'ENVIRONMENTAL' ? 'FF1B5E20' : 'FFB71C1C' } };
                c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                c.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: m.label === 'ENVIRONMENTAL' ? 'FFE8F5E9' : 'FFFFF3E0' } };
                c.border    = { top:{style:'thin',color:{argb:'FFB0BEC5'}}, bottom:{style:'medium',color:{argb:'FF'+C_MED_GREEN}}, left:{style:'thin',color:{argb:'FFB0BEC5'}}, right:{style:'medium',color:{argb:'FF'+C_MED_GREEN}} };
            });
            goalMerges.forEach(function(m) {
                if (m.end > m.start) {
                    ws.mergeCells(m.start, 2, m.end, 2);
                    ws.mergeCells(m.start, 3, m.end, 3);
                }
                const gc = ws.getCell(m.start, 2);
                gc.value     = m.label;
                gc.font      = { size: 8.5, name: 'Calibri' };
                gc.alignment = { vertical: 'middle', wrapText: true };
                gc.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_GRAY_HDR } };
                gc.border    = { top:{style:'thin',color:{argb:'FFB0BEC5'}}, bottom:{style:'thin',color:{argb:'FFB0BEC5'}}, left:{style:'thin',color:{argb:'FFB0BEC5'}}, right:{style:'medium',color:{argb:'FF'+C_MED_GREEN}} };
                const tc = ws.getCell(m.start, 3);
                tc.value     = m.target;
                tc.font      = { size: 8, name: 'Calibri', italic: true };
                tc.alignment = { vertical: 'middle', wrapText: true };
                tc.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_GRAY_HDR } };
                tc.border    = { top:{style:'thin',color:{argb:'FFB0BEC5'}}, bottom:{style:'thin',color:{argb:'FFB0BEC5'}}, left:{style:'thin',color:{argb:'FFB0BEC5'}}, right:{style:'medium',color:{argb:'FF'+C_MED_GREEN}} };
            });

            // ── COMPLIANCE SCORE row (overall per project) ────────────────
            const scoreArr = ['COMPLIANCE SCORE', '', '', ''];
            colMap.forEach(function(cm) {
                if (cm.type === 'proj') {
                    const avg = getAvgFn(cm.proj);
                    scoreArr.push(avg !== null ? Math.round(avg * 100) + '%' : '—');
                } else if (cm.type === 'overall') {
                    const vals = orderedProjs.map(function(p){ return getAvgFn(p); }).filter(function(v){return v!==null;});
                    const avg  = vals.length ? vals.reduce(function(a,b){return a+b;},0)/vals.length : null;
                    scoreArr.push(avg !== null ? Math.round(avg * 100) + '%' : '—');
                } else {
                    const rp   = projsByReg[cm.region];
                    const vals = rp.map(function(p){ return getAvgFn(p); }).filter(function(v){return v!==null;});
                    const avg  = vals.length ? vals.reduce(function(a,b){return a+b;},0)/vals.length : null;
                    scoreArr.push(avg !== null ? Math.round(avg * 100) + '%' : '—');
                }
            });
            const scoreRow = ws.addRow(scoreArr);
            scoreRow.height = 22;
            ws.mergeCells(scoreRow.number, 1, scoreRow.number, LEFT_COLS);
            const scoreLbl = scoreRow.getCell(1);
            scoreLbl.value     = 'COMPLIANCE SCORE';
            scoreLbl.font      = { bold: true, size: 10, name: 'Calibri', color: { argb: 'FF' + C_COL_HDR_FG } };
            scoreLbl.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_DARK_GREEN } };
            scoreLbl.alignment = { horizontal: 'center', vertical: 'middle' };
            colMap.forEach(function(cm, i) {
                const ci   = LEFT_COLS + 1 + i;
                const cell = scoreRow.getCell(ci);
                if (cm.type === 'overall') {
                    const vals = orderedProjs.map(function(p){ return getAvgFn(p); }).filter(function(v){return v!==null;});
                    const avg  = vals.length ? vals.reduce(function(a,b){return a+b;},0)/vals.length : null;
                    applyAvgCell(cell, avg);
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A237E' } };
                    cell.font = { bold: true, size: 10, name: 'Calibri', color: { argb: 'FFFFFFFF' } };
                } else {
                    applyAvgCell(cell, cm.type === 'proj'
                        ? getAvgFn(cm.proj)
                        : (function() {
                            const rp   = projsByReg[cm.region];
                            const vals = rp.map(function(p){ return getAvgFn(p); }).filter(function(v){return v!==null;});
                            return vals.length ? vals.reduce(function(a,b){return a+b;},0)/vals.length : null;
                          })()
                    );
                }
            });

            // Column widths
            ws.getColumn(1).width = 16;  // Category
            ws.getColumn(2).width = 26;  // Goal
            ws.getColumn(3).width = 26;  // Target
            ws.getColumn(4).width = 28;  // Measure
            colMap.forEach(function(cm, i) {
                ws.getColumn(LEFT_COLS + 1 + i).width = cm.type === 'avg' ? 8 : cm.type === 'overall' ? 10 : 14;
            });
            ws.views = [{ state: 'frozen', xSplit: LEFT_COLS, ySplit: 4, activeCell: 'E5' }];
        }

        // ── Build workbook ────────────────────────────────────────────────
        const wb = eshNewWorkbook('ESH');
        const MO_LONG_G = ['January','February','March','April','May','June','July','August','September','October','November','December'];

        // Submitted months (months that have at least one rating)
        const submittedMos = MO_LONG_G.filter(function(mo, moIdx) {
            const moNum = moIdx + 1;
            return gotAllProjs.some(function(p) {
                return COMPLIANCE_GOALS.some(function(g) {
                    const measures = GOAL_MEASURES[g.id] || [''];
                    return measures.some(function(_, mi) {
                        return gotGetCell(p, g.id, mi, moNum).r !== '';
                    });
                });
            });
        });

        if (!submittedMos.length && gotAllProjs.length === 0) {
            showToast('No GOT data to export.', 'info'); return;
        }

        // OVERALL SUMMARY sheet (avg across all submitted months)
        const sumWs = wb.addWorksheet('OVERALL SUMMARY');
        buildGotKpmSheet(sumWs, 'GOT MONITORING — OVERALL SUMMARY ' + year,
            function(proj, gId, mi) {
                // Overall avg across all months for this goal/measure
                const vals = [];
                for (let mo = 1; mo <= 12; mo++) {
                    const v = parseFloat(gotGetCell(proj, gId, mi, mo).r);
                    if (!isNaN(v)) vals.push(v);
                }
                return vals.length ? String(vals.reduce(function(a,b){return a+b;},0)/vals.length) : '';
            },
            function(proj) { return projOverallAvg(proj); }
        );

        // Monthly sheets
        (submittedMos.length ? submittedMos : MO_LONG_G).forEach(function(mo) {
            const moIdx  = MO_LONG_G.indexOf(mo);
            const moNum  = moIdx + 1;
            const moShort = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][moIdx];
            const sheetName = ('GOT-' + moShort + '-' + year).substring(0, 31);
            const mWs = wb.addWorksheet(sheetName);
            buildGotKpmSheet(mWs, 'GOT MONITORING — ' + mo.toUpperCase() + ' ' + year,
                function(proj, gId, mi) { return gotGetCell(proj, gId, mi, moNum).r || ''; },
                function(proj) { return projMonthAvg(proj, moNum); }
            );
        });

        await _xSave(wb, 'got-monitoring'); return;
    }

    // ════════════════════════════════════════════════════════════════════════
    // OVERALL SUMMARY
    // ════════════════════════════════════════════════════════════════════════
    if (tab === 'overall') {
        // ── Use full state.projects — getReportProjects() strips work-stoppage ──
        const _ovStateProjs = (state.filteredProjects || state.projects || []);

        // ── Helpers ──────────────────────────────────────────────────────────
        function _ovYtd(p,key){let v=0;for(let m=1;m<=12;m++){const x=parseFloat(_v(p,key,m));if(!isNaN(x))v+=x;}return v;}
        function _ovFmt(n){return n>=1000?n.toLocaleString():String(n);}
        function _ovCompColor(pv) {
            if(pv===null) return null;
            if(pv>=90) return {bg:'C8E6C9',fg:'1B5E20'};
            if(pv>=75) return {bg:'FFF9C4',fg:'82500D'};
            return {bg:'FFCDD2',fg:'B71C1C'};
        }
        function _ovApplyCompCell(cell, pv) {
            const cc = _ovCompColor(pv);
            if(!cc) return;
            cell.fill = {type:'pattern',pattern:'solid',fgColor:{argb:'FF'+cc.bg}};
            cell.font = {bold:true,size:9,name:'Calibri',color:{argb:'FF'+cc.fg}};
            cell.alignment = {horizontal:'center',vertical:'middle'};
        }
        function _ovThinBorder(cell) {
            cell.border = {
                top:{style:'thin',color:{argb:'FFB0BEC5'}}, bottom:{style:'thin',color:{argb:'FFB0BEC5'}},
                left:{style:'thin',color:{argb:'FFB0BEC5'}}, right:{style:'thin',color:{argb:'FFB0BEC5'}}
            };
        }

        const MO_SHORT_OV = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
        const MO_LONG_OV  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        const OV_REGIONS  = ['NCR','NORTH LUZON','SOUTH LUZON','VISAYAS & MINDANAO'];
        // Previous month only — current month data is still incomplete
        const curMonthOv  = new Date().getMonth()+1;

        // ── Base project sets ─────────────────────────────────────────────────
        // _ovOngoing  : status==='on-going' — matches UI ON-GOING stat card exactly
        // _ovStopped  : status==='work-stoppage' — matches UI WORK STOPPAGE stat card
        // _ovCompPool : compliance pool — excludes work-stoppage (matches complianceProjects in UI)
        const _ovAllProjs = _ovStateProjs.filter(function(p){return p.region!=='CORPORATE'&&p.region!=='PLANT OPERATIONS';});
        const _ovOngoing  = _ovAllProjs.filter(function(p){return p.status==='on-going';});
        const _ovFinished = _ovAllProjs.filter(function(p){return !!p.dateFinished;});
        const _ovStopped  = _ovAllProjs.filter(function(p){return p.status==='work-stoppage';});
        const _ovCompPool = _ovAllProjs.filter(function(p){return p.status!=='work-stoppage'&&!p.dateFinished&&!(typeof isProjectOnStoppage==='function'&&isProjectOnStoppage(p));});

        // ── Grand KPI totals (all projects) ──────────────────────────────────
        const _ovTotalMH  = _ovAllProjs.reduce(function(s,p){return s+_ovYtd(p,'exposures_Total Exposed Manhour');},0);
        const _ovTotalMp  = _ovAllProjs.reduce(function(s,p){const x=parseFloat(_v(p,'exposures_Total Manpower',curMonthOv));return s+(isNaN(x)?0:x);},0);
        const _ovCumMH    = _ovAllProjs.reduce(function(s,p){
            const prev=parseFloat((_v(p,'exposures_Total Exposed Man-hour to date',0)))||0;
            return s+prev+_ovYtd(p,'exposures_Total Exposed Manhour');
        },0);
        const _ovTotalLTA = _ovAllProjs.reduce(function(s,p){return s+_ovYtd(p,'medical_LTA');},0);
        const _ovTotalMed = _ovAllProjs.reduce(function(s,p){return s+_ovYtd(p,'medical_Medical Treatment');},0);
        const _ovTotalFA  = _ovAllProjs.reduce(function(s,p){return s+_ovYtd(p,'medical_First Aid');},0);
        const _ovTotalFat = _ovAllProjs.reduce(function(s,p){return s+_ovYtd(p,'medical_Fatality');},0);
        const _ovTotalHI  = _ovAllProjs.reduce(function(s,p){return s+_ovYtd(p,'medical_High-Potential incident');},0);
        const _ovTotalDO  = _ovAllProjs.reduce(function(s,p){return s+_ovYtd(p,'medical_Dangerous Occurrences');},0);
        const _ovTotalNM  = _ovAllProjs.reduce(function(s,p){return s+_ovYtd(p,'medical_No. of Identified Near-Miss');},0);
        const _ovTotalDL  = _ovAllProjs.reduce(function(s,p){return s+_ovYtd(p,'medical_Days Lost/Charged');},0);
        const _ovFreqRate = _ovCumMH>0?((_ovTotalLTA/_ovCumMH)*1000000).toFixed(2):'—';
        const _ovSevRate  = _ovCumMH>0?((_ovTotalDL/_ovCumMH)*1000000).toFixed(2):'—';

        // ── Compliance KPIs (compPool — excludes work-stoppage) ───────────────
        const _ovPercVals    = _ovCompPool.map(function(p){return typeof getPerc==='function'?getPerc(p):null;}).filter(function(v){return v!==null;});
        const _ovGrandAvg    = _ovPercVals.length?Math.round(_ovPercVals.reduce(function(s,v){return s+v;},0)/_ovPercVals.length):null;
        const _ovCompliant   = _ovCompPool.filter(function(p){const v=typeof getPerc==='function'?getPerc(p):null;return v!==null&&v>=90;}).length;
        const _ovPartial     = _ovCompPool.filter(function(p){const v=typeof getPerc==='function'?getPerc(p):null;return v!==null&&v>=75&&v<90;}).length;
        const _ovNonCompliant= _ovCompPool.filter(function(p){const v=typeof getPerc==='function'?getPerc(p):null;return v!==null&&v<75;}).length;

        const wb = eshNewWorkbook('ESH');

        // ════════════════════════════════════════════════════════════════════
        // SHEET 1 — EXECUTIVE SUMMARY
        // ════════════════════════════════════════════════════════════════════
        (function _buildExecSummary() {
            const ws = wb.addWorksheet('1. Executive Summary');
            ws.views = [{showGridLines:false}];
            ws.getColumn(1).width=26; ws.getColumn(2).width=16;
            ws.getColumn(3).width=26; ws.getColumn(4).width=16;
            ws.getColumn(5).width=26; ws.getColumn(6).width=16;

            ws.mergeCells('A1:F1');
            const tCell = ws.getCell('A1');
            tCell.value     = 'SCIC — OVERALL ESH COMPLIANCE REPORT  ·  ' + year;
            tCell.font      = {bold:true,size:14,name:'Calibri',color:{argb:'FFFFFFFF'}};
            tCell.fill      = {type:'pattern',pattern:'solid',fgColor:{argb:'FF1B5E20'}};
            tCell.alignment = {horizontal:'center',vertical:'middle'};
            ws.getRow(1).height = 30;

            ws.mergeCells('A2:F2');
            const subCell = ws.getCell('A2');
            const todayStr = new Date().toLocaleDateString('en-PH',{year:'numeric',month:'long',day:'numeric'});
            subCell.value     = 'As of ' + todayStr + '  ·  SCIC Environment, Safety & Health Department';
            subCell.font      = {italic:true,size:9,name:'Calibri',color:{argb:'FFFFFFFF'}};
            subCell.fill      = {type:'pattern',pattern:'solid',fgColor:{argb:'FF2E7D32'}};
            subCell.alignment = {horizontal:'center',vertical:'middle'};
            ws.getRow(2).height = 18;

            let curR = 3;
            function _secLabel(label) {
                ws.getRow(curR).height = 6; curR++;
                ws.mergeCells(curR,1,curR,6);
                const c = ws.getCell(curR,1);
                c.value = label;
                c.font  = {bold:true,size:10,name:'Calibri',color:{argb:'FFFFFFFF'}};
                c.fill  = {type:'pattern',pattern:'solid',fgColor:{argb:'FF37474F'}};
                c.alignment = {horizontal:'left',vertical:'middle',indent:1};
                ws.getRow(curR).height = 18; curR++;
            }
            function _setKpiCell(row, col, val, isBold, bgArgb, fgArgb, isLabel) {
                const c = ws.getRow(row).getCell(col);
                c.value = val;
                c.font  = {bold:!!isBold, size:isLabel?8:11, name:'Calibri',
                           color:{argb:'FF'+(fgArgb||(isLabel?'546E7A':'1B5E20'))}};
                c.fill  = {type:'pattern',pattern:'solid',fgColor:{argb:'FF'+(bgArgb||(isLabel?'F5F5F5':'E8F5E9'))}};
                c.alignment = {horizontal:isLabel?'right':'center', vertical:'middle', indent:isLabel?1:0};
                _ovThinBorder(c);
                ws.getRow(row).height = 22;
            }

            _secLabel('📊  PROJECT OVERVIEW & COMPLIANCE');
            _setKpiCell(curR,1,'TOTAL PROJECTS',false,null,null,true);
            _setKpiCell(curR,2,String(_ovAllProjs.length),true,'E8F5E9','1B5E20',false);
            _setKpiCell(curR,3,'OVERALL COMPLIANCE',false,null,null,true);
            const _occc=_ovCompColor(_ovGrandAvg);
            _setKpiCell(curR,4,_ovGrandAvg!==null?_ovGrandAvg+'%':'—',true,_occc?_occc.bg:null,_occc?_occc.fg:null,false);
            _setKpiCell(curR,5,'COMPLIANT (≥90%)',false,null,null,true);
            _setKpiCell(curR,6,String(_ovCompliant),true,'C8E6C9','1B5E20',false); curR++;

            _setKpiCell(curR,1,getStatusLabel('on-going').toUpperCase(),false,null,null,true);
            _setKpiCell(curR,2,String(_ovOngoing.length),true,'E3F2FD','1565C0',false);
            _setKpiCell(curR,3,'PARTIAL (75–89%)',false,null,null,true);
            _setKpiCell(curR,4,String(_ovPartial),true,'FFF9C4','82500D',false);
            _setKpiCell(curR,5,'NON-COMPLIANT (<75%)',false,null,null,true);
            _setKpiCell(curR,6,String(_ovNonCompliant),true,_ovNonCompliant>0?'FFCDD2':'F5F5F5',_ovNonCompliant>0?'B71C1C':'757575',false); curR++;

            _setKpiCell(curR,1,getStatusLabel('finished').toUpperCase(),false,null,null,true);
            _setKpiCell(curR,2,String(_ovFinished.length),true,'F3E5F5','6A1B9A',false);
            _setKpiCell(curR,3,getStatusLabel('work-stoppage').toUpperCase(),false,null,null,true);
            _setKpiCell(curR,4,String(_ovStopped.length),true,_ovStopped.length>0?'FFCDD2':'F5F5F5',_ovStopped.length>0?'B71C1C':'757575',false);
            _setKpiCell(curR,5,'',false,'F5F5F5','F5F5F5',true);
            _setKpiCell(curR,6,'',false,'F5F5F5','F5F5F5',false); curR++;

            _secLabel('👷  MANPOWER & MANHOURS EXPOSURE');
            _setKpiCell(curR,1,'TOTAL MANPOWER',false,null,null,true);
            _setKpiCell(curR,2,_ovFmt(Math.round(_ovTotalMp)),true,'E3F2FD','1565C0',false);
            _setKpiCell(curR,3,'YTD MANHOURS',false,null,null,true);
            _setKpiCell(curR,4,_ovFmt(Math.round(_ovTotalMH)),true,'E0F2F1','00695C',false);
            _setKpiCell(curR,5,'CUMULATIVE MANHOURS',false,null,null,true);
            _setKpiCell(curR,6,_ovFmt(Math.round(_ovCumMH)),true,'E8EAF6','283593',false); curR++;

            _setKpiCell(curR,1,'FREQUENCY RATE',false,null,null,true);
            _setKpiCell(curR,2,String(_ovFreqRate),true,'E0F2F1','00695C',false);
            _setKpiCell(curR,3,'SEVERITY RATE',false,null,null,true);
            _setKpiCell(curR,4,String(_ovSevRate),true,'ECEFF1','37474F',false);
            _setKpiCell(curR,5,'(per 1,000,000 manhours)',false,'F5F5F5','9E9E9E',true);
            _setKpiCell(curR,6,'',false,'F5F5F5','F5F5F5',false); curR++;

            _secLabel('🚨  INCIDENT SUMMARY (Year-to-Date)');
            _setKpiCell(curR,1,'LOST TIME ACCIDENTS (LTA)',false,null,null,true);
            _setKpiCell(curR,2,String(_ovTotalLTA),true,_ovTotalLTA>0?'FFCDD2':'E8F5E9',_ovTotalLTA>0?'B71C1C':'1B5E20',false);
            _setKpiCell(curR,3,'MEDICAL TREATMENT CASES',false,null,null,true);
            _setKpiCell(curR,4,String(_ovTotalMed),true,_ovTotalMed>0?'FFE0B2':'FFF8E1',_ovTotalMed>0?'E65100':'F57F17',false);
            _setKpiCell(curR,5,'FIRST AID CASES',false,null,null,true);
            _setKpiCell(curR,6,String(_ovTotalFA),true,'E1F5FE','0277BD',false); curR++;

            _setKpiCell(curR,1,'FATALITIES',false,null,null,true);
            _setKpiCell(curR,2,String(_ovTotalFat),true,_ovTotalFat>0?'B71C1C':'E8F5E9',_ovTotalFat>0?'FFFFFF':'1B5E20',false);
            _setKpiCell(curR,3,'HIGH-POTENTIAL INCIDENTS',false,null,null,true);
            _setKpiCell(curR,4,String(_ovTotalHI),true,_ovTotalHI>0?'FFE0B2':'F5F5F5',_ovTotalHI>0?'E65100':'757575',false);
            _setKpiCell(curR,5,'DAYS LOST / CHARGED',false,null,null,true);
            _setKpiCell(curR,6,String(_ovTotalDL),true,_ovTotalDL>0?'FFCDD2':'F5F5F5',_ovTotalDL>0?'B71C1C':'757575',false); curR++;

            _setKpiCell(curR,1,'DANGEROUS OCCURRENCES',false,null,null,true);
            _setKpiCell(curR,2,String(_ovTotalDO),true,_ovTotalDO>0?'FFE0B2':'F5F5F5',_ovTotalDO>0?'E65100':'757575',false);
            _setKpiCell(curR,3,'NEAR MISS IDENTIFIED',false,null,null,true);
            _setKpiCell(curR,4,String(_ovTotalNM),true,'EDE7F6','4A148C',false);
            _setKpiCell(curR,5,'',false,'F5F5F5','F5F5F5',true);
            _setKpiCell(curR,6,'',false,'F5F5F5','F5F5F5',false); curR++;

            ws.getRow(curR).height = 6; curR++;
            ws.mergeCells(curR,1,curR,6);
            const lgCell = ws.getCell(curR,1);
            lgCell.value     = '● COMPLIANCE LEGEND:   ≥90% = Compliant (Green)     75–89% = Partial (Yellow)     <75% = Non-Compliant (Red)';
            lgCell.font      = {italic:true,size:8,name:'Calibri',color:{argb:'FF546E7A'}};
            lgCell.fill      = {type:'pattern',pattern:'solid',fgColor:{argb:'FFF5F5F5'}};
            lgCell.alignment = {horizontal:'center',vertical:'middle'};
            ws.getRow(curR).height = 16;
        })();

        // ════════════════════════════════════════════════════════════════════
        // SHEET 2 — REGIONAL BREAKDOWN
        // ════════════════════════════════════════════════════════════════════
        (function _buildRegionalBreakdown() {
            const ws = wb.addWorksheet('2. Regional Breakdown');
            ws.views = [{state:'frozen',ySplit:3,activeCell:'A4'}];

            const _rCols = 15; // +2 for DO and NM
            ws.mergeCells(1,1,1,_rCols);
            const tCell = ws.getCell('A1');
            tCell.value     = 'REGIONAL BREAKDOWN — OVERALL ESH SUMMARY  ·  ' + year;
            tCell.font      = {bold:true,size:13,name:'Calibri',color:{argb:'FFFFFFFF'}};
            tCell.fill      = {type:'pattern',pattern:'solid',fgColor:{argb:'FF1B5E20'}};
            tCell.alignment = {horizontal:'center',vertical:'middle'};
            ws.getRow(1).height = 26;

            ws.mergeCells(2,1,2,_rCols);
            const sh = ws.getCell('A2');
            sh.value     = 'All active projects per region  ·  Compliance % excludes work-stoppage  ·  Figures are Year-to-Date unless noted';
            sh.font      = {italic:true,size:8,name:'Calibri',color:{argb:'FFFFFFFF'}};
            sh.fill      = {type:'pattern',pattern:'solid',fgColor:{argb:'FF2E7D32'}};
            sh.alignment = {horizontal:'center',vertical:'middle'};
            ws.getRow(2).height = 14;

            const hdrLabels = [
                'REGION','PROJECTS',getStatusLabel('on-going').toUpperCase(),'STOPPAGE',
                'MANPOWER\n(Current Mo.)','YTD MANHOURS','COMPLIANCE %',
                'LTA','MED.\nTREATMENT','FIRST AID','FATALITY','HI INC.','DAYS LOST',
                'DANGEROUS\nOCCURRENCES','NEAR MISS\nIDENTIFIED'
            ];
            const hRow = ws.addRow(hdrLabels);
            hRow.height = 28; hRow.eachCell(_xHdr);

            ws.getColumn(1).width=26; ws.getColumn(2).width=11; ws.getColumn(3).width=11;
            ws.getColumn(4).width=11; ws.getColumn(5).width=16; ws.getColumn(6).width=18;
            ws.getColumn(7).width=15; ws.getColumn(8).width=10; ws.getColumn(9).width=11;
            ws.getColumn(10).width=10; ws.getColumn(11).width=10; ws.getColumn(12).width=10;
            ws.getColumn(13).width=12; ws.getColumn(14).width=14; ws.getColumn(15).width=13;

            let _gtProj=0,_gtOngo=0,_gtStop=0,_gtMp=0,_gtMH=0;
            let _gtLTA=0,_gtMed=0,_gtFA=0,_gtFat=0,_gtHI=0,_gtDL=0,_gtDO=0,_gtNM=0;
            const _gtPercVals=[];

            OV_REGIONS.forEach(function(region,rIdx) {
                const rp = _ovAllProjs.filter(function(p){return (p.region||'').toUpperCase()===region;});
                if(!rp.length) return;
                const rOngo = rp.filter(function(p){return p.status==='on-going';}).length;
                const rStop = rp.filter(function(p){return p.status==='work-stoppage';}).length;
                const rMp   = rp.reduce(function(s,p){const x=parseFloat(_v(p,'exposures_Total Manpower',curMonthOv));return s+(isNaN(x)?0:x);},0);
                const rMH   = rp.reduce(function(s,p){return s+_ovYtd(p,'exposures_Total Exposed Manhour');},0);
                const rLTA  = rp.reduce(function(s,p){return s+_ovYtd(p,'medical_LTA');},0);
                const rMed  = rp.reduce(function(s,p){return s+_ovYtd(p,'medical_Medical Treatment');},0);
                const rFA   = rp.reduce(function(s,p){return s+_ovYtd(p,'medical_First Aid');},0);
                const rFat  = rp.reduce(function(s,p){return s+_ovYtd(p,'medical_Fatality');},0);
                const rHI   = rp.reduce(function(s,p){return s+_ovYtd(p,'medical_High-Potential incident');},0);
                const rDL   = rp.reduce(function(s,p){return s+_ovYtd(p,'medical_Days Lost/Charged');},0);
                const rDO   = rp.reduce(function(s,p){return s+_ovYtd(p,'medical_Dangerous Occurrences');},0);
                const rNM   = rp.reduce(function(s,p){return s+_ovYtd(p,'medical_No. of Identified Near-Miss');},0);
                const rCompProjs = rp.filter(function(p){return p.status!=='work-stoppage'&&!(typeof isProjectOnStoppage==='function'&&isProjectOnStoppage(p));});
                const rPV   = rCompProjs.map(function(p){return typeof getPerc==='function'?getPerc(p):null;}).filter(function(v){return v!==null;});
                const rAvg  = rPV.length?Math.round(rPV.reduce(function(s,v){return s+v;},0)/rPV.length):null;

                _gtProj+=rp.length; _gtOngo+=rOngo; _gtStop+=rStop;
                _gtMp+=rMp; _gtMH+=rMH; _gtLTA+=rLTA; _gtMed+=rMed;
                _gtFA+=rFA; _gtFat+=rFat; _gtHI+=rHI; _gtDL+=rDL;
                _gtDO+=rDO; _gtNM+=rNM;
                rPV.forEach(function(v){_gtPercVals.push(v);});

                const dr = ws.addRow([
                    region, rp.length, rOngo, rStop,
                    Math.round(rMp), Math.round(rMH),
                    rAvg!==null?rAvg+'%':'—',
                    rLTA, rMed, rFA, rFat, rHI, rDL, rDO, rNM
                ]);
                dr.height = 18;
                const rc1 = dr.getCell(1);
                rc1.font = {bold:true,size:9,name:'Calibri',color:{argb:'FF1B5E20'}};
                rc1.fill = {type:'pattern',pattern:'solid',fgColor:{argb:'FFE8F5E9'}};
                rc1.alignment = {vertical:'middle',horizontal:'left',indent:1};
                _ovThinBorder(rc1);
                for(let ci=2;ci<=_rCols;ci++){
                    const c=dr.getCell(ci);
                    c.font={size:9,name:'Calibri'};
                    c.alignment={horizontal:'center',vertical:'middle'};
                    _ovThinBorder(c);
                    if(rIdx%2===1) c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF1F8E9'}};
                }
                _ovApplyCompCell(dr.getCell(7), rAvg);
                if(rLTA>0){dr.getCell(8).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFFFCDD2'}};dr.getCell(8).font={bold:true,size:9,name:'Calibri',color:{argb:'FFB71C1C'}};}
                if(rFat>0){dr.getCell(11).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFB71C1C'}};dr.getCell(11).font={bold:true,size:9,name:'Calibri',color:{argb:'FFFFFFFF'}};}
            });

            const _gtAvg = _gtPercVals.length?Math.round(_gtPercVals.reduce(function(s,v){return s+v;},0)/_gtPercVals.length):null;
            const gtRow = ws.addRow([
                'GRAND TOTAL', _gtProj, _gtOngo, _gtStop,
                Math.round(_gtMp), Math.round(_gtMH),
                _gtAvg!==null?_gtAvg+'%':'—',
                _gtLTA, _gtMed, _gtFA, _gtFat, _gtHI, _gtDL, _gtDO, _gtNM
            ]);
            gtRow.height = 22;
            gtRow.eachCell(function(c,ci){
                c.font = {bold:true,size:10,name:'Calibri',color:{argb:'FF1B5E20'}};
                c.fill = {type:'pattern',pattern:'solid',fgColor:{argb:'FFE8F5E9'}};
                c.alignment = {horizontal:ci===1?'left':'center',vertical:'middle',indent:ci===1?1:0};
                c.border = {
                    top:{style:'medium',color:{argb:'FF2E7D32'}}, bottom:{style:'medium',color:{argb:'FF2E7D32'}},
                    left:{style:'thin',color:{argb:'FFB0BEC5'}}, right:{style:'thin',color:{argb:'FFB0BEC5'}}
                };
            });
            _ovApplyCompCell(gtRow.getCell(7), _gtAvg);
            if(_gtLTA>0){gtRow.getCell(8).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFFFCDD2'}};gtRow.getCell(8).font={bold:true,size:10,name:'Calibri',color:{argb:'FFB71C1C'}};}
            if(_gtFat>0){gtRow.getCell(11).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFB71C1C'}};gtRow.getCell(11).font={bold:true,size:10,name:'Calibri',color:{argb:'FFFFFFFF'}};}
        })();

        // ════════════════════════════════════════════════════════════════════
        // SHEET 3 — MONTHLY COMPLIANCE TREND
        // ════════════════════════════════════════════════════════════════════
        (function _buildMonthlyTrend() {
            const ws = wb.addWorksheet('3. Monthly Compliance Trend');
            ws.views = [{state:'frozen',xSplit:1,ySplit:3,activeCell:'B4'}];
            const _tCols = 1 + OV_REGIONS.length + 1;

            ws.mergeCells(1,1,1,_tCols);
            const tCell = ws.getCell('A1');
            tCell.value     = 'MONTHLY COMPLIANCE TREND  ·  ' + year;
            tCell.font      = {bold:true,size:13,name:'Calibri',color:{argb:'FFFFFFFF'}};
            tCell.fill      = {type:'pattern',pattern:'solid',fgColor:{argb:'FF1B5E20'}};
            tCell.alignment = {horizontal:'center',vertical:'middle'};
            ws.getRow(1).height = 26;

            ws.mergeCells(2,1,2,_tCols);
            const sh = ws.getCell('A2');
            sh.value     = 'Equal-weight compliance per area, per ongoing project  ·  Excludes CORPORATE & PLANT OPERATIONS  ·  Up to previous month only';
            sh.font      = {italic:true,size:8,name:'Calibri',color:{argb:'FFFFFFFF'}};
            sh.fill      = {type:'pattern',pattern:'solid',fgColor:{argb:'FF2E7D32'}};
            sh.alignment = {horizontal:'center',vertical:'middle'};
            ws.getRow(2).height = 14;

            const hdrVals = ['MONTH'].concat(OV_REGIONS).concat(['OVERALL']);
            const hRow = ws.addRow(hdrVals);
            hRow.height = 22; hRow.eachCell(_xHdr);
            hRow.getCell(_tCols).fill = {type:'pattern',pattern:'solid',fgColor:{argb:'FF1A237E'}};

            ws.getColumn(1).width = 18;
            for(let ci=2;ci<=_tCols;ci++) ws.getColumn(ci).width = 20;

            // Previous month only — current month data is still incomplete
            const maxMo = (year===new Date().getFullYear()) ? (new Date().getMonth()||12) : 12;

            MO_LONG_OV.forEach(function(mo, mi) {
                const moIdx = mi+1;
                const dataRow = [mo];
                OV_REGIONS.forEach(function(region) {
                    const rv = typeof getMonthlyComplianceByRegion==='function'?getMonthlyComplianceByRegion(moIdx,region):null;
                    dataRow.push(rv!==null?rv+'%':null);
                });
                const ov = typeof getMonthlyCompliance==='function'?getMonthlyCompliance(moIdx):null;
                dataRow.push(ov!==null?ov+'%':null);

                const dr = ws.addRow(dataRow);
                dr.height = 18;
                const mc = dr.getCell(1);
                mc.font = {bold:true,size:9,name:'Calibri'};
                mc.fill = {type:'pattern',pattern:'solid',fgColor:{argb:'FFE8F5E9'}};
                mc.alignment = {horizontal:'left',vertical:'middle',indent:1};
                _ovThinBorder(mc);

                if(moIdx>maxMo) {
                    for(let ci=2;ci<=_tCols;ci++){
                        const c=dr.getCell(ci);
                        c.value='—'; c.font={size:9,name:'Calibri',color:{argb:'FFB0BEC5'}};
                        c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF5F5F5'}};
                        c.alignment={horizontal:'center',vertical:'middle'};
                        _ovThinBorder(c);
                    }
                } else {
                    for(let ci=2;ci<=_tCols;ci++){
                        const c=dr.getCell(ci);
                        const raw=dataRow[ci-1];
                        const pv=raw?parseInt(raw):null;
                        c.alignment={horizontal:'center',vertical:'middle'};
                        _ovThinBorder(c);
                        if(pv===null){
                            c.value='—'; c.font={size:9,name:'Calibri',color:{argb:'FFB0BEC5'}};
                        } else if(ci===_tCols) {
                            c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFE8EAF6'}};
                            c.font={bold:true,size:10,name:'Calibri',color:{argb:'FF1A237E'}};
                        } else {
                            _ovApplyCompCell(c, pv);
                        }
                    }
                }
            });

            ws.addRow([]).height = 4;
            const ovRow = ws.addRow(['OVERALL AVG'].concat(
                OV_REGIONS.map(function(r){
                    const rPV=_ovCompPool.filter(function(p){return(p.region||'').toUpperCase()===r;}).map(function(p){return typeof getPerc==='function'?getPerc(p):null;}).filter(function(v){return v!==null;});
                    const rAvg=rPV.length?Math.round(rPV.reduce(function(s,v){return s+v;},0)/rPV.length):null;
                    return rAvg!==null?rAvg+'%':'—';
                })
            ).concat([_ovGrandAvg!==null?_ovGrandAvg+'%':'—']));
            ovRow.height=22;
            ovRow.eachCell(function(c,ci){
                c.font={bold:true,size:10,name:'Calibri'};
                c.border={top:{style:'medium',color:{argb:'FF2E7D32'}},bottom:{style:'medium',color:{argb:'FF2E7D32'}},
                          left:{style:'thin',color:{argb:'FFB0BEC5'}},right:{style:'thin',color:{argb:'FFB0BEC5'}}};
                if(ci===1){
                    c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFE8F5E9'}};
                    c.alignment={horizontal:'left',vertical:'middle',indent:1};
                } else {
                    const pv=c.value&&c.value!=='—'?parseInt(c.value):null;
                    if(pv!==null){
                        if(ci===_tCols){
                            c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFE8EAF6'}};
                            c.font={bold:true,size:10,name:'Calibri',color:{argb:'FF1A237E'}};
                        } else {
                            _ovApplyCompCell(c,pv);
                        }
                    } else {
                        c.font={bold:true,size:9,name:'Calibri',color:{argb:'FFB0BEC5'}};
                        c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF5F5F5'}};
                        c.alignment={horizontal:'center',vertical:'middle'};
                    }
                }
            });
        })();

        // ════════════════════════════════════════════════════════════════════
        // SHEET 4 — PROJECT DETAIL
        // ════════════════════════════════════════════════════════════════════
        (function _buildProjectDetail() {
            const ws = wb.addWorksheet('4. Project Detail');

            // Previous month only — current month data is still incomplete
            const _sh4MaxMo  = (year===new Date().getFullYear()) ? (new Date().getMonth()||12) : 12;
            const _fixedCols = 4;
            const _extraCols = 9; // YTD MH | Manpower | LTA | Med | FA | Fatality | HI | Days Lost | DO
            const _totalCols = _fixedCols + _sh4MaxMo + _extraCols;

            ws.views = [{state:'frozen',xSplit:3,ySplit:3,activeCell:'D4'}];

            ws.mergeCells(1,1,1,_totalCols);
            const tCell = ws.getCell('A1');
            tCell.value     = 'PROJECT DETAIL — ESH SUMMARY  ·  ' + year;
            tCell.font      = {bold:true,size:13,name:'Calibri',color:{argb:'FFFFFFFF'}};
            tCell.fill      = {type:'pattern',pattern:'solid',fgColor:{argb:'FF1B5E20'}};
            tCell.alignment = {horizontal:'center',vertical:'middle'};
            ws.getRow(1).height = 26;

            ws.mergeCells(2,1,2,_totalCols);
            const sh = ws.getCell('A2');
            sh.value     = 'All projects grouped by region  ·  🔴 Work Stoppage  |  ⬜ Finished  |  🟢 On-Going  ·  Monthly cols = regional compliance avg (up to previous month)  ·  YTD incident totals per project';
            sh.font      = {italic:true,size:8,name:'Calibri',color:{argb:'FFFFFFFF'}};
            sh.fill      = {type:'pattern',pattern:'solid',fgColor:{argb:'FF2E7D32'}};
            sh.alignment = {horizontal:'center',vertical:'middle'};
            ws.getRow(2).height = 14;

            const _sh4MoHeaders = MO_SHORT_OV.slice(0,_sh4MaxMo).map(function(m){return m+'\n(REG. AVG)';});
            const hdrVals = ['REGION','PROJECT','STATUS','OVERALL\nCOMPLIANCE'].concat(_sh4MoHeaders)
                .concat(['YTD\nMANHOURS','MANPOWER','LTA','MED.\nTREATMENT','FIRST\nAID','FATALITY','HIGH-\nPOTENTIAL','DANGEROUS\nOCCURRENCES','DAYS\nLOST']);
            const hRow = ws.addRow(hdrVals);
            hRow.height=28; hRow.eachCell(_xHdr);
            for(let ci=_fixedCols+1;ci<=_fixedCols+_sh4MaxMo;ci++){
                hRow.getCell(ci).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF37474F'}};
            }

            ws.getColumn(1).width=22; ws.getColumn(2).width=34; ws.getColumn(3).width=14; ws.getColumn(4).width=14;
            for(let ci=5;ci<=_fixedCols+_sh4MaxMo;ci++) ws.getColumn(ci).width=9;
            ws.getColumn(_fixedCols+_sh4MaxMo+1).width=14;
            ws.getColumn(_fixedCols+_sh4MaxMo+2).width=12;
            for(let ci=_fixedCols+_sh4MaxMo+3;ci<=_totalCols-1;ci++) ws.getColumn(ci).width=12;
            ws.getColumn(_totalCols).width=14; // DO col

            function _sh4Sort(a,b){
                const ord=function(p){return p.status==='on-going'?0:p.dateFinished?1:p.status==='work-stoppage'?2:0;};
                return ord(a)-ord(b);
            }

            let projRowIdx=0;
            OV_REGIONS.forEach(function(region){
                const rp=_ovAllProjs.filter(function(p){return(p.region||'').toUpperCase()===region;}).slice().sort(_sh4Sort);
                if(!rp.length) return;

                const rpOngo=rp.filter(function(p){return p.status==='on-going';}).length;
                const rpStop=rp.filter(function(p){return p.status==='work-stoppage';}).length;
                const rpFin =rp.filter(function(p){return !!p.dateFinished;}).length;

                const banRow=ws.addRow([]);
                ws.mergeCells(banRow.number,1,banRow.number,_totalCols);
                const banCell=banRow.getCell(1);
                banCell.value='📌 '+region+' — '+rp.length+' project'+(rp.length!==1?'s':'')+
                    '  (On-going: '+rpOngo+(rpStop?' · Work Stoppage: '+rpStop:'')+(rpFin?' · Finished: '+rpFin:'')+')';
                banCell.font={bold:true,size:10,name:'Calibri',color:{argb:'FFFFFFFF'}};
                banCell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF1B5E20'}};
                banCell.alignment={horizontal:'left',vertical:'middle',indent:1};
                banRow.height=16;

                rp.forEach(function(proj){
                    const isWS      = proj.status==='work-stoppage';
                    const isFin     = !!proj.dateFinished && !isWS;
                    const isInactive= isWS||isFin;
                    const isAlt     = projRowIdx%2===1;
                    const rowBg     = isWS?(isAlt?'FFE5E5':'FFF5F5'):isFin?(isAlt?'EEEEEE':'F5F5F5'):(isAlt?'F1F8E9':'FFFFFF');
                    projRowIdx++;

                    const perc = (!isWS&&typeof getPerc==='function')?getPerc(proj, true):null; // include finished projects' historical score, not a dash
                    const mh   = _ovYtd(proj,'exposures_Total Exposed Manhour');
                    const mp   = parseFloat(_v(proj,'exposures_Total Manpower',curMonthOv))||0;
                    const lta  = _ovYtd(proj,'medical_LTA');
                    const med  = _ovYtd(proj,'medical_Medical Treatment');
                    const fa   = _ovYtd(proj,'medical_First Aid');
                    const fat  = _ovYtd(proj,'medical_Fatality');
                    const hi   = _ovYtd(proj,'medical_High-Potential incident');
                    const dl   = _ovYtd(proj,'medical_Days Lost/Charged');
                    const pdo  = _ovYtd(proj,'medical_Dangerous Occurrences');
                    const statusLabel = getStatusLabel(isWS?'work-stoppage':isFin?'finished':'on-going');

                    const moComps = MO_LONG_OV.slice(0,_sh4MaxMo).map(function(_,mi){
                        if(isInactive||typeof getMonthlyComplianceByRegion!=='function') return null;
                        return getMonthlyComplianceByRegion(mi+1,(proj.region||'').toUpperCase());
                    });

                    const _moStartCol  = _fixedCols+1;
                    const _moEndCol    = _fixedCols+_sh4MaxMo;
                    const _incStartCol = _moEndCol+1;
                    const _ltaCol      = _incStartCol+2;
                    const _fatCol      = _incStartCol+5;

                    const rowVals = [proj.region||'',proj.name||'',statusLabel,perc!==null?Math.round(perc)+'%':'—']
                        .concat(moComps.map(function(v){return v!==null?v+'%':'—';}))
                        .concat([Math.round(mh)||0,Math.round(mp)||0,lta||0,med||0,fa||0,fat||0,hi||0,pdo||0,dl||0]);

                    const dr=ws.addRow(rowVals);
                    dr.height=15;

                    for(let ci=1;ci<=3;ci++){
                        const c=dr.getCell(ci);
                        c.font={size:9,name:'Calibri',bold:ci===2,color:{argb:isWS?'FFB71C1C':isFin?'FF757575':'FF212121'}};
                        c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF'+rowBg}};
                        c.alignment={vertical:'middle',horizontal:'left',indent:1,wrapText:false};
                        _ovThinBorder(c);
                    }
                    const stCell=dr.getCell(3);
                    if(isWS){stCell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFB71C1C'}};stCell.font={bold:true,size:8,name:'Calibri',color:{argb:'FFFFFFFF'}};stCell.alignment={horizontal:'center',vertical:'middle'};}
                    else if(isFin){stCell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF9E9E9E'}};stCell.font={bold:true,size:8,name:'Calibri',color:{argb:'FFFFFFFF'}};stCell.alignment={horizontal:'center',vertical:'middle'};}

                    const pCell=dr.getCell(4);
                    pCell.alignment={horizontal:'center',vertical:'middle'}; _ovThinBorder(pCell);
                    if(isInactive){pCell.value='—';pCell.font={size:9,name:'Calibri',color:{argb:'FFB0BEC5'}};pCell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF'+rowBg}};}
                    else{_ovApplyCompCell(pCell,perc);if(perc===null){pCell.font={size:9,name:'Calibri'};pCell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF'+rowBg}};}}

                    for(let ci=_moStartCol;ci<=_moEndCol;ci++){
                        const c=dr.getCell(ci);
                        const pv=c.value&&c.value!=='—'?parseInt(c.value):null;
                        c.alignment={horizontal:'center',vertical:'middle'}; _ovThinBorder(c);
                        if(isInactive||pv===null){c.value='—';c.font={size:8,name:'Calibri',color:{argb:'FFD0D0D0'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF'+rowBg}};}
                        else{_ovApplyCompCell(c,pv);c.font={size:8,name:'Calibri',bold:true,color:{argb:'FF'+(_ovCompColor(pv)||{fg:'1B5E20'}).fg}};}
                    }

                    for(let ci=_incStartCol;ci<=_totalCols;ci++){
                        const c=dr.getCell(ci);
                        c.font={size:9,name:'Calibri',color:{argb:isInactive?'FF9E9E9E':'FF212121'}};
                        c.alignment={horizontal:'center',vertical:'middle'};
                        c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF'+rowBg}};
                        _ovThinBorder(c);
                    }
                    const ltaC=dr.getCell(_ltaCol);
                    if((lta||0)>0){ltaC.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFFFCDD2'}};ltaC.font={bold:true,size:9,name:'Calibri',color:{argb:'FFB71C1C'}};}
                    const fatC=dr.getCell(_fatCol);
                    if((fat||0)>0){fatC.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFB71C1C'}};fatC.font={bold:true,size:9,name:'Calibri',color:{argb:'FFFFFFFF'}};}
                });
                ws.addRow([]).height=4;
            });
        })();

        await _xSave(wb,'overall'); return;
    }

    // ════════════════════════════════════════════════════════════════════════
    // ESH CALENDAR TABS  — KPM/GOT-style layout
    //   Rows    = training / drill items  (left fixed cols)
    //   Columns = projects grouped by region + REGION AVG + OVERALL AVG
    //   One worksheet per month (months that have any planned/actual data)
    //   + a SUMMARY worksheet (overall planned vs actual per item per project)
    // ════════════════════════════════════════════════════════════════════════
    if (['esh-calendar-env','esh-calendar-safety','esh-calendar-health','esh-calendar-drills','esh-calendar-corp-drills'].includes(tab)) {
        const _isDrills     = (tab === 'esh-calendar-drills');
        const _isCorpDrills = (tab === 'esh-calendar-corp-drills');
        const _storage      = (typeof getEshStorage === 'function') ? getEshStorage() : {};
        const _trainings    = (!_isDrills && !_isCorpDrills && typeof ESH_TRAININGS !== 'undefined') ? (ESH_TRAININGS[tab] || []) : [];
        const _drills       = (_isDrills  && typeof ESH_DRILLS      !== 'undefined') ? ESH_DRILLS      : [];
        // Corporate Drills: base list + custom rows added on screen. Storage index = row number for base rows, 1000 + custom index for custom rows (same as renderCorpDrillsTab).
        const _corpDrills   = !_isCorpDrills ? [] : (window.CORP_DRILLS || []).concat(
            ((typeof getCorpDrillCustomRows === 'function') ? getCorpDrillCustomRows() : []).map(function(r, i) {
                return { name: r.name || r, freq: r.freq || 'Once a year', _custom: true, _customIdx: i };
            }));
        const _items        = _isDrills ? _drills : _isCorpDrills ? _corpDrills : _trainings;

        if (!_items.length) { showToast('No calendar items found.', 'info'); return; }

        // ── Project pool (same filter as KPM/GOT) ────────────────────────────
        const _CAL_REGIONS  = ['NCR','SOUTH LUZON','NORTH LUZON','VISAYAS & MINDANAO'];
        // A project column is left out of a month when the project has not started yet or is already finished
        // (same helper the dashboard uses: isProjectHiddenForMonth). A project on work stoppage stays in, marked WORK STOPPAGE.
        function _calHidden(p, mo1) {
            return (typeof isProjectHiddenForMonth === 'function') && isProjectHiddenForMonth(p, mo1, year);
        }
        // Pool = every project that shows in at least one month of the year.
        // Corporate Drills tab = the Corporate project only (same as the on-screen tab).
        const _calAllProjs  = _isCorpDrills
            ? (function() {
                const cp = (state.projects || []).find(function(p) { return (p.region || '').toUpperCase() === 'CORPORATE'; });
                return cp ? [cp] : [];
            })()
            : (state.filteredProjects || state.projects || []).filter(function(p) {
                const r = (p.region || '').toUpperCase();
                if (r === 'CORPORATE' || r === 'PLANT OPERATIONS') return false;
                for (let m = 1; m <= 12; m++) { if (!_calHidden(p, m)) return true; }
                return false;
            });
        if (!_calAllProjs.length) { showToast('No project data to export.', 'info'); return; }

        const _calSortedReg = _CAL_REGIONS.filter(function(r){ return _calAllProjs.some(function(p){ return (p.region||'').toUpperCase()===r; }); });
        const _calOtherReg  = [...new Set(_calAllProjs.map(function(p){ return (p.region||'').toUpperCase(); }).filter(function(r){ return !_CAL_REGIONS.includes(r); }))];
        const _calRegOrder  = [..._calSortedReg, ..._calOtherReg];
        const _calProjsByReg = {};
        _calRegOrder.forEach(function(r){ _calProjsByReg[r] = _calAllProjs.filter(function(p){ return (p.region||'').toUpperCase()===r; }); });
        const _calOrderedProjs = _calRegOrder.flatMap(function(r){ return _calProjsByReg[r]; });

        // colMap: { type:'proj'|'avg'|'overall', proj?, region? }
        const _calColMap = [];
        _calRegOrder.forEach(function(region) {
            _calProjsByReg[region].forEach(function(proj){ _calColMap.push({ type:'proj', proj, region }); });
            _calColMap.push({ type:'avg', region });
        });
        _calColMap.push({ type:'overall' });

        // LEFT fixed cols: NO. | TRAINING / DRILL | FREQUENCY (drills only, else blank)
        const _CAL_LEFT = _isDrills || _isCorpDrills ? 3 : 2;  // No. | Item | Freq(drills)
        const _calTotalCols = _CAL_LEFT + _calColMap.length;

        // KPM/GOT palette
        const _C_DG  = '1B5E20';  // dark green
        const _C_MG  = '2E7D32';  // med green
        const _C_GH  = 'F5F5F5';  // gray header
        const _C_CHB = '37474F';  // col header bg
        const _C_CHF = 'FFFFFF';
        const _C_OVB = '1A237E';  // overall col bg (deep blue)

        // ── Style helpers (identical palette to KPM/GOT) ─────────────────────
        function _calHdr(cell, bgArgb, fgArgb) {
            cell.font      = { bold:true, color:{argb:'FF'+(fgArgb||_C_CHF)}, size:9, name:'Calibri' };
            cell.fill      = { type:'pattern', pattern:'solid', fgColor:{argb:'FF'+(bgArgb||_C_CHB)} };
            cell.alignment = { horizontal:'center', vertical:'middle', wrapText:true };
            cell.border    = { top:{style:'thin',color:{argb:'FFB0BEC5'}}, bottom:{style:'thin',color:{argb:'FFB0BEC5'}},
                               left:{style:'thin',color:{argb:'FFB0BEC5'}}, right:{style:'thin',color:{argb:'FFB0BEC5'}} };
        }
        function _calLeft(cell, bold) {
            cell.font      = { bold:!!bold, size:8.5, name:'Calibri' };
            cell.alignment = { vertical:'middle', wrapText:true };
            cell.fill      = { type:'pattern', pattern:'solid', fgColor:{argb:'FF'+_C_GH} };
            cell.border    = { top:{style:'thin',color:{argb:'FFB0BEC5'}}, bottom:{style:'thin',color:{argb:'FFB0BEC5'}},
                               left:{style:'thin',color:{argb:'FFB0BEC5'}}, right:{style:'medium',color:{argb:'FF'+_C_MG}} };
        }
        function _calDataCell(cell, value, dateStr, overdue) {
            const thinBorder = { top:{style:'thin',color:{argb:'FFB0BEC5'}}, bottom:{style:'thin',color:{argb:'FFB0BEC5'}},
                                 left:{style:'thin',color:{argb:'FFB0BEC5'}}, right:{style:'thin',color:{argb:'FFB0BEC5'}} };
            cell.border    = thinBorder;
            cell.value     = value || '';
            cell.font      = { size:9, name:'Calibri' };
            cell.alignment = { horizontal:'center', vertical:'middle' };
            if (value === '✔') {
                // Date conducted = the Actual date typed in the dashboard, written as a real Excel date
                const dm = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr || '');
                if (dm) { cell.value = new Date(Date.UTC(+dm[1], +dm[2] - 1, +dm[3])); cell.numFmt = 'dd-mmm-yy'; }
                else    { cell.value = dateStr || ''; }
                cell.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFC8E6C9'} };
                cell.font = { bold:true, size:9, name:'Calibri', color:{argb:'FF1B5E20'} };
            } else if (value === '○') {
                // Planned but no Actual date: past month = NOT CONDUCTED, current / coming month = PLANNED (not due yet)
                if (overdue) {
                    cell.value = 'NOT CONDUCTED';
                    cell.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFFFCDD2'} };
                    cell.font = { bold:true, size:8, name:'Calibri', color:{argb:'FFB71C1C'} };
                } else {
                    cell.value = 'PLANNED';
                    cell.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFFFF9C4'} };
                    cell.font = { bold:true, size:8, name:'Calibri', color:{argb:'FF82500D'} };
                }
                cell.alignment = { horizontal:'center', vertical:'middle', wrapText:true };
            } else if (value === 'N/A') {
                cell.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFB2DFDB'} };
                cell.font = { italic:true, size:8, name:'Calibri', color:{argb:'FF004D40'} };
            }
        }
        function _calAvgCell(cell, planned, actual, naCount, total) {
            cell.border = { top:{style:'medium',color:{argb:'FF'+_C_MG}}, bottom:{style:'medium',color:{argb:'FF'+_C_MG}},
                            left:{style:'medium',color:{argb:'FF'+_C_MG}}, right:{style:'medium',color:{argb:'FF'+_C_MG}} };
            if (!total || total === naCount) {
                cell.value = '—'; cell.font={size:9,name:'Calibri',color:{argb:'FF9E9E9E'}}; cell.alignment={horizontal:'center',vertical:'middle'}; return;
            }
            const eligible = total - naCount;
            const pct = eligible > 0 ? Math.round((actual / eligible) * 100) : 0;
            cell.value     = pct + '%';
            cell.alignment = { horizontal:'center', vertical:'middle' };
            const c = pct >= 90 ? {bg:'C8E6C9',fg:'1B5E20'} : pct >= 75 ? {bg:'FFF9C4',fg:'82500D'} : {bg:'FFCDD2',fg:'B71C1C'};
            cell.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FF'+c.bg} };
            cell.font = { bold:true, size:10, name:'Calibri', color:{argb:'FF'+c.fg} };
        }
        function _calOverallAvgCell(cell, planned, actual, naCount, total) {
            _calAvgCell(cell, planned, actual, naCount, total);
            // Override fill to deep-blue tones for overall column
            if (total && total !== naCount) {
                const eligible = total - naCount;
                const pct = eligible > 0 ? Math.round((actual / eligible) * 100) : 0;
                cell.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFE8EAF6'} };
                cell.font = { bold:true, size:10, name:'Calibri', color:{argb:'FF'+_C_OVB} };
                // re-apply border
                cell.border = { top:{style:'medium',color:{argb:'FF'+_C_MG}}, bottom:{style:'medium',color:{argb:'FF'+_C_MG}},
                                left:{style:'medium',color:{argb:'FF'+_C_MG}}, right:{style:'medium',color:{argb:'FF'+_C_MG}} };
            }
        }

        // ── Helpers: storage index + cell state for one item/proj/month ──────
        function _calStorageIdx(item, itemIdx) {
            if (_isCorpDrills) return item._custom ? (1000 + (item._customIdx || 0)) : itemIdx;
            if (_isDrills)     return (typeof getDrillStorageIdx==='function') ? getDrillStorageIdx(item,itemIdx) : (item.id!==undefined?item.id:itemIdx);
            return itemIdx;
        }
        function _calKeys(proj, item, itemIdx, mi) {
            const ti = _calStorageIdx(item, itemIdx);
            return {
                plan:   year+'|'+tab+'|GLOBAL_PLAN|'+ti+'|'+mi+'|plan',
                actual: year+'|'+tab+'|'+proj.name+'|'+ti+'|'+mi+'|actual',
                na:     year+'|'+tab+'|'+proj.name+'|'+ti+'|'+mi+'|na'
            };
        }
        function _calOn(v) { return !!v && v !== '__DELETED__'; }
        // Same rule as the dashboard: Actual only counts when the month is planned (a leftover Actual with no Plan is ignored).
        function _calGetState(proj, item, itemIdx, mi) {
            const k        = _calKeys(proj, item, itemIdx, mi);
            const isNA     = (_isDrills || _isCorpDrills) && _calOn(_storage[k.na]);
            const isBlack  = (typeof isMonthBlacklistedForProject==='function') && isMonthBlacklistedForProject(proj,mi+1,year);
            if (isNA || isBlack) return 'N/A';
            const planned  = _calOn(_storage[k.plan]);
            if (planned && _calOn(_storage[k.actual])) return '✔';
            if (planned) return '○';
            return '';
        }
        // Date conducted (the Actual date) for one item/proj/month
        function _calGetDate(proj, item, itemIdx, mi) {
            const v = _storage[_calKeys(proj, item, itemIdx, mi).actual];
            return _calOn(v) ? String(v) : '';
        }
        // A project that is on work stoppage in this month (still shows, but the whole column is one WORK STOPPAGE block)
        function _calIsStopped(proj, mi) {
            return (typeof isMonthBlacklistedForProject==='function') && isMonthBlacklistedForProject(proj, mi+1, year);
        }
        // Columns of ONE month sheet: only projects that show in that month; region with no project that month is left out
        function _calColMapForMonth(mi) {
            const cmap = [];
            _calRegOrder.forEach(function(region) {
                const vis = _calProjsByReg[region].filter(function(p) { return !_calHidden(p, mi+1); });
                if (!vis.length) return;
                vis.forEach(function(proj) { cmap.push({ type:'proj', proj, region }); });
                cmap.push({ type:'avg', region, projs: vis });
            });
            cmap.push({ type:'overall' });
            return cmap;
        }

        showToast('Generating ESH Calendar Excel file...', 'info');

        // ── Build workbook ────────────────────────────────────────────────────
        const _calWb = eshNewWorkbook('ESH Monitoring System');

        // ── Helper: build region-header row + column-header row (KPM/GOT style) ─
        // cmap = the columns of THIS sheet (they differ from month to month)
        function _calBuildHeaderRows(ws, sheetTitle, cmap) {
            const totalCols = _CAL_LEFT + cmap.length;
            const regOrder  = [];
            const projCount = {};
            cmap.forEach(function(cm) {
                if (cm.type !== 'proj') return;
                if (regOrder.indexOf(cm.region) === -1) regOrder.push(cm.region);
                projCount[cm.region] = (projCount[cm.region] || 0) + 1;
            });

            // Row 1: Notes / title bar
            const noteRow = ws.addRow([sheetTitle + ' — ' + year]);
            ws.mergeCells(noteRow.number, 1, noteRow.number, totalCols);
            const nc = noteRow.getCell(1);
            nc.font      = { bold:true, color:{argb:'FF'+_C_CHF}, size:13, name:'Calibri' };
            nc.fill      = { type:'pattern', pattern:'solid', fgColor:{argb:'FF'+_C_DG} };
            nc.alignment = { horizontal:'center', vertical:'middle' };
            noteRow.height = 26;

            // Row 2: Spacer
            ws.addRow([]); ws.getRow(2).height = 6;

            // Row 3: Region span headers
            const regHdrRow = ws.addRow(Array(totalCols).fill(''));
            regHdrRow.height = 20;
            let colOff = _CAL_LEFT + 1;
            regOrder.forEach(function(region) {
                const pc = projCount[region];
                const spanStart = colOff;
                const spanEnd   = colOff + pc; // +1 for AVG col
                const c = regHdrRow.getCell(spanStart);
                c.value = region;
                c.font  = { bold:true, color:{argb:'FF'+_C_CHF}, size:10, name:'Calibri' };
                c.fill  = { type:'pattern', pattern:'solid', fgColor:{argb:'FF'+_C_DG} };
                c.alignment = { horizontal:'center', vertical:'middle' };
                if (spanEnd > spanStart) ws.mergeCells(regHdrRow.number, spanStart, regHdrRow.number, spanEnd);
                colOff += pc + 1;
            });
            // OVERALL label
            const ovCell = regHdrRow.getCell(colOff);
            ovCell.value = 'OVERALL'; ovCell.font={bold:true,color:{argb:'FF'+_C_CHF},size:10,name:'Calibri'};
            ovCell.fill  = { type:'pattern', pattern:'solid', fgColor:{argb:'FF'+_C_OVB} };
            ovCell.alignment = { horizontal:'center', vertical:'middle' };
            // Fill left fixed cols in region row with dark green
            for (let ci=1; ci<=_CAL_LEFT; ci++) {
                regHdrRow.getCell(ci).fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FF'+_C_DG} };
            }

            // Row 4: Column headers
            const hdrData = _CAL_LEFT === 3 ? ['NO.','DRILL / EMERGENCY SCENARIO','FREQUENCY'] : ['NO.','TRAINING / AWARENESS TOPIC'];
            cmap.forEach(function(cm) {
                if (cm.type==='proj')    hdrData.push(cm.proj.name||'');
                else if (cm.type==='avg') hdrData.push('REGION\nAVG');
                else                     hdrData.push('OVERALL\nAVG');
            });
            const hdrRow = ws.addRow(hdrData);
            hdrRow.height = 45;
            for (let ci=1; ci<=_CAL_LEFT; ci++) _calHdr(hdrRow.getCell(ci), _C_CHB, _C_CHF);
            cmap.forEach(function(cm, i) {
                const ci = _CAL_LEFT + 1 + i;
                if      (cm.type==='avg')     _calHdr(hdrRow.getCell(ci), _C_MG,  'FFFFFF');
                else if (cm.type==='overall') _calHdr(hdrRow.getCell(ci), _C_OVB, 'FFFFFF');
                else                          _calHdr(hdrRow.getCell(ci), _C_CHB, _C_CHF);
                if      (cm.type==='avg')     hdrRow.getCell(ci).value = 'REGION\nAVG';
                else if (cm.type==='overall') hdrRow.getCell(ci).value = 'OVERALL\nAVG';
            });

            ws.views = [{ state:'frozen', xSplit:_CAL_LEFT, ySplit:4, activeCell:'D5' }];
            return 5; // next row index (1-based)
        }

        // ── Per-month sheets ──────────────────────────────────────────────────
        // Determine which months have any data (only projects that show in that month count)
        const _calSubmittedMonths = MO_LONG.filter(function(mo, mi) {
            return _calAllProjs.some(function(proj) {
                if (_calHidden(proj, mi+1)) return false;
                return _items.some(function(item, ii) {
                    const s = _calGetState(proj, item, ii, mi);
                    return s === '✔' || s === '○';
                });
            });
        });

        if (!_calSubmittedMonths.length) {
            showToast('No ESH Calendar data found for this year.', 'info'); return;
        }

        _calSubmittedMonths.forEach(function(mo) {
            const moIdx  = MO_LONG.indexOf(mo);
            const moSh   = MO_SHORT[moIdx];
            const wsName = ('CAL-' + moSh + '-' + year).substring(0, 31);
            const ws     = _calWb.addWorksheet(wsName);
            const cmap     = _calColMapForMonth(moIdx);
            const visProjs = cmap.filter(function(cm){ return cm.type === 'proj'; }).map(function(cm){ return cm.proj; });
            const stopped  = new Map(visProjs.map(function(p){ return [p, _calIsStopped(p, moIdx)]; }));
            let rowIdx   = _calBuildHeaderRows(ws, title + ' — ' + moSh, cmap);
            const dataStart = ws.rowCount + 1;
            // Month already passed (same rule as the dashboard's overdue): a planned item with no Actual date = NOT CONDUCTED
            const _calNow = new Date();
            const _calMonthPast = (year < _calNow.getFullYear()) || (year === _calNow.getFullYear() && moIdx < _calNow.getMonth());

            _items.forEach(function(item, ii) {
                const itemLabel = item.label || item.name || (typeof item === 'string' ? item : String(ii+1));
                const itemFreq  = item.freq || '';
                const rowArr    = _CAL_LEFT === 3 ? [ii+1, itemLabel, itemFreq] : [ii+1, itemLabel];

                // Per-project values + region avg + overall avg
                cmap.forEach(function(cm) {
                    if (cm.type === 'proj') {
                        rowArr.push(stopped.get(cm.proj) ? '' : _calGetState(cm.proj, item, ii, moIdx));
                    } else if (cm.type === 'avg') {
                        const rp    = cm.projs;
                        let planned=0, actual=0, na=0;
                        rp.forEach(function(p){ const s=_calGetState(p,item,ii,moIdx); if(s==='✔'){actual++;planned++;} else if(s==='○'){planned++;} else if(s==='N/A'){na++;} });
                        rowArr.push({ _planned:planned, _actual:actual, _na:na, _total:rp.length });
                    } else {
                        let planned=0, actual=0, na=0;
                        visProjs.forEach(function(p){ const s=_calGetState(p,item,ii,moIdx); if(s==='✔'){actual++;planned++;} else if(s==='○'){planned++;} else if(s==='N/A'){na++;} });
                        rowArr.push({ _planned:planned, _actual:actual, _na:na, _total:visProjs.length });
                    }
                });

                const dataRow = ws.addRow(rowArr.map(function(v){ return (typeof v === 'object' && v !== null && '_actual' in v) ? '' : v; }));
                dataRow.height = 30;

                // Left cols
                const noCell = dataRow.getCell(1);
                noCell.font={bold:true,size:8,name:'Calibri'}; noCell.alignment={horizontal:'center',vertical:'middle'};
                noCell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF'+_C_GH}};
                noCell.border={top:{style:'thin',color:{argb:'FFB0BEC5'}},bottom:{style:'thin',color:{argb:'FFB0BEC5'}},left:{style:'thin',color:{argb:'FFB0BEC5'}},right:{style:'thin',color:{argb:'FFB0BEC5'}}};
                _calLeft(dataRow.getCell(2), false);
                if (_CAL_LEFT === 3) {
                    const fCell = dataRow.getCell(3);
                    fCell.font={italic:true,size:8,name:'Calibri',color:{argb:'FF5D4037'}};
                    fCell.alignment={vertical:'middle',horizontal:'center',wrapText:true};
                    fCell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF'+_C_GH}};
                    fCell.border={top:{style:'thin',color:{argb:'FFB0BEC5'}},bottom:{style:'thin',color:{argb:'FFB0BEC5'}},left:{style:'thin',color:{argb:'FFB0BEC5'}},right:{style:'medium',color:{argb:'FF'+_C_MG}}};
                }

                // Data + avg cells
                cmap.forEach(function(cm, i) {
                    const ci   = _CAL_LEFT + 1 + i;
                    const cell = dataRow.getCell(ci);
                    const raw  = rowArr[_CAL_LEFT + i];
                    if (cm.type === 'proj') {
                        if (stopped.get(cm.proj)) return;   // whole column is merged into one WORK STOPPAGE block below
                        _calDataCell(cell, raw, raw === '✔' ? _calGetDate(cm.proj, item, ii, moIdx) : '', _calMonthPast);
                    } else if (cm.type === 'avg') {
                        _calAvgCell(cell, raw._planned, raw._actual, raw._na, raw._total);
                    } else {
                        _calOverallAvgCell(cell, raw._planned, raw._actual, raw._na, raw._total);
                    }
                });

                rowIdx++;
            });

            // Work-stoppage projects: one merged block down the whole column, text turned vertical
            const dataEnd = ws.rowCount;
            if (visProjs.some(function(p){ return stopped.get(p); })) {
                // the stacked text (13 letters) needs about 270 pt of height: stretch the rows only when the sheet has too few rows
                const needH = Math.ceil(300 / Math.max(1, _items.length));
                if (needH > 30) for (let r = dataStart; r <= dataEnd; r++) ws.getRow(r).height = needH;
            }
            cmap.forEach(function(cm, i) {
                if (cm.type !== 'proj' || !stopped.get(cm.proj)) return;
                const ci = _CAL_LEFT + 1 + i;
                for (let r = dataStart; r <= dataEnd; r++) {
                    const c = ws.getCell(r, ci);
                    c.fill   = { type:'pattern', pattern:'solid', fgColor:{argb:'FFFFE0B2'} };
                    c.border = { top:{style:'thin',color:{argb:'FFB0BEC5'}}, bottom:{style:'thin',color:{argb:'FFB0BEC5'}},
                                 left:{style:'thin',color:{argb:'FFB0BEC5'}}, right:{style:'thin',color:{argb:'FFB0BEC5'}} };
                }
                if (dataEnd > dataStart) ws.mergeCells(dataStart, ci, dataEnd, ci);
                const mc = ws.getCell(dataStart, ci);
                mc.value     = 'WORK STOPPAGE';
                mc.font      = { bold:true, size:16, name:'Calibri', color:{argb:'FFE65100'} };
                mc.alignment = { horizontal:'center', vertical:'middle', textRotation:'vertical', wrapText:false };  // letters stacked top to bottom (Excel: Vertical Text)
            });

            // Column widths
            ws.getColumn(1).width = 5;
            ws.getColumn(2).width = _CAL_LEFT === 3 ? 38 : 44;
            if (_CAL_LEFT === 3) ws.getColumn(3).width = 14;
            cmap.forEach(function(cm, i) {
                const ci = _CAL_LEFT + 1 + i;
                ws.getColumn(ci).width = cm.type === 'overall' ? 12 : cm.type === 'avg' ? 10 : 16;
            });
        });

        // ── SUMMARY sheet: planned vs actual counts per item per project ──────
        (function() {
            const ws = _calWb.addWorksheet('SUMMARY');
            // LEFT fixed cols for summary: NO. | ITEM | FREQ(drills) | METRIC
            const SUM_LEFT = _CAL_LEFT === 3 ? 4 : 3; // No | Item | Freq(optional) | Metric
            const sumTotalCols = SUM_LEFT + _calColMap.length;

            // Row 1: title
            const tr = ws.addRow([title + ' — ANNUAL SUMMARY ' + year]);
            ws.mergeCells(tr.number, 1, tr.number, sumTotalCols);
            const tc = tr.getCell(1);
            tc.font={bold:true,color:{argb:'FF'+_C_CHF},size:13,name:'Calibri'};
            tc.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF'+_C_DG}};
            tc.alignment={horizontal:'center',vertical:'middle'}; tr.height=26;
            // Row 2: spacer
            ws.addRow([]); ws.getRow(2).height=6;
            // Row 3: region spans
            const srHdr = ws.addRow(Array(sumTotalCols).fill(''));
            srHdr.height=20;
            let sColOff = SUM_LEFT + 1;
            _calRegOrder.forEach(function(region){
                const pc = _calProjsByReg[region].length;
                const spanStart=sColOff, spanEnd=sColOff+pc;
                const c=srHdr.getCell(spanStart);
                c.value=region; c.font={bold:true,color:{argb:'FF'+_C_CHF},size:10,name:'Calibri'};
                c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF'+_C_DG}};
                c.alignment={horizontal:'center',vertical:'middle'};
                if(spanEnd>spanStart) ws.mergeCells(srHdr.number,spanStart,srHdr.number,spanEnd);
                sColOff+=pc+1;
            });
            const sovCell=srHdr.getCell(sColOff);
            sovCell.value='OVERALL'; sovCell.font={bold:true,color:{argb:'FF'+_C_CHF},size:10,name:'Calibri'};
            sovCell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF'+_C_OVB}};
            sovCell.alignment={horizontal:'center',vertical:'middle'};
            for(let ci=1;ci<=SUM_LEFT;ci++) srHdr.getCell(ci).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF'+_C_DG}};
            // Row 4: column headers
            const shdrData = SUM_LEFT===4 ? ['NO.','TRAINING / DRILL TOPIC','FREQUENCY','METRIC'] : ['NO.','TRAINING / AWARENESS TOPIC','METRIC'];
            _calColMap.forEach(function(cm){
                if(cm.type==='proj') shdrData.push(cm.proj.name||'');
                else if(cm.type==='avg') shdrData.push('REGION\nAVG');
                else shdrData.push('OVERALL\nAVG');
            });
            const shdrRow = ws.addRow(shdrData);
            shdrRow.height=45;
            for(let ci=1;ci<=SUM_LEFT;ci++) _calHdr(shdrRow.getCell(ci),_C_CHB,_C_CHF);
            _calColMap.forEach(function(cm,i){
                const ci=SUM_LEFT+1+i;
                if(cm.type==='avg')         _calHdr(shdrRow.getCell(ci),_C_MG,'FFFFFF');
                else if(cm.type==='overall') _calHdr(shdrRow.getCell(ci),_C_OVB,'FFFFFF');
                else                         _calHdr(shdrRow.getCell(ci),_C_CHB,_C_CHF);
                if(cm.type==='avg')          shdrRow.getCell(ci).value='REGION\nAVG';
                else if(cm.type==='overall') shdrRow.getCell(ci).value='OVERALL\nAVG';
            });
            ws.views=[{state:'frozen',xSplit:SUM_LEFT,ySplit:4,activeCell:'E5'}];

            // Data rows — 2 rows per item: PLANNED and ACTUAL
            _items.forEach(function(item, ii) {
                const itemLabel = item.label||item.name||(typeof item==='string'?item:String(ii+1));
                const itemFreq  = item.freq||'';
                ['PLANNED','ACTUAL'].forEach(function(metric) {
                    const rowArr = SUM_LEFT===4 ? [ii+1, itemLabel, itemFreq, metric] : [ii+1, itemLabel, metric];
                    // Calculate annual totals per project
                    _calColMap.forEach(function(cm) {
                        function _annCount(proj) {
                            let planned=0, actual=0, na=0;
                            for(let mi=0;mi<12;mi++){
                                const s=_calGetState(proj,item,ii,mi);
                                if(s==='✔'){actual++;planned++;}
                                else if(s==='○'){planned++;}
                                else if(s==='N/A'){na++;}
                            }
                            return {planned,actual,na};
                        }
                        if(cm.type==='proj'){
                            const c=_annCount(cm.proj);
                            rowArr.push(metric==='PLANNED'?c.planned:c.actual);
                        } else if(cm.type==='avg'){
                            const rp=_calProjsByReg[cm.region];
                            let tp=0,ta=0,tn=0;
                            rp.forEach(function(p){const c=_annCount(p);tp+=c.planned;ta+=c.actual;tn+=c.na;});
                            rowArr.push({_planned:tp,_actual:ta,_na:tn,_total:rp.length*12});
                        } else {
                            let tp=0,ta=0,tn=0;
                            _calOrderedProjs.forEach(function(p){const c=_annCount(p);tp+=c.planned;ta+=c.actual;tn+=c.na;});
                            rowArr.push({_planned:tp,_actual:ta,_na:tn,_total:_calOrderedProjs.length*12});
                        }
                    });

                    const dataRow = ws.addRow(rowArr.map(function(v){return(typeof v==='object'&&v!==null&&'_actual' in v)?'':v;}));
                    dataRow.height=18;

                    // Style left cols
                    const noC=dataRow.getCell(1);
                    noC.font={bold:true,size:8,name:'Calibri'}; noC.alignment={horizontal:'center',vertical:'middle'};
                    noC.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF'+_C_GH}};
                    noC.border={top:{style:'thin',color:{argb:'FFB0BEC5'}},bottom:{style:'thin',color:{argb:'FFB0BEC5'}},left:{style:'thin',color:{argb:'FFB0BEC5'}},right:{style:'thin',color:{argb:'FFB0BEC5'}}};
                    _calLeft(dataRow.getCell(2),false);
                    if(SUM_LEFT===4){
                        const fC=dataRow.getCell(3);
                        fC.font={italic:true,size:8,name:'Calibri',color:{argb:'FF5D4037'}};
                        fC.alignment={vertical:'middle',horizontal:'center',wrapText:true};
                        fC.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF'+_C_GH}};
                        fC.border={top:{style:'thin',color:{argb:'FFB0BEC5'}},bottom:{style:'thin',color:{argb:'FFB0BEC5'}},left:{style:'thin',color:{argb:'FFB0BEC5'}},right:{style:'medium',color:{argb:'FF'+_C_MG}}};
                    }
                    const mC=dataRow.getCell(SUM_LEFT);
                    mC.font={bold:metric==='PLANNED',italic:metric==='ACTUAL',size:8,name:'Calibri',color:{argb:metric==='PLANNED'?'FF1B5E20':'FF37474F'}};
                    mC.alignment={vertical:'middle',horizontal:'center'};
                    mC.fill={type:'pattern',pattern:'solid',fgColor:{argb:metric==='PLANNED'?'FFE8F5E9':'FF'+_C_GH}};
                    mC.border={top:{style:'thin',color:{argb:'FFB0BEC5'}},bottom:{style:'thin',color:{argb:'FFB0BEC5'}},left:{style:'thin',color:{argb:'FFB0BEC5'}},right:{style:'medium',color:{argb:'FF'+_C_MG}}};

                    // Data cells
                    _calColMap.forEach(function(cm,i){
                        const ci=SUM_LEFT+1+i;
                        const cell=dataRow.getCell(ci);
                        const raw=rowArr[SUM_LEFT+i];
                        if(cm.type==='proj'){
                            const num=typeof raw==='number'?raw:0;
                            cell.value=num||0;
                            cell.font={bold:num>0,size:9,name:'Calibri'};
                            cell.alignment={horizontal:'center',vertical:'middle'};
                            cell.border={top:{style:'thin',color:{argb:'FFB0BEC5'}},bottom:{style:'thin',color:{argb:'FFB0BEC5'}},left:{style:'thin',color:{argb:'FFB0BEC5'}},right:{style:'thin',color:{argb:'FFB0BEC5'}}};
                            if(metric==='ACTUAL'&&num>0){cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFC8E6C9'}};cell.font={bold:true,size:9,name:'Calibri',color:{argb:'FF1B5E20'}};}
                        } else if(cm.type==='overall'){
                            _calOverallAvgCell(cell,raw._planned,raw._actual,raw._na,raw._total);
                        } else {
                            _calAvgCell(cell,raw._planned,raw._actual,raw._na,raw._total);
                        }
                    });
                });
            });

            // Column widths for summary
            ws.getColumn(1).width=5;
            ws.getColumn(2).width=SUM_LEFT===4?38:44;
            if(SUM_LEFT===4) ws.getColumn(3).width=14;
            ws.getColumn(SUM_LEFT).width=10;
            _calColMap.forEach(function(cm,i){
                ws.getColumn(SUM_LEFT+1+i).width=cm.type==='overall'?12:cm.type==='avg'?10:16;
            });
        })();

        await _xSave(_calWb, tab); return;
    }

    // ════════════════════════════════════════════════════════════════════════
    // NOV-ENV / NOV-MONITORING
    // ════════════════════════════════════════════════════════════════════════
    if (tab === 'nov-env' || tab === 'nov-monitoring') {
        const isEnv=(tab==='nov-env');
        const intKey=isEnv?'nov-env_internal_novs':'osh-nov_internal_novs';
        const extKey=isEnv?'nov-env_external_novs':'osh-nov_external_novs';
        const wb=eshNewWorkbook('ESH');
        const ws=wb.addWorksheet('NOV');
        const cols=8;
        _xTitle(ws,title+' — '+year,cols);
        const hdr=ws.addRow(['PROJECT','REGION','TYPE','DATE ISSUED','NOV NO.','ISSUING AUTHORITY','VIOLATION','STATUS']);
        hdr.height=22; hdr.eachCell(_xHdr);
        let ri=3;
        REGIONS.forEach(function(region){
            const rp=projs.filter(function(p){return (p.region||'').toUpperCase()===region;});
            if (!rp.length) return;
            const ban=ws.addRow([region]); ws.mergeCells(ri,1,ri,cols);
            _xBan(ban.getCell(1),'📌 '+region); ban.height=16; ri++;
            rp.forEach(function(proj,pIdx){
                const intNovs=((proj.vals&&proj.vals[intKey])||[]).map(function(n){return{...n,_type:'Internal'};});
                const extNovs=((proj.vals&&proj.vals[extKey])||[]).map(function(n){return{...n,_type:'External'};});
                const allNovs=[...intNovs,...extNovs];
                if (!allNovs.length){
                    const dr=ws.addRow([proj.name||'',proj.region||'','—','—','—','—','—','No NOV on record']);
                    dr.height=15; dr.getCell(1).font={bold:true,size:9,name:'Calibri'}; dr.getCell(1).alignment={vertical:'middle'};
                    for (let ci=2;ci<=cols;ci++){_xData(dr.getCell(ci),'center'); dr.getCell(ci).font={italic:true,size:9,name:'Calibri',color:{argb:'FF9E9E9E'}};}
                    if (pIdx%2===0) _xAlt(dr,cols); ri++; return;
                }
                allNovs.forEach(function(n,nIdx){
                    const status=n.status||n.novStatus||'';
                    const dr=ws.addRow([nIdx===0?proj.name||'':'',nIdx===0?proj.region||'':'',n._type,n.dateIssued||'',n.novNo||n.referenceNo||'',n.issuingAuthority||'',n.violation||n.description||'',status]);
                    dr.height=15;
                    dr.getCell(1).font={bold:true,size:9,name:'Calibri'}; dr.getCell(1).alignment={vertical:'middle'};
                    dr.getCell(2).font={size:9,name:'Calibri'}; dr.getCell(2).alignment={vertical:'middle'};
                    for (let ci=3;ci<=cols;ci++){_xData(dr.getCell(ci),ci===7?'left':'center');}
                    const stCell=dr.getCell(8);
                    if ((status||'').toLowerCase().includes('closed')){stCell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFC8E6C9'}};stCell.font={bold:true,size:9,name:'Calibri',color:{argb:'FF1B5E20'}};}
                    else if ((status||'').toLowerCase().includes('open')){stCell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFFFCDD2'}};stCell.font={bold:true,size:9,name:'Calibri',color:{argb:'FFB71C1C'}};}
                    if (pIdx%2===0) _xAlt(dr,cols);
                    ri++;
                });
            });
            ws.getRow(ri).height=5; ri++;
        });
        ws.getColumn(1).width=32; ws.getColumn(2).width=22; ws.getColumn(3).width=10;
        ws.getColumn(4).width=14; ws.getColumn(5).width=18; ws.getColumn(6).width=24;
        ws.getColumn(7).width=36; ws.getColumn(8).width=14;
        ws.views=[{state:'frozen',ySplit:2,activeCell:'A3'}];
        await _xSave(wb,tab); return;
    }

    // ════════════════════════════════════════════════════════════════════════
    // FALLBACK — generic monthly schema dump
    // ════════════════════════════════════════════════════════════════════════
    showToast('Excel export not yet configured for this tab.', 'info');

    } catch(err) {
        console.error('Excel export error ('+tab+'):', err);
        showToast('Export failed: ' + (err.message||err), 'error');
    }
}

// ── ESH Personnel Monitoring — Export to Excel (ExcelJS) ─────────────────────
async function exportPersonnelExcel() {
    if (state.userRole === 'superintendent' || state.userRole === 'pco') {
        showToast('You do not have permission to export ESH Personnel data.', 'warning');
        return;
    }
    
    if (typeof ExcelJS === 'undefined') {
        showToast('Excel library not loaded. Refresh and try again.', 'error');
        return;
    }

    const allPersonnel = state.personnelData || [];
    if (!allPersonnel.length) {
        showToast('No personnel data to export.', 'info');
        return;
    }

    showToast('Generating Excel file...', 'info');

    // ── Cert helpers ──────────────────────────────────────────────────────────
    const CERT_KEYS_MAP = {
        'Safety Officer I':'COSH','Safety Officer II':'COSH','Safety Officer III':'COSH','Safety Officer IV':'COSH',
        'PCO':'PCO_ACCRED','First Aider':'BLS','Project Nurse':'OHNAP','Project Physician':'OHPHYS',
        'ESH Superintendent':'DOLE_OSH','ESH Head':'DOLE_OSH'
    };
    const CERT_LABELS_MAP = {
        'COSH':'COSH','PCO_ACCRED':'PCO Accred.','BLS':'BLS','OHNAP':'OHNAP','OHPHYS':'OH Physician','DOLE_OSH':'DOLE OSHP'
    };
    function _certStatus(expiry) {
        if (!expiry) return 'NONE';
        const now = new Date(); now.setHours(0,0,0,0);
        const exp = new Date(expiry); exp.setHours(0,0,0,0);
        const days = Math.round((exp - now) / 86400000);
        if (days < 0) return 'EXPIRED';
        if (days <= 60) return 'EXPIRING';
        return 'VALID';
    }
    function _fmtDate(d) {
        if (!d) return '—';
        try { const dt = new Date(d); return isNaN(dt) ? d : dt.toLocaleDateString('en-PH',{year:'numeric',month:'short',day:'2-digit'}); }
        catch(e) { return d; }
    }
    function _fmtLen(len) {
        if (!len) return '—';
        // calculateYearsOfService() already returns a fully formatted
        // string, e.g. "1 Day", "3 Weeks", "6 Months", "2 Years".
        return String(len).trim();
    }

    // ── Load fresh cert data (same source as the dashboard) ──────────────────
    try {
        if (window.firebaseDb && window.firebase && window.firebase.getDocs && window.firebase.collection) {
            const _snap = await window.firebase.getDocs(window.firebase.collection(window.firebaseDb, 'personnel_certificates'));
            const _fresh = {};
            _snap.forEach(d => { _fresh[d.id] = d.data(); });
            window._pcCertData = _fresh;
        }
    } catch (e) {  }

    // Same ID the dashboard uses to look up certs (PersonnelDB.getPersonId), with fallbacks
    function _certLookup(p, certKey) {
        const all = window._pcCertData || {};
        const ids = [];
        if (typeof PersonnelDB !== 'undefined') { try { ids.push(PersonnelDB.getPersonId(p)); } catch(e) {} }
        if (p._pid) ids.push(p._pid);
        if (p.id && String(p.id).trim()) {
            ids.push('emp_' + String(p.id).trim().replace(/[^a-zA-Z0-9_-]/g, '_'));
            ids.push(String(p.id).trim());
        }
        for (const id of ids) {
            const d = (all[id] || {})[certKey];
            if (d) return d;
        }
        return null;
    }
    function _certInfo(p) {
        const certKey = CERT_KEYS_MAP[p.pos] || null;
        if (!certKey) return { label: '—', expiry: '—', status: '—' };
        const label = CERT_LABELS_MAP[certKey] || certKey;
        const cd = _certLookup(p, certKey);
        if (certKey === 'COSH' || certKey === 'OHNAP' || certKey === 'OHPHYS') {
            const _up = !!(cd && cd.pdfUrl);
            return { label, expiry: _up ? 'UPLOADED' : 'NOT UPLOADED', status: _up ? 'UPLOADED' : 'NOT UPLOADED' };
        }
        if (!cd) return { label, expiry: 'NOT UPLOADED', status: 'NOT UPLOADED' };
        if (p.certToFollow === certKey) return { label, expiry: '—', status: 'TO FOLLOW' };
        if (!cd.expiry) return { label, expiry: cd.pdfUrl ? 'No expiry set' : 'NOT UPLOADED', status: cd.pdfUrl ? 'NO EXPIRY SET' : 'NOT UPLOADED' };
        return { label, expiry: _fmtDate(cd.expiry), status: _certStatus(cd.expiry) };
    }
    function _buildRow(region, projName, p, mi) {
        const ci = _certInfo(p);
        return [
            region, projName, p.area || '—', mi + 1,
            (p.name || '').toUpperCase(),
            (p.pos || '—') + (p.oic ? ' (OIC)' : '') + (p.oshp ? ' (OSHP)' : ''),
            p.id || '—',
            p.gen || p.gender || '—',
            p.age || '—',
            p.mail || p.email || '—',
            p.num ? (typeof fmtPhone === 'function' ? fmtPhone(String(p.num)) : String(p.num)) : '—',
            p.addr ? (typeof titleCase === 'function' ? titleCase(String(p.addr)) : String(p.addr)) : '—',
            p.hired ? _fmtDate(p.hired) : '—',
            _fmtLen(p.hired ? calculateYearsOfService(p.hired) : p.len),
            ci.label, ci.expiry, ci.status
        ];
    }

    // ── Ordering ──────────────────────────────────────────────────────────────
    const CORP_POS_ORDER = ['QESH Group Manager','QESH Deputy Manager','ESH Manager for Regulation & Compliance','ESH Manager for Project Implementation','Environmental and Sustainability Head','Corporate Physician','Corporate Nurse','Corporate Dentist','QESH Corp. DC','Corporate Safety Officer','Others'];
    const PROJ_POS_ORDER = ['ESH Superintendent','ESH Head','Safety Officer IV','Safety Officer III','Safety Officer II','Safety Officer I','PCO','Project Physician','Project Nurse','First Aider','Others'];
    const REGION_ORDER   = ['CORPORATE','NCR','SOUTH LUZON','NORTH LUZON','VISAYAS & MINDANAO'];
    const corpRank = pos => { const i = CORP_POS_ORDER.indexOf(pos); return i >= 0 ? i : CORP_POS_ORDER.length; };
    const projRank = pos => { const i = PROJ_POS_ORDER.indexOf(pos); return i >= 0 ? i : PROJ_POS_ORDER.length; };

    const projRegionMap = {};
    (state.masterProjects || state.projects || []).forEach(p => { if (p.name) projRegionMap[p.name] = (p.region||'').toUpperCase(); });

    // ── Group by region → project ─────────────────────────────────────────────
    const regionGroups = {};
    allPersonnel.forEach(p => {
        const proj   = (p.current || p.projectAssignment || p.project || '').trim();
        const isCorp = proj === 'Corporate Office' || (projRegionMap[proj]||'').toUpperCase() === 'CORPORATE';
        const region = isCorp ? 'CORPORATE' : (projRegionMap[proj] || (p.region||p._region||'') || 'OTHER').toUpperCase();
        if (!regionGroups[region]) regionGroups[region] = {};
        if (!regionGroups[region][proj || 'Unassigned']) regionGroups[region][proj || 'Unassigned'] = [];
        regionGroups[region][proj || 'Unassigned'].push(p);
    });

    // Sort within each project group
    Object.entries(regionGroups).forEach(([region, projMap]) => {
        const isCorp = region === 'CORPORATE';
        Object.values(projMap).forEach(arr => arr.sort((a,b) => (isCorp ? corpRank(a.pos) - corpRank(b.pos) : projRank(a.pos) - projRank(b.pos))));
    });

    // ── ExcelJS workbook ──────────────────────────────────────────────────────
    const wb = eshNewWorkbook('ESH Monitoring System');

    // Exact colors from reference file
    const COLOR_HEADER_BG  = '2E7D32'; // medium green — header row
    const COLOR_BANNER_BG  = '1B5E20'; // dark green  — project banner rows
    const COLOR_TOTAL_BG   = 'E8F5E9'; // light green — TOTAL row in summary

    const COL_HEADERS = ['REGION','PROJECT','AREA OF ASSIGNMENT','#','Full Name','Position','EMP ID','Gender','Age','Email Address','Contact No.','Home Address','Date Hired','Length of Service','Certification','Cert Expiry','Status'];
    // Reference column widths (exact match to reference file)
    const COL_WIDTHS  = [18, 35, 25, 5, 30, 25, 12, 10, 8, 30, 16, 40, 15, 18, 15, 15, 16];

    // ── Shared style builders ─────────────────────────────────────────────────
    function applyHeaderStyle(cell) {
        cell.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Calibri' };
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COLOR_HEADER_BG } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border    = {
            top:    { style: 'thin', color: { argb: 'FF' + COLOR_HEADER_BG } },
            bottom: { style: 'thin', color: { argb: 'FF' + COLOR_HEADER_BG } },
            left:   { style: 'thin', color: { argb: 'FF' + COLOR_HEADER_BG } },
            right:  { style: 'thin', color: { argb: 'FF' + COLOR_HEADER_BG } }
        };
    }

    function applyBannerStyle(cell) {
        cell.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10, name: 'Calibri' };
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COLOR_BANNER_BG } };
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
    }

    function applyDataStyle(cell, colIdx) {
        cell.font      = { size: 11, name: 'Calibri' };
        cell.alignment = { vertical: 'middle', wrapText: false };
        if (colIdx === 4) cell.alignment.horizontal = 'center'; // # column centered
    }

    function applyTotalStyle(cell) {
        cell.font = { bold: true, size: 11, name: 'Calibri' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COLOR_TOTAL_BG } };
        cell.alignment = { vertical: 'middle' };
    }

    // ── Auto-fit column width based on actual data ────────────────────────────
    function autoFitCols(ws, dataRows, minWidths) {
        const numCols = minWidths.length;
        const maxLens = [...minWidths]; // start with minimum widths
        // Check header row
        COL_HEADERS.forEach((h, i) => {
            if (h.length + 2 > maxLens[i]) maxLens[i] = h.length + 2;
        });
        // Check all data rows
        dataRows.forEach(row => {
            row.forEach((val, i) => {
                if (i >= numCols) return;
                const len = val !== null && val !== undefined ? String(val).length + 2 : 0;
                if (len > maxLens[i]) maxLens[i] = len;
            });
        });
        ws.columns = maxLens.map(w => ({ width: Math.min(w, 50) })); // cap at 50
    }

    // ── Build Summary sheet ───────────────────────────────────────────────────
    const summaryWs = wb.addWorksheet('Summary');
    summaryWs.addRow(['REGION', 'Total Personnel', '# of Projects']);
    ['A1','B1','C1'].forEach(addr => {
        const cell = summaryWs.getCell(addr);
        cell.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12, name: 'Calibri' };
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COLOR_BANNER_BG } };
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
    });
    summaryWs.getRow(1).height = 20;

    const sortedRegions = REGION_ORDER.filter(r => regionGroups[r]);
    const otherRegions  = Object.keys(regionGroups).filter(r => !REGION_ORDER.includes(r));
    const allRegions    = [...sortedRegions, ...otherRegions];
    let totalP = 0, totalProj = 0;

    allRegions.forEach(region => {
        const projMap  = regionGroups[region];
        const pCount   = Object.values(projMap).reduce((a,arr)=>a+arr.length,0);
        const prCount  = Object.keys(projMap).length;
        summaryWs.addRow([region, pCount, prCount]);
        totalP += pCount; totalProj += prCount;
    });

    const totalRowIdx = allRegions.length + 2;
    summaryWs.addRow(['TOTAL', totalP, totalProj]);
    ['A','B','C'].forEach(col => applyTotalStyle(summaryWs.getCell(`${col}${totalRowIdx}`)));

    // Auto-fit summary columns
    summaryWs.getColumn('A').width = 25;
    summaryWs.getColumn('B').width = 18;
    summaryWs.getColumn('C').width = 15;

    // ── Build per-region sheets ───────────────────────────────────────────────
    allRegions.forEach(region => {
        const projMap  = regionGroups[region];
        const isCorp   = region === 'CORPORATE';
        const sheetName = region.replace(/[*?:/\\[\]]/g,'').substring(0,31);
        const ws = wb.addWorksheet(sheetName);

        // Collect all data rows for auto-fit calculation
        const allDataRows = [];

        // Sort project names
        let projNames = _pSortProjectNames(projMap);

        // Pre-collect all data for auto-fit
        projNames.forEach(projName => {
            const members = projMap[projName] || [];
            members.forEach((p, mi) => {
                allDataRows.push(_buildRow(region, projName, p, mi));
            });
        });

        // Auto-fit columns based on real data
        autoFitCols(ws, allDataRows, COL_WIDTHS);

        // ── Header row ────────────────────────────────────────────────────────
        const headerRow = ws.addRow(COL_HEADERS);
        headerRow.height = 22;
        headerRow.eachCell(cell => applyHeaderStyle(cell));

        // ── Project groups ────────────────────────────────────────────────────
        projNames.forEach((projName, projIdx) => {
            const members = projMap[projName] || [];
            if (!members.length) return;

            // Project banner row — merged across all 17 columns
            const bannerRow = ws.addRow([`📌 ${projName}`, ...Array(16).fill('')]);
            bannerRow.height = 18;
            ws.mergeCells(bannerRow.number, 1, bannerRow.number, 17);
            applyBannerStyle(bannerRow.getCell(1));

            // Personnel data rows
            members.forEach((p, mi) => {
                const dataRow = ws.addRow(_buildRow(region, projName, p, mi));
                dataRow.height = 16;
                dataRow.eachCell((cell, colNumber) => applyDataStyle(cell, colNumber));
                if (p.oic || p.oshp) {
                    const _rt = [{ text: (p.pos || '—') + ' ', font: { size: 11, name: 'Calibri' } }];
                    if (p.oic) _rt.push({ text: 'OIC ', font: { bold: true, size: 11, name: 'Calibri', color: { argb: 'FFE65100' } } });
                    if (p.oshp) _rt.push({ text: 'OSHP', font: { bold: true, size: 11, name: 'Calibri', color: { argb: 'FF0D47A1' } } });
                    dataRow.getCell(6).value = { richText: _rt };
                    dataRow.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: p.oic ? 'FFFFF3E0' : 'FFE3F2FD' } };
                }
            });

            // ── Spacer row after each project (except last) ───────────────────
            if (projIdx < projNames.length - 1) {
                const spacer = ws.addRow(Array(17).fill(''));
                spacer.height = 8;
            }
        });

        // Freeze top header row
        ws.views = [{ state: 'frozen', ySplit: 1, activeCell: 'A2' }];
    });

    // ── Download ──────────────────────────────────────────────────────────────
    try {
        const now    = new Date();
        const stamp  = now.toISOString().slice(0,10);
        const fname  = `ESH_Personnel_${now.getFullYear()}_${stamp}.xlsx`;
        await eshDownloadXlsx(wb, fname);
        showToast(`Exported: ${fname}`, 'success');
    } catch(err) {
        console.error('Excel export error:', err);
        showToast('Export failed. Check console for details.', 'error');
    }
}

// ── EMB Reportorial — Export to Excel (ExcelJS) ───────────────────────────────
async function exportEmbExcel() {
    const _noRoles = ['superintendent', 'pco', 'corp_nurse'];
    if (_noRoles.includes(state.userRole)) {
        showToast('You do not have permission to export EMB Reportorial data.', 'warning');
        return;
    }
    if (typeof ExcelJS === 'undefined') {
        showToast('Excel library not loaded. Refresh and try again.', 'error');
        return;
    }

    const year = state.selectedYear || new Date().getFullYear();

    // Collect projects — EXCLUDE CORPORATE
    const allProjs = (state.filteredProjects || state.projects || []).filter(p => {
        const r = (p.region || '').toUpperCase();
        return r !== 'CORPORATE';
    });

    if (!allProjs.length) {
        showToast('No project data to export.', 'info');
        return;
    }

    showToast('Generating EMB Excel file...', 'info');

    // ── Date formatter ────────────────────────────────────────────────────────
    function _fmtDate(d) {
        if (!d) return '';
        try {
            const dt = new Date(d);
            if (isNaN(dt)) return d;
            return dt.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: '2-digit' });
        } catch(e) { return d; }
    }

    // ── Region order ──────────────────────────────────────────────────────────
    const REGION_ORDER = ['NCR', 'SOUTH LUZON', 'NORTH LUZON', 'VISAYAS & MINDANAO', 'PLANT OPERATIONS'];
    const SMR_PERIODS  = [
        { idx: 1, label: 'Q1 (Jan–Mar)', due: 'Due: Apr 30' },
        { idx: 2, label: 'Q2 (Apr–Jun)', due: 'Due: Jul 30' },
        { idx: 3, label: 'Q3 (Jul–Sep)', due: 'Due: Oct 30' },
        { idx: 4, label: 'Q4 (Oct–Dec)', due: 'Due: Jan 30' },
    ];
    const CMR_PERIODS  = [
        { idx: 1, label: 'H1 (Jan–Jun)', due: 'Due: Jul 30' },
        { idx: 2, label: 'H2 (Jul–Dec)', due: 'Due: Jan 30' },
    ];

    // ── Group projects by region ──────────────────────────────────────────────
    const regionMap = {};
    allProjs.forEach(p => {
        const r = (p.region || 'OTHER').toUpperCase();
        if (!regionMap[r]) regionMap[r] = [];
        regionMap[r].push(p);
    });

    // ── ExcelJS workbook ──────────────────────────────────────────────────────
    const wb = eshNewWorkbook('ESH Monitoring System');

    // ── Colors ────────────────────────────────────────────────────────────────
    const C_TITLE_BG  = '1B5E20';
    const C_HEAD_BG   = '2E7D32';
    const C_REGION_BG = 'C8E6C9';
    const C_PROJ_BG   = 'F1F8E9';
    const C_WHITE     = 'FFFFFFFF';
    const C_FILLED_BG = 'C8E6C9';
    const C_EMPTY_BG  = 'FFCDD2';
    const C_COC_BG    = 'A5D6A7';

    function _applyTitle(cell, text) {
        cell.value = text;
        cell.font  = { bold: true, color: { argb: 'FF' + C_WHITE }, size: 13, name: 'Calibri' };
        cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_TITLE_BG } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { bottom: { style: 'medium', color: { argb: 'FFA5D6A7' } } };
    }

    function _applyRegionHeader(cell, text) {
        cell.value = text;
        cell.font  = { bold: true, color: { argb: 'FF1B5E20' }, size: 11, name: 'Calibri' };
        cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_REGION_BG } };
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
        cell.border = {
            top:    { style: 'medium', color: { argb: 'FF2E7D32' } },
            bottom: { style: 'medium', color: { argb: 'FF2E7D32' } },
        };
    }

    function _applyColHeader(cell, text, bgHex) {
        cell.value = text;
        cell.font  = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10, name: 'Calibri' };
        cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + (bgHex || C_HEAD_BG) } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = {
            top:    { style: 'thin', color: { argb: 'FFA5D6A7' } },
            bottom: { style: 'thin', color: { argb: 'FFA5D6A7' } },
            left:   { style: 'thin', color: { argb: 'FFA5D6A7' } },
            right:  { style: 'thin', color: { argb: 'FFA5D6A7' } },
        };
    }

    function _applyData(cell, value, filled, isCoc) {
        cell.value = value !== undefined ? value : '';
        const bgHex = isCoc ? C_COC_BG : (filled ? C_FILLED_BG : (value ? C_FILLED_BG : C_EMPTY_BG));
        cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + bgHex } };
        cell.font  = { size: 9.5, name: 'Calibri', bold: isCoc, color: { argb: isCoc ? 'FF2E7D32' : 'FF263238' } };
        cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        cell.border = {
            top:    { style: 'thin', color: { argb: 'FFB0BEC5' } },
            bottom: { style: 'thin', color: { argb: 'FFB0BEC5' } },
            left:   { style: 'thin', color: { argb: 'FFB0BEC5' } },
            right:  { style: 'thin', color: { argb: 'FFB0BEC5' } },
        };
    }

    function _applyProjBanner(cell, text) {
        cell.value = text;
        cell.font  = { bold: true, size: 10, name: 'Calibri', color: { argb: 'FF1B5E20' } };
        cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_PROJ_BG } };
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
        cell.border = {
            top:    { style: 'thin', color: { argb: 'FF81C784' } },
            bottom: { style: 'thin', color: { argb: 'FF81C784' } },
        };
    }

    // ── Build a single worksheet ──────────────────────────────────────────────
    const ws = wb.addWorksheet('EMB Reportorial', {
        pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
        views: [{ state: 'frozen', xSplit: 0, ySplit: 3 }],
    });

    // Column definitions
    // A: REGION | B: PROJECT | C: TYPE | D: PERIOD | E: ENTRY # | F: FACILITY | G: SUBMISSION DATE | H: REFERENCE NO. | I: CARE OF CLIENT | J: N/A
    const COLS = [
        { key: 'region',  header: 'REGION',          width: 22 },
        { key: 'project', header: 'PROJECT',          width: 35 },
        { key: 'type',    header: 'TYPE',             width: 12 },
        { key: 'period',  header: 'PERIOD',           width: 18 },
        { key: 'entry',   header: 'ENTRY #',          width: 9  },
        { key: 'fac',     header: 'FACILITY',         width: 32 },
        { key: 'sd',      header: 'SUBMISSION DATE',  width: 20 },
        { key: 'rn',      header: 'REFERENCE NO.',    width: 22 },
        { key: 'coc',     header: 'CARE OF CLIENT',   width: 16 },
        { key: 'na',      header: 'N/A',              width: 10 },
    ];
    COLS.forEach((c, i) => { ws.getColumn(i + 1).width = c.width; });

    // ── Row 1: Title ──────────────────────────────────────────────────────────
    ws.mergeCells(1, 1, 1, COLS.length);
    const titleCell = ws.getCell(1, 1);
    _applyTitle(titleCell, `SCIC ESH — EMB REPORTORIAL (SMR & CMR) — ${year}`);
    ws.getRow(1).height = 28;

    // ── Row 2: Sub-title / generated ─────────────────────────────────────────
    ws.mergeCells(2, 1, 2, COLS.length);
    const subCell = ws.getCell(2, 1);
    subCell.value = `Generated: ${new Date().toLocaleString('en-PH')}   |   SMR = Quarterly Self-Monitoring Report   |   CMR = Compliance Monitoring Report`;
    subCell.font  = { italic: true, size: 9, color: { argb: 'FF555555' }, name: 'Calibri' };
    subCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F8E9' } };
    subCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(2).height = 16;

    // ── Row 3: Column headers ─────────────────────────────────────────────────
    COLS.forEach((c, i) => { _applyColHeader(ws.getCell(3, i + 1), c.header); });
    ws.getRow(3).height = 22;

    let curRow = 4;

    // ── Iterate regions ───────────────────────────────────────────────────────
    const orderedRegions = [
        ...REGION_ORDER.filter(r => regionMap[r]),
        ...Object.keys(regionMap).filter(r => !REGION_ORDER.includes(r)),
    ];

    orderedRegions.forEach(region => {
        const projs = regionMap[region] || [];
        if (!projs.length) return;

        // Region banner
        ws.mergeCells(curRow, 1, curRow, COLS.length);
        _applyRegionHeader(ws.getCell(curRow, 1), `📍  ${region}  (${projs.length} project${projs.length !== 1 ? 's' : ''})`);
        ws.getRow(curRow).height = 20;
        curRow++;

        projs.forEach(p => {
            const pv = p.vals || {};

            // Project banner row
            ws.mergeCells(curRow, 1, curRow, COLS.length);
            _applyProjBanner(ws.getCell(curRow, 1), `▸  ${p.name}`);
            ws.getRow(curRow).height = 18;
            curRow++;

            // SMR key helpers
            const smrFacKey = 'emb_SMR (Quarterly) - Facility';
            const smrSdKey  = 'emb_SMR (Quarterly) - Submission Date';
            const smrRnKey  = 'emb_SMR (Quarterly) - Reference No.';
            const smrCocKey = 'emb_SMR (Quarterly) - Care of Client';
            const smrNaKey  = 'emb_SMR (Quarterly) - N/A';
            const smrExtKey = 'emb_extra_smr';

            // CMR key helpers
            const cmrFacKey = 'emb_CMR (Semi-Annual) - Facility';
            const cmrSdKey  = 'emb_CMR (Semi-Annual) - Submission Date';
            const cmrRnKey  = 'emb_CMR (Semi-Annual) - Reference No.';
            const cmrCocKey = 'emb_CMR (Semi-Annual) - Care of Client';
            const cmrNaKey  = 'emb_CMR (Semi-Annual) - N/A';
            const cmrExtKey = 'emb_extra_cmr';

            function _val(key, idx) {
                return (pv[key] && pv[key][idx] !== undefined && pv[key][idx] !== null) ? pv[key][idx] : '';
            }
            function _boolVal(key, idx) {
                const v = pv[key] && pv[key][idx];
                return v === true || v === 'true' || v === '1' || v === 1;
            }

            function _writeEntryRow(type, periodLabel, entryNum, fac, sd, rn, coc, na) {
                const isCoc = coc === true || coc === 'true' || coc === '1' || coc === 1 || coc === true;
                const isNa  = na === true || na === 'true' || na === '1' || na === 1;
                if (isCoc || isNa) { fac = ''; sd = ''; rn = ''; } // exempt (Care of Client / N/A) → no values
                const typeBg = type === 'SMR' ? '388E3C' : '1565C0';
                const row = ws.getRow(curRow);

                _applyData(ws.getCell(curRow, 1), region, true, false);
                _applyData(ws.getCell(curRow, 2), p.name, true, false);

                // TYPE cell — color-coded
                const typeCell = ws.getCell(curRow, 3);
                typeCell.value = type;
                typeCell.font  = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9.5, name: 'Calibri' };
                typeCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + typeBg } };
                typeCell.alignment = { horizontal: 'center', vertical: 'middle' };
                typeCell.border = {
                    top:   { style: 'thin', color: { argb: 'FFB0BEC5' } },
                    bottom:{ style: 'thin', color: { argb: 'FFB0BEC5' } },
                    left:  { style: 'thin', color: { argb: 'FFB0BEC5' } },
                    right: { style: 'thin', color: { argb: 'FFB0BEC5' } },
                };

                _applyData(ws.getCell(curRow, 4), periodLabel, true, false);
                _applyData(ws.getCell(curRow, 5), entryNum, entryNum === 1, false);
                _applyData(ws.getCell(curRow, 6), fac || '', !!fac, false);
                _applyData(ws.getCell(curRow, 7), sd ? _fmtDate(sd) : '', !!sd, false);
                _applyData(ws.getCell(curRow, 8), rn || '', !!rn, false);
                if (isCoc || isNa) {
                    [6, 7, 8].forEach(function(ci) {
                        ws.getCell(curRow, ci).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
                    });
                }

                // Care of Client cell
                const cocCell = ws.getCell(curRow, 9);
                if (isCoc) {
                    _applyData(cocCell, '✓ Exempted', true, true);
                } else {
                    _applyData(cocCell, '—', false, false);
                    cocCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
                }

                // N/A cell
                const naCell = ws.getCell(curRow, 10);
                if (isNa) {
                    _applyData(naCell, '✓ N/A', true, true);
                } else {
                    _applyData(naCell, '—', false, false);
                    naCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
                }

                row.height = 17;
                curRow++;
            }

            // ── SMR rows (Q1–Q4) ─────────────────────────────────────────────
            SMR_PERIODS.forEach(period => {
                const fac  = _val(smrFacKey, period.idx);
                const sd   = _val(smrSdKey,  period.idx);
                const rn   = _val(smrRnKey,  period.idx);
                const coc  = _boolVal(smrCocKey, period.idx);
                const na   = _boolVal(smrNaKey,  period.idx);

                _writeEntryRow('SMR', period.label, 1, fac, sd, rn, coc, na);

                // Extra SMR entries for this period
                const extras = Array.isArray(pv[smrExtKey]) ? pv[smrExtKey] : [];
                extras.forEach((entry, eIdx) => {
                    const eFac = (entry.fac && entry.fac[period.idx]) ? entry.fac[period.idx] : '';
                    const eSd  = (entry.sd  && entry.sd[period.idx])  ? entry.sd[period.idx]  : '';
                    const eRn  = (entry.rn  && entry.rn[period.idx])  ? entry.rn[period.idx]  : '';
                    _writeEntryRow('SMR', period.label, eIdx + 2, eFac, eSd, eRn, false, false);
                });
            });

            // ── CMR rows (H1–H2) ─────────────────────────────────────────────
            CMR_PERIODS.forEach(period => {
                const fac  = _val(cmrFacKey, period.idx);
                const sd   = _val(cmrSdKey,  period.idx);
                const rn   = _val(cmrRnKey,  period.idx);
                const coc  = _boolVal(cmrCocKey, period.idx);
                const na   = _boolVal(cmrNaKey,  period.idx);

                _writeEntryRow('CMR', period.label, 1, fac, sd, rn, coc, na);

                // Extra CMR entries for this period
                const extras = Array.isArray(pv[cmrExtKey]) ? pv[cmrExtKey] : [];
                extras.forEach((entry, eIdx) => {
                    const eFac = (entry.fac && entry.fac[period.idx]) ? entry.fac[period.idx] : '';
                    const eSd  = (entry.sd  && entry.sd[period.idx])  ? entry.sd[period.idx]  : '';
                    const eRn  = (entry.rn  && entry.rn[period.idx])  ? entry.rn[period.idx]  : '';
                    _writeEntryRow('CMR', period.label, eIdx + 2, eFac, eSd, eRn, false, false);
                });
            });

            // Spacer row between projects
            ws.getRow(curRow).height = 6;
            curRow++;
        });

        // Spacer row between regions
        ws.getRow(curRow).height = 8;
        curRow++;
    });

    // ── Save ─────────────────────────────────────────────────────────────────
    try {
        await eshDownloadXlsx(wb, `SCIC_ESH_EMB_REPORTORIAL_${year}_${new Date().toISOString().slice(0,10)}.xlsx`);
        showToast('EMB Reportorial Excel exported successfully!', 'success');
    } catch(err) {
        console.error('EMB Excel export error:', err);
        showToast('Export failed. Check console for details.', 'error');
    }
}

// ── KPM — Export to Excel (ExcelJS) ───────────────────────────────────────────
// ── DOLE Reportorial — Export to Excel (KPM-style layout) ────────────────────
async function exportDoleExcel() {
    const _noRoles = ['superintendent', 'pco', 'corp_nurse'];
    if (_noRoles.includes(state.userRole)) {
        showToast('You do not have permission to export DOLE Reportorial data.', 'warning');
        return;
    }
    if (typeof ExcelJS === 'undefined') {
        showToast('Excel library not loaded. Refresh and try again.', 'error');
        return;
    }

    const year     = state.selectedYear || new Date().getFullYear();
    // Current month is still ongoing -> exclude. Past year: all 12 | current year: up to previous month | future year: none
    const lastDoneIdx = year < new Date().getFullYear() ? 11 : (year === new Date().getFullYear() ? new Date().getMonth() - 1 : -1);
    const MO_LONG  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const MO_SHORT = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

    // ── DOLE row definitions ───────────────────────────────────────────────────
    // Monthly rows: WAIR, RSO, MOM (indexed 1–12)
    // Annual rows: AEDR (due Jan 30), AMR (due Mar 31) — stored at index [1]
    const DOLE_MONTHLY_ROWS = [
        { id: 'WAIR', label: 'WAIR', desc: 'Work Accident / Illness Report',        color: '1565C0', fill: 'E3F2FD' },
        { id: 'RSO',  label: 'RSO',  desc: 'Report on Safety and Health Organization',              color: '1B5E20', fill: 'E8F5E9' },
        { id: 'MOM',  label: 'MOM',  desc: 'Minutes of Meeting (ESH Committee)',    color: '4A148C', fill: 'EDE7F6' },
    ];
    const DOLE_ANNUAL_ROWS = [
        { id: 'AEDR', label: 'AEDR', desc: 'Annual Exposure Data Report (due Jan 30)', color: 'E65100', fill: 'FBE9E7' },
        { id: 'AMR',  label: 'AMR',  desc: 'Annual Medical Report (due Mar 31)',        color: 'B71C1C', fill: 'FFEBEE' },
    ];

    // ── Collect projects — exclude CORPORATE, PLANT OPERATIONS, finished ──────
    // Work-stoppage projects are INCLUDED but their blacklisted months show N/A
    const allProjs = (state.filteredProjects || state.projects || []).filter(p => {
        const r = (p.region || '').toUpperCase();
        if (r === 'CORPORATE') return false;
        if (r === 'PLANT OPERATIONS') return false;
        if (p.dateFinished) return false;
        return true;
    });

    if (!allProjs.length) {
        showToast('No project data to export.', 'info');
        return;
    }

    showToast('Generating DOLE Reportorial Excel file...', 'info');

    // ── Value helpers ─────────────────────────────────────────────────────────
    function getDoleMonthVal(proj, rowId, moNum) {
        if (isMonthBlacklistedForProject(proj, moNum, year)) return null;
        const v = proj.vals && proj.vals['dole_' + rowId] ? proj.vals['dole_' + rowId][moNum] : '';
        return (v !== undefined && v !== null && String(v).trim() !== '') ? String(v) : null;
    }
    function getDoleAnnualVal(proj, rowId) {
        const v = proj.vals && proj.vals['dole_' + rowId] ? proj.vals['dole_' + rowId][1] : '';
        return (v !== undefined && v !== null && String(v).trim() !== '') ? String(v) : null;
    }

    // ── Region/project ordering (same as KPM) ─────────────────────────────────
    const DOLE_REGION_ORDER = ['NCR', 'SOUTH LUZON', 'NORTH LUZON', 'VISAYAS & MINDANAO'];
    const sortedRegions  = DOLE_REGION_ORDER.filter(r => allProjs.some(p => (p.region || '').toUpperCase() === r));
    const otherRegions   = [...new Set(allProjs.map(p => (p.region || '').toUpperCase()).filter(r => !DOLE_REGION_ORDER.includes(r)))];
    const allRegionOrder = [...sortedRegions, ...otherRegions];

    const projsByRegion = {};
    allRegionOrder.forEach(r => {
        projsByRegion[r] = allProjs.filter(p => (p.region || '').toUpperCase() === r);
    });
    const orderedProjs = allRegionOrder.flatMap(r => projsByRegion[r]);

    // ── Column map: [LEFT_COLS fixed] + [proj cols + AVG per region] + overall ──
    // LEFT_COLS = 3: REPORT | DESCRIPTION | TYPE
    const LEFT_COLS = 3;
    const colMap = [];
    allRegionOrder.forEach(region => {
        projsByRegion[region].forEach(proj => colMap.push({ type: 'proj', proj, region }));
        colMap.push({ type: 'avg', region });
    });
    colMap.push({ type: 'overall' });
    const totalCols = LEFT_COLS + colMap.length;

    // ── Submission status helpers ─────────────────────────────────────────────
    // For monthly: "submitted" = value is present
    // For annual: "submitted" = value is present
    function isMonthlySubmitted(proj, rowId, moNum) {
        return getDoleMonthVal(proj, rowId, moNum) !== null;
    }
    function isAnnualSubmitted(proj, rowId) {
        return getDoleAnnualVal(proj, rowId) !== null;
    }
    // Compliance score per project per month (all 3 monthly rows submitted = 100%)
    // Returns null for months blacklisted due to work-stoppage (excluded from averages)
    function projMonthScore(proj, moNum) {
        if (isMonthBlacklistedForProject(proj, moNum, year)) return null;
        const submitted = DOLE_MONTHLY_ROWS.filter(r => isMonthlySubmitted(proj, r.id, moNum)).length;
        return DOLE_MONTHLY_ROWS.length > 0 ? (submitted / DOLE_MONTHLY_ROWS.length) * 100 : null;
    }
    // Annual compliance score per project (both annual rows submitted = 100%)
    function projAnnualScore(proj) {
        // No covered period yet / stoppage-year exempt → excluded from averages (null), like blacklisted months
        if (!isDoleAnnualRequired(proj, year) || isDoleAnnualStoppageExempt(proj, year)) return null;
        const _applicable = DOLE_ANNUAL_ROWS.filter(r => !isDoleAnnualNA(proj, r.id));
        const submitted = _applicable.filter(r => isAnnualSubmitted(proj, r.id)).length;
        return _applicable.length > 0 ? (submitted / _applicable.length) * 100 : null;
    }
    // Overall score across all months + annual
    function projOverallScore(proj) {
        const monthScores = MO_LONG.map((_, mi) => mi <= lastDoneIdx ? projMonthScore(proj, mi + 1) : null).filter(v => v !== null);
        const annScore    = projAnnualScore(proj);
        const all = annScore !== null ? [...monthScores, annScore] : monthScores;
        return all.length ? all.reduce((a, b) => a + b, 0) / all.length : null;
    }

    // ── Color logic (same thresholds as KPM) ─────────────────────────────────
    function scoreColor(v) {
        if (v === null) return null;
        if (v >= 90) return { bg: 'C8E6C9', fg: '1B5E20' };
        if (v >= 75) return { bg: 'FFF9C4', fg: '82500D' };
        return { bg: 'FFCDD2', fg: 'B71C1C' };
    }

    // ── ExcelJS workbook ──────────────────────────────────────────────────────
    const wb = eshNewWorkbook('ESH Monitoring System');

    const C_DARK_GREEN = '1B5E20';
    const C_MED_GREEN  = '2E7D32';
    const C_GRAY_HDR   = 'F5F5F5';
    const C_COL_HDR_BG = '37474F';
    const C_COL_HDR_FG = 'FFFFFF';
    const C_OVERALL_BG = '1A237E';

    // ── Style helpers (mirror KPM exactly) ───────────────────────────────────
    function applyHeaderStyle(cell, bgArgb, fgArgb) {
        cell.font      = { bold: true, color: { argb: 'FF' + (fgArgb || C_COL_HDR_FG) }, size: 9, name: 'Calibri' };
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + (bgArgb || C_COL_HDR_BG) } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border    = {
            top:    { style: 'thin', color: { argb: 'FFB0BEC5' } },
            bottom: { style: 'thin', color: { argb: 'FFB0BEC5' } },
            left:   { style: 'thin', color: { argb: 'FFB0BEC5' } },
            right:  { style: 'thin', color: { argb: 'FFB0BEC5' } }
        };
    }
    function applyStatusCell(cell, val, rowDef, isAnnual) {
        const thinBorder = {
            top:    { style: 'thin', color: { argb: 'FFB0BEC5' } },
            bottom: { style: 'thin', color: { argb: 'FFB0BEC5' } },
            left:   { style: 'thin', color: { argb: 'FFB0BEC5' } },
            right:  { style: 'thin', color: { argb: 'FFB0BEC5' } }
        };
        cell.border = thinBorder;
        if (val !== null) {
            // Submitted — show date/value with green tint
            cell.value     = val;
            cell.font      = { bold: true, size: 8, name: 'Calibri', color: { argb: 'FF' + (rowDef ? rowDef.color : '1B5E20') } };
            cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + (rowDef ? rowDef.fill : 'E8F5E9') } };
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false };
        } else {
            // Not submitted — show blank with light red
            cell.value     = '';
            cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF8F8' } };
            cell.font      = { size: 8, name: 'Calibri', color: { argb: 'FFBDBDBD' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
    }
    function applyAvgCell(cell, score) {
        cell.border = {
            top:    { style: 'medium', color: { argb: 'FF' + C_MED_GREEN } },
            bottom: { style: 'medium', color: { argb: 'FF' + C_MED_GREEN } },
            left:   { style: 'medium', color: { argb: 'FF' + C_MED_GREEN } },
            right:  { style: 'medium', color: { argb: 'FF' + C_MED_GREEN } }
        };
        if (score === null) {
            cell.value     = '—';
            cell.font      = { size: 9, name: 'Calibri', color: { argb: 'FF9E9E9E' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            return;
        }
        const pct = Math.round(score) + '%';
        cell.value     = pct;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        const c = scoreColor(score);
        if (c) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + c.bg } };
            cell.font = { bold: true, size: 10, name: 'Calibri', color: { argb: 'FF' + c.fg } };
        }
    }
    function leftCellStyle(cell) {
        cell.font      = { size: 8.5, name: 'Calibri' };
        cell.alignment = { vertical: 'middle', wrapText: true };
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_GRAY_HDR } };
        cell.border    = {
            top:    { style: 'thin',   color: { argb: 'FFB0BEC5' } },
            bottom: { style: 'thin',   color: { argb: 'FFB0BEC5' } },
            left:   { style: 'thin',   color: { argb: 'FFB0BEC5' } },
            right:  { style: 'medium', color: { argb: 'FF' + C_MED_GREEN } }
        };
    }

    // ── Notes row helper (mirrors KPM) ────────────────────────────────────────
    function addNotesRow(ws) {
        const noteRow = ws.addRow([
            'NOTES: Monthly reports (WAIR, RSO, MOM) are required per project per month. Annual reports (AEDR, AMR) are required once per year. Enter the submission date in each field.'
        ]);
        ws.mergeCells(noteRow.number, 1, noteRow.number, totalCols);
        const nc = noteRow.getCell(1);
        nc.font      = { size: 8, name: 'Calibri', color: { argb: 'FF5D4037' }, italic: true };
        nc.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF9C4' } };
        nc.alignment = { vertical: 'middle', wrapText: true };
        noteRow.height = 22;
        return noteRow;
    }

    // ── Build region header + col header rows ────────────────────────────────
    function buildRegionAndColHeaders(ws) {
        // Spacer row 2
        ws.addRow([]); ws.getRow(ws.rowCount).height = 6;

        // Region header row
        const regHdrRow = ws.addRow(Array(totalCols).fill(''));
        regHdrRow.height = 20;
        let colOffset = LEFT_COLS + 1;
        allRegionOrder.forEach(region => {
            const projCount = projsByRegion[region].length;
            const spanStart = colOffset;
            const spanEnd   = colOffset + projCount; // +1 for AVG col
            const c = regHdrRow.getCell(spanStart);
            c.value     = region;
            c.font      = { bold: true, color: { argb: 'FF' + C_COL_HDR_FG }, size: 10, name: 'Calibri' };
            c.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_DARK_GREEN } };
            c.alignment = { horizontal: 'center', vertical: 'middle' };
            if (spanEnd > spanStart) ws.mergeCells(regHdrRow.number, spanStart, regHdrRow.number, spanEnd);
            colOffset += projCount + 1;
        });
        const overallRegCell = regHdrRow.getCell(colOffset);
        overallRegCell.value     = 'OVERALL';
        overallRegCell.font      = { bold: true, color: { argb: 'FF' + C_COL_HDR_FG }, size: 10, name: 'Calibri' };
        overallRegCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_OVERALL_BG } };
        overallRegCell.alignment = { horizontal: 'center', vertical: 'middle' };
        for (let ci = 1; ci <= LEFT_COLS; ci++) {
            regHdrRow.getCell(ci).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_DARK_GREEN } };
        }

        // Column header row
        const hdrData = ['Report', 'Description', 'Type'];
        colMap.forEach(cm => {
            hdrData.push(cm.type === 'proj' ? (cm.proj.name || '') : cm.type === 'overall' ? 'OVERALL\nAVG' : 'REGION\nAVG');
        });
        const hdrRow = ws.addRow(hdrData);
        hdrRow.height = 45;
        for (let ci = 1; ci <= LEFT_COLS; ci++) applyHeaderStyle(hdrRow.getCell(ci), C_COL_HDR_BG, C_COL_HDR_FG);
        colMap.forEach((cm, i) => {
            const ci   = LEFT_COLS + 1 + i;
            const cell = hdrRow.getCell(ci);
            if (cm.type === 'avg') {
                applyHeaderStyle(cell, C_MED_GREEN, 'FFFFFF');
                cell.value = 'REGION\nAVG';
            } else if (cm.type === 'overall') {
                applyHeaderStyle(cell, C_OVERALL_BG, 'FFFFFF');
                cell.value = 'OVERALL\nAVG';
            } else {
                applyHeaderStyle(cell, C_COL_HDR_BG, C_COL_HDR_FG);
            }
        });

        return ws.rowCount; // returns last row number (col header row)
    }

    // ── Build data rows (monthly or annual) ───────────────────────────────────
    function buildDataRows(ws, rowDefs, getValFn, typeLabel, moNum) {
        rowDefs.forEach(rowDef => {
            const rowArr = [rowDef.label, rowDef.desc, typeLabel];
            colMap.forEach(cm => {
                if (cm.type === 'proj') {
                    // If month is blacklisted for this project, push N/A marker
                    if ((moNum && isMonthBlacklistedForProject(cm.proj, moNum, year)) || (typeLabel === 'ANNUAL' && isDoleAnnualNA(cm.proj, rowDef.id))) {
                        rowArr.push('N/A');
                    } else {
                        rowArr.push(getValFn(cm.proj, rowDef.id) || '');
                    }
                } else if (cm.type === 'overall') {
                    const vals = orderedProjs
                        .filter(p => !(moNum && isMonthBlacklistedForProject(p, moNum, year)) && !(typeLabel === 'ANNUAL' && isDoleAnnualNA(p, rowDef.id)))
                        .map(p => getValFn(p, rowDef.id) !== null ? 1 : 0);
                    const pct  = vals.length ? (vals.reduce((a,b)=>a+b,0) / vals.length * 100) : null;
                    rowArr.push(pct !== null ? Math.round(pct) + '%' : '—');
                } else {
                    const rp   = projsByRegion[cm.region]
                        .filter(p => !(moNum && isMonthBlacklistedForProject(p, moNum, year)) && !(typeLabel === 'ANNUAL' && isDoleAnnualNA(p, rowDef.id)));
                    const vals = rp.map(p => getValFn(p, rowDef.id) !== null ? 1 : 0);
                    const pct  = vals.length ? (vals.reduce((a,b)=>a+b,0) / vals.length * 100) : null;
                    rowArr.push(pct !== null ? Math.round(pct) + '%' : '—');
                }
            });
            const dataRow = ws.addRow(rowArr);
            dataRow.height = 18;

            // Style left cells
            leftCellStyle(dataRow.getCell(1));
            dataRow.getCell(1).font = { bold: true, size: 8.5, name: 'Calibri', color: { argb: 'FF' + rowDef.color } };
            leftCellStyle(dataRow.getCell(2));
            dataRow.getCell(2).font = { size: 8, name: 'Calibri', italic: true };
            // Type cell
            const typeCell = dataRow.getCell(3);
            typeCell.font      = { bold: true, size: 7.5, name: 'Calibri', color: { argb: 'FFFFFFFF' } };
            typeCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + (typeLabel === 'ANNUAL' ? 'B71C1C' : '37474F') } };
            typeCell.alignment = { horizontal: 'center', vertical: 'middle' };
            typeCell.border    = {
                top:    { style: 'thin',   color: { argb: 'FFB0BEC5' } },
                bottom: { style: 'thin',   color: { argb: 'FFB0BEC5' } },
                left:   { style: 'thin',   color: { argb: 'FFB0BEC5' } },
                right:  { style: 'medium', color: { argb: 'FF' + C_MED_GREEN } }
            };

            // Value cells
            colMap.forEach((cm, i) => {
                const ci   = LEFT_COLS + 1 + i;
                const cell = dataRow.getCell(ci);
                if (cm.type === 'proj') {
                    // Work-stoppage N/A styling
                    if ((moNum && isMonthBlacklistedForProject(cm.proj, moNum, year)) || (typeLabel === 'ANNUAL' && isDoleAnnualNA(cm.proj, rowDef.id))) {
                        cell.value     = 'N/A';
                        cell.font      = { size: 8, name: 'Calibri', color: { argb: 'FF9E9E9E' }, italic: true };
                        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                        cell.border    = {
                            top: {style:'thin',color:{argb:'FFB0BEC5'}}, bottom: {style:'thin',color:{argb:'FFB0BEC5'}},
                            left: {style:'thin',color:{argb:'FFB0BEC5'}}, right: {style:'thin',color:{argb:'FFB0BEC5'}}
                        };
                    } else {
                        const val = getValFn(cm.proj, rowDef.id);
                        applyStatusCell(cell, val, rowDef, typeLabel === 'ANNUAL');
                    }
                } else if (cm.type === 'overall') {
                    const vals = orderedProjs
                        .filter(p => !(moNum && isMonthBlacklistedForProject(p, moNum, year)) && !(typeLabel === 'ANNUAL' && isDoleAnnualNA(p, rowDef.id)))
                        .map(p => getValFn(p, rowDef.id) !== null ? 1 : 0);
                    const pct  = vals.length ? (vals.reduce((a,b)=>a+b,0) / vals.length * 100) : null;
                    applyAvgCell(cell, pct);
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EAF6' } };
                    cell.font = { bold: true, size: 9, name: 'Calibri', color: { argb: 'FF' + C_OVERALL_BG } };
                } else {
                    const rp   = projsByRegion[cm.region]
                        .filter(p => !(moNum && isMonthBlacklistedForProject(p, moNum, year)) && !(typeLabel === 'ANNUAL' && isDoleAnnualNA(p, rowDef.id)));
                    const vals = rp.map(p => getValFn(p, rowDef.id) !== null ? 1 : 0);
                    const pct  = vals.length ? (vals.reduce((a,b)=>a+b,0) / vals.length * 100) : null;
                    applyAvgCell(cell, pct);
                }
            });
        });
    }

    // ── Build compliance score row ────────────────────────────────────────────
    function buildScoreRow(ws, scoreLabel, scoreFn) {
        const scoreArr = [scoreLabel, '', ''];
        colMap.forEach(cm => {
            if (cm.type === 'proj') {
                const s = scoreFn(cm.proj);
                scoreArr.push(s !== null ? Math.round(s) + '%' : '—');
            } else if (cm.type === 'overall') {
                const sv  = orderedProjs.map(p => scoreFn(p)).filter(v => v !== null);
                const avg = sv.length ? sv.reduce((a,b)=>a+b,0)/sv.length : null;
                scoreArr.push(avg !== null ? Math.round(avg) + '%' : '—');
            } else {
                const rp  = projsByRegion[cm.region];
                const sv  = rp.map(p => scoreFn(p)).filter(v => v !== null);
                const avg = sv.length ? sv.reduce((a,b)=>a+b,0)/sv.length : null;
                scoreArr.push(avg !== null ? Math.round(avg) + '%' : '—');
            }
        });
        const scoreRow = ws.addRow(scoreArr);
        scoreRow.height = 22;
        ws.mergeCells(scoreRow.number, 1, scoreRow.number, LEFT_COLS);
        const scoreLbl = scoreRow.getCell(1);
        scoreLbl.value     = scoreLabel;
        scoreLbl.font      = { bold: true, size: 10, name: 'Calibri', color: { argb: 'FF' + C_COL_HDR_FG } };
        scoreLbl.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_DARK_GREEN } };
        scoreLbl.alignment = { horizontal: 'center', vertical: 'middle' };
        colMap.forEach((cm, i) => {
            const ci   = LEFT_COLS + 1 + i;
            const cell = scoreRow.getCell(ci);
            if (cm.type === 'overall') {
                const sv  = orderedProjs.map(p => scoreFn(p)).filter(v => v !== null);
                const avg = sv.length ? sv.reduce((a,b)=>a+b,0)/sv.length : null;
                applyAvgCell(cell, avg);
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_OVERALL_BG } };
                cell.font = { bold: true, size: 10, name: 'Calibri', color: { argb: 'FFFFFFFF' } };
            } else {
                applyAvgCell(cell, cm.type === 'proj'
                    ? scoreFn(cm.proj)
                    : (function() {
                        const rp  = projsByRegion[cm.region];
                        const sv  = rp.map(p => scoreFn(p)).filter(v => v !== null);
                        return sv.length ? sv.reduce((a,b)=>a+b,0)/sv.length : null;
                    })()
                );
            }
        });
    }

    // ── Set column widths ─────────────────────────────────────────────────────
    function setColWidths(ws) {
        ws.getColumn(1).width = 8;   // Report label
        ws.getColumn(2).width = 30;  // Description
        ws.getColumn(3).width = 8;   // Type
        colMap.forEach((cm, i) => {
            ws.getColumn(LEFT_COLS + 1 + i).width = cm.type === 'avg' ? 8 : cm.type === 'overall' ? 10 : 14;
        });
    }

    // ════════════════════════════════════════════════════════════════════════
    // ── OVERALL SUMMARY SHEET — created FIRST so it appears as the first tab ──
    // ════════════════════════════════════════════════════════════════════════
    const sumWs = wb.addWorksheet('OVERALL SUMMARY');

    // ════════════════════════════════════════════════════════════════════════
    // ── ONE SHEET PER MONTH (submitted months only) ──────────────────────────
    // ════════════════════════════════════════════════════════════════════════
    const submittedMonths = MO_LONG.filter((mo, mi) =>
        mi <= lastDoneIdx && allProjs.some(p => !isMonthBlacklistedForProject(p, mi + 1, year) && DOLE_MONTHLY_ROWS.some(r => getDoleMonthVal(p, r.id, mi + 1) !== null))
    );

    if (!submittedMonths.length) {
        showToast('No DOLE submissions found for this year.', 'info');
        return;
    }

    submittedMonths.forEach((mo, idx) => {
        const moNum       = MO_LONG.indexOf(mo) + 1;
        const moShort     = MO_SHORT[MO_LONG.indexOf(mo)];
        const sheetName   = ('DOLE-' + moShort + '-' + year).substring(0, 31);
        const ws          = wb.addWorksheet(sheetName);

        // Row 1: notes
        addNotesRow(ws);
        // Rows 2–4: region header + col header
        buildRegionAndColHeaders(ws);
        // Data rows 5+: monthly rows
        buildDataRows(ws, DOLE_MONTHLY_ROWS, (p, id) => getDoleMonthVal(p, id, moNum), 'MONTHLY', moNum);
        // Score row
        buildScoreRow(ws, 'COMPLIANCE SCORE', p => projMonthScore(p, moNum));
        // Col widths + freeze
        setColWidths(ws);
        ws.views = [{ state: 'frozen', xSplit: LEFT_COLS, ySplit: 4, activeCell: 'D5' }];
    });

    // ════════════════════════════════════════════════════════════════════════
    // ── ANNUAL REPORTS SHEET ─────────────────────────────────────────────────
    // ════════════════════════════════════════════════════════════════════════
    const annualWs   = wb.addWorksheet('ANNUAL REPORTS');
    addNotesRow(annualWs);
    buildRegionAndColHeaders(annualWs);
    buildDataRows(annualWs, DOLE_ANNUAL_ROWS, (p, id) => getDoleAnnualVal(p, id), 'ANNUAL');
    buildScoreRow(annualWs, 'COMPLIANCE SCORE', projAnnualScore);
    setColWidths(annualWs);
    annualWs.views = [{ state: 'frozen', xSplit: LEFT_COLS, ySplit: 4, activeCell: 'D5' }];

    // ════════════════════════════════════════════════════════════════════════
    // ── OVERALL SUMMARY SHEET (months as rows, projects as cols) ─────────────
    // ════════════════════════════════════════════════════════════════════════
    addNotesRow(sumWs);
    sumWs.addRow([]); sumWs.getRow(sumWs.rowCount).height = 6;

    // Region header row
    const sRegHdr = sumWs.addRow(Array(totalCols).fill(''));
    sRegHdr.height = 20;
    let sColOff = LEFT_COLS + 1;
    allRegionOrder.forEach(region => {
        const pc = projsByRegion[region].length;
        const c  = sRegHdr.getCell(sColOff);
        c.value     = region;
        c.font      = { bold: true, color: { argb: 'FF' + C_COL_HDR_FG }, size: 10, name: 'Calibri' };
        c.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_DARK_GREEN } };
        c.alignment = { horizontal: 'center', vertical: 'middle' };
        if (pc > 0) sumWs.mergeCells(sRegHdr.number, sColOff, sRegHdr.number, sColOff + pc);
        sColOff += pc + 1;
    });
    const sOverallCell = sRegHdr.getCell(sColOff);
    sOverallCell.value     = 'OVERALL';
    sOverallCell.font      = { bold: true, color: { argb: 'FF' + C_COL_HDR_FG }, size: 10, name: 'Calibri' };
    sOverallCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_OVERALL_BG } };
    sOverallCell.alignment = { horizontal: 'center', vertical: 'middle' };
    for (let ci = 1; ci <= LEFT_COLS; ci++) {
        sRegHdr.getCell(ci).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_DARK_GREEN } };
    }

    // Col header row
    const sHdrData = ['Period', '', ''];
    colMap.forEach(cm => sHdrData.push(
        cm.type === 'proj' ? (cm.proj.name || '') :
        cm.type === 'overall' ? 'OVERALL\nAVG' : 'REGION\nAVG'
    ));
    const sHdrRow = sumWs.addRow(sHdrData);
    sHdrRow.height = 45;
    sumWs.mergeCells(sHdrRow.number, 1, sHdrRow.number, LEFT_COLS);
    for (let ci = 1; ci <= LEFT_COLS; ci++) applyHeaderStyle(sHdrRow.getCell(ci), C_COL_HDR_BG, C_COL_HDR_FG);
    sHdrRow.getCell(1).value = 'PERIOD';
    colMap.forEach((cm, i) => {
        const ci   = LEFT_COLS + 1 + i;
        const cell = sHdrRow.getCell(ci);
        if (cm.type === 'overall')    applyHeaderStyle(cell, C_OVERALL_BG, 'FFFFFF');
        else if (cm.type === 'avg')   applyHeaderStyle(cell, C_MED_GREEN, 'FFFFFF');
        else                          applyHeaderStyle(cell, C_COL_HDR_BG, C_COL_HDR_FG);
    });

    // One row per submitted month
    submittedMonths.forEach(mo => {
        const moNum = MO_LONG.indexOf(mo) + 1;
        const moIdx = moNum - 1;
        const mRowData = [MO_SHORT[moIdx], '', ''];
        colMap.forEach(cm => {
            if (cm.type === 'proj') {
                const s = projMonthScore(cm.proj, moNum);
                mRowData.push(s !== null ? Math.round(s) + '%' : '—');
            } else if (cm.type === 'overall') {
                const sv  = orderedProjs.map(p => projMonthScore(p, moNum)).filter(v => v !== null);
                const avg = sv.length ? sv.reduce((a,b)=>a+b,0)/sv.length : null;
                mRowData.push(avg !== null ? Math.round(avg) + '%' : '—');
            } else {
                const rp  = projsByRegion[cm.region];
                const sv  = rp.map(p => projMonthScore(p, moNum)).filter(v => v !== null);
                const avg = sv.length ? sv.reduce((a,b)=>a+b,0)/sv.length : null;
                mRowData.push(avg !== null ? Math.round(avg) + '%' : '—');
            }
        });
        const mRow = sumWs.addRow(mRowData);
        mRow.height = 18;
        sumWs.mergeCells(mRow.number, 1, mRow.number, LEFT_COLS);
        const mlbl = mRow.getCell(1);
        mlbl.value     = MO_SHORT[moIdx];
        mlbl.font      = { bold: true, size: 9, name: 'Calibri' };
        mlbl.alignment = { horizontal: 'center', vertical: 'middle' };
        mlbl.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_GRAY_HDR } };
        mlbl.border    = { top:{style:'thin',color:{argb:'FFB0BEC5'}}, bottom:{style:'thin',color:{argb:'FFB0BEC5'}}, left:{style:'thin',color:{argb:'FFB0BEC5'}}, right:{style:'medium',color:{argb:'FF'+C_MED_GREEN}} };
        colMap.forEach((cm, i) => {
            const ci   = LEFT_COLS + 1 + i;
            const cell = mRow.getCell(ci);
            if (cm.type === 'overall') {
                const sv  = orderedProjs.map(p => projMonthScore(p, moNum)).filter(v => v !== null);
                const avg = sv.length ? sv.reduce((a,b)=>a+b,0)/sv.length : null;
                applyAvgCell(cell, avg);
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EAF6' } };
                cell.font = { bold: true, size: 9, name: 'Calibri', color: { argb: 'FF' + C_OVERALL_BG } };
            } else {
                applyAvgCell(cell, cm.type === 'proj'
                    ? projMonthScore(cm.proj, moNum)
                    : (function() {
                        const rp  = projsByRegion[cm.region];
                        const sv  = rp.map(p => projMonthScore(p, moNum)).filter(v => v !== null);
                        return sv.length ? sv.reduce((a,b)=>a+b,0)/sv.length : null;
                    })()
                );
            }
        });
    });

    // Annual row in summary
    const annRowData = ['ANNUAL', '', ''];
    colMap.forEach(cm => {
        if (cm.type === 'proj') {
            const s = projAnnualScore(cm.proj);
            annRowData.push(s !== null ? Math.round(s) + '%' : '—');
        } else if (cm.type === 'overall') {
            const sv  = orderedProjs.map(p => projAnnualScore(p)).filter(v => v !== null);
            const avg = sv.length ? sv.reduce((a,b)=>a+b,0)/sv.length : null;
            annRowData.push(avg !== null ? Math.round(avg) + '%' : '—');
        } else {
            const rp  = projsByRegion[cm.region];
            const sv  = rp.map(p => projAnnualScore(p)).filter(v => v !== null);
            const avg = sv.length ? sv.reduce((a,b)=>a+b,0)/sv.length : null;
            annRowData.push(avg !== null ? Math.round(avg) + '%' : '—');
        }
    });
    const annRow = sumWs.addRow(annRowData);
    annRow.height = 18;
    sumWs.mergeCells(annRow.number, 1, annRow.number, LEFT_COLS);
    const annLbl = annRow.getCell(1);
    annLbl.value     = 'ANNUAL';
    annLbl.font      = { bold: true, size: 9, name: 'Calibri', color: { argb: 'FFFFFFFF' } };
    annLbl.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB71C1C' } };
    annLbl.alignment = { horizontal: 'center', vertical: 'middle' };
    annLbl.border    = { top:{style:'thin',color:{argb:'FFB0BEC5'}}, bottom:{style:'thin',color:{argb:'FFB0BEC5'}}, left:{style:'thin',color:{argb:'FFB0BEC5'}}, right:{style:'medium',color:{argb:'FF'+C_MED_GREEN}} };
    colMap.forEach((cm, i) => {
        const ci   = LEFT_COLS + 1 + i;
        const cell = annRow.getCell(ci);
        if (cm.type === 'overall') {
            const sv  = orderedProjs.map(p => projAnnualScore(p)).filter(v => v !== null);
            const avg = sv.length ? sv.reduce((a,b)=>a+b,0)/sv.length : null;
            applyAvgCell(cell, avg);
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_OVERALL_BG } };
            cell.font = { bold: true, size: 10, name: 'Calibri', color: { argb: 'FFFFFFFF' } };
        } else {
            applyAvgCell(cell, cm.type === 'proj'
                ? projAnnualScore(cm.proj)
                : (function() {
                    const rp  = projsByRegion[cm.region];
                    const sv  = rp.map(p => projAnnualScore(p)).filter(v => v !== null);
                    return sv.length ? sv.reduce((a,b)=>a+b,0)/sv.length : null;
                })()
            );
        }
    });

    // Summary col widths + freeze
    setColWidths(sumWs);
    sumWs.views = [{ state: 'frozen', xSplit: LEFT_COLS, ySplit: 4, activeCell: 'D5' }];

    // ── Download ──────────────────────────────────────────────────────────────
    try {
        await eshDownloadXlsx(wb, `SCIC_ESH_DOLE_REPORTORIAL_${year}_${new Date().toISOString().slice(0, 10)}.xlsx`);
        showToast('DOLE Reportorial Excel exported successfully!', 'success');
    } catch(err) {
        console.error('DOLE Excel export error:', err);
        showToast('DOLE export failed. Check console for details.', 'error');
    }
}

// ══════════════════════════════════════════════════════════════════════════════
//  ENVIRONMENTAL MONITORING — Excel Export
//  Mirrors KPM / DOLE Excel output style:
//  One worksheet per data type (Electricity, Water, Waste, Fuel, Appliances)
//  + a Summary sheet.  Layout: left fixed columns (Region / Project / Month)
//  + data columns, with region-group headers, totals rows, and a coloured
//  grand-total banner — identical colour palette to KPM export.
// ══════════════════════════════════════════════════════════════════════════════
async function exportEnvMonitoringExcel() {
    // PCO roles are allowed to trigger this from the in-tab button; only block non-env roles
    if (typeof ExcelJS === 'undefined') {
        showToast('Excel library not loaded. Refresh and try again.', 'error');
        return;
    }

    const year     = state.selectedYear || new Date().getFullYear();
    const MO_LONG  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const MO_SHORT = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    const ENV_REGIONS = window.ENV_REGIONS;

    // ── Raw data ──────────────────────────────────────────────────────────────
    const elecRows  = (window._envData   || []).filter(r => r);
    const wasteRows = (window._wasteData || []).filter(r => r);
    const waterRows = (window._waterData || []).filter(r => r);
    const fuelRows  = (window._fuelData  || []).filter(r => r);

    const allProjects = (state.projects || []);

    // Projects per region (env regions)
    const projsByRegion = {};
    ENV_REGIONS.forEach(r => {
        projsByRegion[r] = allProjects.filter(p => (p.region || '').toUpperCase() === r);
    });
    const orderedProjs = ENV_REGIONS.flatMap(r => projsByRegion[r]);

    // Build colMap: per-region projects + REGION AVG + OVERALL AVG (same pattern as KPM)
    const colMap = []; // {type:'proj'|'avg'|'overall', proj?, region?}
    ENV_REGIONS.forEach(region => {
        projsByRegion[region].forEach(proj => colMap.push({ type: 'proj', proj, region }));
        if (projsByRegion[region].length) colMap.push({ type: 'avg', region });
    });
    colMap.push({ type: 'overall' });

    if (!orderedProjs.length) {
        showToast('No project data to export.', 'info');
        return;
    }

    showToast('Generating Environmental Monitoring Excel file...', 'info');

    // ── Palette (identical to KPM) ────────────────────────────────────────────
    const C_DARK_GREEN  = '1B5E20';
    const C_MED_GREEN   = '2E7D32';
    const C_LIGHT_GREEN = 'E8F5E9';
    const C_GRAY_HDR    = 'F5F5F5';
    const C_COL_HDR_BG  = '37474F';
    const C_COL_HDR_FG  = 'FFFFFF';
    const C_OVERALL_BG  = '1A237E';
    const C_ALT         = 'F1F8E9';

    // ── Style helpers (mirrored from KPM) ─────────────────────────────────────
    function applyHeaderStyle(cell, bgArgb, fgArgb) {
        cell.font      = { bold: true, color: { argb: 'FF' + (fgArgb || C_COL_HDR_FG) }, size: 9, name: 'Calibri' };
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + (bgArgb || C_COL_HDR_BG) } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border    = {
            top:    { style: 'thin', color: { argb: 'FFB0BEC5' } },
            bottom: { style: 'thin', color: { argb: 'FFB0BEC5' } },
            left:   { style: 'thin', color: { argb: 'FFB0BEC5' } },
            right:  { style: 'thin', color: { argb: 'FFB0BEC5' } }
        };
    }
    function leftCellStyle(cell, bold) {
        cell.font      = { bold: !!bold, size: 8.5, name: 'Calibri' };
        cell.alignment = { vertical: 'middle', wrapText: true };
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_GRAY_HDR } };
        cell.border    = {
            top:    { style: 'thin',   color: { argb: 'FFB0BEC5' } },
            bottom: { style: 'thin',   color: { argb: 'FFB0BEC5' } },
            left:   { style: 'thin',   color: { argb: 'FFB0BEC5' } },
            right:  { style: 'medium', color: { argb: 'FF' + C_MED_GREEN } }
        };
    }
    function numCell(cell, value, bold, bgArgb, fgArgb) {
        cell.value     = (value !== null && value !== undefined && !isNaN(value)) ? value : '';
        cell.font      = { bold: !!bold, size: 9, name: 'Calibri', color: fgArgb ? { argb: 'FF' + fgArgb } : undefined };
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        if (bgArgb) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + bgArgb } };
        cell.border    = {
            top:    { style: 'thin', color: { argb: 'FFE0E0E0' } },
            bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            left:   { style: 'thin', color: { argb: 'FFE0E0E0' } },
            right:  { style: 'thin', color: { argb: 'FFE0E0E0' } }
        };
    }
    function avgCell(cell, value, bold) {
        cell.border = {
            top:    { style: 'medium', color: { argb: 'FF' + C_MED_GREEN } },
            bottom: { style: 'medium', color: { argb: 'FF' + C_MED_GREEN } },
            left:   { style: 'medium', color: { argb: 'FF' + C_MED_GREEN } },
            right:  { style: 'medium', color: { argb: 'FF' + C_MED_GREEN } }
        };
        if (value === null || value === undefined || isNaN(value)) {
            cell.value = '—';
            cell.font  = { size: 9, name: 'Calibri', color: { argb: 'FF9E9E9E' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            return;
        }
        cell.value     = parseFloat(value.toFixed(3));
        cell.font      = { bold: !!bold || true, size: 9, name: 'Calibri', color: { argb: 'FF' + C_DARK_GREEN } };
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_LIGHT_GREEN } };
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
    }
    function overallCell(cell, value) {
        cell.border = {
            top:    { style: 'medium', color: { argb: 'FF' + C_OVERALL_BG } },
            bottom: { style: 'medium', color: { argb: 'FF' + C_OVERALL_BG } },
            left:   { style: 'medium', color: { argb: 'FF' + C_OVERALL_BG } },
            right:  { style: 'medium', color: { argb: 'FF' + C_OVERALL_BG } }
        };
        if (value === null || value === undefined || isNaN(value)) {
            cell.value = '—';
            cell.font  = { size: 9, name: 'Calibri', color: { argb: 'FF9E9E9E' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            return;
        }
        cell.value     = parseFloat(value.toFixed(3));
        cell.font      = { bold: true, size: 9, name: 'Calibri', color: { argb: 'FFFFFFFF' } };
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_OVERALL_BG } };
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
    }

    function addNotesRow(ws, totalCols, title) {
        const noteRow = ws.addRow([
            'ENVIRONMENTAL MONITORING — ' + title + '  |  Year ' + year + '  |  Generated: ' + new Date().toLocaleDateString('en-PH', { year:'numeric', month:'long', day:'numeric' }) + '  |  SCIC ESH Monitoring System'
        ]);
        ws.mergeCells(noteRow.number, 1, noteRow.number, totalCols);
        const nc = noteRow.getCell(1);
        nc.font      = { bold: true, size: 10, name: 'Calibri', color: { argb: 'FFFFFFFF' } };
        nc.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_DARK_GREEN } };
        nc.alignment = { horizontal: 'left', vertical: 'middle', wrapText: false };
        noteRow.height = 24;
        return noteRow;
    }

    function addRegionAndProjHeaders(ws, LEFT_COLS, colMap, totalCols, titleLabel) {
        ws.addRow([]); ws.getRow(ws.rowCount).height = 6;
        const regHdrRow = ws.addRow(Array(totalCols).fill(''));
        regHdrRow.height = 20;
        let colOffset = LEFT_COLS + 1;
        ENV_REGIONS.forEach(region => {
            if (!projsByRegion[region].length) return;
            const projCount = projsByRegion[region].length;
            const spanStart = colOffset;
            const spanEnd   = colOffset + projCount;
            const c = regHdrRow.getCell(spanStart);
            c.value = region;
            c.font  = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10, name: 'Calibri' };
            c.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_DARK_GREEN } };
            c.alignment = { horizontal: 'center', vertical: 'middle' };
            if (spanEnd > spanStart) ws.mergeCells(regHdrRow.number, spanStart, regHdrRow.number, spanEnd);
            colOffset += projCount + 1;
        });
        const overallHdr = regHdrRow.getCell(colOffset);
        overallHdr.value = 'OVERALL';
        overallHdr.font  = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10, name: 'Calibri' };
        overallHdr.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_OVERALL_BG } };
        overallHdr.alignment = { horizontal: 'center', vertical: 'middle' };
        for (let ci = 1; ci <= LEFT_COLS; ci++) {
            regHdrRow.getCell(ci).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_DARK_GREEN } };
        }
        const hdrData = [];
        for (let i = 0; i < LEFT_COLS; i++) hdrData.push(i === 0 ? titleLabel : '');
        colMap.forEach(cm => {
            if (cm.type === 'proj')    hdrData.push(cm.proj.name || '');
            else if (cm.type === 'avg') hdrData.push('REGION\nAVG');
            else                        hdrData.push('OVERALL\nAVG');
        });
        const hdrRow = ws.addRow(hdrData);
        hdrRow.height = 45;
        for (let ci = 1; ci <= LEFT_COLS; ci++) applyHeaderStyle(hdrRow.getCell(ci), C_COL_HDR_BG, C_COL_HDR_FG);
        colMap.forEach((cm, i) => {
            const ci = LEFT_COLS + 1 + i;
            if (cm.type === 'avg')         applyHeaderStyle(hdrRow.getCell(ci), C_MED_GREEN, 'FFFFFF');
            else if (cm.type === 'overall') applyHeaderStyle(hdrRow.getCell(ci), C_OVERALL_BG, 'FFFFFF');
            else                            applyHeaderStyle(hdrRow.getCell(ci), C_COL_HDR_BG, C_COL_HDR_FG);
        });
    }

    const wb = eshNewWorkbook('ESH Monitoring System');

    const LEFT_COLS = 2;
    const totalCols = LEFT_COLS + colMap.length;

    function makeMultiGetVal(rowArray) {
        return function(proj, moLong, mk) {
            const rows = rowArray.filter(r =>
                (r.region || '').toUpperCase() === (proj.region || '').toUpperCase() &&
                r.project === proj.name &&
                r.month === moLong
            );
            if (!rows.length) return null;
            const sum = rows.reduce((s, r) => s + (parseFloat(r[mk]) || 0), 0);
            return sum;
        };
    }

    function buildEnvSheet(sheetName, pageTitle, metricDefs, getVal) {
        const ws = wb.addWorksheet(sheetName, {
            views: [{ state: 'frozen', xSplit: LEFT_COLS, ySplit: 4, activeCell: 'C5' }]
        });
        addNotesRow(ws, totalCols, pageTitle);
        addRegionAndProjHeaders(ws, LEFT_COLS, colMap, totalCols, 'Month');
        if (LEFT_COLS > 1) { try { ws.mergeCells(4, 1, 4, LEFT_COLS); } catch(e) {} }
        ws.getColumn(1).width = 14;
        ws.getColumn(2).width = 26;
        colMap.forEach((cm, i) => {
            ws.getColumn(LEFT_COLS + 1 + i).width = cm.type === 'avg' ? 10 : cm.type === 'overall' ? 11 : 14;
        });

        const grandTotals = {};
        metricDefs.forEach(md => {
            grandTotals[md.key] = {};
            orderedProjs.forEach(p => { grandTotals[md.key][p.name] = 0; });
        });

        let rowNum = 5;

        MO_LONG.forEach((moLong, moIdx) => {
            const moShort = MO_SHORT[moIdx];
            const hasData = metricDefs.some(md =>
                orderedProjs.some(p => { const v = getVal(p, moLong, md.key); return v !== null && v !== 0; })
            );
            if (!hasData) return;

            const blockStart = rowNum;
            metricDefs.forEach((md, mdi) => {
                ws.addRow([]);
                const dr = ws.getRow(rowNum++);
                dr.height = 17;
                const bg = moIdx % 2 === 0 ? C_ALT : null;

                const moCell = dr.getCell(1);
                moCell.value = mdi === 0 ? moShort : '';
                leftCellStyle(moCell, mdi === 0);
                if (mdi === 0) moCell.alignment = { horizontal: 'center', vertical: 'middle' };

                const lbCell = dr.getCell(2);
                lbCell.value = md.unit ? md.label + ' (' + md.unit + ')' : md.label;
                lbCell.font      = { size: 8.5, name: 'Calibri', italic: true };
                if (bg) lbCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + bg } };
                lbCell.alignment = { vertical: 'middle', wrapText: true };
                lbCell.border    = { top:{style:'thin',color:{argb:'FFE0E0E0'}}, bottom:{style:'thin',color:{argb:'FFE0E0E0'}}, left:{style:'thin',color:{argb:'FFE0E0E0'}}, right:{style:'medium',color:{argb:'FF'+C_MED_GREEN}} };

                colMap.forEach((cm, ci) => {
                    const cell = dr.getCell(LEFT_COLS + 1 + ci);
                    if (cm.type === 'proj') {
                        const v = getVal(cm.proj, moLong, md.key);
                        const num = (v !== null && !isNaN(v)) ? parseFloat(v.toFixed(md.dec !== undefined ? md.dec : 2)) : null;
                        numCell(cell, num, false, bg, null);
                        if (num !== null) grandTotals[md.key][cm.proj.name] = (grandTotals[md.key][cm.proj.name] || 0) + num;
                    } else if (cm.type === 'avg') {
                        const vals = projsByRegion[cm.region].map(p => getVal(p, moLong, md.key)).filter(v => v !== null && !isNaN(v));
                        avgCell(cell, vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : null, false);
                    } else {
                        const vals = orderedProjs.map(p => getVal(p, moLong, md.key)).filter(v => v !== null && !isNaN(v));
                        overallCell(cell, vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : null);
                    }
                });
            });

            if (metricDefs.length > 1) {
                const blockEnd = rowNum - 1;
                if (blockEnd > blockStart) {
                    try { ws.mergeCells(blockStart, 1, blockEnd, 1); } catch(e) {}
                    const mc = ws.getCell(blockStart, 1);
                    mc.value = moShort;
                    leftCellStyle(mc, true);
                    mc.alignment = { horizontal: 'center', vertical: 'middle' };
                }
            }
        });

        const tStart = rowNum;
        metricDefs.forEach((md, mdi) => {
            ws.addRow([]);
            const tr = ws.getRow(rowNum++);
            tr.height = 20;
            const moCell = tr.getCell(1);
            moCell.value = '';
            moCell.font  = { bold: true, size: 9, name: 'Calibri', color: { argb: 'FFFFFFFF' } };
            moCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_DARK_GREEN } };
            moCell.alignment = { horizontal: 'center', vertical: 'middle' };
            const lbCell = tr.getCell(2);
            lbCell.value = md.unit ? md.label + ' (' + md.unit + ')' : md.label;
            lbCell.font  = { bold: true, size: 8.5, name: 'Calibri', color: { argb: 'FFFFFFFF' } };
            lbCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_MED_GREEN } };
            lbCell.alignment = { vertical: 'middle', wrapText: true };
            lbCell.border = { right: { style: 'medium', color: { argb: 'FF' + C_MED_GREEN } } };
            colMap.forEach((cm, ci) => {
                const cell = tr.getCell(LEFT_COLS + 1 + ci);
                if (cm.type === 'proj') {
                    const v = grandTotals[md.key][cm.proj.name] || 0;
                    numCell(cell, v ? parseFloat(v.toFixed(md.dec !== undefined ? md.dec : 2)) : null, true, C_DARK_GREEN, 'FFFFFF');
                } else if (cm.type === 'avg') {
                    const vals = projsByRegion[cm.region].map(p => grandTotals[md.key][p.name] || 0).filter(v => v > 0);
                    avgCell(cell, vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : null, true);
                    cell.font = { bold: true, size: 9, name: 'Calibri', color: { argb: 'FF' + C_DARK_GREEN } };
                } else {
                    const vals = orderedProjs.map(p => grandTotals[md.key][p.name] || 0).filter(v => v > 0);
                    overallCell(cell, vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : null);
                }
            });
        });
        if (metricDefs.length > 1) {
            const tEnd = rowNum - 1;
            if (tEnd > tStart) {
                try { ws.mergeCells(tStart, 1, tEnd, 1); } catch(e) {}
                const tc = ws.getCell(tStart, 1);
                tc.value = 'TOTAL';
                tc.font  = { bold: true, size: 9, name: 'Calibri', color: { argb: 'FFFFFFFF' } };
                tc.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_DARK_GREEN } };
                tc.alignment = { horizontal: 'center', vertical: 'middle' };
            }
        }
    }

    // ── SHEET 1: ELECTRICITY ──────────────────────────────────────────────────
    buildEnvSheet('Electricity', 'ELECTRICITY CONSUMPTION',
        [
            { key: 'kwh',    label: 'kWh Consumption',  unit: 'kWh',    dec: 2 },
            { key: 'amount', label: 'Amount',            unit: 'Php',    dec: 2 },
            { key: 'ghg',    label: 'GHG Emissions',     unit: 'tCO₂e', dec: 4 },
        ],
        makeMultiGetVal(elecRows)
    );

    // ── SHEET 2: WATER ────────────────────────────────────────────────────────
    buildEnvSheet('Water', 'WATER CONSUMPTION',
        [
            { key: 'domM3',  label: 'Domestic Water',    unit: 'm³',  dec: 3 },
            { key: 'domAmt', label: 'Domestic Amount',   unit: 'Php', dec: 2 },
            { key: 'potLit', label: 'Potable Water',     unit: 'L',   dec: 3 },
            { key: 'potAmt', label: 'Potable Amount',    unit: 'Php', dec: 2 },
            { key: 'indM3',  label: 'Industrial Water',  unit: 'm³',  dec: 3 },
            { key: 'indAmt', label: 'Industrial Amount', unit: 'Php', dec: 2 },
        ],
        makeMultiGetVal(waterRows)
    );

    // ── SHEET 3: WASTE ────────────────────────────────────────────────────────
    buildEnvSheet('Waste', 'WASTE GENERATION & DISPOSAL',
        [
            { key: 'bioGen',         label: 'Biodegradable Generated',  unit: 'kg', dec: 2 },
            { key: 'bioDisp',        label: 'Biodegradable Disposed',   unit: 'kg', dec: 2 },
            { key: 'bioDiverted',    label: 'Biodegradable Diverted',   unit: 'kg', dec: 2 },
            { key: 'nonbioGen',      label: 'Non-Bio Generated',        unit: 'kg', dec: 2 },
            { key: 'nonbioDisp',     label: 'Non-Bio Disposed',         unit: 'kg', dec: 2 },
            { key: 'nonbioDiverted', label: 'Non-Bio Diverted',         unit: 'kg', dec: 2 },
            { key: 'recGen',         label: 'Recyclable Generated',     unit: 'kg', dec: 2 },
            { key: 'recDisp',        label: 'Recyclable Disposed',      unit: 'kg', dec: 2 },
            { key: 'recDiverted',    label: 'Recyclable Diverted',      unit: 'kg', dec: 2 },
            { key: 'hazGen',         label: 'Hazardous Generated',      unit: 'kg', dec: 2 },
            { key: 'hazDisp',        label: 'Hazardous Disposed',       unit: 'kg', dec: 2 },
            { key: 'septage',        label: 'Septage',                  unit: 'L',  dec: 2 },
        ],
        makeMultiGetVal(wasteRows)
    );

    // ── SHEET 4: FUEL ─────────────────────────────────────────────────────────
    buildEnvSheet('Fuel', 'FUEL CONSUMPTION',
        [
            { key: 'dieselLit', label: 'Diesel Consumption',   unit: 'L',     dec: 3 },
            { key: 'gasLit',    label: 'Gasoline Consumption', unit: 'L',     dec: 3 },
            { key: 'ghg',       label: 'GHG Emissions',        unit: 'tCO₂e', dec: 4 },
        ],
        makeMultiGetVal(fuelRows)
    );

    // ── SHEET 5: OVERALL SUMMARY ──────────────────────────────────────────────
    {
        const ws = wb.addWorksheet('OVERALL SUMMARY', {
            views: [{ state: 'frozen', xSplit: LEFT_COLS, ySplit: 4, activeCell: 'C5' }]
        });
        addNotesRow(ws, totalCols, 'OVERALL SUMMARY');
        addRegionAndProjHeaders(ws, LEFT_COLS, colMap, totalCols, 'Category');
        if (LEFT_COLS > 1) { try { ws.mergeCells(4, 1, 4, LEFT_COLS); } catch(e) {} }
        ws.getColumn(1).width = 20;
        ws.getColumn(2).width = 26;
        colMap.forEach((cm, i) => {
            ws.getColumn(LEFT_COLS + 1 + i).width = cm.type === 'avg' ? 10 : cm.type === 'overall' ? 11 : 14;
        });

        const summaryDefs = [
            { cat: 'Electricity', label: 'Total kWh',            unit: 'kWh',    dec: 2, rows: elecRows,  key: 'kwh' },
            { cat: 'Electricity', label: 'Electricity Amount',    unit: 'Php',    dec: 2, rows: elecRows,  key: 'amount' },
            { cat: 'Electricity', label: 'GHG (Electricity)',     unit: 'tCO₂e', dec: 4, rows: elecRows,  key: 'ghg' },
            { cat: 'Water',       label: 'Domestic Water',        unit: 'm³',    dec: 3, rows: waterRows, key: 'domM3' },
            { cat: 'Water',       label: 'Industrial Water',      unit: 'm³',    dec: 3, rows: waterRows, key: 'indM3' },
            { cat: 'Fuel',        label: 'Diesel Consumption',    unit: 'L',     dec: 3, rows: fuelRows,  key: 'dieselLit' },
            { cat: 'Fuel',        label: 'Gasoline Consumption',  unit: 'L',     dec: 3, rows: fuelRows,  key: 'gasLit' },
            { cat: 'Fuel',        label: 'GHG (Fuel)',            unit: 'tCO₂e', dec: 4, rows: fuelRows,  key: 'ghg' },
            { cat: 'Waste',       label: 'Hazardous Waste Gen',   unit: 'kg',    dec: 2, rows: wasteRows, key: 'hazGen' },
            { cat: 'Waste',       label: 'Total Waste Generated', unit: 'kg',    dec: 2, rows: wasteRows, key: '_totalWaste' },
        ];

        function getProjTotalSum(proj, rowArr, key) {
            if (key === '_totalWaste') {
                return ['bioGen','nonbioGen','recGen','hazGen'].reduce((s, k) =>
                    s + rowArr.filter(r => (r.region||''  ).toUpperCase() === (proj.region||'').toUpperCase() && r.project === proj.name).reduce((ss, r) => ss + (parseFloat(r[k])||0), 0), 0);
            }
            return rowArr.filter(r => (r.region||'').toUpperCase() === (proj.region||'').toUpperCase() && r.project === proj.name).reduce((s, r) => s + (parseFloat(r[key])||0), 0);
        }

        let sRowNum = 5;
        let prevCat = '';

        summaryDefs.forEach((sd) => {
            ws.addRow([]);
            const dr = ws.getRow(sRowNum++);
            dr.height = 17;
            const catCell = dr.getCell(1);
            catCell.value = sd.cat !== prevCat ? sd.cat : '';
            catCell.font  = { bold: true, size: 9, name: 'Calibri', color: { argb: 'FF' + C_DARK_GREEN } };
            catCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_GRAY_HDR } };
            catCell.alignment = { horizontal: 'center', vertical: 'middle' };
            catCell.border = { top:{style:'thin',color:{argb:'FFB0BEC5'}}, bottom:{style:'thin',color:{argb:'FFB0BEC5'}}, left:{style:'thin',color:{argb:'FFB0BEC5'}}, right:{style:'medium',color:{argb:'FF'+C_MED_GREEN}} };
            prevCat = sd.cat;
            const lbCell = dr.getCell(2);
            lbCell.value = sd.unit ? sd.label + ' (' + sd.unit + ')' : sd.label;
            lbCell.font  = { size: 8.5, name: 'Calibri', italic: true };
            lbCell.alignment = { vertical: 'middle', wrapText: true };
            lbCell.border = { top:{style:'thin',color:{argb:'FFE0E0E0'}}, bottom:{style:'thin',color:{argb:'FFE0E0E0'}}, left:{style:'thin',color:{argb:'FFE0E0E0'}}, right:{style:'medium',color:{argb:'FF'+C_MED_GREEN}} };
            colMap.forEach((cm, ci) => {
                const cell = dr.getCell(LEFT_COLS + 1 + ci);
                if (cm.type === 'proj') {
                    const v = getProjTotalSum(cm.proj, sd.rows, sd.key);
                    numCell(cell, v ? parseFloat(v.toFixed(sd.dec)) : null, false, null, null);
                } else if (cm.type === 'avg') {
                    const vals = projsByRegion[cm.region].map(p => getProjTotalSum(p, sd.rows, sd.key)).filter(v => v > 0);
                    avgCell(cell, vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : null, false);
                } else {
                    const vals = orderedProjs.map(p => getProjTotalSum(p, sd.rows, sd.key)).filter(v => v > 0);
                    overallCell(cell, vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : null);
                }
            });
        });
    }

    // ── Download ───────────────────────────────────────────────────────────────
    try {
        await eshDownloadXlsx(wb, 'SCIC_ESH_EnvMonitoring_' + year + '_' + new Date().toISOString().slice(0,10) + '.xlsx');
        showToast('Environmental Monitoring Excel exported successfully!', 'success');
    } catch(err) {
        console.error('Env Monitoring Excel export error:', err);
        showToast('Environmental Monitoring export failed. Check console for details.', 'error');
    }
}
