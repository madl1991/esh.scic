
(function() {
    const GHG_FACTOR = 0.0006935;  // tCO2 per kWh (DOE Grid Emission Factor)

    const ENV_REGIONS = window.ENV_REGIONS;
    const ENV_MONTHS  = ['January','February','March','April','May','June','July','August','September','October','November','December'];

    // Use global color source of truth — see window.REGION_COLORS declared at top of file
    const REGION_COLORS = window.REGION_COLORS;

    let envData = [];
    let waterData = [];
    let fuelData = [];
    // Default all regions to collapsed — same behavior as all other tabs
    const _initCollapsed = () => Object.fromEntries((window.REGION_COLORS ? Object.keys(window.REGION_COLORS) : ['NCR','NORTH LUZON','SOUTH LUZON','VISAYAS & MINDANAO','PLANT OPERATIONS','CORPORATE']).map(r=>[r,true]));
    let envCollapsed = _initCollapsed();
    let waterCollapsed = _initCollapsed();
    let fuelCollapsed = _initCollapsed();

    // Load env rows from Yjs/Firestore back into in-memory arrays on tab open
    let _envYjsInflight = null;
    async function loadEnvFromYjs() {
        if (!window.ESHDataSync || !window.firebaseDb || !window.firebase) return;
        if (_envYjsInflight) return _envYjsInflight;          // tab open + chart init both call this: share one load
        _envYjsInflight = _loadEnvFromYjsImpl().finally(() => { _envYjsInflight = null; });
        return _envYjsInflight;
    }
    async function _loadEnvFromYjsImpl() {
        const db = window.firebaseDb;
        const REGIONS = ['NCR','SOUTH LUZON','NORTH LUZON','VISAYAS & MINDANAO','PLANT OPERATIONS'];
        const MODULES = ['env_monitoring', 'env_waste', 'env_water', 'env_fuel'];

        const newEnvData   = [];
        const newWasteData = [];
        const newWaterData = [];
        const newFuelData  = [];

        // Fetch every region x module (updates + tombstones) at the same time instead of one by one.
        const jobs = [];
        for (const region of REGIONS) for (const module of MODULES) jobs.push({ region, module });
        const fetched = await Promise.all(jobs.map(async ({ region, module }) => {
            const path = `ESH_YJS/${region.replace(/[^a-zA-Z0-9]/g,'_')}_${module}`;
            try {
                const [snap, tombSnap] = await Promise.all([
                    window.firebase.getDocs(window.firebase.collection(db, path, 'updates')),
                    window.firebase.getDocs(window.firebase.collection(db, path, 'tombstones')).catch(() => null)
                ]);
                return { region, module, snap, tombSnap };
            } catch(e) { return null; }
        }));

        for (const f of fetched) {
            if (!f) continue;
            const { region, module, snap, tombSnap } = f;
            try {
                if (snap.empty) continue;

                // Reconstruct Yjs doc from stored updates
                const ydoc   = new Y.Doc();
                const ytable = ydoc.getMap('manpower');
                snap.forEach(docSnap => {
                    const raw = docSnap.data().u;
                    if (raw) Y.applyUpdate(ydoc, new Uint8Array(raw));
                });

                // Tombstones (deleted rows)
                const tombstones = new Set();
                if (tombSnap) tombSnap.forEach(t => tombstones.add(t.id));

                    // Extract each row from ytable
                    ytable.forEach((rowMap, rowId) => {
                        if (tombstones.has(rowId)) return;
                        if (!(rowMap instanceof Y.Map)) return;
                        const row = {};
                        rowMap.forEach((val, key) => {
                            if (key !== '__meta') row[key] = val;
                        });
                        if (!row.region) row.region = region;
                        // Restore numeric id from rowId (env_TIMESTAMP)
                        const numId = parseFloat(rowId.replace('env_','')) || (Date.now() + Math.random());
                        row.id = numId;
                        // Parse numeric fields
                        if (module === 'env_monitoring') {
                            row.kwh    = parseFloat(row.kwh)    || 0;
                            row.amount = parseFloat(row.amount) || 0;
                            row.ghg    = row.kwh * GHG_FACTOR;   // always recompute from kWh
                            newEnvData.push(row);
                        } else if (module === 'env_waste') {
                            row.bioGen    = parseFloat(row.bioGen)    || 0;
                            row.bioDisp   = parseFloat(row.bioDisp)   || 0;
                            row.bioDiverted = parseFloat(row.bioDiverted) || 0;
                            row.nonbioGen = parseFloat(row.nonbioGen) || 0;
                            row.nonbioDisp= parseFloat(row.nonbioDisp)|| 0;
                            row.nonbioDiverted = parseFloat(row.nonbioDiverted) || 0;
                            row.recGen    = parseFloat(row.recGen)    || 0;
                            row.recDisp   = parseFloat(row.recDisp)   || 0;
                            row.recDiverted = parseFloat(row.recDiverted) || 0;
                            row.hazGen    = parseFloat(row.hazGen)    || 0;
                            row.hazDisp   = parseFloat(row.hazDisp)   || 0;
                            row.septage   = parseFloat(row.septage)   || 0;
                            newWasteData.push(row);
                        } else if (module === 'env_water') {
                            row.domM3  = parseFloat(row.domM3)  || 0;
                            row.domAmt = parseFloat(row.domAmt) || 0;
                            row.potLit = parseFloat(row.potLit) || 0;
                            row.potAmt = parseFloat(row.potAmt) || 0;
                            row.indM3  = parseFloat(row.indM3)  || 0;
                            row.indAmt = parseFloat(row.indAmt) || 0;
                            newWaterData.push(row);
                        } else if (module === 'env_fuel') {
                            row.dieselLit = parseFloat(row.dieselLit) || 0;
                            row.gasLit    = parseFloat(row.gasLit)    || 0;
                            row.ghg       = parseFloat(row.ghg)       || 0;
                            newFuelData.push(row);
                        }
                    });
            } catch(e) {
            }
        }

        envData   = newEnvData;
        wasteData = newWasteData;
        waterData = newWaterData;
        fuelData  = newFuelData;
        // Only repaint when the loaded data really changed (avoids a flicker on every tab open)
        const _sig = JSON.stringify([newEnvData, newWasteData, newWaterData, newFuelData]);
        const _changed = _sig !== window._envYjsSig;
        window._envYjsSig = _sig;
        if (!_changed) return;
        if (typeof envRenderRegions   === 'function') envRenderRegions();
        if (typeof wasteRenderRegions === 'function') wasteRenderRegions();
        if (typeof waterRenderRegions === 'function') waterRenderRegions();
        if (typeof fuelRenderRegions  === 'function') fuelRenderRegions();
    }
    window.loadEnvFromYjs = loadEnvFromYjs;

    // ─── Firebase sub-collection fallback — each row is its own document ────────
    // Path: users/{ADMIN_UID}/years/{year}/env_monitoring_rows/{rowId}
    //       users/{ADMIN_UID}/years/{year}/env_waste_rows/{rowId}
    // Atomic per-row saves — no more full-array replace on every save.
    async function loadEnvFromFirebaseDirect() {
        if (!window.firebaseDb || !window.firebase) return;
        const db        = window.firebaseDb;
        const ADMIN_UID = 'fUnXsvKnRYMpuySRbeVYJk7TO452';
        const year      = (typeof state !== 'undefined' && state.selectedYear) ? state.selectedYear : new Date().getFullYear();
        try {
            // Load electricity/monitoring rows
            const envColRef   = window.firebase.collection(db, 'users', ADMIN_UID, 'years', String(year), 'env_monitoring_rows');
            const wasteColRef = window.firebase.collection(db, 'users', ADMIN_UID, 'years', String(year), 'env_waste_rows');
            const waterColRef = window.firebase.collection(db, 'users', ADMIN_UID, 'years', String(year), 'env_water_rows');
            const fuelColRef  = window.firebase.collection(db, 'users', ADMIN_UID, 'years', String(year), 'env_fuel_rows');

            const [envSnap, wasteSnap, waterSnap, fuelSnap] = await Promise.all([
                window.firebase.getDocs(envColRef),
                window.firebase.getDocs(wasteColRef),
                window.firebase.getDocs(waterColRef),
                window.firebase.getDocs(fuelColRef)
            ]);

            const rawElec  = [];
            const rawWaste = [];
            const rawWater = [];
            const rawFuel  = [];
            envSnap.forEach(d   => rawElec.push(d.data()));
            wasteSnap.forEach(d => rawWaste.push(d.data()));
            waterSnap.forEach(d => rawWater.push(d.data()));
            fuelSnap.forEach(d  => rawFuel.push(d.data()));

            if (rawElec.length > 0 || rawWaste.length > 0 || rawWater.length > 0 || rawFuel.length > 0) {
                envData = rawElec.map(row => ({
                    ...row,
                    kwh:    parseFloat(row.kwh)    || 0,
                    amount: parseFloat(row.amount) || 0,
                    ghg:    (parseFloat(row.kwh) || 0) * GHG_FACTOR,   // always recompute from kWh
                }));
                wasteData = rawWaste.map(row => ({
                    ...row,
                    bioGen:     parseFloat(row.bioGen)     || 0,
                    bioDisp:    parseFloat(row.bioDisp)    || 0,
                    bioDiverted: parseFloat(row.bioDiverted) || 0,
                    nonbioGen:  parseFloat(row.nonbioGen)  || 0,
                    nonbioDisp: parseFloat(row.nonbioDisp) || 0,
                    nonbioDiverted: parseFloat(row.nonbioDiverted) || 0,
                    recGen:     parseFloat(row.recGen)     || 0,
                    recDisp:    parseFloat(row.recDisp)    || 0,
                    recDiverted: parseFloat(row.recDiverted) || 0,
                    hazGen:     parseFloat(row.hazGen)     || 0,
                    hazDisp:    parseFloat(row.hazDisp)    || 0,
                    septage:    parseFloat(row.septage)    || 0,
                }));
                waterData = rawWater.map(row => ({
                    ...row,
                    domM3:  parseFloat(row.domM3)  || 0,
                    domAmt: parseFloat(row.domAmt) || 0,
                    potLit: parseFloat(row.potLit) || 0,
                    potAmt: parseFloat(row.potAmt) || 0,
                    indM3:  parseFloat(row.indM3)  || 0,
                    indAmt: parseFloat(row.indAmt) || 0,
                }));
                fuelData = rawFuel.map(row => ({
                    ...row,
                    dieselLit: parseFloat(row.dieselLit) || 0,
                    gasLit:    parseFloat(row.gasLit)    || 0,
                    ghg:       parseFloat(row.ghg)       || 0,
                }));
                if (typeof envRenderRegions   === 'function') envRenderRegions();
                if (typeof wasteRenderRegions === 'function') wasteRenderRegions();
                if (typeof waterRenderRegions === 'function') waterRenderRegions();
                if (typeof fuelRenderRegions  === 'function') fuelRenderRegions();
            } else {
            }
        } catch(e) {
        }
    }
    window.loadEnvFromFirebaseDirect = loadEnvFromFirebaseDirect;

    // ─── Save a SINGLE env row to its own Firestore document (atomic, no overwrite) ─
    async function saveEnvRowToFirebase(colName, row) {
        if (!window.firebaseDb || !window.firebase || !row?.id) return;
        // Role guard: only PCO (own region), envi_head (overall, all regions), and admin can write env rows
        const _envEmail = window.firebaseAuth?.currentUser?.email;
        const _envInfo  = (typeof UserAccounts !== 'undefined') ? UserAccounts.getUserInfo(_envEmail) : null;
        if (_envInfo) {
            const _role = _envInfo.role;
            if (!['pco', 'envi_head', 'admin'].includes(_role)) {
                return;
            }
            // PCO can only write rows for their own region
            if (_role === 'pco' && row.region && row.region !== _envInfo.region) {
                return;
            }
            // envi_head (overall Environmental Head) may write env rows for ANY region —
            // rows are atomic per-document, so this never touches another PCO's rows.
        }
        try {
            const ADMIN_UID = 'fUnXsvKnRYMpuySRbeVYJk7TO452';
            const year      = (typeof state !== 'undefined' && state.selectedYear) ? state.selectedYear : new Date().getFullYear();
            const rowId     = String(row.id).replace(/[^a-zA-Z0-9_-]/g, '_');
            const rowRef    = window.firebase.doc(window.firebaseDb, 'users', ADMIN_UID, 'years', String(year), colName, rowId);
            await window.firebase.setDoc(rowRef, { ...row, _savedAt: Date.now() }, { merge: true });
        } catch(e) {
        }
    }
    window.saveEnvRowToFirebase = saveEnvRowToFirebase;

    // ─── Delete a single env row document from Firestore ─────────────────────────
    async function deleteEnvRowFromFirebase(colName, row) {
        if (!window.firebaseDb || !window.firebase || !row?.id) {
            throw new Error('Firebase not initialized or missing row ID');
        }
        // Role guard: same as saveEnvRowToFirebase
        const _delEmail = window.firebaseAuth?.currentUser?.email;
        const _delInfo  = (typeof UserAccounts !== 'undefined') ? UserAccounts.getUserInfo(_delEmail) : null;
        if (_delInfo) {
            const _role = _delInfo.role;
            if (!['pco', 'envi_head', 'admin'].includes(_role)) {
                const msg = `deleteEnvRowFromFirebase: blocked — role "${_role}"`;
                throw new Error(msg);
            }
            if (_role === 'pco' && row.region && row.region !== _delInfo.region) {
                const msg = `deleteEnvRowFromFirebase: blocked — PCO region mismatch`;
                throw new Error(msg);
            }
            // envi_head (overall Environmental Head) may delete env rows for ANY region.
        }
        try {
            const ADMIN_UID = 'fUnXsvKnRYMpuySRbeVYJk7TO452';
            const year      = (typeof state !== 'undefined' && state.selectedYear) ? state.selectedYear : new Date().getFullYear();
            const rowId     = String(row.id).replace(/[^a-zA-Z0-9_-]/g, '_');
            const rowRef    = window.firebase.doc(window.firebaseDb, 'users', ADMIN_UID, 'years', String(year), colName, rowId);
            await window.firebase.deleteDoc(rowRef);
        } catch(e) {
            throw e;
        }
    }
    window.deleteEnvRowFromFirebase = deleteEnvRowFromFirebase;

    // ─── Legacy full-save stub (kept for compatibility, now delegates to per-row saves) ─
    async function saveEnvDataToFirebase() {
        if (!window.firebaseDb || !window.firebase) return;
        try {
            const saves = [
                ...envData.map(r   => saveEnvRowToFirebase('env_monitoring_rows', r)),
                ...wasteData.map(r => saveEnvRowToFirebase('env_waste_rows', r)),
                ...waterData.map(r => saveEnvRowToFirebase('env_water_rows', r)),
                ...fuelData.map(r  => saveEnvRowToFirebase('env_fuel_rows', r))
            ];
            await Promise.all(saves);
        } catch(e) {
        }
    }
    window.saveEnvDataToFirebase = saveEnvDataToFirebase;

    
    window.envSwitchMode = function(mode) {
        envMode = mode;
        const elecSection  = document.getElementById('env-electricity-section');
        const waterSection = document.getElementById('env-water-section');
        const wasteSection = document.getElementById('env-waste-section');
        const applSection  = document.getElementById('env-appliances-section');
        const fuelSection  = document.getElementById('env-fuel-section');
        const btnElec  = document.getElementById('env-toggle-elec');
        const btnWater = document.getElementById('env-toggle-water');
        const btnWaste = document.getElementById('env-toggle-waste');
        const btnAppl  = document.getElementById('env-toggle-appliances');
        const btnFuel  = document.getElementById('env-toggle-fuel');
        const sub      = document.getElementById('env-header-sub');

        // Hide all sections & summaries
        [elecSection, waterSection, wasteSection, applSection, fuelSection].forEach(s => { if(s) s.style.display = 'none'; });
        ['env-summary-electricity','env-summary-water','env-summary-waste','env-summary-appliances','env-summary-fuel'].forEach(id => {
            const el = document.getElementById(id); if (el) el.style.display = 'none';
        });
        [btnElec, btnWater, btnWaste, btnAppl, btnFuel].forEach(b => { if(b) { b.style.background = 'rgba(255,255,255,0.15)'; b.style.color = 'white'; } });

        if (mode === 'electricity') {
            if (elecSection)  elecSection.style.display  = '';
            const es = document.getElementById('env-summary-electricity'); if (es) es.style.display = '';
            if (btnElec)  { btnElec.style.background  = 'white'; btnElec.style.color  = '#1b5e20'; }
            if (sub) sub.textContent = 'Electricity Consumption & GHG Emission Tracker — Per Region';
            envRenderRegions();
        } else if (mode === 'water') {
            if (waterSection) waterSection.style.display = '';
            const ws = document.getElementById('env-summary-water'); if (ws) ws.style.display = '';
            if (btnWater) { btnWater.style.background = 'white'; btnWater.style.color = '#0277bd'; }
            if (sub) sub.textContent = 'Water Consumption Tracker — Domestic, Potable & Industrial Use — Per Region';
            waterRenderRegions();
            waterUpdateSummary();
        } else if (mode === 'waste') {
            if (wasteSection) wasteSection.style.display = '';
            const wss = document.getElementById('env-summary-waste'); if (wss) wss.style.display = '';
            if (btnWaste) { btnWaste.style.background = 'white'; btnWaste.style.color = '#5d4037'; }
            if (sub) sub.textContent = 'Waste Generation & Disposal Tracker — Biodegradable, Recyclable & Hazardous — Per Region';
            wasteRenderRegions();
            wasteUpdateSummary();
        } else if (mode === 'appliances') {
            if (applSection) applSection.style.display = '';
            const as = document.getElementById('env-summary-appliances'); if (as) as.style.display = '';
            if (btnAppl) { btnAppl.style.background = 'white'; btnAppl.style.color = '#1b5e20'; }
            if (sub) sub.textContent = 'Electrical Equipment & Lighting Fixtures Inventory — Per Region';
            appliancesRenderRegions();
            appliancesUpdateSummary();
        } else if (mode === 'fuel') {
            if (fuelSection) fuelSection.style.display = '';
            const fs = document.getElementById('env-summary-fuel'); if (fs) fs.style.display = '';
            if (btnFuel) { btnFuel.style.background = 'white'; btnFuel.style.color = '#1b5e20'; }
            if (sub) sub.textContent = 'Fuel Consumption Tracker — Diesel & Gasoline (Liters) + GHG Emissions — Per Region';
            fuelRenderRegions();
            fuelUpdateSummary();
        }
        if (typeof window.envTabLabels === 'function') window.envTabLabels();
    };
    // Mode tabs: label shows only on the active tab; the others are icon-only with a tooltip (see .env-tab-lbl / .env-tab-on in styles.css)
    window.envTabLabels = function() {
        const ids = { electricity: 'env-toggle-elec', water: 'env-toggle-water', waste: 'env-toggle-waste', appliances: 'env-toggle-appliances', fuel: 'env-toggle-fuel' };
        const cur = (typeof envMode === 'string') ? envMode : 'electricity';
        Object.keys(ids).forEach(function(m) {
            const b = document.getElementById(ids[m]);
            if (!b) return;
            let lbl = b.querySelector('.env-tab-lbl');
            if (!lbl) {
                const tn = Array.from(b.childNodes).find(function(n) { return n.nodeType === 3 && n.textContent.trim(); });
                if (!tn) return;
                lbl = document.createElement('span');
                lbl.className = 'env-tab-lbl';
                lbl.textContent = tn.textContent.trim();
                b.replaceChild(lbl, tn);
            }
            const on = (m === cur);
            b.classList.toggle('env-tab-on', on);
            if (on) { b.removeAttribute('title'); b.removeAttribute('data-tip'); }
            else    { b.setAttribute('title', lbl.textContent); }
        });
    };
    window.envTabLabels();
    document.addEventListener('DOMContentLoaded', function() { window.envTabLabels(); });
    window.envSwitchMode = window.envSwitchMode; // expose

    // ══════════════════════════════════════════════════════════════════════
    // FUEL CONSUMPTION MODULE
    // Fields: month, dieselLit (Liters), gasLit (Liters), ghg (t CO₂e)
    // GHG factors: Diesel = 2.68 kg CO₂/L → 0.00268 t CO₂e/L
    //              Gasoline = 2.31 kg CO₂/L → 0.00231 t CO₂e/L
    // ══════════════════════════════════════════════════════════════════════
    const FUEL_DIESEL_FACTOR  = 0.00268; // t CO₂e per Liter
    const FUEL_GAS_FACTOR     = 0.00231; // t CO₂e per Liter

    function fuelRegionKey(r) { return 'fl_' + r.replace(/[^a-z0-9]/gi,'_'); }

    window.fuelAddRow = function(regionRaw, globalPi, projName) {
        const userEmail = (typeof state !== 'undefined') ? state.currentUser?.email : null;
        if (!UserAccounts.canEdit(userEmail, regionRaw) || !UserAccounts.canEditTab(userEmail, 'env-monitoring')) {
            if (typeof showToast === 'function') showToast('No permission to add entries here.', 'warning');
            return;
        }
        const rk       = fuelRegionKey(regionRaw);
        const suffix   = `${rk}-${globalPi}`;
        const month    = document.getElementById('fl-month-'+suffix)?.value || 'January';
        const dieselLit= parseFloat(document.getElementById('fl-diesel-'+suffix)?.value) || 0;
        const gasLit   = parseFloat(document.getElementById('fl-gas-'+suffix)?.value)    || 0;
        const ghg      = parseFloat(((dieselLit * FUEL_DIESEL_FACTOR) + (gasLit * FUEL_GAS_FACTOR)).toFixed(4));
        const newRow   = { id: Date.now()+Math.random(), region: regionRaw, project: projName||'', month, dieselLit, gasLit, ghg };
        fuelData.push(newRow);
        if (typeof saveEnvRowToFirebase === 'function') saveEnvRowToFirebase('env_fuel_rows', newRow);
        ['fl-diesel-','fl-gas-'].forEach(p => { const el = document.getElementById(p+suffix); if (el) el.value = ''; });
        fuelRenderRegions();
        fuelUpdateSummary();
    };

    window.fuelDeleteRow = async function(id) {
        const row = fuelData.find(r => r.id === id);
        const userEmail = (typeof state !== 'undefined') ? state.currentUser?.email : null;
        if (row && (!UserAccounts.canEdit(userEmail, row.region) || !UserAccounts.canEditTab(userEmail, 'env-monitoring'))) {
            if (typeof showToast === 'function') showToast('No permission to delete here.', 'warning');
            return;
        }
        if (typeof showDeleteDialog === 'function' && !(await showDeleteDialog('Fuel Entry', 'this fuel entry' + (row && row.region ? ' in ' + row.region : '')))) return;
        if (row && typeof deleteEnvRowFromFirebase === 'function') {
            deleteEnvRowFromFirebase('env_fuel_rows', row).then(() => {
                // Only remove from local array AFTER Firebase deletion succeeds
                fuelData = fuelData.filter(r => r.id !== id);
                fuelRenderRegions();
                fuelUpdateSummary();
                if (typeof showToast === 'function') showToast('Fuel entry deleted.', 'success');
            }).catch((err) => {
                if (typeof showToast === 'function') showToast('Failed to delete entry: ' + err.message, 'error');
            });
        } else {
            // Fallback if deleteEnvRowFromFirebase is not available
            fuelData = fuelData.filter(r => r.id !== id);
            fuelRenderRegions();
            fuelUpdateSummary();
        }
    };

    window.fuelToggleRegion = function(regionRaw) {
        fuelCollapsed[regionRaw] = !fuelCollapsed[regionRaw];
        const rk   = fuelRegionKey(regionRaw);
        window._tabRegionSetOpen('fl', rk, !fuelCollapsed[regionRaw]);
    };

    function fuelBuildRows(rows, canEdit) {
        if (!rows.length) {
            return `<tr><td colspan="${canEdit ? 5 : 4}" style="padding:18px;text-align:center;color:var(--text-secondary);font-size:0.72rem;font-style:italic;">
                ${window.icon('fuel', '', `style="opacity:0.2;margin-right:5px;"`)}No entries yet${canEdit ? ' — use the form above' : ''}.
            </td></tr>`;
        }
        const grouped = {};
        ENV_MONTHS.forEach(m => { grouped[m] = []; });
        rows.forEach(r => { if (grouped[r.month]) grouped[r.month].push(r); });
        let html = '';
        ENV_MONTHS.forEach(month => {
            const mRows = grouped[month];
            if (!mRows.length) return;
            mRows.forEach((row, idx) => {
                html += `<tr style="color:#000;font-weight:600;">
                    <td style="padding:6px 10px;border:1px solid #c8e6c9;vertical-align:middle;font-weight:800;color:#0b3d12;">${idx===0?month:''}</td>
                    <td style="padding:6px 10px;border:1px solid #c8e6c9;text-align:right;">${row.dieselLit.toLocaleString(undefined,{maximumFractionDigits:2})}</td>
                    <td style="padding:6px 10px;border:1px solid #c8e6c9;text-align:right;">${row.gasLit.toLocaleString(undefined,{maximumFractionDigits:2})}</td>
                    <td style="padding:6px 10px;border:1px solid #c8e6c9;text-align:right;font-weight:800;color:#0b3d12;">${row.ghg.toFixed(4)}</td>
                    ${canEdit?`<td style="padding:4px 8px;border:1px solid #c8e6c9;text-align:center;">
                        <button onclick="fuelDeleteRow(${row.id})" style="background:none;border:none;cursor:pointer;color:#ef5350;font-size:0.75rem;" title="Delete">${window.icon('trash')}</button>
                    </td>`:''}
                </tr>`;
            });
        });
        return html;
    }

    function fuelRenderRegions() {
        const container = document.getElementById('env-fuel-regions-container');
        if (!container) return;
        const allProjects = (typeof state !== 'undefined' && state.projects) ? state.projects : [];
        const userEmail   = (typeof state !== 'undefined') ? state.currentUser?.email : null;
        const canEditEnv  = UserAccounts.canEditTab(userEmail, 'env-monitoring');

        let html = '';
        ENV_REGIONS.forEach(region => {
            const rk         = fuelRegionKey(region);
            const rc         = REGION_COLORS[region] || { bg:'#1b5e20', light:'#e8f5e9' };
            const projs      = allProjects.filter(p => p.region === region);
            const regionRows = fuelData.filter(r => r.region === region);
            const isOpen     = !fuelCollapsed[region];
            const canEditReg = state.isEditing && canEditEnv && UserAccounts.canEdit(userEmail, region);

            const rDiesel = regionRows.reduce((s,r)=>s+r.dieselLit,0);
            const rGas    = regionRows.reduce((s,r)=>s+r.gasLit,0);
            const rGhg    = regionRows.reduce((s,r)=>s+r.ghg,0);

            const thBase  = `padding:7px 11px;text-align:center;font-weight:800;border:1px solid #c8e6c9;font-size:0.63rem;`;
            const thLight = `background:#b7ddb5;color:#0b3d12;`;
            const thMid   = `background:#9ecf9b;color:#0b3d12;`;

            let projTablesHtml = '';
            if (projs.length === 0) {
                projTablesHtml = `<div style="padding:20px;text-align:center;color:var(--text-secondary);font-size:0.75rem;font-style:italic;">
                    ${window.icon('folder', '', `style="opacity:0.25;font-size:1.5rem;display:block;margin-bottom:6px;"`)}No projects in this region yet.</div>`;
            } else {
                const _flIdx = _tabProjIdx('fuel', region, projs);
                const _flNavProjs = [projs[_flIdx]];

                _flNavProjs.forEach((proj) => {
                    const projRows  = regionRows.filter(r => r.project === proj.name);
                    const pDiesel   = projRows.reduce((s,r)=>s+r.dieselLit,0);
                    const pGas      = projRows.reduce((s,r)=>s+r.gasLit,0);
                    const pGhg      = projRows.reduce((s,r)=>s+r.ghg,0);
                    const globalPi  = projs.indexOf(proj);
                    const suffix    = `${rk}-${globalPi}`;
                    const pn        = proj.name.replace(/'/g,"\'");

                    projTablesHtml += `
                    <div style="${_tabProjCardStyle()}">
                        ${_tabProjHeader({ tabType:'fuel', region, projs, idx:_flIdx, proj, color:'#1b5e20', status:true })}
                        ${canEditReg ? `
                        <div style="padding:10px 14px;background:#f1f8e9;border-bottom:1px solid #c8e6c9;">
                            <div style="display:flex;flex-wrap:wrap;gap:7px;align-items:flex-end;">
                                <div>
                                    <label style="font-size:0.63rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:2px;">Month</label>
                                    <select id="fl-month-${suffix}" style="padding:5px 7px;border-radius:5px;border:1px solid var(--border-color);background:var(--input-bg);color:var(--text-primary);font-size:0.7rem;min-width:110px;">
                                        ${ENV_MONTHS.map(m=>`<option value="${m}">${m}</option>`).join('')}
                                    </select>
                                </div>
                                <div style="min-width:90px;">
                                    <label style="font-size:0.63rem;font-weight:600;color:#1b5e20;display:block;margin-bottom:2px;">Diesel (Liters)</label>
                                    <input type="number" id="fl-diesel-${suffix}" placeholder="0" min="0" step="0.01" style="width:100%;box-sizing:border-box;padding:5px 7px;border-radius:5px;border:1px solid var(--border-color);background:var(--input-bg);color:var(--text-primary);font-size:0.7rem;">
                                </div>
                                <div style="min-width:90px;">
                                    <label style="font-size:0.63rem;font-weight:600;color:#1b5e20;display:block;margin-bottom:2px;">Gasoline (Liters)</label>
                                    <input type="number" id="fl-gas-${suffix}" placeholder="0" min="0" step="0.01" style="width:100%;box-sizing:border-box;padding:5px 7px;border-radius:5px;border:1px solid var(--border-color);background:var(--input-bg);color:var(--text-primary);font-size:0.7rem;">
                                </div>
                                <div style="padding:5px 10px;background:#e8f5e9;border-radius:5px;border:1px solid #c8e6c9;font-size:0.65rem;color:#1b5e20;font-weight:600;align-self:flex-end;min-height:29px;display:flex;align-items:center;">
                                    ${window.icon('calc', '', `style="margin-right:4px;"`)}GHG auto-calculated
                                </div>
                                <button onclick="fuelAddRow('${region}',${globalPi},'${pn}')" style="padding:5px 12px;background:linear-gradient(135deg,#1b5e20,#2e7d32);color:white;border:none;border-radius:5px;font-size:0.7rem;font-weight:700;cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:4px;align-self:flex-end;">
                                    ${window.icon('plus')} Add
                                </button>
                            </div>
                            <div style="margin-top:5px;font-size:0.61rem;color:#4a7c59;font-style:italic;">
                                GHG factors: Diesel = 2.68 kg CO₂/L &nbsp;|&nbsp; Gasoline = 2.31 kg CO₂/L
                            </div>
                        </div>` : ''}
                        <div style="overflow-x:auto;">
                            <table style="width:100%;border-collapse:collapse;font-size:0.7rem;">
                                <thead>
                                    <tr>
                                        <th style="${thBase}${thLight}">Month</th>
                                        <th style="${thBase}${thMid}">Total Fuel Consumption<br><span style="color:#0b3d12;font-weight:800;">Diesel</span>, Liters</th>
                                        <th style="${thBase}${thMid}">Total Fuel Consumption<br><span style="color:#0b3d12;font-weight:800;">Gasoline</span>, Liters</th>
                                        <th style="${thBase}${thLight}">Total GHG Emissions<br>(t CO₂e)</th>
                                        ${canEditReg?`<th style="${thBase}${thLight}"></th>`:''}
                                    </tr>
                                </thead>
                                <tbody>
                                    ${fuelBuildRows(projRows, canEditReg)}
                                </tbody>
                                ${projRows.length > 0 ? `
                                <tfoot>
                                    <tr style="background:#e8f5e9;">
                                        <td style="padding:7px 11px;font-weight:800;color:#0b3d12;border:1px solid #c8e6c9;font-size:0.67rem;">
                                            ${window.icon('calc', '', `style="font-size:0.6rem;"`)} TOTAL — ${proj.name}
                                        </td>
                                        <td style="padding:7px 11px;text-align:right;font-weight:800;color:#0b3d12;border:1px solid #c8e6c9;">${pDiesel.toLocaleString(undefined,{maximumFractionDigits:2})}</td>
                                        <td style="padding:7px 11px;text-align:right;font-weight:800;color:#0b3d12;border:1px solid #c8e6c9;">${pGas.toLocaleString(undefined,{maximumFractionDigits:2})}</td>
                                        <td style="padding:7px 11px;text-align:right;font-weight:800;color:#0b3d12;border:1px solid #c8e6c9;">${pGhg.toFixed(4)}</td>
                                        ${canEditReg?`<td style="border:1px solid #c8e6c9;"></td>`:''}
                                    </tr>
                                </tfoot>` : ''}
                            </table>
                        </div>
                    </div>`;
                });

            }

            html += _tabRegionBanner({ key:'fl', toggle:'fuelToggleRegion', region, rk, rc, icon:'fuel', projCount:projs.length, open:isOpen, editable:canEditReg, viewOnly:(!canEditReg && state.isEditing),
                chips:[ rDiesel>0 && { text:`${rDiesel.toLocaleString()} L D`, kind:'a' }, rGas>0 && { text:`${rGas.toLocaleString()} L G`, kind:'b' }, rGhg>0 && { text:`${rGhg.toFixed(4)} t CO\u2082e`, kind:'b' } ],
                body: projTablesHtml });
        });

        container.innerHTML = html;
    }
    window.fuelRenderRegions = fuelRenderRegions;

    function fuelUpdateSummary() {
        const container = document.getElementById('env-summary-fuel');
        if (!container) return;
        const allProjects = (typeof state !== 'undefined' && state.projects) ? state.projects : [];
        const fmt = (v) => v > 0 ? v.toLocaleString(undefined,{maximumFractionDigits:2}) : '—';

        // Per-region aggregation
        const regionRows = [];
        ENV_REGIONS.forEach(function(region) {
            const rows     = fuelData.filter(r => r.region === region);
            const projs    = allProjects.filter(p => p.region === region).length;
            const diesel   = rows.reduce((s,r)=>s+r.dieselLit, 0);
            const gas      = rows.reduce((s,r)=>s+r.gasLit,    0);
            const ghg      = rows.reduce((s,r)=>s+r.ghg,       0);
            const rc       = REGION_COLORS[region] || { bg:'#1b5e20' };
            regionRows.push({ region, projs, diesel, gas, ghg, color: rc.bg });
        });

        const grandDiesel = regionRows.reduce((s,r)=>s+r.diesel, 0);
        const grandGas    = regionRows.reduce((s,r)=>s+r.gas,    0);
        const grandGhg    = regionRows.reduce((s,r)=>s+r.ghg,    0);
        const hasAnyData  = grandDiesel > 0 || grandGas > 0;

        container.innerHTML = window.envSummaryTable({
            title: 'OVERALL SUMMARY \u2014 FUEL CONSUMPTION',
            groups: [ { label: `${window.icon("fuel")} FUEL CONSUMPTION (Liters)`, span: 3 }, { label: 'GHG Emissions' } ],
            cols: [ { label: 'Diesel' }, { label: 'Gasoline' }, { label: 'Combined' }, { label: 't CO\u2082e', fixed: 4, tip: function(vals, v) {
                const d = vals[0] || 0, g = vals[1] || 0;
                const fn = n => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
                const calc = (d * FUEL_DIESEL_FACTOR + g * FUEL_GAS_FACTOR).toFixed(4);
                const L = [
                    'GHG (t CO\u2082e) · Fuel',
                    'Diesel L × ' + FUEL_DIESEL_FACTOR + ' + Gasoline L × ' + FUEL_GAS_FACTOR,
                    fn(d) + ' × ' + FUEL_DIESEL_FACTOR + ' + ' + fn(g) + ' × ' + FUEL_GAS_FACTOR,
                    '= ' + calc
                ];
                if (calc !== v.toFixed(4)) L.push('Sum of monthly values (each rounded to 4 decimals) = ' + v.toFixed(4));
                return L;
            } } ],
            rows: regionRows.map(r => ({ region: r.region, projs: r.projs, values: [r.diesel, r.gas, r.diesel + r.gas, r.ghg] })),
            totals: [grandDiesel, grandGas, grandDiesel + grandGas, grandGhg],
            hasData: hasAnyData, icon: 'fuel', sub: 'Consolidated data from all projects across all regions \u00b7 Data to be collected from Warehouse Department.', note: 'Log <strong>Fuel Consumption</strong> per region \u2014 Diesel (Liters) and Gasoline (Liters) per project per month. Auto-calculates <strong>Total GHG Emissions</strong> (t CO\u2082e). <span style="font-size:0.68rem;color:#2e7d32;font-style:italic;">Data to be collected from Warehouse Department.</span>', emptyText: 'No fuel data entered yet.'
        });
    }
    window.fuelUpdateSummary = fuelUpdateSummary;

    // ══ end FUEL MODULE ═══════════════════════════════════════════════════
    let appliancesData = {};
    let appliancesCollapsed = _initCollapsed();
    let appliancesNavIdx = {};   // tracks current project index per region

    window.appliancesNavProject = function(region, delta) {
        const allProjects = (typeof state !== 'undefined' && state.projects) ? state.projects : [];
        const projs = allProjects.filter(p => p.region === region);
        if (!projs.length) return;
        const cur = appliancesNavIdx[region] || 0;
        appliancesNavIdx[region] = Math.max(0, Math.min(projs.length - 1, cur + delta));
        appliancesRenderRegions();
        appliancesUpdateSummary();
    };

    const APPL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

    const APPL_FIELDS = [
        { id:'refrigerator',   label:'Refrigerator',              section:'A', color:'#1b5e20' },
        { id:'freezer',        label:'Freezer',                   section:'A', color:'#1b5e20' },
        { id:'tv',             label:'TV',                        section:'A', color:'#1b5e20' },
        { id:'kettle',         label:'Electric Kettle',           section:'A', color:'#1b5e20' },
        { id:'iron',           label:'Electric Iron',             section:'A', color:'#1b5e20' },
        { id:'microwave',      label:'Microwave Oven',            section:'A', color:'#1b5e20' },
        { id:'stove',          label:'Cooking Stove',             section:'A', color:'#1b5e20' },
        { id:'fan',            label:'Electric Fan',              section:'A', color:'#1b5e20' },
        { id:'polisher',       label:'Floor Polisher',            section:'A', color:'#1b5e20' },
        { id:'dispenser',      label:'Water Dispenser',           section:'A', color:'#1b5e20' },
        { id:'washer',         label:'Washing Machine',           section:'A', color:'#1b5e20' },
        { id:'coffee',         label:'Coffee Maker',              section:'A', color:'#1b5e20' },
        { id:'ac_window_qty',  label:'AC Window – Qty',           section:'A1', color:'#2e7d32' },
        { id:'ac_window_w',    label:'AC Window – W',             section:'A1', color:'#2e7d32' },
        { id:'ac_ceil_qty',    label:'AC Ceiling – Qty',          section:'A1', color:'#2e7d32' },
        { id:'ac_ceil_w',      label:'AC Ceiling – W',            section:'A1', color:'#2e7d32' },
        { id:'ac_cass_qty',    label:'AC Cassette – Qty',         section:'A1', color:'#2e7d32' },
        { id:'ac_cass_w',      label:'AC Cassette – W',           section:'A1', color:'#2e7d32' },
        { id:'ac_wall_qty',    label:'AC Wall – Qty',             section:'A1', color:'#2e7d32' },
        { id:'ac_wall_w',      label:'AC Wall – W',               section:'A1', color:'#2e7d32' },
        { id:'computer',       label:'Computer/Laptop',           section:'B', color:'#388e3c' },
        { id:'datacenter',     label:'Data Center',               section:'B', color:'#388e3c' },
        { id:'ups',            label:'UPS',                       section:'B', color:'#388e3c' },
        { id:'tablet',         label:'Tablet/Phone',              section:'B', color:'#388e3c' },
        { id:'telephone',      label:'Telephone Lines',           section:'B', color:'#388e3c' },
        { id:'video',          label:'Video/Telecon Equip',       section:'B', color:'#388e3c' },
        { id:'cctv',           label:'CCTV',                      section:'B', color:'#388e3c' },
        { id:'projector',      label:'Projector',                 section:'B', color:'#388e3c' },
        { id:'printer',        label:'Printer/Copier',            section:'B', color:'#388e3c' },
        { id:'biometrics',     label:'Biometrics',                section:'B', color:'#388e3c' },
        { id:'wifi',           label:'WiFi Router/Ext.',          section:'B', color:'#388e3c' },
        { id:'elevator',       label:'Elevator/Escalator',        section:'B', color:'#388e3c' },
        { id:'led_lt10',       label:'LED <10W',                  section:'C', color:'#43a047' },
        { id:'led_ge10',       label:'LED ≥10W',                  section:'C', color:'#43a047' },
        { id:'lfl_lt20',       label:'Linear FL <20W',            section:'C', color:'#43a047' },
        { id:'lfl_20_50',      label:'Linear FL 20-50W',          section:'C', color:'#43a047' },
        { id:'lfl_gt50',       label:'Linear FL >50W',            section:'C', color:'#43a047' },
        { id:'inc_lt20',       label:'Incandescent <20W',         section:'C', color:'#43a047' },
        { id:'inc_20_50',      label:'Incandescent 20-50W',       section:'C', color:'#43a047' },
        { id:'inc_gt50',       label:'Incandescent >50W',         section:'C', color:'#43a047' },
        { id:'cfl_lt22',       label:'Circular FL <22W',          section:'C', color:'#43a047' },
        { id:'cfl_22_32',      label:'Circular FL 22-32W',        section:'C', color:'#43a047' },
        { id:'cfl_gt32',       label:'Circular FL >32W',          section:'C', color:'#43a047' },
        { id:'cfl2_lt20',      label:'CFL <20W',                  section:'C', color:'#43a047' },
        { id:'cfl2_20_50',     label:'CFL 20-50W',                section:'C', color:'#43a047' },
        { id:'cfl2_gt50',      label:'CFL >50W',                  section:'C', color:'#43a047' },
        { id:'solar_5',        label:'Solar 5.5W',                section:'C', color:'#43a047' },
        { id:'solar_100',      label:'Solar 100W',                section:'C', color:'#43a047' },
        { id:'solar_150',      label:'Solar 150W',                section:'C', color:'#43a047' },
        { id:'solar_200',      label:'Solar 200W',                section:'C', color:'#43a047' },
        { id:'solar_300',      label:'Solar 300W',                section:'C', color:'#43a047' },
        { id:'solar_500',      label:'Solar 500W',                section:'C', color:'#43a047' },
    ];

    // AC rows: row 1 uses the original fields (ac_ceil_qty ...). Rows 2..AC_MAX_ROWS use <field>_<row> (ac_ceil_qty_2 ...),
    // so one project can record AC units of the same type with different watts.
    // They are plain fields like the others, so totals, saving and loading work without extra code.
    const AC_MAX_ROWS = 5;
    const AC_BASE_FIELDS = ['ac_window_qty','ac_window_w','ac_ceil_qty','ac_ceil_w','ac_cass_qty','ac_cass_w','ac_wall_qty','ac_wall_w'];
    AC_BASE_FIELDS.forEach(function(id) {
        const base = APPL_FIELDS.find(f => f.id === id);
        for (let r = 2; r <= AC_MAX_ROWS; r++) APPL_FIELDS.push({ id: id + '_' + r, label: base.label, section: 'A1', color: base.color });
    });
    const acFieldId = (id, r) => r > 1 ? id + '_' + r : id;
    // Watts are not units: they are never added to the unit counts (Air Conditioning, Total Units, region chips)
    const applIsWatts = id => /^ac_(window|ceil|cass|wall)_w(_\d+)?$/.test(id);
    let applAcRows = {};   // key -> number of AC rows shown while editing (min 1)
    function acRowHasData(key, r) {
        const d = appliancesData[key] || {};
        return AC_BASE_FIELDS.some(id => (parseFloat(d[acFieldId(id, r)]) || 0) > 0);
    }
    function acRowsNeeded(key) {
        let n = 1;
        for (let r = 2; r <= AC_MAX_ROWS; r++) { if (acRowHasData(key, r)) n = r; }
        return n;
    }

    const APPL_SECTION_META = {
        'A':  { label:'A — Electrical Equipment (Qty in Units)', icon:'bolt',      bg:'#9ecf9b' },
        'A1': { label:'A1 — Aircon Units (Qty + Watts)',         icon:'snowflake',  bg:'#9ecf9b' },
        'B':  { label:'B — Other Electrical Equipment (Units)',  icon:'desktop',    bg:'#9ecf9b' },
        'C':  { label:'C — Lighting Fixtures (No. of Pieces)',   icon:'idea',  bg:'#9ecf9b' },
    };

    // Total units entered for one region (same key matching as appliancesUpdateSummary)
    function applRegionUnits(region) {
        const target = region.replace(/[^a-z0-9]/gi,'_').replace(/_+/g,' ').trim().toUpperCase();
        let total = 0;
        Object.entries(appliancesData).forEach(function([key, entry]) {
            const keyRegion = (key.split(':')[0] || '').replace(/_+/g,' ').trim().toUpperCase();
            if (keyRegion !== target) return;
            Object.keys(entry).forEach(function(id) { if (!applIsWatts(id)) total += parseFloat(entry[id]) || 0; });
        });
        return total;
    }

    function appliancesKey(region, projName, month, building) {
        const m = month || 'January';
        const b = (building || 'Main Building').trim() || 'Main Building';
        return (region + ':' + projName + ':' + m + ':' + b).replace(/[^a-z0-9:]/gi,'_');
    }

    function appliancesDocId(region, projName, month, building) {
        return appliancesKey(region, projName, month, building).replace(/:/g,'__');
    }

    function appliancesToggleRegion(regionRaw) {
        appliancesCollapsed[regionRaw] = !appliancesCollapsed[regionRaw];
        const rk   = regionRaw.replace(/[^a-z0-9]/gi,'_');
        window._tabRegionSetOpen('appl', rk, !appliancesCollapsed[regionRaw]);
    }
    window.appliancesToggleRegion = appliancesToggleRegion;

    function applSectionRows(section, key, canEdit) {
        const fields = APPL_FIELDS.filter(f => f.section === section);
        const data   = appliancesData[key] || {};
        const meta   = APPL_SECTION_META[section];
        const isAC   = section === 'A1';

        let fieldsHtml = '';
        if (isAC) {
            const pairs = [
                ['ac_window_qty','ac_window_w','Window Type'],
                ['ac_ceil_qty','ac_ceil_w','Ceiling Suspended'],
                ['ac_cass_qty','ac_cass_w','Cassette Type'],
                ['ac_wall_qty','ac_wall_w','Wall Mounted'],
            ];
            let hdr    = pairs.map(p=>`<th colspan="2" style="background:#b7ddb5;color:#0b3d12;padding:5px 8px;text-align:center;border:1px solid #c8e6c9;font-size:0.63rem;font-weight:800;">${p[2]}</th>`).join('');
            let subhdr = pairs.map(()=>`<th style="background:#c5e8c3;color:#0b3d12;padding:4px 8px;text-align:center;border:1px solid #c8e6c9;font-size:0.62rem;font-weight:800;white-space:nowrap;">Qty</th><th style="background:#c5e8c3;color:#0b3d12;padding:4px 8px;text-align:center;border:1px solid #c8e6c9;font-size:0.62rem;font-weight:800;white-space:nowrap;">Watts</th>`).join('');
            const acCells = function(r) { return pairs.map(function(p0) { const p = [acFieldId(p0[0], r), acFieldId(p0[1], r), p0[2]]; return `
                <td style="padding:5px 7px;text-align:center;border:1px solid #c8e6c9;color:#000;font-weight:600;">${canEdit
                    ? `<input type="number" min="0" data-appl-key="${key}" data-appl-field="${p[0]}" onchange="appliancesSetField('${key}','${p[0]}',this.value)" value="${data[p[0]]||''}" placeholder="0" style="width:50px;padding:3px 4px;border:1px solid #a5d6a7;border-radius:4px;text-align:center;font-size:0.7rem;background:var(--input-bg);color:var(--text-primary);">`
                    : (data[p[0]] || '—')}</td>
                <td style="padding:5px 7px;text-align:center;border:1px solid #c8e6c9;color:#000;font-weight:600;">${canEdit
                    ? `<input type="number" min="0" data-appl-key="${key}" data-appl-field="${p[1]}" onchange="appliancesSetField('${key}','${p[1]}',this.value)" value="${data[p[1]]||''}" placeholder="W" style="width:55px;padding:3px 4px;border:1px solid #a5d6a7;border-radius:4px;text-align:center;font-size:0.7rem;background:var(--input-bg);color:var(--text-primary);">`
                    : (data[p[1]] || '—')}</td>`; }).join(''); };
            const acRows = canEdit ? Math.max(applAcRows[key] || 1, acRowsNeeded(key)) : acRowsNeeded(key);
            let acBody = '';
            for (let r = 1; r <= acRows; r++) acBody += '<tr>' + acCells(r) + '</tr>';
            const acBtn = 'padding:3px 10px;border:1px solid #a5d6a7;border-radius:5px;background:var(--input-bg);color:var(--text-primary);font-size:0.68rem;font-weight:700;cursor:pointer;';
            const acBtns = canEdit
                ? `<div style="padding:6px 8px;display:flex;gap:8px;">`
                    + (acRows < AC_MAX_ROWS ? `<button type="button" style="${acBtn}" onclick="appliancesAcRows('${key}',1)">+ Add row</button>` : '')
                    + (acRows > 1 ? `<button type="button" style="${acBtn}" onclick="appliancesAcRows('${key}',-1)">Remove last row</button>` : '')
                    + `</div>`
                : '';
            fieldsHtml = `<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:0.7rem;min-width:600px;">
                <thead><tr>${hdr}</tr><tr>${subhdr}</tr></thead>
                <tbody>${acBody}</tbody>
            </table></div>${acBtns}`;
        } else {
            let ths = fields.map(f=>`<th style="background:#c5e8c3;color:#0b3d12;padding:5px 8px;text-align:center;border:1px solid #c8e6c9;font-size:0.62rem;font-weight:800;white-space:nowrap;">${f.label}</th>`).join('');
            let tds = fields.map(f=>`<td style="padding:5px 7px;text-align:center;border:1px solid #c8e6c9;color:#000;font-weight:600;">${canEdit
                ? `<input type="number" min="0" data-appl-key="${key}" data-appl-field="${f.id}" onchange="appliancesSetField('${key}','${f.id}',this.value)" value="${data[f.id]||''}" placeholder="0" style="width:48px;padding:3px 4px;border:1px solid #a5d6a7;border-radius:4px;text-align:center;font-size:0.7rem;background:var(--input-bg);color:var(--text-primary);">`
                : (data[f.id] || '—')}</td>`).join('');
            fieldsHtml = `<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:0.7rem;">
                <thead><tr>${ths}</tr></thead>
                <tbody><tr>${tds}</tr></tbody>
            </table></div>`;
        }

        return `
        <div ${isAC ? `id="appl-sec-A1-${key}" data-can-edit="${canEdit ? 1 : 0}"` : ''} style="border-top:2px solid ${meta.bg}33;">
            <div style="background:${meta.bg};color:#0b3d12;padding:6px 12px;font-size:0.68rem;font-weight:800;letter-spacing:0.3px;display:flex;align-items:center;gap:6px;">
                ${window.icon(meta.icon, '', 'style="opacity:0.8;font-size:0.7rem;"')}${meta.label}
            </div>
            ${fieldsHtml}
        </div>`;
    }

    window.appliancesSetField = function(key, fieldId, val) {
        if (!appliancesData[key]) appliancesData[key] = {};
        appliancesData[key][fieldId] = parseFloat(val) || 0;
    };

    // Redraw only the AC block of one month/building (after Add row / Remove last row, or when saved rows are loaded)
    function applAcRefresh(key) {
        const el = document.getElementById('appl-sec-A1-' + key);
        if (!el) return;
        const tmp = document.createElement('div');
        tmp.innerHTML = applSectionRows('A1', key, el.getAttribute('data-can-edit') === '1');
        if (tmp.firstElementChild) el.replaceWith(tmp.firstElementChild);
    }

    window.appliancesAcRows = function(key, delta) {
        const cur  = Math.max(applAcRows[key] || 1, acRowsNeeded(key));
        const next = Math.max(1, Math.min(AC_MAX_ROWS, cur + delta));
        if (next === cur) return;
        if (delta < 0 && acRowHasData(key, cur)) {
            if (typeof showToast === 'function') showToast('Clear the numbers in the last row first.', 'warning', 3000);
            return;
        }
        applAcRows[key] = next;
        applAcRefresh(key);
    };

    function appliancesRenderRegions() {
        const container = document.getElementById('env-appliances-regions-container');
        if (!container) return;

        const allProjects = (typeof state !== 'undefined' && state.projects) ? state.projects : [];
        const userEmail   = (typeof state !== 'undefined') ? state.currentUser?.email : null;
        const canEditEnv  = UserAccounts.canEditTab(userEmail, 'env-monitoring');

        const AC = window.REGION_COLORS; // single source of truth

        let html = '';
        ENV_REGIONS.forEach(region => {
            const rk        = region.replace(/[^a-z0-9]/gi,'_');
            const rc        = AC[region] || { bg:'#1b5e20', light:'#e8f5e9' };
            const projs     = allProjects.filter(p => p.region === region);
            const isOpen    = !appliancesCollapsed[region];
            const canEditRg = state.isEditing && canEditEnv && UserAccounts.canEdit(userEmail, region);

            let projHtml = '';
            if (projs.length === 0) {
                projHtml = `<div style="padding:20px;text-align:center;color:var(--text-secondary);font-size:0.75rem;font-style:italic;">
                    ${window.icon('folder', '', `style="opacity:0.25;font-size:1.5rem;display:block;margin-bottom:6px;"`)}No projects in this region yet.</div>`;
            } else {
                const navIdx = Math.max(0, Math.min(projs.length - 1, appliancesNavIdx[region] || 0));
                appliancesNavIdx[region] = navIdx;
                const proj = projs[navIdx];
                const pi   = navIdx;

                {
                    const pn  = proj.name.replace(/'/g,"\\'");
                    const reg = region.replace(/'/g,"\\'");
                    const monthInputId    = 'appl-month-'    + rk + '-' + pi;
                    const buildingInputId = 'appl-building-' + rk + '-' + pi;
                    const existingEntries = Object.keys(appliancesData).filter(k => k.startsWith(
                        (region + ':' + proj.name).replace(/[^a-z0-9:]/gi,'_')
                    ));
                    const hasSomeData = existingEntries.some(k => Object.values(appliancesData[k]).some(v => v > 0));
                    const previewKey = appliancesKey(region, proj.name, 'January', 'Main Building');

                    projHtml += `
                    <div style="${_tabProjCardStyle()}">
                        
                        ${_tabProjHeader({ tabType:'appliances', region, projs, idx:navIdx, proj, color:rc.bg })}
                        
                        <div style="padding:8px 14px;background:var(--input-bg);border-bottom:1px solid var(--border-color);display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
                            <div style="display:flex;align-items:center;gap:6px;">
                                ${window.icon('calendar', '', `style="color:${rc.bg};font-size:0.75rem;"`)}
                                <label style="font-size:0.7rem;font-weight:700;color:var(--text-secondary);">MONTH:</label>
                                <select id="${monthInputId}"
                                    style="padding:4px 8px;border:1px solid var(--border-color);border-radius:5px;font-size:0.72rem;background:var(--input-bg);color:var(--text-primary);cursor:pointer;"
                                    onchange="appliancesRefreshSections('${pn}','${reg}','${monthInputId}','${buildingInputId}',${pi},'${rk}')">
                                    ${APPL_MONTHS.map(m => `<option value="${m}">${m}</option>`).join('')}
                                </select>
                            </div>
                            <div style="display:flex;align-items:center;gap:6px;">
                                ${window.icon('building', '', `style="color:${rc.bg};font-size:0.75rem;"`)}
                                <label style="font-size:0.7rem;font-weight:700;color:var(--text-secondary);">BUILDING / LOCATION:</label>
                                <input type="text" id="${buildingInputId}" value="Main Building"
                                    placeholder="e.g. Main Building, Annex, Site Office..."
                                    style="padding:4px 10px;border:1px solid var(--border-color);border-radius:5px;font-size:0.72rem;background:var(--input-bg);color:var(--text-primary);min-width:180px;"
                                    oninput="appliancesRefreshSections('${pn}','${reg}','${monthInputId}','${buildingInputId}',${pi},'${rk}')">
                            </div>

                        </div>
                        
                        <div id="appl-sections-${rk}-${pi}">
                            ${applSectionRows('A',  previewKey, canEditRg)}
                            ${applSectionRows('A1', previewKey, canEditRg)}
                            ${applSectionRows('B',  previewKey, canEditRg)}
                            ${applSectionRows('C',  previewKey, canEditRg)}
                        </div>
                    </div>`;
                }
            }

            const rUnits = applRegionUnits(region);
            html += _tabRegionBanner({ key:'appl', toggle:'appliancesToggleRegion', region, rk, rc, icon:'plug', projCount:projs.length, open:isOpen,
                chips:[ rUnits>0 && { text:`${rUnits.toLocaleString()} units`, kind:'a' } ],
                body: projHtml });
        });

        container.innerHTML = html;
        appliancesLoadAll(allProjects);
    }

    window.appliancesRefreshSections = function(projName, region, monthInputId, buildingInputId, pi, rk) {
        const month    = document.getElementById(monthInputId)?.value    || 'January';
        const building = document.getElementById(buildingInputId)?.value || 'Main Building';
        const key      = appliancesKey(region, projName, month, building);
        const userEmail = state?.currentUser?.email;
        const canEditRg = state.isEditing && UserAccounts.canEditTab(userEmail,'env-monitoring') && UserAccounts.canEdit(userEmail, region);
        const container = document.getElementById('appl-sections-' + rk + '-' + pi);
        if (!container) return;
        container.innerHTML =
            applSectionRows('A',  key, canEditRg) +
            applSectionRows('A1', key, canEditRg) +
            applSectionRows('B',  key, canEditRg) +
            applSectionRows('C',  key, canEditRg);
    };

    // Save ALL currently loaded appliances data — called by global saveData()
    window.appliancesSaveAll = function() {
        const db2 = window.firebaseDb;
        if (!db2 || !window.firebaseAuth?.currentUser) return;
        const ADMIN_UID = 'fUnXsvKnRYMpuySRbeVYJk7TO452';
        Object.entries(appliancesData).forEach(([key, data]) => {
            if (!data || Object.keys(data).length === 0) return;
            // key format: region:project:month:building (normalized)
            const parts = key.split(':');
            if (parts.length < 4) return;
            const [regionRaw, projName, month, building] = parts;
            const docId  = appliancesDocId(regionRaw, projName, month, building);
            const docRef = window.firebase.doc(db2, 'users', ADMIN_UID, 'appliancesData', docId);
            window.firebase.setDoc(docRef, {
                key, region: regionRaw, project: projName,
                month: month || 'January',
                building: building || 'Main Building',
                data: data,
                updatedAt: new Date().toISOString()
            }, { merge: true }).catch(e => console.warn('appliancesSaveAll error:', e.message));
        });
    };

    function appliancesLoadAll(allProjects) {
        const db2 = window.firebaseDb;
        if (!db2 || !window.firebaseAuth?.currentUser) return;
        const ADMIN_UID = 'fUnXsvKnRYMpuySRbeVYJk7TO452';

        allProjects.forEach(proj => {
            APPL_MONTHS.forEach(month => {
                const key    = appliancesKey(proj.region, proj.name, month, 'Main Building');
                const docId  = appliancesDocId(proj.region, proj.name, month, 'Main Building');
                const docRef = window.firebase.doc(db2, 'users', ADMIN_UID, 'appliancesData', docId);
                window.firebase.getDoc(docRef).then(snap => {
                    if (!snap.exists()) return;
                    const saved = snap.data().data || {};
                    appliancesData[key] = saved;
                    const _acNeed = acRowsNeeded(key);
                    if (_acNeed > (applAcRows[key] || 1)) { applAcRows[key] = _acNeed; applAcRefresh(key); }
                    Object.entries(saved).forEach(([fieldId, val]) => {
                        const input = document.querySelector(`input[data-appl-key="${key}"][data-appl-field="${fieldId}"]`);
                        if (input) input.value = val || '';
                    });
                }).catch(() => {});
            });
        });
    }

    
    function calc(kwh) {
        const ghg   = kwh * GHG_FACTOR;
        return { ghg };
    }
    function regionKey(r) { return r.replace(/[^a-z0-9]/gi,'_'); }

    
    window.envCalc = function(regionRaw, pi) {
        const rk     = regionKey(regionRaw);
        const suffix = pi !== undefined ? `${rk}-${pi}` : rk;
        const kwh    = parseFloat(document.getElementById('env-kwh-'+suffix)?.value) || 0;
        const { ghg } = calc(kwh);
        const gEl = document.getElementById('env-ghg-'+suffix);
        if (gEl) gEl.value = ghg.toFixed(4);
    };

    
    window.envAddRow = function(regionRaw, pi, projName) {
        const userEmail = (typeof state !== 'undefined') ? state.currentUser?.email : null;
        if (!UserAccounts.canEdit(userEmail, regionRaw) || !UserAccounts.canEditTab(userEmail, 'env-monitoring')) {
            if (typeof showToast === 'function') showToast('You do not have permission to add entries here.', 'warning');
            return;
        }
        const rk     = regionKey(regionRaw);
        const suffix = pi !== undefined ? `${rk}-${pi}` : rk;
        const month  = document.getElementById('env-month-'+suffix)?.value || 'January';
        const loc    = (document.getElementById('env-loc-'+suffix)?.value || '').trim() || '—';
        const kwh    = parseFloat(document.getElementById('env-kwh-'+suffix)?.value) || 0;
        const amount = parseFloat(document.getElementById('env-amt-'+suffix)?.value) || 0;
        const { ghg } = calc(kwh);

        envData.push({ id: Date.now() + Math.random(), region: regionRaw, project: projName || '', month, location: loc, kwh, amount, ghg });

        const _newRow = envData[envData.length - 1];
        if (window.ESHDataSync) {
            window.ESHDataSync.saveEnvRow('env_monitoring', _newRow);
        }
        // ─── Persist single row to Firestore sub-collection (atomic, no overwrite) ──
        if (typeof saveEnvRowToFirebase === 'function') saveEnvRowToFirebase('env_monitoring_rows', _newRow);

        ['env-loc-','env-kwh-','env-amt-','env-ghg-'].forEach(p => {
            const el = document.getElementById(p+suffix);
            if (el) el.value = '';
        });

        envRender();
    };

    
    window.envDeleteRow = async function(id) {
        const row = envData.find(r => r.id === id);
        const userEmail = (typeof state !== 'undefined') ? state.currentUser?.email : null;
        if (row && (!UserAccounts.canEdit(userEmail, row.region) || !UserAccounts.canEditTab(userEmail, 'env-monitoring'))) {
            if (typeof showToast === 'function') showToast('You do not have permission to delete entries in this region.', 'warning');
            return;
        }
        if (typeof showDeleteDialog === 'function' && !(await showDeleteDialog('Environmental Entry', 'this environmental entry' + (row && row.region ? ' in ' + row.region : '')))) return;
        if (row && window.ESHDataSync) {
            window.ESHDataSync.deleteEnvRow('env_monitoring', row);
        }
        // ─── Delete individual doc from Firestore sub-collection ─────────────────
        if (row && typeof deleteEnvRowFromFirebase === 'function') deleteEnvRowFromFirebase('env_monitoring_rows', row);
        envData = envData.filter(r => r.id !== id);
        envRender();
        if (typeof showToast === 'function') showToast('Environmental entry deleted.', 'success');
    };

    
    
    window.envToggleRegion = function(regionRaw) {
        envCollapsed[regionRaw] = !envCollapsed[regionRaw];
        const rk = regionKey(regionRaw);
        window._tabRegionSetOpen('env', rk, !envCollapsed[regionRaw]);
    };

    
    window.envRender = function() {
        envRenderRegions();       // electricity summary updated inside
        envUpdateBadges();
        // Re-render active sub-section so Add buttons appear after Edit mode toggle
        if (envMode === 'water'      && typeof waterRenderRegions      === 'function') { waterRenderRegions(); waterUpdateSummary(); }
        if (envMode === 'waste'      && typeof wasteRenderRegions      === 'function') { wasteRenderRegions(); wasteUpdateSummary(); }
        if (envMode === 'appliances' && typeof appliancesRenderRegions === 'function') { appliancesRenderRegions(); appliancesUpdateSummary(); }
        if (envMode === 'fuel'       && typeof fuelRenderRegions       === 'function') { fuelRenderRegions(); fuelUpdateSummary(); }
    };

    function envRenderRegions() {
        const container = document.getElementById('env-regions-container');
        if (!container) return;

        const allProjects = (typeof state !== 'undefined' && state.projects) ? state.projects : [];
        const userEmail   = (typeof state !== 'undefined') ? state.currentUser?.email : null;
        const canEditEnv  = UserAccounts.canEditTab(userEmail, 'env-monitoring');

        const overallSummary = []; // { region, kwh, amount, ghg, projCount }

        let html = '';

        ENV_REGIONS.forEach(region => {
            const rk               = regionKey(region);
            const rc               = REGION_COLORS[region] || { bg:'#2e7d32', light:'#e8f5e9' };
            const projs            = allProjects.filter(p => p.region === region);
            const regionRows       = envData.filter(r => r.region === region);
            const isOpen           = !envCollapsed[region];
            const canEditRegionEnv = state.isEditing && canEditEnv && UserAccounts.canEdit(userEmail, region);

            const rKwh   = regionRows.reduce((s,r)=>s+r.kwh,0);
            const rAmt   = regionRows.reduce((s,r)=>s+r.amount,0);
            const rGhg   = regionRows.reduce((s,r)=>s+r.ghg,0);

            overallSummary.push({ region, kwh: rKwh, amount: rAmt, ghg: rGhg, projCount: projs.length, color: rc.bg });

            let projTablesHtml = '';
            if (projs.length === 0) {
                projTablesHtml = `<div style="padding:20px;text-align:center;color:var(--text-secondary);font-size:0.75rem;font-style:italic;">
                    ${window.icon('folder', '', `style="opacity:0.25;font-size:1.5rem;display:block;margin-bottom:6px;"`)}No projects in this region yet.
                </div>`;
            } else {
                const _envIdx = _tabProjIdx('env-monitoring', region, projs);
                const _envNavProjs = [projs[_envIdx]];

                _envNavProjs.forEach((proj, pi) => {
                    const projRows = regionRows.filter(r => r.project === proj.name);
                    const pKwh   = projRows.reduce((s,r)=>s+r.kwh,0);
                    const pAmt   = projRows.reduce((s,r)=>s+r.amount,0);
                    const pGhg   = projRows.reduce((s,r)=>s+r.ghg,0);
                    const cols   = canEditRegionEnv ? 6 : 5;

                    projTablesHtml += `
                    
                    <div style="${_tabProjCardStyle()}">

                        
                        ${_tabProjHeader({ tabType:'env-monitoring', region, projs, idx:_envIdx, proj, color:rc.bg, status:true })}

                        
                        ${canEditRegionEnv ? `
                        <div style="padding:10px 14px;background:${rc.light};border-bottom:1px solid #c8e6c9;">
                            <div style="display:flex;flex-wrap:wrap;gap:7px;align-items:flex-end;">
                                <div>
                                    <label style="font-size:0.63rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:2px;">Month</label>
                                    <select id="env-month-${rk}-${pi}" style="padding:5px 7px;border-radius:5px;border:1px solid var(--border-color);background:var(--input-bg);color:var(--text-primary);font-size:0.7rem;min-width:110px;">
                                        ${ENV_MONTHS.map(m=>`<option value="${m}">${m}</option>`).join('')}
                                    </select>
                                </div>
                                <div style="flex:1;min-width:120px;">
                                    <label style="font-size:0.63rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:2px;">Office / Building &amp; Floor Area</label>
                                    <input type="text" id="env-loc-${rk}-${pi}" placeholder="e.g. Office 1 / 100m2" style="width:100%;box-sizing:border-box;padding:5px 7px;border-radius:5px;border:1px solid var(--border-color);background:var(--input-bg);color:var(--text-primary);font-size:0.7rem;">
                                </div>
                                <div style="min-width:75px;">
                                    <label style="font-size:0.63rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:2px;">kWh</label>
                                    <input type="number" id="env-kwh-${rk}-${pi}" placeholder="0" min="0" oninput="envCalc('${region}',${pi})" style="width:100%;box-sizing:border-box;padding:5px 7px;border-radius:5px;border:1px solid var(--border-color);background:var(--input-bg);color:var(--text-primary);font-size:0.7rem;">
                                </div>
                                <div style="min-width:85px;">
                                    <label style="font-size:0.63rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:2px;">Amount (Php)</label>
                                    <input type="number" id="env-amt-${rk}-${pi}" placeholder="0" min="0" style="width:100%;box-sizing:border-box;padding:5px 7px;border-radius:5px;border:1px solid var(--border-color);background:var(--input-bg);color:var(--text-primary);font-size:0.7rem;">
                                </div>
                                <div style="min-width:75px;">
                                    <label style="font-size:0.63rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:2px;">GHG (tCO2)</label>
                                    <input type="number" id="env-ghg-${rk}-${pi}" readonly style="width:100%;box-sizing:border-box;padding:5px 7px;border-radius:5px;border:1px solid #c8e6c9;background:#e8f5e9;color:#2e7d32;font-size:0.7rem;font-weight:700;">
                                </div>
                                <button onclick="envAddRow('${region}',${pi},'${proj.name.replace(/'/g,"\\'")}')" style="padding:5px 12px;background:linear-gradient(135deg,${rc.bg},${rc.bg}cc);color:white;border:none;border-radius:5px;font-size:0.7rem;font-weight:700;cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:4px;">
                                    ${window.icon('plus')} Add
                                </button>
                            </div>
                        </div>` : ''}

                        
                        <div style="overflow-x:auto;">
                            <table style="width:100%;border-collapse:collapse;font-size:0.7rem;table-layout:fixed;">
                                ${envColgroup(canEditRegionEnv)}
                                <thead>
                                    <tr>
                                        <th rowspan="2" style="padding:7px 11px;text-align:left;background:#b7ddb5;color:#0b3d12;font-weight:800;border:1px solid #c8e6c9;vertical-align:middle;white-space:nowrap;font-size:0.65rem;">Month</th>
                                        <th rowspan="2" style="padding:7px 11px;text-align:left;background:#b7ddb5;color:#0b3d12;font-weight:800;border:1px solid #c8e6c9;vertical-align:middle;font-size:0.65rem;">Office/Building<br>Floor Area</th>
                                        <th colspan="3" style="padding:6px 11px;text-align:center;background:#9ecf9b;color:#0b3d12;font-weight:800;border:1px solid #c8e6c9;font-size:0.65rem;">Electricity Consumption</th>
                                        ${canEditRegionEnv ? `<th rowspan="2" style="padding:7px 7px;text-align:center;background:#b7ddb5;color:#0b3d12;font-weight:800;border:1px solid #c8e6c9;font-size:0.65rem;"></th>` : ''}
                                    </tr>
                                    <tr>
                                        <th style="padding:6px 11px;text-align:left;background:#c5e8c3;color:#0b3d12;font-weight:800;border:1px solid #c8e6c9;font-size:0.65rem;">kWh</th>
                                        <th style="padding:6px 11px;text-align:center;background:#c5e8c3;color:#0b3d12;font-weight:800;border:1px solid #c8e6c9;font-size:0.65rem;">Amount, Php</th>
                                        <th style="padding:6px 11px;text-align:center;background:#c5e8c3;color:#0b3d12;font-weight:800;border:1px solid #c8e6c9;font-size:0.65rem;">Eq. GHG Emission<br>(tCO2)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${envBuildRows(projRows, canEditRegionEnv)}
                                </tbody>
                                ${projRows.length ? `
                                <tfoot>
                                    <tr style="background:#e8f5e9;">
                                        <td colspan="2" style="padding:7px 11px;font-weight:800;color:#0b3d12;border:1px solid #c8e6c9;font-size:0.67rem;">
                                            ${window.icon('calc', '', `style="font-size:0.6rem;"`)} TOTAL
                                        </td>
                                        <td style="padding:7px 11px;text-align:left;font-weight:800;color:#0b3d12;border:1px solid #c8e6c9;">${pKwh.toLocaleString(undefined,{maximumFractionDigits:2})}</td>
                                        <td style="padding:7px 11px;text-align:right;font-weight:800;color:#0b3d12;border:1px solid #c8e6c9;">${pAmt.toLocaleString(undefined,{maximumFractionDigits:2})}</td>
                                        <td style="padding:7px 11px;text-align:right;font-weight:800;color:#0b3d12;border:1px solid #c8e6c9;">${pGhg.toFixed(4)}</td>
                                        ${canEditRegionEnv ? `<td style="border:1px solid #c8e6c9;"></td>` : ''}
                                    </tr>
                                </tfoot>` : ''}
                            </table>
                        </div>
                    </div>`;
                });

            }

            html += _tabRegionBanner({ key:'env', toggle:'envToggleRegion', region, rk, rc, icon:'bolt', projCount:projs.length, open:isOpen, editable:canEditRegionEnv, viewOnly:(!canEditRegionEnv && state.isEditing),
                chips:[ rKwh>0 && { text:`${rKwh.toLocaleString()} kWh`, kind:'a' }, rAmt>0 && { text:`Php ${rAmt.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`, kind:'a' }, rGhg>0 && { text:`${rGhg.toFixed(4)} tCO2`, kind:'b' } ],
                body: projTablesHtml });
        });

        const grandKwh     = overallSummary.reduce((s,r)=>s+r.kwh,0);
        const grandAmt     = overallSummary.reduce((s,r)=>s+r.amount,0);
        const grandGhg     = overallSummary.reduce((s,r)=>s+r.ghg,0);
        const grandDomM3   = overallSummary.reduce((s,r)=>s+(r.domM3||0),0);
        const grandDomAmt  = overallSummary.reduce((s,r)=>s+(r.domAmt||0),0);
        const grandPotLit  = overallSummary.reduce((s,r)=>s+(r.potLit||0),0);
        const grandPotAmt  = overallSummary.reduce((s,r)=>s+(r.potAmt||0),0);
        const grandIndM3   = overallSummary.reduce((s,r)=>s+(r.indM3||0),0);
        const grandIndAmt  = overallSummary.reduce((s,r)=>s+(r.indAmt||0),0);
        const hasElecData = grandKwh > 0;

        // ── Electricity-only summary ────────────────────────────────────────────
        const elecSumContainer = document.getElementById('env-summary-electricity');
        if (elecSumContainer) {
            elecSumContainer.innerHTML = window.envSummaryTable({
                title: 'OVERALL SUMMARY \u2014 ELECTRICITY CONSUMPTION',
                groups: [ { label: `${window.icon('bolt')} ELECTRICITY CONSUMPTION`, span: 3 } ],
                cols: [ { label: 'kWh', dec: 2 }, { label: 'Amount (\u20b1)', dec: 2 }, { label: 'GHG (tCO2)', fixed: 4, tip: function(vals) {
                    const kwh = vals[0] || 0;
                    const fn = n => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
                    return [
                        'GHG (tCO2) · Electricity',
                        'kWh × ' + GHG_FACTOR + ' (DOE grid emission factor)',
                        fn(kwh) + ' × ' + GHG_FACTOR,
                        '= ' + (kwh * GHG_FACTOR).toFixed(4)
                    ];
                } } ],
                rows: overallSummary.map(s => ({ region: s.region, projs: s.projCount, values: [s.kwh, s.amount, s.ghg] })),
                totals: [grandKwh, grandAmt, grandGhg],
                hasData: hasElecData, icon: 'bolt', note: 'Log <strong>Electricity Consumption</strong> per region \u2014 kWh usage and billing amount in Php. Auto-calculates <strong>GHG emissions</strong> (tCO2).', emptyText: 'No electricity data entered yet.'
            });
        }
        container.innerHTML = html;
    }
    window.envRenderRegions = envRenderRegions;
    Object.defineProperty(window, '_envData', { get: () => envData, set: v => { envData = v; }, configurable: true });
    Object.defineProperty(window, '_wasteData', { get: () => wasteData, set: v => { wasteData = v; }, configurable: true });
    Object.defineProperty(window, '_fuelData', { get: () => fuelData, set: v => { fuelData = v; }, configurable: true });
    Object.defineProperty(window, '_waterData', { get: () => waterData, set: v => { waterData = v; }, configurable: true });


    // ── Water overall summary ──────────────────────────────────────────────────
    function waterUpdateSummary() {
        const container = document.getElementById('env-summary-water');
        if (!container) return;
        const allProjects = (typeof state !== 'undefined' && state.projects) ? state.projects : [];
        const fmt = (v) => v > 0 ? v.toLocaleString(undefined,{maximumFractionDigits:3}) : '\u2014';
        const regionRows = [];
        ENV_REGIONS.forEach(function(region) {
            const rows   = waterData.filter(r => r.region === region);
            const projs  = allProjects.filter(p => p.region === region).length;
            const domM3  = rows.reduce((s,r)=>s+r.domM3,0);
            const domAmt = rows.reduce((s,r)=>s+r.domAmt,0);
            const potLit = rows.reduce((s,r)=>s+r.potLit,0);
            const potAmt = rows.reduce((s,r)=>s+r.potAmt,0);
            const indM3  = rows.reduce((s,r)=>s+r.indM3,0);
            const indAmt = rows.reduce((s,r)=>s+r.indAmt,0);
            const rc     = REGION_COLORS[region] || { bg:'#1b5e20' };
            regionRows.push({ region, projs, domM3, domAmt, potLit, potAmt, indM3, indAmt, color: rc.bg });
        });
        const grandDomM3  = regionRows.reduce((s,r)=>s+r.domM3,0);
        const grandDomAmt = regionRows.reduce((s,r)=>s+r.domAmt,0);
        const grandPotLit = regionRows.reduce((s,r)=>s+r.potLit,0);
        const grandPotAmt = regionRows.reduce((s,r)=>s+r.potAmt,0);
        const grandIndM3  = regionRows.reduce((s,r)=>s+r.indM3,0);
        const grandIndAmt = regionRows.reduce((s,r)=>s+r.indAmt,0);
        const hasAnyData  = grandDomM3 > 0 || grandPotLit > 0 || grandIndM3 > 0;
        container.innerHTML = window.envSummaryTable({
            title: 'OVERALL SUMMARY \u2014 WATER CONSUMPTION',
            groups: [ { label: `${window.icon('home')} Domestic`, span: 2 }, { label: `${window.icon("water")} Potable`, span: 2 }, { label: `${window.icon("plant")} Industrial`, span: 2 } ],
            cols: [ { label: 'm\u00b3' }, { label: 'Amount (\u20b1)' }, { label: 'Liters' }, { label: 'Amount (\u20b1)' }, { label: 'm\u00b3' }, { label: 'Amount (\u20b1)' } ],
            rows: regionRows.map(r => ({ region: r.region, projs: r.projs, values: [r.domM3, r.domAmt, r.potLit, r.potAmt, r.indM3, r.indAmt] })),
            totals: [grandDomM3, grandDomAmt, grandPotLit, grandPotAmt, grandIndM3, grandIndAmt],
            hasData: hasAnyData, icon: 'water', note: 'Log <strong>Water Consumption</strong> per region \u2014 Domestic Use (m\u00b3), Potable Use (Liters), and Industrial Use (m\u00b3), each with corresponding amount in Php.', emptyText: 'No water data entered yet.'
        });
    }

    // ── Appliances overall summary ─────────────────────────────────────────────
    function appliancesUpdateSummary() {
        const container = document.getElementById('env-summary-appliances');
        if (!container) return;
        const allProjects = (typeof state !== 'undefined' && state.projects) ? state.projects : [];
        const SECTION_LABELS = { A:'Household Appliances', A1:'Air Conditioning', B:'Lighting Fixtures', C:'Power Tools & Others' };
        const SECTION_KEYS = ['A','A1','B','C'];

        // ── Grand totals (all regions) ────────────────────────────────────────
        const totals = {};
        Object.values(appliancesData).forEach(function(entry) {
            Object.keys(entry).forEach(function(fieldId) {
                totals[fieldId] = (totals[fieldId] || 0) + (parseFloat(entry[fieldId]) || 0);
            });
        });
        const hasAnyData = Object.values(totals).some(v => v > 0);
        const totalUnits = Object.keys(totals).reduce((s,id)=>applIsWatts(id) ? s : s+totals[id], 0);

        // ── Per-region totals ─────────────────────────────────────────────────
        const regionRows = ENV_REGIONS.map(function(region) {
            const rTotals = {};
            const rProjSet = new Set();
            Object.entries(appliancesData).forEach(function([key, entry]) {
                const parts = key.split(':');
                // key format: region:projName:month:building (colons replaced with _ in non-alnum chars, but region preserved)
                // Reconstruct region by matching against known regions
                // appliancesKey replaces non-alnum non-colon with _, so "VISAYAS & MINDANAO" → "VISAYAS___MINDANAO"
                // Normalize both sides: replace underscores with spaces for comparison
                const keyRegionRaw = (parts[0] || '').replace(/_+/g,' ').trim().toUpperCase();
                const targetRegion = region.replace(/[^a-z0-9]/gi,'_').replace(/_+/g,' ').trim().toUpperCase();
                if (keyRegionRaw !== targetRegion) return;
                rProjSet.add(parts[1] || '');
                Object.keys(entry).forEach(function(fieldId) {
                    rTotals[fieldId] = (rTotals[fieldId] || 0) + (parseFloat(entry[fieldId]) || 0);
                });
            });
            const rSectionTotals = SECTION_KEYS.map(function(sk) {
                const sFields = APPL_FIELDS.filter(f=>f.section===sk && !applIsWatts(f.id));
                return sFields.reduce((s,f)=>s+(rTotals[f.id]||0),0);
            });
            const rTotal = rSectionTotals.reduce((s,v)=>s+v,0);
            const rc = REGION_COLORS[region] || { bg:'#1b5e20', light:'#e8f5e9' };
            return { region, projs: allProjects.filter(p=>p.region===region).length, rTotal, rSectionTotals, rc };
        });

        container.innerHTML = window.envSummaryTable({
            title: 'OVERALL SUMMARY \u2014 ELECTRICAL EQUIPMENT & FIXTURES',
            groups: SECTION_KEYS.map(sk => ({ label: SECTION_LABELS[sk] || sk })).concat([ { label: 'Total Units' } ]),
            cols: SECTION_KEYS.map(() => ({})).concat([ {} ]),
            rows: regionRows.map(r => ({ region: r.region, projs: r.projs, values: r.rSectionTotals.concat([r.rTotal]) })),
            totals: SECTION_KEYS.map(sk => APPL_FIELDS.filter(f => f.section === sk && !applIsWatts(f.id)).reduce((t, f) => t + (totals[f.id] || 0), 0)).concat([totalUnits]),
            hasData: hasAnyData, icon: 'plug', note: 'Inventory of <strong>Electrical Equipment &amp; Lighting Fixtures Used</strong> \u2014 quantity in units per project, per region.', emptyText: 'No appliance inventory entered yet.'
        });
    }
    window.appliancesUpdateSummary = appliancesUpdateSummary;

    // Fixed column widths so the Month column stays narrow (Month | Floor area | kWh | Amount | GHG | [delete])
    function envColgroup(canEdit) {
        return '<colgroup><col style="width:64px"><col style="width:130px"><col><col style="width:130px"><col style="width:110px">' + (canEdit ? '<col style="width:40px">' : '') + '</colgroup>';
    }

    function envBuildRows(rows, canEdit) {
        if (!rows.length) {
            return `<tr><td colspan="${canEdit ? 6 : 5}" style="padding:18px;text-align:center;color:var(--text-secondary);font-size:0.72rem;font-style:italic;">
                ${window.icon('seedling', '', `style="opacity:0.2;margin-right:5px;"`)}No entries yet${canEdit ? ' — use the form above' : ''}.
            </td></tr>`;
        }
        const grouped = {};
        ENV_MONTHS.forEach(m => { grouped[m] = []; });
        rows.forEach(r => { if (grouped[r.month]) grouped[r.month].push(r); });
        const maxKwh = Math.max(0, ...rows.map(r => Number(r.kwh) || 0));

        let html = '';
        ENV_MONTHS.forEach(month => {
            const mRows = grouped[month];
            if (!mRows.length) return;
            mRows.forEach((r, i) => {
                const pct = maxKwh > 0 ? Math.max(2, Math.round((Number(r.kwh) || 0) / maxKwh * 100)) : 0;
                html += `<tr style="background:${i%2===0?'var(--bg-card)':'var(--input-bg)'};">
                    ${i===0 ? `<td rowspan="${mRows.length}" title="${month}" style="padding:6px 11px;text-align:left;font-weight:800;color:#0b3d12;border:1px solid #e8f5e9;vertical-align:middle;white-space:nowrap;">${month.slice(0,3)}</td>` : ''}
                    <td style="padding:6px 11px;border:1px solid #e8f5e9;color:#000;font-weight:600;text-align:left;vertical-align:middle;overflow-wrap:anywhere;">${r.location}</td>
                    <td style="padding:6px 11px;text-align:left;border:1px solid #e8f5e9;color:#000;font-weight:600;">${r.kwh.toLocaleString()}<span style="display:block;height:4px;border-radius:2px;background:#66bb6a;margin-top:3px;width:${pct}%;"></span></td>
                    <td style="padding:6px 11px;text-align:right;border:1px solid #e8f5e9;color:#000;font-weight:600;">${r.amount.toLocaleString()}</td>
                    <td style="padding:6px 11px;text-align:right;border:1px solid #e8f5e9;color:#000;font-weight:600;">${r.ghg.toFixed(4)}</td>
                    ${canEdit ? `<td style="padding:5px 7px;text-align:center;border:1px solid #e8f5e9;">
                        <button onclick="envDeleteRow(${r.id})" style="padding:2px 7px;background:#ffebee;color:#c62828;border:1px solid #ef9a9a;border-radius:4px;font-size:0.6rem;cursor:pointer;">${window.icon('times')}</button>
                    </td>` : ''}
                </tr>`;
            });
        });
        return html;
    }

    
    function envUpdateBadges() { /* badges removed — totals shown in Overall Summary cards */ }

    
    // envUpdateChart removed — pie chart panel replaced with simple info bar

    
    function waterRegionKey(r) { return 'w_' + r.replace(/[^a-z0-9]/gi,'_'); }

    window.waterAddRow = function(regionRaw, pi, projName) {
        const userEmail = (typeof state !== 'undefined') ? state.currentUser?.email : null;
        if (!UserAccounts.canEdit(userEmail, regionRaw) || !UserAccounts.canEditTab(userEmail, 'env-monitoring')) {
            if (typeof showToast === 'function') showToast('No permission to add entries here.', 'warning');
            return;
        }
        const rk     = waterRegionKey(regionRaw);
        const suffix = `${rk}-${pi}`;
        const month    = document.getElementById('wtr-month-'+suffix)?.value || 'January';
        const domM3    = parseFloat(document.getElementById('wtr-dom-m3-'+suffix)?.value)    || 0;
        const domAmt   = parseFloat(document.getElementById('wtr-dom-amt-'+suffix)?.value)   || 0;
        const potLit   = parseFloat(document.getElementById('wtr-pot-lit-'+suffix)?.value)   || 0;
        const potAmt   = parseFloat(document.getElementById('wtr-pot-amt-'+suffix)?.value)   || 0;
        const indM3    = parseFloat(document.getElementById('wtr-ind-m3-'+suffix)?.value)    || 0;
        const indAmt   = parseFloat(document.getElementById('wtr-ind-amt-'+suffix)?.value)   || 0;
        const _newWaterRow = { id: Date.now()+Math.random(), region: regionRaw, project: projName||'', month, domM3, domAmt, potLit, potAmt, indM3, indAmt };
        waterData.push(_newWaterRow);
        if (typeof saveEnvRowToFirebase === 'function') saveEnvRowToFirebase('env_water_rows', _newWaterRow);
        ['wtr-dom-m3-','wtr-dom-amt-','wtr-pot-lit-','wtr-pot-amt-','wtr-ind-m3-','wtr-ind-amt-'].forEach(p => {
            const el = document.getElementById(p+suffix); if (el) el.value = '';
        });
        waterRenderRegions();
        waterUpdateSummary();
    };

    window.waterDeleteRow = async function(id) {
        const row = waterData.find(r => r.id === id);
        const userEmail = (typeof state !== 'undefined') ? state.currentUser?.email : null;
        if (row && (!UserAccounts.canEdit(userEmail, row.region) || !UserAccounts.canEditTab(userEmail, 'env-monitoring'))) {
            if (typeof showToast === 'function') showToast('No permission to delete here.', 'warning');
            return;
        }
        if (typeof showDeleteDialog === 'function' && !(await showDeleteDialog('Water Entry', 'this water entry' + (row && row.region ? ' in ' + row.region : '')))) return;
        if (row && typeof deleteEnvRowFromFirebase === 'function') {
            deleteEnvRowFromFirebase('env_water_rows', row).then(() => {
                // Only remove from local array AFTER Firebase deletion succeeds
                waterData = waterData.filter(r => r.id !== id);
                waterRenderRegions();
                waterUpdateSummary();
                if (typeof showToast === 'function') showToast('Water entry deleted.', 'success');
            }).catch((err) => {
                if (typeof showToast === 'function') showToast('Failed to delete entry: ' + err.message, 'error');
            });
        } else {
            // Fallback if deleteEnvRowFromFirebase is not available
            waterData = waterData.filter(r => r.id !== id);
            waterRenderRegions();
            waterUpdateSummary();
        }
    };

    window.waterToggleRegion = function(regionRaw) {
        waterCollapsed[regionRaw] = !waterCollapsed[regionRaw];
        const rk   = waterRegionKey(regionRaw);
        window._tabRegionSetOpen('wtr', rk, !waterCollapsed[regionRaw]);
    };

    function waterRenderRegions() {
        const container = document.getElementById('env-water-regions-container');
        if (!container) return;
        const allProjects = (typeof state !== 'undefined' && state.projects) ? state.projects : [];
        const userEmail   = (typeof state !== 'undefined') ? state.currentUser?.email : null;
        const canEditEnv  = UserAccounts.canEditTab(userEmail, 'env-monitoring');

        let html = '';
        ENV_REGIONS.forEach(region => {
            const rk         = waterRegionKey(region);
            const rc         = REGION_COLORS[region] || { bg:'#2e7d32', light:'#e8f5e9' };
            const projs      = allProjects.filter(p => p.region === region);
            const regionRows = waterData.filter(r => r.region === region);
            const isOpen     = !waterCollapsed[region];
            const canEditReg = state.isEditing && canEditEnv && UserAccounts.canEdit(userEmail, region);

            const rDomM3  = regionRows.reduce((s,r)=>s+r.domM3,0);
            const rDomAmt = regionRows.reduce((s,r)=>s+r.domAmt,0);
            const rPotLit = regionRows.reduce((s,r)=>s+r.potLit,0);
            const rPotAmt = regionRows.reduce((s,r)=>s+r.potAmt,0);
            const rIndM3  = regionRows.reduce((s,r)=>s+r.indM3,0);
            const rIndAmt = regionRows.reduce((s,r)=>s+r.indAmt,0);

            let projTablesHtml = '';
            if (projs.length === 0) {
                projTablesHtml = `<div style="padding:20px;text-align:center;color:var(--text-secondary);font-size:0.75rem;font-style:italic;">
                    ${window.icon('folder', '', `style="opacity:0.25;font-size:1.5rem;display:block;margin-bottom:6px;"`)}No projects in this region yet.</div>`;
            } else {
                // ── Project nav (Prev / Next) — same pattern as electricity ──
                const _wtrIdx = _tabProjIdx('water', region, projs);
                const _wtrNavProjs = [projs[_wtrIdx]];

                _wtrNavProjs.forEach((proj, pi) => {
                    const projRows = regionRows.filter(r => r.project === proj.name);
                    const pDomM3  = projRows.reduce((s,r)=>s+r.domM3,0);
                    const pDomAmt = projRows.reduce((s,r)=>s+r.domAmt,0);
                    const pPotLit = projRows.reduce((s,r)=>s+r.potLit,0);
                    const pPotAmt = projRows.reduce((s,r)=>s+r.potAmt,0);
                    const pIndM3  = projRows.reduce((s,r)=>s+r.indM3,0);
                    const pIndAmt = projRows.reduce((s,r)=>s+r.indAmt,0);
                    // Use global proj index (within region) for stable input IDs
                    const globalPi = projs.indexOf(proj);
                    const suffix   = `${rk}-${globalPi}`;
                    const pn       = proj.name.replace(/'/g,"\'");

                    // Green table styling — uniform with electricity
                    const thBase  = `padding:7px 11px;text-align:center;font-weight:800;border:1px solid #c8e6c9;font-size:0.63rem;`;
                    const thLight = `background:#b7ddb5;color:#0b3d12;`;
                    const thMid   = `background:#9ecf9b;color:#0b3d12;`;
                    const thSub   = `background:#c5e8c3;color:#0b3d12;`;

                    projTablesHtml += `
                    <div style="${_tabProjCardStyle()}">
                        ${_tabProjHeader({ tabType:'water', region, projs, idx:_wtrIdx, proj, color:rc.bg, status:true })}
                        ${canEditReg ? `
                        <div style="padding:10px 14px;background:${rc.light};border-bottom:1px solid #c8e6c9;">
                            <div style="display:flex;flex-wrap:wrap;gap:7px;align-items:flex-end;">
                                <div>
                                    <label style="font-size:0.63rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:2px;">Month</label>
                                    <select id="wtr-month-${suffix}" style="padding:5px 7px;border-radius:5px;border:1px solid var(--border-color);background:var(--input-bg);color:var(--text-primary);font-size:0.7rem;min-width:110px;">
                                        ${ENV_MONTHS.map(m=>`<option value="${m}">${m}</option>`).join('')}
                                    </select>
                                </div>
                                <div style="min-width:75px;">
                                    <label style="font-size:0.63rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:2px;">Domestic m³</label>
                                    <input type="number" id="wtr-dom-m3-${suffix}" placeholder="0" min="0" style="width:100%;box-sizing:border-box;padding:5px 7px;border-radius:5px;border:1px solid var(--border-color);background:var(--input-bg);color:var(--text-primary);font-size:0.7rem;">
                                </div>
                                <div style="min-width:85px;">
                                    <label style="font-size:0.63rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:2px;">Domestic Amt (Php)</label>
                                    <input type="number" id="wtr-dom-amt-${suffix}" placeholder="0" min="0" style="width:100%;box-sizing:border-box;padding:5px 7px;border-radius:5px;border:1px solid var(--border-color);background:var(--input-bg);color:var(--text-primary);font-size:0.7rem;">
                                </div>
                                <div style="min-width:75px;">
                                    <label style="font-size:0.63rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:2px;">Potable (Liters)</label>
                                    <input type="number" id="wtr-pot-lit-${suffix}" placeholder="0" min="0" style="width:100%;box-sizing:border-box;padding:5px 7px;border-radius:5px;border:1px solid var(--border-color);background:var(--input-bg);color:var(--text-primary);font-size:0.7rem;">
                                </div>
                                <div style="min-width:85px;">
                                    <label style="font-size:0.63rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:2px;">Potable Amt (Php)</label>
                                    <input type="number" id="wtr-pot-amt-${suffix}" placeholder="0" min="0" style="width:100%;box-sizing:border-box;padding:5px 7px;border-radius:5px;border:1px solid var(--border-color);background:var(--input-bg);color:var(--text-primary);font-size:0.7rem;">
                                </div>
                                <div style="min-width:75px;">
                                    <label style="font-size:0.63rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:2px;">Industrial m³</label>
                                    <input type="number" id="wtr-ind-m3-${suffix}" placeholder="0" min="0" style="width:100%;box-sizing:border-box;padding:5px 7px;border-radius:5px;border:1px solid var(--border-color);background:var(--input-bg);color:var(--text-primary);font-size:0.7rem;">
                                </div>
                                <div style="min-width:85px;">
                                    <label style="font-size:0.63rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:2px;">Industrial Amt (Php)</label>
                                    <input type="number" id="wtr-ind-amt-${suffix}" placeholder="0" min="0" style="width:100%;box-sizing:border-box;padding:5px 7px;border-radius:5px;border:1px solid var(--border-color);background:var(--input-bg);color:var(--text-primary);font-size:0.7rem;">
                                </div>
                                <button onclick="waterAddRow('${region}',${globalPi},'${pn}')" style="padding:5px 12px;background:linear-gradient(135deg,${rc.bg},${rc.bg}cc);color:white;border:none;border-radius:5px;font-size:0.7rem;font-weight:700;cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:4px;">
                                    ${window.icon('plus')} Add
                                </button>
                            </div>
                        </div>` : ''}
                        <div style="overflow-x:auto;">
                            <table style="width:100%;border-collapse:collapse;font-size:0.7rem;">
                                <thead>
                                    <tr>
                                        <th rowspan="2" style="${thBase}${thLight}vertical-align:middle;">Month</th>
                                        <th colspan="2" style="${thBase}${thMid}">Water Consumption, <span style="color:#c62828;font-weight:800;">Domestic Use</span></th>
                                        <th colspan="2" style="${thBase}${thMid}">Water Consumption, <span style="color:#c62828;font-weight:800;">Potable Use</span></th>
                                        <th colspan="2" style="${thBase}${thMid}">Water Consumption, <span style="color:#c62828;font-weight:800;">Industrial Use</span></th>
                                        ${canEditReg ? `<th rowspan="2" style="${thBase}${thLight}vertical-align:middle;"></th>` : ''}
                                    </tr>
                                    <tr>
                                        <th style="${thBase}${thSub}">m³</th>
                                        <th style="${thBase}${thSub}">Amount, Php</th>
                                        <th style="${thBase}${thSub}">Liters</th>
                                        <th style="${thBase}${thSub}">Amount, Php</th>
                                        <th style="${thBase}${thSub}">m³</th>
                                        <th style="${thBase}${thSub}">Amount, Php</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${waterBuildRows(projRows, canEditReg)}
                                </tbody>
                                ${projRows.length ? `
                                <tfoot>
                                    <tr style="background:#e8f5e9;">
                                        <td style="padding:7px 11px;font-weight:800;color:#0b3d12;border:1px solid #c8e6c9;font-size:0.67rem;">
                                            ${window.icon('calc', '', `style="font-size:0.6rem;"`)} TOTAL — ${proj.name}
                                        </td>
                                        <td style="padding:7px 11px;text-align:right;font-weight:800;color:#0b3d12;border:1px solid #c8e6c9;">${pDomM3.toLocaleString(undefined,{maximumFractionDigits:2})}</td>
                                        <td style="padding:7px 11px;text-align:right;font-weight:800;color:#0b3d12;border:1px solid #c8e6c9;">${pDomAmt.toLocaleString(undefined,{maximumFractionDigits:2})}</td>
                                        <td style="padding:7px 11px;text-align:right;font-weight:800;color:#0b3d12;border:1px solid #c8e6c9;">${pPotLit.toLocaleString(undefined,{maximumFractionDigits:2})}</td>
                                        <td style="padding:7px 11px;text-align:right;font-weight:800;color:#0b3d12;border:1px solid #c8e6c9;">${pPotAmt.toLocaleString(undefined,{maximumFractionDigits:2})}</td>
                                        <td style="padding:7px 11px;text-align:right;font-weight:800;color:#0b3d12;border:1px solid #c8e6c9;">${pIndM3.toLocaleString(undefined,{maximumFractionDigits:2})}</td>
                                        <td style="padding:7px 11px;text-align:right;font-weight:800;color:#0b3d12;border:1px solid #c8e6c9;">${pIndAmt.toLocaleString(undefined,{maximumFractionDigits:2})}</td>
                                        ${canEditReg ? `<td style="border:1px solid #c8e6c9;"></td>` : ''}
                                    </tr>
                                </tfoot>` : ''}
                            </table>
                        </div>
                    </div>`;
                });

            }

            html += _tabRegionBanner({ key:'wtr', toggle:'waterToggleRegion', region, rk, rc, icon:'water', projCount:projs.length, open:isOpen, editable:canEditReg, viewOnly:(!canEditReg && state.isEditing),
                chips:[ rDomM3>0 && { text:`${rDomM3.toLocaleString()} m\u00b3 Dom`, kind:'a' }, rIndM3>0 && { text:`${rIndM3.toLocaleString()} m\u00b3 Ind`, kind:'b' } ],
                body: projTablesHtml });
        });

        container.innerHTML = html;
    }

    function waterBuildRows(rows, canEdit) {
        if (!rows.length) {
            return `<tr><td colspan="${canEdit ? 8 : 7}" style="padding:18px;text-align:center;color:var(--text-secondary);font-size:0.72rem;font-style:italic;">
                ${window.icon('water', '', `style="opacity:0.2;margin-right:5px;"`)}No entries yet${canEdit ? ' — use the form above' : ''}.
            </td></tr>`;
        }
        const grouped = {};
        ENV_MONTHS.forEach(m => { grouped[m] = []; });
        rows.forEach(r => { if (grouped[r.month]) grouped[r.month].push(r); });
        let html = '';
        ENV_MONTHS.forEach(month => {
            const mRows = grouped[month];
            if (!mRows.length) return;
            mRows.forEach((r, i) => {
                html += `<tr style="background:${i%2===0?'var(--bg-card)':'var(--input-bg)'};color:#000;font-weight:600;">
                    ${i===0 ? `<td rowspan="${mRows.length}" style="padding:6px 11px;text-align:center;font-weight:800;color:#0b3d12;border:1px solid #c8e6c9;vertical-align:middle;white-space:nowrap;">${month}</td>` : ''}
                    <td style="padding:6px 11px;text-align:right;border:1px solid #c8e6c9;">${r.domM3.toLocaleString()}</td>
                    <td style="padding:6px 11px;text-align:right;border:1px solid #c8e6c9;">${r.domAmt.toLocaleString()}</td>
                    <td style="padding:6px 11px;text-align:right;border:1px solid #c8e6c9;">${r.potLit.toLocaleString()}</td>
                    <td style="padding:6px 11px;text-align:right;border:1px solid #c8e6c9;">${r.potAmt.toLocaleString()}</td>
                    <td style="padding:6px 11px;text-align:right;border:1px solid #c8e6c9;">${r.indM3.toLocaleString()}</td>
                    <td style="padding:6px 11px;text-align:right;border:1px solid #c8e6c9;">${r.indAmt.toLocaleString()}</td>
                    ${canEdit ? `<td style="padding:5px 7px;text-align:center;border:1px solid #c8e6c9;">
                        <button onclick="waterDeleteRow(${r.id})" style="padding:2px 7px;background:#ffebee;color:#c62828;border:1px solid #ef9a9a;border-radius:4px;font-size:0.6rem;cursor:pointer;">${window.icon('times')}</button>
                    </td>` : ''}
                </tr>`;
            });
        });
        return html;
    }

    
    window.envInitChart = function() {
        // If envData is empty, try loading from Yjs first (covers direct tab open)
        if (envData.length === 0 && typeof window.loadEnvFromYjs === 'function') {
            window.loadEnvFromYjs().then(() => {
                // If Yjs still returned 0 rows, try Firebase direct fallback
                if (envData.length === 0 && typeof window.loadEnvFromFirebaseDirect === 'function') {
                    window.loadEnvFromFirebaseDirect().then(() => envRender());
                } else {
                    envRender();
                }
            });
        } else {
            envRender();
        }
    };

    let wasteData = [];
    let wasteCollapsed = _initCollapsed();

    const WASTE_MONTHS = ENV_MONTHS;
    const WASTE_REGIONS = ENV_REGIONS;

    window.wasteAddRow = function(regionRaw, pi, projName) {
        const userEmail = (typeof state !== 'undefined') ? state.currentUser?.email : null;
        if (!UserAccounts.canEdit(userEmail, regionRaw) || !UserAccounts.canEditTab(userEmail, 'env-monitoring')) {
            if (typeof showToast === 'function') showToast('You do not have permission to add entries here.', 'warning');
            return;
        }
        const rk = regionRaw.replace(/[^a-z0-9]/gi,'_');
        const suffix = pi !== undefined ? `${rk}_${pi}` : rk;
        const month = document.getElementById('waste-month-'+suffix)?.value || 'January';
        const loc   = (document.getElementById('waste-loc-'+suffix)?.value || '').trim() || '—';
        const bioGen    = parseFloat(document.getElementById('waste-bio-gen-'+suffix)?.value) || 0;
        const bioDisp   = parseFloat(document.getElementById('waste-bio-disp-'+suffix)?.value) || 0;
        const bioDiverted = parseFloat(document.getElementById('waste-bio-div-'+suffix)?.value) || 0;
        const nonbioGen = parseFloat(document.getElementById('waste-nonbio-gen-'+suffix)?.value) || 0;
        const nonbioDisp= parseFloat(document.getElementById('waste-nonbio-disp-'+suffix)?.value) || 0;
        const nonbioDiverted = parseFloat(document.getElementById('waste-nonbio-div-'+suffix)?.value) || 0;
        const recGen    = parseFloat(document.getElementById('waste-rec-gen-'+suffix)?.value) || 0;
        const recDisp   = parseFloat(document.getElementById('waste-rec-disp-'+suffix)?.value) || 0;
        const recDiverted = parseFloat(document.getElementById('waste-rec-div-'+suffix)?.value) || 0;
        const hazGen    = parseFloat(document.getElementById('waste-haz-gen-'+suffix)?.value) || 0;
        const hazDisp   = parseFloat(document.getElementById('waste-haz-disp-'+suffix)?.value) || 0;
        const septage   = parseFloat(document.getElementById('waste-sep-'+suffix)?.value) || 0;
        const remarks   = (document.getElementById('waste-rem-'+suffix)?.value || '').trim();

        wasteData.push({ id: Date.now() + Math.random(), region: regionRaw, project: projName || '', month, location: loc, bioGen, bioDisp, bioDiverted, nonbioGen, nonbioDisp, nonbioDiverted, recGen, recDisp, recDiverted, hazGen, hazDisp, septage, remarks });

        const _newWasteRow = wasteData[wasteData.length - 1];
        if (window.ESHDataSync) {
            window.ESHDataSync.saveEnvRow('env_waste', _newWasteRow);
        }
        // ─── Persist single row to Firestore sub-collection (atomic, no overwrite) ──
        if (typeof saveEnvRowToFirebase === 'function') saveEnvRowToFirebase('env_waste_rows', _newWasteRow);

        ['waste-loc-','waste-bio-gen-','waste-bio-disp-','waste-bio-div-','waste-nonbio-gen-','waste-nonbio-disp-','waste-nonbio-div-','waste-rec-gen-','waste-rec-disp-','waste-rec-div-','waste-haz-gen-','waste-haz-disp-','waste-sep-','waste-rem-'].forEach(p => {
            const el = document.getElementById(p+suffix);
            if (el) el.value = '';
        });
        wasteRenderRegions();
        wasteUpdateSummary();
        if (typeof envRenderRegions === 'function') envRenderRegions();
    };

    window.wasteDeleteRow = async function(id) {
        const row = wasteData.find(r => r.id === id);
        const userEmail = (typeof state !== 'undefined') ? state.currentUser?.email : null;
        if (row && (!UserAccounts.canEdit(userEmail, row.region) || !UserAccounts.canEditTab(userEmail, 'env-monitoring'))) {
            if (typeof showToast === 'function') showToast('You do not have permission to delete entries in this region.', 'warning');
            return;
        }
        if (typeof showDeleteDialog === 'function' && !(await showDeleteDialog('Waste Record', 'this waste record' + (row && row.region ? ' in ' + row.region : '')))) return;
        if (row && window.ESHDataSync) {
            window.ESHDataSync.deleteEnvRow('env_waste', row);
        }
        // ─── Delete individual doc from Firestore sub-collection ─────────────────
        if (row && typeof deleteEnvRowFromFirebase === 'function') deleteEnvRowFromFirebase('env_waste_rows', row);
        wasteData = wasteData.filter(r => r.id !== id);
        wasteRenderRegions();
        wasteUpdateSummary();
        if (typeof envRenderRegions === 'function') envRenderRegions();
        if (typeof showToast === 'function') showToast('Waste record deleted.', 'success');
    };

    window.wasteClearRegion = async function(regionRaw) {
        const userEmail = (typeof state !== 'undefined') ? state.currentUser?.email : null;
        if (!UserAccounts.canEdit(userEmail, regionRaw) || !UserAccounts.canEditTab(userEmail, 'env-monitoring')) {
            if (typeof showToast === 'function') showToast('You do not have permission to clear entries in this region.', 'warning');
            return;
        }
        if (!wasteData.some(r => r.region === regionRaw)) return;
        if (!(await showModernDialog('Clear Waste Records?', `This will clear all waste records for <strong>${regionRaw}</strong>.`, true, 'Clear', 'Cancel'))) return;
        wasteData = wasteData.filter(r => r.region !== regionRaw);
        wasteRenderRegions();
        wasteUpdateSummary();
    };

    window.wasteToggleRegion = function(regionRaw) {
        wasteCollapsed[regionRaw] = !wasteCollapsed[regionRaw];
        const rk = regionRaw.replace(/[^a-z0-9]/gi,'_');
        window._tabRegionSetOpen('waste', rk, !wasteCollapsed[regionRaw]);
    };

    function wasteUpdateSummary() {
        const container = document.getElementById('env-summary-waste');
        if (!container) return;
        const allProjects = (typeof state !== 'undefined' && state.projects) ? state.projects : [];
        const fmt = (v) => v > 0 ? v.toLocaleString(undefined,{maximumFractionDigits:3}) : '—';

        // Per-region aggregation
        const regionRows = [];
        WASTE_REGIONS.forEach(function(region) {
            const rows = wasteData.filter(r => r.region === region);
            const projs = allProjects.filter(p => p.region === region).length;
            const bioGen    = rows.reduce((s,r)=>s+r.bioGen,0);
            const nonbioGen = rows.reduce((s,r)=>s+r.nonbioGen,0);
            const recGen    = rows.reduce((s,r)=>s+r.recGen,0);
            const hazGen    = rows.reduce((s,r)=>s+r.hazGen,0);
            const septage   = rows.reduce((s,r)=>s+r.septage,0);
            const total     = bioGen + nonbioGen + recGen + hazGen;
            const rc        = REGION_COLORS[region] || { bg:'#1b5e20' };
            regionRows.push({ region, projs, bioGen, nonbioGen, recGen, hazGen, septage, total, color: rc.bg });
        });

        const grandBio    = regionRows.reduce((s,r)=>s+r.bioGen,0);
        const grandNonbio = regionRows.reduce((s,r)=>s+r.nonbioGen,0);
        const grandRec    = regionRows.reduce((s,r)=>s+r.recGen,0);
        const grandHaz    = regionRows.reduce((s,r)=>s+r.hazGen,0);
        const grandSep    = regionRows.reduce((s,r)=>s+r.septage,0);
        const grandTotal  = grandBio + grandNonbio + grandRec + grandHaz;
        const hasAnyData  = grandTotal > 0 || grandSep > 0;

        container.innerHTML = window.envSummaryTable({
            title: 'OVERALL SUMMARY \u2014 WASTE GENERATION & DISPOSAL',
            groups: [ { label: `${window.icon("trash")} WASTE GENERATED (MT)`, span: 5 }, { label: 'Septage (m\u00b3)' } ],
            cols: [ { label: 'Total' }, { label: 'Biodeg.' }, { label: 'Non-Bio' }, { label: 'Recyclable' }, { label: 'Hazardous' }, { label: 'm\u00b3' } ],
            rows: regionRows.map(r => ({ region: r.region, projs: r.projs, values: [r.total, r.bioGen, r.nonbioGen, r.recGen, r.hazGen, r.septage] })),
            totals: [grandTotal, grandBio, grandNonbio, grandRec, grandHaz, grandSep],
            hasData: hasAnyData, icon: 'trash', note: 'Log <strong>Waste Generation and Disposal</strong> per region \u2014 Biodegradable, Non-Biodegradable/Residual, Recyclable, and Hazardous Wastes (MT), plus Septage Disposal (m\u00b3).', emptyText: 'No waste data entered yet.'
        });
    }

    function wasteProjectTableHTML(projRows, colors, canEdit) {
        // Col widths: Month=6%, Location=13%, 11 data cols=4.5% each, Haz 2 cols=4.5%, Septage=6.5%, Remarks=7%, [Delete=3%]
        const colgroup = `<colgroup>
            <col style="width:6%">
            <col style="width:${canEdit?'13%':'15%'}">
            <col style="width:4.5%"><col style="width:4.5%"><col style="width:4.5%">
            <col style="width:4.5%"><col style="width:4.5%"><col style="width:4.5%">
            <col style="width:4.5%"><col style="width:4.5%"><col style="width:4.5%">
            <col style="width:4.5%"><col style="width:4.5%">
            <col style="width:6.5%">
            <col style="width:${canEdit?'7%':'8%'}">
            ${canEdit ? '<col style="width:3%">' : ''}
        </colgroup>`;
        const thS = 'padding:5px 4px;text-align:center;border:1px solid #c8e6c9;white-space:nowrap;overflow:hidden;font-weight:800;';
        let t = `<div style="width:100%;"><table style="width:100%;table-layout:fixed;border-collapse:collapse;font-size:0.68rem;">
            ${colgroup}
            <thead>
                <tr>
                    <th style="background:#b7ddb5;color:#0b3d12;${thS}">Month</th>
                    <th style="background:#b7ddb5;color:#0b3d12;${thS}text-align:left;padding-left:8px;">Location</th>
                    <th style="background:#9ecf9b;color:#0b3d12;${thS}" colspan="3">Biodegradable (MT)</th>
                    <th style="background:#9ecf9b;color:#0b3d12;${thS}" colspan="3">Non-Biodeg. (MT)</th>
                    <th style="background:#9ecf9b;color:#0b3d12;${thS}" colspan="3">Recyclable (MT)</th>
                    <th style="background:#9ecf9b;color:#0b3d12;${thS}" colspan="2">Hazardous (MT)</th>
                    <th style="background:#b7ddb5;color:#0b3d12;${thS}white-space:normal;line-height:1.2;">Septage (m³)</th>
                    <th style="background:#b7ddb5;color:#0b3d12;${thS}">Remarks</th>
                    ${canEdit ? '<th style="background:#b7ddb5;color:#0b3d12;'+thS+'"></th>' : ''}
                </tr>
                <tr>
                    <th style="background:#b7ddb5;color:#0b3d12;${thS}"></th>
                    <th style="background:#b7ddb5;color:#0b3d12;${thS}"></th>
                    <th style="background:#c5e8c3;color:#0b3d12;${thS}font-size:0.6rem;">Gen</th>
                    <th style="background:#c5e8c3;color:#0b3d12;${thS}font-size:0.6rem;">Disp</th>
                    <th style="background:#c5e8c3;color:#0b3d12;${thS}font-size:0.6rem;">Div</th>
                    <th style="background:#c5e8c3;color:#0b3d12;${thS}font-size:0.6rem;">Gen</th>
                    <th style="background:#c5e8c3;color:#0b3d12;${thS}font-size:0.6rem;">Disp</th>
                    <th style="background:#c5e8c3;color:#0b3d12;${thS}font-size:0.6rem;">Div</th>
                    <th style="background:#c5e8c3;color:#0b3d12;${thS}font-size:0.6rem;">Gen</th>
                    <th style="background:#c5e8c3;color:#0b3d12;${thS}font-size:0.6rem;">Disp</th>
                    <th style="background:#c5e8c3;color:#0b3d12;${thS}font-size:0.6rem;">Div</th>
                    <th style="background:#c5e8c3;color:#0b3d12;${thS}font-size:0.6rem;">Gen</th>
                    <th style="background:#c5e8c3;color:#0b3d12;${thS}font-size:0.6rem;">Disp</th>
                    <th style="background:#b7ddb5;color:#0b3d12;${thS}font-size:0.6rem;"></th>
                    <th style="background:#b7ddb5;color:#0b3d12;${thS}font-size:0.6rem;"></th>
                    ${canEdit ? '<th style="background:#b7ddb5;color:#0b3d12;'+thS+'"></th>' : ''}
                </tr>
            </thead>
            <tbody>`;
        if (!projRows.length) {
            const colCount = canEdit ? 16 : 15;
            t += `<tr><td colspan="${colCount}" style="padding:18px;text-align:center;color:var(--text-secondary);font-size:0.72rem;font-style:italic;">${window.icon('trash', '', `style="opacity:0.2;margin-right:5px;"`)}No entries yet${canEdit ? ' — use the form above' : ''}.</td></tr>`;
        } else {
            const grouped = {};
            WASTE_MONTHS.forEach(m => { grouped[m] = []; });
            projRows.forEach(r => { if (grouped[r.month]) grouped[r.month].push(r); });
            WASTE_MONTHS.forEach(month => {
                const mRows = grouped[month];
                if (!mRows.length) return;
                mRows.forEach((r, i) => {
                    const tdN = 'padding:5px 3px;text-align:right;border:1px solid #c8e6c9;font-size:0.67rem;overflow:hidden;';
                    const tdL = 'padding:5px 5px;border:1px solid #c8e6c9;font-size:0.67rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
                    t += `<tr style="background:${i%2===0?'var(--bg-card)':'var(--input-bg)'};color:#000;font-weight:600;">
                        ${i===0 ? `<td rowspan="${mRows.length}" style="padding:5px 3px;text-align:center;font-weight:800;color:#0b3d12;border:1px solid #c8e6c9;vertical-align:middle;font-size:0.67rem;">${month}</td>` : ''}
                        <td style="${tdL}">${r.location}</td>
                        <td style="${tdN}">${r.bioGen||''}</td>
                        <td style="${tdN}">${r.bioDisp||''}</td>
                        <td style="${tdN}">${r.bioDiverted||''}</td>
                        <td style="${tdN}">${r.nonbioGen||''}</td>
                        <td style="${tdN}">${r.nonbioDisp||''}</td>
                        <td style="${tdN}">${r.nonbioDiverted||''}</td>
                        <td style="${tdN}">${r.recGen||''}</td>
                        <td style="${tdN}">${r.recDisp||''}</td>
                        <td style="${tdN}">${r.recDiverted||''}</td>
                        <td style="${tdN}">${r.hazGen||''}</td>
                        <td style="${tdN}">${r.hazDisp||''}</td>
                        <td style="${tdN}">${r.septage||''}</td>
                        <td style="${tdL}">${r.remarks||''}</td>
                        ${canEdit ? `<td style="padding:3px 3px;text-align:center;border:1px solid #c8e6c9;">
                            <button onclick="wasteDeleteRow(${r.id})" style="padding:2px 5px;background:#ffebee;color:#c62828;border:1px solid #ef9a9a;border-radius:4px;font-size:0.58rem;cursor:pointer;">${window.icon('times')}</button>
                        </td>` : ''}
                    </tr>`;
                });
            });
        }
        t += `</tbody></table></div>`;
        return t;
    }

    function wasteAddFormHTML(region, pi, projName, rk, suffix, colors, canEdit) {
        if (!canEdit) return '';
        const pnEsc = projName.replace(/'/g,"\\'");
        const regEsc = region.replace(/'/g,"\\'");
        return `<div style="background:${colors.light};border-radius:8px;padding:10px 14px;margin-bottom:12px;border:1px solid ${colors.badge}44;">
            <div style="font-size:0.68rem;font-weight:700;color:${colors.bg};margin-bottom:8px;text-transform:uppercase;">${window.icon('plus-circle')} Add Entry — ${projName}</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;">
                <div style="display:flex;flex-direction:column;gap:3px;"><label style="font-size:0.6rem;font-weight:600;color:var(--text-secondary);">Month</label>
                    <select id="waste-month-${suffix}" style="padding:4px 8px;border:1px solid #ddd;border-radius:6px;font-size:0.7rem;background:var(--input-bg);color:var(--text-primary);">${WASTE_MONTHS.map(m => `<option>${m}</option>`).join('')}</select></div>
                <div style="display:flex;flex-direction:column;gap:3px;"><label style="font-size:0.6rem;font-weight:600;color:var(--text-secondary);">Location</label>
                    <input id="waste-loc-${suffix}" type="text" placeholder="Site/Location" style="padding:4px 8px;border:1px solid #ddd;border-radius:6px;font-size:0.7rem;background:var(--input-bg);color:var(--text-primary);width:110px;"></div>
                <div style="display:flex;flex-direction:column;gap:3px;"><label style="font-size:0.6rem;font-weight:600;color:#2e7d32;">Bio Gen (MT)</label>
                    <input id="waste-bio-gen-${suffix}" type="number" min="0" step="0.0001" placeholder="0" style="padding:4px 8px;border:1px solid #ddd;border-radius:6px;font-size:0.7rem;background:var(--input-bg);color:var(--text-primary);width:90px;"></div>
                <div style="display:flex;flex-direction:column;gap:3px;"><label style="font-size:0.6rem;font-weight:600;color:#2e7d32;">Bio Disp (MT)</label>
                    <input id="waste-bio-disp-${suffix}" type="number" min="0" step="0.0001" placeholder="0" style="padding:4px 8px;border:1px solid #ddd;border-radius:6px;font-size:0.7rem;background:var(--input-bg);color:var(--text-primary);width:90px;"></div>
                <div style="display:flex;flex-direction:column;gap:3px;"><label style="font-size:0.6rem;font-weight:600;color:#2e7d32;">Bio Div (MT)</label>
                    <input id="waste-bio-div-${suffix}" type="number" min="0" step="0.0001" placeholder="0" style="padding:4px 8px;border:1px solid #ddd;border-radius:6px;font-size:0.7rem;background:var(--input-bg);color:var(--text-primary);width:90px;"></div>
                <div style="display:flex;flex-direction:column;gap:3px;"><label style="font-size:0.6rem;font-weight:600;color:#1565c0;">Non-Bio Gen (MT)</label>
                    <input id="waste-nonbio-gen-${suffix}" type="number" min="0" step="0.0001" placeholder="0" style="padding:4px 8px;border:1px solid #ddd;border-radius:6px;font-size:0.7rem;background:var(--input-bg);color:var(--text-primary);width:90px;"></div>
                <div style="display:flex;flex-direction:column;gap:3px;"><label style="font-size:0.6rem;font-weight:600;color:#1565c0;">Non-Bio Disp (MT)</label>
                    <input id="waste-nonbio-disp-${suffix}" type="number" min="0" step="0.0001" placeholder="0" style="padding:4px 8px;border:1px solid #ddd;border-radius:6px;font-size:0.7rem;background:var(--input-bg);color:var(--text-primary);width:90px;"></div>
                <div style="display:flex;flex-direction:column;gap:3px;"><label style="font-size:0.6rem;font-weight:600;color:#1565c0;">Non-Bio Div (MT)</label>
                    <input id="waste-nonbio-div-${suffix}" type="number" min="0" step="0.0001" placeholder="0" style="padding:4px 8px;border:1px solid #ddd;border-radius:6px;font-size:0.7rem;background:var(--input-bg);color:var(--text-primary);width:90px;"></div>
                <div style="display:flex;flex-direction:column;gap:3px;"><label style="font-size:0.6rem;font-weight:600;color:#e65100;">Rec Gen (MT)</label>
                    <input id="waste-rec-gen-${suffix}" type="number" min="0" step="0.0001" placeholder="0" style="padding:4px 8px;border:1px solid #ddd;border-radius:6px;font-size:0.7rem;background:var(--input-bg);color:var(--text-primary);width:80px;"></div>
                <div style="display:flex;flex-direction:column;gap:3px;"><label style="font-size:0.6rem;font-weight:600;color:#e65100;">Rec Disp (MT)</label>
                    <input id="waste-rec-disp-${suffix}" type="number" min="0" step="0.0001" placeholder="0" style="padding:4px 8px;border:1px solid #ddd;border-radius:6px;font-size:0.7rem;background:var(--input-bg);color:var(--text-primary);width:80px;"></div>
                <div style="display:flex;flex-direction:column;gap:3px;"><label style="font-size:0.6rem;font-weight:600;color:#e65100;">Rec Div (MT)</label>
                    <input id="waste-rec-div-${suffix}" type="number" min="0" step="0.0001" placeholder="0" style="padding:4px 8px;border:1px solid #ddd;border-radius:6px;font-size:0.7rem;background:var(--input-bg);color:var(--text-primary);width:80px;"></div>
                <div style="display:flex;flex-direction:column;gap:3px;"><label style="font-size:0.6rem;font-weight:600;color:#b71c1c;">Haz Gen (MT)</label>
                    <input id="waste-haz-gen-${suffix}" type="number" min="0" step="0.0001" placeholder="0" style="padding:4px 8px;border:1px solid #ddd;border-radius:6px;font-size:0.7rem;background:var(--input-bg);color:var(--text-primary);width:80px;"></div>
                <div style="display:flex;flex-direction:column;gap:3px;"><label style="font-size:0.6rem;font-weight:600;color:#b71c1c;">Haz Disp (MT)</label>
                    <input id="waste-haz-disp-${suffix}" type="number" min="0" step="0.0001" placeholder="0" style="padding:4px 8px;border:1px solid #ddd;border-radius:6px;font-size:0.7rem;background:var(--input-bg);color:var(--text-primary);width:80px;"></div>
                <div style="display:flex;flex-direction:column;gap:3px;"><label style="font-size:0.6rem;font-weight:600;color:#2e7d32;">Septage (m³)</label>
                    <input id="waste-sep-${suffix}" type="number" min="0" step="0.0001" placeholder="0" style="padding:4px 8px;border:1px solid #ddd;border-radius:6px;font-size:0.7rem;background:var(--input-bg);color:var(--text-primary);width:80px;"></div>
                <div style="display:flex;flex-direction:column;gap:3px;"><label style="font-size:0.6rem;font-weight:600;color:var(--text-secondary);">Remarks</label>
                    <input id="waste-rem-${suffix}" type="text" placeholder="Optional" style="padding:4px 8px;border:1px solid #ddd;border-radius:6px;font-size:0.7rem;background:var(--input-bg);color:var(--text-primary);width:110px;"></div>
                <button onclick="wasteAddRow('${regEsc}', ${pi}, '${pnEsc}')" style="padding:5px 14px;background:${colors.bg};color:white;border:none;border-radius:7px;font-size:0.7rem;font-weight:700;cursor:pointer;">${window.icon('plus')} Add Row</button>
            </div>
        </div>`;
    }

    function wasteRenderRegions() {
        const container = document.getElementById('env-waste-regions-container');
        if (!container) return;
        const userEmail   = (typeof state !== 'undefined') ? state.currentUser?.email : null;
        const allProjects = (typeof state !== 'undefined' && state.projects) ? state.projects : [];
        let html = '';

        WASTE_REGIONS.forEach(region => {
            const canEdit    = state.isEditing && UserAccounts.canEdit(userEmail, region) && UserAccounts.canEditTab(userEmail, 'env-monitoring');
            const rk         = region.replace(/[^a-z0-9]/gi,'_');
            const regionRows = wasteData.filter(r => r.region === region);
            const collapsed  = !!wasteCollapsed[region];
            const colors     = REGION_COLORS[region] || { bg:'#2e7d32', light:'#e8f5e9', badge:'#81c784' };
            const projs      = allProjects.filter(p => p.region === region);

            const rWasteTotal = regionRows.reduce((t,r)=>t+(parseFloat(r.bioGen)||0)+(parseFloat(r.nonbioGen)||0)+(parseFloat(r.recGen)||0)+(parseFloat(r.hazGen)||0),0);
            const rSeptage    = regionRows.reduce((t,r)=>t+(parseFloat(r.septage)||0),0);
            html += _tabRegionBanner({ key:'waste', toggle:'wasteToggleRegion', region, rk, rc:colors, icon:'trash', projCount:projs.length, open:!collapsed,
                chips:[ rWasteTotal>0 && { text:`${rWasteTotal.toLocaleString(undefined,{maximumFractionDigits:3})} MT`, kind:'a' }, rSeptage>0 && { text:`${rSeptage.toLocaleString(undefined,{maximumFractionDigits:3})} m\u00b3 Septage`, kind:'b' }, { text:`${regionRows.length} entries`, kind:'b' } ],
                right: canEdit ? `<button onclick="event.stopPropagation();wasteClearRegion('${region}')" style="background:${colors.white?'rgba(0,0,0,0.06)':'rgba(255,255,255,0.15)'};color:${colors.white?'#1b5e20':'white'};border:1px solid ${colors.white?'#a5d6a7':'rgba(255,255,255,0.3)'};border-radius:6px;padding:2px 8px;font-size:0.62rem;cursor:pointer;">${window.icon('trash')} Clear</button>` : '' });

            if (projs.length === 0) {
                html += `<div style="padding:18px;text-align:center;color:var(--text-secondary);font-size:0.75rem;font-style:italic;">${window.icon('folder', '', `style="opacity:0.25;font-size:1.5rem;display:block;margin-bottom:6px;"`)}No projects in this region.</div>`;
            } else {
                const _wIdx = _tabProjIdx('waste', region, projs);

                const proj    = projs[_wIdx];
                const pi      = _wIdx;
                const suffix  = rk + '_' + pi;
                const projRows = wasteData.filter(r => r.region === region && r.project === proj.name);
                const hasData  = projRows.length > 0;

                html += `<div style="${_tabProjCardStyle()}">
                    ${_tabProjHeader({ tabType:'waste', region, projs, idx:_wIdx, proj, color:colors.bg })}
                    <div style="padding:10px;">
                        ${wasteAddFormHTML(region, pi, proj.name, rk, suffix, colors, canEdit)}
                        ${wasteProjectTableHTML(projRows, colors, canEdit)}
                    </div>
                </div>`;
            }

            html += `</div>`;
        });

        container.innerHTML = html;
    }
    window.wasteRenderRegions = wasteRenderRegions;

})();
