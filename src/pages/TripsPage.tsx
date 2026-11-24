import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Copy,
  Archive,
  ArchiveRestore,
  Trash2,
  Edit3,
  Luggage,
  Users,
} from 'lucide-react';
import { WorkspaceLayout } from '../components/Layout/WorkspaceLayout';
import { useAuth } from '../contexts/AuthContext';
import { useTripData } from '../contexts/TripDataContext';
import { useToast } from '../contexts/ToastContext';
import { ImageWithFallback } from '../components/Common/ImageWithFallback';
import { resolveDestinationImage } from '../data/destinationsSeed';
import { deleteTrip, duplicateTrip, updateTrip } from '../services/firestoreService';
import { Trip, TripStatus, TripType } from '../types';

export const TripsPage: React.FC = () => {
  const { firebaseUser, profile } = useAuth();
  const { trips, packingItems } = useTripData();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | TripStatus>('All');
  const [typeFilter, setTypeFilter] = useState<'All' | TripType>('All');
  const [sortBy, setSortBy] = useState<'date' | 'budget' | 'name'>('date');
  const [showArchived, setShowArchived] = useState(false);

  const filteredTrips = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return trips
      .filter((t) => (showArchived ? t.archived : !t.archived))
      .filter((t) => (statusFilter === 'All' ? true : t.status === statusFilter))
      .filter((t) => (typeFilter === 'All' ? true : t.tripType === typeFilter))
      .filter(
        (t) =>
          !q ||
          t.tripName.toLowerCase().includes(q) ||
          t.destination.toLowerCase().includes(q) ||
          t.country.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        if (sortBy === 'budget') return (b.estimatedBudget || 0) - (a.estimatedBudget || 0);
        if (sortBy === 'name') return a.tripName.localeCompare(b.tripName);
        return (a.startDate || '').localeCompare(b.startDate || '');
      });
  }, [trips, showArchived, statusFilter, typeFilter, searchQuery, sortBy]);

  const handleDuplicate = async (trip: Trip) => {
    if (!firebaseUser) return;
    try {
      const newId = await duplicateTrip(
        firebaseUser.uid,
        profile?.displayName || 'Traveler',
        firebaseUser.email || '',
        trip
      );
      showToast(`Duplicated "${trip.tripName}" with its packing checklist.`, 'success');
      navigate(`/trips/${newId}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to duplicate trip.', 'error');
    }
  };

  const handleArchiveToggle = async (trip: Trip) => {
    try {
      await updateTrip(trip.id, { archived: !trip.archived });
      showToast(trip.archived ? 'Trip restored from archive.' : 'Trip archived.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update trip.', 'error');
    }
  };

  const handleDelete = async (trip: Trip) => {
    try {
      await deleteTrip(trip.id);
      showToast(`Deleted "${trip.tripName}".`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete trip.', 'error');
    }
  };

  return (
    <WorkspaceLayout
      title="My Trips"
      subtitle="Search, filter, organize, and duplicate your upcoming, ongoing, and completed journeys."
      actions={
        <Link
          to="/trips/new"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0D7377] hover:bg-[#0F766E] text-white text-xs font-medium transition-colors whitespace-nowrap"
        >
          <Plus className="h-3.5 w-3.5" />
          Create Trip
        </Link>
      }
    >
      {/* Filters Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        <div className="md:col-span-4 relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by trip name, city, or country..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30"
          />
        </div>

        <div className="md:col-span-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'All' | TripStatus)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
          >
            <option value="All">All Statuses</option>
            <option value="Upcoming">Upcoming</option>
            <option value="Ongoing">Ongoing</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'All' | TripType)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
          >
            <option value="All">All Trip Types</option>
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

        <div className="md:col-span-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'budget' | 'name')}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
          >
            <option value="date">Sort by Start Date</option>
            <option value="budget">Sort by Budget</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>

        <div className="md:col-span-2 flex justify-end">
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className={`w-full px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
              showArchived
                ? 'bg-[#0B1D33] text-white border-[#0B1D33]'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {showArchived ? 'Viewing Archived' : 'Show Archived'}
          </button>
        </div>
      </div>

      {/* Trip Cards Grid */}
      {filteredTrips.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <Luggage className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h2 className="font-display text-lg font-semibold text-slate-900">
            {showArchived ? 'No archived trips' : 'No matching trips found'}
          </h2>
          <p className="text-sm text-slate-500 mt-1 mb-5">
            {trips.length === 0
              ? 'Create your first trip to organize packing lists, schedules, and expenses.'
              : 'Adjust your search or status filter, or create a new trip.'}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTrips.map((trip) => {
            const tItems = packingItems.filter((i) => i.tripId === trip.id);
            const tPacked = tItems.filter((i) => i.isPacked).length;
            const pct = tItems.length ? Math.round((tPacked / tItems.length) * 100) : 0;
            const isOwner = firebaseUser?.uid === trip.ownerId;

            return (
              <div
                key={trip.id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <Link to={`/trips/${trip.id}`} className="block aspect-[16/9] bg-slate-100">
                    <ImageWithFallback
                      src={resolveDestinationImage(trip.destination, trip.coverImage)}
                      alt={trip.tripName}
                      title={trip.destination}
                    />
                  </Link>
                  <div className="p-5">
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5">
                      <span>{trip.status}</span>
                      <span aria-hidden="true">·</span>
                      <span>{trip.tripType}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{trip.travelersCount} travelers</span>
                    </div>

                    <Link to={`/trips/${trip.id}`}>
                      <h3 className="font-display text-lg font-semibold text-[#0B1D33] hover:text-[#0D7377] transition-colors truncate">
                        {trip.tripName}
                      </h3>
                    </Link>

                    <p className="text-xs text-slate-600 mt-1">
                      {trip.destination}, {trip.country}
                    </p>
                    <p className="font-mono text-xs text-slate-500 tabular-nums mt-1">
                      {trip.startDate} to {trip.endDate}
                    </p>

                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                        <span>Packing Progress</span>
                        <span className="font-mono tabular-nums">
                          {pct}% ({tPacked}/{tItems.length})
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#0D7377] rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="text-xs">
                    <span className="font-mono font-semibold text-slate-900 tabular-nums">
                      {Number(trip.estimatedBudget).toLocaleString()} {trip.currency}
                    </span>
                    {trip.memberIds.length > 1 && (
                      <span className="ml-2 inline-flex items-center gap-1 text-slate-500">
                        <Users className="h-3 w-3" /> {trip.memberIds.length}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {isOwner && (
                      <Link
                        to={`/trips/${trip.id}/edit`}
                        className="p-1.5 text-slate-500 hover:text-[#0B1D33] rounded-md hover:bg-white"
                        title="Edit Trip"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDuplicate(trip)}
                      className="p-1.5 text-slate-500 hover:text-[#0D7377] rounded-md hover:bg-white"
                      title="Duplicate Trip"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    {isOwner && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleArchiveToggle(trip)}
                          className="p-1.5 text-slate-500 hover:text-amber-700 rounded-md hover:bg-white"
                          title={trip.archived ? 'Restore Trip' : 'Archive Trip'}
                        >
                          {trip.archived ? (
                            <ArchiveRestore className="h-4 w-4" />
                          ) : (
                            <Archive className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(trip)}
                          className="p-1.5 text-slate-500 hover:text-red-700 rounded-md hover:bg-white"
                          title="Delete Trip"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </WorkspaceLayout>
  );
};
