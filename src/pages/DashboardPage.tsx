import React from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Luggage,
  Compass,
  CheckSquare,
  Wallet,
  CalendarDays,
  Bell,
  Sparkles,
  ArrowRight,
  Bookmark,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { WorkspaceLayout } from '../components/Layout/WorkspaceLayout';
import { useAuth } from '../contexts/AuthContext';
import { useTripData } from '../contexts/TripDataContext';
import { ImageWithFallback } from '../components/Common/ImageWithFallback';
import { resolveDestinationImage } from '../data/destinationsSeed';

export const DashboardPage: React.FC = () => {
  const { profile } = useAuth();
  const {
    trips,
    packingItems,
    activities,
    expenses,
    savedDestinations,
    notifications,
    dataReady,
  } = useTripData();

  const activeTrips = trips.filter((t) => !t.archived);
  const upcomingTrips = activeTrips.filter((t) => t.status === 'Upcoming');
  const ongoingTrips = activeTrips.filter((t) => t.status === 'Ongoing');
  const completedTrips = activeTrips.filter((t) => t.status === 'Completed');

  const packedCount = packingItems.filter((i) => i.isPacked).length;
  const packingProgress =
    packingItems.length > 0 ? Math.round((packedCount / packingItems.length) * 100) : 0;

  const totalEstimatedBudget = activeTrips.reduce(
    (sum, t) => sum + (Number(t.estimatedBudget) || 0),
    0
  );
  const totalActualSpent = expenses.reduce((sum, e) => sum + (Number(e.actualAmount) || 0), 0);

  const todayStr = new Date().toISOString().slice(0, 10);
  const upcomingActivities = activities
    .filter((a) => !a.date || a.date >= todayStr)
    .slice(0, 5);
  const recentExpenses = expenses.slice(0, 5);
  const unreadNotifications = notifications.filter((n) => !n.isRead).slice(0, 4);

  // Category spend chart data from live Firestore expenses
  const categoryTotals: Record<string, { category: string; estimated: number; actual: number }> =
    {};
  expenses.forEach((exp) => {
    if (!categoryTotals[exp.category]) {
      categoryTotals[exp.category] = { category: exp.category, estimated: 0, actual: 0 };
    }
    categoryTotals[exp.category].estimated += Number(exp.estimatedAmount) || 0;
    categoryTotals[exp.category].actual += Number(exp.actualAmount) || 0;
  });
  const expenseChartData = Object.values(categoryTotals);

  // Trip activity breakdown by trip
  const tripActivityData = activeTrips.slice(0, 6).map((t) => ({
    name: t.tripName.length > 14 ? `${t.tripName.slice(0, 14)}…` : t.tripName,
    activities: activities.filter((a) => a.tripId === t.id).length,
    packed: packingItems.filter((p) => p.tripId === t.id && p.isPacked).length,
  }));

  const preferredCurrency = profile?.currency || activeTrips[0]?.currency || 'USD';

  return (
    <WorkspaceLayout
      title={`Welcome back, ${profile?.displayName || 'Traveler'}`}
      subtitle="Live overview of your trips, packing readiness, scheduled activities, and travel spending."
      actions={
        <Link
          to="/trips/new"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#0D7377] hover:bg-[#0F766E] text-white text-xs font-medium transition-colors whitespace-nowrap"
        >
          <Plus className="h-3.5 w-3.5" />
          New Trip
        </Link>
      }
    >
      {!dataReady ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-28 rounded-xl bg-slate-200 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span>Total Trips</span>
                <Luggage className="h-4 w-4 text-[#0D7377]" />
              </div>
              <p className="font-display text-2xl font-bold text-[#0B1D33] tabular-nums">
                {activeTrips.length}
              </p>
              <p className="text-xs text-slate-500 mt-1 tabular-nums">
                {upcomingTrips.length} upcoming · {ongoingTrips.length} ongoing ·{' '}
                {completedTrips.length} completed
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span>Packing Progress</span>
                <CheckSquare className="h-4 w-4 text-[#0369A1]" />
              </div>
              <p className="font-display text-2xl font-bold text-[#0B1D33] tabular-nums">
                {packingProgress}%
              </p>
              <div className="mt-2 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#0D7377] rounded-full transition-all"
                  style={{ width: `${packingProgress}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1.5 tabular-nums">
                {packedCount} of {packingItems.length} items packed
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span>Estimated Budget</span>
                <Wallet className="h-4 w-4 text-[#0D7377]" />
              </div>
              <p className="font-display text-2xl font-bold text-[#0B1D33] font-mono tabular-nums">
                {totalEstimatedBudget.toLocaleString()} {preferredCurrency}
              </p>
              <p className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
                Spent: {totalActualSpent.toLocaleString()} {preferredCurrency}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span>Saved Destinations</span>
                <Bookmark className="h-4 w-4 text-[#0369A1]" />
              </div>
              <p className="font-display text-2xl font-bold text-[#0B1D33] tabular-nums">
                {savedDestinations.length}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {unreadNotifications.length} unread alert{unreadNotifications.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="bg-[#F4F1EA] border border-[#E8E2D5] rounded-xl p-4 mb-6 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-medium text-slate-700">Quick Actions</span>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to="/trips/new"
                className="px-3 py-1.5 rounded-lg bg-[#0B1D33] text-white text-xs font-medium hover:bg-[#132C4A] transition-colors inline-flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Create Trip
              </Link>
              <Link
                to="/ai-packing"
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs font-medium hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5 text-[#0D7377]" />
                AI Packing Assistant
              </Link>
              <Link
                to="/destinations"
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs font-medium hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5"
              >
                <Compass className="h-3.5 w-3.5 text-[#0369A1]" />
                Explore Destinations
              </Link>
              <Link
                to="/budget"
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs font-medium hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5"
              >
                <Wallet className="h-3.5 w-3.5 text-[#0D7377]" />
                Track Expenses
              </Link>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-display text-base font-semibold text-[#0B1D33]">
                    Expense Breakdown
                  </h2>
                  <p className="text-xs text-slate-500">Estimated vs. actual spend by category</p>
                </div>
                <Link to="/budget" className="text-xs font-medium text-[#0D7377] hover:underline">
                  Full Tracker
                </Link>
              </div>
              {expenseChartData.length === 0 ? (
                <div className="h-56 flex flex-col items-center justify-center text-center border border-dashed border-slate-200 rounded-lg p-6">
                  <Wallet className="h-7 w-7 text-slate-400 mb-2" />
                  <p className="text-sm font-medium text-slate-700">No expenses logged yet</p>
                  <p className="text-xs text-slate-500 mt-1 mb-3">
                    Add estimated or actual expenses to visualize spending.
                  </p>
                  <Link
                    to="/budget"
                    className="px-3 py-1.5 rounded-lg bg-[#0D7377] text-white text-xs font-medium"
                  >
                    Log First Expense
                  </Link>
                </div>
              ) : (
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={expenseChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#475569' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
                      <Tooltip />
                      <Bar dataKey="estimated" name="Estimated" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="actual" name="Actual" fill="#0D7377" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-display text-base font-semibold text-[#0B1D33]">
                    Trip Activity &amp; Readiness
                  </h2>
                  <p className="text-xs text-slate-500">Scheduled activities and packed items per trip</p>
                </div>
                <Link to="/itinerary" className="text-xs font-medium text-[#0D7377] hover:underline">
                  Itinerary
                </Link>
              </div>
              {tripActivityData.length === 0 ? (
                <div className="h-56 flex flex-col items-center justify-center text-center border border-dashed border-slate-200 rounded-lg p-6">
                  <CalendarDays className="h-7 w-7 text-slate-400 mb-2" />
                  <p className="text-sm font-medium text-slate-700">No active trips yet</p>
                  <p className="text-xs text-slate-500 mt-1 mb-3">
                    Create your first trip to begin tracking activities and packing.
                  </p>
                  <Link
                    to="/trips/new"
                    className="px-3 py-1.5 rounded-lg bg-[#0D7377] text-white text-xs font-medium"
                  >
                    Create First Trip
                  </Link>
                </div>
              ) : (
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={tripActivityData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
                      <Tooltip />
                      <Bar dataKey="activities" name="Activities" fill="#0369A1" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="packed" name="Packed Items" fill="#0D7377" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Trips & Activity Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Active Trips List */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-base font-semibold text-[#0B1D33]">
                  Upcoming &amp; Ongoing Trips
                </h2>
                <Link
                  to="/trips"
                  className="text-xs font-medium text-[#0D7377] hover:underline inline-flex items-center gap-1"
                >
                  View all <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {activeTrips.length === 0 ? (
                <div className="py-10 text-center">
                  <Luggage className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-700">No trips created yet</p>
                  <p className="text-xs text-slate-500 mt-1 mb-4">
                    Plan a trip to unlock personalized checklists, itineraries, and budget tracking.
                  </p>
                  <Link
                    to="/trips/new"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0D7377] text-white text-xs font-medium"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Plan New Trip
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {activeTrips.slice(0, 4).map((trip) => {
                    const tItems = packingItems.filter((p) => p.tripId === trip.id);
                    const tPacked = tItems.filter((p) => p.isPacked).length;
                    const tPct = tItems.length ? Math.round((tPacked / tItems.length) * 100) : 0;
                    return (
                      <Link
                        key={trip.id}
                        to={`/trips/${trip.id}`}
                        className="py-3.5 flex items-center gap-4 hover:bg-slate-50/70 px-2 rounded-lg transition-colors"
                      >
                        <div className="h-14 w-20 rounded-lg overflow-hidden shrink-0 bg-slate-100">
                          <ImageWithFallback
                            src={resolveDestinationImage(trip.destination, trip.coverImage)}
                            alt={trip.tripName}
                            title={trip.destination}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-display text-sm font-semibold text-[#0B1D33] truncate">
                            {trip.tripName}
                          </p>
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            {trip.destination}, {trip.country} ·{' '}
                            <span className="font-mono tabular-nums">
                              {trip.startDate} – {trip.endDate}
                            </span>
                          </p>
                          <p className="text-xs text-slate-500 mt-1 tabular-nums">
                            {trip.status} · Packing {tPct}% ({tPacked}/{tItems.length})
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-mono text-xs font-semibold text-slate-900 tabular-nums">
                            {Number(trip.estimatedBudget).toLocaleString()} {trip.currency}
                          </p>
                          <p className="text-[11px] text-slate-500">{trip.tripType}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column: Upcoming Activities, Recent Expenses, Notifications */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-display text-base font-semibold text-[#0B1D33]">
                    Upcoming Activities
                  </h2>
                  <Link to="/itinerary" className="text-xs font-medium text-[#0D7377] hover:underline">
                    Schedule
                  </Link>
                </div>
                {upcomingActivities.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4">
                    No upcoming activities scheduled yet.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {upcomingActivities.map((act) => (
                      <div key={act.id} className="py-2.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{act.title}</p>
                          <p className="text-xs text-slate-500 truncate">
                            {act.location || 'Scheduled spot'}
                          </p>
                        </div>
                        <span className="font-mono text-xs text-slate-600 tabular-nums shrink-0">
                          {act.date} {act.startTime}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-display text-base font-semibold text-[#0B1D33]">
                    Recent Expenses &amp; Alerts
                  </h2>
                  <Link to="/notifications" className="text-xs font-medium text-[#0D7377] hover:underline">
                    Alerts
                  </Link>
                </div>
                {recentExpenses.length === 0 && unreadNotifications.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4">No recent expenses or unread alerts.</p>
                ) : (
                  <div className="space-y-2.5">
                    {unreadNotifications.slice(0, 2).map((n) => (
                      <Link
                        key={n.id}
                        to={n.actionUrl || '/notifications'}
                        className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[#F4F1EA] text-xs text-slate-800 hover:bg-[#ECE7DC]"
                      >
                        <Bell className="h-3.5 w-3.5 text-[#0D7377] shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{n.title}</p>
                          <p className="text-slate-600 line-clamp-1">{n.message}</p>
                        </div>
                      </Link>
                    ))}
                    {recentExpenses.slice(0, 3).map((exp) => (
                      <div
                        key={exp.id}
                        className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 last:border-0"
                      >
                        <span className="text-slate-700 truncate pr-2">
                          {exp.title} · <span className="text-slate-500">{exp.category}</span>
                        </span>
                        <span className="font-mono font-semibold text-slate-900 tabular-nums shrink-0">
                          {Number(exp.actualAmount).toLocaleString()} {exp.currency}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </WorkspaceLayout>
  );
};
