import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validate.middleware';
import { asyncHandler } from '@/utils/asyncHandler.util';
import { AppError } from '@/utils/AppError.util';
import {
  listSprints, findSprintById, findActiveSprint,
  createSprint, updateSprintStatus, moveIncompleteTickets,
} from '@/models/sprint.model';

const router = Router();
router.use(authenticate);

router.get('/project/:projectId', asyncHandler(async (req, res) => {
  const sprints = await listSprints(req.params.projectId);
  res.json({ success: true, data: sprints });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const sprint = await findSprintById(req.params.id);
  if (!sprint) throw new AppError('Sprint not found', 404);
  res.json({ success: true, data: sprint });
}));

const createSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).max(255),
  goal: z.string().max(1000).optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
});

router.post('/', validate(createSchema), asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof createSchema>;
  const sprint = await createSprint({ ...body, goal: body.goal ?? null, startDate: body.startDate ?? null, endDate: body.endDate ?? null, createdBy: req.user!.sub });
  res.status(201).json({ success: true, data: sprint });
}));

const startSchema = z.object({
  name: z.string().min(1).max(255),
  goal: z.string().max(1000).optional().nullable(),
  startDate: z.string(),
  endDate: z.string(),
});

router.post('/:id/start', validate(startSchema), asyncHandler(async (req, res) => {
  const sprint = await findSprintById(req.params.id);
  if (!sprint) throw new AppError('Sprint not found', 404);
  if (sprint.status !== 'planning') throw new AppError('Sprint is not in planning state', 400);

  // Check no other active sprint in this project
  const active = await findActiveSprint(sprint.projectId);
  if (active) throw new AppError('Another sprint is already active. Complete it before starting a new one.', 400);

  const body = req.body as z.infer<typeof startSchema>;
  const updated = await updateSprintStatus(req.params.id, 'active', { name: body.name, goal: body.goal ?? null, startDate: body.startDate, endDate: body.endDate });
  res.json({ success: true, data: updated });
}));

const completeSchema = z.object({
  incompleteDestination: z.enum(['backlog']).or(z.string().uuid()),
});

router.post('/:id/complete', validate(completeSchema), asyncHandler(async (req, res) => {
  const sprint = await findSprintById(req.params.id);
  if (!sprint) throw new AppError('Sprint not found', 404);
  if (sprint.status !== 'active') throw new AppError('Sprint is not active', 400);

  const { incompleteDestination } = req.body as z.infer<typeof completeSchema>;
  await moveIncompleteTickets(req.params.id, incompleteDestination);
  const updated = await updateSprintStatus(req.params.id, 'completed');
  res.json({ success: true, data: updated });
}));

export default router;
