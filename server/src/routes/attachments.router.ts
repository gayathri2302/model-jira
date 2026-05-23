import { Router } from 'express';
import multer from 'multer';
import { BlobServiceClient, BlobSASPermissions, generateBlobSASQueryParameters, StorageSharedKeyCredential } from '@azure/storage-blob';
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
import { logActivity } from '@/models/activity.model';

const router = Router();
router.use(authenticate);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

function getContainerClient() {
  if (!env.AZURE_STORAGE_CONNECTION_STRING) {
    throw new AppError('Azure Storage not configured', 500);
  }
  const svc = BlobServiceClient.fromConnectionString(env.AZURE_STORAGE_CONNECTION_STRING);
  return svc.getContainerClient(env.AZURE_STORAGE_CONTAINER);
}

function parseCreds(connStr: string): { account: string; accountKey: string } | null {
  const accountMatch = connStr.match(/AccountName=([^;]+)/i);
  const keyMatch = connStr.match(/AccountKey=([^;]+)/i);
  if (!accountMatch || !keyMatch) return null;
  return { account: accountMatch[1], accountKey: keyMatch[1] };
}

function makeSasUrl(blobName: string): string {
  const connStr = env.AZURE_STORAGE_CONNECTION_STRING!;
  const creds = parseCreds(connStr);
  if (!creds) {
    // Connection string malformed — return base URL without SAS (may not be accessible)
    return `https://blob.core.windows.net/${env.AZURE_STORAGE_CONTAINER}/${blobName}`;
  }

  const sharedKey = new StorageSharedKeyCredential(creds.account, creds.accountKey);
  const expiresOn = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const sasToken = generateBlobSASQueryParameters(
    {
      containerName: env.AZURE_STORAGE_CONTAINER,
      blobName,
      permissions: BlobSASPermissions.parse('r'),
      expiresOn,
    },
    sharedKey,
  ).toString();

  return `https://${creds.account}.blob.core.windows.net/${env.AZURE_STORAGE_CONTAINER}/${blobName}?${sasToken}`;
}

router.get(
  '/ticket/:ticketId',
  asyncHandler(async (req, res) => {
    const attachments = await listAttachments(req.params.ticketId);
    // DB returns snake_case — access blob_name directly before camelCase middleware runs
    const withSas = attachments.map((a) => ({
      ...a,
      blobUrl: makeSasUrl((a as unknown as Record<string, string>)['blob_name']),
    }));
    res.json({ success: true, data: withSas });
  }),
);

router.post(
  '/ticket/:ticketId',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError('No file uploaded', 422);
    const container = getContainerClient();
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
      blobUrl: blockBlob.url, // store base URL without SAS — SAS generated at read time
      blobName,
    });

    await logActivity({
      ticketId: req.params.ticketId,
      userId: req.user!.sub,
      action: 'uploaded',
      fieldName: 'attachment',
      newValue: req.file.originalname,
    });

    // Return with fresh SAS URL
    res.status(201).json({ success: true, data: { ...attachment, blobUrl: makeSasUrl(blobName) } });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const att = await findAttachmentById(req.params.id);
    if (!att) throw new AppError('Attachment not found', 404);

    try {
      const container = getContainerClient();
      await container.getBlockBlobClient(att.blob_name).delete();
    } catch {
      // blob already gone — continue with DB cleanup
    }

    await deleteAttachment(req.params.id);
    await logActivity({
      ticketId: att.ticket_id,
      userId: req.user!.sub,
      action: 'deleted',
      fieldName: 'attachment',
      oldValue: att.file_name,
    });
    res.json({ success: true, message: 'Attachment deleted' });
  }),
);

export default router;
