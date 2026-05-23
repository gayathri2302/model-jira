import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTickets, useUpdateTicket, useCreateTicket } from '@/hooks/useTickets';
import { useStatuses } from '@/hooks/useStatuses';
import { useSprints, useCreateSprint, useStartSprint, useCompleteSprint } from '@/hooks/useSprints';
import KanbanBoard from '@/components/Board/KanbanBoard';
import type { TicketDto, SprintDto } from '@shared/types/api.types';

function fmt(d: string | null) { return d ? new Date(d).toLocaleDateString() : '—'; }
function today() { return new Date().toISOString().slice(0, 10); }
function twoWeeks() { const d = new Date(); d.setDate(d.getDate() + 14); return d.toISOString().slice(0, 10); }

export default function ProjectBoardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const pid = projectId!;
  const navigate = useNavigate();

  const { data: tickets = [], isLoading: loadingTickets } = useTickets(pid);
  const { data: statuses = [], isLoading: loadingStatuses } = useStatuses(pid);
  const { data: sprints = [] } = useSprints(pid);
  const updateTicket = useUpdateTicket(pid);
  const createTicket = useCreateTicket(pid);
  const createSprint = useCreateSprint(pid);
  const startSprint = useStartSprint(pid);
  const completeSprint = useCompleteSprint(pid);

  const activeSprint = sprints.find((s) => s.status === 'active') ?? null;
  const planningSprints = sprints.filter((s) => s.status === 'planning');

  // board state
  const [groupByEpic, setGroupByEpic] = useState(false);

  // create ticket modal
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newStatusId, setNewStatusId] = useState('');

  // start sprint modal
  const [startTarget, setStartTarget] = useState<SprintDto | null>(null);
  const [sprintName, setSprintName] = useState('');
  const [sprintGoal, setSprintGoal] = useState('');
  const [sprintStart, setSprintStart] = useState(today());
  const [sprintEnd, setSprintEnd] = useState(twoWeeks());

  // complete sprint modal
  const [completeTarget, setCompleteTarget] = useState<SprintDto | null>(null);
  const [incompleteDest, setIncompleteDest] = useState('backlog');

  // new sprint name modal
  const [showNewSprint, setShowNewSprint] = useState(false);
  const [newSprintName, setNewSprintName] = useState('');

  async function handleMoveTicket(ticketId: string, newStatusId: string) {
    await updateTicket.mutateAsync({ id: ticketId, data: { statusId: newStatusId } });
  }

  function handleTicketClick(ticket: TicketDto) {
    navigate(`/projects/${pid}/tickets/${ticket.id}`);
  }

  async function handleCreateTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || !newStatusId) return;
    await createTicket.mutateAsync({ projectId: pid, title: newTitle, statusId: newStatusId });
    setShowCreate(false); setNewTitle(''); setNewStatusId('');
  }

  function openStartModal(sprint: SprintDto) {
    setStartTarget(sprint);
    setSprintName(sprint.name);
    setSprintGoal(sprint.goal ?? '');
    setSprintStart(today());
    setSprintEnd(twoWeeks());
  }

  async function handleStartSprint(e: React.FormEvent) {
    e.preventDefault();
    if (!startTarget) return;
    await startSprint.mutateAsync({ id: startTarget.id, data: { name: sprintName, goal: sprintGoal || null, startDate: sprintStart, endDate: sprintEnd } });
    setStartTarget(null);
  }

  async function handleCompleteSprint(e: React.FormEvent) {
    e.preventDefault();
    if (!completeTarget) return;
    await completeSprint.mutateAsync({ id: completeTarget.id, dest: incompleteDest });
    setCompleteTarget(null);
  }

  async function handleNewSprint(e: React.FormEvent) {
    e.preventDefault();
    await createSprint.mutateAsync({ projectId: pid, name: newSprintName });
    setShowNewSprint(false); setNewSprintName('');
  }

  if (loadingTickets || loadingStatuses) return <div className="p-8 text-text-secondary">Loading board…</div>;

  const incompleteCount = completeTarget
    ? tickets.filter((t) => t.sprintId === completeTarget.id && statuses.find((s) => s.id === t.statusId)?.category !== 'done').length
    : 0;
  const completedCount = completeTarget
    ? tickets.filter((t) => t.sprintId === completeTarget.id && statuses.find((s) => s.id === t.statusId)?.category === 'done').length
    : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border bg-surface flex-wrap">
        <nav className="text-sm text-text-secondary flex items-center gap-1">
          <Link to="/projects" className="hover:text-primary">Projects</Link>
          <span>/</span>
          <span className="text-text-primary font-medium">Board</span>
          <span>/</span>
          <Link to={`/projects/${pid}/overview`} className="hover:text-primary">Overview</Link>
          <span>/</span>
          <Link to={`/projects/${pid}/time-report`} className="hover:text-primary">Time Report</Link>
        </nav>

        {/* Sprint badge */}
        {activeSprint && (
          <div className="flex items-center gap-2 ml-2 px-3 py-1 bg-green-50 border border-green-200 rounded-full text-xs text-green-700 font-medium">
            <span className="w-2 h-2 bg-green-500 rounded-full inline-block" />
            {activeSprint.name} · {fmt(activeSprint.startDate)} – {fmt(activeSprint.endDate)}
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {/* Group by Epic toggle */}
          <button
            onClick={() => setGroupByEpic((v) => !v)}
            className={`px-3 py-1.5 rounded text-sm font-medium border transition-colors ${groupByEpic ? 'bg-purple-600 text-white border-purple-600' : 'border-border text-text-secondary hover:border-primary hover:text-primary'}`}
          >
            Group by Epic
          </button>

          {/* Sprint controls */}
          {activeSprint ? (
            <button onClick={() => setCompleteTarget(activeSprint)} className="px-3 py-1.5 rounded text-sm font-medium bg-orange-500 text-white hover:bg-orange-600">
              Complete Sprint
            </button>
          ) : planningSprints.length > 0 ? (
            <button onClick={() => openStartModal(planningSprints[0])} className="px-3 py-1.5 rounded text-sm font-medium bg-green-600 text-white hover:bg-green-700">
              Start Sprint
            </button>
          ) : (
            <button onClick={() => setShowNewSprint(true)} className="px-3 py-1.5 rounded text-sm font-medium border border-border text-text-secondary hover:border-primary hover:text-primary">
              + New Sprint
            </button>
          )}

          <button onClick={() => setShowCreate(true)} className="bg-primary text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-primary-hover">
            + Create ticket
          </button>
        </div>
      </div>

      {/* Sprints sidebar summary (planning sprints) */}
      {planningSprints.length > 0 && !activeSprint && (
        <div className="px-6 py-2 bg-blue-50 border-b border-blue-100 text-xs text-blue-700 flex items-center gap-4 flex-wrap">
          <span className="font-medium">Planning:</span>
          {planningSprints.map((s) => (
            <span key={s.id} className="flex items-center gap-1">
              {s.name}
              <button onClick={() => openStartModal(s)} className="underline hover:text-blue-900">Start</button>
            </span>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-hidden p-6">
        <KanbanBoard
          statuses={statuses}
          tickets={activeSprint ? tickets.filter((t) => t.sprintId === activeSprint.id) : tickets.filter((t) => !t.sprintId)}
          onMoveTicket={handleMoveTicket}
          onTicketClick={handleTicketClick}
          groupByEpic={groupByEpic}
        />
      </div>

      {/* ── Create Ticket Modal ── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-surface rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Create ticket</h2>
            <form onSubmit={handleCreateTicket} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Title</label>
                <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="w-full border border-border rounded px-3 py-2 text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Status</label>
                <select value={newStatusId} onChange={(e) => setNewStatusId(e.target.value)} className="w-full border border-border rounded px-3 py-2 text-sm" required>
                  <option value="">Select status…</option>
                  {statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm border border-border rounded hover:bg-surface-hover">Cancel</button>
                <button type="submit" disabled={createTicket.isPending} className="px-4 py-2 text-sm bg-primary text-white rounded hover:bg-primary-hover disabled:opacity-50">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Start Sprint Modal ── */}
      {startTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-surface rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Start Sprint</h2>
            <form onSubmit={handleStartSprint} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Sprint name</label>
                <input value={sprintName} onChange={(e) => setSprintName(e.target.value)} className="w-full border border-border rounded px-3 py-2 text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Goal <span className="text-text-secondary font-normal">(optional)</span></label>
                <textarea value={sprintGoal} onChange={(e) => setSprintGoal(e.target.value)} rows={2} className="w-full border border-border rounded px-3 py-2 text-sm resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Start date</label>
                  <input type="date" value={sprintStart} onChange={(e) => setSprintStart(e.target.value)} className="w-full border border-border rounded px-3 py-2 text-sm" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">End date</label>
                  <input type="date" value={sprintEnd} onChange={(e) => setSprintEnd(e.target.value)} className="w-full border border-border rounded px-3 py-2 text-sm" required />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setStartTarget(null)} className="px-4 py-2 text-sm border border-border rounded hover:bg-surface-hover">Cancel</button>
                <button type="submit" disabled={startSprint.isPending} className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">Start Sprint</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Complete Sprint Modal ── */}
      {completeTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-surface rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-2">Complete Sprint</h2>
            <p className="text-sm text-text-secondary mb-4">{completeTarget.name}</p>
            <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-surface-hover rounded">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{completedCount}</div>
                <div className="text-xs text-text-secondary">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500">{incompleteCount}</div>
                <div className="text-xs text-text-secondary">Incomplete</div>
              </div>
            </div>
            {incompleteCount > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-text-secondary mb-2">Move {incompleteCount} incomplete ticket(s) to:</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" name="dest" value="backlog" checked={incompleteDest === 'backlog'} onChange={() => setIncompleteDest('backlog')} />
                    Backlog
                  </label>
                  {planningSprints.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" name="dest" value={s.id} checked={incompleteDest === s.id} onChange={() => setIncompleteDest(s.id)} />
                      {s.name} (planning)
                    </label>
                  ))}
                </div>
              </div>
            )}
            <form onSubmit={handleCompleteSprint}>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setCompleteTarget(null)} className="px-4 py-2 text-sm border border-border rounded hover:bg-surface-hover">Cancel</button>
                <button type="submit" disabled={completeSprint.isPending} className="px-4 py-2 text-sm bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50">Complete Sprint</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── New Sprint Modal ── */}
      {showNewSprint && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-surface rounded-lg shadow-lg p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-4">Create Sprint</h2>
            <form onSubmit={handleNewSprint} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Sprint name</label>
                <input value={newSprintName} onChange={(e) => setNewSprintName(e.target.value)} className="w-full border border-border rounded px-3 py-2 text-sm" placeholder="e.g. Sprint 1" required />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowNewSprint(false)} className="px-4 py-2 text-sm border border-border rounded hover:bg-surface-hover">Cancel</button>
                <button type="submit" disabled={createSprint.isPending} className="px-4 py-2 text-sm bg-primary text-white rounded hover:bg-primary-hover disabled:opacity-50">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
