import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validate.middleware';
import { asyncHandler } from '@/utils/asyncHandler.util';
import { AppError } from '@/utils/AppError.util';
import {
  listTicketsByProject,
  findTicketById,
  createTicket,
  updateTicket,
  softDeleteTicket,
  getNextTicketNumber,
} from '@/models/ticket.model';
import { findProjectById } from '@/models/project.model';
import { logActivity } from '@/models/activity.model';

const router = Router();
router.use(authenticate);

const createTicketSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  type: z.enum(['task', 'bug', 'story']).default('task'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  statusId: z.string().uuid(),
  epicId: z.string().uuid().optional().nullable(),
  assigneeId: z.string().uuid().optional().nullable(),
  storyPoints: z.number().int().min(1).max(100).optional().nullable(),
  dueDate: z.string().optional().nullable(),
});

const updateTicketSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  type: z.enum(['task', 'bug', 'story']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  statusId: z.string().uuid().optional(),
  epicId: z.string().uuid().optional().nullable(),
  sprintId: z.string().uuid().optional().nullable(),
  assigneeId: z.string().uuid().optional().nullable(),
  reporterId: z.string().uuid().optional(),
  storyPoints: z.number().int().min(1).max(100).optional().nullable(),
  dueDate: z.string().optional().nullable(),
});

router.get(
  '/project/:projectId',
  asyncHandler(async (req, res) => {
    const tickets = await listTicketsByProject(req.params.projectId);
    res.json({ success: true, data: tickets });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const ticket = await findTicketById(req.params.id);
    if (!ticket) throw new AppError('Ticket not found', 404);
    res.json({ success: true, data: ticket });
  }),
);

router.post(
  '/',
  validate(createTicketSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createTicketSchema>;
    const project = await findProjectById(body.projectId);
    if (!project) throw new AppError('Project not found', 404);

    const ticketNumber = await getNextTicketNumber(project.key);
    const ticket = await createTicket({
      ...body,
      ticketNumber,
      reporterId: req.user!.sub,
      description: body.description ?? null,
      epicId: body.epicId ?? null,
      assigneeId: body.assigneeId ?? null,
      storyPoints: body.storyPoints ?? null,
      dueDate: body.dueDate ?? null,
    });

    await logActivity({
      ticketId: ticket.id,
      userId: req.user!.sub,
      action: 'created',
    });

    res.status(201).json({ success: true, data: ticket });
  }),
);

router.patch(
  '/:id',
  validate(updateTicketSchema),
  asyncHandler(async (req, res) => {
    const existing = await findTicketById(req.params.id);
    if (!existing) throw new AppError('Ticket not found', 404);

    const fields = req.body as z.infer<typeof updateTicketSchema>;
    const updated = await updateTicket(req.params.id, fields);

    // Raw DB rows are snake_case — access via cast before camelCase middleware runs
    type Row = Record<string, unknown>;
    const e = existing as unknown as Row;
    const u = (updated ?? {}) as unknown as Row;
    const str = (v: unknown) => (v != null ? String(v) : null);

    const fieldLabels: Record<string, { label: string; oldVal: string | null; newVal: string | null }> = {
      statusId:    { label: 'status',      oldVal: str(e['status_name']),   newVal: str(u['status_name']) },
      priority:    { label: 'priority',    oldVal: str(e['priority']),      newVal: str(u['priority']) },
      type:        { label: 'type',        oldVal: str(e['type']),          newVal: str(u['type']) },
      assigneeId:  { label: 'assignee',    oldVal: str(e['assignee_name']) ?? 'Unassigned', newVal: str(u['assignee_name']) ?? 'Unassigned' },
      reporterId:  { label: 'reporter',    oldVal: str(e['reporter_name']), newVal: str(u['reporter_name']) },
      title:       { label: 'title',       oldVal: str(e['title']),         newVal: str(u['title']) },
      description: { label: 'description', oldVal: str(e['description']),   newVal: str(u['description']) },
      storyPoints: { label: 'story points', oldVal: str(e['story_points']),  newVal: str(u['story_points']) },
      dueDate:     { label: 'due date',    oldVal: str(e['due_date']),      newVal: str(u['due_date']) },
    };

    for (const [key, meta] of Object.entries(fieldLabels)) {
      if (key in fields && meta.oldVal !== meta.newVal) {
        await logActivity({
          ticketId: req.params.id,
          userId: req.user!.sub,
          action: 'updated',
          fieldName: meta.label,
          oldValue: meta.oldVal,
          newValue: meta.newVal,
        });
      }
    }

    res.json({ success: true, data: updated });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const ticket = await findTicketById(req.params.id);
    if (!ticket) throw new AppError('Ticket not found', 404);
    await softDeleteTicket(req.params.id);
    res.json({ success: true, message: 'Ticket deleted' });
  }),
);

export default router;
