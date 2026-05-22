import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validate.middleware';
import { asyncHandler } from '@/utils/asyncHandler.util';
import { listEpics, createEpic, deleteEpic } from '@/models/epic.model';

const router = Router();
router.use(authenticate);

const createEpicSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#0052CC'),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
});

router.get(
  '/project/:projectId',
  asyncHandler(async (req, res) => {
    const epics = await listEpics(req.params.projectId);
    res.json({ success: true, data: epics });
  }),
);

router.post(
  '/',
  validate(createEpicSchema),
  asyncHandler(async (req, res) => {
    const { projectId, title, description, color, startDate, endDate } = req.body as z.infer<typeof createEpicSchema>;
    const epic = await createEpic(projectId, title, description ?? null, color, startDate ?? null, endDate ?? null);
    res.status(201).json({ success: true, data: epic });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await deleteEpic(req.params.id);
    res.json({ success: true, message: 'Epic deleted' });
  }),
);

export default router;
