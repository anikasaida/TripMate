import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  Heart,
  Plus,
  MapPin,
  X,
  CalendarPlus,
  Flag,
} from 'lucide-react';
import { WorkspaceLayout } from '../components/Layout/WorkspaceLayout';
import { useAuth } from '../contexts/AuthContext';
import { useTripData } from '../contexts/TripDataContext';
import { useToast } from '../contexts/ToastContext';
import { ImageWithFallback } from '../components/Common/ImageWithFallback';
import { DestinationMap } from '../components/Maps/DestinationMap';
import { COVER_IMAGES } from '../data/destinationsSeed';
import {
  addActivity,
  addDestination,
  removeSavedDestination,
  saveDestinationToWishlist,
  submitContentReport,
} from '../services/firestoreService';
import { Destination, DestinationCategory } from '../types';

const CATEGORIES: Array<'All' | DestinationCategory> = [
  'All',
  'Beaches',
  'Mountains',
  'Nature',
  'Historical Places',
  'Adventure',
  'Shopping',
  'Restaurants',
  'Cultural Attractions',
  'Museums',
  'Parks',
];

export const DestinationsPage: React.FC<{ publicView?: boolean }> = ({ publicView = false }) => {
  const { firebaseUser } = useAuth();
  const { destinations, savedDestinations, trips } = useTripData();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [queryText, setQueryText] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState<'All' | DestinationCategory>(
    (searchParams.get('category') as DestinationCategory) || 'All'
  );
  const [countryFilter, setCountryFilter] = useState('All');
  const [onlySaved, setOnlySaved] = useState(false);
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addToTripTarget, setAddToTripTarget] = useState<Destination | null>(null);
  const [selectedTripId, setSelectedTripId] = useState('');

  // Custom destination form state
  const [newName, setNewName] = useState('');
  const [newCountry, setNewCountry] = useState('');
  const [newCat, setNewCat] = useState<DestinationCategory>('Nature');
  const [newDesc, setNewDesc] = useState('');
  const [newSeason, setNewSeason] = useState('');
  const [newLat, setNewLat] = useState('');
  const [newLng, setNewLng] = useState('');
  const [newImg, setNewImg] = useState(COVER_IMAGES[0].url);

  const countries = useMemo(() => {
    const set = new Set(destinations.map((d) => d.country));
    return ['All', ...Array.from(set).sort()];
  }, [destinations]);

  const savedIds = useMemo(
    () => new Set(savedDestinations.map((s) => s.destinationId)),
    [savedDestinations]
  );

  const filtered = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    return destinations.filter((d) => {
      if (category !== 'All' && d.category !== category) return false;
      if (countryFilter !== 'All' && d.country !== countryFilter) return false;
      if (onlySaved && !savedIds.has(d.id)) return false;
      if (
        q &&
        !d.name.toLowerCase().includes(q) &&
        !d.country.toLowerCase().includes(q) &&
        !d.description.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [destinations, category, countryFilter, onlySaved, savedIds, queryText]);

  const mapPoints = filtered
    .filter((d) => typeof d.lat === 'number' && typeof d.lng === 'number')
    .map((d) => ({
      id: d.id,
      title: d.name,
      subtitle: `${d.country} · ${d.category}`,
      lat: d.lat as number,
      lng: d.lng as number,
    }));

  const handleToggleWishlist = async (dest: Destination) => {
    if (!firebaseUser) {
      navigate('/login');
      return;
    }
    const existing = savedDestinations.find((s) => s.destinationId === dest.id);
    try {
      if (existing) {
        await removeSavedDestination(existing.id);
        showToast(`Removed ${dest.name} from wishlist.`, 'info');
      } else {
        await saveDestinationToWishlist(firebaseUser.uid, dest);
        showToast(`Saved ${dest.name} to your wishlist.`, 'success');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update wishlist.', 'error');
    }
  };

  const handleAddCustomDestination = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) {
      navigate('/login');
      return;
    }
    if (!newName.trim() || !newCountry.trim() || !newDesc.trim()) {
      showToast('Please fill in name, country, and description.', 'error');
      return;
    }
    try {
      await addDestination(firebaseUser.uid, {
        name: newName,
        country: newCountry,
        category: newCat,
        description: newDesc,
        bestSeason: newSeason || 'Year-round',
        imageUrl: newImg,
        lat: newLat ? Number(newLat) : undefined,
        lng: newLng ? Number(newLng) : undefined,
        highlights: [],
        isSampleData: false,
      });
      showToast(`${newName} added to Destination Explorer.`, 'success');
      setShowAddModal(false);
      setNewName('');
      setNewCountry('');
      setNewDesc('');
      setNewSeason('');
      setNewLat('');
      setNewLng('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save destination.', 'error');
    }
  };

  const handleConfirmAddToTrip = async () => {
    if (!addToTripTarget) return;
    if (!firebaseUser) {
      navigate('/login');
      return;
    }
    if (!selectedTripId) {
      const params = new URLSearchParams({
        destination: addToTripTarget.name,
        country: addToTripTarget.country,
      });
      if (addToTripTarget.imageUrl) params.set('coverImage', addToTripTarget.imageUrl);
      if (typeof addToTripTarget.lat === 'number') params.set('lat', String(addToTripTarget.lat));
      if (typeof addToTripTarget.lng === 'number') params.set('lng', String(addToTripTarget.lng));
      navigate(`/trips/new?${params.toString()}`);
      return;
    }
    const trip = trips.find((t) => t.id === selectedTripId);
    if (!trip) return;
    try {
      await addActivity(trip, {
        date: trip.startDate,
        startTime: '10:00',
        endTime: '12:30',
        title: `Visit ${addToTripTarget.name}`,
        location: `${addToTripTarget.name}, ${addToTripTarget.country}`,
        description: addToTripTarget.description,
        estimatedCost: 0,
        transportation: 'Local transit',
        notes: addToTripTarget.bestSeason ? `Best season: ${addToTripTarget.bestSeason}` : '',
        orderIndex: 1,
      });
      showToast(`Added "${addToTripTarget.name}" to ${trip.tripName} itinerary.`, 'success');
      setAddToTripTarget(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add to trip.', 'error');
    }
  };

  const handleReport = async (dest: Destination) => {
    if (!firebaseUser) return;
    try {
      await submitContentReport(
        firebaseUser.uid,
        'destination',
        dest.id,
        `Flagged destination entry: ${dest.name}`
      );
      showToast('Submitted report for admin review.', 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not submit report.', 'error');
    }
  };

  const content = (
    <div className="space-y-6">
      {/* Data Transparency Notice */}
      <div className="bg-[#F4F1EA] border border-[#E8E2D5] rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-700">
        <span>
          Curated guides marked <strong>Sample Guide</strong> are starter editorial references rather than live commercial pricing. Destinations you add are marked <strong>User Contributed</strong>.
        </span>
        {firebaseUser && (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B1D33] text-white font-medium hover:bg-[#132C4A] transition-colors whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Destination
          </button>
        )}
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-6 relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="Search destinations, landmarks, or countries..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30"
            />
          </div>
          <div className="md:col-span-3">
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
            >
              {countries.map((c) => (
                <option key={c} value={c}>
                  {c === 'All' ? 'All Countries' : c}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-3 flex gap-2">
            {firebaseUser && (
              <button
                type="button"
                onClick={() => setOnlySaved((v) => !v)}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
                  onlySaved
                    ? 'bg-[#0D7377] text-white border-[#0D7377]'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Wishlist ({savedDestinations.length})
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                category === cat
                  ? 'bg-[#0B1D33] text-white'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Map */}
      <DestinationMap
        points={mapPoints}
        selectedId={selectedMapId}
        onSelectPoint={(id) => setSelectedMapId(id)}
        heightClass="h-[360px]"
        defaultZoom={3}
      />

      {/* Destinations Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <MapPin className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="font-display font-semibold text-slate-900">No destinations match your filters</p>
          <p className="text-xs text-slate-500 mt-1">
            Try clearing the search query or selecting All Categories.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((dest) => {
            const isSaved = savedIds.has(dest.id);
            const isFocused = selectedMapId === dest.id;
            return (
              <div
                key={dest.id}
                className={`bg-white rounded-xl border overflow-hidden flex flex-col justify-between transition-colors ${
                  isFocused ? 'border-[#0D7377] ring-2 ring-[#0D7377]/20' : 'border-slate-200'
                }`}
              >
                <div>
                  <div className="aspect-[4/3] bg-slate-100 relative">
                    <ImageWithFallback
                      src={dest.imageUrl}
                      alt={dest.name}
                      title={dest.name}
                    />
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500 mb-1.5">
                      <span className="truncate">
                        {dest.country} · {dest.category} ·{' '}
                        {dest.isSampleData ? 'Sample Guide' : 'User Contributed'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleWishlist(dest)}
                        className={`p-1 rounded-md transition-colors ${
                          isSaved ? 'text-red-600' : 'text-slate-400 hover:text-red-600'
                        }`}
                        title={isSaved ? 'Remove from Wishlist' : 'Save to Wishlist'}
                        aria-label="Save to wishlist"
                      >
                        <Heart className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                    <h3 className="font-display text-lg font-semibold text-[#0B1D33] mb-1.5">
                      {dest.name}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
                      {dest.description}
                    </p>
                    {dest.bestSeason && (
                      <p className="text-xs text-slate-500 mt-3">
                        Recommended season: {dest.bestSeason}
                      </p>
                    )}
                  </div>
                </div>

                <div className="px-5 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMapId(dest.id);
                      window.scrollTo({ top: 240, behavior: 'smooth' });
                    }}
                    className="text-xs font-medium text-slate-600 hover:text-[#0B1D33] inline-flex items-center gap-1"
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    Locate
                  </button>

                  <div className="flex items-center gap-2">
                    {!dest.isSampleData && firebaseUser && (
                      <button
                        type="button"
                        onClick={() => handleReport(dest)}
                        className="p-1.5 text-slate-400 hover:text-amber-700"
                        title="Report content"
                      >
                        <Flag className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (!firebaseUser) {
                          navigate('/login');
                          return;
                        }
                        setSelectedTripId(trips[0]?.id || '');
                        setAddToTripTarget(dest);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0D7377] hover:bg-[#0F766E] text-white text-xs font-medium transition-colors"
                    >
                      <CalendarPlus className="h-3.5 w-3.5" />
                      Add to Trip
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Custom Destination Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold text-[#0B1D33]">
                Add Destination
              </h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddCustomDestination} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Saint Martin's Island"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Country *</label>
                  <input
                    type="text"
                    required
                    value={newCountry}
                    onChange={(e) => setNewCountry(e.target.value)}
                    placeholder="Bangladesh"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={newCat}
                    onChange={(e) => setNewCat(e.target.value as DestinationCategory)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Best Season
                  </label>
                  <input
                    type="text"
                    value={newSeason}
                    onChange={(e) => setNewSeason(e.target.value)}
                    placeholder="November – February"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Latitude (optional)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={newLat}
                    onChange={(e) => setNewLat(e.target.value)}
                    placeholder="20.6237"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Longitude (optional)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={newLng}
                    onChange={(e) => setNewLng(e.target.value)}
                    placeholder="92.3234"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Description *
                </label>
                <textarea
                  rows={3}
                  required
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Describe why travelers should visit..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Photo</label>
                <select
                  value={newImg}
                  onChange={(e) => setNewImg(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  {COVER_IMAGES.map((img) => (
                    <option key={img.url} value={img.url}>
                      {img.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#0D7377] text-white text-xs font-medium"
                >
                  Save Destination
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add To Trip Modal */}
      {addToTripTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-base font-semibold text-[#0B1D33]">
                Add {addToTripTarget.name} to a Trip
              </h3>
              <button
                type="button"
                onClick={() => setAddToTripTarget(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-slate-600 mb-4">
              Choose an existing trip to add this place to its itinerary, or start a brand-new trip here.
            </p>
            <select
              value={selectedTripId}
              onChange={(e) => setSelectedTripId(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg bg-white mb-5"
            >
              <option value="">Create a new trip for {addToTripTarget.name}</option>
              {trips
                .filter((t) => !t.archived)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.tripName} ({t.startDate})
                  </option>
                ))}
            </select>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAddToTripTarget(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAddToTrip}
                className="px-4 py-2 rounded-lg bg-[#0D7377] text-white text-xs font-medium"
              >
                {selectedTripId ? 'Add to Itinerary' : 'Create Trip Here'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (publicView && !firebaseUser) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
            <Link
              to="/"
              className="font-display text-xl font-bold tracking-tight text-[#0B1D33] whitespace-nowrap"
            >
              TripMate
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
              <Link to="/" className="hover:text-[#0B1D33] whitespace-nowrap">
                Home
              </Link>
              <Link to="/explore" className="text-[#0B1D33] font-semibold whitespace-nowrap">
                Destinations
              </Link>
              <Link to="/login" className="hover:text-[#0B1D33] whitespace-nowrap">
                Sign In
              </Link>
            </nav>
            <Link
              to="/register"
              className="px-4 py-2 rounded-lg bg-[#0D7377] hover:bg-[#0F766E] text-white text-sm font-medium whitespace-nowrap"
            >
              Start Planning
            </Link>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-6">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0B1D33]">
              Explore Destinations
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Discover beaches, hill tracts, heritage landmarks, and global cities.
            </p>
          </div>
          {content}
        </main>
      </div>
    );
  }

  return (
    <WorkspaceLayout
      title="Destination Explorer"
      subtitle="Search destinations, explore interactive map coordinates, manage your wishlist, and add places to trips."
    >
      {content}
    </WorkspaceLayout>
  );
};
