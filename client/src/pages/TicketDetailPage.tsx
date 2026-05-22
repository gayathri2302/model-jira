import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTicket } from '@/hooks/useTickets';
import { useComments, useCreateComment } from '@/hooks/useComments';

export default function TicketDetailPage() {
  const { projectId, ticketId } = useParams<{ projectId: string; ticketId: string }>();
  const { data: ticket, isLoading } = useTicket(ticketId!);
  const { data: comments = [] } = useComments(ticketId!);
  const addComment = useCreateComment(ticketId!);
  const [commentBody, setCommentBody] = useState('');

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentBody.trim()) return;
    await addComment.mutateAsync(commentBody);
    setCommentBody('');
  }

  if (isLoading) return <div className="p-8 text-text-secondary">Loading…</div>;
  if (!ticket) return <div className="p-8 text-red-600">Ticket not found.</div>;

  return (
    <div className="p-6 max-w-4xl">
      <nav className="text-sm text-text-secondary flex items-center gap-1 mb-4">
        <Link to="/projects" className="hover:text-primary">Projects</Link>
        <span>/</span>
        <Link to={`/projects/${projectId}/board`} className="hover:text-primary">Board</Link>
        <span>/</span>
        <span className="font-mono">{ticket.ticketNumber}</span>
      </nav>

      <div className="bg-surface rounded-lg border border-border p-6 mb-6">
        <div className="flex items-start gap-3 mb-4">
          <h1 className="text-xl font-bold text-text-primary flex-1">{ticket.title}</h1>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <span className="text-text-secondary">Status</span>
            <p className="font-medium">{ticket.statusName}</p>
          </div>
          <div>
            <span className="text-text-secondary">Priority</span>
            <p className="font-medium capitalize">{ticket.priority}</p>
          </div>
          <div>
            <span className="text-text-secondary">Type</span>
            <p className="font-medium capitalize">{ticket.type}</p>
          </div>
          <div>
            <span className="text-text-secondary">Assignee</span>
            <p className="font-medium">{ticket.assigneeName ?? '—'}</p>
          </div>
          <div>
            <span className="text-text-secondary">Reporter</span>
            <p className="font-medium">{ticket.reporterName}</p>
          </div>
          {ticket.epicTitle && (
            <div>
              <span className="text-text-secondary">Epic</span>
              <p className="font-medium">{ticket.epicTitle}</p>
            </div>
          )}
          {ticket.storyPoints != null && (
            <div>
              <span className="text-text-secondary">Story points</span>
              <p className="font-medium">{ticket.storyPoints}</p>
            </div>
          )}
          {ticket.dueDate && (
            <div>
              <span className="text-text-secondary">Due date</span>
              <p className="font-medium">{ticket.dueDate}</p>
            </div>
          )}
        </div>

        {ticket.description && (
          <div>
            <p className="text-text-secondary text-sm mb-1">Description</p>
            <p className="text-text-primary whitespace-pre-wrap text-sm">{ticket.description}</p>
          </div>
        )}
      </div>

      <div className="bg-surface rounded-lg border border-border p-6">
        <h2 className="font-semibold text-text-primary mb-4">Comments ({comments.length})</h2>
        <div className="space-y-4 mb-4">
          {comments.map((c) => (
            <div key={c.id} className="border-b border-border pb-4 last:border-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm text-text-primary">{c.authorName}</span>
                <span className="text-xs text-text-secondary">
                  {new Date(c.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-text-primary whitespace-pre-wrap">{c.body}</p>
            </div>
          ))}
        </div>
        <form onSubmit={handleComment} className="flex gap-2">
          <textarea
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            placeholder="Add a comment…"
            rows={2}
            className="flex-1 border border-border rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={addComment.isPending}
            className="px-4 py-2 bg-primary text-white rounded text-sm font-medium hover:bg-primary-hover disabled:opacity-50 self-end"
          >
            Post
          </button>
        </form>
      </div>
    </div>
  );
}
