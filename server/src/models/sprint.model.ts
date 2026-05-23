import { getPool, sql } from '@/config/db.config';
import type { SprintDto } from '../../../shared/types/api.types';

const SPRINT_SELECT = `
  SELECT s.id, s.project_id, s.name, s.goal, s.start_date, s.end_date,
         s.status, s.created_by, s.created_at,
         COUNT(t.id) AS ticket_count,
         SUM(CASE WHEN st.category = 'done' THEN 1 ELSE 0 END) AS completed_count
  FROM mj_sprints s
  LEFT JOIN mj_tickets t ON t.sprint_id = s.id AND t.deleted_at IS NULL
  LEFT JOIN mj_statuses st ON st.id = t.status_id
`;

export async function listSprints(projectId: string): Promise<SprintDto[]> {
  const pool = await getPool();
  const res = await pool.request()
    .input('projectId', sql.UniqueIdentifier, projectId)
    .query<SprintDto>(`${SPRINT_SELECT}
      WHERE s.project_id = @projectId
      GROUP BY s.id, s.project_id, s.name, s.goal, s.start_date, s.end_date, s.status, s.created_by, s.created_at
      ORDER BY s.created_at DESC
    `);
  return res.recordset;
}

export async function findSprintById(id: string): Promise<SprintDto | null> {
  const pool = await getPool();
  const res = await pool.request()
    .input('id', sql.UniqueIdentifier, id)
    .query<SprintDto>(`${SPRINT_SELECT}
      WHERE s.id = @id
      GROUP BY s.id, s.project_id, s.name, s.goal, s.start_date, s.end_date, s.status, s.created_by, s.created_at
    `);
  return res.recordset[0] ?? null;
}

export async function findActiveSprint(projectId: string): Promise<SprintDto | null> {
  const pool = await getPool();
  const res = await pool.request()
    .input('projectId', sql.UniqueIdentifier, projectId)
    .query<SprintDto>(`${SPRINT_SELECT}
      WHERE s.project_id = @projectId AND s.status = 'active'
      GROUP BY s.id, s.project_id, s.name, s.goal, s.start_date, s.end_date, s.status, s.created_by, s.created_at
    `);
  return res.recordset[0] ?? null;
}

export async function createSprint(data: {
  projectId: string;
  name: string;
  goal: string | null;
  startDate: string | null;
  endDate: string | null;
  createdBy: string;
}): Promise<SprintDto> {
  const pool = await getPool();
  const res = await pool.request()
    .input('projectId', sql.UniqueIdentifier, data.projectId)
    .input('name', sql.NVarChar, data.name)
    .input('goal', sql.NVarChar, data.goal)
    .input('startDate', sql.Date, data.startDate)
    .input('endDate', sql.Date, data.endDate)
    .input('createdBy', sql.UniqueIdentifier, data.createdBy)
    .query<{ id: string }>(`
      INSERT INTO mj_sprints (project_id, name, goal, start_date, end_date, created_by)
      OUTPUT INSERTED.id
      VALUES (@projectId, @name, @goal, @startDate, @endDate, @createdBy)
    `);
  return findSprintById(res.recordset[0].id) as Promise<SprintDto>;
}

export async function updateSprintStatus(
  id: string,
  status: 'active' | 'completed',
  updates?: { name?: string; goal?: string | null; startDate?: string | null; endDate?: string | null },
): Promise<SprintDto | null> {
  const pool = await getPool();
  const req = pool.request().input('id', sql.UniqueIdentifier, id).input('status', sql.NVarChar, status);
  const sets = ['status = @status', 'updated_at = GETUTCDATE()'];
  if (updates?.name) { req.input('name', sql.NVarChar, updates.name); sets.push('name = @name'); }
  if (updates?.goal !== undefined) { req.input('goal', sql.NVarChar, updates.goal); sets.push('goal = @goal'); }
  if (updates?.startDate !== undefined) { req.input('startDate', sql.Date, updates.startDate); sets.push('start_date = @startDate'); }
  if (updates?.endDate !== undefined) { req.input('endDate', sql.Date, updates.endDate); sets.push('end_date = @endDate'); }
  await req.query(`UPDATE mj_sprints SET ${sets.join(', ')} WHERE id = @id`);
  return findSprintById(id);
}

export async function moveIncompleteTickets(
  sprintId: string,
  destination: 'backlog' | string, // 'backlog' = null sprint, else next sprint id
): Promise<void> {
  const pool = await getPool();
  // get incomplete ticket ids (not in done-category statuses)
  const ticketRes = await pool.request()
    .input('sprintId', sql.UniqueIdentifier, sprintId)
    .query<{ id: string }>(`
      SELECT t.id FROM mj_tickets t
      JOIN mj_statuses s ON s.id = t.status_id
      WHERE t.sprint_id = @sprintId AND s.category != 'done' AND t.deleted_at IS NULL
    `);
  if (!ticketRes.recordset.length) return;

  const newSprintId = destination === 'backlog' ? null : destination;
  for (const { id } of ticketRes.recordset) {
    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('sprintId', newSprintId ? sql.UniqueIdentifier : sql.NVarChar, newSprintId)
      .query('UPDATE mj_tickets SET sprint_id = @sprintId WHERE id = @id');
  }
}
