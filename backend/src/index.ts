import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import env from './config/env';
import authRoutes from './routes/auth.routes';
import transcriptionRoutes from './routes/transcription.routes';
import fileRoutes from './routes/file.routes';
import adminRoutes from './routes/admin.routes';

import { errorHandler } from './middlewares/error-handler';

dotenv.config();

export const app = express();
const PORT = parseInt(env.PORT, 10);

// Middlewares
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rota raiz
app.get('/', (_req, res) => {
  res.json({
    message: 'Zello Transcription Hub API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api',
      auth: '/api/auth',
      transcriptions: '/api/transcriptions'
    }
  });
});

// Rotas
app.get('/api', (_req, res) => {
  res.json({ message: 'Zello Transcription Hub API' });
});

app.use('/api/auth', authRoutes);
app.use('/api/transcriptions', transcriptionRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/admin', adminRoutes);

// Error handler global (deve ser o último middleware)
app.use(errorHandler);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Ambiente: ${env.NODE_ENV}`);
  });
}

