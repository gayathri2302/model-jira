import { getPool, sql } from '@/config/db.config';
import type { CommentDto } from '../../../shared/types/api.types';

export async function listComments(ticketId: string): Promise<CommentDto[]> {
  const pool = await getPool();
  const res = await pool
    .request()
    .input('ticketId', sql.UniqueIdentifier, ticketId)
    .query<CommentDto>(`
      SELECT c.id, c.ticket_id, c.author_id, u.name AS author_name,
             u.avatar_url AS author_avatar_url, c.body, c.created_at, c.updated_at
      FROM comments c
      JOIN users u ON u.id = c.author_id
      WHERE c.ticket_id = @ticketId AND c.deleted_at IS NULL
      ORDER BY c.created_at ASC
    `);
  return res.recordset;
}

export async function createComment(
  ticketId: string,
  authorId: string,
  body: string,
): Promise<CommentDto> {
  const pool = await getPool();
  const res = await pool
    .request()
    .input('ticketId', sql.UniqueIdentifier, ticketId)
    .input('authorId', sql.UniqueIdentifier, authorId)
    .input('body', sql.NVarChar, body)
    .query<{ id: string }>(`
      INSERT INTO comments (ticket_id, author_id, body)
      OUTPUT INSERTED.id
      VALUES (@ticketId, @authorId, @body)
    `);
  const id = res.recordset[0].id;
  const all = await listComments(ticketId);
  return all.find((c) => c.id === id) as CommentDto;
}

export async function updateComment(id: string, body: string): Promise<void> {
  const pool = await getPool();
  await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .input('body', sql.NVarChar, body)
    .query('UPDATE comments SET body = @body, updated_at = GETUTCDATE() WHERE id = @id');
}

export async function softDeleteComment(id: string): Promise<void> {
  const pool = await getPool();
  await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .query('UPDATE comments SET deleted_at = GETUTCDATE() WHERE id = @id');
}
