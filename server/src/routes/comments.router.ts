import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validate.middleware';
import { asyncHandler } from '@/utils/asyncHandler.util';
import { listComments, createComment, updateComment, softDeleteComment } from '@/models/comment.model';

const router = Router();
router.use(authenticate);

const bodySchema = z.object({ body: z.string().min(1) });

router.get(
  '/ticket/:ticketId',
  asyncHandler(async (req, res) => {
    const comments = await listComments(req.params.ticketId);
    res.json({ success: true, data: comments });
  }),
);

router.post(
  '/',
  validate(z.object({ ticketId: z.string().uuid(), body: z.string().min(1) })),
  asyncHandler(async (req, res) => {
    const { ticketId, body } = req.body as { ticketId: string; body: string };
    const comment = await createComment(ticketId, req.user!.sub, body);
    res.status(201).json({ success: true, data: comment });
  }),
);

router.patch(
  '/:id',
  validate(bodySchema),
  asyncHandler(async (req, res) => {
    await updateComment(req.params.id, (req.body as { body: string }).body);
    res.json({ success: true, message: 'Comment updated' });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await softDeleteComment(req.params.id);
    res.json({ success: true, message: 'Comment deleted' });
  }),
);

export default router;
