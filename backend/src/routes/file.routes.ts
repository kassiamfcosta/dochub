import { Router } from 'express';
import multer from 'multer';
import { FileController } from '../controllers/file.controller';
import { authenticate } from '../middlewares/auth';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

// Configuração do Multer (armazenamento em memória)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB por arquivo
        files: 5, // Máximo 5 arquivos por vez
    },
});

// Autenticação necessária
router.use(authenticate);

/**
 * POST /api/files/extract-text
 * Upload de arquivos para extração de texto
 * Aceita: PDF, DOCX, TXT
 */
router.post(
    '/extract-text',
    upload.array('files'),
    asyncHandler(FileController.extractTextFromFiles)
);

export default router;
