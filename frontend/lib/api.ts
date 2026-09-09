const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({} as any));
    throw new Error((data as any).detail || `API ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  base: API_BASE,
  maintenance: (day?: string) =>
    req<any[]>(`/maintenance${day ? `?day=${day}` : ''}`).catch(() => mockMaintenance),
  maintenanceCreate: (payload: any) => req<any>('/maintenance', { method: 'POST', body: JSON.stringify(payload) }),
  trainsLive: (section = 'Bhadrak–Jajpur', day?: string) =>
    req<{ trains: any[] }>(`/trains/live?section=${encodeURIComponent(section)}${day ? `&day=${day}` : ''}`)
      .then((d) => d.trains)
      .catch(() => mockTrains),
  windows: (payload: any) =>
    req<{ windows: any[] }>('/ai/windows', { method: 'POST', body: JSON.stringify(payload) }).then((d) => d.windows),
  fullPlan: (payload: any) => req<any>('/ai/full-plan', { method: 'POST', body: JSON.stringify(payload) }),
  recommend: (windows: any[]) => req<any>('/ai/recommend', { method: 'POST', body: JSON.stringify(windows) }),
  blocks: () => req<any[]>('/blocks').catch(() => []),
  decide: (id: number, decision: string) =>
    req<any>(`/blocks/${id}/decision`, { method: 'POST', body: JSON.stringify({ decision }) }),
  decisions: () => req<any[]>('/decisions').catch(() => []),
  trainsColumns: () => req<any>('/trains/columns').catch(() => null),
  sampleCsvUrl: (day?: string, section = 'Bhadrak–Jajpur') =>
    `${API_BASE}/trains/sample?section=${encodeURIComponent(section)}${day ? `&day=${day}` : ''}`,
  importTimetable: async (file: File, opts?: { replace?: boolean; section?: string; day?: string }) => {
    const form = new FormData()
    form.append('file', file)
    const q = new URLSearchParams()
    if (opts?.replace) q.set('replace', 'true')
    if (opts?.section) q.set('section', opts.section)
    if (opts?.day) q.set('day', opts.day)
    const qs = q.toString() ? `?${q.toString()}` : ''
    const res = await fetch(`${API_BASE}/trains/import${qs}`, { method: 'POST', body: form })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.detail || `Import failed: ${res.status}`)
    return data as { imported: number; skipped_duplicates: number; rejected: number; cleared: number; errors: { row: number; reason: string }[] }
  },
};

export const mockMaintenance = [
  { id: 1, task_id: 'MT-ENG-041', department: 'ENG', section: 'Bhadrak–Jajpur', location: 'Km 231/4-232/1', work_type: 'tamping', duration: 2.5, urgency: 'high', status: 'pending' },
  { id: 2, task_id: 'MT-SNT-018', department: 'SNT', section: 'Bhadrak–Jajpur', location: 'Jajpur Cabin', work_type: 'signal_upgrade', duration: 2.0, urgency: 'critical', status: 'pending' },
  { id: 3, task_id: 'MT-TRD-007', department: 'TRD', section: 'Bhadrak–Jajpur', location: 'Km 228/0-229/5', work_type: 'ohe_maintenance', duration: 1.5, urgency: 'normal', status: 'pending' },
];

export const mockTrains = [
  { train_number: 'TR-PSG-01', train_name: 'Bhadrak MEMU', priority: 4, scheduled_time: new Date().toISOString(), latitude: 21.0, longitude: 86.4, status: 'on_time' },
  { train_number: 'TR-PSG-02', train_name: 'Jajpur Express', priority: 2, scheduled_time: new Date().toISOString(), latitude: 20.95, longitude: 86.2, status: 'delayed' },
  { train_number: 'TR-FRT-01', train_name: 'Coal Freight', priority: 5, scheduled_time: new Date().toISOString(), latitude: 20.98, longitude: 86.3, status: 'on_time' },
];
