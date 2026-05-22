import { Link, useParams } from 'react-router-dom';
import { useTickets } from '@/hooks/useTickets';
import { useStatuses } from '@/hooks/useStatuses';

const PRIORITY_BADGE: Record<string, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700',
  critical: 'bg-purple-100 text-purple-700',
};

export default function ProjectBacklogPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const pid = projectId!;
  const { data: tickets = [], isLoading } = useTickets(pid);
  const { data: statuses = [] } = useStatuses(pid);

  const statusMap = Object.fromEntries(statuses.map((s) => [s.id, s.name]));

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <nav className="text-sm text-text-secondary flex items-center gap-1">
          <Link to="/projects" className="hover:text-primary">Projects</Link>
          <span>/</span>
          <span className="text-text-primary font-medium">Backlog</span>
        </nav>
      </div>

      {isLoading && <p className="text-text-secondary">Loading…</p>}

      <div className="bg-surface rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-raised">
            <tr>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Ticket</th>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Title</th>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Status</th>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Priority</th>
              <th className="text-left px-4 py-3 text-text-secondary font-medium">Assignee</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id} className="border-t border-border hover:bg-surface-raised">
                <td className="px-4 py-3 font-mono text-xs text-text-secondary">{t.ticketNumber}</td>
                <td className="px-4 py-3">
                  <Link
                    to={`/projects/${pid}/tickets/${t.id}`}
                    className="text-text-primary hover:text-primary"
                  >
                    {t.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-text-secondary">{statusMap[t.statusId] ?? t.statusName}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_BADGE[t.priority]}`}>
                    {t.priority}
                  </span>
                </td>
                <td className="px-4 py-3 text-text-secondary">{t.assigneeName ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && tickets.length === 0 && (
          <p className="text-center text-text-secondary py-8">No tickets yet.</p>
        )}
      </div>
    </div>
  );
}
