import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Camera, Trash2, Plus, Upload } from 'lucide-react';
import { WorkspaceLayout } from '../components/Layout/WorkspaceLayout';
import { PrivateUploadImage } from '../components/Common/PrivateUploadImage';
import { useTripData } from '../contexts/TripDataContext';
import { useToast } from '../contexts/ToastContext';
import { apiClient } from '../services/api';
import { addJournalEntry, deleteJournalEntry } from '../services/firestoreService';

const MOODS = ['Inspired', 'Grateful', 'Adventurous', 'Relaxed', 'Nostalgic'];

export const JournalPage: React.FC = () => {
  const { trips, journalEntries } = useTripData();
  const { showToast } = useToast();

  const [tripScope, setTripScope] = useState<'all' | 'completed'>('all');
  const [selectedTripId, setSelectedTripId] = useState(trips[0]?.id || '');

  useEffect(() => {
    if (!selectedTripId && trips.length > 0) {
      setSelectedTripId(trips[0].id);
    }
  }, [trips, selectedTripId]);

  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [travelDate, setTravelDate] = useState(new Date().toISOString().slice(0, 10));
  const [mood, setMood] = useState('Inspired');
  const [content, setContent] = useState('');
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  const selectedTrip = useMemo(
    () => trips.find((t) => t.id === selectedTripId) || null,
    [trips, selectedTripId]
  );

  useEffect(() => {
    if (selectedTrip && !destination) {
      setDestination(`${selectedTrip.destination}, ${selectedTrip.country}`);
    }
  }, [selectedTrip, destination]);

  const visibleEntries = useMemo(() => {
    if (tripScope === 'completed') {
      const completedIds = new Set(trips.filter((t) => t.status === 'Completed').map((t) => t.id));
      return journalEntries.filter((e) => completedIds.has(e.tripId));
    }
    return journalEntries;
  }, [journalEntries, trips, tripScope]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrip || !title.trim() || !content.trim()) return;

    setSaving(true);
    try {
      const uploadedPhotoPaths: string[] = [];
      for (const file of photoFiles.slice(0, 4)) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('tripId', selectedTrip.id);
        fd.append('memberIds', selectedTrip.memberIds.join(','));
        const res = await apiClient.post<{ fileId: string }>('/uploads', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        uploadedPhotoPaths.push(`/api/uploads/${res.data.fileId}`);
      }

      await addJournalEntry(selectedTrip, {
        title: title.trim(),
        destination: destination.trim() || selectedTrip.destination,
        travelDate,
        mood,
        content: content.trim(),
        photos: uploadedPhotoPaths,
      });

      showToast('Travel memory saved to your journal.', 'success');
      setTitle('');
      setContent('');
      setPhotoFiles([]);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save journal entry.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <WorkspaceLayout
      title="Trip Journal & Memories"
      subtitle="Preserve stories, reflections, and travel photos across your completed and ongoing journeys."
    >
      {trips.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <BookOpen className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h2 className="font-display text-lg font-semibold text-slate-900">No trips recorded yet</h2>
          <p className="text-sm text-slate-500 mt-1 mb-5">
            Create a trip first to record travel memories and upload trip photos.
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Create Journal Entry */}
          <form
            onSubmit={handleSubmit}
            className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-3.5 lg:sticky lg:top-24"
          >
            <h2 className="font-display text-base font-semibold text-[#0B1D33]">
              Write Travel Memory
            </h2>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Trip</label>
              <select
                value={selectedTripId}
                onChange={(e) => {
                  setSelectedTripId(e.target.value);
                  const t = trips.find((tr) => tr.id === e.target.value);
                  if (t) setDestination(`${t.destination}, ${t.country}`);
                }}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
              >
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.tripName} ({t.status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Entry Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Golden hour over Marine Drive"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={travelDate}
                  onChange={(e) => setTravelDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Mood</label>
                <select
                  value={mood}
                  onChange={(e) => setMood(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                >
                  {MOODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Location</label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="City or landmark"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Story / Notes</label>
              <textarea
                rows={4}
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What stood out today? Favorite meal, hidden viewpoint, people you met..."
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Photos (Up to 4 PNG/JPG/WEBP)
              </label>
              <label className="flex items-center justify-center gap-2 px-3 py-3 border border-dashed border-slate-300 rounded-lg text-xs text-slate-600 hover:border-[#0D7377] cursor-pointer bg-slate-50/50">
                <Upload className="h-4 w-4 text-[#0D7377]" />
                <span>
                  {photoFiles.length > 0
                    ? `${photoFiles.length} photo${photoFiles.length === 1 ? '' : 's'} selected`
                    : 'Upload travel photos'}
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => setPhotoFiles(Array.from(e.target.files || []).slice(0, 4))}
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-lg bg-[#0D7377] hover:bg-[#0F766E] text-white text-sm font-medium transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving Memory...' : 'Save Journal Entry'}
            </button>
          </form>

          {/* Memories Gallery */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between">
              <span className="font-display text-sm font-semibold text-[#0B1D33]">
                Saved Memories ({visibleEntries.length})
              </span>
              <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
                <button
                  type="button"
                  onClick={() => setTripScope('all')}
                  className={`px-3 py-1 rounded-md font-medium ${
                    tripScope === 'all' ? 'bg-white text-[#0B1D33]' : 'text-slate-500'
                  }`}
                >
                  All Trips
                </button>
                <button
                  type="button"
                  onClick={() => setTripScope('completed')}
                  className={`px-3 py-1 rounded-md font-medium ${
                    tripScope === 'completed' ? 'bg-white text-[#0B1D33]' : 'text-slate-500'
                  }`}
                >
                  Completed Trips
                </button>
              </div>
            </div>

            {visibleEntries.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
                <Camera className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-800">No travel memories yet</p>
                <p className="text-xs text-slate-500 mt-1">
                  Capture highlights and upload photos from your journeys.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {visibleEntries.map((entry) => {
                  const parentTrip = trips.find((t) => t.id === entry.tripId);
                  return (
                    <article
                      key={entry.id}
                      className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="font-mono">{entry.travelDate}</span>
                            <span aria-hidden="true">·</span>
                            <span>{entry.destination || parentTrip?.destination}</span>
                            {entry.mood && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="text-[#0D7377] font-medium">{entry.mood}</span>
                              </>
                            )}
                          </div>
                          <h3 className="font-display text-lg font-semibold text-[#0B1D33] mt-1">
                            {entry.title}
                          </h3>
                          {parentTrip && (
                            <p className="text-xs text-slate-500">Trip: {parentTrip.tripName}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteJournalEntry(entry.id)}
                          className="p-1.5 text-slate-400 hover:text-red-700"
                          title="Delete memory"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {entry.content}
                      </p>

                      {entry.photos && entry.photos.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                          {entry.photos.map((photoSrc, idx) => (
                            <div
                              key={idx}
                              className="aspect-[4/3] rounded-lg overflow-hidden border border-slate-200"
                            >
                              <PrivateUploadImage
                                src={photoSrc}
                                alt={`${entry.title} photo ${idx + 1}`}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </WorkspaceLayout>
  );
};
