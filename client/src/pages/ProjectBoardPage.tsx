import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTickets, useUpdateTicket, useCreateTicket } from '@/hooks/useTickets';
import { useStatuses } from '@/hooks/useStatuses';
import KanbanBoard from '@/components/Board/KanbanBoard';
import type { TicketDto } from '@shared/types/api.types';

export default function ProjectBoardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const pid = projectId!;

  const { data: tickets = [], isLoading: loadingTickets } = useTickets(pid);
  const { data: statuses = [], isLoading: loadingStatuses } = useStatuses(pid);
  const updateTicket = useUpdateTicket(pid);
  const createTicket = useCreateTicket(pid);

  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newStatusId, setNewStatusId] = useState('');

  function handleMoveTicket(ticketId: string, newStatusId: string) {
    updateTicket.mutate({ id: ticketId, data: { statusId: newStatusId } });
  }

  function handleTicketClick(ticket: TicketDto) {
    window.location.href = `/projects/${pid}/tickets/${ticket.id}`;
  }

  async function handleCreateTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || !newStatusId) return;
    await createTicket.mutateAsync({
      projectId: pid,
      title: newTitle,
      statusId: newStatusId,
    });
    setShowCreate(false);
    setNewTitle('');
    setNewStatusId('');
  }

  if (loadingTickets || loadingStatuses) {
    return <div className="p-8 text-text-secondary">Loading board…</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 px-6 py-4 border-b border-border bg-surface">
        <nav className="text-sm text-text-secondary flex items-center gap-1">
          <Link to="/projects" className="hover:text-primary">Projects</Link>
          <span>/</span>
          <span className="text-text-primary font-medium">Board</span>
        </nav>
        <button
          onClick={() => setShowCreate(true)}
          className="ml-auto bg-primary text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-primary-hover"
        >
          + Create ticket
        </button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-surface rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Create ticket</h2>
            <form onSubmit={handleCreateTicket} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Title</label>
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full border border-border rounded px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Status</label>
                <select
                  value={newStatusId}
                  onChange={(e) => setNewStatusId(e.target.value)}
                  className="w-full border border-border rounded px-3 py-2 text-sm"
                  required
                >
                  <option value="">Select status…</option>
                  {statuses.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-sm border border-border rounded hover:bg-surface-raised"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTicket.isPending}
                  className="px-4 py-2 text-sm bg-primary text-white rounded hover:bg-primary-hover disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden p-6">
        <KanbanBoard
          statuses={statuses}
          tickets={tickets}
          onMoveTicket={handleMoveTicket}
          onTicketClick={handleTicketClick}
        />
      </div>
    </div>
  );
}
