'use client';

import React from 'react';

/**
 * Lightweight Driver Portal
 * - Reads assignments from localStorage key 'fg_assignments' (Record<emailLowercase, string[]>)
 * - Reads vehicles from localStorage key 'fleetguard_vehicles' (Vehicle[])
 * - Renders only the vehicles/documents assigned to the logged-in email
 */

type DocStatus = 'Missing' | 'Valid' | 'Expiring' | 'Expired';
type DocType = 'Registration' | 'Insurance' | 'CVOR' | 'Inspection' | 'PM Service';

type DocFile = { url: string; name: string };

type DocumentRec = {
  id: string;
  type: DocType;
  status: DocStatus;
  issueDate?: string | null;
  expiryDate?: string | null;
  file?: DocFile | null;
};

type Vehicle = {
  id: string;
  name: string;
  plate: string;
  vin?: string;
  province?: string;
  make?: string;
  model?: string;
  documents: DocumentRec[];
  createdAt: string;
};

// Driver profile (synced from admin localStorage `fg_drivers`)
const LS_DRIVERS = 'fg_drivers';

type User = {
  id: string;
  name: string;
  email: string;
  employeeNumber?: string;
  licenseNumber?: string;
  licenseClass?: string;  // e.g., G, AZ, DZ
  licenseExpiry?: string; // ISO yyyy-mm-dd
};

const LS_ASSIGN = 'fg_assignments';
const LS_VEHICLES = 'fleetguard_vehicles';
const LS_DRIVER_EMAIL = 'fg_driver_email';

type DriverNotif = { id: string; ts: number; vehicleId: string; plate: string; type: DocType; fileUrl?: string };
const LS_NOTIFS = 'fg_driver_notifs'; // Record<emailLower, DriverNotif[]>
const LS_SEEN_DOCS = 'fg_driver_seen_docs'; // Record<emailLower, string[]> (doc keys)

function loadAssignments(): Record<string, string[]> {
  try {
    const s = localStorage.getItem(LS_ASSIGN);
    return s ? JSON.parse(s) : {};
  } catch {
    return {};
  }
}

function loadVehicles(): Vehicle[] {
  try {
    const s = localStorage.getItem(LS_VEHICLES);
    return s ? (JSON.parse(s) as Vehicle[]) : [];
  } catch {
    return [];
  }
}

function loadDriversStore(): User[] {
  try {
    const s = localStorage.getItem(LS_DRIVERS);
    return s ? (JSON.parse(s) as User[]) : [];
  } catch {
    return [];
  }
}

function daysBetweenToday(iso?: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

function licenseStatus(expiryISO?: string | null): { label: 'Valid' | 'Expiring' | 'Expired' | 'Missing'; cls: string } {
  if (!expiryISO) return { label: 'Missing', cls: 'bg-slate-50 text-slate-600 border border-slate-200' };
  const days = daysBetweenToday(expiryISO);
  if (days === null) return { label: 'Missing', cls: 'bg-slate-50 text-slate-600 border border-slate-200' };
  if (days < 0) return { label: 'Expired', cls: 'bg-rose-50 text-rose-700 border border-rose-200' };
  if (days <= 45) return { label: 'Expiring', cls: 'bg-amber-50 text-amber-700 border border-amber-200' };
  return { label: 'Valid', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' };
}

function loadNotifs(email: string): DriverNotif[] {
  try {
    const all = JSON.parse(localStorage.getItem(LS_NOTIFS) || '{}');
    return Array.isArray(all[email]) ? all[email] : [];
  } catch { return []; }
}
function saveNotifs(email: string, list: DriverNotif[]) {
  try { const all = JSON.parse(localStorage.getItem(LS_NOTIFS) || '{}'); all[email] = list; localStorage.setItem(LS_NOTIFS, JSON.stringify(all)); } catch {}
}
function loadSeen(email: string): Set<string> {
  try { const all = JSON.parse(localStorage.getItem(LS_SEEN_DOCS) || '{}'); return new Set(all[email] || []); } catch { return new Set(); }
}
function saveSeen(email: string, set: Set<string>) {
  try { const all = JSON.parse(localStorage.getItem(LS_SEEN_DOCS) || '{}'); all[email] = Array.from(set); localStorage.setItem(LS_SEEN_DOCS, JSON.stringify(all)); } catch {}
}

function statusBadge(status: DocStatus) {
  switch (status) {
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

export default function DriverPortal() {
  const [email, setEmail] = React.useState<string>('');
  const [input, setInput] = React.useState<string>('');
  const [vehicles, setVehicles] = React.useState<Vehicle[]>([]);
  const [assigned, setAssigned] = React.useState<Vehicle[]>([]);
  const [driver, setDriver] = React.useState<User | null>(null);
  const [query, setQuery] = React.useState('');
  const [tab, setTab] = React.useState<'vehicles'|'notifications'>('vehicles');
  const [notifs, setNotifs] = React.useState<DriverNotif[]>([]);
  const unreadCount = notifs.length; // simple count – all items shown

  // Hide the marketing site header when on the driver portal
  React.useEffect(() => {
    const css = document.createElement('style');
    css.innerHTML = `
      header.site-header, #site-header, header[role="banner"], header[data-site-header], header.marketing-header, body > header {
        display: none !important;
      }
    `;
    document.head.appendChild(css);
    return () => { document.head.removeChild(css); };
  }, []);

  // Load remembered driver
  React.useEffect(() => {
    const saved = localStorage.getItem(LS_DRIVER_EMAIL);
    if (saved) setEmail(saved);
  }, []);

  // Load vehicles when we mount
  React.useEffect(() => {
    setVehicles(loadVehicles());
  }, []);

  // Compute assigned vehicles whenever email/vehicles change
  React.useEffect(() => {
    if (!email) {
      setAssigned([]);
      return;
    }
    const a = loadAssignments();
    const ids = new Set(a[email.toLowerCase()] ?? []);
    const list = loadVehicles().filter(v => ids.has(v.id));
    setAssigned(list);
  }, [email, vehicles]);

  React.useEffect(() => {
    if (!email) { setDriver(null); return; }
    const list = loadDriversStore();
    const found = list.find(u => u.email?.toLowerCase() === email.toLowerCase()) || null;
    setDriver(found);
  }, [email]);

  React.useEffect(() => { if (email) setNotifs(loadNotifs(email)); }, [email]);

  React.useEffect(() => {
    if (!email || assigned.length === 0) return;
    const seen = loadSeen(email);
    const newItems: DriverNotif[] = [];
    assigned.forEach(v => {
      v.documents.forEach(d => {
        if (!d.file?.url) return; // only when a file exists
        const key = `${v.id}:${d.id}:${d.file.url}`;
        if (!seen.has(key)) {
          seen.add(key);
          newItems.push({ id: key, ts: Date.now(), vehicleId: v.id, plate: v.plate, type: d.type, fileUrl: d.file.url });
        }
      });
    });
    if (newItems.length) {
      const updated = [...newItems, ...loadNotifs(email)].slice(0, 200);
      setNotifs(updated);
      saveNotifs(email, updated);
      saveSeen(email, seen);
    }
  }, [email, assigned]);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const value = input.trim().toLowerCase();
    if (!value) return;
    // allow login even if no assignments yet (will show empty state)
    localStorage.setItem(LS_DRIVER_EMAIL, value);
    setEmail(value);
  }

  function signOut() {
    localStorage.removeItem(LS_DRIVER_EMAIL);
    setEmail('');
    setInput('');
  }

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return assigned;
    return assigned.filter(v =>
      v.plate.toLowerCase().includes(q) ||
      (v.make ?? '').toLowerCase().includes(q) ||
      (v.model ?? '').toLowerCase().includes(q) ||
      (v.name ?? '').toLowerCase().includes(q)
    );
  }, [assigned, query]);

  // If not logged in, show email prompt (no admin UI)
  if (!email) {
    return (
      <div className="min-h-[100svh] bg-slate-50 text-slate-900 grid place-items-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Driver access</h1>
          <p className="mt-2 text-sm text-slate-600">
            Enter your company email to view the vehicles and documents assigned to you.
          </p>
          <form className="mt-4 grid gap-3" onSubmit={handleLogin}>
            <label className="text-sm">
              Email
              <input
                type="email"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="you@company.com"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
                required
              />
            </label>
            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-4 py-2 text-white shadow hover:shadow-md"
            >
              Continue
            </button>
          </form>
          <div className="mt-4 text-xs text-slate-500">
            Tip: an admin can assign vehicles to you in the FleetGuard dashboard.
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-[100svh] bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Top bar */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setTab('vehicles')} className={`rounded-xl px-3 py-1.5 text-sm border ${tab==='vehicles'?'bg-slate-900 text-white border-slate-900':'border-slate-200 hover:bg-slate-50'}`}>Vehicles</button>
            <button onClick={() => setTab('notifications')} className={`rounded-xl px-3 py-1.5 text-sm border relative ${tab==='notifications'?'bg-slate-900 text-white border-slate-900':'border-slate-200 hover:bg-slate-50'}`}>
              Notifications
              {unreadCount>0 && <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1 text-xs text-white">{unreadCount}</span>}
            </button>
          </div>
          <div>
            <div className="text-sm text-slate-600">Signed in as <span className="font-medium">{email}</span></div>
            <div className="mt-2 flex items-center gap-2">
              <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search your vehicles..." className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300" />
              <button onClick={signOut} className="rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">Sign out</button>
            </div>
          </div>
        </div>

        {driver && (
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-medium text-slate-500">Driver License</div>
                <div className="mt-1 text-lg font-semibold">{driver.name || driver.email}</div>
                <div className="mt-1 text-sm text-slate-600">Employee #: {driver.employeeNumber || '—'}</div>
              </div>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div>
                  <div className="text-xs text-slate-500">License #</div>
                  <div className="text-sm font-medium">{driver.licenseNumber || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Class</div>
                  <div className="text-sm font-medium">{driver.licenseClass || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Expiry</div>
                  <div className="text-sm font-medium">{driver.licenseExpiry || '—'}</div>
                </div>
                <div className="self-start">
                  {(() => { const s = licenseStatus(driver.licenseExpiry); return (
                    <span className={`inline-block rounded-full px-2 py-1 text-xs ${s.cls}`}>{s.label}</span>
                  ); })()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        {tab==='vehicles' && (filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-sm text-slate-600">
            No vehicles are currently assigned to this email.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {filtered.map((v) => (
              <div key={v.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-semibold">{v.plate}</div>
                    <div className="text-sm text-slate-600">
                      {[v.make, v.model].filter(Boolean).join(' ') || '—'} {v.province ? `• ${v.province}` : ''}
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {v.documents.map((d) => (
                    <div key={d.id} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium">{d.type}</div>
                        <span className={`text-xs px-2 py-1 rounded-full ${statusBadge(d.status)}`}>
                          {d.status === 'Missing' ? 'Add' : d.status}
                        </span>
                      </div>
                      <div className="mt-2 grid gap-1 text-sm">
                        <div className="text-slate-600">Issued: <span className="text-slate-900">{d.issueDate || '—'}</span></div>
                        <div className="text-slate-600">Expires: <span className="text-slate-900">{d.expiryDate || '—'}</span></div>
                        <div className="text-slate-600">
                          File:{' '}
                          {d.file?.url ? (
                            <a href={d.file.url} target="_blank" className="text-slate-900 underline">
                              {d.file.name || 'document.pdf'}
                            </a>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}

        {tab==='notifications' && (
          <div className="space-y-3">
            {notifs.length===0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">No notifications yet. New documents will appear here.</div>
            ) : (
              notifs.map(n => (
                <div key={n.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">New document added</div>
                      <div className="text-sm text-slate-600">{n.type} for vehicle <span className="font-medium text-slate-900">{n.plate}</span></div>
                    </div>
                    <div className="text-xs text-slate-500">{new Date(n.ts).toLocaleString()}</div>
                  </div>
                  {n.fileUrl && (
                    <div className="mt-2 text-sm"><a className="text-slate-900 underline" href={n.fileUrl} target="_blank">View file</a></div>
                  )}
                </div>
              ))
            )}
            {notifs.length>0 && (
              <div className="pt-2">
                <button onClick={()=>{ saveNotifs(email, []); setNotifs([]); }} className="rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">Clear notifications</button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}