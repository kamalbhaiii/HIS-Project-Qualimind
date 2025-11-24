import multer from 'multer';
import path from 'path';
import fs from 'fs';
import cfg from '@config/index';

const UPLOAD_DIR = cfg.multer.dest;

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/\s+/g, '_');
    cb(null, `${timestamp}-${safeName}`);
  },
});

export const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'text/csv',                                     // CSV
      'application/vnd.ms-excel',                     // XLS
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
      'application/json',                             // JSON
      'text/plain',                                   // if you still want .txt
    ];

    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Unsupported file type'));
    }
    cb(null, true);
  },
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
  },
});
