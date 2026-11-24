import React, { useState, useMemo } from 'react';
import {
  Send,
  Sparkles,
  CalendarPlus,
  Loader2,
  Check,
  X,
  RotateCcw,
} from 'lucide-react';
import { WorkspaceLayout } from '../components/Layout/WorkspaceLayout';
import { useTripData } from '../contexts/TripDataContext';
import { useToast } from '../contexts/ToastContext';
import { apiClient } from '../services/api';
import { addActivity } from '../services/firestoreService';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
  retryPrompt?: string;
}

interface GeneratedItineraryItem {
  dayOffset: number;
  startTime: string;
  endTime: string;
  title: string;
  location: string;
  description: string;
  estimatedCost: number;
  transportation: string;
}

const STARTER_PROMPTS = [
  'Suggest a 3-day cultural & coastal itinerary for Cox’s Bazar with local food stops.',
  'What are the best scenic routes and transit tips for Sajek Valley?',
  'Estimate a realistic daily budget for 4 days in Kyoto for two travelers.',
  'Recommend must-pack gear for a monsoon weekend getaway.',
];

export const AiAssistantPage: React.FC = () => {
  const { trips } = useTripData();
  const { showToast } = useToast();

  const [selectedTripId, setSelectedTripId] = useState(trips[0]?.id || '');
  const selectedTrip = useMemo(
    () => trips.find((t) => t.id === selectedTripId) || null,
    [trips, selectedTripId]
  );

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      text: 'Welcome to TripMate AI Travel Assistant. Ask about destinations, local transit, packing tips, or budget planning—or click "Draft & Save Trip Itinerary" to build a day-by-day schedule directly into your trip.',
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  // Itinerary generator drawer
  const [showGenerator, setShowGenerator] = useState(false);
  const [genDays, setGenDays] = useState(3);
  const [genPrefs, setGenPrefs] = useState('');
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [draftActivities, setDraftActivities] = useState<GeneratedItineraryItem[]>([]);
  const [savingPlan, setSavingPlan] = useState(false);

  const sendMessage = async (promptText: string, isRetry = false) => {
    const trimmed = promptText.trim();
    if (!trimmed || sending) return;

    const cleanHistory = messages
      .filter((m) => !m.isError)
      .slice(-8)
      .map((m) => ({ role: m.role, text: m.text }));

    if (isRetry) {
      setMessages((prev) => prev.filter((m) => !m.isError));
    } else {
      setMessages((prev) => [...prev, { role: 'user' as const, text: trimmed }]);
      setInput('');
    }
    setSending(true);

    try {
      const res = await apiClient.post<{ reply: string }>('/ai/chat', {
        message: trimmed,
        history: cleanHistory,
        tripContext: selectedTrip
          ? {
              tripName: selectedTrip.tripName,
              destination: selectedTrip.destination,
              country: selectedTrip.country,
              startDate: selectedTrip.startDate,
              endDate: selectedTrip.endDate,
              travelersCount: selectedTrip.travelersCount,
              tripType: selectedTrip.tripType,
              estimatedBudget: selectedTrip.estimatedBudget,
              currency: selectedTrip.currency,
            }
          : undefined,
      });

      setMessages((prev) => [...prev, { role: 'model', text: res.data.reply }]);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        (err instanceof Error ? err.message : 'Unable to reach AI Travel Assistant.');
      showToast(msg, 'error');
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          text: msg,
          isError: true,
          retryPrompt: trimmed,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleGenerateItinerary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrip) {
      showToast('Select a trip first to draft an itinerary.', 'error');
      return;
    }

    setGeneratingPlan(true);
    try {
      const res = await apiClient.post<{ activities: GeneratedItineraryItem[] }>(
        '/ai/generate-itinerary',
        {
          destination: selectedTrip.destination,
          country: selectedTrip.country,
          durationDays: genDays,
          travelersCount: selectedTrip.travelersCount,
          tripType: selectedTrip.tripType,
          budget: selectedTrip.estimatedBudget,
          currency: selectedTrip.currency,
          preferences: genPrefs.trim() || undefined,
        }
      );
      setDraftActivities(res.data.activities || []);
      showToast(`Drafted ${res.data.activities?.length || 0} itinerary activities.`, 'success');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        (err instanceof Error ? err.message : 'Itinerary generation failed.');
      showToast(msg, 'error');
    } finally {
      setGeneratingPlan(false);
    }
  };

  const handleSaveDraftToTrip = async () => {
    if (!selectedTrip || draftActivities.length === 0) return;
    setSavingPlan(true);
    try {
      const baseDate = selectedTrip.startDate
        ? new Date(selectedTrip.startDate)
        : new Date();

      for (let i = 0; i < draftActivities.length; i++) {
        const act = draftActivities[i];
        const actDate = new Date(baseDate.getTime());
        actDate.setDate(actDate.getDate() + (act.dayOffset || 0));
        const isoDate = actDate.toISOString().slice(0, 10);

        await addActivity(selectedTrip, {
          date: isoDate,
          startTime: act.startTime,
          endTime: act.endTime,
          title: act.title,
          location: act.location,
          description: act.description,
          estimatedCost: act.estimatedCost,
          transportation: act.transportation,
          notes: 'Generated by TripMate AI',
          orderIndex: i,
        });
      }

      showToast(
        `Saved ${draftActivities.length} activities into "${selectedTrip.tripName}".`,
        'success'
      );
      setShowGenerator(false);
      setDraftActivities([]);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save itinerary.', 'error');
    } finally {
      setSavingPlan(false);
    }
  };

  return (
    <WorkspaceLayout
      title="AI Travel Assistant"
      subtitle="Conversational trip planning, local recommendations, and structured multi-day itinerary generation."
      actions={
        selectedTrip && (
          <button
            type="button"
            onClick={() => setShowGenerator(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0D7377] hover:bg-[#0F766E] text-white text-xs font-medium whitespace-nowrap"
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            Draft & Save Trip Itinerary
          </button>
        )
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Sidebar Context & Suggested Prompts */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <h2 className="font-display text-sm font-semibold text-[#0B1D33]">
              Active Trip Context
            </h2>
            <select
              value={selectedTripId}
              onChange={(e) => setSelectedTripId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
            >
              <option value="">General Travel Mode (No Trip)</option>
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.tripName} ({t.destination})
                </option>
              ))}
            </select>
            {selectedTrip && (
              <div className="p-3 rounded-lg bg-[#F8FAFC] border border-slate-200 text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-900">
                  {selectedTrip.destination}, {selectedTrip.country}
                </p>
                <p className="font-mono tabular-nums">
                  {selectedTrip.startDate} to {selectedTrip.endDate}
                </p>
                <p>
                  {selectedTrip.tripType} · {selectedTrip.travelersCount} travelers ·{' '}
                  {selectedTrip.estimatedBudget.toLocaleString()} {selectedTrip.currency}
                </p>
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2.5">
            <h3 className="font-display text-sm font-semibold text-[#0B1D33]">
              Suggested Questions
            </h3>
            {STARTER_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => sendMessage(prompt)}
                className="w-full text-left p-2.5 rounded-lg border border-slate-200 hover:border-[#0D7377] hover:bg-slate-50 text-xs text-slate-700 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Workspace */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl flex flex-col h-[620px] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center gap-2 bg-[#0B1D33] text-white">
            <Sparkles className="h-4 w-4 text-[#5EEAD4]" />
            <span className="font-display text-sm font-semibold">TripMate Travel Concierge</span>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-[#0D7377] text-white'
                      : msg.isError
                      ? 'bg-amber-50 border border-amber-200 text-amber-950'
                      : 'bg-[#F8FAFC] border border-slate-200 text-slate-800'
                  }`}
                >
                  <p>{msg.text}</p>
                  {msg.isError && msg.retryPrompt && (
                    <button
                      type="button"
                      onClick={() => sendMessage(msg.retryPrompt!, true)}
                      disabled={sending}
                      className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B1D33] text-white text-xs font-medium hover:bg-slate-800 disabled:opacity-50"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Retry Request
                    </button>
                  )}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-500 flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#0D7377]" />
                  Thinking through recommendations...
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="p-4 border-t border-slate-200 bg-slate-50/70 flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about attractions, food, routes, packing, or budgets..."
              className="flex-1 px-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="px-4 py-2.5 rounded-lg bg-[#0B1D33] hover:bg-slate-800 text-white text-sm font-medium inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              Send
            </button>
          </form>
        </div>
      </div>

      {/* Generate & Save Itinerary Modal */}
      {showGenerator && selectedTrip && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-semibold text-[#0B1D33]">
                  Draft Itinerary for {selectedTrip.tripName}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedTrip.destination}, {selectedTrip.country}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGenerator(false)}
                className="text-slate-400 hover:text-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <form onSubmit={handleGenerateItinerary} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Number of Days
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={genDays}
                      onChange={(e) => setGenDays(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono tabular-nums"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Interests / Pace Preferences
                    </label>
                    <input
                      type="text"
                      value={genPrefs}
                      onChange={(e) => setGenPrefs(e.target.value)}
                      placeholder="e.g., Relaxed mornings, local street food, scenic sunset spots"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={generatingPlan}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0B1D33] text-white text-xs font-medium disabled:opacity-60"
                >
                  {generatingPlan ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Drafting Schedule...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      Generate Draft Activities
                    </>
                  )}
                </button>
              </form>

              {draftActivities.length > 0 && (
                <div className="space-y-2.5 pt-2 border-t border-slate-100">
                  {draftActivities.map((act, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-lg border border-slate-200 bg-[#F8FAFC] flex items-start justify-between gap-3"
                    >
                      <div>
                        <p className="font-mono text-xs text-[#0D7377] font-semibold">
                          Day {act.dayOffset + 1} · {act.startTime} – {act.endTime}
                        </p>
                        <p className="text-sm font-semibold text-slate-900 mt-0.5">{act.title}</p>
                        <p className="text-xs text-slate-600">{act.location} · {act.transportation}</p>
                        <p className="text-xs text-slate-500 mt-1">{act.description}</p>
                      </div>
                      <span className="font-mono text-xs text-slate-700 tabular-nums shrink-0">
                        ~{act.estimatedCost} {selectedTrip.currency}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {draftActivities.length > 0 && (
              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowGenerator(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveDraftToTrip}
                  disabled={savingPlan}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0D7377] text-white text-xs font-medium disabled:opacity-60"
                >
                  <Check className="h-3.5 w-3.5" />
                  {savingPlan ? 'Saving to Trip...' : `Save All ${draftActivities.length} Activities`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </WorkspaceLayout>
  );
};
