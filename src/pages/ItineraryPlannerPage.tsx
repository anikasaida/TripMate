import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  CalendarDays,
  Clock,
  List,
  Plus,
  Edit3,
  Trash2,
  ArrowUp,
  ArrowDown,
  MapPin,
  Train,
  Sparkles,
} from 'lucide-react';
import { WorkspaceLayout } from '../components/Layout/WorkspaceLayout';
import { useTripData } from '../contexts/TripDataContext';
import { useToast } from '../contexts/ToastContext';
import { addActivity, updateActivity, deleteActivity } from '../services/firestoreService';
import { Activity } from '../types';

type ViewMode = 'timeline' | 'calendar' | 'list';

export const ItineraryPlannerPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { trips, activities } = useTripData();
  const { showToast } = useToast();

  const activeTrips = useMemo(() => trips.filter((t) => !t.archived), [trips]);
  const [selectedTripId, setSelectedTripId] = useState(
    searchParams.get('trip') || activeTrips[0]?.id || ''
  );

  useEffect(() => {
    if (!selectedTripId && activeTrips.length > 0) {
      setSelectedTripId(activeTrips[0].id);
    }
  }, [activeTrips, selectedTripId]);

  const selectedTrip = useMemo(
    () => trips.find((t) => t.id === selectedTripId) || null,
    [trips, selectedTripId]
  );

  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:00');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [transportation, setTransportation] = useState('');
  const [notes, setNotes] = useState('');
  const [allowOutsideDates, setAllowOutsideDates] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (selectedTrip && !date) {
      setDate(selectedTrip.startDate || new Date().toISOString().slice(0, 10));
    }
  }, [selectedTrip, date]);

  const tripActivities = useMemo(
    () => activities.filter((a) => a.tripId === selectedTripId),
    [activities, selectedTripId]
  );

  const groupedByDate = useMemo(() => {
    const groups: Record<string, Activity[]> = {};
    tripActivities.forEach((act) => {
      if (!groups[act.date]) groups[act.date] = [];
      groups[act.date].push(act);
    });
    Object.values(groups).forEach((list) =>
      list.sort((a, b) => {
        const tc = (a.startTime || '').localeCompare(b.startTime || '');
        if (tc !== 0) return tc;
        return (a.orderIndex || 0) - (b.orderIndex || 0);
      })
    );
    return groups;
  }, [tripActivities]);

  const totalEstimatedActivityCost = useMemo(
    () => tripActivities.reduce((sum, a) => sum + (a.estimatedCost || 0), 0),
    [tripActivities]
  );

  const isDateOutsideTrip = useMemo(() => {
    if (!selectedTrip || !date) return false;
    if (selectedTrip.startDate && date < selectedTrip.startDate) return true;
    if (selectedTrip.endDate && date > selectedTrip.endDate) return true;
    return false;
  }, [selectedTrip, date]);

  const handleTripChange = (id: string) => {
    setSelectedTripId(id);
    setSearchParams(id ? { trip: id } : {});
    const t = trips.find((tr) => tr.id === id);
    if (t?.startDate) setDate(t.startDate);
  };

  const resetForm = () => {
    setEditingActivity(null);
    setTitle('');
    setLocation('');
    setDescription('');
    setEstimatedCost(0);
    setTransportation('');
    setNotes('');
    setStartTime('09:00');
    setEndTime('11:00');
    setAllowOutsideDates(false);
    if (selectedTrip?.startDate) setDate(selectedTrip.startDate);
  };

  const startEdit = (act: Activity) => {
    setEditingActivity(act);
    setDate(act.date);
    setStartTime(act.startTime);
    setEndTime(act.endTime);
    setTitle(act.title);
    setLocation(act.location || '');
    setDescription(act.description || '');
    setEstimatedCost(act.estimatedCost || 0);
    setTransportation(act.transportation || '');
    setNotes(act.notes || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrip || !title.trim() || !date) return;

    if (isDateOutsideTrip && !allowOutsideDates) {
      showToast(
        `Activity date (${date}) falls outside trip dates (${selectedTrip.startDate} to ${selectedTrip.endDate}). Confirm override to proceed.`,
        'error'
      );
      return;
    }

    if (endTime && startTime && endTime < startTime) {
      showToast('End time must be after start time.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (editingActivity) {
        await updateActivity(editingActivity.id, {
          date,
          startTime,
          endTime,
          title: title.trim(),
          location: location.trim(),
          description: description.trim(),
          estimatedCost,
          transportation: transportation.trim(),
          notes: notes.trim(),
        });
        showToast('Activity updated.', 'success');
      } else {
        await addActivity(selectedTrip, {
          date,
          startTime,
          endTime,
          title: title.trim(),
          location: location.trim(),
          description: description.trim(),
          estimatedCost,
          transportation: transportation.trim(),
          notes: notes.trim(),
          orderIndex: tripActivities.length,
        });
        showToast('Activity added to itinerary.', 'success');
      }
      resetForm();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save activity.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMoveOrder = async (dayList: Activity[], idx: number, direction: -1 | 1) => {
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= dayList.length) return;
    const current = dayList[idx];
    const swapWith = dayList[targetIdx];
    try {
      await Promise.all([
        updateActivity(current.id, { orderIndex: targetIdx }),
        updateActivity(swapWith.id, { orderIndex: idx }),
      ]);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to reorder activity.', 'error');
    }
  };

  const handleDelete = async (act: Activity) => {
    try {
      await deleteActivity(act.id);
      showToast(`Removed "${act.title}".`, 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete activity.', 'error');
    }
  };

  return (
    <WorkspaceLayout
      title="Daily Itinerary Planner"
      subtitle="Organize day-by-day activities, transit notes, and estimated costs across Timeline, Calendar, and List views."
      actions={
        <Link
          to="/ai-assistant"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0D7377] hover:bg-[#0F766E] text-white text-xs font-medium whitespace-nowrap"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Generate with AI
        </Link>
      }
    >
      {trips.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <CalendarDays className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h2 className="font-display text-lg font-semibold text-slate-900">No trips created yet</h2>
          <p className="text-sm text-slate-500 mt-1 mb-5">
            Plan a trip first to start scheduling daily activities and sights.
          </p>
          <Link
            to="/trips/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0D7377] text-white text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            Plan New Trip
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Trip Selector & View Toggle */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
              <select
                value={selectedTripId}
                onChange={(e) => handleTripChange(e.target.value)}
                className="px-3 py-2 text-sm font-medium border border-slate-200 rounded-lg bg-white text-[#0B1D33] max-w-sm w-full"
              >
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.tripName} ({t.startDate} to {t.endDate})
                  </option>
                ))}
              </select>
              <span className="font-mono text-xs text-slate-600 tabular-nums">
                {tripActivities.length} activities · Est. {totalEstimatedActivityCost.toLocaleString()}{' '}
                {selectedTrip?.currency || 'USD'}
              </span>
            </div>

            <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-50 self-start">
              <button
                type="button"
                onClick={() => setViewMode('timeline')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium ${
                  viewMode === 'timeline'
                    ? 'bg-white text-[#0B1D33] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                Timeline
              </button>
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium ${
                  viewMode === 'calendar'
                    ? 'bg-white text-[#0B1D33] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                Calendar
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium ${
                  viewMode === 'list'
                    ? 'bg-white text-[#0B1D33] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="h-3.5 w-3.5" />
                List
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Activity Form */}
            <form
              onSubmit={handleSubmit}
              className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-3.5 lg:sticky lg:top-24"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-semibold text-[#0B1D33]">
                  {editingActivity ? 'Edit Activity' : 'Add Activity'}
                </h2>
                {editingActivity && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-xs text-slate-500 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Activity Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Sunrise at Konglak Hill"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono"
                />
                {isDateOutsideTrip && (
                  <label className="mt-2 flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                    <input
                      type="checkbox"
                      checked={allowOutsideDates}
                      onChange={(e) => setAllowOutsideDates(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>
                      Outside trip window ({selectedTrip?.startDate} – {selectedTrip?.endDate}). Allow anyway.
                    </span>
                  </label>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Neighborhood, landmark, or address"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Est. Cost ({selectedTrip?.currency || 'USD'})
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={estimatedCost}
                    onChange={(e) => setEstimatedCost(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Transportation
                  </label>
                  <input
                    type="text"
                    value={transportation}
                    onChange={(e) => setTransportation(e.target.value)}
                    placeholder="Chander Gari, Metro..."
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What to see or book in advance..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ticket reminders, dress code..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-lg bg-[#0D7377] hover:bg-[#0F766E] text-white text-sm font-medium transition-colors disabled:opacity-60"
              >
                {submitting
                  ? 'Saving...'
                  : editingActivity
                  ? 'Update Activity'
                  : 'Add to Schedule'}
              </button>
            </form>

            {/* Right Schedule Display */}
            <div className="lg:col-span-8 space-y-5">
              {tripActivities.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
                  <CalendarDays className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <h3 className="font-display text-base font-semibold text-slate-900">
                    No activities scheduled for this trip
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Add your first activity using the form or ask AI Assistant to draft a multi-day schedule.
                  </p>
                </div>
              ) : viewMode === 'timeline' ? (
                Object.entries(groupedByDate).map(([dayDate, dayList], dayIdx) => (
                  <div
                    key={dayDate}
                    className="bg-white border border-slate-200 rounded-xl overflow-hidden"
                  >
                    <div className="px-5 py-3.5 bg-[#0B1D33] text-white flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-[#5EEAD4]">
                          DAY {dayIdx + 1}
                        </span>
                        <h3 className="font-display text-sm font-semibold">{dayDate}</h3>
                      </div>
                      <span className="font-mono text-xs text-slate-300 tabular-nums">
                        {dayList.length} {dayList.length === 1 ? 'activity' : 'activities'}
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {dayList.map((act, idx) => (
                        <div key={act.id} className="p-5 flex flex-col sm:flex-row gap-4">
                          <div className="sm:w-28 shrink-0 font-mono text-xs text-[#0D7377] font-semibold tabular-nums">
                            {act.startTime} – {act.endTime}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-display text-sm font-semibold text-slate-900">
                              {act.title}
                            </h4>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                              {act.location && (
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5" />
                                  {act.location}
                                </span>
                              )}
                              {act.transportation && (
                                <span className="inline-flex items-center gap-1">
                                  <Train className="h-3.5 w-3.5" />
                                  {act.transportation}
                                </span>
                              )}
                              <span className="font-mono tabular-nums">
                                Est. {act.estimatedCost.toLocaleString()} {selectedTrip?.currency || 'USD'}
                              </span>
                            </div>
                            {act.description && (
                              <p className="text-xs text-slate-600 mt-2">{act.description}</p>
                            )}
                            {act.notes && (
                              <p className="text-xs text-slate-500 mt-1 italic">Note: {act.notes}</p>
                            )}
                          </div>
                          <div className="flex sm:flex-col items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleMoveOrder(dayList, idx, -1)}
                              disabled={idx === 0}
                              className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30"
                              title="Move up"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveOrder(dayList, idx, 1)}
                              disabled={idx === dayList.length - 1}
                              className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30"
                              title="Move down"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => startEdit(act)}
                              className="p-1 text-slate-400 hover:text-[#0B1D33]"
                              title="Edit"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(act)}
                              className="p-1 text-slate-400 hover:text-red-700"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : viewMode === 'calendar' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(groupedByDate).map(([dayDate, dayList], idx) => (
                    <div
                      key={dayDate}
                      className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col"
                    >
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                        <span className="font-display text-sm font-semibold text-[#0B1D33]">
                          Day {idx + 1} · {dayDate}
                        </span>
                        <span className="font-mono text-xs text-slate-500 tabular-nums">
                          {dayList.length} items
                        </span>
                      </div>
                      <div className="space-y-2.5 flex-1">
                        {dayList.map((act) => (
                          <div
                            key={act.id}
                            className="p-3 rounded-lg bg-[#F8FAFC] border border-slate-200 flex items-start justify-between gap-2"
                          >
                            <div>
                              <p className="font-mono text-[11px] text-[#0D7377] font-semibold">
                                {act.startTime} – {act.endTime}
                              </p>
                              <p className="text-sm font-medium text-slate-900 mt-0.5">{act.title}</p>
                              {act.location && (
                                <p className="text-xs text-slate-500">{act.location}</p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => startEdit(act)}
                              className="p-1 text-slate-400 hover:text-[#0B1D33]"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                        <th className="py-3 px-4">Date & Time</th>
                        <th className="py-3 px-4">Activity</th>
                        <th className="py-3 px-4">Location</th>
                        <th className="py-3 px-4 text-right">Est. Cost</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tripActivities.map((act) => (
                        <tr key={act.id} className="hover:bg-slate-50/60">
                          <td className="py-3 px-4 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                            {act.date} · {act.startTime}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-900">{act.title}</td>
                          <td className="py-3 px-4 text-slate-600 text-xs">{act.location || '—'}</td>
                          <td className="py-3 px-4 text-right font-mono text-xs tabular-nums">
                            {act.estimatedCost.toLocaleString()} {selectedTrip?.currency || 'USD'}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => startEdit(act)}
                              className="p-1 text-slate-400 hover:text-[#0B1D33] mr-1"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(act)}
                              className="p-1 text-slate-400 hover:text-red-700"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </WorkspaceLayout>
  );
};
