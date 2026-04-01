import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { asyncHandler } from '../utils/async-handler';
import { validate } from '../middlewares/validate';
import { createTranscriptionSchema, updateTranscriptionSchema, shareTranscriptionSchema } from '../utils/validation';
import { TranscriptionController } from '../controllers/transcription.controller';
import { GenerationController } from '../controllers/generation.controller';
import { ShareController } from '../controllers/share.controller';
import { PlanningController } from '../controllers/planning.controller';

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
router.post('/:id/regenerate-user-story', asyncHandler(GenerationController.regenerateUserStory));
router.post('/:id/regenerate-summary', asyncHandler(GenerationController.regenerateSummary));
router.post('/:id/regenerate-cards', asyncHandler(GenerationController.regenerateCards));
router.post('/:id/generate-requirements-part1', asyncHandler(GenerationController.generateRequirementsPart1));
router.post('/:id/generate-requirements-part2', asyncHandler(GenerationController.generateRequirementsPart2));
router.post('/:id/generate-requirements-complete', asyncHandler(GenerationController.generateRequirementsComplete));
router.post('/:id/resolve-requirement-conflict', asyncHandler(GenerationController.resolveRequirementConflict));

router.post('/:id/share', validate(shareTranscriptionSchema), asyncHandler(ShareController.share));
router.post('/:id/restore-user-story', asyncHandler(GenerationController.restoreUserStory));
router.post('/:id/restore-summary', asyncHandler(GenerationController.restoreSummary));
router.post('/:id/restore-cards', asyncHandler(GenerationController.restoreCards));

// Planejamento / Cronograma
router.post('/:id/planning/suggest-hus', asyncHandler(PlanningController.suggestHUs));
router.get('/:id/planning/items', asyncHandler(PlanningController.listItems));
router.post('/:id/planning/items', asyncHandler(PlanningController.createItem));
router.put('/:id/planning/items/batch', asyncHandler(PlanningController.batchUpdateItems));
router.put('/:id/planning/items/:itemId', asyncHandler(PlanningController.updateItem));
router.delete('/:id/planning/items/:itemId', asyncHandler(PlanningController.deleteItem));
router.get('/:id/planning/point-config', asyncHandler(PlanningController.getPointConfig));
router.put('/:id/planning/point-config', asyncHandler(PlanningController.savePointConfig));
router.post('/:id/planning/generate-schedule', asyncHandler(PlanningController.generateSchedule));

export default router;
