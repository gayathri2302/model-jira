import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validate.middleware';
import { asyncHandler } from '@/utils/asyncHandler.util';
import { AppError } from '@/utils/AppError.util';
import {
  listProjects,
  findProjectById,
  createProject,
  deleteProject,
} from '@/models/project.model';

const router = Router();
router.use(authenticate);

const createProjectSchema = z.object({
  key: z.string().min(2).max(10).regex(/^[A-Za-z]+$/),
  name: z.string().min(2).max(120),
  description: z.string().optional().nullable(),
});

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const projects = await listProjects(req.user!.sub);
    res.json({ success: true, data: projects });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const project = await findProjectById(req.params.id);
    if (!project) throw new AppError('Project not found', 404);
    res.json({ success: true, data: project });
  }),
);

router.post(
  '/',
  validate(createProjectSchema),
  asyncHandler(async (req, res) => {
    const { key, name, description } = req.body as z.infer<typeof createProjectSchema>;
    const project = await createProject(key, name, description ?? null, req.user!.sub);
    res.status(201).json({ success: true, data: project });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const project = await findProjectById(req.params.id);
    if (!project) throw new AppError('Project not found', 404);
    if (project.ownerId !== req.user!.sub && req.user!.role !== 'admin') {
      throw new AppError('Forbidden', 403);
    }
    await deleteProject(req.params.id);
    res.json({ success: true, message: 'Project deleted' });
  }),
);

export default router;
