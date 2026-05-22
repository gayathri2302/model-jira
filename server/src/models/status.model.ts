import { getPool, sql } from '@/config/db.config';
import type { StatusDto } from '../../../shared/types/api.types';

export async function listStatuses(projectId: string): Promise<StatusDto[]> {
  const pool = await getPool();
  const res = await pool
    .request()
    .input('projectId', sql.UniqueIdentifier, projectId)
    .query<StatusDto>(`
      SELECT id, project_id, name, color, position, category
      FROM statuses WHERE project_id = @projectId ORDER BY position
    `);
  return res.recordset;
}

export async function createStatus(
  projectId: string,
  name: string,
  color: string,
  position: number,
  category: string,
): Promise<StatusDto> {
  const pool = await getPool();
  const res = await pool
    .request()
    .input('projectId', sql.UniqueIdentifier, projectId)
    .input('name', sql.NVarChar, name)
    .input('color', sql.NVarChar, color)
    .input('position', sql.Int, position)
    .input('category', sql.NVarChar, category)
    .query<StatusDto>(`
      INSERT INTO statuses (project_id, name, color, position, category)
      OUTPUT INSERTED.*
      VALUES (@projectId, @name, @color, @position, @category)
    `);
  return res.recordset[0];
}

export async function deleteStatus(id: string): Promise<void> {
  const pool = await getPool();
  await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .query('DELETE FROM statuses WHERE id = @id');
}
