import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save } from 'lucide-react';
import { WorkspaceLayout } from '../components/Layout/WorkspaceLayout';
import { useAuth } from '../contexts/AuthContext';
import { useTripData } from '../contexts/TripDataContext';
import { useToast } from '../contexts/ToastContext';
import { COVER_IMAGES, resolveDestinationImage } from '../data/destinationsSeed';
import { computeTripStatus, createTrip, updateTrip } from '../services/firestoreService';
import { CurrencyCode, TripType } from '../types';

interface TripFormValues {
  tripName: string;
  destination: string;
  country: string;
  startDate: string;
  endDate: string;
  travelersCount: number;
  tripType: TripType;
  estimatedBudget: number;
  currency: CurrencyCode;
  description: string;
  coverImage: string;
  seedDefaultPacking: boolean;
}

export const CreateTripPage: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const [searchParams] = useSearchParams();
  const isEditing = Boolean(tripId);
  const { firebaseUser, profile } = useAuth();
  const { trips } = useTripData();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const existingTrip = trips.find((t) => t.id === tripId);

  const today = new Date().toISOString().slice(0, 10);
  const nextWeek = new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10);

  const [manualCoverPicked, setManualCoverPicked] = useState(isEditing);
  const initialDest = searchParams.get('destination') || '';
  const initialCover =
    searchParams.get('coverImage') || resolveDestinationImage(initialDest, COVER_IMAGES[0].url);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TripFormValues>({
    defaultValues: {
      tripName: initialDest ? `Trip to ${initialDest}` : '',
      destination: initialDest,
      country: searchParams.get('country') || '',
      startDate: today,
      endDate: nextWeek,
      travelersCount: 2,
      tripType: 'Friends Trip',
      estimatedBudget: 1000,
      currency: profile?.currency || 'USD',
      description: '',
      coverImage: initialCover,
      seedDefaultPacking: true,
    },
  });

  const selectedCover = watch('coverImage');
  const watchedDestination = watch('destination');

  useEffect(() => {
    if (!isEditing && !manualCoverPicked && watchedDestination) {
      const matched = resolveDestinationImage(watchedDestination);
      if (matched !== selectedCover) {
        setValue('coverImage', matched);
      }
    }
  }, [watchedDestination, isEditing, manualCoverPicked, selectedCover, setValue]);

  useEffect(() => {
    if (isEditing && existingTrip) {
      setValue('tripName', existingTrip.tripName);
      setValue('destination', existingTrip.destination);
      setValue('country', existingTrip.country);
      setValue('startDate', existingTrip.startDate);
      setValue('endDate', existingTrip.endDate);
      setValue('travelersCount', existingTrip.travelersCount);
      setValue('tripType', existingTrip.tripType);
      setValue('estimatedBudget', existingTrip.estimatedBudget);
      setValue('currency', existingTrip.currency);
      setValue('description', existingTrip.description || '');
      setValue('coverImage', resolveDestinationImage(existingTrip.destination, existingTrip.coverImage));
    }
  }, [isEditing, existingTrip, setValue]);

  const onSubmit = async (data: TripFormValues) => {
    if (!firebaseUser) return;
    if (data.endDate < data.startDate) {
      showToast('End date cannot be earlier than start date.', 'error');
      return;
    }

    setSaving(true);
    try {
      if (isEditing && existingTrip) {
        await updateTrip(existingTrip.id, {
          ...data,
          status: computeTripStatus(data.startDate, data.endDate),
        });
        showToast('Trip details updated.', 'success');
        navigate(`/trips/${existingTrip.id}`);
      } else {
        const newId = await createTrip(
          firebaseUser.uid,
          profile?.displayName || firebaseUser.displayName || 'Traveler',
          firebaseUser.email || '',
          {
            ...data,
            lat: searchParams.get('lat') ? Number(searchParams.get('lat')) : undefined,
            lng: searchParams.get('lng') ? Number(searchParams.get('lng')) : undefined,
          }
        );
        showToast('Trip created with default smart packing checklist.', 'success');
        navigate(`/trips/${newId}`);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save trip.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <WorkspaceLayout
      title={isEditing ? 'Edit Trip' : 'Create New Trip'}
      subtitle={
        isEditing
          ? 'Update your journey dates, budget target, and trip overview.'
          : 'Set up your destination, schedule, budget, and starter packing checklist.'
      }
      actions={
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
      }
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="max-w-3xl bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Trip Name *</label>
            <input
              type="text"
              {...register('tripName', { required: 'Trip name is required', maxLength: 140 })}
              placeholder="Winter Escape to Cox's Bazar"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30"
            />
            {errors.tripName && (
              <p className="text-xs text-red-600 mt-1">{errors.tripName.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Destination City / Area *
            </label>
            <input
              type="text"
              {...register('destination', { required: 'Destination is required' })}
              placeholder="Cox's Bazar"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30"
            />
            {errors.destination && (
              <p className="text-xs text-red-600 mt-1">{errors.destination.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Country *</label>
            <input
              type="text"
              {...register('country', { required: 'Country is required' })}
              placeholder="Bangladesh"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30"
            />
            {errors.country && (
              <p className="text-xs text-red-600 mt-1">{errors.country.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Start Date *</label>
            <input
              type="date"
              {...register('startDate', { required: 'Start date is required' })}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">End Date *</label>
            <input
              type="date"
              {...register('endDate', { required: 'End date is required' })}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Number of Travelers *
            </label>
            <input
              type="number"
              min={1}
              max={100}
              {...register('travelersCount', { required: true, min: 1, valueAsNumber: true })}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Trip Type *</label>
            <select
              {...register('tripType')}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white"
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
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Estimated Budget *
            </label>
            <input
              type="number"
              min={0}
              step="any"
              {...register('estimatedBudget', { required: true, min: 0, valueAsNumber: true })}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Currency *</label>
            <select
              {...register('currency')}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white"
            >
              <option value="USD">USD ($)</option>
              <option value="BDT">BDT (৳)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="AUD">AUD</option>
              <option value="CAD">CAD</option>
              <option value="JPY">JPY</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            Trip Description &amp; Goals
          </label>
          <textarea
            rows={3}
            {...register('description')}
            placeholder="Outline key priorities, travel pace, or group notes..."
            className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-2">Cover Image</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {COVER_IMAGES.map((img) => (
              <button
                key={img.url}
                type="button"
                onClick={() => {
                  setManualCoverPicked(true);
                  setValue('coverImage', img.url);
                }}
                className={`relative rounded-lg overflow-hidden border-2 text-left transition-all ${
                  selectedCover === img.url
                    ? 'border-[#0D7377] ring-2 ring-[#0D7377]/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <img
                  src={img.url}
                  alt={img.label}
                  referrerPolicy="no-referrer"
                  className="h-20 w-full object-cover"
                />
                <span className="block px-2 py-1 text-[11px] font-medium text-slate-700 bg-white truncate">
                  {img.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {!isEditing && (
          <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              {...register('seedDefaultPacking')}
              className="rounded border-slate-300 text-[#0D7377] focus:ring-[#0D7377]"
            />
            <span>
              Initialize with 36 default travel essentials (Clothing, Personal Care, Travel
              Essentials, Health &amp; Safety, Electronics)
            </span>
          </label>
        )}

        <div className="pt-2 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0D7377] hover:bg-[#0F766E] text-white text-sm font-medium transition-colors disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Trip'}
          </button>
        </div>
      </form>
    </WorkspaceLayout>
  );
};
