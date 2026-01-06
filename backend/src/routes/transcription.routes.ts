import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { asyncHandler } from '../utils/async-handler';
import { validate } from '../middlewares/validate';
import { createTranscriptionSchema, updateTranscriptionSchema, shareTranscriptionSchema } from '../utils/validation';
import { TranscriptionController } from '../controllers/transcription.controller';
import { GenerationController } from '../controllers/generation.controller';
import { ShareController } from '../controllers/share.controller';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(TranscriptionController.list));
router.post('/', validate(createTranscriptionSchema), asyncHandler(TranscriptionController.create));

router.get('/:id', asyncHandler(TranscriptionController.getById));
router.put('/:id', validate(updateTranscriptionSchema), asyncHandler(TranscriptionController.update));
router.delete('/:id', asyncHandler(TranscriptionController.delete));

router.post('/:id/preview-user-stories', asyncHandler(GenerationController.previewUserStories));
router.post('/:id/generate-user-story', asyncHandler(GenerationController.generateUserStory));
router.post('/:id/generate-summary', asyncHandler(GenerationController.generateSummary));
router.post('/:id/generate-cards', asyncHandler(GenerationController.generateCards));

router.post('/:id/share', validate(shareTranscriptionSchema), asyncHandler(ShareController.share));

export default router;
