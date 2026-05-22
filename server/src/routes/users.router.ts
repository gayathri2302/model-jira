import { Router } from 'express';
import { authenticate, requireAdmin } from '@/middleware/auth.middleware';
import { asyncHandler } from '@/utils/asyncHandler.util';
import { listUsers, findUserById, updateUserAvatar } from '@/models/user.model';
import { AppError } from '@/utils/AppError.util';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const users = await listUsers();
    res.json({ success: true, data: users });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = await findUserById(req.params.id);
    if (!user) throw new AppError('User not found', 404);
    const { password_hash: _pw, ...safe } = user;
    res.json({ success: true, data: safe });
  }),
);

router.patch(
  '/:id/avatar',
  asyncHandler(async (req, res) => {
    const { avatarUrl } = req.body as { avatarUrl: string };
    if (!avatarUrl) throw new AppError('avatarUrl required', 422);
    await updateUserAvatar(req.params.id, avatarUrl);
    res.json({ success: true, message: 'Avatar updated' });
  }),
);

router.delete(
  '/:id',
  requireAdmin,
  asyncHandler(async (_req, res) => {
    res.json({ success: true, message: 'User removed' });
  }),
);

export default router;
