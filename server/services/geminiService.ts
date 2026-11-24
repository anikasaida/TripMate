import { GoogleGenAI, Type, ThinkingLevel, GenerateContentResponse } from '@google/genai';
import { AppError } from '../middleware/errorHandler.ts';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AppError(
      'GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets.',
      503
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientHighDemandError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err || '');
  return (
    msg.includes('503') ||
    msg.includes('UNAVAILABLE') ||
    msg.includes('high demand') ||
    msg.includes('overloaded') ||
    msg.includes('429') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('ECONNRESET') ||
    msg.includes('ETIMEDOUT')
  );
}

function normalizeGeminiError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  const raw = err instanceof Error ? err.message : String(err || 'AI service error');
  if (raw.includes('API_KEY_INVALID') || raw.includes('PERMISSION_DENIED')) {
    return new AppError(
      'Gemini API key is invalid or lacks permission. Please verify GEMINI_API_KEY in Settings > Secrets.',
      503
    );
  }
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
    return new AppError(
      'AI request quota was temporarily reached. Please wait a few seconds and try again.',
      429
    );
  }
  if (raw.includes('503') || raw.includes('UNAVAILABLE') || raw.includes('high demand')) {
    return new AppError(
      'The AI service is experiencing temporary high traffic right now. Please tap Retry in a moment.',
      503
    );
  }
  return new AppError('Unable to complete AI request right now. Please try again.', 502);
}

async function generateWithResilience(
  callModel: (ai: GoogleGenAI, model: string, isPrimary: boolean) => Promise<GenerateContentResponse>
): Promise<GenerateContentResponse> {
  const ai = getGeminiClient();
  const attempts: Array<{ model: string; isPrimary: boolean; delayMs: number }> = [
    { model: 'gemini-4-hydrogen', isPrimary: true, delayMs: 0 },
    { model: 'gemini-4-hydrogen', isPrimary: true, delayMs: 700 },
    { model: 'gemini-3.1-flash-lite', isPrimary: false, delayMs: 400 },
    { model: 'gemini-3.1-flash-lite', isPrimary: false, delayMs: 1200 },
  ];

  let lastError: unknown;
  for (const step of attempts) {
    if (step.delayMs > 0) {
      await sleep(step.delayMs);
    }
    try {
      return await callModel(ai, step.model, step.isPrimary);
    } catch (err) {
      lastError = err;
      if (!isTransientHighDemandError(err)) {
        throw normalizeGeminiError(err);
      }
    }
  }

  throw normalizeGeminiError(lastError);
}

export interface PackingSuggestionInput {
  destination: string;
  weatherSummary?: string;
  durationDays: number;
  travelersCount: number;
  tripType: string;
  season: string;
}

export interface SuggestedPackingItem {
  name: string;
  category: string;
  quantity: number;
  priority: 'Essential' | 'High' | 'Medium' | 'Low';
  notes: string;
}

export async function generateSmartPackingSuggestions(
  input: PackingSuggestionInput
): Promise<SuggestedPackingItem[]> {
  const prompt = `Generate a practical, tailored travel packing checklist for:
- Destination: ${input.destination}
- Weather / Climate: ${input.weatherSummary || 'Typical seasonal conditions'}
- Duration: ${input.durationDays} days
- Travelers: ${input.travelersCount}
- Trip Type: ${input.tripType}
- Travel Season: ${input.season}

Return 14 to 20 specific, actionable items organized into standard categories: "Clothing", "Personal Care", "Travel Essentials", "Health & Safety", or "Electronics". Adjust quantities appropriately for ${input.durationDays} days and ${input.travelersCount} travelers.`;

  const response = await generateWithResilience((ai, model, isPrimary) =>
    ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        ...(isPrimary ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {}),
        systemInstruction:
          'You are TripMate Smart Packing Assistant. Return strictly structured JSON packing recommendations tailored to destination climate, trip type, and duration.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: 'Clear item name' },
              category: {
                type: Type.STRING,
                description:
                  'One of Clothing, Personal Care, Travel Essentials, Health & Safety, Electronics',
              },
              quantity: { type: Type.INTEGER, description: 'Recommended quantity >= 1' },
              priority: {
                type: Type.STRING,
                description: 'One of Essential, High, Medium, Low',
              },
              notes: { type: Type.STRING, description: 'Brief reason why needed for this trip' },
            },
            required: ['name', 'category', 'quantity', 'priority', 'notes'],
          },
        },
      },
    })
  );

  const text = (response.text ?? '[]').trim();
  const parsed = JSON.parse(text) as SuggestedPackingItem[];
  return parsed.map((item) => ({
    name: String(item.name || '').slice(0, 120),
    category: String(item.category || 'Travel Essentials').slice(0, 80),
    quantity: Math.max(1, Math.min(99, Number(item.quantity) || 1)),
    priority: (['Essential', 'High', 'Medium', 'Low'].includes(item.priority)
      ? item.priority
      : 'Medium') as SuggestedPackingItem['priority'],
    notes: String(item.notes || '').slice(0, 300),
  }));
}

export interface ChatHistoryTurn {
  role: 'user' | 'model';
  text: string;
}

export interface TravelChatInput {
  message: string;
  history?: ChatHistoryTurn[];
  tripContext?: {
    tripName?: string;
    destination?: string;
    country?: string;
    startDate?: string;
    endDate?: string;
    travelersCount?: number;
    tripType?: string;
    estimatedBudget?: number;
    currency?: string;
  };
}

export async function generateTravelAssistantReply(input: TravelChatInput): Promise<string> {
  const contextBlock = input.tripContext?.destination
    ? `\nActive Trip Context:\n- Trip Name: ${input.tripContext.tripName || 'Planned Trip'}\n- Destination: ${input.tripContext.destination}, ${input.tripContext.country || ''}\n- Dates: ${input.tripContext.startDate || 'TBD'} to ${input.tripContext.endDate || 'TBD'}\n- Travelers: ${input.tripContext.travelersCount || 1}\n- Trip Type: ${input.tripContext.tripType || 'General'}\n- Budget: ${input.tripContext.estimatedBudget ?? 'Flexible'} ${input.tripContext.currency || 'USD'}\n`
    : '';

  const conversationHistory = (input.history || [])
    .slice(-10)
    .map((h) => `${h.role === 'user' ? 'Traveler' : 'TripMate AI'}: ${h.text}`)
    .join('\n');

  const prompt = `${contextBlock}${conversationHistory ? `Recent Conversation:\n${conversationHistory}\n` : ''}Traveler Question: ${input.message}`;

  const response = await generateWithResilience((ai, model, isPrimary) =>
    ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        ...(isPrimary ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {}),
        systemInstruction:
          'You are TripMate AI Travel Assistant. Help travelers plan destinations, day-by-day itineraries, tourist attractions, packing advice, budget estimates, and local transportation tips. Be practical, structured, and concise. Never fabricate live ticket prices or claim real-time availability—label estimates clearly as approximate planning figures.',
      },
    })
  );

  return (
    response.text ?? 'I could not generate a travel recommendation right now. Please try again.'
  ).trim();
}

export interface GeneratedItineraryItem {
  dayOffset: number;
  startTime: string;
  endTime: string;
  title: string;
  location: string;
  description: string;
  estimatedCost: number;
  transportation: string;
}

export async function generateStructuredItinerary(params: {
  destination: string;
  country?: string;
  durationDays: number;
  travelersCount: number;
  tripType: string;
  budget?: number;
  currency?: string;
  preferences?: string;
}): Promise<GeneratedItineraryItem[]> {
  const days = Math.max(1, Math.min(10, params.durationDays));

  const prompt = `Create a structured ${days}-day itinerary for ${params.destination}${params.country ? `, ${params.country}` : ''}.
Trip Type: ${params.tripType}, Travelers: ${params.travelersCount}, Target Budget: ${params.budget ?? 'Moderate'} ${params.currency || 'USD'}.
${params.preferences ? `Preferences: ${params.preferences}` : ''}
Generate 2 to 4 well-paced activities per day (dayOffset starting at 0 for Day 1 up to ${days - 1}). Provide realistic 24h HH:MM start/end times and approximate estimatedCost in ${params.currency || 'USD'}.`;

  const response = await generateWithResilience((ai, model, isPrimary) =>
    ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        ...(isPrimary ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {}),
        systemInstruction:
          'You are TripMate Itinerary Architect. Return strictly structured JSON itinerary activities with realistic timing and local transit notes.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              dayOffset: { type: Type.INTEGER, description: '0-based day index (0 = Day 1)' },
              startTime: { type: Type.STRING, description: 'HH:MM 24-hour format e.g. 09:00' },
              endTime: { type: Type.STRING, description: 'HH:MM 24-hour format e.g. 11:30' },
              title: { type: Type.STRING, description: 'Activity title' },
              location: { type: Type.STRING, description: 'Specific place or neighborhood' },
              description: { type: Type.STRING, description: 'Concise activity overview' },
              estimatedCost: { type: Type.NUMBER, description: 'Approximate cost >= 0' },
              transportation: { type: Type.STRING, description: 'Walk, taxi, metro, boat, etc.' },
            },
            required: [
              'dayOffset',
              'startTime',
              'endTime',
              'title',
              'location',
              'description',
              'estimatedCost',
              'transportation',
            ],
          },
        },
      },
    })
  );

  const text = (response.text ?? '[]').trim();
  const parsed = JSON.parse(text) as GeneratedItineraryItem[];
  return parsed.map((item) => ({
    dayOffset: Math.max(0, Math.min(days - 1, Number(item.dayOffset) || 0)),
    startTime: String(item.startTime || '09:00').slice(0, 16),
    endTime: String(item.endTime || '11:00').slice(0, 16),
    title: String(item.title || 'Sightseeing').slice(0, 140),
    location: String(item.location || params.destination).slice(0, 160),
    description: String(item.description || '').slice(0, 900),
    estimatedCost: Math.max(0, Number(item.estimatedCost) || 0),
    transportation: String(item.transportation || 'Local transit').slice(0, 120),
  }));
}
