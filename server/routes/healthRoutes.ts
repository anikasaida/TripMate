import { Router } from 'express';
import { ENV } from '../config/env.ts';

const router = Router();

router.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'TripMate API',
    geminiConfigured: Boolean(ENV.GEMINI_API_KEY),
    mapsConfigured: Boolean(ENV.GOOGLE_MAPS_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

export default router;
