import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { TicketDto } from '@shared/types/api.types';

interface Props {
  ticket: TicketDto;
  onClick: () => void;
  isDragOverlay?: boolean;
}

const PRIORITY_COLORS: Record<string, string> = {
  low: '#36b37e', medium: '#ff991f', high: '#de350b', critical: '#6554c0',
};
const TYPE_ICONS: Record<string, string> = { task: '✓', bug: '⚠', story: '★' };

export default function TicketCard({ ticket, onClick, isDragOverlay = false }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ticket.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={isDragOverlay ? undefined : setNodeRef}
      style={isDragOverlay ? { rotate: '2deg', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' } : style}
      {...(isDragOverlay ? {} : { ...attributes, ...listeners })}
      onClick={onClick}
      className="bg-surface rounded border border-border p-3 cursor-pointer hover:shadow-sm select-none"
    >
      <div className="flex items-start gap-2">
        <span className="text-xs mt-0.5" style={{ color: PRIORITY_COLORS[ticket.priority] }} title={`Priority: ${ticket.priority}`}>
          {TYPE_ICONS[ticket.type]}
        </span>
        <p className="text-sm text-text-primary flex-1 leading-snug">{ticket.title}</p>
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-text-secondary font-mono">{ticket.ticketNumber}</span>
        {ticket.assigneeName && (
          <span className="text-xs text-text-secondary truncate max-w-[80px]" title={ticket.assigneeName}>
            {ticket.assigneeName.split(' ')[0]}
          </span>
        )}
      </div>
      {ticket.epicTitle && (
        <span className="text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded mt-1 inline-block border border-purple-100">
          {ticket.epicTitle}
        </span>
      )}
    </div>
  );
}
