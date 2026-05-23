import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProjectWorkLogs } from '@/hooks/useWorkLogs';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

type RawLog = {
  id: string; ticketId: string; userId: string; userName: string;
  minutesLogged: number; logDate: string; note: string | null; createdAt: string;
  ticketNumber: string; ticketTitle: string; epicTitle: string | null;
};

const COLORS = ['#0052CC', '#36B37E', '#FF991F', '#DE350B', '#6554C0', '#00B8D9', '#57D9A3'];

function fmtH(m: number) { return (m / 60).toFixed(1) + 'h'; }

export default function TimeReportPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: rawLogs = [] } = useProjectWorkLogs(projectId!);
  const logs = rawLogs as unknown as RawLog[];

  const [view, setView] = useState<'member' | 'ticket' | 'epic'>('member');
  const [filterMember, setFilterMember] = useState('');
  const [filterEpic, setFilterEpic] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const members = useMemo(() => [...new Set(logs.map((l) => l.userName))].sort(), [logs]);
  const epics = useMemo(() => [...new Set(logs.map((l) => l.epicTitle).filter(Boolean))].sort() as string[], [logs]);

  const filtered = useMemo(() => logs.filter((l) => {
    if (filterMember && l.userName !== filterMember) return false;
    if (filterEpic && l.epicTitle !== filterEpic) return false;
    if (dateFrom && l.logDate < dateFrom) return false;
    if (dateTo && l.logDate > dateTo) return false;
    return true;
  }), [logs, filterMember, filterEpic, dateFrom, dateTo]);

  // Bar chart: hours per member
  const barData = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of filtered) map.set(l.userName, (map.get(l.userName) ?? 0) + l.minutesLogged);
    return [...map.entries()].map(([name, mins]) => ({ name, hours: parseFloat((mins / 60).toFixed(1)) }));
  }, [filtered]);

  // Pie: hours per epic
  const pieData = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of filtered) {
      const k = l.epicTitle ?? 'No Epic';
      map.set(k, (map.get(k) ?? 0) + l.minutesLogged);
    }
    return [...map.entries()].map(([name, mins]) => ({ name, value: parseFloat((mins / 60).toFixed(1)) }));
  }, [filtered]);

  // Table grouping
  const grouped = useMemo(() => {
    if (view === 'member') {
      const map = new Map<string, RawLog[]>();
      for (const l of filtered) { if (!map.has(l.userName)) map.set(l.userName, []); map.get(l.userName)!.push(l); }
      return map;
    } else if (view === 'ticket') {
      const map = new Map<string, RawLog[]>();
      for (const l of filtered) { const k = `${l.ticketNumber} — ${l.ticketTitle}`; if (!map.has(k)) map.set(k, []); map.get(k)!.push(l); }
      return map;
    } else {
      const map = new Map<string, RawLog[]>();
      for (const l of filtered) { const k = l.epicTitle ?? 'No Epic'; if (!map.has(k)) map.set(k, []); map.get(k)!.push(l); }
      return map;
    }
  }, [filtered, view]);

  function exportXlsx() {
    import('xlsx').then(({ utils, writeFile }) => {
      const rows = filtered.map((l) => ({
        Member: l.userName, Ticket: l.ticketNumber, Title: l.ticketTitle,
        Epic: l.epicTitle ?? '', Date: l.logDate,
        Hours: parseFloat((l.minutesLogged / 60).toFixed(2)), Note: l.note ?? '',
      }));
      const ws = utils.json_to_sheet(rows);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, 'Time Report');
      writeFile(wb, 'time-report.xlsx');
    });
  }

  const totalMins = filtered.reduce((s, l) => s + l.minutesLogged, 0);

  return (
    <div className="p-6">
      <nav className="text-sm text-text-secondary flex items-center gap-1 mb-4">
        <Link to="/projects" className="hover:text-primary">Projects</Link>
        <span>/</span>
        <Link to={`/projects/${projectId}/board`} className="hover:text-primary">Board</Link>
        <span>/</span>
        <span className="text-text-primary font-medium">Time Report</span>
      </nav>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-xl font-bold text-text-primary">Time Report <span className="text-base font-normal text-text-secondary ml-2">Total: {fmtH(totalMins)}</span></h1>
        <button onClick={exportXlsx} className="px-3 py-1.5 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700">
          Export Excel
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <select value={filterMember} onChange={(e) => setFilterMember(e.target.value)} className="border border-border rounded px-3 py-1.5 text-sm">
          <option value="">All members</option>
          {members.map((m) => <option key={m}>{m}</option>)}
        </select>
        <select value={filterEpic} onChange={(e) => setFilterEpic(e.target.value)} className="border border-border rounded px-3 py-1.5 text-sm">
          <option value="">All epics</option>
          {epics.map((e) => <option key={e}>{e}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="border border-border rounded px-3 py-1.5 text-sm" placeholder="From" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="border border-border rounded px-3 py-1.5 text-sm" placeholder="To" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-surface border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Hours per Team Member</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`${v}h`, 'Hours']} />
              <Bar dataKey="hours" fill="#0052CC" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Hours by Epic</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={(p) => `${p.name ?? ''} ${(((p.percent) ?? 0) * 100).toFixed(0)}%`}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => [`${v}h`, 'Hours']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex gap-2 mb-4">
        {(['member', 'ticket', 'epic'] as const).map((v) => (
          <button key={v} onClick={() => setView(v)}
            className={`px-3 py-1.5 rounded text-sm font-medium capitalize border transition-colors ${view === v ? 'bg-primary text-white border-primary' : 'border-border text-text-secondary hover:border-primary hover:text-primary'}`}>
            {v} View
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        {[...grouped.entries()].map(([group, items]) => {
          const groupMins = items.reduce((s, l) => s + l.minutesLogged, 0);
          return (
            <details key={group} open className="border-b border-border last:border-0">
              <summary className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-surface-hover select-none">
                <span className="font-semibold text-sm text-text-primary">{group}</span>
                <span className="text-sm text-text-secondary font-medium">{fmtH(groupMins)}</span>
              </summary>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-hover text-text-secondary text-left">
                    <th className="px-4 py-2 font-medium">Date</th>
                    {view !== 'member' && <th className="px-4 py-2 font-medium">Member</th>}
                    {view !== 'ticket' && <th className="px-4 py-2 font-medium">Ticket</th>}
                    {view !== 'epic' && <th className="px-4 py-2 font-medium">Epic</th>}
                    <th className="px-4 py-2 font-medium">Hours</th>
                    <th className="px-4 py-2 font-medium">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((l) => (
                    <tr key={l.id} className="border-t border-border">
                      <td className="px-4 py-2">{l.logDate.slice(0, 10)}</td>
                      {view !== 'member' && <td className="px-4 py-2 text-text-secondary">{l.userName}</td>}
                      {view !== 'ticket' && <td className="px-4 py-2"><span className="font-mono text-xs text-text-secondary">{l.ticketNumber}</span> {l.ticketTitle}</td>}
                      {view !== 'epic' && <td className="px-4 py-2 text-text-secondary">{l.epicTitle ?? '—'}</td>}
                      <td className="px-4 py-2 font-medium">{fmtH(l.minutesLogged)}</td>
                      <td className="px-4 py-2 text-text-secondary">{l.note ?? '—'}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-border bg-surface-hover font-semibold">
                    <td className="px-4 py-2" colSpan={view === 'member' ? 1 : view === 'ticket' ? 2 : 2}>Total</td>
                    <td className="px-4 py-2">{fmtH(groupMins)}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </details>
          );
        })}
        {grouped.size === 0 && <p className="p-6 text-sm text-text-secondary">No work logs found for the selected filters.</p>}
      </div>
    </div>
  );
}
