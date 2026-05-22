import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validate.middleware';
import { asyncHandler } from '@/utils/asyncHandler.util';
import { listStatuses, createStatus, deleteStatus } from '@/models/status.model';

const router = Router();
router.use(authenticate);

const createStatusSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).max(80),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  position: z.number().int().min(0).default(0),
  category: z.enum(['todo', 'in_progress', 'done']),
});

router.get(
  '/project/:projectId',
  asyncHandler(async (req, res) => {
    const statuses = await listStatuses(req.params.projectId);
    res.json({ success: true, data: statuses });
  }),
);

router.post(
  '/',
  validate(createStatusSchema),
  asyncHandler(async (req, res) => {
    const { projectId, name, color, position, category } = req.body as z.infer<typeof createStatusSchema>;
    const status = await createStatus(projectId, name, color, position, category);
    res.status(201).json({ success: true, data: status });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await deleteStatus(req.params.id);
    res.json({ success: true, message: 'Status deleted' });
  }),
);

export default router;
