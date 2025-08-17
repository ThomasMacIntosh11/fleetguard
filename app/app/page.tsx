'use client';

import React, { useEffect, useMemo, useState } from 'react';
const LS_VEHICLES = "fleetguard_vehicles";
// Persist driver assignments: Record<driverEmailLowercase, string[] of vehicleIds>
export const LS_ASSIGN = 'fg_assignments';
export function loadAssignments(): Record<string, string[]> {
  try { const s = localStorage.getItem(LS_ASSIGN); return s ? JSON.parse(s) : {}; } catch { return {}; }
}
export function saveAssignments(a: Record<string, string[]>) {
  localStorage.setItem(LS_ASSIGN, JSON.stringify(a));
}
// Driver directory localStorage helpers
const LS_DRIVERS = 'fg_drivers';
function loadDriversStore(): User[] {
  try { const s = localStorage.getItem(LS_DRIVERS); return s ? JSON.parse(s) as User[] : []; } catch { return []; }
}
function saveDriversStore(list: User[]) {
  localStorage.setItem(LS_DRIVERS, JSON.stringify(list));
}
import {
  CheckCircle2,
  FilePlus2,
  FileText,
  Info,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react';

/* ============================================================================
   Types
============================================================================ */

type DocType =
  | 'Registration'
  | 'Insurance'
  | 'CVOR'
  | 'Inspection'
  | 'PM Service';

type DocStatus = 'Missing' | 'Valid' | 'Expiring' | 'Expired';

type DocFile = { url: string; name: string };

type DocumentRec = {
  id: string;
  type: DocType;
  status: DocStatus;
  issueDate?: string | null;   // ISO yyyy-mm-dd
  expiryDate?: string | null;  // ISO yyyy-mm-dd
  file?: DocFile | null;
};

type Vehicle = {
  id: string;
  name: string;
  plate: string;               // shown in Documents tab (instead of internal id)
  vin?: string;
  province?: string;
  make?: string;
  model?: string;
  documents: DocumentRec[];    // always 5 slots
  createdAt: string;
};

type Task = {
  id: string;
  title: string;
  vehicleId?: string | null;
  docId?: string | null;
  dueDate?: string | null;
  createdAt: string;
  completed: boolean;
};

// User type and localStorage helpers
type User = {
  id: string;
  name: string;
  email: string;
  employeeNumber?: string;
  // License monitoring
  licenseNumber?: string;
  licenseClass?: string;      // e.g., G, AZ, DZ
  licenseExpiry?: string;     // ISO yyyy-mm-dd
};

const USER_KEY = 'fg_user';
function loadUser(): User | null {
  try { const s = localStorage.getItem(USER_KEY); return s ? JSON.parse(s) as User : null; } catch { return null; }
}
function saveUser(u: User) { localStorage.setItem(USER_KEY, JSON.stringify(u)); }
function clearUser() { localStorage.removeItem(USER_KEY); }

/* ============================================================================
   Utils
============================================================================ */

const DOC_TYPES: DocType[] = [
  'Registration',
  'Insurance',
  'CVOR',
  'Inspection',
  'PM Service',
];

function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

function todayISO(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function addYearsISO(baseISO: string, years = 1): string {
  const d = new Date(baseISO);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

function daysBetweenToday(expiryISO?: string | null): number | null {
  if (!expiryISO) return null;
  const e = new Date(expiryISO);
  const t = new Date(todayISO());
  const diff = Math.floor((e.getTime() - t.getTime()) / (1000 * 3600 * 24));
  return diff;
}

/** Status rules:
 *  - no expiry => 'Missing'
 *  - < 0 days   => 'Expired'
 *  - 0..30      => 'Expiring'
 *  - > 30       => 'Valid'
 */
function statusFromExpiry(expiryISO?: string | null): DocStatus {
  if (!expiryISO) return 'Missing';
  const days = daysBetweenToday(expiryISO);
  if (days === null) return 'Missing';
  if (days < 0) return 'Expired';
  if (days <= 30) return 'Expiring';
  return 'Valid';
}

function licenseStatus(expiryISO?: string | null): { label: 'Valid' | 'Expiring' | 'Expired' | 'Missing'; cls: string } {
  if (!expiryISO) return { label: 'Missing', cls: 'bg-slate-50 text-slate-600 border border-slate-200' };
  const days = daysBetweenToday(expiryISO);
  if (days === null) return { label: 'Missing', cls: 'bg-slate-50 text-slate-600 border border-slate-200' };
  if (days < 0) return { label: 'Expired', cls: 'bg-rose-50 text-rose-700 border border-rose-200' };
  if (days <= 45) return { label: 'Expiring', cls: 'bg-amber-50 text-amber-700 border border-amber-200' };
  return { label: 'Valid', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' };
}

function badgeClass(s: DocStatus): string {
  switch (s) {
    case 'Valid':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    case 'Expiring':
      return 'bg-amber-50 text-amber-700 border border-amber-200';
    case 'Expired':
      return 'bg-rose-50 text-rose-700 border border-rose-200';
    default:
      return 'bg-slate-50 text-slate-600 border border-slate-200';
  }
}

function emptyBinder(): DocumentRec[] {
  return DOC_TYPES.map((type) => ({
    id: uid('doc'),
    type,
    status: 'Missing',
    issueDate: null,
    expiryDate: null,
    file: null,
  }));
}

function computeCompliancePercent(v: Vehicle): number {
  // Compliance = % of slots that have a file uploaded.
  const haveFiles = v.documents.filter((d) => !!d.file).length;
  return Math.round((haveFiles / DOC_TYPES.length) * 100);
}

// Minimal CSV parsing (handles quoted values and commas)
export type VehicleCSVRow = {
  plate: string;
  make?: string;
  model?: string;
  vin?: string;
  province?: string;
  name?: string; // optional unit/friendly name
};

function parseCSV(text: string): VehicleCSVRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length === 0) return [];
  // headers
  const rawHeaders = lines[0].split(',').map(h => h.trim().toLowerCase());
  const headers = rawHeaders.map(h => h.replace(/\"/g, ''));

  const idx = (k: string) => headers.indexOf(k);

  const out: VehicleCSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = tokenizeCSVLine(lines[i]);
    const get = (k: string) => {
      const j = idx(k);
      return j >= 0 ? (row[j] ?? '').trim().replace(/^\"|\"$/g, '') : '';
    };
    const plate = get('plate') || get('licence') || get('license') || get('license plate') || get('licence plate');
    if (!plate) continue;
    out.push({
      plate,
      make: get('make') || undefined,
      model: get('model') || undefined,
      vin: get('vin') || undefined,
      province: get('province') || undefined,
      name: get('name') || get('unit') || undefined,
    });
  }
  return out;
}

function tokenizeCSVLine(line: string): string[] {
  const res: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQ = !inQ; }
    } else if (ch === ',' && !inQ) {
      res.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  res.push(cur);
  return res;
}

/* ============================================================================
   Seed Data (demo)
============================================================================ */

const seedVehicles: Vehicle[] = [
  {
    id: uid('veh'),
    name: 'Unit 100',
    plate: 'CAVR-102',
    vin: '1XKAD49X5AJ123456',
    province: 'ON',
    make: 'Freightliner',
    model: 'Cascadia',
    documents: [
      {
        id: uid('doc'),
        type: 'Registration',
        issueDate: '2025-01-10',
        expiryDate: '2026-01-10',
        status: statusFromExpiry('2026-01-10'),
        file: { url: '#', name: 'registration-100.pdf' },
      },
      {
        id: uid('doc'),
        type: 'Insurance',
        issueDate: '2025-07-01',
        expiryDate: '2026-07-01',
        status: statusFromExpiry('2026-07-01'),
        file: { url: '#', name: 'insurance-100.pdf' },
      },
      {
        id: uid('doc'),
        type: 'CVOR',
        issueDate: '2024-09-01',
        expiryDate: '2025-09-01',
        status: statusFromExpiry('2025-09-01'),
        file: { url: '#', name: 'cvor-100.pdf' },
      },
      {
        id: uid('doc'),
        type: 'Inspection',
        issueDate: '2025-07-20',
        expiryDate: '2025-10-20',
        status: statusFromExpiry('2025-10-20'),
        file: { url: '#', name: 'inspection-100.pdf' },
      },
      {
        id: uid('doc'),
        type: 'PM Service',
        issueDate: '2025-07-05',
        expiryDate: '2025-09-05',
        status: statusFromExpiry('2025-09-05'),
        file: { url: '#', name: 'pm-100.pdf' },
      },
    ],
    createdAt: todayISO(),
  },
  {
    id: uid('veh'),
    name: 'Unit 200',
    plate: 'AZTR-221',
    vin: '2HSCBAER0YC012345',
    province: 'AB',
    make: 'Kenworth',
    model: 'T680',
    documents: emptyBinder(), // starts at 0% compliance
    createdAt: todayISO(),
  },
];

const seedTasks: Task[] = [
  {
    id: uid('task'),
    title: 'Upload Registration for CAVR-102',
    vehicleId: seedVehicles[0].id,
    docId: seedVehicles[0].documents[0].id,
    dueDate: '2026-01-10',
    createdAt: todayISO(),
    completed: false,
  },
];

/* ============================================================================
   Mini SVG components (sparklines, donut, mini-bars)
============================================================================ */

function Sparkline({
  data,
  color = '#0f172a', // slate-900
  width = 120,
  height = 32,
  strokeWidth = 2,
  fill = 'transparent',
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  strokeWidth?: number;
  fill?: string;
}) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const dx = width / Math.max(data.length - 1, 1);

  const points = data.map((v, i) => {
    const x = i * dx;
    // invert y so larger is higher
    const y =
      height - ((v - min) / (max - min || 1)) * (height - strokeWidth) - strokeWidth / 2;
    return [x, y];
  });

  const d = points
    .map(([x, y], i) => (i === 0 ? `M ${x},${y}` : `L ${x},${y}`))
    .join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {fill !== 'transparent' && (
        <path
          d={`${d} L ${width},${height} L 0,${height} Z`}
          fill={fill}
          opacity={0.12}
        />
      )}
      <path d={d} fill="none" stroke={color} strokeWidth={strokeWidth} />
    </svg>
  );
}

function DonutRing({
  values,
  colors,
  size = 140,
  stroke = 14,
}: {
  values: number[]; // will be normalized
  colors: string[];
  size?: number;
  stroke?: number;
}) {
  const total = values.reduce((a, b) => a + b, 0) || 1;
  const norm = values.map((v) => (v / total) * 100);
  const r = (size - stroke) / 2;
  const c = Math.PI * 2 * r;

  let accum = 0;
  const segs = norm.map((pct, i) => {
    const dash = (pct / 100) * c;
    const gap = c - dash;
    const seg = (
      <circle
        key={i}
        r={r}
        cx={size / 2}
        cy={size / 2}
        fill="transparent"
        stroke={colors[i] || '#e2e8f0'}
        strokeWidth={stroke}
        strokeDasharray={`${dash} ${gap}`}
        strokeDashoffset={c * 0.25 - (accum / 100) * c}
        strokeLinecap="round"
      />
    );
    accum += pct;
    return seg;
  });

  return (
    <svg width={size} height={size} className="block">
      <g>{segs}</g>
      <circle
        r={r}
        cx={size / 2}
        cy={size / 2}
        fill="transparent"
        stroke="#e2e8f0" // slate-200 base track (shows through gaps)
        strokeWidth={stroke}
        opacity={0.4}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        className="fill-slate-900 text-xl font-semibold"
      >
        {Math.round((values[0] / total) * 100)}%
      </text>
      <text
        x="50%"
        y="50%"
        dy="1.4em"
        dominantBaseline="middle"
        textAnchor="middle"
        className="fill-slate-500 text-xs"
      >
        Valid
      </text>
    </svg>
  );
}

function MiniBars({
  data,
  color = '#0f172a',
  width = 180,
  height = 48,
  gap = 6,
  rounded = 4,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  gap?: number;
  rounded?: number;
}) {
  const max = Math.max(...data, 1);
  const barW = (width - gap * (data.length - 1)) / data.length;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {data.map((v, i) => {
        const h = (v / max) * (height - 4);
        const x = i * (barW + gap);
        const y = height - h;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barW}
            height={h}
            rx={rounded}
            fill={color}
            opacity={0.9}
          />
        );
      })}
    </svg>
  );
}

/* ============================================================================
   App
============================================================================ */

export default function FleetApp() {
  const [tab, setTab] = useState<'Dashboard' | 'Vehicles' | 'Drivers' | 'Tasks' | 'Documents' | 'Reports'>(
    'Dashboard',
  );

  const [vehicles, setVehicles] = useState<Vehicle[]>(structuredClone(seedVehicles));
  const [tasks, setTasks] = useState<Task[]>(structuredClone(seedTasks));
  const [q, setQ] = useState('');
  // User/auth state
  const [user, setUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  // Driver directory state
  const [drivers, setDrivers] = useState<User[]>([]);
  // Load & persist driver directory
  useEffect(() => { setDrivers(loadDriversStore()); }, []);
  useEffect(() => { saveDriversStore(drivers); }, [drivers]);

  // Load vehicles from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(LS_VEHICLES);
    if (stored) {
      try {
        setVehicles(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse stored vehicles", e);
      }
    }
  }, []);

  // Save vehicles to localStorage whenever they change
  useEffect(() => {
    if (vehicles.length > 0) {
      localStorage.setItem(LS_VEHICLES, JSON.stringify(vehicles));
    }
  }, [vehicles]);
  useEffect(() => {
    setUser(loadUser());
  }, []);

  /* ---------------------------- Derived values ---------------------------- */

  const filteredVehicles = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return vehicles;
    return vehicles.filter((v) => {
      return (
        v.name.toLowerCase().includes(query) ||
        v.plate.toLowerCase().includes(query) ||
        (v.vin ?? '').toLowerCase().includes(query) ||
        (v.make ?? '').toLowerCase().includes(query) ||
        (v.model ?? '').toLowerCase().includes(query)
      );
    });
  }, [vehicles, q]);

  const openTasks = useMemo(() => tasks.filter((t) => !t.completed), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((t) => t.completed), [tasks]);

  const allDocs = useMemo(() => vehicles.flatMap((v) => v.documents), [vehicles]);

  const counts = useMemo(() => {
    const valid = allDocs.filter((d) => d.status === 'Valid').length;
    const expiring = allDocs.filter((d) => d.status === 'Expiring').length;
    const expired = allDocs.filter((d) => d.status === 'Expired').length;
    const missing = allDocs.filter((d) => d.status === 'Missing').length;
    return { valid, expiring, expired, missing, total: allDocs.length };
  }, [allDocs]);

  const avgCompliance = useMemo(() => {
    if (vehicles.length === 0) return 0;
    const total = vehicles.reduce((acc, v) => acc + computeCompliancePercent(v), 0);
    return Math.round(total / vehicles.length);
  }, [vehicles]);

  /* Trend arrays for sparklines (derived, stable & deterministic)
     We synthesize light-weight 6-point histories from current counts
     to show trend without needing a timeseries backend. */
  const sparkValid = useMemo(() => synthTrend(counts.valid, 6, 0.12), [counts.valid]);
  const sparkExpiring = useMemo(() => synthTrend(counts.expiring, 6, 0.25), [counts.expiring]);
  const sparkExpired = useMemo(() => synthTrend(counts.expired, 6, 0.18), [counts.expired]);
  const sparkTasks = useMemo(() => synthTrend(openTasks.length, 6, 0.2), [openTasks.length]);

  // Upcoming 6 months expiries -> mini bars
  const next6Bars = useMemo(() => next6MonthsCounts(allDocs), [allDocs]);

  /* ------------------------------ Actions -------------------------------- */

  function addVehicle(payload: {
    name: string;
    plate: string;
    vin?: string;
    province?: string;
    make?: string;
    model?: string;
  }) {
    setVehicles((prev) => [
      ...prev,
      {
        id: uid('veh'),
        name: payload.name || payload.plate,
        plate: payload.plate,
        vin: payload.vin,
        province: payload.province,
        make: payload.make,
        model: payload.model,
        documents: emptyBinder(),
        createdAt: todayISO(),
      },
    ]);
  }

  function addVehiclesBulk(rows: VehicleCSVRow[]) {
    if (!rows?.length) return;
    setVehicles(prev => [
      ...prev,
      ...rows.map(r => ({
        id: uid('veh'),
        name: (r.name || r.plate),
        plate: r.plate,
        vin: r.vin,
        province: r.province,
        make: r.make,
        model: r.model,
        documents: emptyBinder(),
        createdAt: todayISO(),
      })),
    ]);
  }

  function setDocumentOnVehicle(
    vehicleId: string,
    docId: string,
    patch: Partial<Omit<DocumentRec, 'id' | 'type'>>,
  ) {
    setVehicles((prev) =>
      prev.map((v) => {
        if (v.id !== vehicleId) return v;
        return {
          ...v,
          documents: v.documents.map((d) => {
            if (d.id !== docId) return d;
            const next: DocumentRec = { ...d, ...patch };
            next.status = statusFromExpiry(next.expiryDate);
            return next;
          }),
        };
      }),
    );

    // status transition -> Expiring => create task if not exists
    const v = vehicles.find((vv) => vv.id === vehicleId);
    const oldDoc = v?.documents.find((dd) => dd.id === docId);
    const oldStatus = oldDoc?.status ?? 'Missing';
    const newStatus = statusFromExpiry(patch.expiryDate ?? oldDoc?.expiryDate ?? null);

    if (oldStatus !== 'Expiring' && newStatus === 'Expiring') {
      setTasks((prev) => {
        const exists = prev.some((t) => t.docId === docId && !t.completed);
        if (exists) return prev;
        const plate = vehicles.find((vv) => vv.id === vehicleId)?.plate ?? 'vehicle';
        return [
          ...prev,
          {
            id: uid('task'),
            title: `Renew ${oldDoc?.type ?? 'document'} for ${plate}`,
            vehicleId,
            docId,
            dueDate: patch.expiryDate ?? oldDoc?.expiryDate ?? null,
            createdAt: todayISO(),
            completed: false,
          },
        ];
      });
    }
  }

  function replaceDocument(
    vehicleId: string,
    docId: string,
    payload: {
      issueDate: string | null;
      expiryDate: string | null;
      file: DocFile | null;
    },
  ) {
    setDocumentOnVehicle(vehicleId, docId, payload);
  }

  function upsertDocumentByType(
    vehicleId: string,
    type: DocType,
    payload: {
      issueDate: string | null;
      expiryDate: string | null;
      file: DocFile | null;
    },
  ) {
    const v = vehicles.find((x) => x.id === vehicleId);
    if (!v) return;
    const slot = v.documents.find((d) => d.type === type);
    if (!slot) return;
    replaceDocument(vehicleId, slot.id, payload);
  }

  function toggleTaskCompleted(taskId: string, done: boolean) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, completed: done } : t)));
  }

  function deleteTask(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }

  /* -------------------------------- UI ----------------------------------- */

  return (
    <div className="min-h-[100svh] bg-slate-50 text-slate-900">
      {/* Hide marketing site header when inside the app */}
      <style jsx global>{`
        /* Try common ids/classes first, but also fall back to the semantic header element */
        header.site-header,
        #site-header,
        header[role="banner"],
        header[data-site-header],
        header.marketing-header,
        /* Fallback: generic header on the marketing shell */
        body > header {
          display: none !important;
        }
      `}</style>
      {/* App chrome / nav */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center gap-4 justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-slate-900" />
            {user ? (
              <ProfileMenu
                user={user}
                onSignOut={() => {
                  clearUser();
                  setUser(null);
                }}
              />
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
                title="Sign in"
              >
                Sign in
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm">
            {(['Dashboard', 'Vehicles', 'Drivers', 'Tasks', 'Documents', 'Reports'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-xl px-3 py-2 hover:bg-slate-100 transition ${
                  tab === t ? 'bg-slate-900 text-white hover:bg-slate-900' : 'text-slate-800'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search vehicles, plates, VIN..."
                className="pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm w-[260px] outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-4 py-6">
        {tab === 'Dashboard' && (
          <Dashboard
            vehicles={vehicles}
            openTasks={openTasks}
            counts={counts}
            avgCompliance={avgCompliance}
            spark={{ valid: sparkValid, expiring: sparkExpiring, expired: sparkExpired, tasks: sparkTasks }}
            next6={next6Bars}
          />
        )}

        {tab === 'Vehicles' && (
          <VehiclesTab
            vehicles={filteredVehicles}
            addVehicle={addVehicle}
            addVehiclesBulk={addVehiclesBulk}
            setDocument={setDocumentOnVehicle}
            upsertByType={upsertDocumentByType}
            drivers={drivers}
          />
        )}

        {tab === 'Drivers' && (
          <DriversTab
            vehicles={vehicles}
            drivers={drivers}
            setDrivers={setDrivers}
          />
        )}

        {tab === 'Tasks' && (
          <TasksTab
            openTasks={openTasks}
            completedTasks={completedTasks}
            onToggle={toggleTaskCompleted}
            onDelete={deleteTask}
            vehicles={vehicles}
          />
        )}

        {tab === 'Documents' && (
          <DocumentsTab vehicles={filteredVehicles} setDocument={setDocumentOnVehicle} />
        )}

        {tab === 'Reports' && <ReportsTab vehicles={vehicles} tasks={tasks} />}
      </main>
      {/* Auth dialog */}
      {showAuth && (
        <AuthDialog
          onClose={() => setShowAuth(false)}
          onSave={(name, email) => {
            const u: User = { id: uid('user'), name: name.trim(), email: email.trim() };
            saveUser(u);
            setUser(u);
            setShowAuth(false);
          }}
        />
      )}
    </div>
  );
}

/* ============================================================================
   Dashboard with sparks + donut + mini bars
============================================================================ */

function StatCard({
  label,
  value,
  icon,
  spark,
  color,
  fill,
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  spark?: number[];
  color?: string;
  fill?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between">
      <div>
        <div className="text-sm text-slate-600">{label}</div>
        <div className="mt-1 text-2xl font-bold">{value}</div>
        {spark && (
          <div className="mt-2">
            <Sparkline data={spark} color={color} fill={fill} />
          </div>
        )}
      </div>
      <div className="opacity-70">{icon}</div>
    </div>
  );
}

function Dashboard({
  vehicles,
  openTasks,
  counts,
  avgCompliance,
  spark,
  next6,
}: {
  vehicles: Vehicle[];
  openTasks: Task[];
  counts: { valid: number; expiring: number; expired: number; missing: number; total: number };
  avgCompliance: number;
  spark: { valid: number[]; expiring: number[]; expired: number[]; tasks: number[] };
  next6: number[];
}) {
  const totalVehicles = vehicles.length;

  const donutValues = [counts.valid, counts.expiring, counts.expired, counts.missing];
  const donutColors = ['#059669', '#d97706', '#e11d48', '#94a3b8']; // emerald, amber, rose, slate-400

  // --- Overdue items (Expired documents) ---
  const overdue = useMemo(() => {
    const rows = vehicles.flatMap((v) =>
      v.documents
        .filter((d) => d.status === 'Expired')
        .map((d) => ({ vehicleId: v.id, plate: v.plate, vname: v.name, doc: d }))
    );
    // sort by earliest expiry first
    rows.sort((a, b) => {
      const ax = a.doc.expiryDate ? new Date(a.doc.expiryDate).getTime() : 0;
      const bx = b.doc.expiryDate ? new Date(b.doc.expiryDate).getTime() : 0;
      return ax - bx;
    });
    return rows;
  }, [vehicles]);

  // --- Vehicle Health Summary helpers (local to Dashboard; non-invasive) ---
  const statusWeight: Record<DocStatus, number> = {
    Valid: 0,
    'Expiring': 1,
    'Missing': 2,
    'Expired': 3,
  };

  type VehicleHealth = {
    id: string;
    plate: string;
    name: string;
    percent: number;     // compliance percent
    worst: DocStatus;    // worst status among documents
  };

  const vehicleHealth: VehicleHealth[] = vehicles.map((v) => {
    const percent = computeCompliancePercent(v);
    // Worst status (highest weight) across the 5 slots
    const worst = (v.documents.reduce<DocStatus>((acc, d) => {
      return statusWeight[d.status] > statusWeight[acc] ? d.status : acc;
    }, 'Valid')) as DocStatus;
    return { id: v.id, plate: v.plate, name: v.name, percent, worst };
  });

  // Sort by lowest compliance, then by worst status weight
  vehicleHealth.sort((a, b) => {
    if (a.percent !== b.percent) return a.percent - b.percent;
    return statusWeight[b.worst] - statusWeight[a.worst];
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Vehicles"
          value={totalVehicles}
          icon={<FileText />}
          spark={spark.valid.map((v, i) => v + (i % 2))} // small variation
          color="#0f172a"
          fill="#0f172a"
        />
        <StatCard
          label="Open tasks"
          value={openTasks.length}
          icon={<RefreshCw />}
          spark={spark.tasks}
          color="#334155"
          fill="#334155"
        />
        <StatCard
          label="Expiring soon"
          value={counts.expiring}
          icon={<Info />}
          spark={spark.expiring}
          color="#d97706"
          fill="#d97706"
        />
        <StatCard
          label="Avg. compliance"
          value={`${avgCompliance}%`}
          icon={<ShieldCheck />}
          spark={spark.valid}
          color="#059669"
          fill="#059669"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Donut + legend */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold">Compliance mix</h3>
          <div className="mt-4 grid grid-cols-[auto_1fr] items-center gap-6">
            <DonutRing values={donutValues} colors={donutColors} />
            <div className="grid gap-3 text-sm">
              <LegendItem color={donutColors[0]} label="Valid" value={counts.valid} />
              <LegendItem color={donutColors[1]} label="Expiring" value={counts.expiring} />
              <LegendItem color={donutColors[2]} label="Expired" value={counts.expired} />
              <LegendItem color={donutColors[3]} label="Missing" value={counts.missing} />
              <div className="mt-2 text-xs text-slate-500">
                Total documents: <span className="font-medium text-slate-700">{counts.total}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming expiries in next 6 months */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold">Upcoming expiries (next 6 months)</h3>
          <div className="mt-4 flex items-end gap-4">
            <MiniBars data={next6} color="#d97706" />
          </div>
          <div className="mt-2 grid grid-cols-6 text-center text-xs text-slate-600">
            {next6MonthLabels().map((m) => (
              <div key={m}>{m}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Vehicle Health Summary */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Vehicle health summary</h3>
          <span className="text-xs text-slate-500">Lowest compliance first</span>
        </div>
        <div className="mt-4 grid gap-3">
          {vehicleHealth.length === 0 && (
            <div className="text-sm text-slate-500">No vehicles yet.</div>
          )}
          {vehicleHealth.map((vh) => (
            <div key={vh.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3">
              <div className="min-w-0">
                <div className="font-medium truncate">{vh.plate} <span className="text-slate-500 font-normal">• {vh.name}</span></div>
                <div className="mt-1 flex items-center gap-3">
                  <div className="h-2 w-40 rounded-full bg-slate-100 overflow-hidden">
                    <div className={`h-full ${vh.percent >= 80 ? 'bg-emerald-600' : vh.percent >= 50 ? 'bg-amber-600' : 'bg-rose-600'}`} style={{ width: `${vh.percent}%` }} />
                  </div>
                  <span className="text-xs text-slate-600">{vh.percent}% compliant</span>
                </div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${badgeClass(vh.worst)}`}>{vh.worst === 'Missing' ? 'Add' : vh.worst}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Overdue items panel */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Overdue items</h3>
          <span className="text-xs text-slate-500">Expired documents</span>
        </div>
        <div className="mt-4">
          {overdue.length === 0 ? (
            <div className="text-sm text-slate-500">No overdue items. Nice work!</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {overdue.map((row) => (
                <div key={row.doc.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {row.plate} <span className="text-slate-500 font-normal">• {row.vname}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-slate-600">
                      {row.doc.type} — expired {row.doc.expiryDate ? `on ${row.doc.expiryDate}` : 'date unknown'}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${badgeClass('Expired')}`}>Expired</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-sm text-slate-600">
          Tip: Add vehicles to auto‑create a Compliance Binder (Registration, Insurance, CVOR,
          Inspection, PM Service). Compliance starts at 0% and rises as files are added — tasks are
          generated when items become <span className="font-medium text-amber-700">Expiring</span>.
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: color }} />
      <div className="flex-1">{label}</div>
      <div className="font-medium text-slate-900">{value}</div>
    </div>
  );
}

/* ============================================================================
   Vehicles Tab
============================================================================ */

function VehiclesTab({
  vehicles,
  addVehicle,
  addVehiclesBulk,
  setDocument,
  upsertByType,
  drivers,
}: {
  vehicles: Vehicle[];
  addVehicle: (p: { name: string; plate: string; vin?: string; province?: string; make?: string; model?: string }) => void;
  addVehiclesBulk: (rows: VehicleCSVRow[]) => void;
  setDocument: (vehicleId: string, docId: string, patch: Partial<Omit<DocumentRec, 'id' | 'type'>>) => void;
  upsertByType: (
    vehicleId: string,
    type: DocType,
    payload: { issueDate: string | null; expiryDate: string | null; file: DocFile | null },
  ) => void;
  drivers: User[];
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  const selected = vehicles.find((v) => v.id === selectedVehicleId) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Vehicles</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
            title="Import vehicles from CSV"
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-white text-sm shadow hover:shadow-md transition"
          >
            <Plus className="h-4 w-4" />
            Add Vehicle
          </button>
        </div>
      </div>

      {/* List */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-visible">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/80 text-slate-600">
            <tr className="text-left">
              <th className="px-4 py-3">Make & Model</th>
              <th className="px-4 py-3">Plate</th>
              <th className="px-4 py-3 hidden md:table-cell">VIN</th>
              <th className="px-4 py-3">Province</th>
              <th className="px-4 py-3">Compliance</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v) => (
              <tr key={v.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  {[v.make, v.model].filter(Boolean).join(' ') || '—'}
                </td>
                <td className="px-4 py-3 font-medium">{v.plate}</td>
                <td className="px-4 py-3 hidden md:table-cell">{v.vin ?? '—'}</td>
                <td className="px-4 py-3">{v.province ?? '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-28 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-slate-900"
                        style={{ width: `${computeCompliancePercent(v)}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-600">{computeCompliancePercent(v)}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-2">
                    <AssignButton vehicleId={v.id} plate={v.plate} drivers={drivers} />
                    <button
                      onClick={() => setSelectedVehicleId(v.id)}
                      className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
                    >
                      Open Binder
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {vehicles.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                  No vehicles yet. Add your first vehicle to create a Compliance Binder.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Binder */}
      {selected && (
        <VehicleBinder
          vehicle={selected}
          onClose={() => setSelectedVehicleId(null)}
          setDocument={setDocument}
          upsertByType={upsertByType}
        />
      )}

      {/* Add Vehicle Dialog */}
      {showAdd && <AddVehicleDialog onClose={() => setShowAdd(false)} onSave={addVehicle} />}
      {showImport && (
        <ImportVehiclesDialog
          onClose={() => setShowImport(false)}
          onImport={(rows) => {
            addVehiclesBulk(rows);
            setShowImport(false);
          }}
        />
      )}
    </div>
  );
}

function AssignButton({ vehicleId, plate, drivers }: { vehicleId: string; plate: string; drivers: User[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
        title="Assign to driver"
      >
        Assign
      </button>
      {open && (
        <AssignDriverPicker
          vehicleId={vehicleId}
          plate={plate}
          drivers={drivers}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function AssignDriverPicker({ vehicleId, plate, drivers, onClose }: { vehicleId: string; plate: string; drivers: User[]; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return drivers;
    return drivers.filter(d =>
      d.name.toLowerCase().includes(s) ||
      d.email.toLowerCase().includes(s) ||
      (d.employeeNumber || '').toLowerCase().includes(s)
    );
  }, [q, drivers]);

  function doAssign(toEmail: string) {
    const key = toEmail.trim().toLowerCase();
    if (!key) return;
    const a = loadAssignments();
    const set = new Set(a[key] ?? []);
    set.add(vehicleId);
    a[key] = Array.from(set);
    saveAssignments(a);
    setNote(`Assigned ${plate} to ${key}`);
    setTimeout(onClose, 700);
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/30 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Assign vehicle</h3>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-slate-100">✕</button>
        </div>
        <div className="mt-2 text-sm text-slate-600">Vehicle: <span className="font-medium">{plate}</span></div>

        <div className="mt-4 grid gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search drivers by name, email, employee #"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
          />

          <div className="max-h-64 overflow-auto rounded-xl border border-slate-200">
            {filtered.length === 0 && (
              <div className="p-3 text-sm text-slate-500">No matching drivers.</div>
            )}
            {filtered.map((d) => (
              <button
                key={d.id}
                onClick={() => doAssign(d.email)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{d.name}</div>
                  <div className="text-slate-600 truncate">{d.email}</div>
                </div>
                <span className="ml-3 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700">{d.employeeNumber || '—'}</span>
              </button>
            ))}
          </div>

          <div className="text-xs text-slate-500">Or assign by email:</div>
          <div className="flex items-center gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="driver@company.com"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            />
            <button onClick={() => doAssign(email)} className="rounded-xl bg-slate-900 px-3 py-2 text-white text-sm">Assign</button>
          </div>

          {note && <div className="text-emerald-700 text-sm">{note}</div>}
        </div>
      </div>
    </div>
  );
}

function ImportVehiclesDialog({ onClose, onImport }: { onClose: () => void; onImport: (rows: VehicleCSVRow[]) => void }) {
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<VehicleCSVRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || '');
        const parsed = parseCSV(text);
        setRows(parsed);
      } catch (err: any) {
        setError(err?.message || 'Failed to parse file');
        setRows([]);
      }
    };
    reader.readAsText(f);
  }

  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-black/30 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Import Vehicles (CSV)</h3>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid gap-3 text-sm">
          <div>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFile}
              className="block w-full rounded-xl border border-slate-200 px-3 py-2 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-white"
            />
            <div className="mt-2 text-slate-600">
              Template headers: <code>plate, make, model, vin, province, name</code>
            </div>
            {fileName && (
              <div className="mt-1 text-slate-600">Selected: <span className="font-medium">{fileName}</span></div>
            )}
            {error && <div className="mt-2 text-rose-600">{error}</div>}
            {rows.length > 0 && (
              <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                Parsed <span className="font-medium">{rows.length}</span> vehicles.
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-3 py-1.5">Cancel</button>
          <button
            disabled={rows.length === 0}
            onClick={() => onImport(rows)}
            className="rounded-xl bg-slate-900 px-4 py-2 text-white shadow hover:shadow-md disabled:opacity-50"
          >
            Import {rows.length > 0 ? `(${rows.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

function VehicleBinder({
  vehicle,
  onClose,
  setDocument,
  upsertByType,
}: {
  vehicle: Vehicle;
  onClose: () => void;
  setDocument: (vehicleId: string, docId: string, patch: Partial<Omit<DocumentRec, 'id' | 'type'>>) => void;
  upsertByType: (
    vehicleId: string,
    type: DocType,
    payload: { issueDate: string | null; expiryDate: string | null; file: DocFile | null },
  ) => void;
}) {
  const [showUploadForType, setShowUploadForType] = useState<DocType | null>(null);
  const plate = vehicle.plate;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Compliance Binder — {vehicle.name}</h3>
          <div className="text-sm text-slate-600">Licence plate: {plate}</div>
        </div>
        <button onClick={onClose} className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm">
          Close
        </button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {vehicle.documents.map((d) => (
          <div key={d.id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="font-semibold">{d.type}</div>
              <span className={`text-xs px-2 py-1 rounded-full ${badgeClass(d.status)}`}>
                {d.status === 'Missing' ? 'Add' : d.status}
              </span>
            </div>

            <div className="mt-3 text-sm space-y-1">
              <div>
                <span className="text-slate-600">Issued:</span>{' '}
                {d.issueDate ? d.issueDate : <em className="text-slate-400">—</em>}
              </div>
              <div>
                <span className="text-slate-600">Expires:</span>{' '}
                {d.expiryDate ? d.expiryDate : <em className="text-slate-400">—</em>}
              </div>
              <div className="truncate">
                <span className="text-slate-600">File:</span>{' '}
                {d.file ? (
                  <a className="text-slate-900 underline" href={d.file.url} target="_blank">
                    {d.file.name}
                  </a>
                ) : (
                  <em className="text-slate-400">—</em>
                )}
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              {d.file ? (
                <button
                  onClick={() => setShowUploadForType(d.type)}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
                >
                  <Upload className="h-4 w-4" />
                  Replace
                </button>
              ) : (
                <button
                  onClick={() => setShowUploadForType(d.type)}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
                >
                  <FilePlus2 className="h-4 w-4" />
                  Add Document
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showUploadForType && (
        <UploadDocDialog
          onClose={() => setShowUploadForType(null)}
          onSave={(payload) => {
            upsertByType(vehicle.id, showUploadForType, payload);
            setShowUploadForType(null);
          }}
          type={showUploadForType}
          initial={{
            issueDate: null,
            expiryDate: null,
            file: null,
          }}
        />
      )}
    </div>
  );
}

function AddVehicleDialog({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (p: { name: string; plate: string; vin?: string; province?: string; make?: string; model?: string }) => void;
}) {
  const [name, setName] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [plate, setPlate] = useState('');
  const [vin, setVin] = useState('');
  const [province, setProvince] = useState('');

  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-black/30 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Add Vehicle</h3>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          <label className="text-sm">
            Unit Name (optional)
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Unit 300"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
            />
          </label>
          <label className="text-sm">
            Make
            <input
              value={make}
              onChange={(e) => setMake(e.target.value)}
              placeholder="Freightliner"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
            />
          </label>
          <label className="text-sm">
            Model
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Cascadia"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
            />
          </label>
          <label className="text-sm">
            Licence Plate
            <input
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
              placeholder="ABC-123"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
            />
          </label>
          <label className="text-sm">
            VIN
            <input
              value={vin}
              onChange={(e) => setVin(e.target.value)}
              placeholder="1XKAD49X5AJ123456"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
            />
          </label>
          <label className="text-sm">
            Province
            <input
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              placeholder="ON"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
            />
          </label>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-3 py-1.5">
            Cancel
          </button>
          <button
            onClick={() => {
              if (!plate.trim()) return;
              onSave({
                name: name.trim() || plate.trim(),
                plate: plate.trim(),
                vin: vin.trim() || undefined,
                province: province.trim() || undefined,
                make: make.trim() || undefined,
                model: model.trim() || undefined,
              });
              onClose();
            }}
            className="rounded-xl bg-slate-900 px-4 py-2 text-white shadow hover:shadow-md"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function UploadDocDialog({
  onClose,
  onSave,
  type,
  initial,
}: {
  onClose: () => void;
  onSave: (data: { issueDate: string | null; expiryDate: string | null; file: DocFile | null }) => void;
  type: DocType;
  initial: { issueDate: string | null; expiryDate: string | null; file: DocFile | null };
}) {
  // Prefill if adding: today + one year
  const isAdd = !initial.issueDate && !initial.expiryDate;

  const [issueDate, setIssueDate] = useState<string | null>(initial.issueDate ?? null);
  const [expiryDate, setExpiryDate] = useState<string | null>(initial.expiryDate ?? null);
  const [fileName, setFileName] = useState<string>(initial.file?.name ?? '');
  const [fileUrl, setFileUrl] = useState<string>(initial.file?.url ?? '');

  useEffect(() => {
    if (isAdd) {
      const start = todayISO();
      setIssueDate(start);
      setExpiryDate(addYearsISO(start, 1));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isAdd && issueDate && (!expiryDate || expiryDate <= issueDate)) {
      setExpiryDate(addYearsISO(issueDate, 1));
    }
  }, [isAdd, issueDate]); // keep expiry in sync when auto mode

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    setFileUrl(URL.createObjectURL(f)); // demo; replace with upload URL in prod
  }

  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-black/30 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{isAdd ? 'Add' : 'Replace'} {type}</h3>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          <div className="grid gap-2 md:grid-cols-2">
            <label className="text-sm">
              Issue Date
              <input
                type="date"
                value={issueDate ?? ''}
                onChange={(e) => setIssueDate(e.target.value || null)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
              />
            </label>
            <label className="text-sm">
              Expiry Date
              <input
                type="date"
                value={expiryDate ?? ''}
                onChange={(e) => setExpiryDate(e.target.value || null)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
              />
            </label>
          </div>

          <label className="text-sm">
            File
            <input
              type="file"
              onChange={handleFile}
              className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-white"
            />
          </label>

          {fileName && (
            <div className="text-sm text-slate-600">
              Selected: <span className="font-medium">{fileName}</span>
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-3 py-1.5">
            Cancel
          </button>
          <button
            onClick={() => {
              onSave({
                issueDate,
                expiryDate,
                file: fileUrl ? { url: fileUrl, name: fileName || 'document.pdf' } : null,
              });
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-white shadow hover:shadow-md"
          >
            <Upload className="h-4 w-4" />
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   Tasks Tab
============================================================================ */

function TasksTab({
  openTasks,
  completedTasks,
  onToggle,
  onDelete,
  vehicles,
}: {
  openTasks: Task[];
  completedTasks: Task[];
  onToggle: (taskId: string, done: boolean) => void;
  onDelete: (taskId: string) => void;
  vehicles: Vehicle[];
}) {
  function vehiclePlateOf(task: Task): string {
    if (!task.vehicleId) return '—';
    const v = vehicles.find((x) => x.id === task.vehicleId);
    return v?.plate ?? '—';
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* All tasks */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3 font-semibold">All Tasks</div>
        <div className="divide-y divide-slate-100">
          {openTasks.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-slate-500">No open tasks.</div>
          )}
          {openTasks.map((t) => (
            <div key={t.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={false}
                  onChange={(e) => onToggle(t.id, e.currentTarget.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <div>
                  <div className="font-medium">{t.title}</div>
                  <div className="text-xs text-slate-600">
                    Vehicle: {vehiclePlateOf(t)}{' '}
                    {t.dueDate ? (
                      <>
                        • Due <span className="font-medium">{t.dueDate}</span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
              <button
                onClick={() => onDelete(t.id)}
                className="rounded-full p-2 hover:bg-slate-100 text-slate-600"
                title="Delete task"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Completed tasks */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3 font-semibold">Completed Tasks</div>
        <div className="divide-y divide-slate-100">
          {completedTasks.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-slate-500">No completed tasks yet.</div>
          )}
          {completedTasks.map((t) => (
            <div key={t.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <div>
                  <div className="font-medium line-through text-slate-500">{t.title}</div>
                  <div className="text-xs text-slate-600">
                    Completed • Vehicle: {vehicles.find((v) => v.id === t.vehicleId)?.plate ?? '—'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => onDelete(t.id)}
                className="rounded-full p-2 hover:bg-slate-100 text-slate-600"
                title="Delete task"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   Drivers Tab
============================================================================ */

function DriversTab({ vehicles, drivers, setDrivers }: { vehicles: Vehicle[]; drivers: User[]; setDrivers: React.Dispatch<React.SetStateAction<User[]>>; }) {
  const [query, setQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [refresh, setRefresh] = useState(0); // bump to rerender after assignments change
  const [editDriver, setEditDriver] = useState<User | null>(null);
  const [newEmployeeNo, setNewEmployeeNo] = useState('');
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);
  const [addVehicleFor, setAddVehicleFor] = useState<string | null>(null);

  function assignedIds(email: string): string[] {
    const a = loadAssignments();
    return a[email.toLowerCase()] ?? [];
  }

  function assign(email: string, vehicleId: string) {
    const key = email.toLowerCase();
    const a = loadAssignments();
    const set = new Set(a[key] ?? []);
    set.add(vehicleId);
    a[key] = Array.from(set);
    saveAssignments(a);
    setRefresh((n) => n + 1);
  }

  function unassign(email: string, vehicleId: string) {
    const key = email.toLowerCase();
    const a = loadAssignments();
    const set = new Set(a[key] ?? []);
    set.delete(vehicleId);
    a[key] = Array.from(set);
    saveAssignments(a);
    setRefresh((n) => n + 1);
  }

  const filteredDrivers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return drivers;
    return drivers.filter(d =>
      d.name.toLowerCase().includes(q) ||
      d.email.toLowerCase().includes(q) ||
      (d.employeeNumber || '').toLowerCase().includes(q) ||
      (d.licenseNumber || '').toLowerCase().includes(q) ||
      (d.licenseClass || '').toLowerCase().includes(q)
    );
  }, [drivers, query]);

  function addDriver() {
    if (!newEmail.trim() || !newName.trim()) return;
    const email = newEmail.trim();
    if (drivers.some(d => d.email.toLowerCase() === email.toLowerCase())) {
      setShowAdd(false); return;
    }
    setDrivers(prev => [...prev, { id: uid('driver'), name: newName.trim(), email, employeeNumber: newEmployeeNo.trim() || undefined }]);
    setNewEmail(''); setNewName(''); setNewEmployeeNo(''); setShowAdd(false);
  }

  function removeDriver(id: string) {
    setDrivers(prev => prev.filter(d => d.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Drivers</h2>
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search drivers..."
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
          />
          <button onClick={() => setShowAdd(true)} className="rounded-xl bg-slate-900 px-4 py-2 text-white text-sm shadow hover:shadow-md">Add driver</button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-visible">
        <table className="w-full text-sm table-auto">
          <colgroup>
            <col className="w-[180px]" />   {/* Name */}
            <col className="w-[280px]" />   {/* Email */}
            <col className="w-[120px]" />   {/* Employee # */}
            <col className="w-[160px]" />   {/* License # */}
            <col className="w-[80px]" />    {/* Class */}
            <col className="w-[110px]" />   {/* Expiry */}
            <col className="w-[110px]" />   {/* Status */}
            <col />                          {/* Assigned vehicles (flex) */}
            <col className="w-[320px]" />   {/* Actions */}
          </colgroup>
          <thead className="bg-slate-50/80 text-slate-600">
            <tr className="text-left">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Employee #</th>
              <th className="px-4 py-3">License #</th>
              <th className="px-4 py-3">Class</th>
              <th className="px-4 py-3">Expiry</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Assigned vehicles</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filteredDrivers.map(d => {
              const ids = assignedIds(d.email);
              const assigned = vehicles.filter(v => ids.includes(v.id));
              const available = vehicles.filter(v => !ids.includes(v.id));
              return (
                <tr key={d.id} className="border-t border-slate-100 align-top">
                  <td className="px-4 py-3 font-medium">{d.name}</td>
                  <td className="px-4 py-3 align-top">
                    <span className="inline-block max-w-[260px] truncate align-top" title={d.email}>
                      {d.email}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span className="inline-block rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700">
                      {d.employeeNumber ? d.employeeNumber : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-top">{d.licenseNumber ? d.licenseNumber : '—'}</td>
                  <td className="px-4 py-3 align-top">{d.licenseClass ? d.licenseClass : '—'}</td>
                  <td className="px-4 py-3 align-top">{d.licenseExpiry ? d.licenseExpiry : '—'}</td>
                  <td className="px-4 py-3 align-top">
                    {(() => { const s = licenseStatus(d.licenseExpiry); return (
                      <span className={`inline-block rounded-md px-2 py-1 text-xs ${s.cls}`}>{s.label}</span>
                    ); })()}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-col gap-2 min-w-[10rem]">
                      {assigned.map(v => (
                        <span
                          key={v.id}
                          className="w-fit inline-flex items-center gap-2 rounded-full border border-slate-200 px-2 py-1 text-xs"
                        >
                          {v.plate}
                          <button
                            onClick={() => unassign(d.email, v.id)}
                            className="rounded-full p-0.5 hover:bg-slate-100"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                      {assigned.length === 0 && (
                        <span className="text-slate-500 text-xs">None</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 relative">
                    <div className="flex items-center justify-end">
                      <button
                        onClick={() => setOpenMenuFor(openMenuFor === d.id ? null : d.id)}
                        className="rounded-xl border border-slate-200 p-1.5 hover:bg-slate-50"
                        title="Actions"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>

                    {openMenuFor === d.id && (
                      <div className="absolute right-2 z-50 mt-2 w-44 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                        <button
                          onClick={() => { setEditDriver(d); setOpenMenuFor(null); }}
                          className="block w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-50"
                        >
                          Edit driver
                        </button>
                        <button
                          onClick={() => { setAddVehicleFor(d.id); setOpenMenuFor(null); }}
                          className="block w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-50"
                        >
                          Add vehicle
                        </button>
                        <button
                          onClick={() => { removeDriver(d.id); setOpenMenuFor(null); }}
                          className="block w-full rounded-lg px-2 py-1.5 text-left text-sm text-rose-600 hover:bg-rose-50"
                        >
                          Remove driver
                        </button>
                      </div>
                    )}

                    {/* Controlled vehicle adder popover */}
                    <div className="absolute right-2">
                      <DriverAddVehicleMenu
                        driver={d}
                        vehicles={available}
                        onAdd={(vid) => { assign(d.email, vid); }}
                        onRemoveDriver={() => removeDriver(d.id)}
                        open={addVehicleFor === d.id}
                        setOpen={(v) => setAddVehicleFor(v ? d.id : null)}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredDrivers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">No drivers found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Add driver</h3>
              <button onClick={() => setShowAdd(false)} className="rounded-full p-1 hover:bg-slate-100">✕</button>
            </div>
            <div className="mt-4 grid gap-3 text-sm">
              <label>Full name
                <input value={newName} onChange={(e) => setNewName(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300" />
              </label>
              <label>Email
                <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300" />
              </label>
              <label>Employee # (optional)
                <input value={newEmployeeNo} onChange={(e) => setNewEmployeeNo(e.target.value)} placeholder="e.g., 1042" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300" />
              </label>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button onClick={() => setShowAdd(false)} className="rounded-xl border border-slate-200 px-3 py-1.5">Cancel</button>
              <button onClick={addDriver} className="rounded-xl bg-slate-900 px-4 py-2 text-white shadow hover:shadow-md">Save</button>
            </div>
          </div>
        </div>
      )}
      {editDriver && (
        <EditDriverDialog
          driver={editDriver}
          onClose={() => setEditDriver(null)}
          onSave={(updated) => {
            setDrivers(prev => prev.map(d => d.id === updated.id ? updated : d));
            setEditDriver(null);
          }}
        />
      )}
    </div>
  );
}

function EditDriverDialog({
  driver,
  onClose,
  onSave,
}: {
  driver: User;
  onClose: () => void;
  onSave: (u: User) => void;
}) {
  const [name, setName] = React.useState(driver.name);
  const [email, setEmail] = React.useState(driver.email);
  const [emp, setEmp] = React.useState(driver.employeeNumber ?? '');
  const [licNo, setLicNo] = React.useState(driver.licenseNumber ?? '');
  const [licClass, setLicClass] = React.useState(driver.licenseClass ?? '');
  const [licExpiry, setLicExpiry] = React.useState(driver.licenseExpiry ?? '');

  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Edit driver</h3>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-slate-100">✕</button>
        </div>

        <div className="mt-4 grid gap-3 text-sm">
          <label>Full name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
            />
          </label>
          <label>Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
            />
          </label>
          <label>Employee #
            <input
              value={emp}
              onChange={(e) => setEmp(e.target.value)}
              placeholder="e.g., 1042"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
            />
          </label>
          <label>License #
            <input
              value={licNo}
              onChange={(e) => setLicNo(e.target.value)}
              placeholder="e.g., M1234-567890-12345"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
            />
          </label>
          <label>License class
            <input
              value={licClass}
              onChange={(e) => setLicClass(e.target.value)}
              placeholder="e.g., G, AZ, DZ"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
            />
          </label>
          <label>License expiry
            <input
              type="date"
              value={licExpiry}
              onChange={(e) => setLicExpiry(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
            />
          </label>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-3 py-1.5">Cancel</button>
          <button
            onClick={() => {
              const updated: User = {
                ...driver,
                name: name.trim(),
                email: email.trim(),
                employeeNumber: emp.trim() || undefined,
                licenseNumber: licNo.trim() || undefined,
                licenseClass: licClass.trim() || undefined,
                licenseExpiry: licExpiry || undefined,
              };
              onSave(updated);
            }}
            className="rounded-xl bg-slate-900 px-4 py-2 text-white shadow hover:shadow-md"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function DriverAddVehicleMenu({
  driver,
  vehicles,
  onAdd,
  onRemoveDriver,
  open,
  setOpen,
}: {
  driver: User;
  vehicles: Vehicle[];
  onAdd: (id: string) => void;
  onRemoveDriver: () => void;
  open?: boolean;
  setOpen?: (v: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const controlled = typeof open !== 'undefined' && typeof setOpen !== 'undefined';
  const isOpen = controlled ? (open as boolean) : internalOpen;
  const setIsOpen = controlled ? (setOpen as (v: boolean) => void) : setInternalOpen;
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return vehicles;
    return vehicles.filter(v =>
      v.plate.toLowerCase().includes(s) ||
      (v.make ?? '').toLowerCase().includes(s) ||
      (v.model ?? '').toLowerCase().includes(s)
    );
  }, [q, vehicles]);

  return (
    <div className="relative inline-block text-left">
      {!controlled && (
        <>
          <button onClick={() => setIsOpen(o => !o)} className="whitespace-nowrap rounded-xl border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50">Add vehicle</button>
          <button onClick={onRemoveDriver} className="ml-2 whitespace-nowrap rounded-xl border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50">Remove driver</button>
        </>
      )}
      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search vehicles..." className="mb-2 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-slate-300" />
          <div className="max-h-60 overflow-auto">
            {filtered.map(v => (
              <button key={v.id} onClick={() => { onAdd(v.id); setIsOpen(false); setQ(''); }} className="block w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-50">
                {v.plate} <span className="text-slate-500">• {[v.make, v.model].filter(Boolean).join(' ') || '—'}</span>
              </button>
            ))}
            {filtered.length === 0 && <div className="px-2 py-2 text-sm text-slate-500">No matches</div>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   Documents Tab
============================================================================ */

function DocumentsTab({
  vehicles,
  setDocument,
}: {
  vehicles: Vehicle[];
  setDocument: (vehicleId: string, docId: string, patch: Partial<Omit<DocumentRec, 'id' | 'type'>>) => void;
}) {
  const [replaceDoc, setReplaceDoc] = useState<{
    vehicleId: string;
    doc: DocumentRec;
  } | null>(null);

  const allDocs = useMemo(() => {
    return vehicles.flatMap((v) =>
      v.documents.map((d) => ({
        vehicleId: v.id,
        plate: v.plate, // <- licence plate instead of "v1"
        vname: v.name,
        doc: d,
      })),
    );
  }, [vehicles]);

  // Filters: by vehicle + quick search
  const [vehFilter, setVehFilter] = useState<string>('all');
  const [docQuery, setDocQuery] = useState('');

  const filteredRows = useMemo(() => {
    let arr = allDocs;

    if (vehFilter !== 'all') {
      arr = arr.filter((r) => r.vehicleId === vehFilter);
    }

    const q = docQuery.trim().toLowerCase();
    if (q) {
      arr = arr.filter((r) =>
        r.plate.toLowerCase().includes(q) ||
        r.vname.toLowerCase().includes(q) ||
        r.doc.type.toLowerCase().includes(q) ||
        (r.doc.file?.name?.toLowerCase().includes(q) ?? false)
      );
    }
    return arr;
  }, [allDocs, vehFilter, docQuery]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Documents</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              value={docQuery}
              onChange={(e) => setDocQuery(e.target.value)}
              placeholder="Search docs, plates, names..."
              className="pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm w-[260px] outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>
          <select
            value={vehFilter}
            onChange={(e) => setVehFilter(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            title="Filter by vehicle"
          >
            <option value="all">All vehicles</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.plate} • {[v.make, v.model].filter(Boolean).join(' ') || v.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/80 text-slate-600">
            <tr className="text-left">
              <th className="px-4 py-3">Vehicle (Plate)</th>
              <th className="px-4 py-3">Document</th>
              <th className="px-4 py-3">Issued</th>
              <th className="px-4 py-3">Expires</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.doc.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <div className="font-medium">{row.plate}</div>
                  <div className="text-xs text-slate-500">{row.vname}</div>
                </td>
                <td className="px-4 py-3">{row.doc.type}</td>
                <td className="px-4 py-3">{row.doc.issueDate ?? '—'}</td>
                <td className="px-4 py-3">{row.doc.expiryDate ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${badgeClass(row.doc.status)}`}>
                    {row.doc.status === 'Missing' ? 'Add' : row.doc.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setReplaceDoc({ vehicleId: row.vehicleId, doc: row.doc })}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
                  >
                    {row.doc.file ? 'Replace' : 'Add'}
                  </button>
                </td>
              </tr>
            ))}
            {allDocs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                  No documents yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {replaceDoc && (
        <UploadDocDialog
          onClose={() => setReplaceDoc(null)}
          onSave={(payload) => {
            setDocument(replaceDoc.vehicleId, replaceDoc.doc.id, payload);
            setReplaceDoc(null);
          }}
          type={replaceDoc.doc.type}
          initial={{
            issueDate: replaceDoc.doc.issueDate ?? null,
            expiryDate: replaceDoc.doc.expiryDate ?? null,
            file: replaceDoc.doc.file ?? null,
          }}
        />
      )}
    </div>
  );
}

/* ============================================================================
   Reports Tab
============================================================================ */

function ReportsTab({ vehicles, tasks }: { vehicles: Vehicle[]; tasks: Task[] }) {
  // Count summaries (kept for top cards if you add later)
  const totalVehicles = vehicles.length;
  const docs = vehicles.flatMap((v) => v.documents);
  const valid = docs.filter((d) => d.status === 'Valid').length;
  const expiring = docs.filter((d) => d.status === 'Expiring').length;
  const expired = docs.filter((d) => d.status === 'Expired').length;
  const missing = docs.filter((d) => d.status === 'Missing').length;

  async function onDownload(vehicle: Vehicle) {
    try {
      await downloadVehicleAuditReport(vehicle);
    } catch (err) {
      console.error('Failed to build audit PDF', err);
      alert('Sorry, there was a problem generating the PDF. Check the browser console for details.');
    }
  }

  return (
    <div className="space-y-6">
      {/* Optional summary tiles you already had */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold">Compliance Overview</h3>
          <div className="mt-4 grid gap-2 text-sm">
            <div className="flex items-center justify-between"><span>Total vehicles</span><span className="font-medium">{totalVehicles}</span></div>
            <div className="flex items-center justify-between"><span>Documents (Valid)</span><span className="font-medium">{valid}</span></div>
            <div className="flex items-center justify-between"><span>Documents (Expiring)</span><span className="font-medium">{expiring}</span></div>
            <div className="flex items-center justify-between"><span>Documents (Expired)</span><span className="font-medium">{expired}</span></div>
            <div className="flex items-center justify-between"><span>Documents (Missing)</span><span className="font-medium">{missing}</span></div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold">Tasks Summary</h3>
          <div className="mt-4 grid gap-2 text-sm">
            <div className="flex items-center justify-between"><span>Open</span><span className="font-medium">{tasks.filter((t) => !t.completed).length}</span></div>
            <div className="flex items-center justify-between"><span>Completed</span><span className="font-medium">{tasks.filter((t) => t.completed).length}</span></div>
          </div>
        </div>
      </div>

      {/* Vehicle list with audit report download */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-4 py-3 font-semibold">Vehicle Reports</div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50/80 text-slate-600">
            <tr className="text-left">
              <th className="px-4 py-3">Plate</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Make/Model</th>
              <th className="px-4 py-3">Documents</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v) => {
              const present = v.documents.filter((d) => !!d.file && !!d.file.url);
              return (
                <tr key={v.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium">{v.plate}</td>
                  <td className="px-4 py-3">{v.name || '—'}</td>
                  <td className="px-4 py-3">{[v.make, v.model].filter(Boolean).join(' ') || '—'}</td>
                  <td className="px-4 py-3">{present.length}/{v.documents.length}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onDownload(v)}
                      className="rounded-xl bg-slate-900 px-3 py-1.5 text-white shadow hover:shadow-md"
                    >
                      Download audit report
                    </button>
                  </td>
                </tr>
              );
            })}
            {vehicles.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">No vehicles available.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---- Audit PDF generator (client-side, uses pdf-lib via CDN) ----
async function loadPdfLib(): Promise<any> {
  if (typeof window === 'undefined') throw new Error('PDF lib must run in the browser');
  const w = window as any;
  if (w.PDFLib) return w.PDFLib;
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load pdf-lib'));
    document.head.appendChild(s);
  });
  return (window as any).PDFLib;
}

async function fetchArrayBuffer(url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

async function downloadVehicleAuditReport(vehicle: Vehicle) {
  const PDFLib = await loadPdfLib();
  const { PDFDocument, StandardFonts, rgb } = PDFLib;

  const doc = await PDFDocument.create();

  // Cover page
  const page = doc.addPage([612, 792]); // Letter portrait
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  let y = 740;
  const margin = 56;
  page.drawText('FleetGuard — Vehicle Audit Report', { x: margin, y, size: 18, font: fontBold, color: rgb(0.06, 0.08, 0.1) });
  y -= 28;
  page.drawText(`Generated: ${new Date().toLocaleString()}`, { x: margin, y, size: 10, font, color: rgb(0.35, 0.4, 0.45) });
  y -= 24;
  page.drawText(`Vehicle: ${vehicle.plate}  •  ${vehicle.name || ''}`.trim(), { x: margin, y, size: 12, font, color: rgb(0.15, 0.18, 0.22) });
  y -= 18;
  page.drawText(`Make/Model: ${[vehicle.make, vehicle.model].filter(Boolean).join(' ') || '—'}`, { x: margin, y, size: 12, font, color: rgb(0.15, 0.18, 0.22) });
  y -= 18;
  page.drawText(`VIN: ${vehicle.vin || '—'}   Province: ${vehicle.province || '—'}`, { x: margin, y, size: 12, font, color: rgb(0.15, 0.18, 0.22) });
  y -= 26;
  page.drawText('Included documents:', { x: margin, y, size: 12, font: fontBold, color: rgb(0.15, 0.18, 0.22) });
  y -= 18;

  const docFiles = vehicle.documents.map(d => ({
    rec: d,
    url: d.file?.url || null,
    name: d.file?.name || `${d.type}.pdf`,
    isPdf: (d.file?.url || '').toLowerCase().endsWith('.pdf') || (d.file?.name || '').toLowerCase().endsWith('.pdf'),
  }));

  for (const info of docFiles) {
    const line = `• ${info.rec.type} — status: ${info.rec.status}` + (info.url ? '' : ' (missing)');
    page.drawText(line, { x: margin, y, size: 11, font, color: rgb(0.2, 0.22, 0.26) });
    y -= 16;
  }

  // Merge PDF files (skip non-PDFs), append pages
  for (const info of docFiles) {
    if (!info.url || !info.isPdf) continue;
    const bytes = await fetchArrayBuffer(info.url);
    if (!bytes) continue;
    try {
      const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const copied = await doc.copyPages(src, src.getPageIndices());
      copied.forEach(p => doc.addPage(p));
    } catch (e) {
      // Skip if not a valid PDF
      console.warn('Skipping non-PDF or unreadable file:', info.name, e);
    }
  }

  const pdfBytes = await doc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `fleetguard-audit-${vehicle.plate}.pdf`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

/* ============================================================================
   Small helpers for dashboard visuals
============================================================================ */

function synthTrend(base: number, points: number, jitter = 0.2): number[] {
  // Create a small up/down trend around the base, with deterministic pseudo randomness
  const out: number[] = [];
  let v = Math.max(base, 0);
  for (let i = 0; i < points; i++) {
    const delta = (Math.sin((i + base) * 1.1) + Math.cos(i * 0.7)) * jitter * Math.max(1, base);
    v = Math.max(0, v + delta);
    out.push(Math.round(v));
  }
  return out;
}

function next6MonthLabels(): string[] {
  const now = new Date();
  const labels: string[] = [];
  const fmt = new Intl.DateTimeFormat('en-CA', { month: 'short' });
  for (let i = 0; i < 6; i++) {
    const d = new Date(now);
    d.setMonth(d.getMonth() + i);
    labels.push(fmt.format(d));
  }
  return labels;
}

function next6MonthsCounts(docs: DocumentRec[]): number[] {
  const now = new Date();
  const buckets = Array(6).fill(0);
  docs.forEach((d) => {
    if (!d.expiryDate) return;
    const exp = new Date(d.expiryDate);
    const months =
      (exp.getFullYear() - now.getFullYear()) * 12 + (exp.getMonth() - now.getMonth());
    if (months >= 0 && months < 6) buckets[months] += 1;
  });
  return buckets;
}
/* ============================================================================
   ProfileMenu & AuthDialog
============================================================================ */

function ProfileMenu({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const initials = user.name
    .split(' ')
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest?.('#profile-menu')) setOpen(false);
    }
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  return (
    <div id="profile-menu" className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-slate-100"
        title={`${user.name} (${user.email})`}
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-900 text-white text-xs">
          {initials}
        </span>
        <span className="hidden sm:block font-medium">{user.name}</span>
        <MoreVertical className="h-4 w-4 text-slate-500" />
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
          <div className="px-2 py-1 text-xs text-slate-500">Signed in as</div>
          <div className="px-2 pb-2 text-sm font-medium">{user.email}</div>
          <button className="w-full text-left rounded-lg px-2 py-1.5 hover:bg-slate-50 text-sm">
            Account
          </button>
          <button className="w-full text-left rounded-lg px-2 py-1.5 hover:bg-slate-50 text-sm">
            Settings
          </button>
          <div className="my-1 border-t border-slate-200" />
          <button
            onClick={onSignOut}
            className="w-full text-left rounded-lg px-2 py-1.5 hover:bg-slate-50 text-sm text-rose-600"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function AuthDialog({ onClose, onSave }: { onClose: () => void; onSave: (name: string, email: string) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Sign in</h3>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          <label className="text-sm">
            Full name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
            />
          </label>
          <label className="text-sm">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@company.com"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
            />
          </label>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-3 py-1.5">
            Cancel
          </button>
          <button
            onClick={() => {
              if (!email.trim() || !name.trim()) return;
              onSave(name, email);
            }}
            className="rounded-xl bg-slate-900 px-4 py-2 text-white shadow hover:shadow-md"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}