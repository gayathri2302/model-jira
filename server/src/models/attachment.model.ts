import { getPool, sql } from '@/config/db.config';
import type { AttachmentDto } from '../../../shared/types/api.types';

export async function listAttachments(ticketId: string): Promise<AttachmentDto[]> {
  const pool = await getPool();
  const res = await pool
    .request()
    .input('ticketId', sql.UniqueIdentifier, ticketId)
    .query<AttachmentDto>(`
      SELECT a.id, a.ticket_id, a.uploaded_by_id, u.name AS uploader_name,
             a.file_name, a.file_size, a.mime_type, a.blob_url, a.blob_name, a.created_at
      FROM mj_attachments a
      JOIN mj_users u ON u.id = a.uploaded_by_id
      WHERE a.ticket_id = @ticketId
      ORDER BY a.created_at DESC
    `);
  return res.recordset;
}

export async function createAttachment(data: {
  ticketId: string;
  uploadedById: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  blobUrl: string;
  blobName: string;
}): Promise<AttachmentDto> {
  const pool = await getPool();
  const res = await pool
    .request()
    .input('ticketId', sql.UniqueIdentifier, data.ticketId)
    .input('uploadedById', sql.UniqueIdentifier, data.uploadedById)
    .input('fileName', sql.NVarChar, data.fileName)
    .input('fileSize', sql.BigInt, data.fileSize)
    .input('mimeType', sql.NVarChar, data.mimeType)
    .input('blobUrl', sql.NVarChar, data.blobUrl)
    .input('blobName', sql.NVarChar, data.blobName)
    .query<{ id: string }>(`
      INSERT INTO mj_attachments (ticket_id, uploaded_by_id, file_name, file_size, mime_type, blob_url, blob_name)
      OUTPUT INSERTED.id
      VALUES (@ticketId, @uploadedById, @fileName, @fileSize, @mimeType, @blobUrl, @blobName)
    `);
  const id = res.recordset[0].id;
  const all = await listAttachments(data.ticketId);
  return all.find((a) => a.id === id) as AttachmentDto;
}

export async function findAttachmentById(id: string): Promise<{ id: string; blob_name: string; ticket_id: string; file_name: string } | null> {
  const pool = await getPool();
  const res = await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .query<{ id: string; blob_name: string; ticket_id: string; file_name: string }>(
      'SELECT id, blob_name, ticket_id, file_name FROM mj_attachments WHERE id = @id',
    );
  return res.recordset[0] ?? null;
}

export async function deleteAttachment(id: string): Promise<void> {
  const pool = await getPool();
  await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .query('DELETE FROM mj_attachments WHERE id = @id');
}
