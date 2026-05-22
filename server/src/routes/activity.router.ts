import { Router } from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import { asyncHandler } from '@/utils/asyncHandler.util';
import { listActivity } from '@/models/activity.model';

const router = Router();
router.use(authenticate);

router.get(
  '/ticket/:ticketId',
  asyncHandler(async (req, res) => {
    const activity = await listActivity(req.params.ticketId);
    res.json({ success: true, data: activity });
  }),
);

export default router;
