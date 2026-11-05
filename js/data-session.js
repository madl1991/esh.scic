
const PersonnelDB = {

    getPersonId(person) {
        if (person._pid) return person._pid;
        if (person.id && person.id.trim()) {
            return 'emp_' + person.id.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
        }
        const base = (person.name || 'unknown').replace(/[^a-zA-Z0-9]/g, '').substring(0, 10);
        return 'p_' + base + '_' + Date.now().toString(36);
    },

    getCollectionRef() {
        const ADMIN_UID = 'fUnXsvKnRYMpuySRbeVYJk7TO452';
        return window.firebase.collection(window.firebaseDb, 'users', ADMIN_UID, 'personnel');
    },

    sanitizePerson(person) {
        return {
            _pid:     person._pid     || '',
            name:     person.name     || '',
            pos:      person.pos      || '',
            id:       person.id       || '',
            hired:    person.hired    || '',
            current:  person.current  || '',
            area:     person.area     || '',
            age:      person.age      || '',
            gen:      person.gen      || '',
            mail:     person.mail     || '',
            num:      person.num      || '',
            addr:     person.addr     || '',
            len:      person.len      || '',
            oic:      person.oic      || false,
            oshp:     person.oshp     || false,
            toUpdate: Array.isArray(person.toUpdate) && person.toUpdate.length > 0 ? person.toUpdate : null,
            _updatedBy: state.currentUser?.email || '',
            _updatedAt: new Date().toISOString()
        };
    },

    async savePerson(person) {
        if (!window.firebaseDb || !window.firebase) return false;
        try {
            if (!person._pid) person._pid = this.getPersonId(person);
            const ref = window.firebase.doc(this.getCollectionRef(), person._pid);
            await window.firebase.setDoc(ref, this.sanitizePerson(person));
            return true;
        } catch(e) {
            console.error('❌ PersonnelDB.savePerson failed:', e.message);
            return false;
        }
    },

    async deletePerson(pid) {
        if (!window.firebaseDb || !window.firebase || !pid) return false;
        try {
            const ref = window.firebase.doc(this.getCollectionRef(), pid);
            await window.firebase.deleteDoc(ref);
            return true;
        } catch(e) {
            console.error('❌ PersonnelDB.deletePerson failed:', e.message);
            return false;
        }
    },

    async loadAll() {
        if (!window.firebaseDb || !window.firebase) return null;
        try {
            const snap = await window.firebase.getDocs(this.getCollectionRef());
            if (snap.empty) return null;
            const people = [];
            snap.forEach(docSnap => {
                const data = docSnap.data();
                if (data.name) people.push({ ...data, _pid: docSnap.id });
            });
            return people;
        } catch(e) {
            console.error('❌ PersonnelDB.loadAll failed:', e.message);
            return null;
        }
    },

    _migrationDone: false,

    async migrateAll() {
        if (this._migrationDone) return; // ✅ FIX: prevent repeated migration on every save
        if (!state.personnelData || state.personnelData.length === 0) return;
        const needsMigration = state.personnelData.some(p => !p._pid);
        if (!needsMigration) {
            this._migrationDone = true;
            return;
        }
        this._migrationDone = true; // set before await to prevent concurrent calls
        const promises = state.personnelData.map(person => {
            if (!person._pid) person._pid = this.getPersonId(person);
            return this.savePerson(person);
        });
        await Promise.all(promises);
    }
};
window.PersonnelDB = PersonnelDB;

const ProjectsDB = {

    ADMIN_UID: 'fUnXsvKnRYMpuySRbeVYJk7TO452',

    getProjectId(projectName) {
        return projectName.trim().replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 200);
    },

    getCollectionRef(year) {
        return window.firebase.collection(
            window.firebaseDb,
            'users', this.ADMIN_UID,
            'years', year.toString(),
            'projects'
        );
    },

    getDocRef(year, projectName) {
        return window.firebase.doc(
            window.firebaseDb,
            'users', this.ADMIN_UID,
            'years', year.toString(),
            'projects', this.getProjectId(projectName)
        );
    },

    sanitizeProject(project) {
        function clean(obj) {
            if (Array.isArray(obj)) {
                const dense = Array.from({ length: obj.length }, (_, i) =>
                    obj[i] === undefined ? null : clean(obj[i])
                );
                return dense;
            }
            if (obj !== null && typeof obj === 'object') {
                const out = {};
                for (const [k, v] of Object.entries(obj)) {
                    out[k] = (v === undefined) ? null : clean(v);
                }
                return out;
            }
            return (obj === undefined) ? null : obj;
        }
        const sanitized = clean(project);
        sanitized._updatedBy = state.currentUser?.email || '';
        sanitized._updatedAt = new Date().toISOString();
        return sanitized;
    },

    _ENV_VALS_PREFIXES: ['permits', 'emb', 'env-monitoring', 'env-monthly-report', 'nov-env', 'ecc', 'pcab', 'zoning'], // doe + doe-permit REMOVED (Superintendent only)
    _HEALTH_VALS_PREFIXES: ['health-report'],

    _isEnvValsKey(k)    { return this._ENV_VALS_PREFIXES.some(p => k === p || k.startsWith(p + '-') || k.startsWith(p + '_')); },
    _isHealthValsKey(k) { return this._HEALTH_VALS_PREFIXES.some(p => k === p || k.startsWith(p + '-') || k.startsWith(p + '_')); },

    _buildScopedPayload(project, userRole) {
        const sanitized = this.sanitizeProject(project);
        const payload = {
            _updatedBy: sanitized._updatedBy,
            _updatedAt: sanitized._updatedAt
        };

        if (userRole === 'admin') {
            // Admin owns all fields on CORPORATE projects — atomic field-level write,
            // no pre-read needed since no other role writes CORPORATE env/health data.
            const ADMIN_TOP_FIELDS = ['name','region','status','dateStarted','dateFinished','isRenewable',
                                      'auditData','doePdfFiles','workStoppageDate','workResumeDate'];
            ADMIN_TOP_FIELDS.forEach(f => { if (f in sanitized) payload[f] = sanitized[f]; });
            if (sanitized.vals) {
                Object.keys(sanitized.vals).forEach(k => {
                    payload[`vals.${k}`] = sanitized.vals[k];
                });
            }
        } else if (userRole === 'superintendent') {
            const SUPER_TOP_FIELDS = ['name','region','status','dateStarted','dateFinished','isRenewable',
                                      'auditData','doePdfFiles','workStoppageDate','workResumeDate'];
            SUPER_TOP_FIELDS.forEach(f => { if (f in sanitized) payload[f] = sanitized[f]; });
            if (sanitized.vals) {
                Object.keys(sanitized.vals).forEach(k => {
                    // Superintendent owns safety + health fields; NOT env fields (those belong to PCO)
                    if (!this._isEnvValsKey(k)) {
                        payload[`vals.${k}`] = sanitized.vals[k];
                    }
                });
            }
        } else if (userRole === 'pco' || userRole === 'envi_head') {
            if (sanitized.vals) {
                Object.keys(sanitized.vals).forEach(k => {
                    if (this._isEnvValsKey(k)) payload[`vals.${k}`] = sanitized.vals[k];
                });
            }
        } else if (userRole === 'corp_nurse') {
            // corp_nurse is now view-only — no writes
            return null;
        }
        return payload;
    },

    async saveProject(year, project) {
        if (!window.firebaseDb || !window.firebase) return false;
        if (window._projectsRefreshing) {
            // Screen is still showing older cached data; saving now could overwrite newer values.
            if (typeof showToast === 'function') showToast('Loading the latest data. Please save again in a moment.', 'info', 2500);
            return false;
        }
        try {
            const ref = this.getDocRef(year, project.name);
            const sanitized = this.sanitizeProject(project);

            // ── Save the full sanitized project as a single nested document ──────
            // We do NOT use dotted-path keys (e.g. "vals.some key with spaces/dots")
            // because Firestore rejects paths containing '.', '/', '[', ']', '*', '~'.
            // Instead, we write the entire project object with setDoc+merge=true.
            // Firestore Security Rules handle what each role may or may not write —
            // the app does not pre-filter fields; that is the rules' responsibility.
            await window.firebase.setDoc(ref, sanitized, { merge: true });
            return true;
        } catch(e) {
            if (e?.code === 'permission-denied' || e?.code === 'PERMISSION_DENIED') {
                console.error(`🔒 ProjectsDB: PERMISSION DENIED for "${project.name}" — check Firestore rules. Region: ${project.region}`);
                if (typeof showToast === 'function') showToast(`Permission denied saving "${project.name}". Contact admin.`, 'error', 5000);
                return false;
            }
            console.error(`❌ ProjectsDB.saveProject failed for "${project.name}" (${year}):`, e.message);
            return false;
        }
    },

    async saveProjects(year, projects) {
        if (!window.firebaseDb || !window.firebase || !projects.length) return true;
        const results = await Promise.all(projects.map(p => this.saveProject(year, p)));
        const failed = results.filter(r => !r).length;
        if (failed) console.warn(`⚠️ ProjectsDB: ${failed}/${projects.length} project saves failed for year ${year}`);
        return failed === 0;
    },

    async deleteProject(year, projectName) {
        if (!window.firebaseDb || !window.firebase) return false;
        try {
            const ref = this.getDocRef(year, projectName);
            await window.firebase.deleteDoc(ref);
            return true;
        } catch(e) {
            console.error(`❌ ProjectsDB.deleteProject failed:`, e.message);
            return false;
        }
    },

    // Rename a project across ALL storage layers:
    //   1. Firestore: write newName doc from old doc data, then delete old doc
    //   2. ESH Calendar RTDB: re-key all entries from oldName → newName
    //   3. In-memory caches: yearProjectCache, masterProjects
    // This is the ONLY correct way to rename — never just save newName and hope oldName disappears.
    async renameProject(year, oldName, updatedProject, oldRegion) {
        if (!window.firebaseDb || !window.firebase) return false;
        const oldId = this.getProjectId(oldName);
        const newId = this.getProjectId(updatedProject.name);
        try {
            if (oldId === newId) {
                // Same slug (e.g. case-only change) — just update in place, no delete needed
                await this.saveProject(year, updatedProject);
            } else {
                // Different slug — write to new doc ID, then delete old doc
                const newRef = this.getDocRef(year, updatedProject.name);
                const sanitized = this.sanitizeProject(updatedProject);
                await window.firebase.setDoc(newRef, sanitized, { merge: false });
                await this.deleteProject(year, oldName);
            }

            // Re-key ESH Calendar RTDB entries: oldName → newName
            await _eshRtdbRenameProject(oldName, updatedProject.name, year);

            // Copy Yjs rows (KPM, DOLE, audit, etc.) from old project name to new one
            try {
                if (window.ESHDataSync && typeof window.ESHDataSync.renameProjectRows === 'function') {
                    await window.ESHDataSync.renameProjectRows(oldName, updatedProject.name, oldRegion || updatedProject.region, updatedProject.region);
                }
            } catch (e) {
            }

            return true;
        } catch(e) {
            console.error(`❌ ProjectsDB.renameProject failed (${oldName} → ${updatedProject.name}):`, e.message);
            return false;
        }
    },

    async loadYear(year) {
        if (!window.firebaseDb || !window.firebase) return null;
        try {
            const snap = await window.firebase.getDocs(this.getCollectionRef(year));
            if (snap.empty) return null;
            const projects = [];
            snap.forEach(docSnap => {
                const data = docSnap.data();
                if (data.name) projects.push(data);
            });
            return projects;
        } catch(e) {
            console.error(`❌ ProjectsDB.loadYear(${year}) failed:`, e.message);
            return null;
        }
    },

    async loadYears(years) {
        const entries = await Promise.all(
            years.map(async y => [y, await this.loadYear(y)])
        );
        return new Map(entries);
    },

    async migrateAll() {
        if (!state.masterProjects || state.masterProjects.length === 0) return;
        const projectsByYear = _buildProjectsByYear(state.masterProjects);
        const allPromises = [];
        projectsByYear.forEach((projects, year) => {
            projects.forEach(p => allPromises.push(this.saveProject(year, p)));
        });
        await Promise.all(allPromises);
    }
};
window.ProjectsDB = ProjectsDB;

function _buildProjectsByYear(masterProjects) {
    const projectsByYear = new Map();
    (masterProjects || []).forEach(project => {
        const startYear = project.dateStarted ? parseInt(project.dateStarted.split('-')[0]) : null;
        const finishedYear = project.dateFinished ? parseInt(project.dateFinished.split('-')[0]) : null;

        if (project.region === 'CORPORATE' && !startYear) {
            for (let year = YEAR_RANGE.min; year <= YEAR_RANGE.max; year++) {
                if (!projectsByYear.has(year)) projectsByYear.set(year, []);
                projectsByYear.get(year).push(project);
            }
            return;
        }

        if (startYear) {
            const endYear = finishedYear || YEAR_RANGE.max;
            for (let year = Math.max(startYear, YEAR_RANGE.min); year <= Math.min(endYear, YEAR_RANGE.max); year++) {
                if (!projectsByYear.has(year)) projectsByYear.set(year, []);
                projectsByYear.get(year).push(project);
            }
        }
    });
    return projectsByYear;
}

// Use window._isSaving (not a local let) so all code — including PDF upload retries,
// OSH save loops, and the onSnapshot listener — all read/write the same flag.
window._isSaving = window._isSaving || false;
let _saveDebounceTimer = null;
window._isSavingEcho = false;

let _globalAutoSaveTimer = null;
function saveToFirebaseDebounced() {
    if (typeof markPendingSync === 'function') markPendingSync();
    if (window._appInitializing) return;
    if (!window.RowSaveManager?.hasDirty()) return;
    clearTimeout(_globalAutoSaveTimer);
    _globalAutoSaveTimer = setTimeout(() => {
        _globalAutoSaveTimer = null;
        if (window.RowSaveManager?.hasDirty()) {
            window.RowSaveManager.saveAllDirty().catch(() => {});
        }
    }, 800);
}
window.saveToFirebaseDebounced = saveToFirebaseDebounced;

// ══════════════════════════════════════════════════════════════════════
// EXECUTIVE SUMMARY LIVE SYNC
// Writes a light, aggregated, non-sensitive-free-of-raw-tables snapshot per
// region to exec_summary/{regionSlug} so the standalone executive-summary.html
// page (CEO passcode-gated view) can render a live company-wide summary
// without ever needing access to the main dashboard or raw project data.
// This is additive-only and non-blocking — failures here never affect the
// main saveToFirebase() flow.
// ══════════════════════════════════════════════════════════════════════
function _execRegionSlug(region) {
    return String(region || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-+|-+$)/g, '');
}

// Aggregates Fatality / LTA / First Aid / Medical Treatment / High-Potential /
// Dangerous Occurrences into Previous, Total (YTD), and Accumulated (Previous+Total)
// for the Executive Summary "Incident / Accident Summary" panel. Mirrors the same
// source fields as the main dashboard's Incident/Accident Tabulation (FM-ESH-01-42),
// but intentionally omits the OSH/ENVI Regulatory Issued NOV rows and the monthly
// breakdown, since NOV is already shown in its own panel on that page.
function computeIncidentSummaryAggregate(projects) {
    const cats = [
        { field: 'medical_Fatality',                label: 'Fatality' },
        { field: 'medical_LTA',                     label: 'LTA' },
        { field: 'medical_First Aid',                label: 'First Aid' },
        { field: 'medical_Medical Treatment',        label: 'Medical Treatment' },
        { field: 'medical_High-Potential incident',  label: 'High-Potential Incident' },
        { field: 'medical_Dangerous Occurrences',    label: 'Dangerous Occurrences' },
    ];
    const rows = cats.map(c => {
        let prev = 0, total = 0;
        (projects || []).forEach(p => {
            if (!p.vals) return;
            prev += parseFloat(p.vals[c.field]?.[0]) || 0;
            for (let i = 1; i <= 12; i++) {
                total += parseFloat(p.vals[c.field]?.[i]) || 0;
            }
        });
        prev = Math.round(prev);
        total = Math.round(total);
        return { label: c.label, previous: prev, total: total, accumulated: prev + total };
    });
    const totals = rows.reduce((acc, r) => {
        acc.previous += r.previous; acc.total += r.total; acc.accumulated += r.accumulated;
        return acc;
    }, { label: 'Total', previous: 0, total: 0, accumulated: 0 });
    return { rows, totals };
}

async function syncExecutiveSummary() {
    const result = { ok: true, regionsSynced: 0, regionsFailed: [], reason: '' };
    try {
        if (!window.firebaseDb || !window.firebase) {
            result.ok = false;
            result.reason = 'Firebase not initialized';
            return result;
        }
        const year = state.selectedYear || new Date().getFullYear();
        const curMonth = (new Date().getFullYear() === year) ? new Date().getMonth() + 1 : 12;
        const rateBase  = (state.ratesStandard === 'osha') ? 200000 : 1000000;
        const rateLabel = (state.ratesStandard === 'osha') ? 'OSHA (200K hrs)' : 'OSHS (1M hrs)';

        // Group this session's projects by field region (skip Corporate / Plant Ops —
        // those aren't field regions and shouldn't appear in the exec regional table).
        const byRegion = {};
        (state.projects || []).forEach(p => {
            if (!p || !p.region) return;
            if (p.region === 'CORPORATE' || p.region === 'PLANT OPERATIONS') return;
            if ((typeof isProjectOnStoppage === 'function' && isProjectOnStoppage(p)) || p.dateFinished) return;
            (byRegion[p.region] = byRegion[p.region] || []).push(p);
        });

        const writes = [];
        Object.keys(byRegion).forEach(region => {
            const projs = byRegion[region];
            let lta = 0, med = 0, fa = 0, fat = 0, hip = 0, dl = 0, mh = 0, nearMiss = 0;
            const recentIncidents = [];
            // Monthly breakdown (index 0 = Jan ... 11 = Dec) so the Executive
            // Summary page can render real bar/line charts instead of just totals.
            const monthly = {
                lta: Array(12).fill(0), med: Array(12).fill(0), fa: Array(12).fill(0),
                fat: Array(12).fill(0), hip: Array(12).fill(0), manhours: Array(12).fill(0),
                nearMiss: Array(12).fill(0)
            };

            projs.forEach(p => {
                for (let i = 1; i <= curMonth; i++) {
                    const vLta = parseFloat(p.vals['medical_LTA']?.[i]) || 0;
                    const vMed = parseFloat(p.vals['medical_Medical Treatment']?.[i]) || 0;
                    const vFa  = parseFloat(p.vals['medical_First Aid']?.[i]) || 0;
                    const vFat = parseFloat(p.vals['medical_Fatality']?.[i]) || 0;
                    const vHip = parseFloat(p.vals['medical_High-Potential incident']?.[i]) || 0;
                    const vDl  = parseFloat(p.vals['medical_Days Lost/Charged']?.[i]) || 0;
                    const vMh  = parseFloat(p.vals['exposures_Total Exposed Manhour']?.[i]) || 0;
                    lta += vLta; med += vMed; fa += vFa; fat += vFat; hip += vHip; dl += vDl; mh += vMh;
                    monthly.lta[i-1] += vLta; monthly.med[i-1] += vMed; monthly.fa[i-1] += vFa;
                    monthly.fat[i-1] += vFat; monthly.hip[i-1] += vHip; monthly.manhours[i-1] += vMh;
                }
                const nmRow = p.vals['medical_No. of Identified Near-Miss'];
                if (nmRow) {
                    for (let i = 1; i <= curMonth; i++) {
                        const vNm = parseFloat(nmRow[i]) || 0;
                        nearMiss += vNm;
                        monthly.nearMiss[i-1] += vNm;
                    }
                }

                const entries = p.vals['lta-registry_entries'] || [];
                entries.forEach(e => {
                    if (!e) return;
                    const d = e.dateOfAccident || e.dateReported || '';
                    if (!d) return;
                    const _ps = (typeof window.ltaEntryPersons === 'function') ? window.ltaEntryPersons(e) : [e];
                    const _multi = _ps.length > 1;
                    const _s = v => Array.isArray(v) ? v.join(', ') : (v || '');
                    recentIncidents.push({
                        project: p.name,
                        date: d,
                        classification: _multi ? window.ltaEntryClassLabel(e) : (e.incidentClassification || ''),
                        injuredPersonName: _multi ? _ps.map(pp => pp.injuredPersonName || '').filter(Boolean).join('; ') : (e.injuredPersonName || ''),
                        natureOfInjury: _multi ? _ps.map(pp => _s(pp.natureOfInjury)).filter(Boolean).join(' | ') : (e.natureOfInjury || ''),
                        natureOfIncident: (e.natureOfIncident === 'Others' && e.natureOfIncidentOther) ? ('Others: ' + e.natureOfIncidentOther) : (e.natureOfIncident || ''),
                        location: e.locationOfIncident || '',
                        detailsFacts: e.detailsFacts || '',
                        status: e.status || '',
                        aiirNo: e.aiirNo || ''
                    });
                });
            });

            recentIncidents.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
            const topIncidents = recentIncidents.slice(0, 10);

            const ltir = mh > 0 ? +window.formatRate('LTIR', (lta * rateBase) / mh) : 0;
            const trir = mh > 0 ? +window.formatRate('TRIR', ((lta + med + fat) * rateBase) / mh) : 0;
            const sevR = mh > 0 ? +window.formatRate('SEVERITY RATE', (dl * rateBase) / mh) : 0;

            const docData = {
                region: region,
                year: year,
                updatedAt: new Date().toISOString(),
                updatedBy: state.currentUser?.email || '',
                rates: { ltir: ltir, trir: trir, severityRate: sevR, base: rateBase, standard: rateLabel },
                totals: {
                    lta: lta, medicalTreatment: med, firstAid: fa, fatality: fat,
                    hip: hip, daysLost: dl, manhours: mh, nearMiss: nearMiss
                },
                monthly: monthly,
                projectCount: projs.length,
                recentIncidents: topIncidents
            };

            const ref = window.firebase.doc(window.firebaseDb, 'exec_summary', _execRegionSlug(region));
            writes.push(
                window.firebase.setDoc(ref, docData, { merge: false })
                    .then(() => { result.regionsSynced++; })
                    .catch(e => {
                        result.ok = false;
                        result.regionsFailed.push(region);
                    })
            );
        });

        if (writes.length === 0) {
            result.ok = false;
            result.reason = 'No eligible regions found (check region/stoppage/dateFinished filters)';
        }

        // ── COMPANY-WIDE doc for the Executive ESH Summary page ────────────
        // Mirrors exactly what the main dashboard's "Statistics Rate" (Incident
        // Tabulation Rate) and "OSH/ENVI Regulatory Issued NOV" pages show —
        // same source functions/keys, same project scope (all projects except
        // PLANT OPERATIONS) — so the numbers always match 1:1.
        try {
            const tab = (typeof computeAggregateTabulation === 'function') ? computeAggregateTabulation() : null;

            // ── OVERALL COMPLIANCE (company-wide, same pool/formula as the main
            // dashboard's "OVERALL COMPLIANCE" stat-card — see renderComplianceCardOnly) ──
            const _ecCompPool = (state.projects || []).filter(p =>
                p.region !== 'CORPORATE' && p.region !== 'PLANT OPERATIONS' &&
                !(typeof isProjectOnStoppage === 'function' && isProjectOnStoppage(p)) && !p.dateFinished
            );
            let _ecTotal = 0, _ecCount = 0;
            _ecCompPool.forEach(p => {
                const v = (typeof getPerc === 'function') ? getPerc(p) : null;
                if (v !== null) { _ecTotal += v; _ecCount++; }
            });
            const _ecOverallAvg = getCompanyOverallCompliance();

            const novScopedProjects = (state.projects || []).filter(p => p && p.region !== 'PLANT OPERATIONS');

            function _sumNov(prefix) {
                let total = 0, intC = 0, extC = 0, open = 0, closed = 0, viol = 0, violOpen = 0, violClosed = 0;
                novScopedProjects.forEach(p => {
                    const intNovs = p.vals?.[prefix + '_internal_novs'] || [];
                    const extNovs = p.vals?.[prefix + '_external_novs'] || [];
                    intC += intNovs.length; extC += extNovs.length;
                    [...intNovs, ...extNovs].forEach(n => {
                        const vs = n.violations || [];
                        viol += vs.length;
                        if (vs.length === 0) {
                            open++;
                        } else {
                            vs.forEach(v => {
                                if ((v.status || 'Open') === 'Closed') { closed++; violClosed++; }
                                else { open++; violOpen++; }
                            });
                        }
                    });
                });
                total = intC + extC;
                return { total, int: intC, ext: extC, open, closed, totalViolations: viol, violOpen, violClosed };
            }

            const companyDocData = {
                updatedAt: new Date().toISOString(),
                updatedBy: state.currentUser?.email || '',
                projectCount: novScopedProjects.length,
                tabulation: tab ? {
                    ltaCases: tab.ltaCases, recordableCases: tab.recordableCases, lostDays: tab.lostDays,
                    fatalCases: tab.fatalCases,
                    totalManHours: tab.totalHours, totalManHoursToDate: tab.totalHoursToDate,
                    ltirOsha: tab.ltirOsha, ltirOshs: tab.ltirOshs,
                    trirOsha: tab.trirOsha, trirOshs: tab.trirOshs,
                    srOsha: tab.srOsha, srOshs: tab.srOshs
                } : null,
                oshNov: _sumNov('osh-nov'),
                enviNov: _sumNov('nov-env'),
                incidentSummary: computeIncidentSummaryAggregate(novScopedProjects),
                overallCompliance: {
                    pct: _ecOverallAvg,
                    projectsScored: _ecCount,
                    projectsTotal: _ecCompPool.length
                }
            };

            const companyRef = window.firebase.doc(window.firebaseDb, 'exec_summary', '_company_wide');
            await window.firebase.setDoc(companyRef, companyDocData, { merge: false });
            result.regionsSynced++; // count the company-wide write too so the toast reflects it
        } catch (e) {
            result.ok = false;
            result.regionsFailed.push('_company_wide');
        }

        await Promise.all(writes);
    } catch (e) {
        result.ok = false;
        result.reason = e.message;
    }
    return result;
}
window.syncExecutiveSummary = syncExecutiveSummary;

// Manual "Force Resync" — lets an ESH user push the latest data to the
// Executive Dashboard on demand instead of waiting on/hoping the last
// auto-save's fire-and-forget sync actually went through.
async function forceResyncExecutiveSummary(btnEl) {
    if (btnEl) { btnEl.disabled = true; btnEl.style.opacity = '0.6'; }
    if (typeof showToast === 'function') showToast('Syncing latest data to Executive Dashboard…', 'info', 2000);
    try {
        const result = await syncExecutiveSummary();
        if (typeof showToast === 'function') {
            if (result.ok && result.regionsSynced > 0) {
                showToast(`Executive Dashboard synced — ${result.regionsSynced} region(s) updated.`, 'success');
            } else if (result.ok && result.regionsSynced === 0) {
                showToast('Nothing to sync — no active regions found.', 'warning');
            } else {
                showToast(`Resync failed${result.regionsFailed?.length ? ' for: ' + result.regionsFailed.join(', ') : ''}. ${result.reason || ''}`, 'error', 5000);
            }
        }
    } catch (e) {
        console.error('forceResyncExecutiveSummary error:', e);
        if (typeof showToast === 'function') showToast('Resync failed: ' + e.message, 'error', 5000);
    } finally {
        if (btnEl) { btnEl.disabled = false; btnEl.style.opacity = '1'; }
    }
}
window.forceResyncExecutiveSummary = forceResyncExecutiveSummary;

async function saveToFirebase() {
    if (!firebaseReady || !window.firebaseDb) {
        return false;
    }

    const _earlyUserInfo = UserAccounts.getUserInfo(state.currentUser?.email);
    if (_earlyUserInfo.role === 'manager') {
        return false; // view-only role — silent skip
    }
    if (_earlyUserInfo.role === 'guest') {
        // 'guest' here means the Firestore role wasn't loaded yet OR the account is unknown.
        // With the RBAC fix in onAuthStateChanged this should not happen for valid accounts.
        return false;
    }

    if (window._isSaving) {
        clearTimeout(window._saveRetryTimer);
        window._saveRetryTimer = setTimeout(() => {
            if (!window._isSaving) saveToFirebase().catch(() => {});
        }, 1500);
        return false;
    }
    if (window._appInitializing) {
        return false;
    }
    window._isSaving = true;

    const currentEmail = state.currentUser?.email;
    const userInfo = UserAccounts.getUserInfo(currentEmail);

    if (userInfo.role !== 'admin' && state.currentTab) {
        const tabCheck = UserAccounts.checkPermission(currentEmail, 'edit', userInfo.region, state.currentTab);
        if (!tabCheck.allowed) {
        }
    }

    try {
        const dataUserId = getDataSourceUserId(); // Save to admin's UID (shared location)
        const currentUserId = getCurrentUserId(); // Current user's UID for preferences
        const currentYear = state.selectedYear || 2026;
        
        if (!state.yearProjectCache) state.yearProjectCache = new Map();
        if (state.projects && state.projects.length > 0) {
            const existingCache = state.yearProjectCache.get(currentYear) || [];
            const cacheMap = new Map(existingCache.map(p => [p.name, p]));
            state.projects.forEach(project => {
                cacheMap.set(project.name, project); // apply latest edits
            });
            state.yearProjectCache.set(currentYear, Array.from(cacheMap.values()));

            state.projects.forEach(project => {
                const index = state.masterProjects.findIndex(p => p.name === project.name);
                if (index >= 0) {
                    // Merge instead of replace — preserves fields owned by other roles
                    // that may have been loaded from Firestore but not present in this session's edits.
                    state.masterProjects[index] = { ...state.masterProjects[index], ...project };
                } else {
                    state.masterProjects.push(project);
                }
            });
        } else if (state.masterProjects.length === 0) {
        }

        const _allCurrentYearProjects = state.yearProjectCache.get(currentYear) || [];

        // Pass all projects to ProjectsDB.saveProjects — Firestore Security Rules
        // will enforce write permissions per project. No app-level region filtering.
        const currentYearProjects = (() => {
            if (!userInfo || userInfo.role === 'guest' || userInfo.role === 'manager' || userInfo.role === 'doc_controller' || userInfo.role === 'corp_nurse') return [];
            return _allCurrentYearProjects;
        })();

        function buildYearPayload(year) {
            function sanitize(obj) {
                if (Array.isArray(obj)) {
                    return Array.from({ length: obj.length }, (_, i) =>
                        obj[i] === undefined ? null : sanitize(obj[i])
                    );
                }
                if (obj !== null && typeof obj === 'object') {
                    const clean = {};
                    for (const [k, v] of Object.entries(obj)) {
                        clean[k] = (v === undefined) ? null : sanitize(v);
                    }
                    return clean;
                }
                return (obj === undefined) ? null : obj;
            }

            const payload = {
                year: year,
                email: state.currentUser?.email || 'local-user',
                displayName: state.currentUser?.displayName || localStorage.getItem('esh_displayname_' + state.currentUser?.email) || '',
                lastUpdated: new Date().toISOString(),
                timestamp: Date.now(),
                _projectsInSubcollection: true  // migration marker: projects moved to subcollection
            };
            return sanitize(payload);
        }

        const currentYearRef = window.firebase.doc(window.firebaseDb, 'users', dataUserId, 'years', currentYear.toString());
        
        const saveWithTimeout = (promise, ms = 15000) =>
            Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error('Save timeout')), ms))]);


        try {
            const cu = window.firebaseAuth?.currentUser;
            if (cu) await cu.getIdToken(true);
        } catch(e) {  }

        // Save year metadata first (single fast write), then projects separately.
        // Separating these prevents a bulk project-create timeout from also losing
        // the year metadata write, and allows more time for first-run bulk creates.
        await saveWithTimeout(
            window.firebase.setDoc(currentYearRef, buildYearPayload(currentYear), { merge: true }),
            10000
        );
        await saveWithTimeout(
            ProjectsDB.saveProjects(currentYear, currentYearProjects),
            45000  // 45s — accommodates ~30 simultaneous creates on first save per region
        );

        await PersonnelDB.migrateAll();

        const userDocRef = window.firebase.doc(window.firebaseDb, 'users', currentUserId);
        window.firebase.setDoc(userDocRef, {
            email: state.currentUser?.email,
            displayName: state.currentUser?.displayName || '',
            darkMode: state.darkMode || false,
            lastActiveYear: currentYear,
            isDataMigrated: true
        }, { merge: true }).catch(e => console.warn('Preferences save failed:', e));

        state.lastSyncTimestamp = Date.now();

        // Live-sync aggregated KPIs to the Executive Summary page (fire-and-forget,
        // never blocks or fails the main save).
        syncExecutiveSummary();

        return true;
        
    } catch (error) {
        console.error('❌ Error saving to Firebase:', error);
        showToast('Failed to save: ' + error.message, 'error');
        return false;
    } finally {
        window._isSavingEcho = true;
        window._lastLocalSaveTime = new Date().toISOString();
        setTimeout(() => { window._isSaving = false; window._isSavingEcho = false; }, 2000);
    }
}

function ensureCorporateProject() {
    const defaultCorpProject = {
        name: 'Corporate',
        region: 'CORPORATE',
        status: 'on-going',
        dateStarted: '',
        dateFinished: '',
        isRenewable: false,
        vals: {},
        auditData: { Q1:{scoreImpl:0,docuComp:0}, Q2:{scoreImpl:0,docuComp:0}, Q3:{scoreImpl:0,docuComp:0}, Q4:{scoreImpl:0,docuComp:0} },
        doePdfFiles: {}
    };
    const masterExists = state.masterProjects.some(p => p.name === 'Corporate' && p.region === 'CORPORATE');
    if (!masterExists) {
        state.masterProjects.unshift({ ...defaultCorpProject });
    }
    const exists = state.projects.some(p => p.name === 'Corporate' && p.region === 'CORPORATE');
    if (!exists) {
        const masterCorp = state.masterProjects.find(p => p.name === 'Corporate' && p.region === 'CORPORATE');
        state.projects.unshift({ ...(masterCorp || defaultCorpProject) });
    }
    state.filteredProjects = [...state.projects];
}

function ensurePlantProjects() {
    const PLANT_PROJECTS = [
        {
            name: 'Pililla Batching Plant and Yard',
            location: 'Pililla, Rizal'
        },
        {
            name: 'Sta. Clara Railways Pre-Cast Manufacturing Plant',
            location: 'Pulilan, Bulacan'
        }
    ];
    PLANT_PROJECTS.forEach(plant => {
        const defaultPlant = {
            name: plant.name,
            region: 'PLANT OPERATIONS',
            status: 'on-going',
            dateStarted: '',
            dateFinished: '',
            isRenewable: false,
            vals: {},
            auditData: { Q1:{scoreImpl:0,docuComp:0}, Q2:{scoreImpl:0,docuComp:0}, Q3:{scoreImpl:0,docuComp:0}, Q4:{scoreImpl:0,docuComp:0} },
            doePdfFiles: {},
            location: plant.location,
            isPlant: true  // flag: excluded from compliance, monitoring only
        };
        const masterExists = state.masterProjects.some(p => p.name === plant.name && p.region === 'PLANT OPERATIONS');
        if (!masterExists) {
            state.masterProjects.push({ ...defaultPlant });
        }
        const exists = state.projects.some(p => p.name === plant.name && p.region === 'PLANT OPERATIONS');
        if (!exists) {
            const masterPlant = state.masterProjects.find(p => p.name === plant.name && p.region === 'PLANT OPERATIONS');
            state.projects.push({ ...(masterPlant || defaultPlant) });
        }
    });
    state.filteredProjects = [...state.projects];
}

async function loadAllProjectsAndFilter() {
    if (!firebaseReady || !window.firebaseDb) {
        return;
    }

    try {
        const dataUserId = getDataSourceUserId();
        const selectedYear = state.selectedYear;
        const CACHE_KEY = `esh_projects_cache_${dataUserId}`;
        const CACHE_TS_KEY = `esh_projects_cache_ts_${dataUserId}`;
         // 60 seconds cache

        const cached = localStorage.getItem(CACHE_KEY);
        const cachedTs = parseInt(localStorage.getItem(CACHE_TS_KEY) || '0');
        const cacheAge = Date.now() - cachedTs;

        // ── CACHE FRESHNESS GUARD ──────────────────────────────────────────────
        // Non-admin accounts save directly to Firestore per-project docs.
        // The localStorage cache may be stale for admin if a non-admin saved
        // while admin was offline. Force a Firestore fetch if cache is >30s old.
        const _cacheMaxAge = (state.userRole === 'admin') ? 30 * 1000 : 60 * 1000;
        const _cacheIsStale = (Date.now() - (parseInt(localStorage.getItem(CACHE_TS_KEY) || '0'))) > _cacheMaxAge;
        // Stale cache is NOT deleted: it is shown immediately, then replaced by the fresh Firestore fetch below.
        // ──────────────────────────────────────────────────────────────────────

        if (cached) {
            try {
                const cachedData = JSON.parse(cached);
                state.masterProjects = cachedData.masterProjects || [];
                state.personnelData = cachedData.personnelData || [];
                state.incidentRateData = cachedData.incidentRateData || { recordableCases: 0, lostDays: 0, totalHours: 0 };
                state.oshData = cachedData.oshData || {};
                state.projects = filterProjectsByYear(state.masterProjects, selectedYear);
                state.filteredProjects = [...state.projects];

                if (!state.yearProjectCache) state.yearProjectCache = new Map();
                if (cachedData.yearProjectCache && typeof cachedData.yearProjectCache === 'object') {
                    Object.entries(cachedData.yearProjectCache).forEach(([yr, projects]) => {
                        state.yearProjectCache.set(parseInt(yr), (projects || []).map(p => JSON.parse(JSON.stringify(p))));
                    });
                } else {
                    state.yearProjectCache.set(selectedYear, state.projects.map(p => JSON.parse(JSON.stringify(p))));
                }

                if (_cacheIsStale) window._projectsRefreshing = true; // block saves until fresh data arrives
                render();
                renderPTable();

                const _sessionLoadKey = `esh_session_loaded_${getDataSourceUserId()}`;
                const _alreadyLoaded = sessionStorage.getItem(_sessionLoadKey);
                if (cacheAge < 5000 && _alreadyLoaded && cachedData._personnelFromDedicatedDoc) {
                    return;
                }
            } catch(e) {
            }
        }

        const yearRefs = availableYears.map(year =>
            window.firebase.doc(window.firebaseDb, 'users', dataUserId, 'years', year.toString())
        );

        const [snapshots, projectsByYearFromDB, personnelFromDB] = await Promise.all([
            Promise.all(yearRefs.map(ref => window.firebase.getDoc(ref))),
            ProjectsDB.loadYears(availableYears),
            PersonnelDB.loadAll()
        ]);

        if (!state.yearProjectCache) state.yearProjectCache = new Map();

        let personnelData = [];
        let incidentRateData = { recordableCases: 0, lostDays: 0, totalHours: 0 };
        let oshData = {};

        snapshots.forEach((snap, i) => {
            if (!snap.exists()) return;
            const year = availableYears[i];
            const data = snap.data();

            if (year === selectedYear) {
                incidentRateData = data.incidentRateData || incidentRateData;
                oshData = data.oshData || {};
            }

            const perProjectDocs = projectsByYearFromDB.get(year);
            const projects = (perProjectDocs && perProjectDocs.length > 0)
                ? perProjectDocs          // ✅ new per-project docs
                : (data.projects || []);  // ⚠️ legacy embedded array (will be migrated on next save)

            if (!perProjectDocs || perProjectDocs.length === 0) {
            } else {
            }

            state.yearProjectCache.set(year, projects.map(p => JSON.parse(JSON.stringify(p))));

            if (year === selectedYear && !personnelFromDB && data.personnelData && data.personnelData.length > 0) {
                personnelData = data.personnelData;
            }
        });

        if (personnelFromDB && personnelFromDB.length > 0) {
            personnelData = personnelFromDB;
        } else if (!personnelFromDB) {
        }

        const selectedYearProjects = state.yearProjectCache.get(selectedYear) || [];

        const projectShellMap = new Map();
        availableYears.forEach(year => {
            (state.yearProjectCache.get(year) || []).forEach(p => {
                if (!projectShellMap.has(p.name)) {
                    projectShellMap.set(p.name, {
                        name: p.name,
                        region: p.region,
                        dateStarted: p.dateStarted,
                        dateFinished: p.dateFinished,
                        status: p.status,
                        vals: {},
                        oshData: {}
                    });
                }
            });
        });

        selectedYearProjects.forEach(p => {
            projectShellMap.set(p.name, p); // full data for current year
        });

        state.masterProjects = Array.from(projectShellMap.values());
        state.personnelData = personnelData;
        state.incidentRateData = incidentRateData;

        const rebuiltOshData = {};
        selectedYearProjects.forEach(p => {
            if (p.oshData) rebuiltOshData[p.name] = p.oshData;
        });
        state.oshData = Object.keys(rebuiltOshData).length > 0 ? rebuiltOshData : (oshData || {});

        state.projects = filterProjectsByYear(state.masterProjects, selectedYear);
        state.filteredProjects = [...state.projects];
        ensureCorporateProject(); ensurePlantProjects();

        try {
            const yearCacheObj = {};
            if (state.yearProjectCache) {
                state.yearProjectCache.forEach((projects, yr) => {
                    yearCacheObj[yr] = projects;
                });
            }
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                masterProjects: state.masterProjects,
                personnelData: state.personnelData,
                incidentRateData: state.incidentRateData,
                oshData: state.oshData,
                yearProjectCache: yearCacheObj,
                _personnelFromDedicatedDoc: personnelFromDB !== null // true if loaded from per-person docs
            }));
            localStorage.setItem(CACHE_TS_KEY, Date.now().toString());
            try { sessionStorage.setItem(`esh_session_loaded_${getDataSourceUserId()}`, '1'); } catch(e) {}
        } catch(e) {
            if (e && e.name === 'QuotaExceededError') {
                try {
                    const _yr = state.selectedYear || 2026;
                    for (let _ci = localStorage.length - 1; _ci >= 0; _ci--) {
                        const _ck = localStorage.key(_ci);
                        if (_ck && (
                            (_ck.startsWith('esh_dashboard_') && !_ck.includes('_' + _yr + '_')) ||
                            _ck === 'esh_login_logbook' || _ck === 'esh_audit_log'
                        )) { try { localStorage.removeItem(_ck); } catch(e2){} }
                    }
                    localStorage.setItem(CACHE_KEY, JSON.stringify({
                        projects: state.projects, masterProjects: state.masterProjects,
                        personnelData: state.personnelData, incidentRateData: state.incidentRateData,
                        oshData: state.oshData, _personnelFromDedicatedDoc: personnelFromDB !== null
                    }));
                    localStorage.setItem(CACHE_TS_KEY, Date.now().toString());
                } catch(e2) {  }
            } else {  }
        }

        render();
        renderPTable();

    } catch (error) {
        console.error('❌ Error loading projects:', error);
        showToast('Error loading data: ' + error.message, 'error');
    } finally {
        window._projectsRefreshing = false;
    }
}

// ── FORCE LOGOUT SYSTEM ────────────────────────────────────────────────────
// Admin writes to force_logout/{targetUid} → target user's onValue listener
// fires → they get signed out immediately from ALL open sessions/devices.
// ───────────────────────────────────────────────────────────────────────────

function renderForceLogoutList() {
    const container = document.getElementById('force-logout-user-list');
    if (!container) return;

    const presenceData = state.activeUsers || {};
    const allAccounts = Object.entries(UserAccounts.superintendents || {});
    const now = Date.now();
    const STALE_MS = 2 * 60 * 1000;

    // 1) Build email→uid map from PRESENCE (currently online users)
    const onlineByEmail = {};
    Object.entries(presenceData).forEach(([uid, data]) => {
        const isOnline = data.status === 'online' && data.lastSeen && (now - data.lastSeen) < STALE_MS;
        if (isOnline && data.email) onlineByEmail[data.email] = uid;
    });

    // 2) Build email→uid fallback from LOGIN LOGBOOK (covers offline accounts)
    //    Use the most recent login entry per email so we always have a UID.
    const uidByEmail = {};
    (state.loginLogbook || []).forEach(entry => {
        if (entry.email && entry.uid) {
            if (!uidByEmail[entry.email] ||
                new Date(entry.timestamp) > new Date(uidByEmail[entry.email].timestamp)) {
                uidByEmail[entry.email] = { uid: entry.uid, timestamp: entry.timestamp };
            }
        }
    });

    if (allAccounts.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:18px;color:var(--text-secondary);font-size:0.8rem;">No accounts configured.</div>`;
        return;
    }

    const myEmail = state.currentUser?.email;

    const rows = allAccounts
        .filter(([email]) => email !== myEmail)
        .map(([email, info]) => {
            // Prefer live presence UID, fall back to logbook UID
            const uid = onlineByEmail[email] || uidByEmail[email]?.uid || null;
            const isOnline = !!onlineByEmail[email];
            const hasUid  = !!uid;

            const roleLabel  = (info.role || 'user').toUpperCase();
            const region     = info.region || '—';
            const displayName = info.displayName || email;

            // Status badge
            const badgeColor = isOnline ? '#4caf50' : '#9e9e9e';
            const dotGlow    = isOnline ? `0 0 5px ${badgeColor}` : 'none';
            const statusText = isOnline ? 'ONLINE' : 'OFFLINE';

            // Button — enabled whenever we have a UID (online OR offline)
            // Offline = flag queued in RTDB, fires the moment they reopen the app
            let btnStyle, btnTitle, btnDisabled = '';
            if (isOnline) {
                btnStyle = 'background:#c62828;color:#fff;border:none;cursor:pointer;';
                btnTitle = 'Immediately signs out this user';
            } else if (hasUid) {
                btnStyle = 'background:#e65100;color:#fff;border:none;cursor:pointer;';
                btnTitle = 'User is offline — logout flag will fire the moment they reopen the dashboard';
            } else {
                btnStyle = 'background:#e0e0e0;color:#9e9e9e;border:none;cursor:not-allowed;';
                btnTitle = 'Cannot force logout — this account has never logged in';
                btnDisabled = 'disabled';
            }

            return `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border:none;box-shadow:0 2px 8px rgba(0,0,0,0.06);border-radius:8px;background:var(--bg-card);gap:10px;flex-wrap:wrap;">
                <div style="display:flex;align-items:center;gap:10px;min-width:0;">
                    <div style="width:9px;height:9px;border-radius:50%;background:${badgeColor};flex-shrink:0;box-shadow:${dotGlow};"></div>
                    <div style="min-width:0;">
                        <div style="font-size:0.8rem;font-weight:700;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${displayName}</div>
                        <div style="font-size:0.68rem;color:var(--text-secondary);">${email} &nbsp;·&nbsp; ${roleLabel} &nbsp;·&nbsp; ${region}</div>
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
                    <span style="font-size:0.65rem;font-weight:700;color:${badgeColor};letter-spacing:0.5px;">${statusText}</span>
                    <button ${btnDisabled} onclick="executeForceLogout('${uid}','${email}')"
                        title="${btnTitle}"
                        style="padding:6px 14px;border-radius:6px;font-size:0.72rem;font-weight:700;${btnStyle}transition:opacity 0.2s;">
                        <i class="fas fa-power-off"></i> Force Logout
                    </button>
                </div>
            </div>`;
        });

    container.innerHTML = rows.join('') || `<div style="text-align:center;padding:18px;color:var(--text-secondary);font-size:0.8rem;"><i class="fas fa-circle-check" style="color:#4caf50;margin-right:6px;"></i>No other accounts to manage.</div>`;
}

async function executeForceLogout(targetUid, targetEmail) {
    if (!state.isAdmin) return;
    if (!targetUid || targetUid === 'null') { showToast('Cannot force logout — UID not found. Account may never have logged in.', 'warning'); return; }

    const presenceData = state.activeUsers || {};
    const isCurrentlyOnline = Object.values(presenceData).some(d => d.email === targetEmail && d.status === 'online');

    const offlineNote = isCurrentlyOnline ? '' : '<br><br><small style="color:#888;">They are currently offline — the logout will trigger the moment they reopen the dashboard.</small>';

    const confirmed = await showModernDialog(
        'Force Logout?',
        `Are you sure you want to force logout <strong>${targetEmail}</strong>?<br><br>They will be immediately signed out from all active sessions.${offlineNote}`
    );
    if (!confirmed) return;

    try {
        const flagRef = window.firebase.dbRef(window.firebaseRealtimeDb, `force_logout/${targetUid}`);
        await window.firebase.set(flagRef, {
            timestamp: Date.now(),
            by: state.currentUser.email,
            reason: 'admin_force_logout'
        });

        AuditLogger.log('FORCE_LOGOUT', { targetUid, targetEmail, by: state.currentUser.email });

        const msg = isCurrentlyOnline
            ? `Force logout signal sent — ${targetEmail} is being signed out now.`
            : `Force logout queued — ${targetEmail} will be signed out when they next open the dashboard.`;
        showToast(msg, 'success', 5000);

        setTimeout(renderForceLogoutList, 3000);
    } catch (err) {
        console.error('❌ Force logout failed:', err);
        showToast('Failed to send force logout signal: ' + err.message, 'error');
    }
}

// Called once on login — listens for admin writing to force_logout/{myUid}
function startForceLogoutListener(userId) {
    if (!window.firebaseRealtimeDb || !window.firebase?.onValue) return;
    const flagRef = window.firebase.dbRef(window.firebaseRealtimeDb, `force_logout/${userId}`);
    window.firebase.onValue(flagRef, async (snapshot) => {
        if (!snapshot.exists()) return; // flag not set or already cleared
        try {
            // Clean up flag first so it doesn't re-fire after re-login
            await window.firebase.remove(flagRef);
        } catch(e) { /* non-critical */ }
        showToast('Your session has been terminated by an administrator.', 'error', 5000);
        setTimeout(async () => {
            await firebaseLogout();
        }, 1500);
    });

    // ── PASSWORD CHANGED LISTENER ─────────────────────────────────────────
    // When the account password is changed (from another device), automatically log out
    // all other sessions to keep the account secure.
    const pwChangedRef = window.firebase.dbRef(window.firebaseRealtimeDb, `password_changed/${userId}`);
    window.firebase.onValue(pwChangedRef, async (snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.val();
        // Skip if this device made the change — this is the device that updated it
        if (data && data.changedBy && state.deviceFingerprint &&
            data.changedBy === state.deviceFingerprint) {
            // This device changed the password — do not log out, just delete the flag
            try { await window.firebase.remove(pwChangedRef); } catch(e) {}
            return;
        }
        try { await window.firebase.remove(pwChangedRef); } catch(e) {}
        showToast('Password was changed. Please log in again for security.', 'error', 6000);
        setTimeout(async () => {
            await firebaseLogout();
        }, 2000);
    });
    // ──────────────────────────────────────────────────────────────────────
}

async function firebaseLogout() {
    if (!window.firebase) {
        return;
    }

    try {
        if (state.currentUser && state.currentUser.uid) {
            await Promise.race([
                PresenceTracker.cleanup(),
                new Promise(resolve => setTimeout(resolve, 3000))
            ]);
        }
        

        if (window.PersonnelDB) PersonnelDB._migrationDone = false;

        // Detach all real-time listeners cleanly before sign-out
        if (window.RowSaveManager) window.RowSaveManager.detachAll();
        if (window.ESHDataSync)    window.ESHDataSync.detachAll();
        if (window._roleUnsubscribe) { try { window._roleUnsubscribe(); } catch(e) {} window._roleUnsubscribe = null; }
        if (typeof window.chatStopUnreadWatch === 'function') window.chatStopUnreadWatch();
        
        await window.firebase.signOut(window.firebaseAuth);
        
        
    } catch (error) {
        console.error('❌ Logout error:', error);
    }
}

// Hides the loading screen once the data is ready.
// Waits until the loading screen has been showing for at least 2s, so the shield animation is seen. Does not block the app startup.
const LOADING_SCREEN_MIN_MS = 2000;
function hideLoadingScreen() {
    const lo = document.getElementById('firebase-loading-overlay');
    if (!lo || lo.style.display === 'none') return;
    const wait = Math.max(0, LOADING_SCREEN_MIN_MS - (performance.now() - (window._loaderShownAt || 0)));
    setTimeout(() => {
        lo.classList.add('fl-hide');
        setTimeout(() => { lo.style.display = 'none'; }, 400);
    }, wait);
}

function setupAuthObserver() {
    if (!window.firebase || !window.firebaseAuth) {
        const loadingOverlay = document.getElementById('firebase-loading-overlay');
        if (loadingOverlay) loadingOverlay.style.display = 'none';
        const loginOverlay = document.getElementById('login-overlay');
        if (loginOverlay) loginOverlay.style.display = 'flex';
            const _gf1 = document.getElementById('esh-global-footer'); if (_gf1) _gf1.style.display = 'none';
        return;
    }

    window.firebase.onAuthStateChanged(window.firebaseAuth, async (user) => {
        if (!window._eshStaticNodes) window._eshStaticNodes = new Set(document.body.children);
        const loadingOverlay = document.getElementById('firebase-loading-overlay');
        // Not signed in: show the login screen right away.
        // Signed in: keep the loading screen until the data is loaded (see hideLoadingScreen below).
        if (!user && loadingOverlay) loadingOverlay.style.display = 'none';

        if (user) {
            // Signed in from the login form: show the loading screen again while the data loads.
            // (On a page refresh it is still showing, so nothing to do.)
            if (loadingOverlay && loadingOverlay.style.display === 'none') {
                loadingOverlay.classList.remove('fl-hide');
                loadingOverlay.style.display = ''; // animations restart when it is shown again
                window._loaderShownAt = performance.now();
            }

            // Start the slow lookups together instead of one after another
            const _rolePromise = window.firebase.getDoc(window.firebase.doc(window.firebaseDb, 'roles', user.uid)).catch(() => null);
            const _fpPromise   = state.deviceFingerprint ? null : DeviceFingerprint.generate().catch(() => null);
            let displayName = user.email; // Default to email
            try {
                const userDocRef = window.firebase.doc(window.firebaseDb, 'users', user.uid);
                const userDocSnap = await window.firebase.getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    displayName = userData.displayName || user.email;
                }
            } catch (error) {
            }
            
            state.currentUser = { 
                email: user.email, 
                uid: user.uid,
                displayName: displayName 
            };
            state.isLoggedIn = true;

            // ─── RBAC FIX: Load role from Firestore roles/{uid} ─────────────
            // The hardcoded UserAccounts.superintendents only has pre-defined accounts.
            // Accounts deployed via deployRoles() are written to Firestore but NOT to
            // the hardcoded object — causing getUserInfo() to return 'guest' for them,
            // which silently blocks all saves. This fix syncs Firestore → UserAccounts.
            try {
                const roleDocRef = window.firebase.doc(window.firebaseDb, 'roles', user.uid);
                const roleSnap = await _rolePromise;
                if (roleSnap.exists()) {
                    const rd = roleSnap.data();
                    if (rd.role && rd.role !== 'guest') {
                        UserAccounts.superintendents[user.email] = {
                            role:        rd.role,
                            region:      rd.region      || 'ALL',
                            displayName: rd.displayName || displayName || user.email,
                            color:       UserAccounts.superintendents[user.email]?.color || '#555555'
                        };
                    }
                } else {
                }
            } catch (rbacErr) {
            }
            // ────────────────────────────────────────────────────────────────

            const userInfo = UserAccounts.getUserInfo(user.email);
            state.userRole = userInfo.role;
            state.userRegion = userInfo.region;
            state.userColor = userInfo.color;
            state.isAdmin = userInfo.role === 'admin';
            
            if (!state.deviceFingerprint) {
                state.deviceFingerprint = await _fpPromise;
            }

            const loginOverlay = document.getElementById('login-overlay');
            if (loginOverlay) loginOverlay.style.display = 'none';

            const userBadge = document.getElementById('user-badge');
            if (userBadge) {
                let roleIcon = 'fa-user-tie';
                if (state.isAdmin) roleIcon = 'fa-user-shield';
                else if (userInfo.role === 'pco') roleIcon = 'fa-leaf';
                const roleLabel = state.currentUser.displayName || (state.isAdmin ? 'ESH Admin' : userInfo.displayName);
                
                const nameDiv = userBadge.querySelector('.name');
                if (nameDiv) {
                    nameDiv.innerHTML = `
                        <i class="fas ${roleIcon}"></i>
                        ${roleLabel}
                    `;
                }
                
                if (state.isAdmin) {
                }
                if (userInfo.role === 'pco') {
                    setTimeout(() => {
                        showToast(`PCO Access: You can only edit Environmental Permits & EMB Reportorial for ${userInfo.region} region.`, 'info');
                    }, 2000);
                }
            }

            const userEmailEl = document.getElementById('user-email');
            if (userEmailEl) {
                userEmailEl.textContent = user.email;
            }

            showUI();
            initDarkMode();
            initializeYears(); // Initialize year selector

            window._appInitializing = true;
            try {
                await loadAllProjectsAndFilter();
            } finally {
                hideLoadingScreen(); // runs even if the load fails, so the user is never stuck
            }
            // Hold _appInitializing for 3.5s so the initial RowSaveManager snapshot
            // doesn't trigger auto-saves immediately after login.
            setTimeout(() => { window._appInitializing = false; }, 3500);

            // Attach real-time onSnapshot listener for collaborative sync
            if (window.RowSaveManager) {
                const _rsmYear = state.selectedYear || new Date().getFullYear();
                window.RowSaveManager.attachRealtimeSync(_rsmYear);
            }

            // ── AUTO-REFRESH: listen for role changes so no hard refresh is needed ──
            // When an admin changes a user's role/displayName in Firestore,
            // it is detected automatically and the page reloads to apply it right away.
            try {
                const roleDocRef = window.firebase.doc(window.firebaseDb, 'roles', user.uid);
                window._roleUnsubscribe = window.firebase.onSnapshot(roleDocRef, (snap) => {
                    if (!snap.exists() || !state.isLoggedIn) return;
                    const rd = snap.data();
                    const currentRole = state.userRole;
                    const currentRegion = state.userRegion;
                    if (rd.role && (rd.role !== currentRole || rd.region !== currentRegion)) {
                        showToast('Your account permissions were updated. Refreshing...', 'info', 3000);
                        setTimeout(() => { window.location.reload(); }, 2500);
                    }
                });
            } catch(e) {
            }
            // ─────────────────────────────────────────────────────────────────

            // ── Corporate KPM real-time sync — keeps state.companyData current
            // across devices/tabs (fixes data not reflecting on other computers) ──
            if (typeof window.corpKpmAttachSync === 'function') window.corpKpmAttachSync();
            if (typeof window.chatStartUnreadWatch === 'function') window.chatStartUnreadWatch(); // chat badge works without opening the panel
            
            window._isNewLogin = false;

            
            OfflineManager.init();
            
            LazyLoader.init();
            
            
            if (state.isAdmin) {
            } else {
                const settingsTab = document.querySelector('[onclick*="settings"]');
                if (settingsTab) {
                    settingsTab.style.display = 'none';
                }
            }
            
            try { await user.getIdToken(true); } catch(e) {  }
            await PresenceTracker.initialize(user.uid, user.email);
            startForceLogoutListener(user.uid);
            
            if (state.isAdmin) {
                loadLogbookFromFirebase();
                setTimeout(() => {
                    PresenceTracker.updateActiveUsersUI();
                    renderForceLogoutList();
                }, 500);
                setTimeout(async () => {
                    const users = state.activeUsers || {};
                    if (Object.keys(users).length === 0) {
                        return;
                    }
                    await PresenceTracker._autoCleanupStale(users);
                }, 10000);
            }
            
            const _isFirstLogin = !sessionStorage.getItem('esh_login_logged_' + user.uid);
            if (_isFirstLogin) {
                sessionStorage.setItem('esh_login_logged_' + user.uid, '1');
                await LoginLogbook.logLogin(user);
            }
            
            AuditLogger.log('USER_LOGIN', { 
                email: user.email, 
                role: state.userRole,
                region: state.userRegion,
                timestamp: new Date().toISOString(),
                isAdmin: state.isAdmin,
                deviceId: state.deviceFingerprint
            });
            
            startEshCalendarSync();
            // Self-heal cleanup: remove false values, legacy keys, stale deletion records from RTDB
            // Runs once per session, admin-only writes. Safe to call even if Firebase isn't ready yet.
            setTimeout(function() { if (typeof _eshRtdbSelfHealCleanup === 'function') _eshRtdbSelfHealCleanup(); }, 4000);

            const _eshCalTabTypes = ['esh-calendar-env','esh-calendar-safety','esh-calendar-health','esh-calendar-drills','esh-calendar-corp-drills'];
            if (_eshCalTabTypes.includes(state.currentTab)) {
                try { eshFetchAndRender(state.currentTab); } catch(e) {}
            }
            
            // ── REFRESH CERT CACHE ON LOGIN (mirrors loadAllProjectsAndFilter) ─
            // Call _pcLoadCerts() after every login so the cert cache is always
            // fresh regardless of which account logged in — same idea as calling
            // loadAllProjectsAndFilter() to get fresh project/personnel data.
            if (typeof window._pcLoadCerts === 'function') {
                setTimeout(window._pcLoadCerts, 600);
            }
            // ────────────────────────────────────────────────────────────────

        } else {
            
            if (state.currentUser) {
                PresenceTracker.cleanup();
            }
            
            state.currentUser = null;
            state.isLoggedIn = false;
            state.userRole = null;
            state.userRegion = null;
            state.isAdmin = false;

            // Fresh start on next login: close any modal/overlay left open (auto-logout, force-logout,
            // session expiry) and forget the last tab so the next login starts clean.
            // Generic: any full-screen fixed layer directly under <body> is a modal/overlay.
            // Created after page load -> remove. Part of the original HTML -> just hide (it is reused).
            try {
                const _keep = ['login-overlay', 'firebase-loading-overlay', 'main-content'];
                Array.from(document.body.children).forEach(el => {
                    if (_keep.includes(el.id)) return;
                    const cs = getComputedStyle(el);
                    if (cs.display === 'none' || cs.position !== 'fixed') return;
                    const r = el.getBoundingClientRect();
                    if (r.width < innerWidth * 0.9 || r.height < innerHeight * 0.9) return;
                    if (window._eshStaticNodes && window._eshStaticNodes.has(el)) {
                        el.classList.remove('show', 'active', 'open');
                        el.style.display = 'none';
                    } else {
                        el.remove();
                    }
                });
                localStorage.removeItem('esh_last_tab');
            } catch (e) {}

            if (typeof clearLoginPassword === 'function') clearLoginPassword(); // never keep the old password after logout / auto-logout / session expiry
            const loginOverlay = document.getElementById('login-overlay');
            if (loginOverlay) {
                loginOverlay.style.display = 'flex';
            const _gf2 = document.getElementById('esh-global-footer'); if (_gf2) _gf2.style.display = 'none';
                setTimeout(rememberEmailLoad, 120);
            }

            const sidebar = document.getElementById('main-sidebar');
            const content = document.getElementById('main-content');
            if (sidebar) { sidebar.classList.add('hidden'); sidebar.classList.add('sidebar-collapsed'); }
            if (content) content.classList.add('hidden');

            const loginBtn = document.getElementById('login-btn');
            if (loginBtn) {
                loginBtn.disabled = false;
                loginBtn.innerHTML = '<i class="fas fa-shield-halved"></i> Log in';
            }
        }
    });
}

const originalSaveUserData = window.saveUserData || function() {};

window.saveUserData = function(email) {
    originalSaveUserData(email);
};

waitForFirebase().then(async () => {
    
    setupAuthObserver();
    
    setupInactivityTimer();
});

// ── AUTO-LOGOUT (IDLE TIMEOUT) ───────────────────────────────────────────────
// Total session: 15 minutes idle → logout
// Warning shown at 14 minutes (1 minute countdown before forced logout)
// ─────────────────────────────────────────────────────────────────────────────

let inactivityTimer      = null;
let warningTimer         = null;
let warningCountdownInterval = null;

const IDLE_WARNING_MS  = 14 * 60 * 1000; // show warning after 14 min idle
const IDLE_LOGOUT_MS   = 15 * 60 * 1000; // force logout after 15 min idle
const WARNING_SECS     = 60;             // countdown seconds shown in popup

// ── Inject warning modal HTML (once) ──────────────────────────────────────
(function injectIdleWarningModal() {
    if (document.getElementById('idle-warning-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'idle-warning-modal';
    modal.innerHTML = `
        <div id="idle-warning-backdrop" class="ux-dialog-overlay" style="display:none; z-index:99999;">
            ${uxDialogHTML({
                tone: 'warn',
                icon: 'fa-clock',
                title: 'Session about to expire',
                message: 'You\'ve been inactive for <strong>14 minutes</strong>. You will be logged out automatically in:',
                extra: '<div class="ux-countdown"><span id="idle-countdown-display">60</span><span>seconds</span></div>',
                buttons: [
                    { text: 'Logout now', onclick: 'window.idleForceLogout()' },
                    { text: 'Stay logged in', id: 'idle-stay-btn', primary: true, onclick: 'window.idleTimerReset()' }
                ]
            })}
        </div>
    `;
    document.body.appendChild(modal);
})();

function setupInactivityTimer() {

    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'keydown', 'scroll', 'touchstart', 'click'];

    function hideWarningModal() {
        const backdrop = document.getElementById('idle-warning-backdrop');
        if (backdrop) backdrop.style.display = 'none';
        if (warningCountdownInterval) {
            clearInterval(warningCountdownInterval);
            warningCountdownInterval = null;
        }
    }

    function showWarningModal() {
        const backdrop = document.getElementById('idle-warning-backdrop');
        if (!backdrop) return;
        backdrop.style.display = 'flex';

        let secs = WARNING_SECS;
        const display = document.getElementById('idle-countdown-display');
        if (display) display.textContent = secs;

        warningCountdownInterval = setInterval(() => {
            secs--;
            if (display) display.textContent = secs;
            if (secs <= 0) {
                clearInterval(warningCountdownInterval);
                warningCountdownInterval = null;
            }
        }, 1000);
    }

    function resetAutoLogoutTimer() {
        if (!state.isLoggedIn) return;

        // Clear existing timers
        if (inactivityTimer) { clearTimeout(inactivityTimer); inactivityTimer = null; }
        if (warningTimer)    { clearTimeout(warningTimer);    warningTimer    = null; }
        hideWarningModal();

        // Set warning timer (14 min)
        warningTimer = setTimeout(() => {
            if (!state.isLoggedIn) return;
            showWarningModal();
        }, IDLE_WARNING_MS);

        // Set logout timer (15 min)
        inactivityTimer = setTimeout(() => {
            if (!state.isLoggedIn) return;
            handleInactivityLogout();
        }, IDLE_LOGOUT_MS);
    }

    async function handleInactivityLogout() {
        hideWarningModal();

        // Flush any unsaved rows
        if (window.RowSaveManager?.hasDirty()) {
            try { await window.RowSaveManager.saveAllDirty(); } catch(e) {}
        }

        showToast('⏰ You have been logged out due to 15 minutes of inactivity.', 'warning');
        await new Promise(resolve => setTimeout(resolve, 1800));

        if (state.currentUser) {
            try { await LoginLogbook.logLogout(state.currentUser); } catch(e) {}
        }

        localStorage.removeItem('esh_session_start');
        localStorage.removeItem('esh_last_tab');
        if (window.backupManager) backupManager.stopAutoSave();

        if (window.firebaseAuth) {
            try {
                await window.firebase.signOut(window.firebaseAuth);
            } catch (error) {
                console.error('❌ Error during auto-logout:', error);
            }
        }
    }

    // Expose for "Stay Logged In" button and "Logout Now" button
    window.idleTimerReset = function() {
        resetAutoLogoutTimer();
    };

    window.idleForceLogout = function() {
        hideWarningModal();
        if (inactivityTimer) { clearTimeout(inactivityTimer); inactivityTimer = null; }
        if (warningTimer)    { clearTimeout(warningTimer);    warningTimer    = null; }
        handleInactivityLogout();
    };

    activityEvents.forEach(event => {
        document.addEventListener(event, resetAutoLogoutTimer, { passive: true, capture: true });
    });

    resetAutoLogoutTimer();
}
// ── END AUTO-LOGOUT ──────────────────────────────────────────────────────────

window.addEventListener('beforeunload', () => {
    if (state.currentUser && state.currentUser.uid) {
        PresenceTracker.cleanup({ soft: true }); // fire-and-forget is fine here — onDisconnect is the real safety net
    }
    // Save current scroll position per tab
    if (state.currentTab) {
        const _mc = document.getElementById('main-content');
        if (_mc) {
            try { localStorage.setItem('esh_last_scroll_' + state.currentTab, String(_mc.scrollTop || 0)); } catch(e) {}
        }
    }
});

// Save scroll position continuously (debounced) so refresh restores exact position
(function _initScrollSave() {
    let _scrollSaveTimer = null;
    document.addEventListener('scroll', function() {
        if (!state || !state.currentTab) return;
        clearTimeout(_scrollSaveTimer);
        _scrollSaveTimer = setTimeout(function() {
            const _mc = document.getElementById('main-content');
            if (_mc) {
                try { localStorage.setItem('esh_last_scroll_' + state.currentTab, String(_mc.scrollTop || 0)); } catch(e) {}
            }
        }, 300);
    }, true);
})();

(function() {
    let _leavePendingUrl = null;
    let _leaveCallback   = null;

    function shouldInterceptLeave() {
        return typeof _pendingSync !== 'undefined' ? _pendingSync : false;
    }

    window.leaveSiteCancel = function() {
        _leavePendingUrl = null;
        _leaveCallback   = null;
    };

    window.leaveSiteConfirm = function() {
        if (_leaveCallback) {
            const cb = _leaveCallback;
            _leaveCallback = null;
            cb();
        } else if (_leavePendingUrl) {
            const url = _leavePendingUrl;
            _leavePendingUrl = null;
            window.location.href = url;
        }
    };

    function showLeaveSiteModal(callback) {
        if (document.getElementById('leave-site-dialog')) return;
        _leaveCallback = callback || null;
        uxDialog({
            id: 'leave-site-dialog',
            zIndex: 99999,
            tone: 'danger',
            icon: 'fa-exclamation-triangle',
            title: 'Leave site?',
            message: 'Changes you made may not be saved.',
            confirmText: 'Leave',
            cancelText: 'Stay',
            focus: 'cancel'
        }).then((ok) => { if (ok) window.leaveSiteConfirm(); else window.leaveSiteCancel(); });
    }

    document.addEventListener('click', function(e) {
        if (!shouldInterceptLeave()) return;
        const a = e.target.closest('a[href]');
        if (!a) return;
        const href = a.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('javascript')) return;
        const isSameOrigin = a.hostname === window.location.hostname;
        if (!isSameOrigin) {
            e.preventDefault();
            _leavePendingUrl = a.href;
            showLeaveSiteModal();
        }
    }, true);

    document.addEventListener('keydown', function(e) {
        if (!shouldInterceptLeave()) return;
        if (e.key === 'F5' || (e.ctrlKey && e.key === 'r') || (e.ctrlKey && e.key === 'R')) {
            e.preventDefault();
            showLeaveSiteModal(function() { window.location.reload(); });
        }
        if (e.ctrlKey && (e.key === 'w' || e.key === 'W')) {
            e.preventDefault();
            showLeaveSiteModal(function() { window.close(); });
        }
    });

    window.showLeaveSiteModal = showLeaveSiteModal;
})();

setTimeout(function() {
    const lo = document.getElementById('firebase-loading-overlay');
    if (lo && lo.style.display !== 'none') {
        lo.style.display = 'none';
        if (typeof state !== 'undefined' && state.isLoggedIn) return; // signed in but data is slow: just show the dashboard
        const loginOverlay = document.getElementById('login-overlay');
        if (loginOverlay && loginOverlay.style.display !== 'none') {
            loginOverlay.style.display = 'flex';
            const _gf3 = document.getElementById('esh-global-footer'); if (_gf3) _gf3.style.display = 'none';
        } else if (loginOverlay) {
            loginOverlay.style.display = 'flex';
            const _gf4 = document.getElementById('esh-global-footer'); if (_gf4) _gf4.style.display = 'none';
        }
    }
}, 15000);

document.addEventListener('DOMContentLoaded', function() {
    restoreNavGroupStates();
    
    document.addEventListener('keydown', function(e) {
        if (e.target.type === 'number') {
            if (e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E') {
                e.preventDefault();
                showToast('Only positive numbers are allowed', 'warning');
            }
        }
    });
    
    document.addEventListener('paste', function(e) {
        if (e.target.type === 'number') {
            const pasteData = e.clipboardData.getData('text');
            const number = parseFloat(pasteData);
            if (number < 0) {
                e.preventDefault();
                showToast('Cannot paste negative numbers', 'warning');
            }
        }
    });
    
    document.addEventListener('input', function(e) {
        if (e.target.type === 'number') {
            const value = parseFloat(e.target.value);
            if (value < 0) {
                e.target.value = '';
                showToast('Negative numbers are not allowed', 'warning');
            }
        }
    });
});
