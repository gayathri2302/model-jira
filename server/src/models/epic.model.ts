import { getPool, sql } from '@/config/db.config';
import type { EpicDto } from '../../../shared/types/api.types';

export async function listEpics(projectId: string): Promise<EpicDto[]> {
  const pool = await getPool();
  const res = await pool
    .request()
    .input('projectId', sql.UniqueIdentifier, projectId)
    .query<EpicDto>(`
      SELECT id, project_id, title, description, color, start_date, end_date
      FROM epics WHERE project_id = @projectId AND deleted_at IS NULL ORDER BY title
    `);
  return res.recordset;
}

export async function createEpic(
  projectId: string,
  title: string,
  description: string | null,
  color: string,
  startDate: string | null,
  endDate: string | null,
): Promise<EpicDto> {
  const pool = await getPool();
  const res = await pool
    .request()
    .input('projectId', sql.UniqueIdentifier, projectId)
    .input('title', sql.NVarChar, title)
    .input('description', sql.NVarChar, description)
    .input('color', sql.NVarChar, color)
    .input('startDate', sql.Date, startDate)
    .input('endDate', sql.Date, endDate)
    .query<EpicDto>(`
      INSERT INTO epics (project_id, title, description, color, start_date, end_date)
      OUTPUT INSERTED.id, INSERTED.project_id, INSERTED.title, INSERTED.description,
             INSERTED.color, INSERTED.start_date, INSERTED.end_date
      VALUES (@projectId, @title, @description, @color, @startDate, @endDate)
    `);
  return res.recordset[0];
}

export async function deleteEpic(id: string): Promise<void> {
  const pool = await getPool();
  await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .query('UPDATE epics SET deleted_at = GETUTCDATE() WHERE id = @id');
}
