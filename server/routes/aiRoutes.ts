import { Router, Response, NextFunction } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.ts';
import { AppError } from '../middleware/errorHandler.ts';
import {
  generateSmartPackingSuggestions,
  generateTravelAssistantReply,
  generateStructuredItinerary,
} from '../services/geminiService.ts';

const router = Router();

router.post(
  '/packing-suggestions',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { destination, weatherSummary, durationDays, travelersCount, tripType, season } =
        req.body || {};

      if (!destination || typeof destination !== 'string' || !destination.trim()) {
        throw new AppError('Destination is required for smart packing suggestions.', 400);
      }

      const items = await generateSmartPackingSuggestions({
        destination: destination.trim().slice(0, 120),
        weatherSummary: typeof weatherSummary === 'string' ? weatherSummary.slice(0, 200) : undefined,
        durationDays: Math.max(1, Math.min(60, Number(durationDays) || 4)),
        travelersCount: Math.max(1, Math.min(50, Number(travelersCount) || 1)),
        tripType: typeof tripType === 'string' ? tripType.slice(0, 60) : 'Leisure Trip',
        season: typeof season === 'string' ? season.slice(0, 60) : 'All-Season',
      });

      res.json({ items });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/chat',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { message, history, tripContext } = req.body || {};

      if (!message || typeof message !== 'string' || !message.trim()) {
        throw new AppError('Message cannot be empty.', 400);
      }

      const reply = await generateTravelAssistantReply({
        message: message.trim().slice(0, 2000),
        history: Array.isArray(history) ? history.slice(-10) : [],
        tripContext: tripContext && typeof tripContext === 'object' ? tripContext : undefined,
      });

      res.json({ reply });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/generate-itinerary',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { destination, country, durationDays, travelersCount, tripType, budget, currency, preferences } =
        req.body || {};

      if (!destination || typeof destination !== 'string' || !destination.trim()) {
        throw new AppError('Destination is required to generate an itinerary.', 400);
      }

      const activities = await generateStructuredItinerary({
        destination: destination.trim().slice(0, 120),
        country: typeof country === 'string' ? country.slice(0, 100) : undefined,
        durationDays: Math.max(1, Math.min(10, Number(durationDays) || 3)),
        travelersCount: Math.max(1, Math.min(50, Number(travelersCount) || 1)),
        tripType: typeof tripType === 'string' ? tripType.slice(0, 60) : 'Leisure Trip',
        budget: Number(budget) || undefined,
        currency: typeof currency === 'string' ? currency.slice(0, 10) : 'USD',
        preferences: typeof preferences === 'string' ? preferences.slice(0, 400) : undefined,
      });

      res.json({ activities });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
