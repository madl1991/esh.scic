
// ── CORPORATE KPM — Row definitions (from CO-KPM-WDA-ESH reference) ──────────
window.CORP_KPM_ROWS = [
    { id:'c1', kpm:'1', wp:'ESH Manager', del:'Corporate',
      dw:0.45, measure:'Timeliness of submission of ESH reports & Compliance',
      kpi:['75%','80%','85%','90%','95%'] },
    { id:'c2', kpm:'2', wp:'ISO Compliance', del:'IMS / ISO Requirements',
      dw:0.15, measure:'Timeliness of compliance to<br>- IMS Documentation<br>- Audit Response/ROTP, etc.',
      kpi:['≥75% on time','≥80% on time','≥85% on time','≥90% on time',''],
      epOpts:['75%','80%','85%','90%'] },
    { id:'c3', kpm:'3', wp:'Average KPI for ESH Heads, PCO & Nurses',
      del:'Consolidation of ESH reports of ESH Superintendents, ESH Heads, PCO & Nurse',
      dw:0.25, measure:'Timeliness of submission of reports of<br>-ESH Superintendents<br>-Corporate Nurse<br>-Corporate PCO<br>-ESH Heads',
      kpi:['≥76% on time','≥81% on time','≥86% on time','≥91% on time',''],
      epOpts:['75%','80%','85%','90%'] },
    { id:'c4', kpm:'4', wp:'Compliance', del:'Environmental Programs',
      dw:0.07, measure:'Zero environmental complaints, violations or environmental findings',
      kpi:['with environmental violations, ESH committee findings or environmental complaints from other stakeholders','','','','ZERO environmental violation report, ESH committee findings or environmental'],
      epOpts:['75%','95%'] },
    { id:'c5', kpm:'', wp:'', del:'Occupational Safety and Health Programs',
      dw:0.08, measure:'Zero OS&H accidents/incidents, violations, complaints and findings',
      kpi:['incurred accidents, OSH violations and complaints or with','','','','ZERO accident, OSH violation, complaints or ESH Committee'],
      epOpts:['75%','95%'] },
];

// ── Corporate KPM row templates. CORP_KPM_ROWS = Corporate Manager; the others are below. Personnel are registered in the dashboard, not hardcoded. ──
window.CORP_KPM_ROWS_CSO = [
    { id:"s1", kpm:"1", wp:"Implementation of Safety Programs", del:"Safety Inspection",
      dw:0.15, measure:"No. of Identified Safety Issues/ Violation(Jobsites, Temfacil and Barracks)",
      kpi:["No identified Safety Issues/Violation", "", "Identified Safety Issues/ Violation reported within the day", "of 100 % Identified Safety Issues/ Violation are closed within the month", ""],
      epOpts:["75%", "85%", "90%"] },
    { id:"s2", kpm:"", wp:"", del:"",
      dw:0.15, measure:"Full implementation of Permit to Work system",
      kpi:["No issuance of NOV due to working without permit.", "", "Issuance of NOV due to working without permit", "greater than 50 % issued NOV due to working without permit are closed.", "100 % issued NOV due to working without permit are closed."],
      epOpts:["75%", "85%", "90%", "95%"] },
    { id:"s3", kpm:"", wp:"", del:"",
      dw:0.15, measure:"Mandatory Safety Inspection( Lifting Accessories,Power Tools, Heavy Equipment and etc.)",
      kpi:["50% of Mandatory safety inspection conducted as per schedule", "", "85% of Mandatory Safety Inspection conducted as per schedule", "100 % of Mandatory Safety Inspection conducted as per schedule", ""],
      epOpts:["75%", "85%", "90%"] },
    { id:"s4", kpm:"", wp:"", del:"",
      dw:0.1, measure:"Timeliness in the submission of Safety Inspection Reports",
      kpi:["submission of reports after 24 hours.", "", "Submission of Reports within 24 hours", "Ahead submission of reports before the 12 hours", ""],
      epOpts:["75%", "85%", "90%"] },
    { id:"s5", kpm:"", wp:"", del:"Zero LTA",
      dw:0.1, measure:"Safe-Man hours",
      kpi:["With Lost Time Accident", "", "", "", "Without Lost Time Accident"],
      epOpts:["75%", "95%"] },
    { id:"s6", kpm:"", wp:"", del:"",
      dw:0.1, measure:"Monitoring of Medical Treatment due to work related Injuries",
      kpi:[">5 Medical Treatment due to work related Injuries", "", "<5 Medical Treatment due to work related Injuries", "Zero Medical treatment due to work related Injuries", ""],
      epOpts:["75%", "85%", "90%"] },
    { id:"s7", kpm:"", wp:"", del:"",
      dw:0.1, measure:"Incident/Accident Reporting",
      kpi:["Incident/Accident Reported after 24 hours", "", "Incident/Accident Reported within 24 hours", "No incident/Accident within the month", ""],
      epOpts:["75%", "85%", "90%"] },
    { id:"s8", kpm:"3", wp:"Compliance", del:"Environmental Programs",
      dw:0.07, measure:"Zero environmental complaints, violations or environmental findings",
      kpi:["with environmental violations, ESH committee findings or environmental complaints from other stakeholders", "", "", "", "ZERO environmental violation report, ESH committee findings or environmental complaints from other stakeholders"],
      epOpts:["75%", "95%"] },
    { id:"s9", kpm:"", wp:"", del:"Occupational Safety and Health Programs",
      dw:0.08, measure:"Zero OS&H accidents/incidents, violations, complaints and findings",
      kpi:["incurred accidents,OSH violations and complaints or with ESH Committee findings", "", "", "", "ZERO accident, OSH violation, complaints or ESH Committee findings"],
      epOpts:["75%", "95%"] },
];

window.CORP_KPM_ROWS_ESHHEAD = [
    { id:"e1", kpm:"1", wp:"Consolidation of Environmental Requirements", del:"SMR/CMR/ENVIRONMENTAL PROGRAMS",
      dw:0.15, measure:"Timeliness of submission of Environmental reports",
      kpi:["≤75%", "≥80%", "≥85%", "≥90%", "≥95%"],
      epOpts:["75%", "80%", "85%", "90%", "95%"] },
    { id:"e2", kpm:"2", wp:"Average KPI for Project PCO", del:"Submission of PCO on environmental compliance reports",
      dw:0.15, measure:"Average % Compliance for KPM Project PCO",
      kpi:["≤75%", "≥80%", "≥85%", "≥90%", "≥95%"],
      epOpts:["75%", "80%", "85%", "90%", "95%"] },
    { id:"e3", kpm:"3", wp:"Consolidation of KPI", del:"Consolidated Monthly KPI of PCO",
      dw:0.15, measure:"Timeliness of submission of PCO KPI",
      kpi:["≤75%", "≥80%", "≥85%", "≥90%", "≥95%"],
      epOpts:["75%", "80%", "85%", "90%", "95%"] },
    { id:"e4", kpm:"4", wp:"Environmental Aspects/Impacts", del:"AIIAC/ROTP",
      dw:0.15, measure:"Timeliness of submission of AIIAC & ROTP",
      kpi:["≤75%", "≥80%", "≥85%", "≥90%", "≥95%"],
      epOpts:["75%", "80%", "85%", "90%", "95%"] },
    { id:"e5", kpm:"5", wp:"Project ALOR", del:"Environmental ALOR",
      dw:0.25, measure:"Timeliness of compliance to Report Submission",
      kpi:["≥ 75% of requirements met on time", "≥ 80% of requirements met on time", "≥ 85% of requirements met on time", "≥ 90% of requirements met on time", "≥ 95% of requirements met on time"],
      epOpts:["75%", "80%", "85%", "90%", "95%"] },
    { id:"e6", kpm:"6", wp:"ESH Compliance", del:"Environmental Programs",
      dw:0.07, measure:"Zero environmental complaints, violations or environmental findings",
      kpi:["with environmental violations, ESH committee findings or environmental complaints from other stakeholders", "", "", "", "ZERO environmental violation report, ESH committee findings or environmental complaints from other stakeholders"],
      epOpts:["75%", "95%"] },
    { id:"e7", kpm:"", wp:"", del:"Occupational Safety and Health Programs",
      dw:0.08, measure:"Zero OS&H accidents/incidents, violations, complaints and findings",
      kpi:["incurred accidents,OSH violations and complaints or with ESH Committee findings", "", "", "", "ZERO accident, OSH violation, complaints or ESH Committee findings"],
      epOpts:["75%", "95%"] },
];

window.CORP_KPM_TEMPLATES = {
    manager: { label:'Corporate Manager',                     role:'Corporate Manager',                     badge:'MGR', rowsKey:'CORP_KPM_ROWS',         wpLabel:'Work Process', lastCol:'Status',  metaLabel:'Manager',   titleSuffix:'CORPORATE',                             docCode:'Doc Code: FM-RNI-04-03 l Rev. No.: 4 l Eff. Date: 06 Aug 2018' },
    cso:     { label:'Corporate Safety Officer',              role:'Corporate Safety Officer',              badge:'CSO', rowsKey:'CORP_KPM_ROWS_CSO',     wpLabel:'Work Process', lastCol:'Remarks', metaLabel:'Personnel', titleSuffix:'CORPORATE SAFETY OFFICER',              docCode:'Doc Code: FM-RNI-04-04 l Rev. No.: 4 l Eff. Date: 06 Aug 2018' },
    envi:    { label:'Environmental and Sustainability Head', role:'Environmental and Sustainability Head', badge:'ENV', rowsKey:'CORP_KPM_ROWS_ESHHEAD', wpLabel:'KPI',          lastCol:'Status',  metaLabel:'Personnel', titleSuffix:'ENVIRONMENTAL AND SUSTAINABILITY HEAD', docCode:'Doc Code: FM-RNI-04-03 l Rev. No.: 4 l Eff. Date: 06 Aug 2018' }
};

// ── Roster: personnel are registered in the dashboard (stored in Firestore with the rest of Corporate KPM) ──
// Each entry: { id, name, tpl, start:'YYYY-MM', end:'' | 'YYYY-MM' }. id is a permanent integer string used in the data keys.
window.CORP_KPM_ROSTER_KEY  = 'corp_kpm_roster';
window.CORP_KPM_MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

window.corpKpmGetRoster = function() {
    var raw = ((typeof state !== 'undefined' && state && state.companyData) || {})[window.CORP_KPM_ROSTER_KEY];
    var arr = [];
    try { arr = (typeof raw === 'string') ? JSON.parse(raw) : (Array.isArray(raw) ? raw : []); } catch (e) { arr = []; }
    if (!Array.isArray(arr)) arr = [];
    return arr.filter(function(p) {
        return p && p.id !== undefined && p.id !== null && p.name && window.CORP_KPM_TEMPLATES[p.tpl] && /^\d{4}-\d{2}$/.test(p.start || '');
    }).map(function(p) {
        return { id: String(p.id), name: String(p.name), tpl: p.tpl, start: p.start, end: (/^\d{4}-\d{2}$/.test(p.end || '') ? p.end : '') };
    }).sort(function(a, b) {
        // Order by position (Corporate Manager → Environmental Head → Corporate Safety Officer),
        // then by KPM start month, then by id — never by registration order
        var ORDER = { manager: 0, envi: 1, cso: 2 };
        var oa = (ORDER[a.tpl] !== undefined ? ORDER[a.tpl] : 99), ob = (ORDER[b.tpl] !== undefined ? ORDER[b.tpl] : 99);
        if (oa !== ob) return oa - ob;
        if (a.start !== b.start) return a.start < b.start ? -1 : 1;
        return (parseInt(a.id, 10) || 0) - (parseInt(b.id, 10) || 0);
    });
};
window.corpKpmSaveRoster = function(arr) {
    if (!state.companyData) state.companyData = {};
    var json = JSON.stringify(arr);
    state.companyData[window.CORP_KPM_ROSTER_KEY] = json;
    window.corpKpmSaveToFirestore(window.CORP_KPM_ROSTER_KEY, json);
};
window.corpKpmTag = function(name) {
    var t = String(name || '').replace(/[^A-Za-z ]/g, ' ').split(/\s+/).filter(Boolean).map(function(w) { return w.charAt(0); }).join('').toUpperCase();
    return (t || 'KPM').substring(0, 6);
};
window.corpKpmYmIndex = function(ym) { var a = String(ym).split('-'); return parseInt(a[0], 10) * 12 + (parseInt(a[1], 10) - 1); };
window.corpKpmFmtYm   = function(ym) { var a = String(ym).split('-'); return window.CORP_KPM_MONTH_NAMES[parseInt(a[1], 10) - 1].substring(0, 3) + ' ' + a[0]; };
window.corpKpmActiveInMonth = function(p, year, moIdx) {
    var v = year * 12 + moIdx;
    if (v < window.corpKpmYmIndex(p.start)) return false;
    if (p.end && v > window.corpKpmYmIndex(p.end)) return false;
    return true;
};
window.corpKpmActiveInYear = function(p, year) {
    for (var m = 0; m < 12; m++) { if (window.corpKpmActiveInMonth(p, year, m)) return true; }
    return false;
};
// Scan saved Corporate KPM data and report which person ids have data (and for which months)
window.corpKpmDataSlots = function() {
    var cd = ((typeof state !== 'undefined' && state && state.companyData) || {});
    var slots = {};
    Object.keys(cd).forEach(function(k) {
        var m = /^corp_kpm_(?:na_)?(\d{4})_(\d+)_([A-Za-z]+)(?:_.*)?$/.exec(k);
        if (!m) return;
        var val = cd[k];
        if (val === '' || val === null || val === undefined) return;
        var mi = window.CORP_KPM_MONTH_NAMES.indexOf(m[3]);
        if (mi < 0) return;
        if (!slots[m[2]]) slots[m[2]] = { id: m[2], months: {} };
        slots[m[2]].months[m[1] + '-' + (mi < 9 ? '0' : '') + (mi + 1)] = true;
    });
    return slots;
};
window.corpKpmFreeId = function() {
    var max = -1;
    window.corpKpmGetRoster().forEach(function(p) { var n = parseInt(p.id, 10); if (n > max) max = n; });
    var slots = window.corpKpmDataSlots();
    Object.keys(slots).forEach(function(id) { var n = parseInt(id, 10); if (n > max) max = n; });
    return String(max + 1);
};

// ── Register / Edit personnel modal (WDA admin only) ──
window.corpKpmOpenPersonModal = function(pid) {
    if (!state.currentUser || state.currentUser.email !== 'esh@wda.com.ph') {
        if (typeof showToast === 'function') showToast('Only the WDA System Admin can register or edit personnel.', 'warning');
        return;
    }
    var T = window.CORP_KPM_TEMPLATES;
    var roster = window.corpKpmGetRoster();
    var isEdit = (pid !== undefined && pid !== null && pid !== '');
    var p = isEdit ? roster.filter(function(x) { return x.id === String(pid); })[0] : null;
    if (isEdit && !p) return;
    var slots = window.corpKpmDataSlots();
    var used = {}; roster.forEach(function(x) { used[x.id] = true; });
    var orphans = Object.keys(slots).filter(function(id) { return !used[id]; })
                        .sort(function(a, b) { return parseInt(a, 10) - parseInt(b, 10); });
    var hasData = isEdit && !!slots[p.id];
    var esc = function(v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
    var rangeOf = function(slot) { var k = Object.keys(slot.months).sort(); return window.corpKpmFmtYm(k[0]) + (k.length > 1 ? ' – ' + window.corpKpmFmtYm(k[k.length - 1]) : ''); };

    var old = document.getElementById('corp-kpm-person-modal'); if (old) old.remove();

    var tplOpts = Object.keys(T).map(function(k) {
        return '<option value="' + k + '"' + ((p ? p.tpl : 'manager') === k ? ' selected' : '') + '>' + esc(T[k].label) + '</option>';
    }).join('');

    var linkHtml = '';
    if (!isEdit && orphans.length) {
        var linkOpts = '<option value="">— None (start a new, empty KPM) —</option>' + orphans.map(function(id) {
            var firstYm = Object.keys(slots[id].months).sort()[0];
            return '<option value="' + id + '" data-start="' + firstYm + '">Previous data found: ' + rangeOf(slots[id]) + ' (slot ' + id + ')</option>';
        }).join('');
        linkHtml = `<div style="margin-top:12px;">
            <label style="font-size:0.7rem;font-weight:700;color:#444;">Link previous KPM data <span style="font-weight:400;color:#888;">(only if this is the same person)</span></label>
            <select id="ckpm-p-link" onchange="(function(s){var o=s.options[s.selectedIndex];var st=document.getElementById('ckpm-p-start');if(o&&o.getAttribute('data-start')&&st&&!st.value)st.value=o.getAttribute('data-start');})(this)" style="width:100%;margin-top:4px;padding:7px 9px;border:1.5px solid #a5d6a7;border-radius:6px;font-size:0.8rem;">${linkOpts}</select>
        </div>`;
    }
    var endHtml = isEdit ? `<div style="margin-top:12px;">
            <label style="font-size:0.7rem;font-weight:700;color:#444;">End month <span style="font-weight:400;color:#888;">(last month of KPM — leave blank if still active)</span></label>
            <input type="month" id="ckpm-p-end" value="${esc(p.end)}" style="width:100%;margin-top:4px;padding:7px 9px;border:1.5px solid #a5d6a7;border-radius:6px;font-size:0.8rem;box-sizing:border-box;">
        </div>` : '';
    var arg = isEdit ? ("'" + p.id + "'") : 'null';
    var delBtn = isEdit ? '<button onclick="window._ckpmPersonDelete(' + arg + ')" class="mdl-btn danger" style="margin-right:auto;"><i class="fas fa-trash" style="margin-right:6px;"></i>Delete</button>' : '';

    var overlay = document.createElement('div');
    overlay.id = 'corp-kpm-person-modal';
    window.eshMountModal(overlay, {
        id: 'corp-kpm-person-modal', icon: 'fa-user-tie', width: 460,
        title: `${isEdit ? 'Edit personnel' : 'Register personnel'}`,
        sub: `${isEdit ? 'Correct the details or set an end month' : 'The KPM starts on the start month you choose'}`,
        body: `<div style="padding:18px 22px 6px;">
            <label style="font-size:0.7rem;font-weight:700;color:#444;">Full name</label>
            <input type="text" id="ckpm-p-name" value="${esc(p ? p.name : '')}" placeholder="e.g. JUAN D. DELA CRUZ" style="width:100%;margin-top:4px;padding:7px 9px;border:1.5px solid #a5d6a7;border-radius:6px;font-size:0.8rem;text-transform:uppercase;box-sizing:border-box;">
            <div style="margin-top:12px;">
                <label style="font-size:0.7rem;font-weight:700;color:#444;">Position (KPM template)</label>
                <select id="ckpm-p-tpl" ${hasData ? 'disabled' : ''} style="width:100%;margin-top:4px;padding:7px 9px;border:1.5px solid #a5d6a7;border-radius:6px;font-size:0.8rem;">${tplOpts}</select>
                ${hasData ? '<div style="font-size:0.62rem;color:#888;margin-top:3px;">Locked — this person already has KPM data.</div>' : ''}
            </div>
            <div style="margin-top:12px;">
                <label style="font-size:0.7rem;font-weight:700;color:#444;">Start month</label>
                <input type="month" id="ckpm-p-start" value="${esc(p ? p.start : '')}" style="width:100%;margin-top:4px;padding:7px 9px;border:1.5px solid #a5d6a7;border-radius:6px;font-size:0.8rem;box-sizing:border-box;">
            </div>
            ${endHtml}
            ${linkHtml}
        </div>
        `,
        foot: `${delBtn}<button class="mdl-btn neutral" onclick="eshCloseModal('corp-kpm-person-modal')">Cancel</button><button class="mdl-btn primary" onclick="window._ckpmPersonSave(${arg})"><i class="fas fa-save" style="margin-right:6px;"></i>${isEdit ? 'Save Changes' : 'Register'}</button>`
    });
    // outside click disabled — use the X button to close
};

window._ckpmPersonDelete = function(pid) {
    if (!state.currentUser || state.currentUser.email !== 'esh@wda.com.ph') return;
    var id = String(pid);
    var roster = window.corpKpmGetRoster();
    var p = roster.filter(function(x) { return x.id === id; })[0];
    if (!p) return;
    var slot = window.corpKpmDataSlots()[id];
    var msg = 'Delete "' + p.name + '" from the Corporate KPM list?'
        + (slot ? '\n\nHis/her saved KPM data (' + Object.keys(slot.months).length + ' month(s)) will NOT be erased, but will no longer be shown. It can be re-linked when registering again.' : '');
    if (!window.confirm(msg)) return;
    window.corpKpmSaveRoster(roster.filter(function(x) { return x.id !== id; }));
    var m = document.getElementById('corp-kpm-person-modal'); if (m) m.remove();
    if (typeof window.renderCorporateKpm === 'function') window.renderCorporateKpm();
    if (typeof showToast === 'function') showToast('Personnel deleted.', 'success');
};

window._ckpmPersonSave = function(pid) {
    if (!state.currentUser || state.currentUser.email !== 'esh@wda.com.ph') return;
    var toast = function(m, t) { if (typeof showToast === 'function') showToast(m, t || 'warning'); };
    var val = function(id) { var el = document.getElementById(id); return el ? String(el.value || '') : ''; };
    var name  = val('ckpm-p-name').replace(/\s+/g, ' ').trim().toUpperCase();
    var tpl   = val('ckpm-p-tpl');
    var start = val('ckpm-p-start');
    var end   = val('ckpm-p-end');
    var link  = val('ckpm-p-link');
    if (!name) { toast('Please enter the full name.'); return; }
    if (!window.CORP_KPM_TEMPLATES[tpl]) { toast('Please choose a position.'); return; }
    if (!/^\d{4}-\d{2}$/.test(start)) { toast('Please choose the start month.'); return; }
    if (end && !/^\d{4}-\d{2}$/.test(end)) end = '';
    if (end && end < start) { toast('The end month cannot be earlier than the start month.'); return; }
    var roster = window.corpKpmGetRoster();
    var isEdit = (pid !== undefined && pid !== null && pid !== '');
    var id = isEdit ? String(pid) : (link !== '' ? String(link) : window.corpKpmFreeId());
    if (isEdit && !roster.some(function(p) { return p.id === id; })) return;
    var slot = window.corpKpmDataSlots()[id];
    if (slot) {
        var outside = Object.keys(slot.months).filter(function(ym) { return ym < start || (end && ym > end); });
        if (outside.length && !window.confirm('This person has saved KPM data for ' + outside.length + ' month(s) outside the new period. The data will not be deleted but will no longer be shown. Continue?')) return;
    }
    if (isEdit) {
        roster = roster.map(function(p) { return p.id === id ? { id: id, name: name, tpl: tpl, start: start, end: end } : p; });
    } else {
        roster.push({ id: id, name: name, tpl: tpl, start: start, end: '' });
    }
    window.corpKpmSaveRoster(roster);
    var m = document.getElementById('corp-kpm-person-modal'); if (m) m.remove();
    if (typeof window.renderCorporateKpm === 'function') window.renderCorporateKpm();
    toast(isEdit ? 'Personnel updated.' : 'Personnel registered.', 'success');
};

// ── Corporate KPM Firestore persistence ──────────────────────────────────────
// Shared doc lives under the master admin UID's sharedData subcollection, which
// firestore.rules already allows: read for any SCIC user, write for
// admin/superintendent/pco/envi_head roles (the WDA System Admin account has
// role 'admin', so it can write here).
window.CORP_KPM_ADMIN_UID = 'fUnXsvKnRYMpuySRbeVYJk7TO452';
window.CORP_KPM_DOC_PATH  = ['users', window.CORP_KPM_ADMIN_UID, 'sharedData', 'corporateKpm'];

window.corpKpmSaveToFirestore = function(key, val) {
    if (!window.firebaseDb || !window.firebase?.doc || !window.firebase?.setDoc) {
        return;
    }
    try {
        var ref = window.firebase.doc.apply(null, [window.firebaseDb].concat(window.CORP_KPM_DOC_PATH));
        window.firebase.setDoc(ref, { [key]: val, _updatedAt: new Date().toISOString() }, { merge: true })
            .catch(function(e) { console.error('❌ Corporate KPM save failed:', e.message); if (typeof showToast === 'function') showToast('Failed to save Corporate KPM to cloud: ' + e.message, 'error'); });
    } catch(e) {
        console.error('❌ Corporate KPM save error:', e.message);
    }
};

// Real-time listener — call once after login so state.companyData stays in
// sync across devices/tabs. Re-renders the Corporate KPM tab if it's open.
window.corpKpmAttachSync = function() {
    if (!window.firebaseDb || !window.firebase?.doc || !window.firebase?.onSnapshot) return;
    if (window._corpKpmUnsubscribe) { try { window._corpKpmUnsubscribe(); } catch(e) {} }
    try {
        var ref = window.firebase.doc.apply(null, [window.firebaseDb].concat(window.CORP_KPM_DOC_PATH));
        window._corpKpmUnsubscribe = window.firebase.onSnapshot(ref, function(snap) {
            if (!snap.exists()) return;
            var data = snap.data();
            if (!state.companyData) state.companyData = {};
            Object.keys(data).forEach(function(k) { if (k !== '_updatedAt') state.companyData[k] = data[k]; });
            if (document.getElementById('ckpm-root')) {
                if (typeof window.renderCorporateKpm === 'function') window.renderCorporateKpm();
            }
        }, function(err) {  });
    } catch(e) {
    }
};

// ── renderCorporateKpm: renders the Corporate KPM tab, matching the KPM tab layout ──
window.renderCorporateKpm = function() {
    const container = document.getElementById('dashboard-content');
    if (!container) return;

    const CORP_KPM_ALLOWED = ['esh@wda.com.ph','esh@tgm.com.ph','esh@mab.com.ph','esh@lmp.com.ph','esh@corpdc.com.ph','esh@cbmganda.com.ph','esh@scic.com.ph'];
    const isWdaAdmin = (state.currentUser?.email === 'esh@wda.com.ph');
    // Edit controls (Register Personnel / + Add Entry / Edit) only appear once the global Edit button is clicked
    const canEditNow = isWdaAdmin && !!state.isEditing;
    if (!CORP_KPM_ALLOWED.includes(state.currentUser?.email)) {
        container.innerHTML = ('<div style="padding:40px;text-align:center;color:#c62828;font-weight:700;">' + window.icon("lock") + ' Access Restricted — Corporate KPM is not accessible for your account.</div>');
        return;
    }

    const TEMPLATES  = window.CORP_KPM_TEMPLATES;
    const year = state.selectedYear || new Date().getFullYear();
    const KPM_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const MO_SHORT   = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    const curMoIdx   = new Date().getMonth();
    // Last COMPLETED month index for the selected year: current month is still ongoing, so it is not listed yet
    const _ckNow = new Date();
    const lastDoneIdx = year < _ckNow.getFullYear() ? 11 : (year === _ckNow.getFullYear() ? _ckNow.getMonth() - 1 : -1);

    // ── Roster: only personnel whose KPM period overlaps the selected year ──
    const ROSTER = window.corpKpmGetRoster().filter(function(p) { return window.corpKpmActiveInYear(p, year); });
    const getP    = function(id) { return window.corpKpmGetRoster().filter(function(p) { return p.id === String(id); })[0]; };
    const tplOf   = function(id) { var p = getP(id); return (p && TEMPLATES[p.tpl]) || TEMPLATES.manager; };
    const rowsFor = function(id) { return window[tplOf(id).rowsKey] || []; };
    const isActiveMo     = function(id, moIdx) { var p = getP(id); return !!p && window.corpKpmActiveInMonth(p, year, moIdx); };
    const activeMonthsOf = function(id) { return KPM_MONTHS.filter(function(mo, i) { return isActiveMo(id, i); }); };
    function esc(v) { return String(v == null ? '' : v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

    // ── Data helpers — keys use the permanent person id ──
    function ckGet(mgrIdx, mo, key) {
        return ((state.companyData || {})['corp_kpm_' + year + '_' + mgrIdx + '_' + mo + '_' + key]) || '';
    }
    function ckSet(mgrIdx, mo, key, val) {
        var k = 'corp_kpm_' + year + '_' + mgrIdx + '_' + mo + '_' + key;
        if (!state.companyData) state.companyData = {};
        state.companyData[k] = val;
        window.corpKpmSaveToFirestore(k, val);
    }
    function ckIsNA(mgrIdx, mo) {
        return !!((state.companyData || {})['corp_kpm_na_' + year + '_' + mgrIdx + '_' + mo]);
    }
    function mgrMonthScore(mgrIdx, mo) {
        if (!isActiveMo(mgrIdx, KPM_MONTHS.indexOf(mo))) return null;
        var grand = 0, hasAny = false;
        rowsFor(mgrIdx).forEach(function(row) {
            var raw = String(ckGet(mgrIdx, mo, row.id + '_ep') || '').replace('%','').trim();
            var n = parseFloat(raw);
            if (!isNaN(n)) { hasAny = true; grand += (n / 100) * row.dw; }
        });
        return hasAny ? grand : null;
    }

    // ── Summary scorecard ──
    var moScores = ROSTER.map(function(p) {
        return KPM_MONTHS.map(function(mo) { return mgrMonthScore(p.id, mo); });
    });
    function cellBg(v){ return v>=0.90?'#e8f5e9':v>=0.85?'#fff8e1':'#ffebee'; }
    function cellFg(v){ return v>=0.90?'#1b5e20':v>=0.85?'#7a5c00':'#c62828'; }

    var thCells = window.rptHead('Personnel', MO_SHORT, curMoIdx, true);

    var bodyRows = ROSTER.length ? ROSTER.map(function(p, pi) {
        var scores = moScores[pi];
        var validScores = scores.filter(function(v){return v!==null;});
        var avg = validScores.length ? validScores.reduce(function(s,v){return s+v;},0)/validScores.length : null;
        var cells = window.rptRowHead(esc(p.name), esc(TEMPLATES[p.tpl].role));
        scores.forEach(function(v, idx) {
            if (!isActiveMo(p.id, idx)) {
                cells += '<td class="off" title="Outside KPM period"></td>';
            } else {
                cells += window.rptTd(v, idx, curMoIdx, 'kpm');
            }
        });
        cells += window.rptAvgTd(avg, 'kpm');
        return '<tr>' + cells + '</tr>';
    }).join('') : '<tr><td colspan="14" class="rpt-empty">No personnel registered for ' + year + ' yet.' + (canEditNow ? ' Click "Register Personnel" to add one.' : (isWdaAdmin ? ' Click the Edit button to register personnel.' : '')) + '</td></tr>';

    var _ckBadge = isWdaAdmin
        ? (canEditNow ? '<span style="margin-left:auto;display:flex;align-items:center;gap:8px;"><button onclick="window.corpKpmOpenPersonModal()" style="background:#2e7d32;color:#fff;border:none;border-radius:6px;padding:5px 12px;font-size:0.68rem;font-weight:700;cursor:pointer;"><i class="fas fa-user-plus" style="margin-right:5px;"></i>Register Personnel</button></span>' : '')
        : '<span class="rpt-pill view" style="margin-left:auto;" title="Only the WDA System Admin can make changes"><i class="fas fa-eye" style="margin-right:3px;"></i>View only</span>';

    var summaryHtml = window.rptCard('', 'Weighted % per personnel per month · Year: ' + year, _ckBadge, thCells, bodyRows, 'kpm');
    summaryHtml = summaryHtml.replace('class="rpt-wrap rpt-score"', 'class="rpt-wrap rpt-score ckpm-sum"');

    // ── Build per-personnel sections (one per registered person active in the selected year) ──
    var managersHtml = '';
    ROSTER.forEach(function(p, pi) {
        var mi = p.id;                       // permanent person id — DOM ids, collapse state and data keys
        var tpl = TEMPLATES[p.tpl];
        var lsKey = 'corpKpmCollapsed_' + mi;
        var isCollapsed = (function(){ try { return localStorage.getItem(lsKey) === '1'; } catch(e){ return false; } })();

        var periodMonths = KPM_MONTHS.filter(function(mo, idx) { return idx <= lastDoneIdx && isActiveMo(mi, idx); });
        var submittedCount = 0;
        periodMonths.forEach(function(mo) { if (ckGet(mi, mo, 'dateSubmitted')) submittedCount++; });
        var periodLabel = window.corpKpmFmtYm(p.start) + ' – ' + (p.end ? window.corpKpmFmtYm(p.end) : 'Present');

        // Banner for this person
        managersHtml += '<div id="ckpm-mgr-banner-' + mi + '" class="region-banner' + (isCollapsed?' collapsed':'') + ' rb-editable"'
            + ' onclick="window.corpKpmToggleMgr(' + mi + ',event)">'
            + '<div class="region-banner-inner">'
            +   '<div class="region-banner-left">'
            +     '<span class="region-name">' + esc(p.name) + '</span>'
            +   '</div>'
            +   '<div class="region-banner-right">'
            +     '<span class="rbadge rbadge-count">' + esc(tpl.role) + ' · ' + periodLabel + '</span>'
            +     '<span class="rbadge" style="background:rgba(255,255,255,0.18);color:#c8e6c9;">' + submittedCount + '/' + periodMonths.length + ' submitted</span>'
            +     (canEditNow ? '<button class="lta-add-btn" onclick="event.stopPropagation();window.openCorpKpmModal(' + mi + ',null,true)" style="font-size:0.68rem;padding:4px 12px;"><i class="fas fa-plus"></i> Add Entry</button>' : '')
            +     (canEditNow ? '<button class="lta-add-btn" onclick="event.stopPropagation();window.corpKpmOpenPersonModal(' + mi + ')" style="font-size:0.68rem;padding:4px 12px;"><i class="fas fa-pen"></i> Edit</button>' : '')
            +     '<i class="fas fa-chevron-down region-toggle-icon"></i>'
            +   '</div>'
            + '</div></div>'
            + '<div id="ckpm-content-' + mi + '" class="region-content' + (isCollapsed?' collapsed':'') + '">';

        // Month rows — only months inside this person's KPM period
        var hasAnyRow = false;
        KPM_MONTHS.forEach(function(mo, moIdx) {
            if (moIdx > lastDoneIdx || !isActiveMo(mi, moIdx)) return;
            var score = mgrMonthScore(mi, mo);
            var dateSubm = ckGet(mi, mo, 'dateSubmitted');
            var isNA = ckIsNA(mi, mo);
            hasAnyRow = true;

            var scoreCls = score===null ? 'n' : (score>=0.90 ? 'g' : (score>=0.85 ? 'a' : 'r'));
            var scoreLabel = score===null ? '—' : (score*100).toFixed(1)+'%';
            var submFg = dateSubm ? '' : '#c62828';
            var submLabel = dateSubm ? dateSubm : (isNA ? 'N/A' : 'Not submitted');

            // Fill status for this person/month: every KPM row needs an Actual Performance value
            var _ckRows = rowsFor(mi), _ckFilled = 0;
            _ckRows.forEach(function(row) {
                var _raw = String(ckGet(mi, mo, row.id + '_ep') || '').replace('%','').trim();
                if (_raw !== '' && !isNaN(parseFloat(_raw))) _ckFilled++;
            });
            var _ckStatus = '';
            if (!isNA && _ckRows.length) {
                if (_ckFilled === 0)
                    _ckStatus = '<i class="fas fa-circle-xmark ckpm-ck none"></i><span class="ckpm-st none">Not filled</span>';
                else if (_ckFilled < _ckRows.length)
                    _ckStatus = '<i class="fas fa-circle-half-stroke ckpm-ck part"></i><span class="ckpm-st part">Partial (' + _ckFilled + '/' + _ckRows.length + ')</span>';
                else
                    _ckStatus = '<i class="fas fa-circle-check ckpm-ck" title="All ' + _ckRows.length + ' ' + (tpl.wpLabel === 'KPI' ? 'KPI' : 'work process') + (_ckRows.length !== 1 ? (tpl.wpLabel === 'KPI' ? 's' : 'es') : '') + ' complete"></i>';
            }

            managersHtml += '<div class="ckpm-rw" onclick="window.openCorpKpmModal(' + mi + ',\'' + mo + '\',false)">'
                + '<span class="ckpm-mo">' + mo.substring(0,3) + '</span>'
                + '<div class="ckpm-fl">' + _ckStatus + '</div>'
                + '<span class="ckpm-dt">Submitted <span' + (submFg ? ' style="color:' + submFg + ';font-weight:600;"' : '') + '>' + submLabel + '</span>' + (isNA?' <span style="color:#e65100;font-size:0.6rem;">[N/A]</span>':'') + '</span>'
                + '<div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">'
                + '<span class="ckpm-pc ' + scoreCls + '">' + scoreLabel + '</span>'
                + (canEditNow ? '<button onclick="event.stopPropagation();window.openCorpKpmModal(' + mi + ',\'' + mo + '\',true)" title="Edit" style="background:#e3f2fd;color:#1565c0;border:1px solid #90caf9;border-radius:5px;padding:3px 8px;font-size:0.62rem;font-weight:700;cursor:pointer;"><i class="fas fa-pen"></i></button>' : '')
                + '</div>'
                + '</div>';
        });

        if (!hasAnyRow) {
            managersHtml += '<div style="padding:18px;text-align:center;color:#aaa;font-size:0.76rem;font-style:italic;">'
                + '<i class="fas fa-inbox" style="margin-right:6px;"></i>No KPM months yet — KPM starts ' + window.corpKpmFmtYm(p.start) + '.'
                + (canEditNow ? ' You can still click "+ Add Entry".' : '') + '</div>';
        }

        managersHtml += '</div>'; // close ckpm-content
    });

    // ── Toggle function for manager sections ──
    window.corpKpmToggleMgr = function(mi, event) {
        if (event && (event.target.tagName==='BUTTON'||event.target.tagName==='SELECT'||
                      event.target.closest('button')||event.target.closest('select'))) return;
        var content = document.getElementById('ckpm-content-' + mi);
        var banner  = document.getElementById('ckpm-mgr-banner-' + mi);
        if (!content || !banner) return;
        var nowCollapsed = content.classList.contains('collapsed');
        var lsKey = 'corpKpmCollapsed_' + mi;
        if (nowCollapsed) {
            content.classList.remove('collapsed'); banner.classList.remove('collapsed');
            try { localStorage.setItem(lsKey,'0'); } catch(e) {}
        } else {
            content.classList.add('collapsed'); banner.classList.add('collapsed');
            try { localStorage.setItem(lsKey,'1'); } catch(e) {}
        }
    };

    // ── Modal: open KPM table for a specific manager + month ──
    window.openCorpKpmModal = function(mgrIdx, month, editMode) {
        var mgrName  = (getP(mgrIdx) || {}).name || '';
        var isNA     = month ? ckIsNA(mgrIdx, month) : false;
        var dis      = (!isWdaAdmin || !editMode || isNA) ? 'disabled' : '';
        var canEdit  = isWdaAdmin && editMode;

        // Auto-enable editing state
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

        // Determine active month
        var filledMonths = {};
        KPM_MONTHS.forEach(function(mo) {
            var hasData = rowsFor(mgrIdx).some(function(row){ return ckGet(mgrIdx, mo, row.id+'_ep'); });
            var hasDate = !!ckGet(mgrIdx, mo, 'dateSubmitted');
            filledMonths[mo] = hasData || hasDate;
        });
        var activeMo = month;
        if (!activeMo) {
            var avail = activeMonthsOf(mgrIdx).filter(function(mo){ return !filledMonths[mo]; });
            activeMo = avail.length ? avail[0] : (activeMonthsOf(mgrIdx).slice(-1)[0] || KPM_MONTHS[curMoIdx]);
        }

        var moSafe = activeMo.replace(/'/g,"\\'");
        var isNewEntry = !month;
        var dateSubm = ckGet(mgrIdx, activeMo, 'dateSubmitted');

        // Remove any existing modal
        var existing = document.getElementById('corp-kpm-modal');
        if (existing) existing.remove();

        // Month dropdown (Add Entry only)
        var monthDropHtml = '';
        if (isNewEntry) {
            var moOpts = activeMonthsOf(mgrIdx).map(function(mo) {
                var isFilled = filledMonths[mo];
                var isSel = mo === activeMo;
                return '<option value="' + mo + '"' + (isSel?' selected':'') + (isFilled?' disabled style="color:#bbb;"':'') + '>'
                    + mo + (isFilled?' ✓':'') + '</option>';
            }).join('');
            monthDropHtml = '<label style="display:flex;align-items:center;gap:5px;white-space:nowrap;font-size:0.67rem;color:#555;">'
                + '<i class="fas fa-calendar-alt" style="color:#1b5e20;"></i>'
                + '<span style="font-weight:700;font-size:0.64rem;color:#444;">Month:</span>'
                + '<select id="ckpm-modal-month-sel"'
                + ' onchange="(function(v){var m=document.getElementById(\'corp-kpm-modal\');if(m)m.remove();window.openCorpKpmModal(' + mgrIdx + ',v,true);})(this.value)"'
                + ' style="border:1px solid #a5d6a7;border-radius:4px;padding:3px 7px;font-size:0.67rem;font-weight:700;background:#e8f5e9;color:#1b5e20;cursor:pointer;min-width:110px;">'
                + moOpts + '</select></label>';
        }

        // Build table rows
        var GRADE_PERC_MODAL  = [0.75, 0.80, 0.85, 0.90, 0.95];
        var GRADE_SCALE_MODAL = [1, 2, 3, 4, 5];
        var tableRows = '';
        rowsFor(mgrIdx).forEach(function(row, _ri) {
            // Merge # and Work Package cells across the deliverables they cover (same as the region KPM modal)
            var _grpSpan = 0;
            if (row.kpm) { var _allRows = rowsFor(mgrIdx); _grpSpan = 1; for (var _gi = _ri + 1; _gi < _allRows.length && !_allRows[_gi].kpm; _gi++) _grpSpan++; }
            var rawVal = ckGet(mgrIdx, activeMo, row.id + '_ep');
            var n = parseFloat(String(rawVal||'').replace('%',''));
            var ep = isNaN(n) ? null : n/100;
            var tot = ep !== null ? ep * row.dw : null;
            var epColor = ep !== null ? (ep>=0.90?'#2e7d32':ep>=0.85?'#e65100':'#c62828') : '#aaa';
            var dwDisplay = row.dw ? (row.dw*100).toFixed(0)+'%' : '';

            // Statistics = EP as percentage string; EG = equivalent grade (1-5)
            var statDisplay = ep !== null ? (ep*100).toFixed(2)+'%' : '\u2014';
            var egVal = '\u2014';
            if (ep !== null) {
                for (var gi = 0; gi < GRADE_PERC_MODAL.length; gi++) {
                    if (Math.abs(ep - GRADE_PERC_MODAL[gi]) < 0.001) { egVal = String(GRADE_SCALE_MODAL[gi]); break; }
                }
            }

            var kpiCells = (row.kpi||[]).map(function(k){
                return '<td style=\"text-align:center;padding:3px 5px;border:1px solid #d5e3d8;font-size:0.65rem;font-weight:400;background:transparent;color:#2b3a2f;white-space:normal;max-width:90px;\">' + (k||'') + '</td>';
            }).join('');

            var validOpts = (row.epOpts || (row.kpi||[]).filter(function(v){return v!==null&&v!==undefined&&v!=='';}));
            var opts = '<option value="">—</option>' + validOpts.map(function(opt){
                return '<option value=\"' + opt + '\"' + (rawVal===opt?' selected':'') + '>' + opt + '</option>';
            }).join('');
            var inputColor = (!rawVal||isNaN(n)) ? '#555' : ep>=0.90?'#2e7d32':ep>=0.85?'#e65100':'#c62828';

            var impIa  = ckGet(mgrIdx, activeMo, 'imp_ia_'  + row.id);
            var impRc  = ckGet(mgrIdx, activeMo, 'imp_rc_'  + row.id);
            var impCa  = ckGet(mgrIdx, activeMo, 'imp_ca_'  + row.id);
            var impDoi = ckGet(mgrIdx, activeMo, 'imp_doi_' + row.id);
            var impSt  = ckGet(mgrIdx, activeMo, 'imp_st_'  + row.id);

            tableRows += '<tr style="background:' + (row.kpm?'#ffffff':'#f6faf6') + ';border-bottom:1px solid #d5e3d8;">'
                + (_grpSpan ? '<td rowspan="' + _grpSpan + '" style="vertical-align:middle;text-align:center;font-weight:700;color:#1f4d2e;padding:3px 2px;border:1px solid #d5e3d8;font-size:0.73rem;width:28px;min-width:28px;max-width:28px;">' + row.kpm + '</td>' : '')
                + (_grpSpan ? '<td rowspan="' + _grpSpan + '" style="vertical-align:middle;padding:4px 7px;border:1px solid #d5e3d8;font-size:0.68rem;color:#1f4d2e;font-weight:' + (row.wp?'600':'400') + ';min-width:110px;white-space:normal;max-width:130px;">' + row.wp + '</td>' : '')
                + '<td style="padding:4px 7px;border:1px solid #d5e3d8;font-size:0.68rem;color:#2b3a2f;min-width:110px;white-space:normal;max-width:130px;">' + (row.del||'') + '</td>'
                + '<td style="text-align:center;padding:4px 5px;border:1px solid #d5e3d8;font-size:0.72rem;font-weight:700;color:#1f4d2e;min-width:40px;">' + dwDisplay + '</td>'
                + '<td style="padding:4px 7px;border:1px solid #d5e3d8;font-size:0.68rem;color:#2b3a2f;min-width:130px;white-space:normal;max-width:150px;">' + (row.measure||'') + '</td>'
                + kpiCells
                + '<td id="ckpm-modal-stat-' + row.id + '" style="text-align:center;padding:4px 5px;border:1px solid #d5e3d8;font-size:0.72rem;font-weight:700;color:' + epColor + ';min-width:62px;background:transparent;">' + statDisplay + '</td>'
                + '<td id="ckpm-modal-eg-' + row.id + '" style="text-align:center;padding:4px 5px;border:1px solid #d5e3d8;font-size:0.75rem;font-weight:800;color:' + epColor + ';min-width:38px;background:transparent;">' + egVal + '</td>'
                + '<td style="text-align:center;padding:2px 6px;border:1px solid #d5e3d8;width:80px;min-width:80px;">'
                +   '<select ' + dis + ' onchange="window._ckpmEpChange(' + mgrIdx + ',\''+moSafe+'\',\''+row.id+'\',this.value)"'
                +   ' style="width:68px;text-align:center;border:1px solid #d5e3d8;border-radius:3px;padding:2px 1px;font-size:0.72rem;font-weight:700;color:' + inputColor + ';background:#fff;cursor:' + (dis?'not-allowed':'pointer') + ';">'
                +   opts + '</select></td>'
                + '<td id="ckpm-modal-tot-' + row.id + '" style="text-align:center;padding:4px 5px;border:1px solid #d5e3d8;font-size:0.73rem;font-weight:800;color:' + epColor + ';min-width:62px;">' + (tot!==null?(tot*100).toFixed(2)+'%':'\u2014') + '</td>'
                + '<td style="padding:3px 4px;border:1px solid #d5e3d8;min-width:90px;"><textarea ' + dis + ' placeholder="Immediate Action" rows="2" onchange="window._ckpmImpChange(' + mgrIdx + ',\''+moSafe+'\',\'ia_'+row.id+'\',this.value)" style="width:100%;font-size:0.63rem;border:1px solid #ccc;border-radius:3px;resize:vertical;">' + impIa + '</textarea></td>'
                + '<td style="padding:3px 4px;border:1px solid #d5e3d8;min-width:80px;"><textarea ' + dis + ' placeholder="Root Cause" rows="2" onchange="window._ckpmImpChange(' + mgrIdx + ',\''+moSafe+'\',\'rc_'+row.id+'\',this.value)" style="width:100%;font-size:0.63rem;border:1px solid #ccc;border-radius:3px;resize:vertical;">' + impRc + '</textarea></td>'
                + '<td style="padding:3px 4px;border:1px solid #d5e3d8;min-width:90px;"><textarea ' + dis + ' placeholder="Corrective Action" rows="2" onchange="window._ckpmImpChange(' + mgrIdx + ',\''+moSafe+'\',\'ca_'+row.id+'\',this.value)" style="width:100%;font-size:0.63rem;border:1px solid #ccc;border-radius:3px;resize:vertical;">' + impCa + '</textarea></td>'
                + '<td style="padding:3px 4px;border:1px solid #d5e3d8;min-width:80px;"><input type="date" value="' + impDoi + '" ' + dis + ' onchange="window._ckpmImpChange(' + mgrIdx + ',\''+moSafe+'\',\'doi_'+row.id+'\',this.value)" style="width:100%;font-size:0.62rem;border:1px solid #ccc;border-radius:3px;padding:2px;"></td>'
                + '<td style="padding:3px 4px;border:1px solid #d5e3d8;min-width:72px;"><select ' + dis + ' onchange="window._ckpmImpChange(' + mgrIdx + ',\''+moSafe+'\',\'st_'+row.id+'\',this.value)" style="width:100%;font-size:0.63rem;border:1px solid #ccc;border-radius:3px;padding:2px;"><option value="">\u2014</option><option value="Closed"' + (impSt==='Closed'?' selected':'') + '>Closed</option><option value="Not Effective"' + (impSt==='Not Effective'?' selected':'') + '>Not Effective</option></select></td>'
                + '</tr>';
        });


        var grand = 0, hasAny = false;
        rowsFor(mgrIdx).forEach(function(row) {
            var raw = String(ckGet(mgrIdx, activeMo, row.id + '_ep') || '').replace('%','').trim();
            var n = parseFloat(raw);
            if (!isNaN(n)) { hasAny = true; grand += (n/100) * row.dw; }
        });
        var grandColor = grand>=0.90?'#2e7d32':grand>=0.85?'#e65100':hasAny?'#c62828':'#aaa';
        var totalDW = rowsFor(mgrIdx).reduce(function(s,r){return s+r.dw;},0);

        var modal = document.createElement('div');
        modal.id = 'corp-kpm-modal';

        window.eshMountModal(modal, {
            id: 'corp-kpm-modal', icon: 'fa-user-tie', width: 'min(1400px,99vw)', bodyFlex: true,
            title: (isNewEntry ? 'New KPM entry' : (canEdit ? 'Edit KPM' : 'View KPM')) + ' — <span style="color:#2e7d32;">' + activeMo + ' ' + year + '</span>',
            sub: '<i class="fas fa-user-tie" style="margin-right:4px;"></i>' + esc(mgrName) + ' — ' + tplOf(mgrIdx).role,
            body: ''
            // Meta bar
            + '<div style="background:#f3f8f4;border-bottom:1px solid #d5e3d8;padding:6px 16px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">'
            +   '<span style="font-size:0.64rem;color:#2e7d32;font-weight:600;white-space:nowrap;"><i class="fas fa-table" style="margin-right:5px;"></i>' + mgrName + ' — ' + activeMo + ' ' + year + '</span>'
            +   monthDropHtml
            +   '<label style="display:flex;align-items:center;gap:5px;white-space:nowrap;font-size:0.67rem;color:#555;margin-left:4px;">'
            +     '<i class="fas fa-calendar-check" style="color:' + (dateSubm?'#2e7d32':'#c62828') + ';"></i>'
            +     '<span style="font-weight:700;font-size:0.64rem;color:#444;">Date Submitted:</span>'
            +     '<input type="date" id="ckpm-modal-date" value="' + dateSubm + '" ' + (!isWdaAdmin?'disabled':'')
            +     ' oninput="(function(el,v){window._ckpmDateChange(' + mgrIdx + ',\'' + moSafe + '\',v);var ok=!!v;el.style.background=ok?\'#c8e6c9\':\'#ffcdd2\';el.style.color=ok?\'#2e7d32\':\'#c62828\';el.style.borderColor=ok?\'#a5d6a7\':\'#ef9a9a\';window._kpmDateSync&&window._kpmDateSync(el);})(this,this.value)"'
            +     ' style="border:1px solid ' + (dateSubm?'#a5d6a7':'#ef9a9a') + ';border-radius:4px;padding:3px 7px;font-size:0.67rem;font-weight:700;background:' + (dateSubm?'#c8e6c9':'#ffcdd2') + ';color:' + (dateSubm?'#2e7d32':'#c62828') + ';cursor:' + (isWdaAdmin?'pointer':'not-allowed') + ';">'
            +   '</label>'
            +   (isWdaAdmin
                  ? '<button onclick="window._ckpmToggleNA(' + mgrIdx + ',\'' + moSafe + '\')" style="background:' + (isNA?'#ff9800':'#fff8e1') + ';color:' + (isNA?'white':'#e65100') + ';border:1.5px solid ' + (isNA?'#f57c00':'#ffc107') + ';border-radius:5px;padding:4px 12px;font-size:0.62rem;font-weight:800;cursor:pointer;">' + (isNA?'✓ Unmark N/A':'⊘ Mark as N/A') + '</button>'
                  : '')
            +   '<span style="font-size:0.6rem;color:#888;margin-left:auto;white-space:nowrap;"><i class="fas fa-arrows-left-right" style="color:#2e7d32;margin-right:4px;"></i>Scroll table horizontally</span>'
            + '</div>'
            + (isNA ? ('<div style="background:#fff8e1;border-bottom:1px solid #fbc02d;padding:8px 16px;font-size:0.73rem;color:#7a5c00;font-weight:700;">' + window.icon("warn") + ' ') + activeMo + ' is marked as N/A / Exempt.</div>' : '')
            // Table
            + '<div style="overflow-x:auto;max-height:72vh;overflow-y:auto;background:var(--bg-card);">'
            +   '<table style="border-collapse:collapse;width:100%;">'
            +   '<thead>'
            +   '<tr style="background:#4f7a5a;">'
            +     '<th colspan="4" style="padding:6px 4px;border:1px solid rgba(255,255,255,.3);font-size:0.7rem;color:#fff;font-weight:700;">KEY PERFORMANCE MEASURES</th>'
            +     '<th colspan="6" style="padding:6px 4px;border:1px solid rgba(255,255,255,.3);font-size:0.7rem;color:#fff;font-weight:700;">KEY PERFORMANCE INDICATORS</th>'
            +     '<th colspan="4" style="padding:6px 4px;border:1px solid rgba(255,255,255,.3);font-size:0.7rem;color:#fff;font-weight:700;background:#2f5d3e;">ACTUAL PERFORMANCE RATING</th>'
            +     '<th colspan="5" style="padding:6px 4px;border:1px solid rgba(255,255,255,.3);font-size:0.57rem;font-weight:400;font-style:italic;color:#e3eee5;">Note: Accomplish if grade below 3</th>'
            +   '</tr>'
            +   '<tr style="background:#e3eee5;color:#1f4d2e;font-size:0.62rem;font-weight:700;text-align:center;">'
            +     '<th style="padding:5px 4px;border:1px solid #d5e3d8;width:28px;min-width:28px;max-width:28px;">#</th>'
            +     '<th style="padding:5px 4px;border:1px solid #d5e3d8;min-width:130px;white-space:normal;">' + tplOf(mgrIdx).wpLabel + '</th>'
            +     '<th style="padding:5px 4px;border:1px solid #d5e3d8;min-width:130px;white-space:normal;">Deliverables</th>'
            +     '<th style="padding:5px 4px;border:1px solid #d5e3d8;min-width:46px;">DW</th>'
            +     '<th style="padding:5px 4px;border:1px solid #d5e3d8;min-width:150px;white-space:normal;">Measure</th>'
            +     '<th style="padding:5px 2px;border:1px solid #d5e3d8;min-width:55px;">75%<br><span style=\"font-size:0.55rem;font-weight:400;opacity:0.85;\">1</span></th>'
            +     '<th style="padding:5px 2px;border:1px solid #d5e3d8;min-width:55px;">80%<br><span style=\"font-size:0.55rem;font-weight:400;opacity:0.85;\">2</span></th>'
            +     '<th style="padding:5px 2px;border:1px solid #d5e3d8;min-width:55px;">85%<br><span style=\"font-size:0.55rem;font-weight:400;opacity:0.85;\">3</span></th>'
            +     '<th style="padding:5px 2px;border:1px solid #d5e3d8;min-width:55px;">90%<br><span style=\"font-size:0.55rem;font-weight:400;opacity:0.85;\">4</span></th>'
            +     '<th style="padding:5px 2px;border:1px solid #d5e3d8;min-width:55px;">95%<br><span style=\"font-size:0.55rem;font-weight:400;opacity:0.85;\">5</span></th>'
            +     '<th style="padding:5px 4px;border:1px solid #d5e3d8;min-width:60px;background:#d3e6d8;color:#1f4d2e;">Statistics</th>'
            +     '<th style="padding:5px 4px;border:1px solid #d5e3d8;min-width:38px;background:#d3e6d8;color:#1f4d2e;">Equivalent<br>Grade<br><span style=\"font-size:0.55rem;font-weight:400;\">(EG)</span></th>'
            +     '<th style="padding:4px 2px;border:1px solid #d5e3d8;min-width:80px;background:#d3e6d8;color:#1f4d2e;">Equivalent<br>Percentage<br><span style=\"font-size:0.55rem;font-weight:400;\">(EP)</span></th>'
            +     '<th style="padding:5px 4px;border:1px solid #d5e3d8;min-width:68px;white-space:normal;background:#d3e6d8;color:#1f4d2e;">Total %<br>Perf.<br><span style=\"font-size:0.57rem;font-weight:400;\">(EP×DW)</span></th>'
            +     '<th colspan="5" style="padding:5px 4px;border:1px solid #d5e3d8;font-size:0.58rem;font-weight:700;background:#d3e6d8;color:#1f4d2e;">IMPROVEMENT PLAN</th>'
            +   '</tr>'
            +   '</thead>'
            +   '<tbody>' + tableRows + '</tbody>'
            +   '<tfoot><tr style="background:#e3eee5;color:#1f4d2e;font-weight:800;border-top:2px solid #4f7a5a;">'
            +     '<td colspan="3" style="border:1px solid #d5e3d8;padding:6px 8px;font-size:0.7rem;color:#1f4d2e;">TOTAL</td>'
            +     '<td style="text-align:center;color:#1f4d2e;font-size:0.75rem;font-weight:800;border:1px solid #d5e3d8;">' + (totalDW*100).toFixed(0) + '%</td>'
            +     '<td colspan="8" style="border:1px solid #d5e3d8;"></td>'
            +     '<td id="ckpm-modal-grand" style="text-align:center;font-size:0.82rem;font-weight:800;color:' + grandColor + ';border:1px solid #d5e3d8;background:#d3e6d8;">' + (hasAny?(grand*100).toFixed(2)+'%':'—') + '</td>'
            +     '<td colspan="5" style="border:1px solid #d5e3d8;"></td>'
            +   '</tr></tfoot>'
            +   '</table>'
            + '</div>'
            // Legend
            + '<div style="padding:6px 16px;background:#ffffff;border-top:1px solid #d5e3d8;display:flex;gap:12px;flex-wrap:wrap;align-items:center;">'
            +   '<span style="font-size:0.59rem;color:#1b5e20;font-weight:600;display:flex;align-items:center;gap:4px;"><span style="width:8px;height:8px;border-radius:50%;background:#9fd3aa;display:inline-block;"></span>≥90% Excellent</span>'
            +   '<span style="font-size:0.59rem;color:#7a5c00;font-weight:600;display:flex;align-items:center;gap:4px;"><span style="width:8px;height:8px;border-radius:50%;background:#f1dc8a;display:inline-block;"></span>85–89% Satisfactory</span>'
            +   '<span style="font-size:0.59rem;color:#c62828;font-weight:600;display:flex;align-items:center;gap:4px;"><span style="width:8px;height:8px;border-radius:50%;background:#eba3a3;display:inline-block;"></span>&lt;85% Needs Improvement</span>'
            +   '<span style="font-size:0.59rem;color:#888;margin-left:auto;">' + tplOf(mgrIdx).docCode + '</span>'
            + '</div>'
            , foot: canEdit ? '<button onclick="window._ckpmSaveModal(' + mgrIdx + ',\'' + moSafe + '\')" class="mdl-btn primary"><i class="fas fa-save" style="margin-right:6px;"></i>Save Changes</button>' : '' });
        if (window._kpmDateSync) window._kpmDateSync(document.getElementById('ckpm-modal-date'));
        // outside click disabled — use the X button to close
    };

    // ── Modal data callbacks ──
    window._ckpmEpChange = function(mgrIdx, mo, rowId, val) {
        ckSet(mgrIdx, mo, rowId + '_ep', val);
        var _GP = [0.75, 0.80, 0.85, 0.90, 0.95];
        var _GS = [1, 2, 3, 4, 5];
        // Recompute grand total and refresh Statistics + EG cells in modal
        var grand = 0, hasAny = false;
        rowsFor(mgrIdx).forEach(function(row) {
            var raw = String(ckGet(mgrIdx, mo, row.id + '_ep') || '').replace('%','').trim();
            var n = parseFloat(raw);
            var epFrac = isNaN(n) ? null : n/100;
            var c = epFrac!==null ? (epFrac>=0.90?'#2e7d32':epFrac>=0.85?'#e65100':'#c62828') : '#aaa';
            // Statistics cell
            var statCell = document.getElementById('ckpm-modal-stat-' + row.id);
            if (statCell) { statCell.textContent = epFrac!==null?(epFrac*100).toFixed(2)+'%':'—'; statCell.style.color = c; }
            // EG cell
            var egCell = document.getElementById('ckpm-modal-eg-' + row.id);
            if (egCell) {
                var eg = '—';
                if (epFrac!==null) { for (var gi=0;gi<_GP.length;gi++) { if (Math.abs(epFrac-_GP[gi])<0.001) { eg=String(_GS[gi]); break; } } }
                egCell.textContent = eg; egCell.style.color = c;
            }
            if (epFrac !== null) {
                hasAny = true;
                grand += epFrac * row.dw;
                var tot = epFrac * row.dw;
                var totCell = document.getElementById('ckpm-modal-tot-' + row.id);
                if (totCell) { totCell.textContent = (tot*100).toFixed(2)+'%'; totCell.style.color = c; }
            } else {
                var totCell = document.getElementById('ckpm-modal-tot-' + row.id);
                if (totCell) { totCell.textContent = '—'; totCell.style.color = '#aaa'; }
            }
        });
        var grandCell = document.getElementById('ckpm-modal-grand');
        if (grandCell) {
            grandCell.textContent = hasAny ? (grand*100).toFixed(2)+'%' : '—';
            grandCell.style.color = grand>=0.90?'#2e7d32':grand>=0.85?'#e65100':'#c62828';
        }
    };
    window._ckpmImpChange = function(mgrIdx, mo, field, val) { ckSet(mgrIdx, mo, 'imp_' + field, val); };
    window._ckpmDateChange = function(mgrIdx, mo, val) { ckSet(mgrIdx, mo, 'dateSubmitted', val); };
    window._ckpmToggleNA = function(mgrIdx, mo) {
        var k = 'corp_kpm_na_' + year + '_' + mgrIdx + '_' + mo;
        if (!state.companyData) state.companyData = {};
        state.companyData[k] = ckIsNA(mgrIdx, mo) ? '' : '1';
        window.corpKpmSaveToFirestore(k, state.companyData[k]);
        var m = document.getElementById('corp-kpm-modal'); if (m) m.remove();
        window.openCorpKpmModal(mgrIdx, mo, true);
    };
    // Shared Date Submitted indicator (also defined in the region KPM block; defined here so it works on its own)
    if (!window._kpmDateSync) window._kpmDateSync = function(el) {
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
    window._ckpmSaveModal = function(mgrIdx, mo) {
        var dateEl = document.getElementById('ckpm-modal-date');
        if (dateEl && !dateEl.disabled && !dateEl.value && !ckIsNA(mgrIdx, mo)) {
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
                + 'You did not fill in the <b>Date Submitted</b>. Without it, this month is counted as <b>not submitted</b>.<br><br>Do you still want to save?</div>'
                + '<div style="padding:12px 18px;display:flex;justify-content:flex-end;gap:10px;border-top:1px solid var(--border-color,#ddd);">'
                + '<button id="kpm-date-confirm-save" style="background:#fff;color:#c62828;border:1px solid #ef9a9a;border-radius:7px;padding:8px 16px;font-size:0.76rem;font-weight:700;cursor:pointer;">Save anyway</button>'
                + '<button id="kpm-date-confirm-fill" style="background:#2e7d32;color:#fff;border:none;border-radius:7px;padding:8px 18px;font-size:0.76rem;font-weight:700;cursor:pointer;">Go back and fill in</button>'
                + '</div></div>';
            document.body.appendChild(box);
            document.getElementById('kpm-date-confirm-fill').onclick = function() {
                box.remove();
                var el = document.getElementById('ckpm-modal-date');
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
                window._ckpmDoSave(mgrIdx, mo);
            };
            return;
        }
        window._ckpmDoSave(mgrIdx, mo);
    };
    window._ckpmDoSave = function(mgrIdx, mo) {
        if (typeof saveData === 'function') saveData();
        var m = document.getElementById('corp-kpm-modal'); if (m) m.remove();
        window.renderCorporateKpm();
        if (typeof showToast === 'function') showToast('Corporate KPM saved!', 'success');
    };

    // ── Assemble ──
    container.innerHTML = '<div id="ckpm-root">'
        + summaryHtml
        + managersHtml
        + '</div>';
};

// ── exportCorporateKpmExcel: picker modal, then export per manager ───────────
function exportCorporateKpmExcel() {
    const _ckExportAllowed = ['esh@wda.com.ph','esh@tgm.com.ph','esh@mab.com.ph','esh@lmp.com.ph','esh@corpdc.com.ph','esh@cbmganda.com.ph','esh@scic.com.ph'];
    if (!_ckExportAllowed.includes(state.currentUser?.email)) {
        showToast('Corporate KPM export is restricted. Contact WDA System Admin for access.', 'warning');
        return;
    }
    if (typeof ExcelJS === 'undefined') {
        showToast('Excel library not loaded. Refresh and try again.', 'error');
        return;
    }
    const _ex = document.getElementById('corp-kpm-export-modal');
    if (_ex) _ex.remove();
    const overlay = document.createElement('div');
    overlay.id = 'corp-kpm-export-modal';
    window.eshMountModal(overlay, {
        id: 'corp-kpm-export-modal', icon: 'fa-file-export', width: 420,
        title: 'Export corporate KPM', sub: 'Select which personnel to export',
        body: ''
        + '<div style="padding:22px 24px 10px;">'
        +   '<div style="font-size:0.78rem;color:#555;margin-bottom:14px;font-weight:600;">Choose export option:</div>'
        +   '<div style="display:flex;flex-direction:column;gap:10px;">'
        +     (function() {
              var yr = state.selectedYear || new Date().getFullYear();
              var list = window.corpKpmGetRoster().filter(function(p) { return window.corpKpmActiveInYear(p, yr); });
              var esc = function(v) { return String(v == null ? '' : v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };
              if (!list.length) return '<div style="font-size:0.78rem;color:#c62828;font-weight:600;">No personnel registered for ' + yr + '.</div>';
              var pal = [['#E8F5E9','#2E7D32','#1B5E20','#388E3C'],['#E3F2FD','#1565C0','#0D47A1','#1976D2'],['#FFF3E0','#E65100','#BF360C','#F57C00'],['#E0F2F1','#00796B','#004D40','#00897B']];
              var btns = list.map(function(p, i) {
                  var c = pal[i % pal.length];
                  return '<button onclick="window._corpKpmDoExport([' + p.id + '])" style="background:' + c[0] + ';border:2px solid ' + c[1] + ';color:' + c[2] + ';border-radius:9px;padding:13px 18px;font-size:0.88rem;font-weight:700;cursor:pointer;text-align:left;display:flex;align-items:center;gap:10px;">'
                      + ('<span style="font-size:1.2rem;">' + window.icon("file") + '</span>')
                      + '<span><span style="font-size:0.95rem;">' + window.corpKpmTag(p.name) + '</span><br><span style="font-weight:400;font-size:0.72rem;color:' + c[3] + ';">' + esc(p.name) + ' — ' + esc(window.CORP_KPM_TEMPLATES[p.tpl].role) + ' — 1 file</span></span></button>';
              }).join('');
              if (list.length > 1) {
                  btns += '<button onclick="window._corpKpmDoExport([' + list.map(function(p) { return p.id; }).join(',') + '])" style="background:#F3E5F5;border:2px solid #6A1B9A;color:#4A148C;border-radius:9px;padding:13px 18px;font-size:0.88rem;font-weight:700;cursor:pointer;text-align:left;display:flex;align-items:center;gap:10px;">'
                      + '<span style="font-size:1.2rem;">📦</span>'
                      + '<span><span style="font-size:0.95rem;">All</span><br><span style="font-weight:400;font-size:0.72rem;color:#7B1FA2;">All ' + list.length + ' personnel — ' + list.length + ' separate files</span></span></button>';
              }
              return btns;
          })()
        +   '</div>'
        + '</div>'
    });
    // outside click disabled — use the X button to close
}

window._corpKpmDoExport = async function(mgrIndices) {
    const overlay = document.getElementById('corp-kpm-export-modal');
    if (overlay) overlay.remove();
    const year     = state.selectedYear || new Date().getFullYear();
    const MO_LONG  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const MO_SHORT = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    const ROSTER_ALL = window.corpKpmGetRoster();
    const GRADE_PERC  = [0.75, 0.80, 0.85, 0.90, 0.95];
    const GRADE_SCALE = [1, 2, 3, 4, 5];

    // ── Total columns: # | Work Process | Deliverables | DW | Measure | G1–G5 | Statistics | EG | EP | EP×DW | Imm.Action | Root Cause | CA | Date | Status
    // Col:              1        2               3         4      5      6-10      11         12  13    14      15            16          17    18     19
    const TOTAL_COLS = 19;

    // ── Color constants (matching KPM template) ───────────────────────────────
    const C_DARK_GREEN  = 'FF0D3D0F';
    const C_MED_GREEN   = 'FF1B5E20';
    const C_GREEN_HDR   = 'FF2E7D32';
    const C_LIGHT_GREEN = 'FFC8E6C9';
    const C_YELLOW_HDR  = 'FFFFD54F';
    const C_PERF_BG     = 'FF0D3D0F';   // dark bg for ACTUAL PERFORMANCE RATING group
    const C_WHITE       = 'FFFFFFFF';
    const C_GRAY_ROW    = 'FFF9FDF9';
    const C_GREEN_ROW   = 'FFEDF7ED';
    const C_THIN_BORDER = 'FF388E3C';

    // ── Helpers ───────────────────────────────────────────────────────────────
    function ckGet(mgrIdx, mo, key) {
        return ((state.companyData || {})['corp_kpm_' + year + '_' + mgrIdx + '_' + mo + '_' + key]) || '';
    }
    function ckIsNA(mgrIdx, mo) {
        return !!((state.companyData || {})['corp_kpm_na_' + year + '_' + mgrIdx + '_' + mo]);
    }
    function thinBorder(color) {
        return {
            top:    { style: 'thin', color: { argb: color || C_THIN_BORDER } },
            bottom: { style: 'thin', color: { argb: color || C_THIN_BORDER } },
            left:   { style: 'thin', color: { argb: color || C_THIN_BORDER } },
            right:  { style: 'thin', color: { argb: color || C_THIN_BORDER } }
        };
    }
    function epColor(epFrac) {
        if (epFrac === null || epFrac === '') return null;
        if (epFrac >= 0.90) return { bg: 'FFC8E6C9', fg: 'FF1B5E20' };
        if (epFrac >= 0.85) return { bg: 'FFFFF9C4', fg: 'FF7A5C00' };
        return { bg: 'FFFFCDD2', fg: 'FFC62828' };
    }
    function applyCell(cell, val, bold, size, fgArgb, bgArgb, hAlign, wrapText, border) {
        cell.value     = val !== undefined ? val : '';
        cell.font      = { bold: !!bold, size: size || 8.5, name: 'Calibri', color: { argb: fgArgb || 'FF000000' } };
        cell.fill      = bgArgb ? { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } } : { type: 'pattern', pattern: 'none' };
        cell.alignment = { horizontal: hAlign || 'center', vertical: 'middle', wrapText: !!wrapText };
        if (border) cell.border = border;
    }

    try {
        const _nowYear  = new Date().getFullYear();
        const _curMoIdx = new Date().getMonth();
        const _dateTag  = new Date().toISOString().slice(0, 10);
        const _skipped  = [];

        // ── One sheet per manager per month ───────────────────────────────────
        for (let _mi = 0; _mi < mgrIndices.length; _mi++) {
            const mgrIdx  = mgrIndices[_mi];
            const PERSON  = ROSTER_ALL.filter(function(x) { return x.id === String(mgrIdx); })[0];
            if (!PERSON) { _skipped.push('#' + mgrIdx); continue; }
            const mgrName = PERSON.name;
            const PERS    = Object.assign({ tag: window.corpKpmTag(PERSON.name) }, window.CORP_KPM_TEMPLATES[PERSON.tpl]);
            const CORP_KPM_ROWS = window[PERS.rowsKey] || [];
            const wb = eshNewWorkbook('SCIC ESH Dashboard');
            MO_LONG.forEach(function(mo, moIdx) {
                if (year >= _nowYear && moIdx >= _curMoIdx) return;
                if (!window.corpKpmActiveInMonth(PERSON, year, moIdx)) return;
                const isNA      = ckIsNA(mgrIdx, mo);
                const mgrTag    = PERS.tag;
                const moShort   = MO_SHORT[moIdx];
                const sheetName = (moShort + '-' + mgrTag).substring(0, 31);
                const ws        = wb.addWorksheet(sheetName);
                const dateSubm  = ckGet(mgrIdx, mo, 'dateSubmitted');
                const lastDay   = new Date(year, moIdx + 1, 0).getDate();

                // ── Column widths (19 cols) ────────────────────────────────────
                // #  | WP  | Del  | DW  | Measure | G1  | G2  | G3  | G4  | G5  | Stat | EG  | EP  | Tot | IA  | RC  | CA  | Doi | St
                [5,   22,   24,    6,    30,        12,   12,   12,   12,   12,   10,    7,    10,   10,   20,   18,   22,   12,   12]
                    .forEach(function(w, i) { ws.getColumn(i + 1).width = w; });

                // ── ROW 1: Notes ───────────────────────────────────────────────
                ws.mergeCells(1, 1, 1, TOTAL_COLS);
                const notesCell = ws.getCell('A1');
                notesCell.value = 'NOTES: 1) If the KPM or KPI is not applicable, do not delete the cell/row, put "N/A" instead.  2) Attach corresponding evidences and/or records.  |  ' + PERS.docCode;
                notesCell.font      = { size: 8, name: 'Calibri', color: { argb: 'FF5D4037' }, italic: true };
                notesCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF9C4' } };
                notesCell.alignment = { vertical: 'middle', wrapText: false };
                ws.getRow(1).height = 18;

                // ── ROW 2: Spacer ──────────────────────────────────────────────
                ws.addRow([]);
                ws.getRow(2).height = 5;

                // ── ROW 3: Title ───────────────────────────────────────────────
                ws.mergeCells(3, 1, 3, TOTAL_COLS);
                const titleCell = ws.getCell('A3');
                titleCell.value     = 'KEY PERFORMANCE MEASURES (KPM) MONTHLY REPORT — ' + PERS.titleSuffix;
                titleCell.font      = { bold: true, size: 12, name: 'Calibri', color: { argb: C_WHITE } };
                titleCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C_MED_GREEN } };
                titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
                ws.getRow(3).height = 26;

                // ── ROW 4: Meta info ───────────────────────────────────────────
                ws.mergeCells(4, 1, 4, 4);   ws.mergeCells(4, 5, 4, 10);
                ws.mergeCells(4, 11, 4, 14); ws.mergeCells(4, 15, 4, TOTAL_COLS);
                const metaFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
                const metaBold = { bold: true, size: 8.5, name: 'Calibri', color: { argb: C_MED_GREEN } };
                [
                    [4, 1,  PERS.metaLabel + ': ' + mgrName],
                    [4, 5,  'Period Covered: ' + mo + ' 1–' + lastDay + ', ' + year],
                    [4, 11, 'Date Submitted: ' + (dateSubm || '—')],
                    [4, 15, 'Status: ' + (isNA ? 'N/A — EXEMPT' : 'ACTIVE')]
                ].forEach(function(item) {
                    const c = ws.getCell(item[0], item[1]);
                    c.value     = item[2];
                    c.font      = metaBold;
                    c.fill      = metaFill;
                    c.alignment = { vertical: 'middle', wrapText: false };
                    c.border    = thinBorder('FFB0BEC5');
                });
                ws.getRow(4).height = 18;

                // ── ROW 5: Group header spans ──────────────────────────────────
                // KEY PERFORMANCE MEASURES (cols 1–4) | KEY PERFORMANCE INDICATORS (5–10) | ACTUAL PERFORMANCE RATING (11–14) | IMPROVEMENT PLAN (15–19)
                ws.mergeCells(5, 1, 5, 4);
                ws.mergeCells(5, 5, 5, 10);
                ws.mergeCells(5, 11, 5, 14);
                ws.mergeCells(5, 15, 5, TOTAL_COLS);
                [
                    [5, 1,  'KEY PERFORMANCE MEASURES',   C_MED_GREEN,  C_WHITE],
                    [5, 5,  'KEY PERFORMANCE INDICATORS',  C_MED_GREEN,  C_WHITE],
                    [5, 11, 'ACTUAL PERFORMANCE RATING',   C_PERF_BG,    C_YELLOW_HDR],
                    [5, 15, 'IMPROVEMENT PLAN (Accomplish if grade below 3)', 'FF1A3A1A', 'FFA5D6A7']
                ].forEach(function(item) {
                    const c = ws.getCell(item[0], item[1]);
                    c.value     = item[2];
                    c.font      = { bold: true, size: 9, name: 'Calibri', color: { argb: item[4] } };
                    c.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: item[3] } };
                    c.alignment = { horizontal: 'center', vertical: 'middle' };
                    c.border    = thinBorder(C_THIN_BORDER);
                });
                ws.getRow(5).height = 20;

                // ── ROW 6: Column headers ──────────────────────────────────────
                const hdrDefs = [
                    { v: '#',                          bg: C_GREEN_HDR, fg: C_WHITE      },
                    { v: PERS.wpLabel,                bg: C_GREEN_HDR, fg: C_WHITE      },
                    { v: 'Deliverables',               bg: C_GREEN_HDR, fg: C_WHITE      },
                    { v: 'DW',                         bg: C_GREEN_HDR, fg: C_WHITE      },
                    { v: 'Measure',                    bg: C_GREEN_HDR, fg: C_WHITE      },
                    { v: '75%\n1',                     bg: C_GREEN_HDR, fg: C_WHITE      },
                    { v: '80%\n2',                     bg: C_GREEN_HDR, fg: C_WHITE      },
                    { v: '85%\n3',                     bg: C_GREEN_HDR, fg: C_WHITE      },
                    { v: '90%\n4',                     bg: C_GREEN_HDR, fg: C_WHITE      },
                    { v: '95%\n5',                     bg: C_GREEN_HDR, fg: C_WHITE      },
                    { v: 'Statistics',                 bg: C_PERF_BG,   fg: C_YELLOW_HDR },
                    { v: 'Equivalent\nGrade\n(EG)',    bg: C_PERF_BG,   fg: C_YELLOW_HDR },
                    { v: 'Equivalent\nPercentage\n(EP)', bg: C_PERF_BG, fg: C_YELLOW_HDR },
                    { v: 'Total %\nPerf.\n(EP×DW)',    bg: C_PERF_BG,   fg: C_YELLOW_HDR },
                    { v: 'Immediate\nAction',          bg: 'FF1A3A1A',  fg: 'FFA5D6A7'   },
                    { v: 'Root\nCause',                bg: 'FF1A3A1A',  fg: 'FFA5D6A7'   },
                    { v: 'Corrective\nAction',         bg: 'FF1A3A1A',  fg: 'FFA5D6A7'   },
                    { v: 'Date of\nImpl.',             bg: 'FF1A3A1A',  fg: 'FFA5D6A7'   },
                    { v: PERS.lastCol,                  bg: 'FF1A3A1A',  fg: 'FFA5D6A7'   }
                ];
                hdrDefs.forEach(function(h, i) {
                    const c = ws.getCell(6, i + 1);
                    c.value     = h.v;
                    c.font      = { bold: true, size: 8, name: 'Calibri', color: { argb: h.fg } };
                    c.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: h.bg } };
                    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                    c.border    = thinBorder(C_THIN_BORDER);
                });
                ws.getRow(6).height = 36;

                // ── DATA ROWS (one per KPM row) ────────────────────────────────
                let grandTotal = 0, hasAny = false;

                CORP_KPM_ROWS.forEach(function(row, ri) {
                    const wsRowNum  = 7 + ri;
                    const rawEp     = ckGet(mgrIdx, mo, row.id + '_ep');
                    const epNum     = parseFloat(String(rawEp || '').replace('%', ''));
                    const epFrac    = isNaN(epNum) ? null : epNum / 100;
                    const tot       = epFrac !== null ? epFrac * row.dw : null;
                    if (tot !== null) { hasAny = true; grandTotal += tot; }

                    // Statistics = EP as percentage (same value, different label)
                    const statDisplay = epFrac !== null ? (epFrac * 100).toFixed(2) + '%' : '—';
                    // EG = exact-match grade
                    let egVal = '—';
                    if (epFrac !== null) {
                        for (var gi = 0; gi < GRADE_PERC.length; gi++) {
                            if (Math.abs(epFrac - GRADE_PERC[gi]) < 0.001) { egVal = GRADE_SCALE[gi]; break; }
                        }
                    }
                    const epDisplay  = epFrac !== null ? (epFrac * 100).toFixed(0) + '%' : '—';
                    const totDisplay = tot !== null    ? (tot * 100).toFixed(2) + '%'     : '—';

                    const impIa  = ckGet(mgrIdx, mo, 'imp_ia_'  + row.id);
                    const impRc  = ckGet(mgrIdx, mo, 'imp_rc_'  + row.id);
                    const impCa  = ckGet(mgrIdx, mo, 'imp_ca_'  + row.id);
                    const impDoi = ckGet(mgrIdx, mo, 'imp_doi_' + row.id);
                    const impSt  = ckGet(mgrIdx, mo, 'imp_st_'  + row.id);

                    const rowBg = row.kpm ? C_GREEN_ROW : C_GRAY_ROW;
                    const ec    = epColor(epFrac);
                    const dataRow = ws.getRow(wsRowNum);
                    dataRow.height = 30;

                    // Col 1: #
                    applyCell(ws.getCell(wsRowNum, 1),  row.kpm || '',      true,  8.5, C_MED_GREEN, rowBg,       'center', false, thinBorder(C_THIN_BORDER));
                    // Col 2: Work Process
                    applyCell(ws.getCell(wsRowNum, 2),  row.wp  || '',      !!row.wp, 8, 'FF000000', rowBg,       'left',   true,  thinBorder(C_THIN_BORDER));
                    // Col 3: Deliverables
                    applyCell(ws.getCell(wsRowNum, 3),  row.del || '',      false, 8,   'FF000000',  rowBg,       'left',   true,  thinBorder(C_THIN_BORDER));
                    // Col 4: DW
                    applyCell(ws.getCell(wsRowNum, 4),  row.dw ? (row.dw * 100).toFixed(0) + '%' : '', true, 8.5, 'FFC62828', rowBg, 'center', false, thinBorder(C_THIN_BORDER));
                    // Col 5: Measure
                    applyCell(ws.getCell(wsRowNum, 5),  row.measure || '',  false, 7.5, 'FF000000',  rowBg,       'left',   true,  thinBorder(C_THIN_BORDER));
                    // Cols 6–10: KPI grades G1–G5
                    (row.kpi || []).forEach(function(kv, ki) {
                        applyCell(ws.getCell(wsRowNum, 6 + ki), kv || '', false, 7.5, 'FF1B5E20', 'FFF0FAF0', 'center', true, thinBorder(C_THIN_BORDER));
                    });
                    // Col 11: Statistics (= EP value)
                    const statC = ws.getCell(wsRowNum, 11);
                    statC.value     = statDisplay;
                    statC.font      = { bold: epFrac !== null, size: 8.5, name: 'Calibri', color: { argb: ec ? ec.fg : 'FFAAAAAA' } };
                    statC.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: ec ? ec.bg : 'FFF9FDF9' } };
                    statC.alignment = { horizontal: 'center', vertical: 'middle' };
                    statC.border    = thinBorder(C_THIN_BORDER);
                    // Col 12: EG
                    const egC = ws.getCell(wsRowNum, 12);
                    egC.value     = egVal;
                    egC.font      = { bold: egVal !== '—', size: 9, name: 'Calibri', color: { argb: ec ? ec.fg : 'FFAAAAAA' } };
                    egC.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: ec ? ec.bg : 'FFF9FDF9' } };
                    egC.alignment = { horizontal: 'center', vertical: 'middle' };
                    egC.border    = thinBorder(C_THIN_BORDER);
                    // Col 13: EP (Equivalent Percentage)
                    const epC = ws.getCell(wsRowNum, 13);
                    epC.value     = epDisplay;
                    epC.font      = { bold: epFrac !== null, size: 8.5, name: 'Calibri', color: { argb: ec ? ec.fg : 'FFAAAAAA' } };
                    epC.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: ec ? ec.bg : 'FFF9FDF9' } };
                    epC.alignment = { horizontal: 'center', vertical: 'middle' };
                    epC.border    = thinBorder(C_THIN_BORDER);
                    // Col 14: Total % Perf (EP×DW)
                    const totC = ws.getCell(wsRowNum, 14);
                    totC.value     = totDisplay;
                    totC.font      = { bold: tot !== null, size: 8.5, name: 'Calibri', color: { argb: ec ? ec.fg : 'FFAAAAAA' } };
                    totC.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: ec ? ec.bg : 'FFF9FDF9' } };
                    totC.alignment = { horizontal: 'center', vertical: 'middle' };
                    totC.border    = thinBorder(C_THIN_BORDER);
                    // Cols 15–19: Improvement plan
                    [impIa, impRc, impCa, impDoi, impSt].forEach(function(v, vi) {
                        applyCell(ws.getCell(wsRowNum, 15 + vi), v || '', false, 8, 'FF333333', rowBg, 'left', true, thinBorder(C_THIN_BORDER));
                    });
                });

                // ── TOTAL ROW ──────────────────────────────────────────────────
                const totRowNum = 7 + CORP_KPM_ROWS.length;
                ws.mergeCells(totRowNum, 1, totRowNum, 3);
                ws.mergeCells(totRowNum, 5, totRowNum, 12);
                ws.mergeCells(totRowNum, 15, totRowNum, TOTAL_COLS);
                const grandDisplay = hasAny ? (grandTotal * 100).toFixed(2) + '%' : '—';
                const gc = epColor(hasAny ? grandTotal : null);

                applyCell(ws.getCell(totRowNum, 1),  'TOTAL', true, 10, C_WHITE, C_MED_GREEN, 'center', false, thinBorder(C_THIN_BORDER));
                applyCell(ws.getCell(totRowNum, 4),  '100%',  true, 9,  'FFFFD54F', C_MED_GREEN, 'center', false, thinBorder(C_THIN_BORDER));
                applyCell(ws.getCell(totRowNum, 5),  '',      false, 8, C_WHITE, C_MED_GREEN, 'center', false, thinBorder(C_THIN_BORDER));
                // Grand total goes in col 14 (EP×DW / Total % Perf)
                const grandCell = ws.getCell(totRowNum, 14);
                grandCell.value     = grandDisplay;
                grandCell.font      = { bold: true, size: 11, name: 'Calibri', color: { argb: gc ? gc.fg : C_YELLOW_HDR } };
                grandCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C_PERF_BG } };
                grandCell.alignment = { horizontal: 'center', vertical: 'middle' };
                grandCell.border    = thinBorder(C_THIN_BORDER);
                applyCell(ws.getCell(totRowNum, 15), '', false, 8, C_WHITE, C_MED_GREEN, 'center', false, thinBorder(C_THIN_BORDER));
                ws.getRow(totRowNum).height = 22;

                // ── LEGEND ROW ─────────────────────────────────────────────────
                const legRowNum = totRowNum + 1;
                ws.mergeCells(legRowNum, 1, legRowNum, TOTAL_COLS);
                const legCell = ws.getCell(legRowNum, 1);
                legCell.value     = '  LEGEND:  🟩 ≥90% Excellent   🟨 85–89% Satisfactory   🟥 <85% Needs Improvement   |   ' + PERS.docCode;
                legCell.font      = { size: 7.5, name: 'Calibri', color: { argb: 'FF5D4037' }, italic: true };
                legCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF9C4' } };
                legCell.alignment = { vertical: 'middle', wrapText: false };
                ws.getRow(legRowNum).height = 16;

                // ── N/A overlay notice ─────────────────────────────────────────
                if (isNA) {
                    const naRowNum = legRowNum + 1;
                    ws.mergeCells(naRowNum, 1, naRowNum, TOTAL_COLS);
                    const naCell = ws.getCell(naRowNum, 1);
                    naCell.value = '⚠️ ' + mo + ' ' + year + ' (' + mgrName + ') is marked as N/A / Exempt.';
                    naCell.font  = { bold: true, color: { argb: 'FF7A5C00' }, size: 9, name: 'Calibri' };
                    naCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF8E1' } };
                    naCell.alignment = { vertical: 'middle' };
                    ws.getRow(naRowNum).height = 18;
                }

                // ── Freeze panes at row 7 col 2 ───────────────────────────────
                ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 6, activeCell: 'B7' }];
            });
            if (!wb.worksheets.length) { _skipped.push(mgrName); continue; }
            // ── Download this manager's workbook
            const mgrFileTag = PERS.tag;
            await eshDownloadXlsx(wb, 'SCIC_ESH_CORP_KPM_' + year + '_' + mgrFileTag + '_' + _dateTag + '.xlsx');
        }
        const _made = mgrIndices.length - _skipped.length;
        if (_made > 0) showToast('Corporate KPM exported — ' + _made + (_made > 1 ? ' files' : ' file') + ' generated!' + (_skipped.length ? ' (No completed months yet for: ' + _skipped.join(', ') + ')' : ''), 'success');
        else showToast('No completed months to export yet.', 'info');
    } catch(err) {
        console.error('Corporate KPM Excel export error:', err);
        showToast('Corporate KPM export failed. Check console for details.', 'error');
    }
}


async function exportKpmExcel() {
    const _noRoles = ['superintendent', 'pco', 'corp_nurse'];
    if (_noRoles.includes(state.userRole)) {
        showToast('You do not have permission to export KPM data.', 'warning');
        return;
    }
    if (typeof ExcelJS === 'undefined') {
        showToast('Excel library not loaded. Refresh and try again.', 'error');
        return;
    }

    const rows = (typeof KPM_ESH_ROWS !== 'undefined' ? KPM_ESH_ROWS : window.KPM_ESH_ROWS) || [];
    if (!rows.length) {
        showToast('KPM row definitions not loaded.', 'info');
        return;
    }

    const year     = state.selectedYear || new Date().getFullYear();
    const MO_LONG  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const MO_SHORT = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    const REGIONS  = ['NCR','SOUTH LUZON','NORTH LUZON','VISAYAS & MINDANAO'];

    // ── Collect projects — exclude Corporate, Plant Ops, and kpm_na only ──
    // ALL projects included: active, work-stoppage, resumed, AND finished
    const allProjs = (state.filteredProjects || state.projects || []).filter(p => {
        const r = (p.region || '').toUpperCase();
        if (r === 'CORPORATE') return false;
        if (r === 'PLANT OPERATIONS') return false;
        if (typeof kpmIsNA === 'function' && kpmIsNA(p)) return false;
        return true;
    });

    if (!allProjs.length) {
        showToast('No project data to export.', 'info');
        return;
    }

    showToast('Generating KPM Excel file...', 'info');

    // ── ExcelJS workbook ──────────────────────────────────────────────────────
    const wb = eshNewWorkbook('ESH Monitoring System');

    // ── Pre-create OVERALL SUMMARY as first sheet ─────────────────────────────
    wb.addWorksheet('OVERALL SUMMARY');

    // ── Helpers ───────────────────────────────────────────────────────────────
    function getKpmVal(proj, mo, rowId) {
        if (!proj.vals) return null;
        const v = proj.vals['kpm_v3_' + mo + '_' + rowId];
        return (v !== undefined && v !== null && v !== '') ? String(v) : null;
    }
    function getKpmStatus(proj, mo) {
        // Returns special status: 'non-submission', 'project-completion', 'project-on-hold', or null
        if (!proj.vals) return null;
        return proj.vals['kpm_v3_' + mo + '_status'] || null;
    }
    function parsePct(s) {
        if (!s) return null;
        const n = parseFloat(String(s).replace('%', ''));
        return isNaN(n) ? null : n;
    }
    // Returns true if this project's month should be excluded from computation
    // Covers: work-stoppage blacklisted months AND post-finish months
    function isMonthFrozenForExcel(proj, mo) {
        // Finished project — months after finish date are excluded
        if (proj.dateFinished) {
            const moIdx0 = MO_LONG.indexOf(mo); // 0-based
            const finD = new Date(proj.dateFinished);
            const finAbsMo = finD.getFullYear() * 12 + finD.getMonth();
            const cellAbsMo = (year * 12) + moIdx0;
            if (cellAbsMo > finAbsMo) return true;
        }
        // Work-stoppage blacklisted months
        const moIdx1 = MO_LONG.indexOf(mo) + 1; // 1-based
        if (typeof isMonthBlacklistedForProject === 'function') {
            return isMonthBlacklistedForProject(proj, moIdx1, year);
        }
        // Fallback: full stoppage with no resume
        return !!(proj.workStoppageDate && !proj.workResumeDate);
    }

    function projMonthScore(proj, mo) {
        if (isMonthFrozenForExcel(proj, mo)) return null; // excluded from computation
        let wSum = 0, wTot = 0;
        rows.forEach(r => {
            const v = parsePct(getKpmVal(proj, mo, r.id));
            if (v !== null) { wSum += v * (r.dw || 1); wTot += (r.dw || 1); }
        });
        return wTot > 0 ? wSum / wTot : null;
    }
    function projOverallScore(proj) {
        const scores = MO_LONG.map(mo => projMonthScore(proj, mo)).filter(v => v !== null);
        return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    }

    // ── Color logic ───────────────────────────────────────────────────────────
    function scoreColor(v) {
        if (v === null) return null;
        if (v >= 90) return { bg: 'C8E6C9', fg: '1B5E20' };
        if (v >= 85) return { bg: 'FFF9C4', fg: '82500D' };
        if (v >= 75) return { bg: 'FFF9C4', fg: '82500D' };
        return { bg: 'FFCDD2', fg: 'B71C1C' };
    }

    const C_DARK_GREEN  = '1B5E20';
    const C_MED_GREEN   = '2E7D32';
    const C_LIGHT_GREEN = 'E8F5E9';
        // non-submission / status bg
    const C_WHITE       = 'FFFFFFFF';
    const C_GRAY_HDR    = 'F5F5F5';
    const C_COL_HDR_BG  = '37474F';    // dark blue-gray for left fixed columns header
    const C_COL_HDR_FG  = 'FFFFFF';

    // ── Style helpers ─────────────────────────────────────────────────────────
    function applyHeaderStyle(cell, bgArgb, fgArgb) {
        cell.font      = { bold: true, color: { argb: fgArgb || C_COL_HDR_FG }, size: 9, name: 'Calibri' };
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + (bgArgb || C_COL_HDR_BG) } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border    = {
            top:    { style: 'thin', color: { argb: 'FFB0BEC5' } },
            bottom: { style: 'thin', color: { argb: 'FFB0BEC5' } },
            left:   { style: 'thin', color: { argb: 'FFB0BEC5' } },
            right:  { style: 'thin', color: { argb: 'FFB0BEC5' } }
        };
    }
    function applyScoreCell(cell, rawVal, statusStr) {
        const thinBorder = {
            top:    { style: 'thin', color: { argb: 'FFB0BEC5' } },
            bottom: { style: 'thin', color: { argb: 'FFB0BEC5' } },
            left:   { style: 'thin', color: { argb: 'FFB0BEC5' } },
            right:  { style: 'thin', color: { argb: 'FFB0BEC5' } }
        };
        cell.border = thinBorder;
        // Special statuses — teal background, rotated label
        if (statusStr) {
            cell.value     = '';
            cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB2DFDB' } };
            cell.font      = { size: 8, name: 'Calibri', color: { argb: 'FF004D40' }, italic: true };
            cell.alignment = { horizontal: 'center', vertical: 'middle', textRotation: 90, wrapText: false };
            return;
        }
        const num = parsePct(rawVal);
        cell.value     = rawVal || '';
        cell.font      = { bold: num !== null, size: 9, name: 'Calibri' };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        if (num !== null) {
            const c = scoreColor(num);
            if (c) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + c.bg } };
                cell.font = { bold: true, size: 9, name: 'Calibri', color: { argb: 'FF' + c.fg } };
            }
        }
    }
    function applyAvgCell(cell, score) {
        cell.border = {
            top: { style: 'medium', color: { argb: 'FF' + C_MED_GREEN } },
            bottom: { style: 'medium', color: { argb: 'FF' + C_MED_GREEN } },
            left: { style: 'medium', color: { argb: 'FF' + C_MED_GREEN } },
            right: { style: 'medium', color: { argb: 'FF' + C_MED_GREEN } }
        };
        if (score === null) { cell.value = '—'; cell.font = { size: 9, name: 'Calibri', color: { argb: 'FF9E9E9E' } }; cell.alignment = { horizontal: 'center', vertical: 'middle' }; return; }
        const pct = Math.round(score) + '%';
        cell.value     = pct;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        const c = scoreColor(score);
        if (c) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + c.bg } };
            cell.font = { bold: true, size: 10, name: 'Calibri', color: { argb: 'FF' + c.fg } };
        }
    }
    function leftCellStyle(cell, bold) {
        cell.font      = { bold: !!bold, size: 8.5, name: 'Calibri' };
        cell.alignment = { vertical: 'middle', wrapText: true };
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_GRAY_HDR } };
        cell.border    = {
            top:    { style: 'thin', color: { argb: 'FFB0BEC5' } },
            bottom: { style: 'thin', color: { argb: 'FFB0BEC5' } },
            left:   { style: 'thin', color: { argb: 'FFB0BEC5' } },
            right:  { style: 'medium', color: { argb: 'FF' + C_MED_GREEN } }
        };
    }

    // ── Build per-region project list (sorted) ────────────────────────────────
    const KPM_REGIONS = ['NCR', 'SOUTH LUZON', 'NORTH LUZON', 'VISAYAS & MINDANAO'];
    const sortedRegions = KPM_REGIONS.filter(r => allProjs.some(p => (p.region || '').toUpperCase() === r));
    const otherRegions  = [...new Set(allProjs.map(p => (p.region || '').toUpperCase()).filter(r => !KPM_REGIONS.includes(r)))];
    const allRegionOrder = [...sortedRegions, ...otherRegions];

    // Ordered project list per region (used for consistent column order)
    const projsByRegion = {};
    allRegionOrder.forEach(r => {
        projsByRegion[r] = allProjs.filter(p => (p.region || '').toUpperCase() === r);
    });
    // Flat ordered project list
    const orderedProjs = allRegionOrder.flatMap(r => projsByRegion[r]);

    // ── Fixed left columns: WORK PROCESS | DELIVERABLES | DW | MEASURE ────────
    const LEFT_COLS = 4;
    // Col 1 = Work Process, Col 2 = Deliverables, Col 3 = DW, Col 4 = Measure
    // Then: one col per project + 1 AVG col per region group

    // Build column map: [LEFT_COLS fixed] + [proj cols + AVG per region]
    // We need: projects grouped per region, each group ends with an AVG col
    const colMap = []; // { type: 'proj'|'avg'|'overall', proj?, region? }
    allRegionOrder.forEach(region => {
        projsByRegion[region].forEach(proj => {
            colMap.push({ type: 'proj', proj, region });
        });
        colMap.push({ type: 'avg', region });
    });
    // Add overall average column at the end (across ALL regions)
    colMap.push({ type: 'overall' });
    const totalCols = LEFT_COLS + colMap.length;

    // ── NOTES ROW style helper ─────────────────────────────────────────────────
    function addNotesRow(ws, totalCols) {
        const noteRow = ws.addRow([
            'NOTES: 1) If the KPM or KPI is not applicable, do not delete the cell/row, put "N/A" or c/o "CO or CEY" instead.  2) Attached the corresponding evidences and/or records.'
        ]);
        ws.mergeCells(noteRow.number, 1, noteRow.number, totalCols);
        const nc = noteRow.getCell(1);
        nc.font      = { size: 8, name: 'Calibri', color: { argb: 'FF5D4037' }, italic: true };
        nc.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF9C4' } };
        nc.alignment = { vertical: 'middle', wrapText: true };
        noteRow.height = 22;
        return noteRow;
    }

    // ── Build one CONSOLIDATED KPI sheet per month (submitted months only) ───────
    const submittedMonths = MO_LONG.filter(mo =>
        allProjs.some(p => rows.some(r => getKpmVal(p, mo, r.id)))
    );

    if (!submittedMonths.length) {
        showToast('No KPM submissions found for this year.', 'info');
        return;
    }

    submittedMonths.forEach((mo) => {
        const moIdx       = MO_LONG.indexOf(mo);
        const moShortName = MO_SHORT[moIdx];
        const sheetName   = ('KPI-' + moShortName + '-' + year).substring(0, 31);
        const ws          = wb.addWorksheet(sheetName);

        // ── Row 1: Notes ────────────────────────────────────────────────────────
        addNotesRow(ws, totalCols);

        // ── Row 2: Spacer ───────────────────────────────────────────────────────
        ws.addRow([]);
        ws.getRow(2).height = 6;

        // ── Row 3: Region header spans ──────────────────────────────────────────
        const regHdrRow = ws.addRow(Array(totalCols).fill(''));
        regHdrRow.height = 20;
        let colOffset = LEFT_COLS + 1;
        allRegionOrder.forEach(region => {
            const projCount = projsByRegion[region].length;
            const spanStart = colOffset;
            const spanEnd   = colOffset + projCount; // +1 for AVG col
            const c = regHdrRow.getCell(spanStart);
            c.value = region;
            c.font  = { bold: true, color: { argb: C_COL_HDR_FG }, size: 10, name: 'Calibri' };
            c.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_DARK_GREEN } };
            c.alignment = { horizontal: 'center', vertical: 'middle' };
            if (spanEnd > spanStart) ws.mergeCells(regHdrRow.number, spanStart, regHdrRow.number, spanEnd);
            colOffset += projCount + 1;
        });
        // Overall avg column header in region row
        const overallRegHdrCell = regHdrRow.getCell(colOffset);
        overallRegHdrCell.value = 'OVERALL';
        overallRegHdrCell.font  = { bold: true, color: { argb: C_COL_HDR_FG }, size: 10, name: 'Calibri' };
        overallRegHdrCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A237E' } };
        overallRegHdrCell.alignment = { horizontal: 'center', vertical: 'middle' };
        // Blank fixed-col area in region row
        for (let ci = 1; ci <= LEFT_COLS; ci++) {
            const c = regHdrRow.getCell(ci);
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_DARK_GREEN } };
        }

        // ── Row 4: Column headers (Work Process | Del | DW | Measure | proj names | AVG) ─
        const hdrData = ['Work Process', 'Deliverables', 'Del.\nWeight (DW)', 'Measure'];
        colMap.forEach(cm => {
            hdrData.push(cm.type === 'proj' ? (cm.proj.name || '') : 'AVG');
        });
        const hdrRow = ws.addRow(hdrData);
        hdrRow.height = 45;
        for (let ci = 1; ci <= LEFT_COLS; ci++) {
            applyHeaderStyle(hdrRow.getCell(ci), C_COL_HDR_BG, C_COL_HDR_FG);
        }
        colMap.forEach((cm, i) => {
            const ci = LEFT_COLS + 1 + i;
            if (cm.type === 'avg') {
                applyHeaderStyle(hdrRow.getCell(ci), C_MED_GREEN, 'FFFFFF');
                hdrRow.getCell(ci).value = 'REGION\nAVG';
            } else if (cm.type === 'overall') {
                applyHeaderStyle(hdrRow.getCell(ci), '1A237E', 'FFFFFF');
                hdrRow.getCell(ci).value = 'OVERALL\nAVG';
            } else {
                // Color-code by project status:
                //   work-stoppage (full, no resume) → pink header
                //   finished → grey-blue header
                //   active/resumed → dark green header
                const isFullStop = cm.proj.workStoppageDate && !cm.proj.workResumeDate;
                const isFinished = !!cm.proj.dateFinished;
                const hBg = isFullStop ? 'FCE4EC' : isFinished ? '90A4AE' : C_COL_HDR_BG;
                const hFg = isFullStop ? '880E4F' : isFinished ? 'FFFFFF' : C_COL_HDR_FG;
                applyHeaderStyle(hdrRow.getCell(ci), hBg, hFg);
                // Add status badge suffix to project name in header
                const badge = isFullStop ? ' ⏸ STOPPED' : isFinished ? ' ✓ DONE' : '';
                if (badge) hdrRow.getCell(ci).value = (cm.proj.name || '') + badge;
            }
        });

        // ── Data rows: one per KPM measure ─────────────────────────────────────
        // Group rows by Work Process for merging
        let dataRowStart = 5; // current row index in worksheet (1-based)

        // Track wp / del merge ranges
         // { startRow, endRow, label }
         // { startRow, endRow, label }

        rows.forEach((kpmRow, ri) => {
            const rowArr = [
                kpmRow.wp  || '',   // Work Process
                kpmRow.del || '',   // Deliverables
                kpmRow.dw  ? (Math.round(kpmRow.dw * 100) + '%') : '',  // DW
                kpmRow.measure || kpmRow.del || ''  // Measure
            ];

            // Per project values
            colMap.forEach(cm => {
                if (cm.type === 'proj') {
                    rowArr.push(getKpmVal(cm.proj, mo, kpmRow.id) || '');
                } else if (cm.type === 'overall') {
                    // Overall AVG across ALL projects
                    const vals = orderedProjs.map(p => parsePct(getKpmVal(p, mo, kpmRow.id))).filter(v => v !== null);
                    rowArr.push(vals.length ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length) + '%' : '');
                } else {
                    // Region AVG for this measure/month
                    const regProjs = projsByRegion[cm.region];
                    const vals = regProjs.map(p => parsePct(getKpmVal(p, mo, kpmRow.id))).filter(v => v !== null);
                    rowArr.push(vals.length ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length) + '%' : '');
                }
            });

            const dataRow = ws.addRow(rowArr);
            dataRow.height = 36;

            // Left 4 cols styling
            leftCellStyle(dataRow.getCell(1), false); // wp — will be merged, content set after
            leftCellStyle(dataRow.getCell(2), false); // del
            // DW cell
            const dwCell = dataRow.getCell(3);
            dwCell.font      = { bold: true, size: 8.5, name: 'Calibri', color: { argb: 'FF1B5E20' } };
            dwCell.alignment = { horizontal: 'center', vertical: 'middle' };
            dwCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_GRAY_HDR } };
            dwCell.border    = { top:{style:'thin',color:{argb:'FFB0BEC5'}}, bottom:{style:'thin',color:{argb:'FFB0BEC5'}}, left:{style:'thin',color:{argb:'FFB0BEC5'}}, right:{style:'medium',color:{argb:'FF'+C_MED_GREEN}} };
            // Measure cell
            const mCell = dataRow.getCell(4);
            mCell.font      = { size: 8, name: 'Calibri', italic: true };
            mCell.alignment = { vertical: 'middle', wrapText: true };
            mCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_GRAY_HDR } };
            mCell.border    = { top:{style:'thin',color:{argb:'FFB0BEC5'}}, bottom:{style:'thin',color:{argb:'FFB0BEC5'}}, left:{style:'thin',color:{argb:'FFB0BEC5'}}, right:{style:'medium',color:{argb:'FF'+C_MED_GREEN}} };

            // Score cells
            colMap.forEach((cm, i) => {
                const ci = LEFT_COLS + 1 + i;
                const cell = dataRow.getCell(ci);
                if (cm.type === 'proj') {
                    if (cm.proj.dateFinished) {
                        // Grey-blue "FINISHED" cell — project is done, excluded from computation
                        const finDate = cm.proj.dateFinished;
                        const finMoIdx = MO_LONG.indexOf(mo); // 0-based
                        const finD = new Date(finDate);
                        const finAbsMo = finD.getFullYear() * 12 + finD.getMonth(); // 0-based abs month
                        const cellAbsMo = (year * 12) + finMoIdx;
                        // Months AFTER finish date → grey "FINISHED"
                        // Months ON or BEFORE finish date → show actual data if any
                        if (cellAbsMo > finAbsMo) {
                            cell.value     = '—';
                            cell.font      = { bold: true, size: 10, name: 'Calibri', color: { argb: 'FFB0BEC5' } };
                            cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEcEff1' } };
                            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false };
                            cell.border    = {
                                top:    { style: 'thin', color: { argb: 'FFB0BEC5' } },
                                bottom: { style: 'thin', color: { argb: 'FFB0BEC5' } },
                                left:   { style: 'thin', color: { argb: 'FFB0BEC5' } },
                                right:  { style: 'thin', color: { argb: 'FFB0BEC5' } }
                            };
                        } else {
                            const rawVal = getKpmVal(cm.proj, mo, kpmRow.id);
                            const status = getKpmStatus(cm.proj, mo);
                            applyScoreCell(cell, rawVal, status);
                        }
                    } else if (isMonthFrozenForExcel(cm.proj, mo)) {
                        // Pink cell with "—" — excluded from computation (header already says STOPPED)
                        cell.value     = '—';
                        cell.font      = { bold: true, size: 10, name: 'Calibri', color: { argb: 'FFE57373' } };
                        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4EC' } };
                        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false };
                        cell.border    = {
                            top:    { style: 'thin', color: { argb: 'FFF48FB1' } },
                            bottom: { style: 'thin', color: { argb: 'FFF48FB1' } },
                            left:   { style: 'thin', color: { argb: 'FFF48FB1' } },
                            right:  { style: 'thin', color: { argb: 'FFF48FB1' } }
                        };
                    } else {
                        const rawVal = getKpmVal(cm.proj, mo, kpmRow.id);
                        const status = getKpmStatus(cm.proj, mo);
                        applyScoreCell(cell, rawVal, status);
                    }
                } else if (cm.type === 'overall') {
                    // Overall AVG — exclude frozen projects from computation
                    const vals = orderedProjs
                        .filter(p => !isMonthFrozenForExcel(p, mo))
                        .map(p => parsePct(getKpmVal(p, mo, kpmRow.id))).filter(v => v !== null);
                    const avg  = vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : null;
                    applyAvgCell(cell, avg);
                    // Extra styling to distinguish overall col
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EAF6' } };
                    cell.font = { bold: true, size: 9, name: 'Calibri', color: { argb: 'FF1A237E' } };
                } else {
                    // Region AVG — exclude frozen projects from computation
                    const regProjs = projsByRegion[cm.region];
                    const vals = regProjs
                        .filter(p => !isMonthFrozenForExcel(p, mo))
                        .map(p => parsePct(getKpmVal(p, mo, kpmRow.id))).filter(v => v !== null);
                    const avg  = vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : null;
                    applyAvgCell(cell, avg);
                }
            });

            dataRowStart++;
        });

        // ── KPI SCORE row (weighted avg per project for the month) ─────────────
        const scoreArr = ['KPI SCORE', '', '', ''];
        colMap.forEach(cm => {
            if (cm.type === 'proj') {
                if (cm.proj.dateFinished && isMonthFrozenForExcel(cm.proj, mo)) {
                    scoreArr.push('—'); // finished project — post-completion month
                } else if (isMonthFrozenForExcel(cm.proj, mo)) {
                    scoreArr.push('—'); // work-stoppage frozen — excluded from KPI score
                } else {
                    const score = projMonthScore(cm.proj, mo);
                    scoreArr.push(score !== null ? Math.round(score) + '%' : '—');
                }
            } else if (cm.type === 'overall') {
                const scores = orderedProjs
                    .filter(p => !isMonthFrozenForExcel(p, mo))
                    .map(p => projMonthScore(p, mo)).filter(v => v !== null);
                const avg = scores.length ? scores.reduce((a,b)=>a+b,0)/scores.length : null;
                scoreArr.push(avg !== null ? Math.round(avg) + '%' : '—');
            } else {
                const regProjs = projsByRegion[cm.region];
                const scores = regProjs
                    .filter(p => !isMonthFrozenForExcel(p, mo))
                    .map(p => projMonthScore(p, mo)).filter(v => v !== null);
                const avg = scores.length ? scores.reduce((a,b)=>a+b,0)/scores.length : null;
                scoreArr.push(avg !== null ? Math.round(avg) + '%' : '—');
            }
        });
        const scoreRow = ws.addRow(scoreArr);
        scoreRow.height = 22;
        ws.mergeCells(scoreRow.number, 1, scoreRow.number, LEFT_COLS);
        const scoreLbl = scoreRow.getCell(1);
        scoreLbl.value     = 'KPI SCORE';
        scoreLbl.font      = { bold: true, size: 10, name: 'Calibri', color: { argb: C_COL_HDR_FG } };
        scoreLbl.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_DARK_GREEN } };
        scoreLbl.alignment = { horizontal: 'center', vertical: 'middle' };
        colMap.forEach((cm, i) => {
            const ci = LEFT_COLS + 1 + i;
            const cell = scoreRow.getCell(ci);
            if (cm.type === 'overall') {
                const scores = orderedProjs
                    .filter(p => !isMonthFrozenForExcel(p, mo))
                    .map(p => projMonthScore(p, mo)).filter(v => v !== null);
                const avg = scores.length ? scores.reduce((a,b)=>a+b,0)/scores.length : null;
                applyAvgCell(cell, avg);
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A237E' } };
                cell.font = { bold: true, size: 10, name: 'Calibri', color: { argb: 'FFFFFFFF' } };
            } else {
                applyAvgCell(cell, cm.type === 'proj'
                    ? projMonthScore(cm.proj, mo)
                    : (function() {
                        const rp = projsByRegion[cm.region];
                        const sv = rp
                            .filter(p => !isMonthFrozenForExcel(p, mo))
                            .map(p => projMonthScore(p, mo)).filter(v => v !== null);
                        return sv.length ? sv.reduce((a,b)=>a+b,0)/sv.length : null;
                      })()
                );
            }
        });

        // ── Merge Work Process cells vertically ────────────────────────────────
        // rows array already has wp set only on first row of group (blank after)
        // Build merge ranges from the rows data
        const kpmDataStartRow = 5; // row 5 is first data row
        let wpStart = kpmDataStartRow, curWp = rows[0]?.wp || '';
        rows.forEach((kpmRow, ri) => {
            const isLast = ri === rows.length - 1;
            const nextWp = !isLast ? (rows[ri+1].wp || '') : null;
            if (nextWp !== curWp || isLast) {
                const wpEnd = kpmDataStartRow + ri;
                if (wpEnd > wpStart) {
                    ws.mergeCells(wpStart, 1, wpEnd, 1);
                }
                ws.getCell(wpStart, 1).value     = curWp;
                ws.getCell(wpStart, 1).font      = { bold: true, size: 8.5, name: 'Calibri' };
                ws.getCell(wpStart, 1).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                ws.getCell(wpStart, 1).fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_GRAY_HDR } };
                ws.getCell(wpStart, 1).border    = { top:{style:'thin',color:{argb:'FFB0BEC5'}}, bottom:{style:'medium',color:{argb:'FF'+C_MED_GREEN}}, left:{style:'thin',color:{argb:'FFB0BEC5'}}, right:{style:'medium',color:{argb:'FF'+C_MED_GREEN}} };
                curWp  = nextWp || '';
                wpStart = kpmDataStartRow + ri + 1;
            }
        });

        // Merge Deliverables cells (same logic, by del field)
        let delStart = kpmDataStartRow, curDel = rows[0]?.del || '';
        rows.forEach((kpmRow, ri) => {
            const isLast = ri === rows.length - 1;
            const nextDel = !isLast ? (rows[ri+1].del || '') : null;
            if (nextDel !== curDel || isLast) {
                const delEnd = kpmDataStartRow + ri;
                if (delEnd > delStart) {
                    ws.mergeCells(delStart, 2, delEnd, 2);
                }
                ws.getCell(delStart, 2).value     = curDel;
                ws.getCell(delStart, 2).font      = { size: 8.5, name: 'Calibri' };
                ws.getCell(delStart, 2).alignment = { vertical: 'middle', wrapText: true };
                ws.getCell(delStart, 2).fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_GRAY_HDR } };
                ws.getCell(delStart, 2).border    = { top:{style:'thin',color:{argb:'FFB0BEC5'}}, bottom:{style:'thin',color:{argb:'FFB0BEC5'}}, left:{style:'thin',color:{argb:'FFB0BEC5'}}, right:{style:'medium',color:{argb:'FF'+C_MED_GREEN}} };
                curDel  = nextDel || '';
                delStart = kpmDataStartRow + ri + 1;
            }
        });

        // ── Column widths ───────────────────────────────────────────────────────
        ws.getColumn(1).width = 18;  // Work Process
        ws.getColumn(2).width = 18;  // Deliverables
        ws.getColumn(3).width = 7;   // DW
        ws.getColumn(4).width = 28;  // Measure
        colMap.forEach((cm, i) => {
            ws.getColumn(LEFT_COLS + 1 + i).width = cm.type === 'avg' ? 8 : cm.type === 'overall' ? 10 : 14;
        });

        // ── Freeze panes — freeze row 4 (header) and first 4 cols ───────────────
        ws.views = [{ state: 'frozen', xSplit: LEFT_COLS, ySplit: 4, activeCell: 'E5' }];
    });

    // ── OVERALL SUMMARY SHEET — already created first (see top), now populating ─
    const sumWs = wb.getWorksheet('OVERALL SUMMARY');
    addNotesRow(sumWs, totalCols);
    sumWs.addRow([]); sumWs.getRow(2).height = 6;

    // Region header
    const sRegHdr = sumWs.addRow(Array(totalCols).fill(''));
    sRegHdr.height = 20;
    let sColOff = LEFT_COLS + 1;
    allRegionOrder.forEach(region => {
        const pc = projsByRegion[region].length;
        const c  = sRegHdr.getCell(sColOff);
        c.value = region;
        c.font  = { bold: true, color: { argb: C_COL_HDR_FG }, size: 10, name: 'Calibri' };
        c.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_DARK_GREEN } };
        c.alignment = { horizontal: 'center', vertical: 'middle' };
        if (pc > 0) sumWs.mergeCells(sRegHdr.number, sColOff, sRegHdr.number, sColOff + pc);
        sColOff += pc + 1;
    });
    // Overall column label in region header row
    const sOverallRegHdr = sRegHdr.getCell(sColOff);
    sOverallRegHdr.value = 'OVERALL';
    sOverallRegHdr.font  = { bold: true, color: { argb: C_COL_HDR_FG }, size: 10, name: 'Calibri' };
    sOverallRegHdr.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A237E' } };
    sOverallRegHdr.alignment = { horizontal: 'center', vertical: 'middle' };
    for (let ci = 1; ci <= LEFT_COLS; ci++) {
        sRegHdr.getCell(ci).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_DARK_GREEN } };
    }

    // Column header — months as rows in summary? No — use projects as cols, months as rows
    // Summary: rows = months, cols = projects (same pivot but transposed per month)
    const sHdrData = ['Month', '', '', ''];
    colMap.forEach(cm => sHdrData.push(cm.type === 'proj' ? (cm.proj.name || '') : cm.type === 'overall' ? 'OVERALL\nAVG' : 'REGION\nAVG'));
    const sHdrRow = sumWs.addRow(sHdrData);
    sHdrRow.height = 45;
    sumWs.mergeCells(sHdrRow.number, 1, sHdrRow.number, LEFT_COLS);
    for (let ci = 1; ci <= LEFT_COLS; ci++) applyHeaderStyle(sHdrRow.getCell(ci), C_COL_HDR_BG, C_COL_HDR_FG);
    sHdrRow.getCell(1).value = 'MONTH';
    colMap.forEach((cm, i) => {
        const ci = LEFT_COLS + 1 + i;
        if (cm.type === 'overall') {
            applyHeaderStyle(sHdrRow.getCell(ci), '1A237E', 'FFFFFF');
        } else if (cm.type === 'avg') {
            applyHeaderStyle(sHdrRow.getCell(ci), C_MED_GREEN, C_COL_HDR_FG);
        } else {
            // Color-code by project status (same as monthly sheets)
            const isFullStop = cm.proj.workStoppageDate && !cm.proj.workResumeDate;
            const isFinished = !!cm.proj.dateFinished;
            const hBg = isFullStop ? 'FCE4EC' : isFinished ? '90A4AE' : C_COL_HDR_BG;
            const hFg = isFullStop ? '880E4F' : isFinished ? 'FFFFFF' : C_COL_HDR_FG;
            applyHeaderStyle(sHdrRow.getCell(ci), hBg, hFg);
            const badge = isFullStop ? ' ⏸ STOPPED' : isFinished ? ' ✓ DONE' : '';
            if (badge) sHdrRow.getCell(ci).value = (cm.proj.name || '') + badge;
        }
    });

    // One row per submitted month only
    submittedMonths.forEach((mo) => {
        const moIdx = MO_LONG.indexOf(mo);
        const mRowData = [MO_SHORT[moIdx], '', '', ''];
        colMap.forEach(cm => {
            if (cm.type === 'proj') {
                const s = projMonthScore(cm.proj, mo);
                mRowData.push(s !== null ? Math.round(s) + '%' : '—');
            } else if (cm.type === 'overall') {
                const sv = orderedProjs
                    .filter(p => !isMonthFrozenForExcel(p, mo))
                    .map(p => projMonthScore(p, mo)).filter(v => v !== null);
                const avg = sv.length ? sv.reduce((a,b)=>a+b,0)/sv.length : null;
                mRowData.push(avg !== null ? Math.round(avg) + '%' : '—');
            } else {
                const rp = projsByRegion[cm.region];
                const sv = rp
                    .filter(p => !isMonthFrozenForExcel(p, mo))
                    .map(p => projMonthScore(p, mo)).filter(v => v !== null);
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
            const ci = LEFT_COLS + 1 + i;
            const cell = mRow.getCell(ci);
            if (cm.type === 'overall') {
                const sv = orderedProjs.map(p => projMonthScore(p, mo)).filter(v => v !== null);
                const avg = sv.length ? sv.reduce((a,b)=>a+b,0)/sv.length : null;
                applyAvgCell(cell, avg);
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EAF6' } };
                cell.font = { bold: true, size: 9, name: 'Calibri', color: { argb: 'FF1A237E' } };
            } else if (cm.type === 'proj') {
                const thinBorder = { top:{style:'thin',color:{argb:'FFB0BEC5'}}, bottom:{style:'thin',color:{argb:'FFB0BEC5'}}, left:{style:'thin',color:{argb:'FFB0BEC5'}}, right:{style:'thin',color:{argb:'FFB0BEC5'}} };
                // Check if finished project — post-finish months → grey
                if (cm.proj.dateFinished) {
                    const finD = new Date(cm.proj.dateFinished);
                    const finAbsMo = finD.getFullYear() * 12 + finD.getMonth();
                    const cellAbsMo = (year * 12) + moIdx;
                    if (cellAbsMo > finAbsMo) {
                        cell.value     = '—';
                        cell.font      = { bold: true, size: 9, name: 'Calibri', color: { argb: 'FFB0BEC5' } };
                        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECEFF1' } };
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                        cell.border    = thinBorder;
                        return;
                    }
                }
                // Check if month is frozen (work-stoppage)
                if (isMonthFrozenForExcel(cm.proj, mo)) {
                    cell.value     = '—';
                    cell.font      = { bold: true, size: 9, name: 'Calibri', color: { argb: 'FFE57373' } };
                    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4EC' } };
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    cell.border    = { top:{style:'thin',color:{argb:'FFF48FB1'}}, bottom:{style:'thin',color:{argb:'FFF48FB1'}}, left:{style:'thin',color:{argb:'FFF48FB1'}}, right:{style:'thin',color:{argb:'FFF48FB1'}} };
                    return;
                }
                // Normal — apply score color
                applyAvgCell(cell, projMonthScore(cm.proj, mo));
            } else {
                applyAvgCell(cell, cm.type === 'proj'
                    ? projMonthScore(cm.proj, mo)
                    : (function() {
                        const rp = projsByRegion[cm.region];
                        const sv = rp.map(p => projMonthScore(p, mo)).filter(v => v !== null);
                        return sv.length ? sv.reduce((a,b)=>a+b,0)/sv.length : null;
                      })()
                );
            }
        });
    });

    // Overall avg row
    const ovArr = ['OVERALL AVG', '', '', ''];
    colMap.forEach(cm => {
        if (cm.type === 'proj') {
            const s = projOverallScore(cm.proj);
            ovArr.push(s !== null ? Math.round(s) + '%' : '—');
        } else if (cm.type === 'overall') {
            const sv = orderedProjs.map(p => projOverallScore(p)).filter(v => v !== null);
            const avg = sv.length ? sv.reduce((a,b)=>a+b,0)/sv.length : null;
            ovArr.push(avg !== null ? Math.round(avg) + '%' : '—');
        } else {
            const rp = projsByRegion[cm.region];
            const sv = rp.map(p => projOverallScore(p)).filter(v => v !== null);
            const avg = sv.length ? sv.reduce((a,b)=>a+b,0)/sv.length : null;
            ovArr.push(avg !== null ? Math.round(avg) + '%' : '—');
        }
    });
    const ovRow = sumWs.addRow(ovArr);
    ovRow.height = 22;
    sumWs.mergeCells(ovRow.number, 1, ovRow.number, LEFT_COLS);
    const ovLbl = ovRow.getCell(1);
    ovLbl.value = 'OVERALL AVG'; ovLbl.font = { bold: true, size: 10, name: 'Calibri', color: { argb: C_COL_HDR_FG } };
    ovLbl.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_DARK_GREEN } };
    ovLbl.alignment = { horizontal: 'center', vertical: 'middle' };
    colMap.forEach((cm, i) => {
        const cell = ovRow.getCell(LEFT_COLS + 1 + i);
        if (cm.type === 'overall') {
            const sv = orderedProjs.map(p => projOverallScore(p)).filter(v => v !== null);
            const avg = sv.length ? sv.reduce((a,b)=>a+b,0)/sv.length : null;
            applyAvgCell(cell, avg);
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A237E' } };
            cell.font = { bold: true, size: 10, name: 'Calibri', color: { argb: 'FFFFFFFF' } };
        } else if (cm.type === 'proj') {
            const thinBorder = { top:{style:'thin',color:{argb:'FFB0BEC5'}}, bottom:{style:'thin',color:{argb:'FFB0BEC5'}}, left:{style:'thin',color:{argb:'FFB0BEC5'}}, right:{style:'thin',color:{argb:'FFB0BEC5'}} };
            const isFullStop = cm.proj.workStoppageDate && !cm.proj.workResumeDate;
            const isFinished = !!cm.proj.dateFinished;
            if (isFinished) {
                cell.value     = projOverallScore(cm.proj) !== null ? Math.round(projOverallScore(cm.proj)) + '%' : '—';
                cell.font      = { bold: true, size: 9, name: 'Calibri', color: { argb: 'FF78909C' } };
                cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECEFF1' } };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border    = thinBorder;
            } else if (isFullStop) {
                cell.value     = '⏸';
                cell.font      = { bold: true, size: 9, name: 'Calibri', color: { argb: 'FFE57373' } };
                cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4EC' } };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border    = { top:{style:'thin',color:{argb:'FFF48FB1'}}, bottom:{style:'thin',color:{argb:'FFF48FB1'}}, left:{style:'thin',color:{argb:'FFF48FB1'}}, right:{style:'thin',color:{argb:'FFF48FB1'}} };
            } else {
                applyAvgCell(cell, projOverallScore(cm.proj));
            }
        } else {
            applyAvgCell(cell, cm.type === 'proj'
                ? projOverallScore(cm.proj)
                : (function() {
                    const rp = projsByRegion[cm.region];
                    const sv = rp.map(p => projOverallScore(p)).filter(v => v !== null);
                    return sv.length ? sv.reduce((a,b)=>a+b,0)/sv.length : null;
                  })()
            );
        }
    });

    // Summary col widths
    sumWs.getColumn(1).width = 12;
    for (let ci = 2; ci <= LEFT_COLS; ci++) sumWs.getColumn(ci).width = 5;
    colMap.forEach((cm, i) => { sumWs.getColumn(LEFT_COLS + 1 + i).width = cm.type === 'avg' ? 8 : cm.type === 'overall' ? 10 : 14; });
    sumWs.views = [{ state: 'frozen', xSplit: LEFT_COLS, ySplit: 4, activeCell: 'E5' }];

    // Legend row — status color guide
    const legendRow = sumWs.addRow([]);
    legendRow.height = 16;
    sumWs.mergeCells(legendRow.number, 1, legendRow.number, totalCols);
    const lgCell = legendRow.getCell(1);
    lgCell.value = '  LEGEND:  🔲 Grey column = FINISHED project   🔲 Pink column = WORK-STOPPAGE (no resume)   🟩 ≥90%   🟨 75–89%   🟥 <75%';
    lgCell.font      = { size: 7.5, name: 'Calibri', color: { argb: 'FF5D4037' }, italic: true };
    lgCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF9C4' } };
    lgCell.alignment = { vertical: 'middle', wrapText: false };

    // ── Download ──────────────────────────────────────────────────────────────
    try {
        await eshDownloadXlsx(wb, `SCIC_ESH_KPM_${year}_${new Date().toISOString().slice(0, 10)}.xlsx`);
        showToast('KPM Excel exported successfully!', 'success');
    } catch(err) {
        console.error('KPM Excel export error:', err);
        showToast('KPM export failed. Check console for details.', 'error');
    }
}
