import { useMemo, useState } from 'react';
import {
  DndContext, closestCorners, PointerSensor, useSensor, useSensors,
  DragOverlay, type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { toast } from 'sonner';
import type { StatusDto, TicketDto } from '@shared/types/api.types';
import KanbanColumn from './KanbanColumn';
import TicketCard from './TicketCard';

interface Props {
  statuses: StatusDto[];
  tickets: TicketDto[];
  onMoveTicket: (ticketId: string, newStatusId: string) => Promise<void> | void;
  onTicketClick: (ticket: TicketDto) => void;
  groupByEpic?: boolean;
}

export default function KanbanBoard({ statuses, tickets, onMoveTicket, onTicketClick, groupByEpic = false }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [activeTicket, setActiveTicket] = useState<TicketDto | null>(null);

  const ticketsByStatus = useMemo(() => {
    const map = new Map<string, TicketDto[]>();
    for (const s of statuses) map.set(s.id, []);
    for (const t of tickets) {
      const col = map.get(t.statusId);
      if (col) col.push(t);
    }
    return map;
  }, [statuses, tickets]);

  // Group by epic: gather unique epics
  const epics = useMemo(() => {
    if (!groupByEpic) return [];
    const seen = new Map<string, string>();
    for (const t of tickets) {
      if (t.epicId && t.epicTitle) seen.set(t.epicId, t.epicTitle);
    }
    return [{ id: '__no_epic__', title: 'No Epic' }, ...Array.from(seen.entries()).map(([id, title]) => ({ id, title }))];
  }, [tickets, groupByEpic]);

  function handleDragStart(event: DragStartEvent) {
    const t = tickets.find((t) => t.id === event.active.id);
    if (t) setActiveTicket(t);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveTicket(null);
    const { active, over } = event;
    if (!over) return;
    const ticketId = active.id as string;
    const newStatusId = over.id as string;
    const ticket = tickets.find((t) => t.id === ticketId);
    const newStatus = statuses.find((s) => s.id === newStatusId);
    if (!ticket || !newStatus || ticket.statusId === newStatusId) return;
    try {
      await onMoveTicket(ticketId, newStatusId);
      toast.success(`${ticket.ticketNumber} moved to ${newStatus.name}`);
    } catch {
      toast.error('Failed to move ticket');
    }
  }

  if (groupByEpic) {
    return (
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto pb-4">
          {epics.map((epic) => {
            const epicTickets = tickets.filter((t) =>
              epic.id === '__no_epic__' ? !t.epicId : t.epicId === epic.id,
            );
            return (
              <div key={epic.id} className="mb-6">
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200">
                    {epic.title}
                  </span>
                  <span className="text-xs text-text-secondary">{epicTickets.length} tickets</span>
                </div>
                <div className="flex gap-4 min-w-max">
                  {statuses.map((status) => (
                    <KanbanColumn
                      key={status.id}
                      status={status}
                      tickets={epicTickets.filter((t) => t.statusId === status.id)}
                      onTicketClick={onTicketClick}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <DragOverlay>
          {activeTicket && <TicketCard ticket={activeTicket} onClick={() => {}} isDragOverlay />}
        </DragOverlay>
      </DndContext>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 h-full">
        {statuses.map((status) => (
          <KanbanColumn
            key={status.id}
            status={status}
            tickets={ticketsByStatus.get(status.id) ?? []}
            onTicketClick={onTicketClick}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTicket && <TicketCard ticket={activeTicket} onClick={() => {}} isDragOverlay />}
      </DragOverlay>
    </DndContext>
  );
}
