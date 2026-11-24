import { AppError } from '../middleware/errorHandler.ts';

export interface WeatherForecastDay {
  date: string;
  tempMax: number;
  tempMin: number;
  precipitationProbability: number;
  weatherCode: number;
  condition: string;
}

export interface WeatherReport {
  locationName: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
  source: string;
  current: {
    temperature: number;
    apparentTemperature: number;
    humidity: number;
    windSpeed: number;
    precipitation: number;
    weatherCode: number;
    condition: string;
  };
  daily: WeatherForecastDay[];
  suggestions: string[];
}

function describeWmoCode(code: number): string {
  const map: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with hail',
    99: 'Heavy thunderstorm with hail',
  };
  return map[code] || 'Variable conditions';
}

function buildWeatherSuggestions(
  tempC: number,
  maxRainProb: number,
  windSpeed: number
): string[] {
  const tips: string[] = [];
  if (maxRainProb >= 50) {
    tips.push('High chance of rain in the forecast — pack a compact umbrella, waterproof shell, and quick-dry footwear.');
  } else if (maxRainProb >= 25) {
    tips.push('Light or scattered showers possible — bring a foldable rain jacket just in case.');
  }
  if (tempC >= 28) {
    tips.push('Warm to hot temperatures expected — prioritize breathable cotton/linen clothing, sunscreen, sunglasses, and hydration.');
  } else if (tempC <= 12) {
    tips.push('Cool to cold weather ahead — layer with thermal tops, a warm fleece or jacket, and closed-toe shoes.');
  } else {
    tips.push('Mild and comfortable temperatures — versatile daytime layers and a light evening jacket are ideal.');
  }
  if (windSpeed >= 25) {
    tips.push('Breezy conditions expected — consider a windbreaker for coastal or high-altitude viewpoints.');
  }
  return tips;
}

interface KnownPlace {
  aliases: string[];
  name: string;
  country: string;
  lat: number;
  lng: number;
}

const KNOWN_TRAVEL_PLACES: KnownPlace[] = [
  {
    aliases: ["cox's bazar", 'coxs bazar', "cox's bazer", 'coxs bazer', 'cox bazar', 'cox bazer'],
    name: "Cox's Bazar",
    country: 'Bangladesh',
    lat: 21.4272,
    lng: 92.0058,
  },
  {
    aliases: ['sajek', 'sajek valley'],
    name: 'Sajek Valley',
    country: 'Bangladesh',
    lat: 23.3816,
    lng: 92.2938,
  },
  {
    aliases: ['sundarbans', 'the sundarbans', 'sundarban'],
    name: 'The Sundarbans',
    country: 'Bangladesh',
    lat: 21.9497,
    lng: 89.1833,
  },
  {
    aliases: ['ratargul', 'ratargul swamp forest', 'ratargul & sreemangal'],
    name: 'Ratargul Swamp Forest (Sylhet)',
    country: 'Bangladesh',
    lat: 25.0167,
    lng: 91.9333,
  },
  {
    aliases: ['sreemangal', 'srimangal'],
    name: 'Sreemangal',
    country: 'Bangladesh',
    lat: 24.3065,
    lng: 91.7296,
  },
  {
    aliases: ['paharpur', 'somapura mahavihara', 'somapura mahavihara (paharpur)'],
    name: 'Paharpur',
    country: 'Bangladesh',
    lat: 25.0311,
    lng: 88.9767,
  },
  {
    aliases: ['saint martin', "saint martin's island", 'st martin', 'st. martin'],
    name: "Saint Martin's Island",
    country: 'Bangladesh',
    lat: 20.6237,
    lng: 92.3234,
  },
  {
    aliases: ['kuakata', 'kuakata sea beach'],
    name: 'Kuakata',
    country: 'Bangladesh',
    lat: 21.8167,
    lng: 90.1167,
  },
  {
    aliases: ['amalfi', 'amalfi coast'],
    name: 'Amalfi Coast',
    country: 'Italy',
    lat: 40.6333,
    lng: 14.6029,
  },
  {
    aliases: ['oeschinen lake', 'interlaken & oeschinen lake'],
    name: 'Interlaken',
    country: 'Switzerland',
    lat: 46.6863,
    lng: 7.8632,
  },
  {
    aliases: ['old dhaka', 'old dhaka & national museum'],
    name: 'Dhaka',
    country: 'Bangladesh',
    lat: 23.8103,
    lng: 90.4125,
  },
  {
    aliases: ['istanbul old city'],
    name: 'Istanbul',
    country: 'Turkey',
    lat: 41.0082,
    lng: 28.9784,
  },
];

function normalizeQueryKey(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function buildSearchCandidates(raw: string): string[] {
  const trimmed = raw.trim();
  const candidates = new Set<string>();
  candidates.add(trimmed);

  // Strip country part if entered as "City, Country"
  const beforeComma = trimmed.split(',')[0]?.trim();
  if (beforeComma) candidates.add(beforeComma);

  // Normalize common spelling slips
  const normalizedBazar = trimmed
    .replace(/\bbazer\b/gi, 'Bazar')
    .replace(/\bcoxs\b/gi, "Cox's")
    .replace(/[’]/g, "'");
  candidates.add(normalizedBazar);
  if (normalizedBazar.includes(',')) {
    candidates.add(normalizedBazar.split(',')[0].trim());
  }

  return Array.from(candidates).filter(Boolean);
}

async function geocodeWithOpenMeteo(
  candidate: string
): Promise<{ name: string; country: string; latitude: number; longitude: number } | null> {
  const geoUrl = new URL('https://geocoding-api.open-meteo.com/v1/search');
  geoUrl.searchParams.set('name', candidate);
  geoUrl.searchParams.set('count', '1');
  geoUrl.searchParams.set('language', 'en');
  geoUrl.searchParams.set('format', 'json');

  const geoRes = await fetch(geoUrl.toString());
  if (!geoRes.ok) return null;

  const geoJson = (await geoRes.json()) as {
    results?: Array<{
      name: string;
      country?: string;
      latitude: number;
      longitude: number;
    }>;
  };
  const match = geoJson.results?.[0];
  if (!match) return null;
  return {
    name: match.name,
    country: match.country || '',
    latitude: match.latitude,
    longitude: match.longitude,
  };
}

async function geocodeWithNominatim(
  candidate: string
): Promise<{ name: string; country: string; latitude: number; longitude: number } | null> {
  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', candidate);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('limit', '1');
    url.searchParams.set('addressdetails', '1');

    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'TripMate-TravelPlanner/1.0',
        'Accept-Language': 'en',
      },
    });
    if (!res.ok) return null;

    const results = (await res.json()) as Array<{
      lat: string;
      lon: string;
      name?: string;
      display_name?: string;
      address?: { country?: string; city?: string; town?: string; state?: string };
    }>;
    const hit = results?.[0];
    if (!hit) return null;
    const latitude = Number(hit.lat);
    const longitude = Number(hit.lon);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;

    return {
      name:
        hit.name ||
        hit.address?.city ||
        hit.address?.town ||
        hit.display_name?.split(',')[0] ||
        candidate,
      country: hit.address?.country || '',
      latitude,
      longitude,
    };
  } catch {
    return null;
  }
}

export async function fetchLiveWeather(params: {
  destination?: string;
  lat?: number;
  lng?: number;
}): Promise<WeatherReport> {
  let latitude = params.lat;
  let longitude = params.lng;
  let locationName = params.destination || 'Selected Destination';
  let country = '';

  if (latitude === undefined || longitude === undefined || Number.isNaN(latitude) || Number.isNaN(longitude)) {
    if (!params.destination || !params.destination.trim()) {
      throw new AppError('Provide either a destination name or valid latitude/longitude coordinates.', 400);
    }

    const candidates = buildSearchCandidates(params.destination);
    let resolved: { name: string; country: string; latitude: number; longitude: number } | null =
      null;

    // 1. Check known travel destination aliases first (handles common typos & landmarks reliably)
    for (const candidate of candidates) {
      const key = normalizeQueryKey(candidate);
      const known = KNOWN_TRAVEL_PLACES.find((p) => p.aliases.includes(key));
      if (known) {
        resolved = {
          name: known.name,
          country: known.country,
          latitude: known.lat,
          longitude: known.lng,
        };
        break;
      }
    }

    // 2. Try Open-Meteo Geocoding API across normalized candidates
    if (!resolved) {
      for (const candidate of candidates) {
        resolved = await geocodeWithOpenMeteo(candidate);
        if (resolved) break;
      }
    }

    // 3. Fallback to OpenStreetMap Nominatim for valleys, beaches, landmarks, and fuzzy spelling
    if (!resolved) {
      for (const candidate of candidates) {
        resolved = await geocodeWithNominatim(candidate);
        if (resolved) break;
      }
    }

    if (!resolved) {
      throw new AppError(
        `Could not locate weather coordinates for "${params.destination}". Try checking the spelling or entering a nearby city.`,
        404
      );
    }

    latitude = resolved.latitude;
    longitude = resolved.longitude;
    locationName = resolved.name;
    country = resolved.country;
  }

  const forecastUrl = new URL('https://api.open-meteo.com/v1/forecast');
  forecastUrl.searchParams.set('latitude', String(latitude));
  forecastUrl.searchParams.set('longitude', String(longitude));
  forecastUrl.searchParams.set(
    'current',
    'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m'
  );
  forecastUrl.searchParams.set(
    'daily',
    'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max'
  );
  forecastUrl.searchParams.set('timezone', 'auto');
  forecastUrl.searchParams.set('forecast_days', '7');

  const weatherRes = await fetch(forecastUrl.toString());
  if (!weatherRes.ok) {
    throw new AppError('Live weather API is temporarily unavailable. Please try again shortly.', 503);
  }

  const data = (await weatherRes.json()) as {
    timezone?: string;
    current?: {
      temperature_2m: number;
      relative_humidity_2m: number;
      apparent_temperature: number;
      precipitation: number;
      weather_code: number;
      wind_speed_10m: number;
    };
    daily?: {
      time: string[];
      weather_code: number[];
      temperature_2m_max: number[];
      temperature_2m_min: number[];
      precipitation_probability_max: number[];
    };
  };

  if (!data.current || !data.daily) {
    throw new AppError('Incomplete meteorological payload received from weather provider.', 502);
  }

  const daily: WeatherForecastDay[] = data.daily.time.map((date, idx) => ({
    date,
    tempMax: data.daily!.temperature_2m_max[idx] ?? 0,
    tempMin: data.daily!.temperature_2m_min[idx] ?? 0,
    precipitationProbability: data.daily!.precipitation_probability_max[idx] ?? 0,
    weatherCode: data.daily!.weather_code[idx] ?? 0,
    condition: describeWmoCode(data.daily!.weather_code[idx] ?? 0),
  }));

  const maxRainProb = daily.reduce((max, d) => Math.max(max, d.precipitationProbability), 0);

  return {
    locationName,
    country,
    latitude,
    longitude,
    timezone: data.timezone || 'UTC',
    source: 'Open-Meteo Live Forecast',
    current: {
      temperature: data.current.temperature_2m,
      apparentTemperature: data.current.apparent_temperature,
      humidity: data.current.relative_humidity_2m,
      windSpeed: data.current.wind_speed_10m,
      precipitation: data.current.precipitation,
      weatherCode: data.current.weather_code,
      condition: describeWmoCode(data.current.weather_code),
    },
    daily,
    suggestions: buildWeatherSuggestions(
      data.current.temperature_2m,
      maxRainProb,
      data.current.wind_speed_10m
    ),
  };
}
