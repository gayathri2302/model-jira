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
  assigneeId: z.string().uuid().optional().nullable(),
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

    // log status change
    if (fields.statusId && fields.statusId !== existing.statusId) {
      await logActivity({
        ticketId: req.params.id,
        userId: req.user!.sub,
        action: 'updated',
        fieldName: 'status',
        oldValue: existing.statusName,
        newValue: updated?.statusName ?? null,
      });
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
