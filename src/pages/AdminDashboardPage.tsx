import React, { useEffect, useState, useMemo } from 'react';
import {
  ShieldCheck,
  Users,
  Luggage,
  Compass,
  Flag,
  Trash2,
  CheckCircle2,
  XCircle,
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
import { useToast } from '../contexts/ToastContext';
import {
  fetchAllUsersAdmin,
  fetchAllTripsAdmin,
  fetchReportsAdmin,
  setUserRoleAdmin,
  updateReportStatusAdmin,
  deleteDestination,
} from '../services/firestoreService';
import { ContentReport, Trip, UserProfile } from '../types';

export const AdminDashboardPage: React.FC = () => {
  const { firebaseUser } = useAuth();
  const { destinations } = useTripData();
  const { showToast } = useToast();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [u, t, r] = await Promise.all([
        fetchAllUsersAdmin(),
        fetchAllTripsAdmin(),
        fetchReportsAdmin(),
      ]);
      setUsers(u);
      setAllTrips(t);
      setReports(r);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load admin console data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const tripStatusChart = useMemo(() => {
    const counts = { Upcoming: 0, Ongoing: 0, Completed: 0 };
    allTrips.forEach((t) => {
      if (t.status in counts) counts[t.status] += 1;
    });
    return Object.entries(counts).map(([status, count]) => ({ status, count }));
  }, [allTrips]);

  const handleToggleRole = async (target: UserProfile) => {
    if (!firebaseUser) return;
    if (target.uid === firebaseUser.uid) {
      showToast('You cannot remove your own admin role.', 'info');
      return;
    }
    const nextRole = target.role === 'ADMIN' ? 'USER' : 'ADMIN';
    try {
      await setUserRoleAdmin(target, nextRole, firebaseUser.uid);
      setUsers((prev) =>
        prev.map((u) => (u.uid === target.uid ? { ...u, role: nextRole } : u))
      );
      showToast(`Updated ${target.displayName} role to ${nextRole}.`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update role.', 'error');
    }
  };

  const handleReportStatus = async (reportId: string, status: ContentReport['status']) => {
    try {
      await updateReportStatusAdmin(reportId, status);
      setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, status } : r)));
      showToast(`Report marked as ${status}.`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update report.', 'error');
    }
  };

  const handleDeleteDestination = async (destId: string, name: string) => {
    try {
      await deleteDestination(destId);
      showToast(`Removed custom destination "${name}".`, 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete destination.', 'error');
    }
  };

  const customDestinations = destinations.filter((d) => !d.isSampleData);
  const openReportsCount = reports.filter((r) => r.status === 'Open').length;

  return (
    <WorkspaceLayout
      title="Admin Control Center"
      subtitle="Platform analytics, user role governance, destination catalog review, and moderation queue."
    >
      <div className="space-y-6">
        {/* Platform Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Registered Users</span>
              <Users className="h-4 w-4 text-[#0D7377]" />
            </div>
            <p className="font-mono text-2xl font-bold text-[#0B1D33] tabular-nums mt-2">
              {loading ? '—' : users.length}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Total Platform Trips</span>
              <Luggage className="h-4 w-4 text-[#0D7377]" />
            </div>
            <p className="font-mono text-2xl font-bold text-[#0B1D33] tabular-nums mt-2">
              {loading ? '—' : allTrips.length}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Published Destinations</span>
              <Compass className="h-4 w-4 text-[#0D7377]" />
            </div>
            <p className="font-mono text-2xl font-bold text-[#0B1D33] tabular-nums mt-2">
              {destinations.length}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Open Moderation Reports</span>
              <Flag className="h-4 w-4 text-amber-600" />
            </div>
            <p className="font-mono text-2xl font-bold text-[#0B1D33] tabular-nums mt-2">
              {loading ? '—' : openReportsCount}
            </p>
          </div>
        </div>

        {/* Platform Trips Chart + Reported Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="font-display text-sm font-semibold text-[#0B1D33] mb-4">
              Trips by Lifecycle Status
            </h2>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tripStatusChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Trips" fill="#0D7377" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold text-[#0B1D33]">
                Content Reports Queue ({reports.length})
              </h2>
            </div>
            {reports.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">
                No reported content items at this time.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                {reports.map((rep) => (
                  <div key={rep.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {rep.targetType} · {rep.targetId}
                      </p>
                      <p className="text-slate-600 mt-0.5">{rep.reason}</p>
                      <p className="font-mono text-[11px] text-slate-500 mt-0.5">
                        Status: {rep.status}
                      </p>
                    </div>
                    {rep.status === 'Open' && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleReportStatus(rep.id, 'Resolved')}
                          className="p-1.5 rounded border border-slate-200 text-emerald-700 hover:bg-emerald-50"
                          title="Resolve report"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReportStatus(rep.id, 'Dismissed')}
                          className="p-1.5 rounded border border-slate-200 text-slate-500 hover:bg-slate-50"
                          title="Dismiss report"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* User Management Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#0D7377]" />
            <h2 className="font-display text-base font-semibold text-[#0B1D33]">
              User Directory & Role Management
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
                  <th className="py-3 px-4">Traveler</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4 text-right">Governance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.uid} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-medium text-slate-900">{u.displayName}</td>
                    <td className="py-3 px-4 text-xs text-slate-600">{u.email}</td>
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-[#0D7377]">
                      {u.role}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleToggleRole(u)}
                        className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700"
                      >
                        {u.role === 'ADMIN' ? 'Demote to USER' : 'Promote to ADMIN'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Custom Destinations Moderation */}
        {customDestinations.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <h2 className="font-display text-base font-semibold text-[#0B1D33]">
              Custom Destination Entries ({customDestinations.length})
            </h2>
            <div className="divide-y divide-slate-100">
              {customDestinations.map((dest) => (
                <div key={dest.id} className="py-3 flex items-center justify-between gap-4 text-sm">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {dest.name}, {dest.country}
                    </p>
                    <p className="text-xs text-slate-500">{dest.category}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteDestination(dest.id, dest.name)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-red-200 text-red-700 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
};
