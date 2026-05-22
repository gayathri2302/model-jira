import { Router } from 'express';
import multer from 'multer';
import { BlobServiceClient } from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '@/middleware/auth.middleware';
import { asyncHandler } from '@/utils/asyncHandler.util';
import { AppError } from '@/utils/AppError.util';
import {
  listAttachments,
  createAttachment,
  findAttachmentById,
  deleteAttachment,
} from '@/models/attachment.model';
import { env } from '@/config/env.config';

const router = Router();
router.use(authenticate);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

function getBlobClient() {
  if (!env.AZURE_STORAGE_CONNECTION_STRING) {
    throw new AppError('Azure Storage not configured', 500);
  }
  const svc = BlobServiceClient.fromConnectionString(env.AZURE_STORAGE_CONNECTION_STRING);
  return svc.getContainerClient(env.AZURE_STORAGE_CONTAINER);
}

router.get(
  '/ticket/:ticketId',
  asyncHandler(async (req, res) => {
    const attachments = await listAttachments(req.params.ticketId);
    res.json({ success: true, data: attachments });
  }),
);

router.post(
  '/ticket/:ticketId',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError('No file uploaded', 422);
    const container = getBlobClient();
    const blobName = `${uuidv4()}-${req.file.originalname}`;
    const blockBlob = container.getBlockBlobClient(blobName);
    await blockBlob.uploadData(req.file.buffer, {
      blobHTTPHeaders: { blobContentType: req.file.mimetype },
    });

    const attachment = await createAttachment({
      ticketId: req.params.ticketId,
      uploadedById: req.user!.sub,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      blobUrl: blockBlob.url,
      blobName,
    });

    res.status(201).json({ success: true, data: attachment });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const att = await findAttachmentById(req.params.id);
    if (!att) throw new AppError('Attachment not found', 404);

    try {
      const container = getBlobClient();
      await container.getBlockBlobClient(att.blob_name).delete();
    } catch {
      // blob already gone — continue with DB cleanup
    }

    await deleteAttachment(req.params.id);
    res.json({ success: true, message: 'Attachment deleted' });
  }),
);

export default router;
