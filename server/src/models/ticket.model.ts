import { getPool, sql } from '@/config/db.config';
import type { TicketDto } from '../../../shared/types/api.types';

const TICKET_SELECT = `
  SELECT
    t.id, t.ticket_number, t.project_id, t.title, t.description,
    t.type, t.priority, t.status_id, s.name AS status_name,
    t.epic_id, e.title AS epic_title,
    t.assignee_id, a.name AS assignee_name,
    t.reporter_id, r.name AS reporter_name,
    t.story_points, t.due_date, t.sprint_id, sp.name AS sprint_name, t.created_at, t.updated_at
  FROM mj_tickets t
  JOIN mj_statuses s ON s.id = t.status_id
  LEFT JOIN mj_epics e ON e.id = t.epic_id
  LEFT JOIN mj_users a ON a.id = t.assignee_id
  JOIN mj_users r ON r.id = t.reporter_id
  LEFT JOIN mj_sprints sp ON sp.id = t.sprint_id
`;

export async function listTicketsByProject(projectId: string): Promise<TicketDto[]> {
  const pool = await getPool();
  const res = await pool
    .request()
    .input('projectId', sql.UniqueIdentifier, projectId)
    .query<TicketDto>(`${TICKET_SELECT}
      WHERE t.project_id = @projectId AND t.deleted_at IS NULL
      ORDER BY t.created_at DESC
    `);
  return res.recordset;
}

export async function findTicketById(id: string): Promise<TicketDto | null> {
  const pool = await getPool();
  const res = await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .query<TicketDto>(`${TICKET_SELECT} WHERE t.id = @id AND t.deleted_at IS NULL`);
  return res.recordset[0] ?? null;
}

export async function getNextTicketNumber(projectKey: string): Promise<string> {
  const pool = await getPool();
  const res = await pool
    .request()
    .input('prefix', sql.NVarChar, `${projectKey}-%`)
    .query<{ cnt: number }>(`
      SELECT COUNT(*) AS cnt FROM mj_tickets
      WHERE ticket_number LIKE @prefix
    `);
  const seq = (res.recordset[0].cnt ?? 0) + 101;
  return `${projectKey}-${seq}`;
}

export async function createTicket(data: {
  ticketNumber: string;
  projectId: string;
  title: string;
  description: string | null;
  type: string;
  priority: string;
  statusId: string;
  epicId: string | null;
  assigneeId: string | null;
  reporterId: string;
  storyPoints: number | null;
  dueDate: string | null;
}): Promise<TicketDto> {
  const pool = await getPool();
  const res = await pool
    .request()
    .input('ticketNumber', sql.NVarChar, data.ticketNumber)
    .input('projectId', sql.UniqueIdentifier, data.projectId)
    .input('title', sql.NVarChar, data.title)
    .input('description', sql.NVarChar, data.description)
    .input('type', sql.NVarChar, data.type)
    .input('priority', sql.NVarChar, data.priority)
    .input('statusId', sql.UniqueIdentifier, data.statusId)
    .input('epicId', sql.UniqueIdentifier, data.epicId)
    .input('assigneeId', sql.UniqueIdentifier, data.assigneeId)
    .input('reporterId', sql.UniqueIdentifier, data.reporterId)
    .input('storyPoints', sql.Int, data.storyPoints)
    .input('dueDate', sql.Date, data.dueDate)
    .query<{ id: string }>(`
      INSERT INTO mj_tickets (
        ticket_number, project_id, title, description, type, priority,
        status_id, epic_id, assignee_id, reporter_id, story_points, due_date
      )
      OUTPUT INSERTED.id
      VALUES (
        @ticketNumber, @projectId, @title, @description, @type, @priority,
        @statusId, @epicId, @assigneeId, @reporterId, @storyPoints, @dueDate
      )
    `);
  return findTicketById(res.recordset[0].id) as Promise<TicketDto>;
}

export async function updateTicket(
  id: string,
  fields: Partial<{
    title: string;
    description: string | null;
    type: string;
    priority: string;
    statusId: string;
    epicId: string | null;
    assigneeId: string | null;
    reporterId: string;
    storyPoints: number | null;
    dueDate: string | null;
  }>,
): Promise<TicketDto | null> {
  const pool = await getPool();
  const req = pool.request().input('id', sql.UniqueIdentifier, id);
  const setClauses: string[] = ['updated_at = GETUTCDATE()'];

  if (fields.title !== undefined) {
    req.input('title', sql.NVarChar, fields.title);
    setClauses.push('title = @title');
  }
  if (fields.description !== undefined) {
    req.input('description', sql.NVarChar, fields.description);
    setClauses.push('description = @description');
  }
  if (fields.type !== undefined) {
    req.input('type', sql.NVarChar, fields.type);
    setClauses.push('type = @type');
  }
  if (fields.priority !== undefined) {
    req.input('priority', sql.NVarChar, fields.priority);
    setClauses.push('priority = @priority');
  }
  if (fields.statusId !== undefined) {
    req.input('statusId', sql.UniqueIdentifier, fields.statusId);
    setClauses.push('status_id = @statusId');
  }
  if (fields.epicId !== undefined) {
    req.input('epicId', fields.epicId ? sql.UniqueIdentifier : sql.NVarChar, fields.epicId);
    setClauses.push('epic_id = @epicId');
  }
  if ((fields as Record<string, unknown>).sprintId !== undefined) {
    const sid = (fields as Record<string, unknown>).sprintId as string | null;
    req.input('sprintId', sid ? sql.UniqueIdentifier : sql.NVarChar, sid);
    setClauses.push('sprint_id = @sprintId');
  }
  if (fields.assigneeId !== undefined) {
    req.input('assigneeId', sql.UniqueIdentifier, fields.assigneeId);
    setClauses.push('assignee_id = @assigneeId');
  }
  if (fields.reporterId !== undefined) {
    req.input('reporterId', sql.UniqueIdentifier, fields.reporterId);
    setClauses.push('reporter_id = @reporterId');
  }
  if (fields.storyPoints !== undefined) {
    req.input('storyPoints', sql.Int, fields.storyPoints);
    setClauses.push('story_points = @storyPoints');
  }
  if (fields.dueDate !== undefined) {
    req.input('dueDate', sql.Date, fields.dueDate);
    setClauses.push('due_date = @dueDate');
  }

  await req.query(`UPDATE mj_tickets SET ${setClauses.join(', ')} WHERE id = @id`);
  return findTicketById(id);
}

export async function softDeleteTicket(id: string): Promise<void> {
  const pool = await getPool();
  await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .query('UPDATE mj_tickets SET deleted_at = GETUTCDATE() WHERE id = @id');
}
