import { getPool, sql } from '@/config/db.config';
import type { CommentDto, CommentAttachmentDto } from '../../../shared/types/api.types';

export async function listComments(ticketId: string): Promise<CommentDto[]> {
  const pool = await getPool();
  // fetch top-level comments
  const res = await pool.request()
    .input('ticketId', sql.UniqueIdentifier, ticketId)
    .query<CommentDto>(`
      SELECT c.id, c.ticket_id, c.parent_id, c.author_id, u.name AS author_name,
             u.avatar_url AS author_avatar_url, c.body, c.created_at, c.updated_at
      FROM mj_comments c
      JOIN mj_users u ON u.id = c.author_id
      WHERE c.ticket_id = @ticketId AND c.deleted_at IS NULL
      ORDER BY c.created_at ASC
    `);

  const all = res.recordset;
  const byId = new Map(all.map((c) => ({ ...c, replies: [] as CommentDto[] })).map((c) => [c.id, c]));

  // attach replies to parents
  const roots: CommentDto[] = [];
  for (const c of byId.values()) {
    if (c.parentId) {
      const parent = byId.get(c.parentId);
      if (parent) { parent.replies = parent.replies ?? []; parent.replies.push(c); }
    } else {
      roots.push(c);
    }
  }
  return roots;
}

export async function findCommentById(id: string): Promise<{ id: string; ticket_id: string; body: string } | null> {
  const pool = await getPool();
  const res = await pool.request()
    .input('id', sql.UniqueIdentifier, id)
    .query<{ id: string; ticket_id: string; body: string }>(
      'SELECT id, ticket_id, body FROM mj_comments WHERE id = @id AND deleted_at IS NULL',
    );
  return res.recordset[0] ?? null;
}

export async function createComment(ticketId: string, authorId: string, body: string, parentId?: string | null): Promise<CommentDto> {
  const pool = await getPool();
  const res = await pool.request()
    .input('ticketId', sql.UniqueIdentifier, ticketId)
    .input('authorId', sql.UniqueIdentifier, authorId)
    .input('body', sql.NVarChar, body)
    .input('parentId', sql.UniqueIdentifier, parentId ?? null)
    .query<{ id: string }>(`
      INSERT INTO mj_comments (ticket_id, author_id, body, parent_id)
      OUTPUT INSERTED.id
      VALUES (@ticketId, @authorId, @body, @parentId)
    `);
  const id = res.recordset[0].id;
  // return flat comment for immediate use
  const flat = await pool.request()
    .input('id', sql.UniqueIdentifier, id)
    .query<CommentDto>(`
      SELECT c.id, c.ticket_id, c.parent_id, c.author_id, u.name AS author_name,
             u.avatar_url AS author_avatar_url, c.body, c.created_at, c.updated_at
      FROM mj_comments c JOIN mj_users u ON u.id = c.author_id WHERE c.id = @id
    `);
  return flat.recordset[0];
}

export async function updateComment(id: string, body: string): Promise<void> {
  const pool = await getPool();
  await pool.request()
    .input('id', sql.UniqueIdentifier, id)
    .input('body', sql.NVarChar, body)
    .query('UPDATE mj_comments SET body = @body, updated_at = GETUTCDATE() WHERE id = @id');
}

export async function softDeleteComment(id: string): Promise<void> {
  const pool = await getPool();
  await pool.request()
    .input('id', sql.UniqueIdentifier, id)
    .query('UPDATE mj_comments SET deleted_at = GETUTCDATE() WHERE id = @id');
}

// Comment attachments
export async function listCommentAttachments(commentId: string): Promise<CommentAttachmentDto[]> {
  const pool = await getPool();
  const res = await pool.request()
    .input('commentId', sql.UniqueIdentifier, commentId)
    .query<CommentAttachmentDto>(`
      SELECT a.id, a.comment_id, a.uploaded_by_id, u.name AS uploader_name,
             a.file_name, a.file_size, a.mime_type, a.blob_url, a.blob_name, a.created_at
      FROM mj_comment_attachments a JOIN mj_users u ON u.id = a.uploaded_by_id
      WHERE a.comment_id = @commentId ORDER BY a.created_at ASC
    `);
  return res.recordset;
}

export async function createCommentAttachment(data: {
  commentId: string; uploadedById: string; fileName: string;
  fileSize: number; mimeType: string; blobUrl: string; blobName: string;
}): Promise<CommentAttachmentDto> {
  const pool = await getPool();
  const res = await pool.request()
    .input('commentId', sql.UniqueIdentifier, data.commentId)
    .input('uploadedById', sql.UniqueIdentifier, data.uploadedById)
    .input('fileName', sql.NVarChar, data.fileName)
    .input('fileSize', sql.BigInt, data.fileSize)
    .input('mimeType', sql.NVarChar, data.mimeType)
    .input('blobUrl', sql.NVarChar, data.blobUrl)
    .input('blobName', sql.NVarChar, data.blobName)
    .query<{ id: string }>(`
      INSERT INTO mj_comment_attachments (comment_id, uploaded_by_id, file_name, file_size, mime_type, blob_url, blob_name)
      OUTPUT INSERTED.id VALUES (@commentId, @uploadedById, @fileName, @fileSize, @mimeType, @blobUrl, @blobName)
    `);
  const id = res.recordset[0].id;
  const all = await listCommentAttachments(data.commentId);
  return all.find((a) => a.id === id) as CommentAttachmentDto;
}

export async function deleteCommentAttachment(id: string): Promise<{ blob_name: string } | null> {
  const pool = await getPool();
  const res = await pool.request()
    .input('id', sql.UniqueIdentifier, id)
    .query<{ blob_name: string }>('SELECT blob_name FROM mj_comment_attachments WHERE id = @id');
  if (!res.recordset[0]) return null;
  await pool.request().input('id', sql.UniqueIdentifier, id).query('DELETE FROM mj_comment_attachments WHERE id = @id');
  return res.recordset[0];
}
