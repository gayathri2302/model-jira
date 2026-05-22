import { useMemo } from 'react';
import {
  DndContext,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import type { StatusDto, TicketDto } from '@shared/types/api.types';
import KanbanColumn from './KanbanColumn';

interface Props {
  statuses: StatusDto[];
  tickets: TicketDto[];
  onMoveTicket: (ticketId: string, newStatusId: string) => void;
  onTicketClick: (ticket: TicketDto) => void;
}

export default function KanbanBoard({ statuses, tickets, onMoveTicket, onTicketClick }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const ticketsByStatus = useMemo(() => {
    const map = new Map<string, TicketDto[]>();
    for (const s of statuses) map.set(s.id, []);
    for (const t of tickets) {
      const col = map.get(t.statusId);
      if (col) col.push(t);
    }
    return map;
  }, [statuses, tickets]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const ticketId = active.id as string;
    const newStatusId = over.id as string;
    const ticket = tickets.find((t) => t.id === ticketId);
    if (ticket && ticket.statusId !== newStatusId) {
      onMoveTicket(ticketId, newStatusId);
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
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
    </DndContext>
  );
}
