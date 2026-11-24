import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  Check,
  X,
  Trash2,
  MailOpen,
  Mail,
  Settings,
} from 'lucide-react';
import { WorkspaceLayout } from '../components/Layout/WorkspaceLayout';
import { useAuth } from '../contexts/AuthContext';
import { useTripData } from '../contexts/TripDataContext';
import { useToast } from '../contexts/ToastContext';
import {
  markNotificationRead,
  deleteNotification,
  respondToInvitation,
} from '../services/firestoreService';
import { Invitation } from '../types';

export const NotificationsPage: React.FC = () => {
  const { firebaseUser, profile, updateUserProfile } = useAuth();
  const { notifications, receivedInvitations } = useTripData();
  const { showToast } = useToast();

  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const prefs = profile?.notificationPrefs || {
    tripReminders: true,
    packingReminders: true,
    budgetWarnings: true,
    invitations: true,
  };

  const pendingInvitations = useMemo(
    () => receivedInvitations.filter((i) => i.status === 'Pending'),
    [receivedInvitations]
  );

  const visibleNotifications = useMemo(() => {
    if (filter === 'unread') return notifications.filter((n) => !n.isRead);
    return notifications;
  }, [notifications, filter]);

  const handleTogglePref = async (key: keyof typeof prefs) => {
    try {
      await updateUserProfile({
        notificationPrefs: {
          ...prefs,
          [key]: !prefs[key],
        },
      });
      showToast('Notification preference updated.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update preferences.', 'error');
    }
  };

  const handleInvitationResponse = async (inv: Invitation, accept: boolean) => {
    if (!firebaseUser || !firebaseUser.email) return;
    try {
      await respondToInvitation(
        inv,
        {
          uid: firebaseUser.uid,
          displayName: profile?.displayName || firebaseUser.displayName || 'Traveler',
          email: firebaseUser.email,
        },
        accept
      );
      showToast(
        accept ? `Joined "${inv.tripName}".` : `Declined invitation to "${inv.tripName}".`,
        accept ? 'success' : 'info'
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to respond to invitation.', 'error');
    }
  };

  return (
    <WorkspaceLayout
      title="Notification Center"
      subtitle="Stay ahead of departure countdowns, missing essentials, budget limits, and trip invitations."
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-6">
          {/* Pending Trip Invitations */}
          {pendingInvitations.length > 0 && (
            <div className="bg-[#F4F1EA] border border-[#E5DEC9] rounded-xl p-5 space-y-3">
              <h2 className="font-display text-base font-semibold text-[#0B1D33]">
                Pending Trip Invitations ({pendingInvitations.length})
              </h2>
              <div className="space-y-2.5">
                {pendingInvitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#0B1D33]">{inv.tripName}</p>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Invited by {inv.inviterName || 'Trip Owner'} as {inv.role}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleInvitationResponse(inv, true)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0D7377] text-white text-xs font-medium"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInvitationResponse(inv, false)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium"
                      >
                        <X className="h-3.5 w-3.5" />
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alerts List */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-[#0B1D33]">
                Travel Alerts ({visibleNotifications.length})
              </h2>
              <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1 rounded-md font-medium ${
                    filter === 'all' ? 'bg-white text-[#0B1D33]' : 'text-slate-500'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('unread')}
                  className={`px-3 py-1 rounded-md font-medium ${
                    filter === 'unread' ? 'bg-white text-[#0B1D33]' : 'text-slate-500'
                  }`}
                >
                  Unread
                </button>
              </div>
            </div>

            {visibleNotifications.length === 0 ? (
              <div className="p-12 text-center">
                <Bell className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-800">You are all caught up</p>
                <p className="text-xs text-slate-500 mt-1">
                  Reminders appear here when departures approach or essential items remain unpacked.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {visibleNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-5 flex items-start justify-between gap-4 ${
                      notif.isRead ? 'bg-white' : 'bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono text-[#0D7377] font-semibold">{notif.type}</span>
                        {!notif.isRead && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-amber-700 font-medium">Unread</span>
                          </>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-slate-900">{notif.title}</h3>
                      <p className="text-xs text-slate-600">{notif.message}</p>
                      {notif.actionUrl && (
                        <Link
                          to={notif.actionUrl}
                          className="inline-block text-xs font-medium text-[#0D7377] hover:underline pt-1"
                        >
                          Open Trip Section
                        </Link>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => markNotificationRead(notif.id, !notif.isRead)}
                        className="p-1.5 text-slate-400 hover:text-[#0B1D33] rounded-md"
                        title={notif.isRead ? 'Mark unread' : 'Mark read'}
                      >
                        {notif.isRead ? (
                          <Mail className="h-4 w-4" />
                        ) : (
                          <MailOpen className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteNotification(notif.id)}
                        className="p-1.5 text-slate-400 hover:text-red-700 rounded-md"
                        title="Delete alert"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Alert Preferences */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-[#0D7377]" />
            <h2 className="font-display text-base font-semibold text-[#0B1D33]">
              Alert Preferences
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Control which automated smart reminders are generated for your account.
          </p>

          <div className="space-y-3 pt-1">
            {[
              {
                key: 'tripReminders' as const,
                label: 'Upcoming Trip Countdowns',
                desc: 'Notify within 7 days of departure.',
              },
              {
                key: 'packingReminders' as const,
                label: 'Unpacked Essential Warnings',
                desc: 'Alert when 3+ essential items are unpacked.',
              },
              {
                key: 'budgetWarnings' as const,
                label: 'Budget Limit Warnings',
                desc: 'Alert when actual spending exceeds trip budget.',
              },
              {
                key: 'invitations' as const,
                label: 'Trip Invitations',
                desc: 'Show incoming collaboration requests.',
              },
            ].map((item) => (
              <label
                key={item.key}
                className="flex items-start justify-between gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"
              >
                <div>
                  <p className="text-xs font-semibold text-slate-900">{item.label}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                </div>
                <input
                  type="checkbox"
                  checked={prefs[item.key]}
                  onChange={() => handleTogglePref(item.key)}
                  className="mt-1 h-4 w-4 accent-[#0D7377]"
                />
              </label>
            ))}
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  );
};
