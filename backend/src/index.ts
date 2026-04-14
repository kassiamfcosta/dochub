import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import env from './config/env';
import authRoutes from './routes/auth.routes';
import transcriptionRoutes from './routes/transcription.routes';
import fileRoutes from './routes/file.routes';
import audioRoutes from './routes/audio.routes';
import adminRoutes from './routes/admin.routes';
import utilsRoutes from './routes/utils.routes';
import notesRoutes from './routes/notes.routes';

import { errorHandler } from './middlewares/error-handler';

export const app = express();
const PORT = parseInt(env.PORT, 10);

// Necessário quando há X-Forwarded-For (proxy/ingress); senão express-rate-limit lança ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
const trust = env.TRUST_PROXY;
if (trust !== 'false' && trust !== '0') {
  let hops = 1;
  if (trust && trust !== 'true' && trust !== '1') {
    const parsed = parseInt(trust, 10);
    if (Number.isFinite(parsed) && parsed > 0) hops = parsed;
  }
  app.set('trust proxy', hops);
}

// Middlewares
app.use(cors({
  origin: env.NODE_ENV === 'development' ? true : env.FRONTEND_URL,
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
    message: 'Doc Hub API',
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
  res.json({ message: 'Doc Hub API' });
});

app.use('/api/auth', authRoutes);
app.use('/api/transcriptions', transcriptionRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/audio', audioRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/utils', utilsRoutes);
app.use('/api', notesRoutes);

// Error handler global (deve ser o último middleware)
app.use(errorHandler);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Ambiente: ${env.NODE_ENV}`);
  });
}

