import { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTicket, useUpdateTicket } from '@/hooks/useTickets';
import { useComments, useCreateComment, useDeleteComment } from '@/hooks/useComments';
import { useAttachments, useUploadAttachment, useDeleteAttachment } from '@/hooks/useAttachments';
import { useActivity } from '@/hooks/useActivity';
import { useStatuses } from '@/hooks/useStatuses';
import { useUsers } from '@/hooks/useUsers';
import { useAuthStore } from '@/stores/auth.store';
import { useSprints } from '@/hooks/useSprints';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { EpicDto } from '@shared/types/api.types';
import WorkLogTab from '@/components/WorkLog/WorkLogTab';
import type { CommentDto } from '@shared/types/api.types';
import api from '@/services/api.client';

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtDate(val: string | null | undefined): string {
  if (!val) return '—';
  const d = new Date(val);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

function fmtShortDate(val: string | null | undefined): string {
  if (!val) return '—';
  const d = new Date(val);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

function FileSize({ bytes }: { bytes: number }) {
  if (bytes < 1024) return <>{bytes} B</>;
  if (bytes < 1024 * 1024) return <>{(bytes / 1024).toFixed(1)} KB</>;
  return <>{(bytes / (1024 * 1024)).toFixed(1)} MB</>;
}

function PencilIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}

/** Render plain text with URLs auto-linked */
function RichText({ text }: { text: string }) {
  const urlRe = /https?:\/\/[^\s<>"]+/g;
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = urlRe.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(<a key={m.index} href={m[0]} target="_blank" rel="noopener noreferrer" className="text-primary underline break-all">{m[0]}</a>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <span className="whitespace-pre-wrap">{parts}</span>;
}

// ── EditableField ─────────────────────────────────────────────────────────────

interface EditableFieldProps {
  label: string; value: string; isEditing: boolean;
  onStartEdit: () => void; onCancel: () => void; children: React.ReactNode;
}
function EditableField({ label, value, isEditing, onStartEdit, onCancel, children }: EditableFieldProps) {
  return (
    <div>
      <span className="text-text-secondary text-xs uppercase tracking-wide block mb-1">{label}</span>
      {isEditing ? (
        <div className="flex items-center gap-2">
          {children}
          <button onClick={onCancel} className="text-xs text-text-secondary hover:text-text-primary px-1 py-0.5 rounded border border-border">✕</button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 group">
          <span className="font-semibold text-text-primary">{value}</span>
          <button onClick={onStartEdit} className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-primary transition-opacity p-0.5 rounded hover:bg-surface-hover" title={`Edit ${label}`}>
            <PencilIcon />
          </button>
        </div>
      )}
    </div>
  );
}

// ── CommentItem (with reply + attachment) ─────────────────────────────────────

interface CommentItemProps {
  comment: CommentDto;
  ticketId: string;
  userId: string | undefined;
  userRole: string | undefined;
  onDelete: (id: string) => void;
  depth?: number;
}

function CommentItem({ comment, ticketId, userId, userRole, onDelete, depth = 0 }: CommentItemProps) {
  const addComment = useCreateComment(ticketId);
  const [showReply, setShowReply] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [showReplies, setShowReplies] = useState(true);
  const [uploading, setUploading] = useState(false);
  const attachFileRef = useRef<HTMLInputElement>(null);
  const [commentAtts, setCommentAtts] = useState<{ id: string; fileName: string; blobUrl: string; mimeType: string }[]>([]);

  const isImage = (mime: string) => mime.startsWith('image/');

  async function loadAttachments() {
    const res = await api.get<{ data: typeof commentAtts }>(`/comments/${comment.id}/attachments`);
    setCommentAtts(res.data.data);
  }

  useState(() => { loadAttachments(); });

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyBody.trim()) return;
    await addComment.mutateAsync({ body: replyBody, parentId: comment.id });
    setReplyBody('');
    setShowReply(false);
  }

  async function handleAttachFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append('file', file);
    await api.post(`/comments/${comment.id}/attachments`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
    await loadAttachments();
    setUploading(false);
    if (attachFileRef.current) attachFileRef.current.value = '';
  }

  const replies = comment.replies ?? [];

  return (
    <div className={depth > 0 ? 'ml-6 border-l-2 border-border pl-4' : ''}>
      <div className="border-b border-border pb-3 last:border-0 mb-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm text-text-primary">{comment.authorName}</span>
          <span className="text-xs text-text-secondary">{fmtDate(comment.createdAt)}</span>
          <div className="ml-auto flex items-center gap-2">
            {depth === 0 && (
              <button onClick={() => setShowReply((v) => !v)} className="text-xs text-text-secondary hover:text-primary">
                Reply
              </button>
            )}
            <button onClick={() => attachFileRef.current?.click()} disabled={uploading} className="text-xs text-text-secondary hover:text-primary">
              {uploading ? 'Uploading…' : '📎'}
            </button>
            <input ref={attachFileRef} type="file" className="hidden" onChange={handleAttachFile}
              accept=".jpg,.jpeg,.png,.pdf,.docx,.xlsx" />
            {(userId === comment.authorId || userRole === 'admin') && (
              <button onClick={() => onDelete(comment.id)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
            )}
          </div>
        </div>

        <p className="text-sm text-text-primary mb-2"><RichText text={comment.body} /></p>

        {/* Inline attachments */}
        {commentAtts.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {commentAtts.map((att) => (
              isImage(att.mimeType) ? (
                <a key={att.id} href={att.blobUrl} target="_blank" rel="noopener noreferrer">
                  <img src={att.blobUrl} alt={att.fileName} className="h-20 w-20 object-cover rounded border border-border hover:opacity-90" />
                </a>
              ) : (
                <a key={att.id} href={att.blobUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-2 py-1 border border-border rounded text-xs text-primary hover:bg-surface-hover">
                  📄 {att.fileName}
                </a>
              )
            ))}
          </div>
        )}

        {/* Reply box */}
        {showReply && (
          <form onSubmit={handleReply} className="flex gap-2 mt-2">
            <textarea value={replyBody} onChange={(e) => setReplyBody(e.target.value)} rows={2} placeholder="Write a reply…"
              className="flex-1 border border-border rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary" />
            <div className="flex flex-col gap-1 self-end">
              <button type="submit" disabled={addComment.isPending} className="px-3 py-1.5 bg-primary text-white rounded text-xs font-medium hover:bg-primary-hover disabled:opacity-50">Reply</button>
              <button type="button" onClick={() => setShowReply(false)} className="px-3 py-1.5 border border-border rounded text-xs hover:bg-surface-hover">Cancel</button>
            </div>
          </form>
        )}
      </div>

      {/* Replies */}
      {replies.length > 0 && (
        <div className="ml-6">
          <button onClick={() => setShowReplies((v) => !v)} className="text-xs text-text-secondary hover:text-primary mb-2">
            {showReplies ? '▾' : '▸'} {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
          </button>
          {showReplies && replies.map((r) => (
            <CommentItem key={r.id} comment={r} ticketId={ticketId} userId={userId} userRole={userRole} onDelete={onDelete} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

type Tab = 'details' | 'worklog' | 'history';

export default function TicketDetailPage() {
  const { projectId, ticketId } = useParams<{ projectId: string; ticketId: string }>();
  const { user } = useAuthStore();

  const { data: ticket, isLoading } = useTicket(ticketId!);
  const { data: comments = [], refetch: refetchComments } = useComments(ticketId!);
  const { data: attachments = [] } = useAttachments(ticketId!);
  const { data: activity = [] } = useActivity(ticketId!);
  const { data: statuses = [] } = useStatuses(projectId!);
  const { data: users = [] } = useUsers();

  const { data: sprints = [] } = useSprints(projectId!);
  const { data: epics = [] } = useQuery<EpicDto[]>({
    queryKey: ['epics', projectId],
    queryFn: async () => { const r = await api.get<{ data: EpicDto[] }>(`/epics/project/${projectId}`); return r.data.data; },
    enabled: !!projectId,
  });

  const updateTicket = useUpdateTicket(projectId!);
  const addComment = useCreateComment(ticketId!);
  const deleteComment = useDeleteComment(ticketId!);
  const uploadAttachment = useUploadAttachment(ticketId!);
  const deleteAttachmentMutation = useDeleteAttachment(ticketId!);

  const qc = useQueryClient();
  const [showNewEpic, setShowNewEpic] = useState(false);
  const [newEpicTitle, setNewEpicTitle] = useState('');
  const createEpicMutation = useMutation({
    mutationFn: (title: string) => api.post<{ data: EpicDto }>('/epics', { projectId, title, color: '#0052CC' }),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ['epics', projectId] });
      await saveField('epicId', res.data.data.id);
      setShowNewEpic(false);
      setNewEpicTitle('');
    },
  });

  const [tab, setTab] = useState<Tab>('details');
  const [commentBody, setCommentBody] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState('');

  function startEdit(field: string) {
    if (field === 'description') setEditDescription(ticket?.description ?? '');
    setEditingField(field);
  }
  function cancelEdit() { setEditingField(null); }
  async function saveField(field: string, value: unknown) {
    await updateTicket.mutateAsync({ id: ticketId!, data: { [field]: value } as never });
    setEditingField(null);
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentBody.trim()) return;
    await addComment.mutateAsync({ body: commentBody });
    setCommentBody('');
    refetchComments();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadAttachment.mutateAsync(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  if (isLoading) return <div className="p-8 text-text-secondary">Loading…</div>;
  if (!ticket) return <div className="p-8 text-red-600">Ticket not found.</div>;

  const selectClass = 'border border-primary rounded px-2 py-1 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary';

  return (
    <div className="p-6 max-w-4xl">
      <nav className="text-sm text-text-secondary flex items-center gap-1 mb-4">
        <Link to="/projects" className="hover:text-primary">Projects</Link>
        <span>/</span>
        <Link to={`/projects/${projectId}/board`} className="hover:text-primary">Board</Link>
        <span>/</span>
        <span className="font-mono">{ticket.ticketNumber}</span>
      </nav>

      {/* Ticket card */}
      <div className="bg-surface rounded-lg border border-border p-6 mb-6">
        <h1 className="text-xl font-bold text-text-primary mb-2">{ticket.title}</h1>
        <p className="text-xs text-text-secondary mb-6 italic">Hover any field and click the pencil icon to edit.</p>

        <div className="grid grid-cols-2 gap-y-5 gap-x-8 text-sm mb-6">
          <EditableField label="Status" value={ticket.statusName} isEditing={editingField === 'status'} onStartEdit={() => startEdit('status')} onCancel={cancelEdit}>
            <select autoFocus defaultValue={ticket.statusId} className={selectClass} onChange={async (e) => saveField('statusId', e.target.value)}>
              {statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </EditableField>

          <EditableField label="Priority" value={ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)} isEditing={editingField === 'priority'} onStartEdit={() => startEdit('priority')} onCancel={cancelEdit}>
            <select autoFocus defaultValue={ticket.priority} className={selectClass} onChange={async (e) => saveField('priority', e.target.value)}>
              {['low', 'medium', 'high', 'critical'].map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </EditableField>

          <EditableField label="Type" value={ticket.type.charAt(0).toUpperCase() + ticket.type.slice(1)} isEditing={editingField === 'type'} onStartEdit={() => startEdit('type')} onCancel={cancelEdit}>
            <select autoFocus defaultValue={ticket.type} className={selectClass} onChange={async (e) => saveField('type', e.target.value)}>
              {['task', 'bug', 'story'].map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </EditableField>

          <EditableField label="Assignee" value={ticket.assigneeName ?? '—'} isEditing={editingField === 'assignee'} onStartEdit={() => startEdit('assignee')} onCancel={cancelEdit}>
            <select autoFocus defaultValue={ticket.assigneeId ?? ''} className={selectClass} onChange={async (e) => saveField('assigneeId', e.target.value || null)}>
              <option value="">Unassigned</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </EditableField>

          <EditableField label="Reporter" value={ticket.reporterName} isEditing={editingField === 'reporter'} onStartEdit={() => startEdit('reporter')} onCancel={cancelEdit}>
            <select autoFocus defaultValue={ticket.reporterId} className={selectClass} onChange={async (e) => saveField('reporterId', e.target.value)}>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </EditableField>

          <div>
            <span className="text-text-secondary text-xs uppercase tracking-wide block mb-1">Due date</span>
            <span className="font-semibold text-text-primary">{fmtShortDate(ticket.dueDate)}</span>
          </div>

          <EditableField label="Epic" value={ticket.epicTitle ?? 'None'} isEditing={editingField === 'epic'} onStartEdit={() => { startEdit('epic'); setShowNewEpic(false); }} onCancel={() => { cancelEdit(); setShowNewEpic(false); }}>
            {showNewEpic ? (
              <form onSubmit={(e) => { e.preventDefault(); if (newEpicTitle.trim()) createEpicMutation.mutate(newEpicTitle.trim()); }} className="flex gap-1">
                <input autoFocus type="text" value={newEpicTitle} onChange={(e) => setNewEpicTitle(e.target.value)}
                  placeholder="Epic name" className="border border-border rounded px-2 py-1 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-primary" />
                <button type="submit" disabled={createEpicMutation.isPending} className="px-2 py-1 text-xs bg-primary text-white rounded hover:bg-primary-hover disabled:opacity-50">Add</button>
                <button type="button" onClick={() => setShowNewEpic(false)} className="px-2 py-1 text-xs border border-border rounded hover:bg-surface-hover">✕</button>
              </form>
            ) : (
              <div className="flex items-center gap-1">
                <select autoFocus defaultValue={ticket.epicId ?? ''} className={selectClass} onChange={async (e) => saveField('epicId', e.target.value || null)}>
                  <option value="">No Epic</option>
                  {epics.map((ep) => <option key={ep.id} value={ep.id}>{ep.title}</option>)}
                </select>
                <button type="button" onClick={() => setShowNewEpic(true)} className="text-xs text-primary hover:underline whitespace-nowrap">＋ New</button>
              </div>
            )}
          </EditableField>

          <EditableField label="Sprint" value={ticket.sprintName ?? 'Backlog'} isEditing={editingField === 'sprint'} onStartEdit={() => startEdit('sprint')} onCancel={cancelEdit}>
            <select autoFocus defaultValue={ticket.sprintId ?? ''} className={selectClass} onChange={async (e) => saveField('sprintId', e.target.value || null)}>
              <option value="">Backlog</option>
              {sprints.filter((s) => s.status !== 'completed').map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </EditableField>

          {ticket.storyPoints != null && (
            <div>
              <span className="text-text-secondary text-xs uppercase tracking-wide block mb-1">Story points</span>
              <span className="font-semibold text-text-primary">{ticket.storyPoints}</span>
            </div>
          )}
          <div>
            <span className="text-text-secondary text-xs uppercase tracking-wide block mb-1">Created</span>
            <span className="font-semibold text-text-primary">{fmtDate(ticket.createdAt)}</span>
          </div>
        </div>

        {/* Description */}
        <div className="border-t border-border pt-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-text-secondary text-xs uppercase tracking-wide">Description</span>
            {editingField !== 'description' && (
              <button onClick={() => startEdit('description')} className="text-text-secondary hover:text-primary p-0.5 rounded hover:bg-surface-hover" title="Edit description">
                <PencilIcon />
              </button>
            )}
          </div>
          {editingField === 'description' ? (
            <div className="space-y-2">
              <textarea autoFocus value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={5}
                className="w-full border border-border rounded px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary" />
              <div className="flex gap-2">
                <button onClick={() => saveField('description', editDescription || null)} disabled={updateTicket.isPending}
                  className="px-3 py-1 bg-primary text-white rounded text-xs font-medium hover:bg-primary-hover disabled:opacity-50">Save</button>
                <button onClick={cancelEdit} className="px-3 py-1 border border-border rounded text-xs hover:bg-surface-hover">Cancel</button>
              </div>
            </div>
          ) : (
            <p className="text-text-primary text-sm min-h-[1.5rem]">
              {ticket.description
                ? <RichText text={ticket.description} />
                : <span className="text-text-secondary italic">No description — click pencil to add</span>}
            </p>
          )}
        </div>
      </div>

      {/* Attachments */}
      <div className="bg-surface rounded-lg border border-border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-text-primary">Attachments ({attachments.length})</h2>
          <button onClick={() => fileInputRef.current?.click()} disabled={uploadAttachment.isPending}
            className="px-3 py-1.5 bg-primary text-white rounded text-sm font-medium hover:bg-primary-hover disabled:opacity-50">
            {uploadAttachment.isPending ? 'Uploading…' : '+ Upload file'}
          </button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
        </div>
        {attachments.length === 0 ? <p className="text-sm text-text-secondary">No attachments yet.</p> : (
          <ul className="space-y-2">
            {attachments.map((att) => (
              <li key={att.id} className="flex items-center gap-3 p-2 rounded border border-border text-sm">
                <a href={att.blobUrl} target="_blank" rel="noopener noreferrer" className="flex-1 text-primary hover:underline truncate">{att.fileName}</a>
                <span className="text-text-secondary shrink-0"><FileSize bytes={att.fileSize} /></span>
                <span className="text-text-secondary shrink-0">{fmtShortDate(att.createdAt)}</span>
                <button onClick={() => deleteAttachmentMutation.mutate(att.id)} disabled={deleteAttachmentMutation.isPending}
                  className="text-red-500 hover:text-red-700 text-xs shrink-0 disabled:opacity-50">Delete</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Tabbed bottom section */}
      <div className="bg-surface rounded-lg border border-border">
        {/* Tab bar */}
        <div className="flex border-b border-border">
          {([['details', 'Comments'], ['worklog', 'Work Log'], ['history', 'History']] as [Tab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}>
              {label}
              {t === 'details' && <span className="ml-1 text-xs text-text-secondary">({comments.length})</span>}
              {t === 'history' && <span className="ml-1 text-xs text-text-secondary">({activity.length})</span>}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* ── Comments tab ── */}
          {tab === 'details' && (
            <div>
              <div className="space-y-2 mb-4">
                {comments.length === 0 && <p className="text-sm text-text-secondary">No comments yet.</p>}
                {comments.map((c) => (
                  <CommentItem key={c.id} comment={c} ticketId={ticketId!} userId={user?.id} userRole={user?.role}
                    onDelete={(id) => deleteComment.mutate(id)} />
                ))}
              </div>
              <form onSubmit={handleComment} className="flex gap-2">
                <textarea value={commentBody} onChange={(e) => setCommentBody(e.target.value)} placeholder="Add a comment… (URLs are auto-linked)" rows={2}
                  className="flex-1 border border-border rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary" />
                <button type="submit" disabled={addComment.isPending}
                  className="px-4 py-2 bg-primary text-white rounded text-sm font-medium hover:bg-primary-hover disabled:opacity-50 self-end">Post</button>
              </form>
            </div>
          )}

          {/* ── Work Log tab ── */}
          {tab === 'worklog' && <WorkLogTab ticketId={ticketId!} />}

          {/* ── History tab ── */}
          {tab === 'history' && (
            <div>
              {activity.length === 0 ? <p className="text-sm text-text-secondary">No changes recorded yet.</p> : (
                <ol className="relative border-l-2 border-border ml-3">
                  {activity.map((a) => {
                    const isStatus = a.fieldName === 'status';
                    const isCreated = !a.fieldName && a.action === 'created';
                    const isComment = a.fieldName === 'comment';
                    const isAttachment = a.fieldName === 'attachment';
                    const dotColor = isCreated ? 'bg-green-500' : isStatus ? 'bg-primary' : isComment ? 'bg-purple-400' : isAttachment ? 'bg-orange-400' : 'bg-border';
                    const actionLabel = () => {
                      if (isCreated) return 'created this ticket';
                      if (isComment && a.action === 'commented') return 'added a comment';
                      if (isComment && a.action === 'replied') return 'replied to a comment';
                      if (isComment && a.action === 'updated') return 'edited a comment';
                      if (isComment && a.action === 'deleted') return 'deleted a comment';
                      if (isAttachment && a.action === 'uploaded') return 'uploaded an attachment';
                      if (isAttachment && a.action === 'deleted') return 'deleted an attachment';
                      return <> changed <span className="font-semibold text-text-primary capitalize">{a.fieldName}</span></>;
                    };
                    const showFromTo = !isCreated && !isComment && !isAttachment && (a.oldValue !== null || a.newValue !== null);
                    const showPreview = (isAttachment || isComment) && (a.oldValue ?? a.newValue);
                    return (
                      <li key={a.id} className="mb-5 ml-5">
                        <span className={`absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-surface ${dotColor}`} />
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-text-primary">{a.userName}</span>
                            <span className="text-sm text-text-secondary">{actionLabel()}</span>
                            <span className="text-xs text-text-secondary ml-auto whitespace-nowrap">{fmtDate(a.createdAt)}</span>
                          </div>
                          {showFromTo && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-text-secondary">from</span>
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 border border-red-200 line-through">{a.oldValue ?? '—'}</span>
                              <span className="text-xs text-text-secondary">→</span>
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200">{a.newValue ?? '—'}</span>
                            </div>
                          )}
                          {showPreview && (
                            <div className="px-3 py-1.5 rounded bg-surface-hover border border-border text-xs text-text-secondary italic max-w-lg truncate">
                              {a.oldValue ?? a.newValue}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
