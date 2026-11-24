import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  CheckSquare,
  CalendarDays,
  Wallet,
  FileText,
  CloudSun,
  Edit3,
  Users,
  UserPlus,
  ThumbsUp,
  StickyNote,
  Trash2,
  ArrowLeft,
} from 'lucide-react';
import { WorkspaceLayout } from '../components/Layout/WorkspaceLayout';
import { ImageWithFallback } from '../components/Common/ImageWithFallback';
import { resolveDestinationImage } from '../data/destinationsSeed';
import { DestinationMap } from '../components/Maps/DestinationMap';
import { useAuth } from '../contexts/AuthContext';
import { useTripData } from '../contexts/TripDataContext';
import { useToast } from '../contexts/ToastContext';
import {
  subscribeTripMembers,
  sendTripInvitation,
  addDestinationVoteOption,
  toggleDestinationVote,
  addTripNote,
  deleteTripNote,
} from '../services/firestoreService';
import { TripMember } from '../types';

export const TripDetailPage: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { firebaseUser, profile } = useAuth();
  const {
    trips,
    packingItems,
    activities,
    expenses,
    documents,
    sentInvitations,
    destinationVotes,
    tripNotes,
  } = useTripData();
  const { showToast } = useToast();

  const trip = useMemo(() => trips.find((t) => t.id === tripId) || null, [trips, tripId]);

  const [members, setMembers] = useState<TripMember[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'Editor' | 'Viewer'>('Editor');
  const [sendingInvite, setSendingInvite] = useState(false);

  const [voteDestName, setVoteDestName] = useState('');
  const [voteCountry, setVoteCountry] = useState('');
  const [voteNotes, setVoteNotes] = useState('');

  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');

  useEffect(() => {
    if (!tripId || !trip) return;
    const unsub = subscribeTripMembers(tripId, setMembers);
    return () => unsub();
  }, [tripId, trip]);

  if (!trip) {
    return (
      <WorkspaceLayout title="Trip Workspace">
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <h2 className="font-display text-lg font-semibold text-slate-900">
            Trip not found or access unavailable
          </h2>
          <p className="text-sm text-slate-500 mt-1 mb-5">
            This trip may have been deleted or requires an accepted invitation.
          </p>
          <button
            type="button"
            onClick={() => navigate('/trips')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0B1D33] text-white text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to My Trips
          </button>
        </div>
      </WorkspaceLayout>
    );
  }

  const tripPacking = packingItems.filter((i) => i.tripId === trip.id);
  const packedCount = tripPacking.filter((i) => i.isPacked).length;
  const packingPct = tripPacking.length ? Math.round((packedCount / tripPacking.length) * 100) : 0;

  const tripActivities = activities.filter((a) => a.tripId === trip.id);
  const tripExpenses = expenses.filter((e) => e.tripId === trip.id);
  const totalSpent = tripExpenses.reduce((sum, e) => sum + (e.actualAmount || 0), 0);
  const tripDocs = documents.filter((d) => d.tripId === trip.id);
  const tripInvites = sentInvitations.filter((inv) => inv.tripId === trip.id);
  const tripVotes = destinationVotes.filter((v) => v.tripId === trip.id);
  const notesForTrip = tripNotes.filter((n) => n.tripId === trip.id);

  const isOwner = firebaseUser?.uid === trip.ownerId;

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !inviteEmail.trim()) return;
    setSendingInvite(true);
    try {
      await sendTripInvitation(
        trip,
        firebaseUser.uid,
        profile?.displayName || firebaseUser.email || 'TripMate User',
        inviteEmail.trim(),
        inviteRole
      );
      showToast(`Invitation sent to ${inviteEmail.trim()}.`, 'success');
      setInviteEmail('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to send invitation.', 'error');
    } finally {
      setSendingInvite(false);
    }
  };

  const handleAddVoteOption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !voteDestName.trim()) return;
    try {
      await addDestinationVoteOption(
        trip,
        profile?.displayName || 'Traveler',
        firebaseUser.uid,
        voteDestName.trim(),
        voteCountry.trim(),
        voteNotes.trim()
      );
      setVoteDestName('');
      setVoteCountry('');
      setVoteNotes('');
      showToast('Added destination option for group voting.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to propose option.', 'error');
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !noteTitle.trim() || !noteContent.trim()) return;
    try {
      await addTripNote(
        trip,
        firebaseUser.uid,
        profile?.displayName || 'Traveler',
        noteTitle.trim(),
        noteContent.trim()
      );
      setNoteTitle('');
      setNoteContent('');
      showToast('Shared trip note added.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to post note.', 'error');
    }
  };

  return (
    <WorkspaceLayout
      title={trip.tripName}
      subtitle={`${trip.destination}, ${trip.country} · ${trip.startDate} to ${trip.endDate}`}
      actions={
        isOwner && (
          <Link
            to={`/trips/${trip.id}/edit`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium"
          >
            <Edit3 className="h-3.5 w-3.5" />
            Edit Trip
          </Link>
        )
      }
    >
      <div className="space-y-6">
        {/* Hero Overview */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          <div className="lg:col-span-5 aspect-[16/10] lg:aspect-auto bg-slate-100">
            <ImageWithFallback
              src={resolveDestinationImage(trip.destination, trip.coverImage)}
              alt={trip.tripName}
              title={trip.destination}
            />
          </div>
          <div className="lg:col-span-7 p-6 flex flex-col justify-between space-y-5">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-2">
                <span className="font-semibold text-[#0D7377]">{trip.status}</span>
                <span aria-hidden="true">·</span>
                <span>{trip.tripType}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{trip.travelersCount} travelers</span>
              </div>
              <h2 className="font-display text-2xl font-bold text-[#0B1D33]">{trip.tripName}</h2>
              <p className="text-sm text-slate-600 mt-2">
                {trip.description ||
                  `Organize packing, itinerary, budget, documents, and collaborative group decisions for ${trip.destination}.`}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
              <Link
                to={`/packing?trip=${trip.id}`}
                className="p-3 rounded-lg bg-[#F8FAFC] border border-slate-200 hover:border-[#0D7377] transition-colors"
              >
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <CheckSquare className="h-3.5 w-3.5 text-[#0D7377]" />
                  Packing
                </div>
                <p className="font-mono text-base font-bold text-[#0B1D33] tabular-nums mt-1">
                  {packingPct}%
                </p>
              </Link>

              <Link
                to={`/itinerary?trip=${trip.id}`}
                className="p-3 rounded-lg bg-[#F8FAFC] border border-slate-200 hover:border-[#0D7377] transition-colors"
              >
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <CalendarDays className="h-3.5 w-3.5 text-[#0D7377]" />
                  Activities
                </div>
                <p className="font-mono text-base font-bold text-[#0B1D33] tabular-nums mt-1">
                  {tripActivities.length}
                </p>
              </Link>

              <Link
                to={`/budget?trip=${trip.id}`}
                className="p-3 rounded-lg bg-[#F8FAFC] border border-slate-200 hover:border-[#0D7377] transition-colors"
              >
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Wallet className="h-3.5 w-3.5 text-[#0D7377]" />
                  Spent
                </div>
                <p className="font-mono text-base font-bold text-[#0B1D33] tabular-nums mt-1 truncate">
                  {totalSpent.toLocaleString()} {trip.currency}
                </p>
              </Link>

              <Link
                to={`/documents?trip=${trip.id}`}
                className="p-3 rounded-lg bg-[#F8FAFC] border border-slate-200 hover:border-[#0D7377] transition-colors"
              >
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <FileText className="h-3.5 w-3.5 text-[#0D7377]" />
                  Documents
                </div>
                <p className="font-mono text-base font-bold text-[#0B1D33] tabular-nums mt-1">
                  {tripDocs.length}
                </p>
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Link Strip + Map */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-base font-semibold text-[#0B1D33]">
                Destination Location Map
              </h3>
              <Link
                to="/weather"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0D7377] hover:underline"
              >
                <CloudSun className="h-3.5 w-3.5" />
                Check Live Weather
              </Link>
            </div>
            <DestinationMap
              heightClass="h-[300px]"
              defaultZoom={typeof trip.lat === 'number' ? 10 : 4}
              defaultCenter={
                typeof trip.lat === 'number' && typeof trip.lng === 'number'
                  ? { lat: trip.lat, lng: trip.lng }
                  : undefined
              }
              points={
                typeof trip.lat === 'number' && typeof trip.lng === 'number'
                  ? [
                      {
                        id: trip.id,
                        title: trip.destination,
                        subtitle: `${trip.country} · ${trip.startDate}`,
                        lat: trip.lat,
                        lng: trip.lng,
                      },
                    ]
                  : []
              }
            />
          </div>

          {/* Collaborators & Invitations */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-[#0D7377]" />
              <h3 className="font-display text-base font-semibold text-[#0B1D33]">
                Collaborative Planning ({members.length || trip.memberIds.length} members)
              </h3>
            </div>

            <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto">
              {members.map((m) => (
                <div key={m.id} className="py-2 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-medium text-slate-900">{m.displayName}</p>
                    <p className="text-slate-500">{m.email || 'Member'}</p>
                  </div>
                  <span className="font-mono text-[#0D7377] font-medium">{m.role}</span>
                </div>
              ))}
            </div>

            {isOwner && (
              <form onSubmit={handleInviteSubmit} className="pt-3 border-t border-slate-100 space-y-2.5">
                <label className="block text-xs font-medium text-slate-700">
                  Invite Friend by Email
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="friend@example.com"
                    className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg"
                  />
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'Editor' | 'Viewer')}
                    className="px-2.5 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="Editor">Editor</option>
                    <option value="Viewer">Viewer</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={sendingInvite}
                  className="w-full py-2 rounded-lg bg-[#0B1D33] hover:bg-slate-800 text-white text-xs font-medium inline-flex items-center justify-center gap-1.5"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  {sendingInvite ? 'Sending Invite...' : 'Send Trip Invitation'}
                </button>
              </form>
            )}

            {tripInvites.length > 0 && (
              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                <p className="text-xs font-medium text-slate-500">Sent Invitations</p>
                {tripInvites.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between text-xs text-slate-600">
                    <span className="truncate">{inv.inviteeEmail}</span>
                    <span className="font-mono text-[11px]">{inv.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Group Destination Voting + Shared Trip Notes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Destination Voting */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <ThumbsUp className="h-4 w-4 text-[#0D7377]" />
              <h3 className="font-display text-base font-semibold text-[#0B1D33]">
                Group Destination Voting
              </h3>
            </div>

            <form onSubmit={handleAddVoteOption} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                required
                value={voteDestName}
                onChange={(e) => setVoteDestName(e.target.value)}
                placeholder="Propose place (e.g., Saint Martin)"
                className="sm:col-span-2 px-3 py-2 text-xs border border-slate-200 rounded-lg"
              />
              <input
                type="text"
                value={voteCountry}
                onChange={(e) => setVoteCountry(e.target.value)}
                placeholder="Country"
                className="px-3 py-2 text-xs border border-slate-200 rounded-lg"
              />
              <input
                type="text"
                value={voteNotes}
                onChange={(e) => setVoteNotes(e.target.value)}
                placeholder="Why visit? (optional)"
                className="sm:col-span-2 px-3 py-2 text-xs border border-slate-200 rounded-lg"
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-lg bg-[#0D7377] text-white text-xs font-medium"
              >
                Add Option
              </button>
            </form>

            <div className="space-y-2">
              {tripVotes.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">
                  No destination options proposed yet.
                </p>
              ) : (
                tripVotes.map((vote) => {
                  const hasVoted = firebaseUser
                    ? (vote.voterIds || []).includes(firebaseUser.uid)
                    : false;
                  return (
                    <div
                      key={vote.id}
                      className="p-3 rounded-lg border border-slate-200 bg-[#F8FAFC] flex items-center justify-between gap-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {vote.destinationName}
                          {vote.country ? `, ${vote.country}` : ''}
                        </p>
                        {vote.notes && <p className="text-xs text-slate-600">{vote.notes}</p>}
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Proposed by {vote.proposedBy || 'Member'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => firebaseUser && toggleDestinationVote(vote, firebaseUser.uid)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-colors ${
                          hasVoted
                            ? 'bg-[#0D7377] text-white border-[#0D7377]'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-[#0D7377]'
                        }`}
                      >
                        <ThumbsUp className="h-3.5 w-3.5" />
                        {(vote.voterIds || []).length}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Shared Trip Notes */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-[#0D7377]" />
              <h3 className="font-display text-base font-semibold text-[#0B1D33]">
                Shared Trip Notes
              </h3>
            </div>

            <form onSubmit={handleAddNote} className="space-y-2">
              <input
                type="text"
                required
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Note title (e.g., Bus departure meeting point)"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
              />
              <textarea
                rows={2}
                required
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Write shared reminders, packing splits, or check-in rules..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#0B1D33] text-white text-xs font-medium"
              >
                Post Note
              </button>
            </form>

            <div className="space-y-2.5">
              {notesForTrip.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">
                  No shared trip notes yet.
                </p>
              ) : (
                notesForTrip.map((note) => (
                  <div
                    key={note.id}
                    className="p-3.5 rounded-lg border border-slate-200 bg-[#F8FAFC] flex items-start justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{note.title}</p>
                      <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap">
                        {note.content}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1.5">
                        Posted by {note.authorName || 'Member'}
                      </p>
                    </div>
                    {(firebaseUser?.uid === note.authorId || isOwner) && (
                      <button
                        type="button"
                        onClick={() => deleteTripNote(note.id)}
                        className="p-1 text-slate-400 hover:text-red-700"
                        title="Delete note"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  );
};
