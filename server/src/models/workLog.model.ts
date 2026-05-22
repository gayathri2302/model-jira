import { getPool, sql } from '@/config/db.config';
import type { WorkLogDto } from '../../../shared/types/api.types';

export async function listWorkLogs(ticketId: string): Promise<WorkLogDto[]> {
  const pool = await getPool();
  const res = await pool
    .request()
    .input('ticketId', sql.UniqueIdentifier, ticketId)
    .query<WorkLogDto>(`
      SELECT w.id, w.ticket_id, w.user_id, u.name AS user_name,
             w.minutes_logged, w.log_date, w.note, w.created_at
      FROM work_logs w
      JOIN users u ON u.id = w.user_id
      WHERE w.ticket_id = @ticketId
      ORDER BY w.log_date DESC, w.created_at DESC
    `);
  return res.recordset;
}

export async function createWorkLog(data: {
  ticketId: string;
  userId: string;
  minutesLogged: number;
  logDate: string;
  note: string | null;
}): Promise<WorkLogDto> {
  const pool = await getPool();
  const res = await pool
    .request()
    .input('ticketId', sql.UniqueIdentifier, data.ticketId)
    .input('userId', sql.UniqueIdentifier, data.userId)
    .input('minutes', sql.Int, data.minutesLogged)
    .input('logDate', sql.Date, data.logDate)
    .input('note', sql.NVarChar, data.note)
    .query<{ id: string }>(`
      INSERT INTO work_logs (ticket_id, user_id, minutes_logged, log_date, note)
      OUTPUT INSERTED.id
      VALUES (@ticketId, @userId, @minutes, @logDate, @note)
    `);
  const id = res.recordset[0].id;
  const all = await listWorkLogs(data.ticketId);
  return all.find((w) => w.id === id) as WorkLogDto;
}
