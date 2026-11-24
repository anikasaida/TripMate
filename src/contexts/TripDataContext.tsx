import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import {
  Trip,
  PackingItem,
  PackingTemplate,
  Activity,
  Expense,
  TravelDocument,
  AppNotification,
  Invitation,
  DestinationVote,
  TripNote,
  JournalEntry,
  Destination,
  SavedDestination,
} from '../types';
import {
  subscribeUserTrips,
  subscribePackingItems,
  subscribePackingTemplates,
  subscribeActivities,
  subscribeExpenses,
  subscribeDocuments,
  subscribeNotifications,
  subscribeUserInvitations,
  subscribeSentInvitations,
  subscribeDestinationVotes,
  subscribeTripNotes,
  subscribeJournalEntries,
  subscribeDestinations,
  subscribeSavedDestinations,
  createNotificationIfNew,
} from '../services/firestoreService';
import { CURATED_SAMPLE_DESTINATIONS } from '../data/destinationsSeed';

interface TripDataContextValue {
  trips: Trip[];
  packingItems: PackingItem[];
  packingTemplates: PackingTemplate[];
  activities: Activity[];
  expenses: Expense[];
  documents: TravelDocument[];
  notifications: AppNotification[];
  receivedInvitations: Invitation[];
  sentInvitations: Invitation[];
  destinationVotes: DestinationVote[];
  tripNotes: TripNote[];
  journalEntries: JournalEntry[];
  destinations: Destination[];
  savedDestinations: SavedDestination[];
  dataReady: boolean;
}

const TripDataContext = createContext<TripDataContextValue>({
  trips: [],
  packingItems: [],
  packingTemplates: [],
  activities: [],
  expenses: [],
  documents: [],
  notifications: [],
  receivedInvitations: [],
  sentInvitations: [],
  destinationVotes: [],
  tripNotes: [],
  journalEntries: [],
  destinations: CURATED_SAMPLE_DESTINATIONS,
  savedDestinations: [],
  dataReady: false,
});

export function TripDataProvider({ children }: { children: React.ReactNode }) {
  const { firebaseUser, profile, loading } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [packingItems, setPackingItems] = useState<PackingItem[]>([]);
  const [packingTemplates, setPackingTemplates] = useState<PackingTemplate[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [documents, setDocuments] = useState<TravelDocument[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [receivedInvitations, setReceivedInvitations] = useState<Invitation[]>([]);
  const [sentInvitations, setSentInvitations] = useState<Invitation[]>([]);
  const [destinationVotes, setDestinationVotes] = useState<DestinationVote[]>([]);
  const [tripNotes, setTripNotes] = useState<TripNote[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [customDestinations, setCustomDestinations] = useState<Destination[]>([]);
  const [savedDestinations, setSavedDestinations] = useState<SavedDestination[]>([]);
  const [dataReady, setDataReady] = useState(false);

  const reminderRunRef = useRef<string>('');

  // Public destinations subscription (available on Explore Destinations too)
  useEffect(() => {
    const unsub = subscribeDestinations((items) => setCustomDestinations(items));
    return () => unsub();
  }, []);

  // Authenticated user subscriptions
  useEffect(() => {
    if (loading) return;
    if (!firebaseUser) {
      setTrips([]);
      setPackingItems([]);
      setPackingTemplates([]);
      setActivities([]);
      setExpenses([]);
      setDocuments([]);
      setNotifications([]);
      setReceivedInvitations([]);
      setSentInvitations([]);
      setDestinationVotes([]);
      setTripNotes([]);
      setJournalEntries([]);
      setSavedDestinations([]);
      setDataReady(true);
      return;
    }

    const uid = firebaseUser.uid;
    const email = firebaseUser.email || '';

    const unsubs = [
      subscribeUserTrips(uid, (items) => {
        setTrips(items);
        setDataReady(true);
      }),
      subscribePackingItems(uid, setPackingItems),
      subscribePackingTemplates(uid, setPackingTemplates),
      subscribeActivities(uid, setActivities),
      subscribeExpenses(uid, setExpenses),
      subscribeDocuments(uid, setDocuments),
      subscribeNotifications(uid, setNotifications),
      subscribeUserInvitations(email, uid, setReceivedInvitations),
      subscribeSentInvitations(uid, setSentInvitations),
      subscribeDestinationVotes(uid, setDestinationVotes),
      subscribeTripNotes(uid, setTripNotes),
      subscribeJournalEntries(uid, setJournalEntries),
      subscribeSavedDestinations(uid, setSavedDestinations),
    ];

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [firebaseUser, loading]);

  // Smart reminder evaluator (runs cleanly without duplicate alerts)
  useEffect(() => {
    if (!firebaseUser || !dataReady || trips.length === 0) return;

    const signature = `${firebaseUser.uid}_${trips.length}_${packingItems.length}_${expenses.length}`;
    if (reminderRunRef.current === signature) return;
    reminderRunRef.current = signature;

    const prefs = profile?.notificationPrefs || {
      tripReminders: true,
      packingReminders: true,
      budgetWarnings: true,
      invitations: true,
    };

    const today = new Date();
    const todayMs = today.getTime();

    trips.forEach((trip) => {
      if (trip.archived || trip.status === 'Completed') return;

      if (prefs.tripReminders && trip.startDate) {
        const startMs = new Date(trip.startDate).getTime();
        const diffDays = Math.ceil((startMs - todayMs) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 7) {
          createNotificationIfNew(firebaseUser.uid, {
            tripId: trip.id,
            type: 'TripReminder',
            title: `Upcoming Trip: ${trip.tripName}`,
            message:
              diffDays === 0
                ? `Your trip to ${trip.destination} starts today.`
                : `Your trip to ${trip.destination} starts in ${diffDays} day${diffDays === 1 ? '' : 's'}.`,
            actionUrl: `/trips/${trip.id}`,
            dedupeKey: `trip_rem_${trip.id}_${trip.startDate}`,
          }).catch(() => {});
        }
      }

      if (prefs.packingReminders) {
        const tripPack = packingItems.filter((i) => i.tripId === trip.id);
        const unpackedEssentials = tripPack.filter(
          (i) => !i.isPacked && i.priority === 'Essential'
        );
        if (unpackedEssentials.length >= 3) {
          createNotificationIfNew(firebaseUser.uid, {
            tripId: trip.id,
            type: 'MissingEssential',
            title: `Essential Items Unpacked (${trip.tripName})`,
            message: `${unpackedEssentials.length} essential items remain unpacked for ${trip.destination}.`,
            actionUrl: `/packing?trip=${trip.id}`,
            dedupeKey: `pack_ess_${trip.id}_${unpackedEssentials.length}`,
          }).catch(() => {});
        }
      }

      if (prefs.budgetWarnings && trip.estimatedBudget > 0) {
        const spent = expenses
          .filter((e) => e.tripId === trip.id)
          .reduce((sum, e) => sum + (e.actualAmount || 0), 0);
        if (spent > trip.estimatedBudget) {
          createNotificationIfNew(firebaseUser.uid, {
            tripId: trip.id,
            type: 'BudgetWarning',
            title: `Budget Exceeded: ${trip.tripName}`,
            message: `Actual spending (${spent.toLocaleString()} ${trip.currency}) has exceeded your estimated budget (${trip.estimatedBudget.toLocaleString()} ${trip.currency}).`,
            actionUrl: `/budget?trip=${trip.id}`,
            dedupeKey: `budget_over_${trip.id}`,
          }).catch(() => {});
        }
      }
    });
  }, [firebaseUser, dataReady, trips, packingItems, expenses, profile]);

  const destinations = [
    ...customDestinations,
    ...CURATED_SAMPLE_DESTINATIONS.filter(
      (sample) => !customDestinations.some((c) => c.name.toLowerCase() === sample.name.toLowerCase())
    ),
  ];

  return (
    <TripDataContext.Provider
      value={{
        trips,
        packingItems,
        packingTemplates,
        activities,
        expenses,
        documents,
        notifications,
        receivedInvitations,
        sentInvitations,
        destinationVotes,
        tripNotes,
        journalEntries,
        destinations,
        savedDestinations,
        dataReady,
      }}
    >
      {children}
    </TripDataContext.Provider>
  );
}

export function useTripData() {
  return useContext(TripDataContext);
}
