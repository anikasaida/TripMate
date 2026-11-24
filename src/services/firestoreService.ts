import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  Trip,
  TripMember,
  PackingItem,
  PackingTemplate,
  PackingTemplateItem,
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
  UserProfile,
  ContentReport,
} from '../types';
import { DEFAULT_PACKING_ITEMS } from '../data/destinationsSeed';

function clip(val: string | undefined, max: number): string {
  return (val || '').trim().slice(0, max);
}

export function computeTripStatus(startDate: string, endDate: string): Trip['status'] {
  const today = new Date().toISOString().slice(0, 10);
  if (endDate && endDate < today) return 'Completed';
  if (startDate && startDate <= today && (!endDate || endDate >= today)) return 'Ongoing';
  return 'Upcoming';
}

// --- TRIPS ---

export function subscribeUserTrips(
  uid: string,
  onData: (trips: Trip[]) => void
): Unsubscribe {
  const q = query(collection(db, 'trips'), where('memberIds', 'array-contains', uid));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Trip, 'id'>) }));
      items.sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
      onData(items);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'trips')
  );
}

export async function createTrip(
  uid: string,
  ownerName: string,
  ownerEmail: string,
  input: {
    tripName: string;
    destination: string;
    country: string;
    startDate: string;
    endDate: string;
    travelersCount: number;
    tripType: Trip['tripType'];
    estimatedBudget: number;
    currency: Trip['currency'];
    description?: string;
    coverImage?: string;
    lat?: number;
    lng?: number;
    seedDefaultPacking?: boolean;
  }
): Promise<string> {
  try {
    const tripRef = doc(collection(db, 'trips'));
    const status = computeTripStatus(input.startDate, input.endDate);
    const payload: Record<string, unknown> = {
      ownerId: uid,
      memberIds: [uid],
      pendingInviteEmails: [],
      tripName: clip(input.tripName, 140),
      destination: clip(input.destination, 120),
      country: clip(input.country, 100),
      startDate: clip(input.startDate, 32),
      endDate: clip(input.endDate, 32),
      travelersCount: Math.max(1, Math.min(100, Number(input.travelersCount) || 1)),
      tripType: input.tripType,
      estimatedBudget: Math.max(0, Number(input.estimatedBudget) || 0),
      currency: input.currency,
      description: clip(input.description, 2000),
      coverImage: clip(input.coverImage, 1000),
      status,
      archived: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (typeof input.lat === 'number' && !Number.isNaN(input.lat)) payload.lat = input.lat;
    if (typeof input.lng === 'number' && !Number.isNaN(input.lng)) payload.lng = input.lng;

    await setDoc(tripRef, payload);

    // Owner member record
    await setDoc(doc(db, 'trips', tripRef.id, 'members', uid), {
      tripId: tripRef.id,
      userId: uid,
      displayName: clip(ownerName || 'Traveler', 120),
      email: clip(ownerEmail, 254),
      role: 'Owner',
      joinedAt: serverTimestamp(),
    });

    if (input.seedDefaultPacking !== false) {
      const batch = writeBatch(db);
      for (const item of DEFAULT_PACKING_ITEMS) {
        const itemRef = doc(collection(db, 'packingItems'));
        batch.set(itemRef, {
          tripId: tripRef.id,
          ownerId: uid,
          memberIds: [uid],
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          priority: item.priority,
          isPacked: false,
          notes: '',
          aiSuggested: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
    }

    return tripRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'trips');
  }
}

export async function updateTrip(tripId: string, updates: Partial<Trip>): Promise<void> {
  try {
    const clean: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (updates.tripName !== undefined) clean.tripName = clip(updates.tripName, 140);
    if (updates.destination !== undefined) clean.destination = clip(updates.destination, 120);
    if (updates.country !== undefined) clean.country = clip(updates.country, 100);
    if (updates.startDate !== undefined) clean.startDate = clip(updates.startDate, 32);
    if (updates.endDate !== undefined) clean.endDate = clip(updates.endDate, 32);
    if (updates.travelersCount !== undefined)
      clean.travelersCount = Math.max(1, Math.min(100, Number(updates.travelersCount) || 1));
    if (updates.tripType !== undefined) clean.tripType = updates.tripType;
    if (updates.estimatedBudget !== undefined)
      clean.estimatedBudget = Math.max(0, Number(updates.estimatedBudget) || 0);
    if (updates.currency !== undefined) clean.currency = updates.currency;
    if (updates.description !== undefined) clean.description = clip(updates.description, 2000);
    if (updates.coverImage !== undefined) clean.coverImage = clip(updates.coverImage, 1000);
    if (updates.status !== undefined) clean.status = updates.status;
    if (updates.archived !== undefined) clean.archived = Boolean(updates.archived);
    if (typeof updates.lat === 'number') clean.lat = updates.lat;
    if (typeof updates.lng === 'number') clean.lng = updates.lng;

    await updateDoc(doc(db, 'trips', tripId), clean);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `trips/${tripId}`);
  }
}

export async function deleteTrip(tripId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'trips', tripId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `trips/${tripId}`);
  }
}

export async function duplicateTrip(
  uid: string,
  ownerName: string,
  ownerEmail: string,
  sourceTrip: Trip
): Promise<string> {
  const newTripId = await createTrip(uid, ownerName, ownerEmail, {
    tripName: `${sourceTrip.tripName} (Copy)`.slice(0, 140),
    destination: sourceTrip.destination,
    country: sourceTrip.country,
    startDate: sourceTrip.startDate,
    endDate: sourceTrip.endDate,
    travelersCount: sourceTrip.travelersCount,
    tripType: sourceTrip.tripType,
    estimatedBudget: sourceTrip.estimatedBudget,
    currency: sourceTrip.currency,
    description: sourceTrip.description,
    coverImage: sourceTrip.coverImage,
    lat: sourceTrip.lat,
    lng: sourceTrip.lng,
    seedDefaultPacking: false,
  });

  // Duplicate packing items
  try {
    const packSnap = await getDocs(
      query(collection(db, 'packingItems'), where('tripId', '==', sourceTrip.id))
    );
    if (!packSnap.empty) {
      const batch = writeBatch(db);
      packSnap.docs.forEach((d) => {
        const item = d.data() as PackingItem;
        const ref = doc(collection(db, 'packingItems'));
        batch.set(ref, {
          tripId: newTripId,
          ownerId: uid,
          memberIds: [uid],
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          priority: item.priority,
          isPacked: false,
          notes: item.notes || '',
          aiSuggested: Boolean(item.aiSuggested),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'packingItems');
  }
  return newTripId;
}

// --- PACKING ITEMS & TEMPLATES ---

export function subscribePackingItems(
  uid: string,
  onData: (items: PackingItem[]) => void
): Unsubscribe {
  const q = query(collection(db, 'packingItems'), where('memberIds', 'array-contains', uid));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PackingItem, 'id'>) })));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'packingItems')
  );
}

export async function addPackingItem(
  trip: Trip,
  input: {
    name: string;
    category: string;
    quantity: number;
    priority: PackingItem['priority'];
    notes?: string;
    aiSuggested?: boolean;
  }
): Promise<void> {
  try {
    await addDoc(collection(db, 'packingItems'), {
      tripId: trip.id,
      ownerId: trip.ownerId,
      memberIds: trip.memberIds,
      name: clip(input.name, 120),
      category: clip(input.category, 80),
      quantity: Math.max(1, Math.min(999, Number(input.quantity) || 1)),
      priority: input.priority,
      isPacked: false,
      notes: clip(input.notes, 400),
      aiSuggested: Boolean(input.aiSuggested),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'packingItems');
  }
}

export async function updatePackingItem(
  itemId: string,
  updates: Partial<PackingItem>
): Promise<void> {
  try {
    const clean: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (updates.name !== undefined) clean.name = clip(updates.name, 120);
    if (updates.category !== undefined) clean.category = clip(updates.category, 80);
    if (updates.quantity !== undefined)
      clean.quantity = Math.max(1, Math.min(999, Number(updates.quantity) || 1));
    if (updates.priority !== undefined) clean.priority = updates.priority;
    if (updates.isPacked !== undefined) clean.isPacked = Boolean(updates.isPacked);
    if (updates.notes !== undefined) clean.notes = clip(updates.notes, 400);
    await updateDoc(doc(db, 'packingItems', itemId), clean);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `packingItems/${itemId}`);
  }
}

export async function deletePackingItem(itemId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'packingItems', itemId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `packingItems/${itemId}`);
  }
}

export function subscribePackingTemplates(
  uid: string,
  onData: (templates: PackingTemplate[]) => void
): Unsubscribe {
  const q = query(collection(db, 'packingTemplates'), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PackingTemplate, 'id'>) })));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'packingTemplates')
  );
}

export async function savePackingTemplate(
  uid: string,
  name: string,
  tripType: string,
  items: PackingTemplateItem[]
): Promise<void> {
  try {
    await addDoc(collection(db, 'packingTemplates'), {
      ownerId: uid,
      name: clip(name, 120),
      tripType: clip(tripType, 60),
      items: items.slice(0, 60).map((it) => ({
        name: clip(it.name, 120),
        category: clip(it.category, 80),
        quantity: Math.max(1, Number(it.quantity) || 1),
        priority: it.priority,
        notes: clip(it.notes, 300),
      })),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'packingTemplates');
  }
}

export async function applyPackingTemplateToTrip(
  trip: Trip,
  items: PackingTemplateItem[]
): Promise<void> {
  try {
    const batch = writeBatch(db);
    items.slice(0, 60).forEach((item) => {
      const ref = doc(collection(db, 'packingItems'));
      batch.set(ref, {
        tripId: trip.id,
        ownerId: trip.ownerId,
        memberIds: trip.memberIds,
        name: clip(item.name, 120),
        category: clip(item.category, 80),
        quantity: Math.max(1, Number(item.quantity) || 1),
        priority: item.priority || 'Medium',
        isPacked: false,
        notes: clip(item.notes, 400),
        aiSuggested: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'packingItems');
  }
}

export async function deletePackingTemplate(templateId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'packingTemplates', templateId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `packingTemplates/${templateId}`);
  }
}

// --- ACTIVITIES (ITINERARY) ---

export function subscribeActivities(
  uid: string,
  onData: (activities: Activity[]) => void
): Unsubscribe {
  const q = query(collection(db, 'activities'), where('memberIds', 'array-contains', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Activity, 'id'>) }));
      list.sort((a, b) => {
        const dc = (a.date || '').localeCompare(b.date || '');
        if (dc !== 0) return dc;
        const tc = (a.startTime || '').localeCompare(b.startTime || '');
        if (tc !== 0) return tc;
        return (a.orderIndex || 0) - (b.orderIndex || 0);
      });
      onData(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'activities')
  );
}

export async function addActivity(
  trip: Trip,
  input: Omit<Activity, 'id' | 'tripId' | 'ownerId' | 'memberIds' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  try {
    await addDoc(collection(db, 'activities'), {
      tripId: trip.id,
      ownerId: trip.ownerId,
      memberIds: trip.memberIds,
      date: clip(input.date, 32),
      startTime: clip(input.startTime, 16),
      endTime: clip(input.endTime, 16),
      title: clip(input.title, 140),
      location: clip(input.location, 160),
      description: clip(input.description, 1000),
      estimatedCost: Math.max(0, Number(input.estimatedCost) || 0),
      transportation: clip(input.transportation, 120),
      notes: clip(input.notes, 500),
      orderIndex: Number(input.orderIndex) || 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'activities');
  }
}

export async function updateActivity(activityId: string, updates: Partial<Activity>): Promise<void> {
  try {
    const clean: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (updates.date !== undefined) clean.date = clip(updates.date, 32);
    if (updates.startTime !== undefined) clean.startTime = clip(updates.startTime, 16);
    if (updates.endTime !== undefined) clean.endTime = clip(updates.endTime, 16);
    if (updates.title !== undefined) clean.title = clip(updates.title, 140);
    if (updates.location !== undefined) clean.location = clip(updates.location, 160);
    if (updates.description !== undefined) clean.description = clip(updates.description, 1000);
    if (updates.estimatedCost !== undefined)
      clean.estimatedCost = Math.max(0, Number(updates.estimatedCost) || 0);
    if (updates.transportation !== undefined) clean.transportation = clip(updates.transportation, 120);
    if (updates.notes !== undefined) clean.notes = clip(updates.notes, 500);
    if (updates.orderIndex !== undefined) clean.orderIndex = Number(updates.orderIndex) || 0;
    await updateDoc(doc(db, 'activities', activityId), clean);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `activities/${activityId}`);
  }
}

export async function deleteActivity(activityId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'activities', activityId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `activities/${activityId}`);
  }
}

// --- EXPENSES ---

export function subscribeExpenses(
  uid: string,
  onData: (expenses: Expense[]) => void
): Unsubscribe {
  const q = query(collection(db, 'expenses'), where('memberIds', 'array-contains', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Expense, 'id'>) }));
      list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      onData(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'expenses')
  );
}

export async function addExpense(
  trip: Trip,
  input: Omit<Expense, 'id' | 'tripId' | 'ownerId' | 'memberIds' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  try {
    await addDoc(collection(db, 'expenses'), {
      tripId: trip.id,
      ownerId: trip.ownerId,
      memberIds: trip.memberIds,
      title: clip(input.title, 140),
      category: input.category,
      estimatedAmount: Math.max(0, Number(input.estimatedAmount) || 0),
      actualAmount: Math.max(0, Number(input.actualAmount) || 0),
      currency: input.currency || trip.currency,
      date: clip(input.date, 32),
      paidBy: clip(input.paidBy, 120),
      notes: clip(input.notes, 500),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'expenses');
  }
}

export async function updateExpense(expenseId: string, updates: Partial<Expense>): Promise<void> {
  try {
    const clean: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (updates.title !== undefined) clean.title = clip(updates.title, 140);
    if (updates.category !== undefined) clean.category = updates.category;
    if (updates.estimatedAmount !== undefined)
      clean.estimatedAmount = Math.max(0, Number(updates.estimatedAmount) || 0);
    if (updates.actualAmount !== undefined)
      clean.actualAmount = Math.max(0, Number(updates.actualAmount) || 0);
    if (updates.currency !== undefined) clean.currency = updates.currency;
    if (updates.date !== undefined) clean.date = clip(updates.date, 32);
    if (updates.paidBy !== undefined) clean.paidBy = clip(updates.paidBy, 120);
    if (updates.notes !== undefined) clean.notes = clip(updates.notes, 500);
    await updateDoc(doc(db, 'expenses', expenseId), clean);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `expenses/${expenseId}`);
  }
}

export async function deleteExpense(expenseId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'expenses', expenseId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `expenses/${expenseId}`);
  }
}

// --- TRAVEL DOCUMENTS ---

export function subscribeDocuments(
  uid: string,
  onData: (docs: TravelDocument[]) => void
): Unsubscribe {
  const q = query(collection(db, 'travelDocuments'), where('memberIds', 'array-contains', uid));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TravelDocument, 'id'>) })));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'travelDocuments')
  );
}

export async function addTravelDocument(
  trip: Trip,
  input: Omit<TravelDocument, 'id' | 'tripId' | 'ownerId' | 'memberIds' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  try {
    const payload: Record<string, unknown> = {
      tripId: trip.id,
      ownerId: trip.ownerId,
      memberIds: trip.memberIds,
      title: clip(input.title, 140),
      category: input.category,
      referenceNumber: clip(input.referenceNumber, 120),
      contactInfo: clip(input.contactInfo, 200),
      notes: clip(input.notes, 600),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (input.fileId) payload.fileId = clip(input.fileId, 128);
    if (input.fileName) payload.fileName = clip(input.fileName, 200);
    if (input.mimeType) payload.mimeType = clip(input.mimeType, 100);
    if (typeof input.fileSize === 'number') payload.fileSize = input.fileSize;

    await addDoc(collection(db, 'travelDocuments'), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'travelDocuments');
  }
}

export async function deleteTravelDocument(docId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'travelDocuments', docId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `travelDocuments/${docId}`);
  }
}

// --- DESTINATIONS & WISHLIST ---

export function subscribeDestinations(onData: (items: Destination[]) => void): Unsubscribe {
  const q = query(collection(db, 'destinations'), orderBy('name', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Destination, 'id'>) })));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'destinations')
  );
}

export async function addDestination(
  uid: string,
  input: Omit<Destination, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  try {
    const payload: Record<string, unknown> = {
      name: clip(input.name, 120),
      country: clip(input.country, 100),
      category: input.category,
      description: clip(input.description, 2000),
      imageUrl: clip(input.imageUrl, 1000),
      bestSeason: clip(input.bestSeason, 120),
      highlights: (input.highlights || []).slice(0, 15).map((h) => clip(h, 120)),
      isSampleData: Boolean(input.isSampleData),
      createdBy: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (typeof input.lat === 'number' && !Number.isNaN(input.lat)) payload.lat = input.lat;
    if (typeof input.lng === 'number' && !Number.isNaN(input.lng)) payload.lng = input.lng;

    await addDoc(collection(db, 'destinations'), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'destinations');
  }
}

export async function deleteDestination(destId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'destinations', destId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `destinations/${destId}`);
  }
}

export function subscribeSavedDestinations(
  uid: string,
  onData: (items: SavedDestination[]) => void
): Unsubscribe {
  const q = query(collection(db, 'savedDestinations'), where('userId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SavedDestination, 'id'>) })));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'savedDestinations')
  );
}

export async function saveDestinationToWishlist(
  uid: string,
  dest: Destination,
  notes?: string
): Promise<void> {
  try {
    const docId = `${uid}_${dest.id}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
    const payload: Record<string, unknown> = {
      userId: uid,
      destinationId: dest.id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128),
      destinationName: clip(dest.name, 120),
      country: clip(dest.country, 100),
      category: clip(dest.category, 60),
      imageUrl: clip(dest.imageUrl, 1000),
      notes: clip(notes, 500),
      createdAt: serverTimestamp(),
    };
    if (typeof dest.lat === 'number') payload.lat = dest.lat;
    if (typeof dest.lng === 'number') payload.lng = dest.lng;

    await setDoc(doc(db, 'savedDestinations', docId), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'savedDestinations');
  }
}

export async function removeSavedDestination(savedId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'savedDestinations', savedId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `savedDestinations/${savedId}`);
  }
}

// --- NOTIFICATIONS ---

export function subscribeNotifications(
  uid: string,
  onData: (items: AppNotification[]) => void
): Unsubscribe {
  const q = query(collection(db, 'notifications'), where('userId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<AppNotification, 'id'>),
      }));
      onData(list.reverse());
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'notifications')
  );
}

export async function createNotificationIfNew(
  uid: string,
  input: Omit<AppNotification, 'id' | 'userId' | 'isRead' | 'createdAt'>
): Promise<void> {
  try {
    const id = input.dedupeKey
      ? `${uid}_${input.dedupeKey}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128)
      : doc(collection(db, 'notifications')).id;
    const ref = doc(db, 'notifications', id);
    const existingSnap = await getDoc(ref);
    if (existingSnap.exists()) return;

    await setDoc(ref, {
      userId: uid,
      tripId: clip(input.tripId, 128),
      type: input.type,
      title: clip(input.title, 140),
      message: clip(input.message, 500),
      isRead: false,
      actionUrl: clip(input.actionUrl, 200),
      dedupeKey: clip(input.dedupeKey, 160),
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'notifications');
  }
}

export async function markNotificationRead(notificationId: string, isRead: boolean): Promise<void> {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), { isRead });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `notifications/${notificationId}`);
  }
}

export async function deleteNotification(notificationId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'notifications', notificationId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `notifications/${notificationId}`);
  }
}

// --- COLLABORATION (MEMBERS, INVITATIONS, VOTES, NOTES) ---

export function subscribeTripMembers(
  tripId: string,
  onData: (members: TripMember[]) => void
): Unsubscribe {
  const q = collection(db, 'trips', tripId, 'members');
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TripMember, 'id'>) })));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, `trips/${tripId}/members`)
  );
}

export function subscribeUserInvitations(
  email: string,
  uid: string,
  onData: (invites: Invitation[]) => void
): Unsubscribe {
  if (!email) {
    onData([]);
    return () => {};
  }
  const q = query(collection(db, 'invitations'), where('inviteeEmail', '==', email.toLowerCase()));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Invitation, 'id'>) })));
    },
    (err) => {
      // Unverified email users may receive permission error on email-based list; fail gracefully
      if (err instanceof Error && err.message.includes('permission')) {
        onData([]);
        return;
      }
      handleFirestoreError(err, OperationType.LIST, `invitations/${uid}`);
    }
  );
}

export function subscribeSentInvitations(
  uid: string,
  onData: (invites: Invitation[]) => void
): Unsubscribe {
  const q = query(collection(db, 'invitations'), where('inviterId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Invitation, 'id'>) })));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'invitations')
  );
}

export async function sendTripInvitation(
  trip: Trip,
  inviterId: string,
  inviterName: string,
  inviteeEmail: string,
  role: 'Editor' | 'Viewer'
): Promise<void> {
  try {
    const cleanEmail = clip(inviteeEmail.toLowerCase(), 254);
    await addDoc(collection(db, 'invitations'), {
      tripId: trip.id,
      tripName: clip(trip.tripName, 140),
      inviterId,
      inviterName: clip(inviterName, 120),
      inviteeEmail: cleanEmail,
      role,
      status: 'Pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const existingEmails = trip.pendingInviteEmails || [];
    if (!existingEmails.includes(cleanEmail) && existingEmails.length < 20) {
      await updateDoc(doc(db, 'trips', trip.id), {
        pendingInviteEmails: [...existingEmails, cleanEmail],
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'invitations');
  }
}

export async function respondToInvitation(
  invitation: Invitation,
  user: { uid: string; displayName: string; email: string },
  accept: boolean
): Promise<void> {
  try {
    await updateDoc(doc(db, 'invitations', invitation.id), {
      status: accept ? 'Accepted' : 'Rejected',
      updatedAt: serverTimestamp(),
    });

    if (accept) {
      const tripRef = doc(db, 'trips', invitation.tripId);
      const tripSnap = await getDoc(tripRef);
      if (tripSnap.exists()) {
        const tripData = tripSnap.data() as Trip;
        const nextMembers = Array.from(new Set([...(tripData.memberIds || []), user.uid])).slice(0, 20);
        const nextPending = (tripData.pendingInviteEmails || []).filter(
          (e) => e.toLowerCase() !== user.email.toLowerCase()
        );
        await updateDoc(tripRef, {
          memberIds: nextMembers,
          pendingInviteEmails: nextPending,
          updatedAt: serverTimestamp(),
        });

        await setDoc(doc(db, 'trips', invitation.tripId, 'members', user.uid), {
          tripId: invitation.tripId,
          userId: user.uid,
          displayName: clip(user.displayName || 'Traveler', 120),
          email: clip(user.email, 254),
          role: invitation.role,
          joinedAt: serverTimestamp(),
        });
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `invitations/${invitation.id}`);
  }
}

export function subscribeDestinationVotes(
  uid: string,
  onData: (votes: DestinationVote[]) => void
): Unsubscribe {
  const q = query(collection(db, 'destinationVotes'), where('memberIds', 'array-contains', uid));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<DestinationVote, 'id'>) })));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'destinationVotes')
  );
}

export async function addDestinationVoteOption(
  trip: Trip,
  proposedBy: string,
  uid: string,
  destinationName: string,
  country: string,
  notes: string
): Promise<void> {
  try {
    await addDoc(collection(db, 'destinationVotes'), {
      tripId: trip.id,
      ownerId: trip.ownerId,
      memberIds: trip.memberIds,
      destinationName: clip(destinationName, 140),
      country: clip(country, 100),
      notes: clip(notes, 400),
      voterIds: [uid],
      proposedBy: clip(proposedBy, 120),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'destinationVotes');
  }
}

export async function toggleDestinationVote(vote: DestinationVote, uid: string): Promise<void> {
  try {
    const exists = (vote.voterIds || []).includes(uid);
    const nextVoters = exists
      ? vote.voterIds.filter((id) => id !== uid)
      : Array.from(new Set([...(vote.voterIds || []), uid])).slice(0, 20);
    await updateDoc(doc(db, 'destinationVotes', vote.id), {
      voterIds: nextVoters,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `destinationVotes/${vote.id}`);
  }
}

export function subscribeTripNotes(
  uid: string,
  onData: (notes: TripNote[]) => void
): Unsubscribe {
  const q = query(collection(db, 'tripNotes'), where('memberIds', 'array-contains', uid));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TripNote, 'id'>) })));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'tripNotes')
  );
}

export async function addTripNote(
  trip: Trip,
  authorId: string,
  authorName: string,
  title: string,
  content: string
): Promise<void> {
  try {
    await addDoc(collection(db, 'tripNotes'), {
      tripId: trip.id,
      ownerId: trip.ownerId,
      memberIds: trip.memberIds,
      title: clip(title, 140),
      content: clip(content, 4000),
      authorId,
      authorName: clip(authorName, 120),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'tripNotes');
  }
}

export async function deleteTripNote(noteId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'tripNotes', noteId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `tripNotes/${noteId}`);
  }
}

// --- JOURNAL ENTRIES ---

export function subscribeJournalEntries(
  uid: string,
  onData: (entries: JournalEntry[]) => void
): Unsubscribe {
  const q = query(collection(db, 'journalEntries'), where('memberIds', 'array-contains', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<JournalEntry, 'id'>),
      }));
      list.sort((a, b) => (b.travelDate || '').localeCompare(a.travelDate || ''));
      onData(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'journalEntries')
  );
}

export async function addJournalEntry(
  trip: Trip,
  input: Omit<JournalEntry, 'id' | 'tripId' | 'ownerId' | 'memberIds' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  try {
    await addDoc(collection(db, 'journalEntries'), {
      tripId: trip.id,
      ownerId: trip.ownerId,
      memberIds: trip.memberIds,
      title: clip(input.title, 140),
      content: clip(input.content, 5000),
      destination: clip(input.destination, 120),
      travelDate: clip(input.travelDate, 32),
      photos: (input.photos || []).slice(0, 6),
      mood: clip(input.mood, 40),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'journalEntries');
  }
}

export async function deleteJournalEntry(entryId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'journalEntries', entryId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `journalEntries/${entryId}`);
  }
}

// --- ADMIN QUERIES & MODERATION ---

export async function fetchAllUsersAdmin(): Promise<UserProfile[]> {
  try {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map((d) => d.data() as UserProfile);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'users');
  }
}

export async function fetchAllTripsAdmin(): Promise<Trip[]> {
  try {
    const snap = await getDocs(collection(db, 'trips'));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Trip, 'id'>) }));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'trips');
  }
}

export async function setUserRoleAdmin(
  targetUser: UserProfile,
  role: 'USER' | 'ADMIN',
  adminUid: string
): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', targetUser.uid), {
      role,
      updatedAt: serverTimestamp(),
    });
    if (role === 'ADMIN') {
      await setDoc(doc(db, 'admins', targetUser.uid), {
        uid: targetUser.uid,
        email: targetUser.email,
        grantedBy: adminUid,
        createdAt: serverTimestamp(),
      });
    } else {
      await deleteDoc(doc(db, 'admins', targetUser.uid));
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${targetUser.uid}`);
  }
}

export async function submitContentReport(
  reporterId: string,
  targetType: ContentReport['targetType'],
  targetId: string,
  reason: string
): Promise<void> {
  try {
    await addDoc(collection(db, 'reports'), {
      reporterId,
      targetType,
      targetId: clip(targetId, 128),
      reason: clip(reason, 600),
      status: 'Open',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'reports');
  }
}

export async function fetchReportsAdmin(): Promise<ContentReport[]> {
  try {
    const snap = await getDocs(collection(db, 'reports'));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ContentReport, 'id'>) }));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'reports');
  }
}

export async function updateReportStatusAdmin(
  reportId: string,
  status: ContentReport['status']
): Promise<void> {
  try {
    await updateDoc(doc(db, 'reports', reportId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `reports/${reportId}`);
  }
}
