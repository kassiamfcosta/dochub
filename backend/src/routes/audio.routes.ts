import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { asyncHandler } from '../utils/async-handler';
import { AudioController, uploadAudio } from '../controllers/audio.controller';

const router = Router();

router.use(authenticate);

router.post('/transcribe', uploadAudio, asyncHandler(AudioController.transcribe));

export default router;

