import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validate.middleware';
import { asyncHandler } from '@/utils/asyncHandler.util';
import { listWorkLogs, createWorkLog } from '@/models/workLog.model';

const router = Router();
router.use(authenticate);

const createWorkLogSchema = z.object({
  ticketId: z.string().uuid(),
  minutesLogged: z.number().int().min(1),
  logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(500).optional().nullable(),
});

router.get(
  '/ticket/:ticketId',
  asyncHandler(async (req, res) => {
    const logs = await listWorkLogs(req.params.ticketId);
    res.json({ success: true, data: logs });
  }),
);

router.post(
  '/',
  validate(createWorkLogSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createWorkLogSchema>;
    const log = await createWorkLog({ ...body, userId: req.user!.sub, note: body.note ?? null });
    res.status(201).json({ success: true, data: log });
  }),
);

export default router;
