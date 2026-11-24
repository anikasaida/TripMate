import React, { useState, useEffect } from 'react';
import {
  CloudSun,
  Droplets,
  Wind,
  Thermometer,
  Search,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { WorkspaceLayout } from '../components/Layout/WorkspaceLayout';
import { useTripData } from '../contexts/TripDataContext';
import { apiClient } from '../services/api';

interface WeatherForecastDay {
  date: string;
  tempMax: number;
  tempMin: number;
  precipitationProbability: number;
  weatherCode: number;
  condition: string;
}

interface WeatherReport {
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
    condition: string;
  };
  daily: WeatherForecastDay[];
  suggestions: string[];
}

export const WeatherPage: React.FC = () => {
  const { trips } = useTripData();
  const [query, setQuery] = useState("Cox's Bazar");
  const [report, setReport] = useState<WeatherReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWeather = async (destinationName: string, lat?: number, lng?: number) => {
    if (!destinationName.trim() && (lat === undefined || lng === undefined)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<WeatherReport>('/weather', {
        params:
          lat !== undefined && lng !== undefined
            ? { destination: destinationName, lat, lng }
            : { destination: destinationName.trim() },
      });
      setReport(res.data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        (err instanceof Error ? err.message : 'Unable to fetch live weather forecast.');
      setError(msg);
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const firstTrip = trips[0];
    if (firstTrip) {
      setQuery(firstTrip.destination);
      loadWeather(firstTrip.destination, firstTrip.lat, firstTrip.lng);
    } else {
      loadWeather("Cox's Bazar");
    }
  }, [trips.length]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadWeather(query);
  };

  return (
    <WorkspaceLayout
      title="Weather & Travel Conditions"
      subtitle="Live meteorological forecasts and tailored packing recommendations for your destinations."
    >
      <div className="space-y-6">
        {/* Search & Quick Trip Pills */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search any city or travel destination (e.g., Kyoto, Dhaka, Zurich)..."
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-lg bg-[#0D7377] hover:bg-[#0F766E] text-white text-sm font-medium whitespace-nowrap disabled:opacity-60"
            >
              {loading ? 'Checking Forecast...' : 'Check Weather'}
            </button>
          </form>

          {trips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-500">Your Trips:</span>
              {trips.slice(0, 6).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setQuery(t.destination);
                    loadWeather(t.destination, t.lat, t.lng);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:border-[#0D7377] text-slate-700 font-medium transition-colors"
                >
                  {t.destination}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading && (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <Loader2 className="h-8 w-8 text-[#0D7377] animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-600">Fetching live forecast from Open-Meteo...</p>
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-start gap-3 text-red-900">
            <AlertCircle className="h-5 w-5 text-red-700 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">Live Weather Unavailable</p>
              <p className="text-xs mt-1">{error}</p>
            </div>
          </div>
        )}

        {report && !loading && (
          <div className="space-y-6">
            {/* Current Conditions Hero Card */}
            <div className="bg-[#0B1D33] text-white rounded-xl p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-6 space-y-2">
                <p className="font-mono text-xs text-[#5EEAD4] uppercase tracking-wider">
                  {report.source} · {report.timezone}
                </p>
                <h2 className="font-display text-2xl sm:text-3xl font-bold">
                  {report.locationName}
                  {report.country ? `, ${report.country}` : ''}
                </h2>
                <p className="text-slate-300 text-sm">{report.current.condition}</p>
                <p className="font-mono text-xs text-slate-400 tabular-nums">
                  Coordinates: {report.latitude.toFixed(3)}, {report.longitude.toFixed(3)}
                </p>
              </div>

              <div className="lg:col-span-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white/8 rounded-lg p-4">
                  <Thermometer className="h-4 w-4 text-[#5EEAD4] mb-1.5" />
                  <p className="text-xs text-slate-300">Temperature</p>
                  <p className="font-mono text-xl font-bold tabular-nums mt-0.5">
                    {Math.round(report.current.temperature)}°C
                  </p>
                </div>
                <div className="bg-white/8 rounded-lg p-4">
                  <CloudSun className="h-4 w-4 text-[#5EEAD4] mb-1.5" />
                  <p className="text-xs text-slate-300">Feels Like</p>
                  <p className="font-mono text-xl font-bold tabular-nums mt-0.5">
                    {Math.round(report.current.apparentTemperature)}°C
                  </p>
                </div>
                <div className="bg-white/8 rounded-lg p-4">
                  <Droplets className="h-4 w-4 text-[#5EEAD4] mb-1.5" />
                  <p className="text-xs text-slate-300">Humidity</p>
                  <p className="font-mono text-xl font-bold tabular-nums mt-0.5">
                    {report.current.humidity}%
                  </p>
                </div>
                <div className="bg-white/8 rounded-lg p-4">
                  <Wind className="h-4 w-4 text-[#5EEAD4] mb-1.5" />
                  <p className="text-xs text-slate-300">Wind Speed</p>
                  <p className="font-mono text-xl font-bold tabular-nums mt-0.5">
                    {Math.round(report.current.windSpeed)} km/h
                  </p>
                </div>
              </div>
            </div>

            {/* 7-Day Forecast */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="font-display text-base font-semibold text-[#0B1D33] mb-4">
                7-Day Outlook
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {report.daily.map((day) => (
                  <div
                    key={day.date}
                    className="p-3.5 rounded-xl border border-slate-200 bg-[#F8FAFC] flex flex-col justify-between gap-2"
                  >
                    <p className="font-mono text-xs font-semibold text-[#0B1D33] tabular-nums">
                      {day.date.slice(5)}
                    </p>
                    <p className="text-xs text-slate-600 leading-snug">{day.condition}</p>
                    <div className="pt-2 border-t border-slate-200/80 space-y-1">
                      <p className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                        {Math.round(day.tempMax)}° / {Math.round(day.tempMin)}°C
                      </p>
                      <p className="font-mono text-[11px] text-[#0D7377] tabular-nums">
                        Rain: {day.precipitationProbability}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Weather-Based Packing & Travel Advice */}
            <div className="bg-[#F4F1EA] border border-[#E5DEC9] rounded-xl p-6">
              <h3 className="font-display text-base font-semibold text-[#0B1D33] mb-3">
                Weather-Based Travel & Packing Recommendations
              </h3>
              <div className="space-y-2">
                {report.suggestions.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-sm text-slate-800">
                    <CheckCircle2 className="h-4 w-4 text-[#0D7377] shrink-0 mt-0.5" />
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
};
