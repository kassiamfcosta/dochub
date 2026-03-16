import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { asyncHandler } from '../utils/async-handler';
import { NotesController } from '../controllers/notes.controller';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get('/transcriptions/:transcriptionId/notes', asyncHandler(NotesController.list));
router.post('/transcriptions/:transcriptionId/notes', asyncHandler(NotesController.create));
router.put('/notes/:noteId', asyncHandler(NotesController.update));
router.get('/notes/:noteId/history', asyncHandler(NotesController.history));
router.delete('/notes/:noteId', asyncHandler(NotesController.archive));

export default router;

