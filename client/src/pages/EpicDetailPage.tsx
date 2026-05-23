import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api.client';
import type { EpicDto, TicketDto, StatusDto } from '@shared/types/api.types';

function useEpic(projectId: string) {
  return useQuery({
    queryKey: ['epics', projectId],
    queryFn: async () => { const r = await api.get<{ data: EpicDto[] }>(`/epics/project/${projectId}`); return r.data.data; },
    enabled: !!projectId,
  });
}

export default function EpicDetailPage() {
  const { projectId, epicId } = useParams<{ projectId: string; epicId: string }>();
  const navigate = useNavigate();

  const { data: epics = [] } = useEpic(projectId!);
  const epic = epics.find((e) => e.id === epicId);

  const { data: allTickets = [] } = useQuery({
    queryKey: ['tickets', projectId],
    queryFn: async () => { const r = await api.get<{ data: TicketDto[] }>(`/tickets/project/${projectId}`); return r.data.data; },
    enabled: !!projectId,
  });

  const { data: statuses = [] } = useQuery({
    queryKey: ['statuses', projectId],
    queryFn: async () => { const r = await api.get<{ data: StatusDto[] }>(`/statuses/project/${projectId}`); return r.data.data; },
    enabled: !!projectId,
  });

  const tickets = allTickets.filter((t) => t.epicId === epicId);
  const doneIds = new Set(statuses.filter((s) => s.category === 'done').map((s) => s.id));
  const doneCount = tickets.filter((t) => doneIds.has(t.statusId)).length;
  const progress = tickets.length ? Math.round((doneCount / tickets.length) * 100) : 0;

  if (!epic) return <div className="p-8 text-text-secondary">Loading…</div>;

  return (
    <div className="p-6 max-w-4xl">
      <nav className="text-sm text-text-secondary flex items-center gap-1 mb-4">
        <Link to="/projects" className="hover:text-primary">Projects</Link>
        <span>/</span>
        <Link to={`/projects/${projectId}/board`} className="hover:text-primary">Board</Link>
        <span>/</span>
        <span>Epics</span>
        <span>/</span>
        <span className="text-text-primary font-medium">{epic.title}</span>
      </nav>

      <div className="bg-surface rounded-lg border border-border p-6 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="w-4 h-4 rounded-full shrink-0" style={{ background: epic.color }} />
          <h1 className="text-xl font-bold text-text-primary">{epic.title}</h1>
        </div>
        {epic.description && <p className="text-sm text-text-secondary mb-4 whitespace-pre-wrap">{epic.description}</p>}
        <div className="flex gap-6 text-sm text-text-secondary mb-4">
          {epic.startDate && <span>Start: <strong>{new Date(epic.startDate).toLocaleDateString()}</strong></span>}
          {epic.endDate && <span>End: <strong>{new Date(epic.endDate).toLocaleDateString()}</strong></span>}
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-text-secondary mb-1">
            <span>{doneCount} of {tickets.length} tickets done</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-border rounded-full overflow-hidden">
            <div className="h-2 bg-green-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-lg border border-border p-6">
        <h2 className="font-semibold text-text-primary mb-4">Tickets ({tickets.length})</h2>
        {tickets.length === 0 ? (
          <p className="text-sm text-text-secondary">No tickets linked to this epic.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-text-secondary text-left">
                <th className="pb-2 font-medium">Ticket</th>
                <th className="pb-2 font-medium">Title</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Assignee</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => navigate(`/projects/${projectId}/tickets/${t.id}`)}
                  className="border-b border-border last:border-0 hover:bg-surface-hover cursor-pointer"
                >
                  <td className="py-2 pr-4 font-mono text-text-secondary">{t.ticketNumber}</td>
                  <td className="py-2 pr-4 text-text-primary">{t.title}</td>
                  <td className="py-2 pr-4">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${doneIds.has(t.statusId) ? 'bg-green-100 text-green-700' : 'bg-surface-hover text-text-secondary'}`}>
                      {t.statusName}
                    </span>
                  </td>
                  <td className="py-2 text-text-secondary">{t.assigneeName ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
