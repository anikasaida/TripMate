import { Router, Request, Response, NextFunction } from 'express';
import { fetchLiveWeather } from '../services/weatherService.ts';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const destination = typeof req.query.destination === 'string' ? req.query.destination : undefined;
    const lat = req.query.lat !== undefined ? Number(req.query.lat) : undefined;
    const lng = req.query.lng !== undefined ? Number(req.query.lng) : undefined;

    const report = await fetchLiveWeather({ destination, lat, lng });
    res.json(report);
  } catch (error) {
    next(error);
  }
});

export default router;
