import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { BlobServiceClient } from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validate.middleware';
import { asyncHandler } from '@/utils/asyncHandler.util';
import { AppError } from '@/utils/AppError.util';
import {
  listComments, createComment, updateComment, softDeleteComment, findCommentById,
  listCommentAttachments, createCommentAttachment, deleteCommentAttachment,
} from '@/models/comment.model';
import { logActivity } from '@/models/activity.model';
import { env } from '@/config/env.config';

const router = Router();
router.use(authenticate);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function getContainerClient() {
  if (!env.AZURE_STORAGE_CONNECTION_STRING) throw new AppError('Azure Storage not configured', 500);
  return BlobServiceClient.fromConnectionString(env.AZURE_STORAGE_CONNECTION_STRING)
    .getContainerClient(env.AZURE_STORAGE_CONTAINER);
}

function parseCreds(connStr: string) {
  const a = connStr.match(/AccountName=([^;]+)/i);
  const k = connStr.match(/AccountKey=([^;]+)/i);
  return a && k ? { account: a[1], accountKey: k[1] } : null;
}

function makeSasUrl(blobName: string): string {
  const creds = parseCreds(env.AZURE_STORAGE_CONNECTION_STRING ?? '');
  if (!creds) return blobName;
  const { StorageSharedKeyCredential, generateBlobSASQueryParameters, BlobSASPermissions } = require('@azure/storage-blob');
  const sharedKey = new StorageSharedKeyCredential(creds.account, creds.accountKey);
  const expiresOn = new Date(Date.now() + 60 * 60 * 1000);
  const sasToken = generateBlobSASQueryParameters(
    { containerName: env.AZURE_STORAGE_CONTAINER, blobName, permissions: BlobSASPermissions.parse('r'), expiresOn },
    sharedKey,
  ).toString();
  return `https://${creds.account}.blob.core.windows.net/${env.AZURE_STORAGE_CONTAINER}/${blobName}?${sasToken}`;
}

router.get('/ticket/:ticketId', asyncHandler(async (req, res) => {
  const comments = await listComments(req.params.ticketId);
  res.json({ success: true, data: comments });
}));

router.post(
  '/',
  validate(z.object({ ticketId: z.string().uuid(), body: z.string().min(1), parentId: z.string().uuid().optional().nullable() })),
  asyncHandler(async (req, res) => {
    const { ticketId, body, parentId } = req.body as { ticketId: string; body: string; parentId?: string | null };
    const comment = await createComment(ticketId, req.user!.sub, body, parentId);
    await logActivity({
      ticketId,
      userId: req.user!.sub,
      action: parentId ? 'replied' : 'commented',
      fieldName: 'comment',
      newValue: body.length > 100 ? body.slice(0, 100) + '…' : body,
    });
    res.status(201).json({ success: true, data: comment });
  }),
);

router.patch(
  '/:id',
  validate(z.object({ body: z.string().min(1) })),
  asyncHandler(async (req, res) => {
    const existing = await findCommentById(req.params.id);
    if (!existing) throw new AppError('Comment not found', 404);
    const newBody = (req.body as { body: string }).body;
    await updateComment(req.params.id, newBody);
    await logActivity({
      ticketId: existing.ticket_id,
      userId: req.user!.sub,
      action: 'updated',
      fieldName: 'comment',
      oldValue: existing.body.length > 100 ? existing.body.slice(0, 100) + '…' : existing.body,
      newValue: newBody.length > 100 ? newBody.slice(0, 100) + '…' : newBody,
    });
    res.json({ success: true, message: 'Comment updated' });
  }),
);

router.delete('/:id', asyncHandler(async (req, res) => {
  const existing = await findCommentById(req.params.id);
  if (!existing) throw new AppError('Comment not found', 404);
  await softDeleteComment(req.params.id);
  await logActivity({
    ticketId: existing.ticket_id,
    userId: req.user!.sub,
    action: 'deleted',
    fieldName: 'comment',
    oldValue: existing.body.length > 100 ? existing.body.slice(0, 100) + '…' : existing.body,
  });
  res.json({ success: true, message: 'Comment deleted' });
}));

// Comment attachments
router.get('/:commentId/attachments', asyncHandler(async (req, res) => {
  const atts = await listCommentAttachments(req.params.commentId);
  const withSas = atts.map((a) => ({ ...a, blobUrl: makeSasUrl((a as unknown as Record<string, string>)['blob_name']) }));
  res.json({ success: true, data: withSas });
}));

router.post('/:commentId/attachments', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('No file uploaded', 422);
  const container = getContainerClient();
  const blobName = `comments/${uuidv4()}-${req.file.originalname}`;
  const blob = container.getBlockBlobClient(blobName);
  await blob.uploadData(req.file.buffer, { blobHTTPHeaders: { blobContentType: req.file.mimetype } });
  const att = await createCommentAttachment({
    commentId: req.params.commentId,
    uploadedById: req.user!.sub,
    fileName: req.file.originalname,
    fileSize: req.file.size,
    mimeType: req.file.mimetype,
    blobUrl: blob.url,
    blobName,
  });
  res.status(201).json({ success: true, data: { ...att, blobUrl: makeSasUrl(blobName) } });
}));

router.delete('/attachments/:id', asyncHandler(async (req, res) => {
  const att = await deleteCommentAttachment(req.params.id);
  if (!att) throw new AppError('Attachment not found', 404);
  try { await getContainerClient().getBlockBlobClient(att.blob_name).delete(); } catch { /* gone */ }
  res.json({ success: true, message: 'Attachment deleted' });
}));

export default router;
