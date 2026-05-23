import { useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api.client';
import { useSprints } from '@/hooks/useSprints';
import { useProjectWorkLogs } from '@/hooks/useWorkLogs';
import type { EpicDto, TicketDto, StatusDto } from '@shared/types/api.types';

type RawLog = {
  id: string; ticketId: string; ticketNumber: string; ticketTitle: string;
  userId: string; userName: string; minutesLogged: number; logDate: string;
  note: string | null; epicTitle: string | null;
};

function fmtH(m: number) { return (m / 60).toFixed(1) + 'h'; }
function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

function ProgressBar({ value, max, color = 'bg-green-500' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
        <div className={`h-2 ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-text-secondary w-8 text-right">{pct}%</span>
    </div>
  );
}

export default function ProjectOverviewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const { data: epics = [] } = useQuery<EpicDto[]>({
    queryKey: ['epics', projectId],
    queryFn: async () => { const r = await api.get<{ data: EpicDto[] }>(`/epics/project/${projectId}`); return r.data.data; },
    enabled: !!projectId,
  });
  const { data: tickets = [] } = useQuery<TicketDto[]>({
    queryKey: ['tickets', projectId],
    queryFn: async () => { const r = await api.get<{ data: TicketDto[] }>(`/tickets/project/${projectId}`); return r.data.data; },
    enabled: !!projectId,
  });
  const { data: statuses = [] } = useQuery<StatusDto[]>({
    queryKey: ['statuses', projectId],
    queryFn: async () => { const r = await api.get<{ data: StatusDto[] }>(`/statuses/project/${projectId}`); return r.data.data; },
    enabled: !!projectId,
  });
  const { data: sprints = [] } = useSprints(projectId!);
  const { data: rawLogs = [] } = useProjectWorkLogs(projectId!);
  const logs = rawLogs as unknown as RawLog[];

  const [section, setSection] = useState<'epics' | 'sprints' | 'time'>('epics');
  const [showEpicModal, setShowEpicModal] = useState(false);
  const [epicTitle, setEpicTitle] = useState('');
  const [epicDesc, setEpicDesc] = useState('');
  const [epicColor, setEpicColor] = useState('#0052CC');
  const [epicStart, setEpicStart] = useState('');
  const [epicEnd, setEpicEnd] = useState('');

  const qc = useQueryClient();
  const createEpic = useMutation({
    mutationFn: () => api.post('/epics', { projectId, title: epicTitle.trim(), description: epicDesc || null, color: epicColor, startDate: epicStart || null, endDate: epicEnd || null }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['epics', projectId] }); setShowEpicModal(false); setEpicTitle(''); setEpicDesc(''); setEpicColor('#0052CC'); setEpicStart(''); setEpicEnd(''); },
  });

  const doneStatusIds = useMemo(() => new Set(statuses.filter((s) => s.category === 'done').map((s) => s.id)), [statuses]);

  // time per ticket
  const timeByTicket = useMemo(() => {
    const map = new Map<string, { ticketId: string; ticketNumber: string; title: string; epicTitle: string | null; mins: number }>();
    for (const l of logs) {
      if (!map.has(l.ticketId)) map.set(l.ticketId, { ticketId: l.ticketId, ticketNumber: l.ticketNumber, title: l.ticketTitle, epicTitle: l.epicTitle, mins: 0 });
      map.get(l.ticketId)!.mins += l.minutesLogged;
    }
    return [...map.values()].sort((a, b) => b.mins - a.mins);
  }, [logs]);

  const totalLoggedMins = useMemo(() => logs.reduce((s, l) => s + l.minutesLogged, 0), [logs]);

  return (
    <div className="p-6 max-w-5xl">
      <nav className="text-sm text-text-secondary flex items-center gap-1 mb-4">
        <Link to="/projects" className="hover:text-primary">Projects</Link>
        <span>/</span>
        <Link to={`/projects/${projectId}/board`} className="hover:text-primary">Board</Link>
        <span>/</span>
        <span className="text-text-primary font-medium">Overview</span>
      </nav>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-text-primary">Project Overview</h1>
        <div className="flex gap-1 bg-surface border border-border rounded-lg p-1">
          {(['epics', 'sprints', 'time'] as const).map((s) => (
            <button key={s} onClick={() => setSection(s)}
              className={`px-4 py-1.5 rounded text-sm font-medium capitalize transition-colors ${section === s ? 'bg-primary text-white' : 'text-text-secondary hover:text-primary'}`}>
              {s === 'time' ? 'Time Spent' : cap(s)}
            </button>
          ))}
        </div>
      </div>

      {/* ── EPICS ── */}
      {section === 'epics' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowEpicModal(true)} className="px-3 py-1.5 bg-primary text-white rounded text-sm font-medium hover:bg-primary-hover">
              + Create Epic
            </button>
          </div>
          {epics.length === 0 && <p className="text-sm text-text-secondary">No epics yet. Create one above.</p>}
          {epics.map((epic) => {
            const epicTickets = tickets.filter((t) => t.epicId === epic.id);
            const doneCount = epicTickets.filter((t) => doneStatusIds.has(t.statusId)).length;
            const epicMins = logs.filter((l) => l.epicTitle === epic.title).reduce((s, l) => s + l.minutesLogged, 0);
            return (
              <div key={epic.id} className="bg-surface border border-border rounded-lg overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: epic.color }} />
                  <Link to={`/projects/${projectId}/epics/${epic.id}`} className="font-semibold text-text-primary hover:text-primary flex-1">
                    {epic.title}
                  </Link>
                  <span className="text-xs text-text-secondary">{epicTickets.length} tickets · {fmtH(epicMins)} logged</span>
                </div>
                <div className="px-5 py-3">
                  <div className="flex justify-between text-xs text-text-secondary mb-1">
                    <span>{doneCount} of {epicTickets.length} done</span>
                  </div>
                  <ProgressBar value={doneCount} max={epicTickets.length} />
                </div>
                {epicTickets.length > 0 && (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-surface-hover text-text-secondary text-left text-xs">
                        <th className="px-5 py-2 font-medium">Ticket</th>
                        <th className="px-5 py-2 font-medium">Title</th>
                        <th className="px-5 py-2 font-medium">Status</th>
                        <th className="px-5 py-2 font-medium">Assignee</th>
                        <th className="px-5 py-2 font-medium">Time logged</th>
                      </tr>
                    </thead>
                    <tbody>
                      {epicTickets.map((t) => {
                        const ticketMins = logs.filter((l) => l.ticketId === t.id).reduce((s, l) => s + l.minutesLogged, 0);
                        return (
                          <tr key={t.id} onClick={() => navigate(`/projects/${projectId}/tickets/${t.id}`)}
                            className="border-t border-border hover:bg-surface-hover cursor-pointer">
                            <td className="px-5 py-2 font-mono text-text-secondary text-xs">{t.ticketNumber}</td>
                            <td className="px-5 py-2 text-text-primary">{t.title}</td>
                            <td className="px-5 py-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${doneStatusIds.has(t.statusId) ? 'bg-green-100 text-green-700' : 'bg-surface-hover text-text-secondary'}`}>
                                {t.statusName}
                              </span>
                            </td>
                            <td className="px-5 py-2 text-text-secondary">{t.assigneeName ?? '—'}</td>
                            <td className="px-5 py-2 text-text-secondary">{ticketMins > 0 ? fmtH(ticketMins) : '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}

          {/* Tickets with no epic */}
          {(() => {
            const noEpicTickets = tickets.filter((t) => !t.epicId);
            if (!noEpicTickets.length) return null;
            return (
              <div className="bg-surface border border-border rounded-lg overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
                  <span className="w-3 h-3 rounded-full shrink-0 bg-border" />
                  <span className="font-semibold text-text-secondary flex-1">No Epic</span>
                  <span className="text-xs text-text-secondary">{noEpicTickets.length} tickets</span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface-hover text-text-secondary text-left text-xs">
                      <th className="px-5 py-2 font-medium">Ticket</th>
                      <th className="px-5 py-2 font-medium">Title</th>
                      <th className="px-5 py-2 font-medium">Status</th>
                      <th className="px-5 py-2 font-medium">Assignee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {noEpicTickets.map((t) => (
                      <tr key={t.id} onClick={() => navigate(`/projects/${projectId}/tickets/${t.id}`)}
                        className="border-t border-border hover:bg-surface-hover cursor-pointer">
                        <td className="px-5 py-2 font-mono text-text-secondary text-xs">{t.ticketNumber}</td>
                        <td className="px-5 py-2 text-text-primary">{t.title}</td>
                        <td className="px-5 py-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${doneStatusIds.has(t.statusId) ? 'bg-green-100 text-green-700' : 'bg-surface-hover text-text-secondary'}`}>
                            {t.statusName}
                          </span>
                        </td>
                        <td className="px-5 py-2 text-text-secondary">{t.assigneeName ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── SPRINTS ── */}
      {section === 'sprints' && (
        <div className="space-y-4">
          {sprints.length === 0 && <p className="text-sm text-text-secondary">No sprints created yet.</p>}
          {sprints.map((sprint) => {
            const sprintTickets = tickets.filter((t) => t.sprintId === sprint.id);
            const doneCount = sprintTickets.filter((t) => doneStatusIds.has(t.statusId)).length;
            const sprintMins = logs.filter((l) => sprintTickets.some((t) => t.id === l.ticketId)).reduce((s, l) => s + l.minutesLogged, 0);
            const statusColor = sprint.status === 'active' ? 'bg-green-100 text-green-700' : sprint.status === 'completed' ? 'bg-purple-100 text-purple-700' : 'bg-surface-hover text-text-secondary';
            return (
              <div key={sprint.id} className="bg-surface border border-border rounded-lg overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${statusColor}`}>{cap(sprint.status)}</span>
                  <span className="font-semibold text-text-primary flex-1">{sprint.name}</span>
                  <span className="text-xs text-text-secondary">{sprintTickets.length} tickets · {fmtH(sprintMins)} logged</span>
                </div>
                {sprint.goal && <p className="px-5 pt-3 text-sm text-text-secondary italic">{sprint.goal}</p>}
                <div className="px-5 py-3">
                  <div className="flex justify-between text-xs text-text-secondary mb-1">
                    <span>{doneCount} of {sprintTickets.length} done</span>
                  </div>
                  <ProgressBar value={doneCount} max={sprintTickets.length} color="bg-primary" />
                </div>
                {sprintTickets.length > 0 && (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-surface-hover text-text-secondary text-left text-xs">
                        <th className="px-5 py-2 font-medium">Ticket</th>
                        <th className="px-5 py-2 font-medium">Title</th>
                        <th className="px-5 py-2 font-medium">Status</th>
                        <th className="px-5 py-2 font-medium">Assignee</th>
                        <th className="px-5 py-2 font-medium">Time logged</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sprintTickets.map((t) => {
                        const ticketMins = logs.filter((l) => l.ticketId === t.id).reduce((s, l) => s + l.minutesLogged, 0);
                        return (
                          <tr key={t.id} onClick={() => navigate(`/projects/${projectId}/tickets/${t.id}`)}
                            className="border-t border-border hover:bg-surface-hover cursor-pointer">
                            <td className="px-5 py-2 font-mono text-text-secondary text-xs">{t.ticketNumber}</td>
                            <td className="px-5 py-2 text-text-primary">{t.title}</td>
                            <td className="px-5 py-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${doneStatusIds.has(t.statusId) ? 'bg-green-100 text-green-700' : 'bg-surface-hover text-text-secondary'}`}>
                                {t.statusName}
                              </span>
                            </td>
                            <td className="px-5 py-2 text-text-secondary">{t.assigneeName ?? '—'}</td>
                            <td className="px-5 py-2 text-text-secondary">{ticketMins > 0 ? fmtH(ticketMins) : '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}

          {/* Backlog */}
          {(() => {
            const backlog = tickets.filter((t) => !t.sprintId);
            if (!backlog.length) return null;
            return (
              <div className="bg-surface border border-border rounded-lg overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-surface-hover text-text-secondary">Backlog</span>
                  <span className="font-semibold text-text-secondary flex-1">Unassigned to sprint</span>
                  <span className="text-xs text-text-secondary">{backlog.length} tickets</span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface-hover text-text-secondary text-left text-xs">
                      <th className="px-5 py-2 font-medium">Ticket</th>
                      <th className="px-5 py-2 font-medium">Title</th>
                      <th className="px-5 py-2 font-medium">Status</th>
                      <th className="px-5 py-2 font-medium">Assignee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backlog.map((t) => (
                      <tr key={t.id} onClick={() => navigate(`/projects/${projectId}/tickets/${t.id}`)}
                        className="border-t border-border hover:bg-surface-hover cursor-pointer">
                        <td className="px-5 py-2 font-mono text-text-secondary text-xs">{t.ticketNumber}</td>
                        <td className="px-5 py-2 text-text-primary">{t.title}</td>
                        <td className="px-5 py-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${doneStatusIds.has(t.statusId) ? 'bg-green-100 text-green-700' : 'bg-surface-hover text-text-secondary'}`}>
                            {t.statusName}
                          </span>
                        </td>
                        <td className="px-5 py-2 text-text-secondary">{t.assigneeName ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── TIME SPENT ── */}
      {section === 'time' && (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-text-primary">Time logged per ticket</h2>
            <span className="text-sm text-text-secondary">Total: <strong>{fmtH(totalLoggedMins)}</strong></span>
          </div>
          {timeByTicket.length === 0 ? (
            <p className="p-6 text-sm text-text-secondary">No time logged yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-hover text-text-secondary text-left text-xs">
                  <th className="px-5 py-2 font-medium">Ticket</th>
                  <th className="px-5 py-2 font-medium">Title</th>
                  <th className="px-5 py-2 font-medium">Epic</th>
                  <th className="px-5 py-2 font-medium">Time logged</th>
                  <th className="px-5 py-2 font-medium">Share</th>
                </tr>
              </thead>
              <tbody>
                {timeByTicket.map((row) => {
                  const pct = totalLoggedMins > 0 ? Math.round((row.mins / totalLoggedMins) * 100) : 0;
                  return (
                    <tr key={row.ticketId} onClick={() => navigate(`/projects/${projectId}/tickets/${row.ticketId}`)}
                      className="border-t border-border hover:bg-surface-hover cursor-pointer">
                      <td className="px-5 py-2 font-mono text-text-secondary text-xs">{row.ticketNumber}</td>
                      <td className="px-5 py-2 text-text-primary">{row.title}</td>
                      <td className="px-5 py-2 text-text-secondary">{row.epicTitle ?? '—'}</td>
                      <td className="px-5 py-2 font-semibold">{fmtH(row.mins)}</td>
                      <td className="px-5 py-2 w-40">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                            <div className="h-1.5 bg-primary rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-text-secondary w-8">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Create Epic Modal ── */}
      {showEpicModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-surface rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Create Epic</h2>
            <form onSubmit={(e) => { e.preventDefault(); if (!epicTitle.trim()) return; createEpic.mutate(); }} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Title <span className="text-red-500">*</span></label>
                <input autoFocus type="text" value={epicTitle} onChange={(e) => setEpicTitle(e.target.value)}
                  className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Description <span className="text-xs font-normal">(optional)</span></label>
                <textarea value={epicDesc} onChange={(e) => setEpicDesc(e.target.value)} rows={2}
                  className="w-full border border-border rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Start date</label>
                  <input type="date" value={epicStart} onChange={(e) => setEpicStart(e.target.value)}
                    className="w-full border border-border rounded px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">End date</label>
                  <input type="date" value={epicEnd} onChange={(e) => setEpicEnd(e.target.value)}
                    className="w-full border border-border rounded px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={epicColor} onChange={(e) => setEpicColor(e.target.value)}
                    className="w-10 h-9 border border-border rounded cursor-pointer p-0.5" />
                  <div className="flex gap-1.5">
                    {['#0052CC', '#36B37E', '#FF991F', '#DE350B', '#6554C0', '#00B8D9'].map((c) => (
                      <button key={c} type="button" onClick={() => setEpicColor(c)}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${epicColor === c ? 'border-text-primary scale-110' : 'border-transparent'}`}
                        style={{ background: c }} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowEpicModal(false)} className="px-4 py-2 text-sm border border-border rounded hover:bg-surface-hover">Cancel</button>
                <button type="submit" disabled={createEpic.isPending || !epicTitle.trim()} className="px-4 py-2 text-sm bg-primary text-white rounded hover:bg-primary-hover disabled:opacity-50">
                  {createEpic.isPending ? 'Creating…' : 'Create Epic'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
