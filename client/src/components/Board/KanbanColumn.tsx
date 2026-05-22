import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { StatusDto, TicketDto } from '@shared/types/api.types';
import TicketCard from './TicketCard';

interface Props {
  status: StatusDto;
  tickets: TicketDto[];
  onTicketClick: (ticket: TicketDto) => void;
}

export default function KanbanColumn({ status, tickets, onTicketClick }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status.id });

  return (
    <div className="flex flex-col shrink-0 w-72">
      <div
        className="flex items-center gap-2 mb-3 px-1"
        style={{ borderTop: `3px solid ${status.color}` }}
      >
        <span className="font-semibold text-sm text-text-primary pt-2">{status.name}</span>
        <span className="ml-auto text-xs text-text-secondary pt-2">{tickets.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex flex-col gap-2 flex-1 p-2 rounded-lg min-h-32 transition-colors ${
          isOver ? 'bg-blue-50' : 'bg-surface-raised'
        }`}
      >
        <SortableContext items={tickets.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} onClick={() => onTicketClick(ticket)} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
