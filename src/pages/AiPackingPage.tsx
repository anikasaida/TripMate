import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Sparkles, Plus, Check, Loader2, CloudSun, ArrowRight } from 'lucide-react';
import { WorkspaceLayout } from '../components/Layout/WorkspaceLayout';
import { useTripData } from '../contexts/TripDataContext';
import { useToast } from '../contexts/ToastContext';
import { apiClient } from '../services/api';
import { addPackingItem } from '../services/firestoreService';
import { PackingPriority } from '../types';

interface SuggestedItem {
  name: string;
  category: string;
  quantity: number;
  priority: PackingPriority;
  notes: string;
}

export const AiPackingPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { trips } = useTripData();
  const { showToast } = useToast();

  const initialTripId = searchParams.get('trip') || trips[0]?.id || '';
  const [selectedTripId, setSelectedTripId] = useState(initialTripId);

  const selectedTrip = useMemo(
    () => trips.find((t) => t.id === selectedTripId) || null,
    [trips, selectedTripId]
  );

  const [destination, setDestination] = useState('');
  const [weatherSummary, setWeatherSummary] = useState('');
  const [durationDays, setDurationDays] = useState(4);
  const [travelersCount, setTravelersCount] = useState(2);
  const [tripType, setTripType] = useState('Friends Trip');
  const [season, setSeason] = useState('Winter / Dry Season');

  const [generating, setGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedItem[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [savingToTrip, setSavingToTrip] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedTrip) return;
    setDestination(`${selectedTrip.destination}, ${selectedTrip.country}`);
    setTravelersCount(selectedTrip.travelersCount || 1);
    setTripType(selectedTrip.tripType || 'Weekend Trip');

    if (selectedTrip.startDate && selectedTrip.endDate) {
      const start = new Date(selectedTrip.startDate).getTime();
      const end = new Date(selectedTrip.endDate).getTime();
      const days = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
      setDurationDays(Math.min(60, days));
    }

    // Fetch live weather summary when trip changes
    apiClient
      .get('/weather', { params: { destination: selectedTrip.destination } })
      .then((res) => {
        const w = res.data;
        if (w?.current) {
          setWeatherSummary(
            `${w.current.condition}, ${Math.round(w.current.temperature)}°C, humidity ${w.current.humidity}%`
          );
        }
      })
      .catch(() => {
        // Optional weather context
      });
  }, [selectedTrip]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim()) return;
    setGenerating(true);
    setErrorMessage(null);
    try {
      const res = await apiClient.post<{ items: SuggestedItem[] }>('/ai/packing-suggestions', {
        destination: destination.trim(),
        weatherSummary: weatherSummary.trim() || undefined,
        durationDays,
        travelersCount,
        tripType,
        season,
      });
      const items = res.data.items || [];
      setSuggestions(items);
      setSelectedIndices(new Set(items.map((_, idx) => idx)));
      showToast(`Generated ${items.length} tailored packing recommendations.`, 'success');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        (err instanceof Error ? err.message : 'Unable to generate AI packing suggestions.');
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setGenerating(false);
    }
  };

  const toggleIndex = (idx: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleAddSelectedToTrip = async () => {
    if (!selectedTrip) {
      showToast('Select or create a trip first to save items.', 'error');
      return;
    }
    const chosen = suggestions.filter((_, idx) => selectedIndices.has(idx));
    if (chosen.length === 0) {
      showToast('Select at least one suggested item to add.', 'info');
      return;
    }

    setSavingToTrip(true);
    try {
      for (const item of chosen) {
        await addPackingItem(selectedTrip, {
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          priority: item.priority,
          notes: item.notes,
          aiSuggested: true,
        });
      }
      showToast(
        `Added ${chosen.length} AI-recommended items to "${selectedTrip.tripName}" (marked unpacked).`,
        'success'
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save items.', 'error');
    } finally {
      setSavingToTrip(false);
    }
  };

  return (
    <WorkspaceLayout
      title="AI Smart Packing Assistant"
      subtitle="Generate climate-aware, trip-specific packing lists powered by Gemini and live destination weather."
      actions={
        selectedTrip && (
          <Link
            to={`/packing?trip=${selectedTrip.id}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium whitespace-nowrap"
          >
            Open Checklist
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleGenerate}
          className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4"
        >
          <div className="flex items-center gap-2 text-[#0B1D33]">
            <Sparkles className="h-5 w-5 text-[#0D7377]" />
            <h2 className="font-display text-base font-semibold">Trip Context</h2>
          </div>

          {trips.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Prefill & Save Into Trip
              </label>
              <select
                value={selectedTripId}
                onChange={(e) => setSelectedTripId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
              >
                <option value="">Custom destination only</option>
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.tripName} ({t.destination})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Destination</label>
            <input
              type="text"
              required
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g., Sajek Valley, Bangladesh or Kyoto, Japan"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1.5">
              <CloudSun className="h-3.5 w-3.5 text-[#0D7377]" />
              Expected Weather / Climate
            </label>
            <input
              type="text"
              value={weatherSummary}
              onChange={(e) => setWeatherSummary(e.target.value)}
              placeholder="e.g., Cool mornings 12°C, misty ridges, light breeze"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Duration (Days)
              </label>
              <input
                type="number"
                min={1}
                max={60}
                value={durationDays}
                onChange={(e) => setDurationDays(Math.max(1, Number(e.target.value) || 1))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Travelers</label>
              <input
                type="number"
                min={1}
                max={50}
                value={travelersCount}
                onChange={(e) => setTravelersCount(Math.max(1, Number(e.target.value) || 1))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Trip Type</label>
              <select
                value={tripType}
                onChange={(e) => setTripType(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
              >
                <option value="Solo Travel">Solo Travel</option>
                <option value="Family Trip">Family Trip</option>
                <option value="Friends Trip">Friends Trip</option>
                <option value="Couple Trip">Couple Trip</option>
                <option value="Business Trip">Business Trip</option>
                <option value="Adventure Trip">Adventure Trip</option>
                <option value="Educational Trip">Educational Trip</option>
                <option value="Weekend Trip">Weekend Trip</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Season</label>
              <select
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
              >
                <option value="Winter / Dry Season">Winter / Dry</option>
                <option value="Summer / Warm">Summer / Warm</option>
                <option value="Monsoon / Rainy">Monsoon / Rainy</option>
                <option value="Spring / Mild">Spring / Mild</option>
                <option value="Autumn / Crisp">Autumn / Crisp</option>
              </select>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={generating}
            className="w-full py-2.5 rounded-lg bg-[#0B1D33] hover:bg-slate-800 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating Recommendations...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Smart Packing List
              </>
            )}
          </button>
        </form>

        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="font-display text-base font-semibold text-[#0B1D33]">
                Recommended Packing Items
              </h2>
              <p className="text-xs text-slate-500">
                Review AI suggestions and add chosen items directly to your trip checklist (always added unpacked).
              </p>
            </div>
            {suggestions.length > 0 && selectedTrip && (
              <button
                type="button"
                onClick={handleAddSelectedToTrip}
                disabled={savingToTrip || selectedIndices.size === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0D7377] hover:bg-[#0F766E] text-white text-xs font-medium whitespace-nowrap disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                {savingToTrip
                  ? 'Adding...'
                  : `Add ${selectedIndices.size} to ${selectedTrip.tripName}`}
              </button>
            )}
          </div>

          {suggestions.length === 0 ? (
            <div className="py-14 text-center">
              <Sparkles className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-700">
                Ready to tailor your packing kit
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Enter your destination, weather notes, and trip length on the left to receive categorized recommendations.
              </p>
            </div>
          ) : (
            <div className="mt-4 divide-y divide-slate-100">
              {suggestions.map((item, idx) => {
                const isSelected = selectedIndices.has(idx);
                return (
                  <div
                    key={`${item.name}_${idx}`}
                    onClick={() => toggleIndex(idx)}
                    className="py-3 flex items-start gap-3 cursor-pointer hover:bg-slate-50/70 px-2 rounded-lg transition-colors"
                  >
                    <button
                      type="button"
                      className={`mt-0.5 h-5 w-5 rounded border flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-[#0D7377] border-[#0D7377] text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium text-slate-900">{item.name}</p>
                        <span className="font-mono text-xs text-slate-500 tabular-nums">
                          {item.category} · Qty {item.quantity} · {item.priority}
                        </span>
                      </div>
                      {item.notes && <p className="text-xs text-slate-600 mt-0.5">{item.notes}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </WorkspaceLayout>
  );
};
