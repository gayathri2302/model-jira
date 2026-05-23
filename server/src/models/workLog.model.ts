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
      FROM mj_work_logs w
      JOIN mj_users u ON u.id = w.user_id
      WHERE w.ticket_id = @ticketId
      ORDER BY w.log_date DESC, w.created_at DESC
    `);
  return res.recordset;
}

export async function findWorkLogById(id: string): Promise<WorkLogDto | null> {
  const pool = await getPool();
  const res = await pool.request()
    .input('id', sql.UniqueIdentifier, id)
    .query<WorkLogDto>(`
      SELECT w.id, w.ticket_id, w.user_id, u.name AS user_name,
             w.minutes_logged, w.log_date, w.note, w.created_at
      FROM mj_work_logs w JOIN mj_users u ON u.id = w.user_id
      WHERE w.id = @id AND w.deleted_at IS NULL
    `);
  return res.recordset[0] ?? null;
}

export async function updateWorkLog(id: string, minutesLogged: number, logDate: string, note: string | null): Promise<WorkLogDto | null> {
  const pool = await getPool();
  await pool.request()
    .input('id', sql.UniqueIdentifier, id)
    .input('minutes', sql.Int, minutesLogged)
    .input('logDate', sql.Date, logDate)
    .input('note', sql.NVarChar, note)
    .query('UPDATE mj_work_logs SET minutes_logged=@minutes, log_date=@logDate, note=@note WHERE id=@id');
  return findWorkLogById(id);
}

export async function deleteWorkLog(id: string): Promise<void> {
  const pool = await getPool();
  await pool.request()
    .input('id', sql.UniqueIdentifier, id)
    .query('UPDATE mj_work_logs SET deleted_at=GETUTCDATE() WHERE id=@id');
}

export async function listAllWorkLogs(projectId: string): Promise<(WorkLogDto & { project_id: string; ticket_number: string; ticket_title: string; epic_title: string | null })[]> {
  const pool = await getPool();
  const res = await pool.request()
    .input('projectId', sql.UniqueIdentifier, projectId)
    .query(`
      SELECT w.id, w.ticket_id, w.user_id, u.name AS user_name,
             w.minutes_logged, w.log_date, w.note, w.created_at,
             t.project_id, t.ticket_number, t.title AS ticket_title,
             e.title AS epic_title
      FROM mj_work_logs w
      JOIN mj_users u ON u.id = w.user_id
      JOIN mj_tickets t ON t.id = w.ticket_id
      LEFT JOIN mj_epics e ON e.id = t.epic_id
      WHERE t.project_id = @projectId AND w.deleted_at IS NULL
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
      INSERT INTO mj_work_logs (ticket_id, user_id, minutes_logged, log_date, note)
      OUTPUT INSERTED.id
      VALUES (@ticketId, @userId, @minutes, @logDate, @note)
    `);
  const id = res.recordset[0].id;
  const all = await listWorkLogs(data.ticketId);
  return all.find((w) => w.id === id) as WorkLogDto;
}
