import { getPool, sql } from '@/config/db.config';
import type { ActivityDto } from '../../../shared/types/api.types';

export async function listActivity(ticketId: string): Promise<ActivityDto[]> {
  const pool = await getPool();
  const res = await pool
    .request()
    .input('ticketId', sql.UniqueIdentifier, ticketId)
    .query<ActivityDto>(`
      SELECT a.id, a.ticket_id, a.user_id, u.name AS user_name,
             a.action, a.field_name, a.old_value, a.new_value, a.created_at
      FROM mj_activity_history a
      JOIN mj_users u ON u.id = a.user_id
      WHERE a.ticket_id = @ticketId
      ORDER BY a.created_at DESC
    `);
  return res.recordset;
}

export async function logActivity(data: {
  ticketId: string;
  userId: string;
  action: string;
  fieldName?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
}): Promise<void> {
  const pool = await getPool();
  await pool
    .request()
    .input('ticketId', sql.UniqueIdentifier, data.ticketId)
    .input('userId', sql.UniqueIdentifier, data.userId)
    .input('action', sql.NVarChar, data.action)
    .input('fieldName', sql.NVarChar, data.fieldName ?? null)
    .input('oldValue', sql.NVarChar, data.oldValue ?? null)
    .input('newValue', sql.NVarChar, data.newValue ?? null)
    .query(`
      INSERT INTO mj_activity_history (ticket_id, user_id, action, field_name, old_value, new_value)
      VALUES (@ticketId, @userId, @action, @fieldName, @oldValue, @newValue)
    `);
}
