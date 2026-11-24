import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.ts';
import { AppError } from '../middleware/errorHandler.ts';

const router = Router();

const UPLOADS_DIR = path.resolve(process.cwd(), 'data', 'uploads');
const INDEX_FILE = path.join(UPLOADS_DIR, '_index.json');

const ALLOWED_MIMES: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'text/plain': '.txt',
};

interface StoredFileMeta {
  fileId: string;
  ownerId: string;
  tripId: string;
  authorizedUids: string[];
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

function ensureUploadsDir(): void {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  if (!fs.existsSync(INDEX_FILE)) {
    fs.writeFileSync(INDEX_FILE, JSON.stringify({}), 'utf-8');
  }
}

function readIndex(): Record<string, StoredFileMeta> {
  ensureUploadsDir();
  try {
    const raw = fs.readFileSync(INDEX_FILE, 'utf-8');
    return JSON.parse(raw) as Record<string, StoredFileMeta>;
  } catch {
    return {};
  }
}

function writeIndex(index: Record<string, StoredFileMeta>): void {
  ensureUploadsDir();
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2), 'utf-8');
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.post(
  '/',
  requireAuth,
  upload.single('file'),
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }
      if (!req.file) {
        throw new AppError('No file provided in upload.', 400);
      }

      const ext = ALLOWED_MIMES[req.file.mimetype];
      if (!ext) {
        throw new AppError(
          'Unsupported file type. Allowed formats: PDF, PNG, JPG, WEBP, TXT.',
          400
        );
      }

      const tripId = typeof req.body?.tripId === 'string' ? req.body.tripId.trim() : 'general';
      const memberIdsRaw =
        typeof req.body?.memberIds === 'string' ? req.body.memberIds.split(',') : [];
      const authorizedUids = Array.from(
        new Set([req.user.uid, ...memberIdsRaw.map((id: string) => id.trim()).filter(Boolean)])
      ).slice(0, 20);

      ensureUploadsDir();
      const fileId = crypto.randomUUID().replace(/-/g, '');
      const storedName = `${fileId}${ext}`;
      const targetPath = path.resolve(UPLOADS_DIR, storedName);

      if (!targetPath.startsWith(UPLOADS_DIR + path.sep)) {
        throw new AppError('Invalid file storage path.', 400);
      }

      fs.writeFileSync(targetPath, req.file.buffer);

      const meta: StoredFileMeta = {
        fileId,
        ownerId: req.user.uid,
        tripId,
        authorizedUids,
        originalName: req.file.originalname.slice(0, 200),
        storedName,
        mimeType: req.file.mimetype,
        size: req.file.size,
        createdAt: new Date().toISOString(),
      };

      const index = readIndex();
      index[fileId] = meta;
      writeIndex(index);

      res.status(201).json({
        fileId: meta.fileId,
        fileName: meta.originalName,
        mimeType: meta.mimeType,
        fileSize: meta.size,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:fileId',
  requireAuth,
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }
      const fileId = String(req.params.fileId || '').trim();
      if (!/^[a-zA-Z0-9_-]+$/.test(fileId)) {
        throw new AppError('Invalid file identifier.', 400);
      }

      const index = readIndex();
      const meta = index[fileId];
      if (!meta) {
        throw new AppError('Document file not found.', 404);
      }

      const isAuthorized =
        meta.ownerId === req.user.uid ||
        meta.authorizedUids.includes(req.user.uid) ||
        (req.user.email === 'anikasaida5@gmail.com' && req.user.email_verified === true);

      if (!isAuthorized) {
        throw new AppError('Forbidden. You do not have access to this private file.', 403);
      }

      const filePath = path.resolve(UPLOADS_DIR, meta.storedName);
      if (!filePath.startsWith(UPLOADS_DIR + path.sep) || !fs.existsSync(filePath)) {
        throw new AppError('File missing from storage.', 404);
      }

      res.setHeader('Content-Type', meta.mimeType);
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${meta.originalName.replace(/["\\]/g, '')}"`
      );
      fs.createReadStream(filePath).pipe(res);
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/:fileId',
  requireAuth,
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }
      const fileId = String(req.params.fileId || '').trim();
      if (!/^[a-zA-Z0-9_-]+$/.test(fileId)) {
        throw new AppError('Invalid file identifier.', 400);
      }

      const index = readIndex();
      const meta = index[fileId];
      if (!meta) {
        res.json({ deleted: true });
        return;
      }

      const isAuthorized =
        meta.ownerId === req.user.uid ||
        meta.authorizedUids.includes(req.user.uid) ||
        (req.user.email === 'anikasaida5@gmail.com' && req.user.email_verified === true);

      if (!isAuthorized) {
        throw new AppError('Forbidden. Only authorized owners can delete this file.', 403);
      }

      const filePath = path.resolve(UPLOADS_DIR, meta.storedName);
      if (filePath.startsWith(UPLOADS_DIR + path.sep) && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      delete index[fileId];
      writeIndex(index);
      res.json({ deleted: true });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
