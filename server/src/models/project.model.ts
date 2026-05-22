import { getPool, sql } from '@/config/db.config';
import type { ProjectDto } from '../../../shared/types/api.types';

export async function listProjects(userId: string): Promise<ProjectDto[]> {
  const pool = await getPool();
  const res = await pool
    .request()
    .input('userId', sql.UniqueIdentifier, userId)
    .query<ProjectDto>(`
      SELECT p.id, p.project_key AS [key], p.project_name AS [name],
             p.description, p.owner_id,
             u.name AS owner_name, p.created_at
      FROM mj_projects p
      JOIN mj_users u ON u.id = p.owner_id
      WHERE p.deleted_at IS NULL
        AND (p.owner_id = @userId
             OR EXISTS (SELECT 1 FROM mj_project_members pm
                        WHERE pm.project_id = p.id AND pm.user_id = @userId))
      ORDER BY p.project_name
    `);
  return res.recordset;
}

export async function findProjectById(id: string): Promise<ProjectDto | null> {
  const pool = await getPool();
  const res = await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .query<ProjectDto>(`
      SELECT p.id, p.project_key AS [key], p.project_name AS [name],
             p.description, p.owner_id,
             u.name AS owner_name, p.created_at
      FROM mj_projects p
      JOIN mj_users u ON u.id = p.owner_id
      WHERE p.id = @id AND p.deleted_at IS NULL
    `);
  return res.recordset[0] ?? null;
}

export async function createProject(
  key: string,
  name: string,
  description: string | null,
  ownerId: string,
): Promise<ProjectDto> {
  const pool = await getPool();
  const res = await pool
    .request()
    .input('key', sql.NVarChar, key.toUpperCase())
    .input('name', sql.NVarChar, name)
    .input('description', sql.NVarChar, description)
    .input('ownerId', sql.UniqueIdentifier, ownerId)
    .query<{ id: string }>(`
      INSERT INTO mj_projects (project_key, project_name, description, owner_id)
      OUTPUT INSERTED.id
      VALUES (@key, @name, @description, @ownerId)
    `);
  const id = res.recordset[0].id;
  return findProjectById(id) as Promise<ProjectDto>;
}

export async function deleteProject(id: string): Promise<void> {
  const pool = await getPool();
  await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .query('UPDATE mj_projects SET deleted_at = GETUTCDATE() WHERE id = @id');
}
