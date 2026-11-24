export type UserRole = 'USER' | 'ADMIN';

export type CurrencyCode = 'USD' | 'BDT' | 'EUR' | 'GBP' | 'AUD' | 'CAD' | 'JPY';

export type TripType =
  | 'Solo Travel'
  | 'Family Trip'
  | 'Friends Trip'
  | 'Couple Trip'
  | 'Business Trip'
  | 'Adventure Trip'
  | 'Educational Trip'
  | 'Weekend Trip';

export type TripStatus = 'Upcoming' | 'Ongoing' | 'Completed';

export type DestinationCategory =
  | 'Beaches'
  | 'Mountains'
  | 'Nature'
  | 'Historical Places'
  | 'Adventure'
  | 'Shopping'
  | 'Restaurants'
  | 'Cultural Attractions'
  | 'Museums'
  | 'Parks';

export type PackingPriority = 'Essential' | 'High' | 'Medium' | 'Low';

export type ExpenseCategory =
  | 'Transportation'
  | 'Accommodation'
  | 'Food'
  | 'Shopping'
  | 'Tickets'
  | 'Entertainment'
  | 'Emergency'
  | 'Other';

export type DocumentCategory =
  | 'Flight Ticket'
  | 'Bus Ticket'
  | 'Train Ticket'
  | 'Hotel Booking'
  | 'Confirmation'
  | 'Contact'
  | 'Other';

export type NotificationType =
  | 'TripReminder'
  | 'PackingReminder'
  | 'MissingEssential'
  | 'ActivityUpcoming'
  | 'BudgetWarning'
  | 'BookingReminder'
  | 'TripInvitation';

export interface NotificationPrefs {
  tripReminders: boolean;
  packingReminders: boolean;
  budgetWarnings: boolean;
  invitations: boolean;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  role: UserRole;
  currency?: CurrencyCode;
  bio?: string;
  homeCity?: string;
  notificationPrefs?: NotificationPrefs;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Trip {
  id: string;
  ownerId: string;
  memberIds: string[];
  pendingInviteEmails?: string[];
  tripName: string;
  destination: string;
  country: string;
  startDate: string;
  endDate: string;
  travelersCount: number;
  tripType: TripType;
  estimatedBudget: number;
  currency: CurrencyCode;
  description?: string;
  coverImage?: string;
  status: TripStatus;
  archived: boolean;
  lat?: number;
  lng?: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface TripMember {
  id: string;
  tripId: string;
  userId: string;
  displayName: string;
  email?: string;
  role: 'Owner' | 'Editor' | 'Viewer';
  joinedAt?: unknown;
}

export interface Destination {
  id: string;
  name: string;
  country: string;
  category: DestinationCategory;
  description: string;
  imageUrl?: string;
  lat?: number;
  lng?: number;
  bestSeason?: string;
  highlights?: string[];
  isSampleData: boolean;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SavedDestination {
  id: string;
  userId: string;
  destinationId: string;
  destinationName: string;
  country: string;
  category?: string;
  imageUrl?: string;
  lat?: number;
  lng?: number;
  notes?: string;
  createdAt?: unknown;
}

export interface PackingItem {
  id: string;
  tripId: string;
  ownerId: string;
  memberIds: string[];
  name: string;
  category: string;
  quantity: number;
  priority: PackingPriority;
  isPacked: boolean;
  notes?: string;
  aiSuggested?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PackingTemplateItem {
  name: string;
  category: string;
  quantity: number;
  priority: PackingPriority;
  notes?: string;
}

export interface PackingTemplate {
  id: string;
  ownerId: string;
  name: string;
  tripType: string;
  items: PackingTemplateItem[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Activity {
  id: string;
  tripId: string;
  ownerId: string;
  memberIds: string[];
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  location?: string;
  description?: string;
  estimatedCost: number;
  transportation?: string;
  notes?: string;
  orderIndex: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Expense {
  id: string;
  tripId: string;
  ownerId: string;
  memberIds: string[];
  title: string;
  category: ExpenseCategory;
  estimatedAmount: number;
  actualAmount: number;
  currency: CurrencyCode;
  date: string;
  paidBy?: string;
  notes?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface TravelDocument {
  id: string;
  tripId: string;
  ownerId: string;
  memberIds: string[];
  title: string;
  category: DocumentCategory;
  referenceNumber?: string;
  contactInfo?: string;
  notes?: string;
  fileId?: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AppNotification {
  id: string;
  userId: string;
  tripId?: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  actionUrl?: string;
  dedupeKey?: string;
  createdAt?: unknown;
}

export interface Invitation {
  id: string;
  tripId: string;
  tripName: string;
  inviterId: string;
  inviterName?: string;
  inviteeEmail: string;
  role: 'Editor' | 'Viewer';
  status: 'Pending' | 'Accepted' | 'Rejected';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface DestinationVote {
  id: string;
  tripId: string;
  ownerId: string;
  memberIds: string[];
  destinationName: string;
  country?: string;
  notes?: string;
  voterIds: string[];
  proposedBy?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface TripNote {
  id: string;
  tripId: string;
  ownerId: string;
  memberIds: string[];
  title: string;
  content: string;
  authorId: string;
  authorName?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface JournalEntry {
  id: string;
  tripId: string;
  ownerId: string;
  memberIds: string[];
  title: string;
  content: string;
  destination?: string;
  travelDate: string;
  photos?: string[];
  mood?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ContentReport {
  id: string;
  reporterId: string;
  targetType: 'destination' | 'note' | 'journal' | 'other';
  targetId: string;
  reason: string;
  status: 'Open' | 'Resolved' | 'Dismissed';
  createdAt?: unknown;
  updatedAt?: unknown;
}
