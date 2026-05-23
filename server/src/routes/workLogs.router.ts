import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validate.middleware';
import { asyncHandler } from '@/utils/asyncHandler.util';
import { AppError } from '@/utils/AppError.util';
import { listWorkLogs, createWorkLog, findWorkLogById, updateWorkLog, deleteWorkLog, listAllWorkLogs } from '@/models/workLog.model';

const router = Router();
router.use(authenticate);

const createWorkLogSchema = z.object({
  ticketId: z.string().uuid(),
  minutesLogged: z.number().int().min(1).max(480),
  logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(500).optional().nullable(),
});

const updateWorkLogSchema = z.object({
  minutesLogged: z.number().int().min(1).max(480),
  logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(500).optional().nullable(),
});

router.get('/ticket/:ticketId', asyncHandler(async (req, res) => {
  const logs = await listWorkLogs(req.params.ticketId);
  res.json({ success: true, data: logs });
}));

router.get('/project/:projectId', asyncHandler(async (req, res) => {
  const logs = await listAllWorkLogs(req.params.projectId);
  res.json({ success: true, data: logs });
}));

router.post('/', validate(createWorkLogSchema), asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof createWorkLogSchema>;
  const log = await createWorkLog({ ...body, userId: req.user!.sub, note: body.note ?? null });
  res.status(201).json({ success: true, data: log });
}));

router.patch('/:id', validate(updateWorkLogSchema), asyncHandler(async (req, res) => {
  const wl = await findWorkLogById(req.params.id);
  if (!wl) throw new AppError('Work log not found', 404);
  if (wl.userId !== req.user!.sub && req.user!.role !== 'admin') throw new AppError('Forbidden', 403);
  const body = req.body as z.infer<typeof updateWorkLogSchema>;
  const updated = await updateWorkLog(req.params.id, body.minutesLogged, body.logDate, body.note ?? null);
  res.json({ success: true, data: updated });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const wl = await findWorkLogById(req.params.id);
  if (!wl) throw new AppError('Work log not found', 404);
  if (wl.userId !== req.user!.sub && req.user!.role !== 'admin') throw new AppError('Forbidden', 403);
  await deleteWorkLog(req.params.id);
  res.json({ success: true, message: 'Work log deleted' });
}));

export default router;
