import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { ENV } from './server/config/env.ts';
import { errorHandler } from './server/middleware/errorHandler.ts';
import healthRoutes from './server/routes/healthRoutes.ts';
import aiRoutes from './server/routes/aiRoutes.ts';
import weatherRoutes from './server/routes/weatherRoutes.ts';
import uploadRoutes from './server/routes/uploadRoutes.ts';

async function startServer() {
  const app = express();

  app.set('trust proxy', true);
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) {
          callback(null, true);
          return;
        }
        const allowed = [
          'http://localhost:3000',
          'http://127.0.0.1:3000',
          ENV.APP_URL,
        ].filter(Boolean);
        if (
          allowed.includes(origin) ||
          origin.endsWith('.run.app') ||
          origin.endsWith('.aistudio.google.com')
        ) {
          callback(null, true);
        } else {
          callback(null, true);
        }
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: '2mb' }));

  // API Routes
  app.use('/api/health', healthRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/weather', weatherRoutes);
  app.use('/api/uploads', uploadRoutes);

  if (ENV.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.use(errorHandler);

  app.listen(ENV.PORT, '0.0.0.0', () => {
    console.log(`TripMate server running on http://0.0.0.0:${ENV.PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start TripMate server:', err);
  process.exit(1);
});
