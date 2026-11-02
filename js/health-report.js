
(function() {
    'use strict';

    const HR_REGIONS = ['NCR', 'NORTH LUZON', 'SOUTH LUZON', 'VISAYAS & MINDANAO', 'CORPORATE', 'PLANT OPERATIONS'];

    // Use global source of truth — no local copy needed
    const HR_REGION_COLORS = window.REGION_COLORS;

    const HR_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const HR_MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    const HR_REPORTING_FIELDS = [
        { key: 'chs',    label: 'CHS Monthly Health Report',                               monthly: true  },
        { key: 'inv',    label: 'Inventory & Inspection of Medicines/Supplies/Equipment',  monthly: true  },
        { key: 'nurses', label: 'Nurses and First Aiders KPI',                             monthly: true  },
    ];

    const HR_FIELDS = {
        MEDICAL_FACILITY: [
            { key: 'hospital_name',    label: 'Name of Hospital (MOA)',                    type: 'text',   compliance: 'partial', note: 'Required for MOA' },
            { key: 'moa_validity',     label: 'MOA Validity Date',                         type: 'date',   compliance: 'full',    note: 'Annual monitoring if fully complied' },
            { key: 'dental_coverage',  label: 'With Dental Coverage in MOA?',              type: 'yesno',  compliance: 'auto' },
            { key: 'dental_name',      label: 'Name of Dental Clinic (if no dental MOA)',  type: 'text',   compliance: 'partial', note: 'Required if no dental in MOA' },
            { key: 'dental_moa',       label: 'Dental MOA Validity',                       type: 'date',   compliance: 'full',    note: 'Annual monitoring if fully complied' },
            { key: 'clinic_count',     label: 'Clinic (Dedicated)',                        type: 'number', compliance: 'full',    note: 'Count' },
            { key: 'firstaid_count',   label: 'First Aid Station / Emergency Treatment Facility', type: 'number', compliance: 'full', note: 'Based on OHS Standard' },
            { key: 'transport_count',  label: 'Designated Patient Transport Vehicle',      type: 'number', compliance: 'full',    note: 'Count' },
            { key: 'breastfeeding',    label: 'Breast Feeding Facility',                   type: 'yesno',  compliance: 'full' },
            { key: 'biohaz_infect',    label: 'Biohazard — Infectious Bins',               type: 'yesno',  compliance: 'partial' },
            { key: 'biohaz_puncture',  label: 'Biohazard — Puncture-Resistance Bins',      type: 'yesno',  compliance: 'partial' },
            { key: 'biohaz_general',   label: 'Biohazard — General Waste Bins',            type: 'yesno',  compliance: 'partial' },
            { key: 'biohaz_hauled',    label: 'Biohazard — Hauled by Tied-up Hospital?',   type: 'yesno',  compliance: 'auto' },
            { key: 'biohaz_tempstore', label: 'Stored in Temporary Storage Facility',      type: 'yesno',  compliance: 'partial' },
            { key: 'biohaz_clinic',    label: 'Stored in Clinic Only',                     type: 'yesno',  compliance: 'partial' },
            { key: 'tsd_name',         label: 'Name of Tied-up TSD',                       type: 'text',   compliance: 'partial' },
            { key: 'tsd_validity',     label: 'TSD Validity Date',                         type: 'date',   compliance: 'full',    note: 'Semi-Annual monitoring if fully complied' },
        ],
        EQUIPMENT: [
            { key: 'eq_patient_bed',   label: "Patient's Bed",                             type: 'number', note: 'OHS Standard' },
            { key: 'eq_firstaid_kits', label: 'First Aid Kits',                            type: 'number', note: 'OHS Standard' },
            { key: 'eq_o2_tank',       label: 'Oxygen Tank (complete set)',                type: 'number', note: 'OHS Standard' },
            { key: 'eq_pulse_ox',      label: 'Pulse Oximeter',                            type: 'number', note: 'Present in project' },
            { key: 'eq_firstaid_cab',  label: 'First Aid Cabinet',                         type: 'number', note: 'OHS Standard' },
            { key: 'eq_thermometer',   label: 'Digital Thermometer',                       type: 'number', note: 'OHS Standard' },
            { key: 'eq_bp_set',        label: 'BP Apparatus Set',                          type: 'number', note: 'SCIC outline allocation' },
            { key: 'eq_nebulizer',     label: 'Nebulizer',                                 type: 'number', note: 'Present in project' },
            { key: 'eq_glucose',       label: 'Glucose Meter',                             type: 'number', note: 'Present in project' },
            { key: 'eq_breathalyzer',  label: 'Alcohol Breathalyzer',                      type: 'number', note: 'Depend on project needs' },
            { key: 'eq_exam_table',    label: 'Examining Table',                           type: 'number', note: 'OHS Standard' },
            { key: 'eq_spineboard',    label: 'Spine Board with Spider Strap',             type: 'number', note: 'Depend on project needs' },
            { key: 'eq_med_storage',   label: 'Cabinet for Medical Supplies &amp; Equipment', type: 'number', note: 'OHS Standard' },
            { key: 'eq_med_stocks',    label: 'Cabinet for Medicines (Stocks)',             type: 'number', note: 'OHS Standard' },
            { key: 'eq_eyewash',       label: 'Emergency Eyewash',                         type: 'number', note: 'OHS Standard' },
            { key: 'eq_shower',        label: 'Emergency Shower',                          type: 'number', note: 'OHS Standard' },
        ]
    };

    function hrGetMonthly(p, key, monthIdx) {
        const fk = 'health_' + key + '_' + HR_MONTHS_SHORT[monthIdx];
        return p.vals && p.vals[fk] ? (p.vals[fk][1] ?? '') : '';
    }

    function hrSetMonthly(pName, key, monthIdx, value) {
        const p = (state.masterProjects || state.projects || []).find(x => x.name === pName);
        if (!p) return;
        const fk = 'health_' + key + '_' + HR_MONTHS_SHORT[monthIdx];
        if (!p.vals) p.vals = {};
        if (!p.vals[fk]) p.vals[fk] = {};
        p.vals[fk][1] = value;
        const sp = state.projects.find(x => x.name === pName);
        if (sp && sp !== p) { if (!sp.vals) sp.vals = {}; if (!sp.vals[fk]) sp.vals[fk] = {}; sp.vals[fk][1] = value; }
        if (typeof markPendingSync === 'function') markPendingSync();
        saveToFirebaseDebounced();
        renderHealthReportSummaryBadges();
        refreshHrProjectStatus(pName);
    }
    window.hrSetMonthly = hrSetMonthly;

    function hrGet(p, key) {
        const fk = 'health_' + key;
        return p.vals && p.vals[fk] ? (p.vals[fk][1] ?? '') : '';
    }

    function hrSet(pName, key, value) {
        const p = (state.masterProjects || state.projects || []).find(x => x.name === pName);
        if (!p) return;
        const fk = 'health_' + key;
        if (!p.vals) p.vals = {};
        if (!p.vals[fk]) p.vals[fk] = {};
        p.vals[fk][1] = value;
        const sp = state.projects.find(x => x.name === pName);
        if (sp && sp !== p) { if (!sp.vals) sp.vals = {}; if (!sp.vals[fk]) sp.vals[fk] = {}; sp.vals[fk][1] = value; }
        if (typeof markPendingSync === 'function') markPendingSync();
        saveToFirebaseDebounced();

        const rowEl = document.querySelector(`.hr-field-row[data-proj="${CSS.escape(pName)}"][data-field="${CSS.escape(key)}"]`);
        if (rowEl) {
            const btns = rowEl.querySelectorAll('button');
            if (btns.length === 2) {
                const [yesBtn, noBtn] = btns;
                const yesActive = value === 'yes';
                const noActive  = value === 'no';
                yesBtn.style.background   = yesActive ? '#2e7d32'              : 'var(--input-bg)';
                yesBtn.style.color        = yesActive ? 'white'                : 'var(--text-secondary)';
                yesBtn.style.borderColor  = yesActive ? '#2e7d32'              : 'var(--border-color)';
                noBtn.style.background    = noActive  ? '#ef5350'              : 'var(--input-bg)';
                noBtn.style.color         = noActive  ? 'white'                : 'var(--text-secondary)';
                noBtn.style.borderColor   = noActive  ? '#ef5350'              : 'var(--border-color)';
            }
            const dot = rowEl.querySelector('span[style*="border-radius:50%"]');
            if (dot) {
                const filled = (value === 'yes' || value === 'no');
                dot.style.background = filled ? '#2e7d32' : '#ef5350';
            }
            _hrUpdateConditionalRows(pName, key, value);
        }

        renderHealthReportSummaryBadges();
        refreshHrProjectStatus(pName);
    }

    function _hrUpdateConditionalRows(pName, key, value) {
        const p = (state.projects || []).find(x => x.name === pName);
        if (!p) return;
        if (key === 'dental_coverage') {
            const hide = value !== 'no';
            ['dental_name', 'dental_moa'].forEach(dk => {
                const el = document.querySelector(`.hr-field-row[data-proj="${CSS.escape(pName)}"][data-field="${CSS.escape(dk)}"]`);
                if (el) el.style.display = hide ? 'none' : 'flex';
            });
        }
        if (key === 'biohaz_hauled') {
            const hide = value === 'yes';
            ['biohaz_tempstore','biohaz_clinic','tsd_name','tsd_validity'].forEach(bk => {
                const el = document.querySelector(`.hr-field-row[data-proj="${CSS.escape(pName)}"][data-field="${CSS.escape(bk)}"]`);
                if (el) el.style.display = hide ? 'none' : 'flex';
            });
        }
    }
    window.hrSet = hrSet;

    function getHrComplianceStatus(p) {
        let full = 0, none = 0, total = 0;

        HR_REPORTING_FIELDS.forEach(f => {
            if (f.monthly) {
                HR_MONTHS_SHORT.forEach((_, mi) => {
                    total++;
                    hrGetMonthly(p, f.key, mi) ? full++ : none++;
                });
            } else {
                total++;
                hrGet(p, f.key) ? full++ : none++;
            }
        });

        const allFlat = [...HR_FIELDS.MEDICAL_FACILITY, ...HR_FIELDS.EQUIPMENT];
        allFlat.forEach(f => {
            const v = hrGet(p, f.key);
            total++;
            if (f.type === 'yesno') {
                (v === 'yes' || v === 'no') ? full++ : none++;
            } else if (f.type === 'date') {
                if (v) {
                    if (f.key.includes('validity') || f.key.includes('moa') || f.key.includes('tsd')) {
                        new Date(v) >= new Date() ? full++ : none++;
                    } else { full++; }
                } else { none++; }
            } else if (f.type === 'number') {
                const n = parseFloat(v);
                (!isNaN(n) && n > 0) ? full++ : none++;
            } else {
                (v && v.trim()) ? full++ : none++;
            }
        });

        if (none === total) return 'none';
        if (full === total) return 'full';
        return 'partial';
    }

    function getHrSectionStatus(p, sectionFields) {
        let filled = 0, total = sectionFields.length;
        sectionFields.forEach(f => { if (hrGet(p, f.key)) filled++; });
        if (filled === 0) return 'none';
        if (filled === total) return 'full';
        return 'partial';
    }

    function getHrReportingSectionStatus(p) {
        let filled = 0, total = 0;
        HR_REPORTING_FIELDS.forEach(f => {
            if (f.monthly) {
                HR_MONTHS_SHORT.forEach((_, mi) => { total++; if (hrGetMonthly(p, f.key, mi)) filled++; });
            } else {
                total++;
                if (hrGet(p, f.key)) filled++;
            }
        });
        if (filled === 0) return 'none';
        if (filled === total) return 'full';
        return 'partial';
    }

    function statusBadgeHtml(status, labelFull, labelPartial, labelNone) {
        const cfg = {
            full:    { bg:'#e8f5e9', color:'#1b5e20', border:'#a5d6a7', icon:'fa-check-circle',       label: labelFull    || 'Complied Fully' },
            partial: { bg:'#fff9c4', color:'#f57f17', border:'#ffe082', icon:'fa-exclamation-circle',  label: labelPartial || 'Complied Partially' },
            none:    { bg:'#ffebee', color:'#c62828', border:'#ef9a9a', icon:'fa-times-circle',        label: labelNone    || 'Non-Compliance' }
        };
        const c = cfg[status] || cfg.none;
        return `<span style="font-size:0.62rem;font-weight:700;padding:2px 8px;border-radius:20px;background:${c.bg};color:${c.color};border:1px solid ${c.border};white-space:nowrap;display:inline-flex;align-items:center;gap:3px;">
            <i class="fas ${c.icon}" style="font-size:0.55rem;"></i>${c.label}
        </span>`;
    }

    function renderHealthReportSummaryBadges() {
        const projects = (state && state.projects) ? state.projects : [];
        let full = 0, partial = 0, none = 0;
        projects.forEach(p => {
            const s = getHrComplianceStatus(p);
            if (s === 'full') full++;
            else if (s === 'partial') partial++;
            else none++;
        });
        const b1 = document.getElementById('hr-badge-complied');
        const b2 = document.getElementById('hr-badge-partial');
        const b3 = document.getElementById('hr-badge-noncompliant');
        if (b1) b1.innerHTML = `<i class="fas fa-check-circle" style="margin-right:4px;"></i>${full} Complied Fully`;
        if (b2) b2.innerHTML = `<i class="fas fa-exclamation-circle" style="margin-right:4px;"></i>${partial} Partial`;
        if (b3) b3.innerHTML = `<i class="fas fa-times-circle" style="margin-right:4px;"></i>${none} Non-Compliant`;
    }

    function refreshHrProjectStatus(pName) {
        const el = document.getElementById('hr-proj-status-' + CSS.escape(pName));
        if (!el) return;
        const p = (state.projects || []).find(x => x.name === pName);
        if (!p) return;
        el.innerHTML = statusBadgeHtml(getHrComplianceStatus(p));
        renderHealthReportSummaryBadges();
    }

    function buildReportingTable(p, canEdit) {
        const pName = p.name.replace(/'/g, "\\'");
        const sectionId = 'hr-sec-' + p.name.replace(/[^a-z0-9]/gi,'_') + '_reporting';
        const status = getHrReportingSectionStatus(p);

        const monthHeaders = HR_MONTHS_SHORT.map((m, i) => {
            const now = new Date();
            const isCurrent = i === now.getMonth();
            return `<th style="min-width:72px;padding:5px 4px;text-align:center;font-size:0.62rem;font-weight:700;
                color:${isCurrent ? '#1b5e20' : 'var(--text-secondary)'};
                background:${isCurrent ? '#e8f5e9' : 'var(--input-bg)'};
                border:1px solid var(--border-color);white-space:nowrap;">
                ${m}${isCurrent ? ' <span style="color:#2e7d32;">●</span>' : ''}
            </th>`;
        }).join('');

        const fieldRows = HR_REPORTING_FIELDS.map(f => {
            if (f.monthly) {
                const _hrNow = new Date();
                const _hrCurM = _hrNow.getMonth(); // 0-based
                const _hrSelY = (state && state.selectedYear) || _hrNow.getFullYear();
                const _hrCurY = _hrNow.getFullYear();
                const _hrIsThisYear = _hrSelY === _hrCurY;
                const cells = HR_MONTHS_SHORT.map((_, mi) => {
                    const val = hrGetMonthly(p, f.key, mi);
                    const hasVal = !!val;
                    let _cellBg = 'var(--bg-card)';
                    let _inputBorder = hasVal ? '#a5d6a7' : 'var(--border-color)';
                    let _inputBg = 'var(--input-bg)';
                    let _inputColor = 'var(--text-primary)';
                    if (_hrIsThisYear) {
                        if (hasVal) {
                            _cellBg = '#f1f8f1'; _inputBorder = '#a5d6a7'; _inputBg = '#f1fff1'; _inputColor = '#2e7d32';
                        } else if (mi < _hrCurM) {
                            _cellBg = '#ffebee'; _inputBorder = '#ef9a9a'; _inputBg = '#fff5f5'; _inputColor = '#c62828';
                        } else if (mi > _hrCurM) {
                            _cellBg = '#f5f5f5'; _inputBorder = 'var(--border-color)'; _inputBg = '#f5f5f5'; _inputColor = '#bdbdbd';
                        }
                    }
                    const _isFuture = _hrIsThisYear && mi > _hrCurM;
                    return `<td style="padding:4px 3px;text-align:center;border:1px solid var(--border-color);background:${_cellBg};">
                        <input type="date" value="${val}"
                            style="width:68px;padding:2px 3px;border:1px solid ${_inputBorder};
                            border-radius:4px;font-size:0.62rem;background:${_inputBg};color:${_inputColor};
                            ${(!canEdit || _isFuture) ? 'pointer-events:none;opacity:0.6;' : ''}"
                            ${(!canEdit || _isFuture) ? 'disabled' : `onchange="hrSetMonthly('${pName}','${f.key}',${mi},this.value)"`}
                            title="${_isFuture ? 'Future month — not yet available' : HR_MONTHS[mi]}">
                    </td>`;
                }).join('');
                const filledCount = HR_MONTHS_SHORT.filter((_, mi) => hrGetMonthly(p, f.key, mi)).length;
                const rowStatus = filledCount === 12 ? '✅' : filledCount > 0 ? `${filledCount}/12` : '—';
                const rowStatusColor = filledCount === 12 ? '#2e7d32' : filledCount > 0 ? '#f57f17' : '#ef5350';
                return `<tr>
                    <td style="padding:6px 10px;font-size:0.72rem;font-weight:600;color:var(--text-primary);
                        border:1px solid var(--border-color);min-width:220px;position:sticky;left:0;z-index:2;
                        background:var(--bg-card);white-space:nowrap;">
                        ${f.label}
                        <div style="font-size:0.6rem;color:var(--text-secondary);font-weight:400;margin-top:1px;">Monthly</div>
                    </td>
                    ${cells}
                    <td style="padding:4px 8px;text-align:center;border:1px solid var(--border-color);
                        font-size:0.68rem;font-weight:700;color:${rowStatusColor};white-space:nowrap;min-width:44px;">
                        ${rowStatus}
                    </td>
                </tr>`;
            } else {
                const val = hrGet(p, f.key);
                const hasVal = !!val;
                return `<tr>
                    <td style="padding:6px 10px;font-size:0.72rem;font-weight:600;color:var(--text-primary);
                        border:1px solid var(--border-color);min-width:220px;position:sticky;left:0;z-index:2;
                        background:var(--bg-card);white-space:nowrap;">
                        ${f.label}
                        <div style="font-size:0.6rem;color:#e65100;font-weight:400;margin-top:1px;">${f.note || 'Annual'}</div>
                    </td>
                    <td colspan="12" style="padding:6px 10px;border:1px solid var(--border-color);background:${hasVal ? '#f1f8f1' : 'var(--bg-card)'};">
                        <div style="display:flex;align-items:center;gap:10px;">
                            <input type="date" value="${val}"
                                style="padding:4px 8px;border:1px solid ${hasVal ? '#a5d6a7' : 'var(--border-color)'};
                                border-radius:5px;font-size:0.75rem;background:var(--input-bg);color:var(--text-primary);
                                ${!canEdit ? 'pointer-events:none;opacity:0.6;' : ''}"
                                ${canEdit ? `onchange="hrSet('${pName}','${f.key}',this.value)"` : 'disabled'}>
                            ${hasVal ? `<span style="font-size:0.65rem;color:#2e7d32;font-weight:700;">${window.icon("ok")} Submitted</span>` : `<span style="font-size:0.65rem;color:#ef5350;">Not yet submitted</span>`}
                        </div>
                    </td>
                    <td style="padding:4px 8px;text-align:center;border:1px solid var(--border-color);
                        font-size:0.68rem;font-weight:700;color:${hasVal ? '#2e7d32' : '#ef5350'};">
                        ${hasVal ? window.icon("ok") : '—'}
                    </td>
                </tr>`;
            }
        }).join('');

        return `
        <div style="border:none;box-shadow:0 2px 8px rgba(0,0,0,0.06);border-radius:8px;overflow:hidden;margin-bottom:8px;">
            <div onclick="hrToggleSection('${sectionId}')"
                style="display:flex;align-items:center;justify-content:space-between;padding:9px 14px;background:var(--input-bg);cursor:pointer;user-select:none;">
                <div style="display:flex;align-items:center;gap:8px;">
                    <i class="fas fa-file-medical-alt" style="color:#2e7d32;font-size:0.85rem;"></i>
                    <span style="font-size:0.78rem;font-weight:700;color:var(--text-primary);text-transform:uppercase;letter-spacing:0.4px;">1. Reporting</span>
                    ${statusBadgeHtml(status)}
                    <span style="font-size:0.62rem;color:var(--text-secondary);font-style:italic;">— Jan to Dec per report type</span>
                </div>
                <i class="fas fa-chevron-down" id="${sectionId}-chev" style="color:var(--text-secondary);font-size:0.7rem;transition:transform 0.2s;"></i>
            </div>
            <div id="${sectionId}" style="display:none;overflow-x:auto;">
                <table style="width:100%;border-collapse:collapse;font-size:0.7rem;min-width:900px;">
                    <thead>
                        <tr>
                            <th style="padding:6px 10px;text-align:left;font-size:0.65rem;font-weight:700;color:var(--text-secondary);
                                border:1px solid var(--border-color);background:var(--input-bg);position:sticky;left:0;z-index:3;min-width:220px;">
                                REPORT TYPE
                            </th>
                            ${monthHeaders}
                            <th style="padding:6px 4px;text-align:center;font-size:0.62rem;font-weight:700;color:var(--text-secondary);
                                border:1px solid var(--border-color);background:var(--input-bg);white-space:nowrap;min-width:44px;">
                                STATUS
                            </th>
                        </tr>
                    </thead>
                    <tbody>${fieldRows}</tbody>
                </table>
            </div>
        </div>`;
    }

    function buildFieldRow(p, f, canEdit) {
        const val = hrGet(p, f.key);
        const pName = p.name.replace(/'/g, "\\'");
        const key = f.key;

        let inputHtml = '';

        if (f.type === 'date') {
            inputHtml = `<input type="date" value="${val}"
                style="border:1px solid var(--border-color);border-radius:6px;padding:5px 8px;font-size:0.75rem;background:var(--input-bg);color:var(--text-primary);min-width:160px;"
                ${canEdit ? '' : 'disabled'}
                onchange="hrSet('${pName}','${key}',this.value)">`;
        } else if (f.type === 'number') {
            inputHtml = `<input type="number" min="0" value="${val}"
                style="border:1px solid var(--border-color);border-radius:6px;padding:5px 8px;font-size:0.75rem;background:var(--input-bg);color:var(--text-primary);width:90px;text-align:center;"
                placeholder="0"
                ${canEdit ? '' : 'disabled'}
                onchange="hrSet('${pName}','${key}',this.value)">`;
        } else if (f.type === 'text') {
            inputHtml = `<input type="text" value="${val}"
                style="border:1px solid var(--border-color);border-radius:6px;padding:5px 10px;font-size:0.75rem;background:var(--input-bg);color:var(--text-primary);min-width:200px;"
                placeholder="Enter value..."
                ${canEdit ? '' : 'disabled'}
                onchange="hrSet('${pName}','${key}',this.value)">`;
        } else if (f.type === 'yesno') {
            const yesActive = val === 'yes';
            const noActive  = val === 'no';
            const btnBase = `border:none;border-radius:20px;padding:4px 14px;font-size:0.7rem;font-weight:700;cursor:${canEdit?'pointer':'default'};transition:all 0.15s;`;
            inputHtml = `<div style="display:flex;gap:6px;">
                <button onclick="${canEdit ? `hrSet('${pName}','${key}','yes')` : ''}"
                    style="${btnBase}background:${yesActive?'#2e7d32':'var(--input-bg)'};color:${yesActive?'white':'var(--text-secondary)'};border:1.5px solid ${yesActive?'#2e7d32':'var(--border-color)'};">
                    YES
                </button>
                <button onclick="${canEdit ? `hrSet('${pName}','${key}','no')` : ''}"
                    style="${btnBase}background:${noActive?'#ef5350':'var(--input-bg)'};color:${noActive?'white':'var(--text-secondary)'};border:1.5px solid ${noActive?'#ef5350':'var(--border-color)'};">
                    NO
                </button>
            </div>`;
        }

        let status = 'none';
        if (f.type === 'yesno') {
            status = (val === 'yes' || val === 'no') ? 'full' : 'none';
        } else if (f.type === 'date' && val) {
            if (f.key.includes('validity') || f.key.includes('moa') || f.key.includes('tsd')) {
                status = new Date(val) >= new Date() ? 'full' : 'partial';
            } else { status = 'full'; }
        } else if (f.type === 'number') {
            const n = parseFloat(val);
            status = (!isNaN(n) && n > 0) ? 'full' : (!isNaN(n) && n === 0 ? 'partial' : 'none');
        } else {
            status = val && val.trim() ? 'partial' : 'none';
        }

        const dot = { full:'#2e7d32', partial:'#fbc02d', none:'#ef5350' }[status];
        const noteHtml = f.note ? `<span style="font-size:0.6rem;color:var(--text-secondary);margin-left:6px;font-style:italic;">${f.note}</span>` : '';

        let rowStyle = '';
        if ((f.key === 'dental_name' || f.key === 'dental_moa') && hrGet(p, 'dental_coverage') !== 'no') rowStyle = 'display:none;';
        if ((f.key === 'biohaz_tempstore' || f.key === 'biohaz_clinic' || f.key === 'tsd_name' || f.key === 'tsd_validity') && hrGet(p, 'biohaz_hauled') === 'yes') rowStyle = 'display:none;';

        return `<div class="hr-field-row" data-proj="${p.name.replace(/"/g,'&quot;')}" data-field="${f.key}"
            style="${rowStyle || 'display:flex;'}align-items:center;justify-content:space-between;gap:10px;padding:8px 14px;border-bottom:1px solid var(--border-color);flex-wrap:wrap;">
            <div style="display:flex;align-items:center;gap:7px;flex:1;min-width:200px;">
                <span style="width:8px;height:8px;border-radius:50%;background:${dot};flex-shrink:0;"></span>
                <span style="font-size:0.75rem;font-weight:600;color:var(--text-primary);">${f.label}</span>
                ${noteHtml}
            </div>
            <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
                ${inputHtml}
            </div>
        </div>`;
    }

    function buildSectionHtml(p, sectionKey, sectionLabel, icon, fields, canEdit, defaultOpen) {
        const sectionId = 'hr-sec-' + p.name.replace(/[^a-z0-9]/gi,'_') + '_' + sectionKey;
        const status = getHrSectionStatus(p, fields);
        const rows = fields.map(f => buildFieldRow(p, f, canEdit)).join('');
        return `
        <div style="border:none;box-shadow:0 2px 8px rgba(0,0,0,0.06);border-radius:8px;overflow:hidden;margin-bottom:8px;">
            <div onclick="hrToggleSection('${sectionId}')"
                style="display:flex;align-items:center;justify-content:space-between;padding:9px 14px;background:var(--input-bg);cursor:pointer;user-select:none;">
                <div style="display:flex;align-items:center;gap:8px;">
                    <i class="fas ${icon}" style="color:#2e7d32;font-size:0.85rem;"></i>
                    <span style="font-size:0.78rem;font-weight:700;color:var(--text-primary);text-transform:uppercase;letter-spacing:0.4px;">${sectionLabel}</span>
                    ${statusBadgeHtml(status)}
                </div>
                <i class="fas fa-chevron-${defaultOpen?'up':'down'}" id="${sectionId}-chev" style="color:var(--text-secondary);font-size:0.7rem;transition:transform 0.2s;"></i>
            </div>
            <div id="${sectionId}" style="display:${defaultOpen?'block':'none'};">
                ${rows}
            </div>
        </div>`;
    }

    function buildProjectCard(p, regionColors, canEdit) {
        const status = getHrComplianceStatus(p);
        const statusHtml = statusBadgeHtml(status);
        const cardId = 'hr-proj-' + p.name.replace(/[^a-z0-9]/gi, '_');

        const reportingHtml   = buildReportingTable(p, canEdit);
        const medFacilityHtml = buildSectionHtml(p, 'medical_fac', '2. Medical Facility', 'fa-hospital',    HR_FIELDS.MEDICAL_FACILITY, canEdit, false);
        const equipmentHtml   = buildSectionHtml(p, 'equipment',   '3. Equipment',        'fa-stethoscope', HR_FIELDS.EQUIPMENT,        canEdit, false);

        return `
        <div id="${cardId}" style="background:var(--bg-card);border:none;border-radius:10px;overflow:hidden;margin-bottom:12px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
            <div style="background:${regionColors.bg};padding:10px 14px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;">
                <div style="display:flex;align-items:center;gap:8px;">
                    <i class="fas fa-building" style="color:${regionColors.badge};font-size:0.85rem;"></i>
                    <span style="font-size:0.82rem;font-weight:800;color:white;letter-spacing:0.3px;">${p.name}</span>
                </div>
                <div id="hr-proj-status-${p.name.replace(/[^a-z0-9]/gi,'_')}" style="display:flex;align-items:center;">
                    ${statusHtml}
                </div>
            </div>
            <div style="padding:12px;">
                ${reportingHtml}
                ${medFacilityHtml}
                ${equipmentHtml}
            </div>
        </div>`;
    }

    window.hrToggleSection = function(sectionId) {
        const el = document.getElementById(sectionId);
        const chev = document.getElementById(sectionId + '-chev');
        if (!el) return;
        const isOpen = el.style.display !== 'none';
        el.style.display = isOpen ? 'none' : 'block';
        if (chev) { chev.classList.toggle('fa-chevron-up', !isOpen); chev.classList.toggle('fa-chevron-down', isOpen); }
    };

    let _hrCollapsed = {};
    window.hrToggleRegion = function(region) {
        _hrCollapsed[region] = !_hrCollapsed[region];
        renderHealthReport();
    };

    window.renderHealthReport = function() {
        const container = document.getElementById('health-report-regions-container');
        if (!container) return;

        const projects  = getReportProjects();
        const userEmail = state && state.currentUser ? state.currentUser.email : '';
        let html = '';

        HR_REGIONS.forEach(region => {
            const regionProjects = projects.filter(p => p.region === region);
            if (!regionProjects.length) return;

            const rc        = HR_REGION_COLORS[region] || HR_REGION_COLORS['NCR'];
            const collapsed = _hrCollapsed[region];
            const regionId  = 'hr-region-' + region.replace(/[^a-z0-9]/gi, '_');

            let rFull = 0, rPartial = 0, rNone = 0;
            regionProjects.forEach(p => {
                const s = getHrComplianceStatus(p);
                if (s === 'full') rFull++;
                else if (s === 'partial') rPartial++;
                else rNone++;
            });

            html += `
            <div style="background:var(--bg-card);border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);border:none;margin-bottom:16px;">
                <div onclick="hrToggleRegion('${region}')" style="background:${rc.bg};padding:12px 18px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;user-select:none;">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <i class="fas fa-map-marker-alt" style="color:${rc.badge};"></i>
                        <span style="font-size:0.9rem;font-weight:800;color:white;letter-spacing:0.5px;">${region}</span>
                        <span style="font-size:0.68rem;background:rgba(255,255,255,0.15);color:white;padding:2px 8px;border-radius:20px;font-weight:600;">${regionProjects.length} project${regionProjects.length>1?'s':''}</span>
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span style="font-size:0.68rem;background:rgba(76,175,80,0.3);color:#c8e6c9;padding:2px 8px;border-radius:12px;font-weight:700;">${rFull} ✓ Full</span>
                        ${rPartial ? `<span style="font-size:0.68rem;background:rgba(251,192,45,0.25);color:#fff176;padding:2px 8px;border-radius:12px;font-weight:700;">${rPartial} ~ Partial</span>` : ''}
                        ${rNone    ? `<span style="font-size:0.68rem;background:rgba(239,83,80,0.25);color:#ef9a9a;padding:2px 8px;border-radius:12px;font-weight:700;">${rNone} ✗ None</span>` : ''}
                        <i class="fas fa-chevron-${collapsed?'down':'up'}" style="color:rgba(255,255,255,0.7);font-size:0.75rem;margin-left:6px;"></i>
                    </div>
                </div>
                <div id="${regionId}" style="${collapsed?'display:none;':''}padding:14px;">`;

            let _hrNavProjs = regionProjects;
            if (regionProjects.length > 1) {
                const _hrNk = _tabNavKey('health-report', region);
                let _hrIdx = Math.min(_tabRegionProjectIdx[_hrNk] || 0, regionProjects.length - 1);
                _tabRegionProjectIdx[_hrNk] = _hrIdx;
                _hrNavProjs = [regionProjects[_hrIdx]];
                html += _tabNavBar('health-report', region, _hrIdx, regionProjects.length);
            }

            _hrNavProjs.forEach(p => {
                const canEdit = typeof UserAccounts !== 'undefined'
                    ? (state.isEditing && UserAccounts.canEdit(userEmail, p.region) && UserAccounts.canEditTab(userEmail, 'health-report'))
                    : !!state.isEditing;
                html += buildProjectCard(p, rc, canEdit);
            });

            html += `</div></div>`;
        });

        if (!html) {
            html = `<div style="text-align:center;padding:50px;color:var(--text-secondary);font-size:0.85rem;">
                <i class="fas fa-folder-open" style="font-size:2rem;opacity:0.3;display:block;margin-bottom:12px;"></i>
                No projects found. Add projects in settings to begin monitoring.
            </div>`;
        }

        // ── Preserve opened/closed report sections across re-render ──
        const _hrSecState = {};
        container.querySelectorAll('[id^="hr-sec-"]').forEach(function(el) {
            if (!/-chev$/.test(el.id)) _hrSecState[el.id] = el.style.display;
        });
        container.innerHTML = html;
        Object.keys(_hrSecState).forEach(function(id) {
            const el = document.getElementById(id);
            if (!el) return;
            el.style.display = _hrSecState[id];
            const ch = document.getElementById(id + '-chev');
            if (ch) {
                const open = _hrSecState[id] !== 'none';
                ch.classList.toggle('fa-chevron-up', open);
                ch.classList.toggle('fa-chevron-down', !open);
            }
        });
        renderHealthReportSummaryBadges();
    };

})();
