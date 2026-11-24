import React, { useState } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Luggage,
  Compass,
  CheckSquare,
  Sparkles,
  CalendarDays,
  Wallet,
  FileText,
  CloudSun,
  MessageSquare,
  Bell,
  BookOpen,
  User,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Plus,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTripData } from '../../contexts/TripDataContext';

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeCount?: number;
}

export const WorkspaceLayout: React.FC<{
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, subtitle, actions, children }) => {
  const { profile, isAdmin, logout } = useAuth();
  const { notifications, receivedInvitations } = useTripData();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const unreadCount =
    notifications.filter((n) => !n.isRead).length +
    receivedInvitations.filter((i) => i.status === 'Pending').length;

  const primaryNav: NavItem[] = [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { label: 'My Trips', to: '/trips', icon: Luggage },
    { label: 'Explore Places', to: '/destinations', icon: Compass },
    { label: 'Packing Checklist', to: '/packing', icon: CheckSquare },
    { label: 'AI Packing', to: '/ai-packing', icon: Sparkles },
    { label: 'Itinerary Planner', to: '/itinerary', icon: CalendarDays },
    { label: 'Budget Tracker', to: '/budget', icon: Wallet },
    { label: 'Travel Documents', to: '/documents', icon: FileText },
    { label: 'Weather Info', to: '/weather', icon: CloudSun },
    { label: 'AI Assistant', to: '/ai-assistant', icon: MessageSquare },
    { label: 'Trip Journal', to: '/journal', icon: BookOpen },
    { label: 'Notifications', to: '/notifications', icon: Bell, badgeCount: unreadCount },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const renderSidebarLinks = (onNavigate?: () => void) => (
    <div className="flex flex-col h-full justify-between">
      <div className="space-y-6">
        <div className="px-4 pt-5 pb-2 flex items-center justify-between">
          <Link
            to="/dashboard"
            onClick={onNavigate}
            className="font-display text-xl font-bold tracking-tight text-white whitespace-nowrap"
          >
            TripMate
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden text-slate-300 hover:text-white p-1"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-3">
          <Link
            to="/trips/new"
            onClick={onNavigate}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#0D7377] hover:bg-[#0F766E] text-white text-sm font-medium transition-colors whitespace-nowrap"
          >
            <Plus className="h-4 w-4 shrink-0" />
            Plan New Trip
          </Link>
        </div>

        <nav className="px-3 space-y-1">
          {primaryNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-white/12 text-white'
                      : 'text-slate-300 hover:text-white hover:bg-white/6'
                  }`
                }
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.badgeCount && item.badgeCount > 0 ? (
                  <span className="font-mono text-xs tabular-nums text-[#5EEAD4]">
                    {item.badgeCount}
                  </span>
                ) : null}
              </NavLink>
            );
          })}

          {isAdmin && (
            <NavLink
              to="/admin"
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-white/12 text-white'
                    : 'text-amber-200 hover:text-white hover:bg-white/6'
                }`
              }
            >
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>Admin Console</span>
            </NavLink>
          )}
        </nav>
      </div>

      <div className="p-3 border-t border-white/10 space-y-1">
        <NavLink
          to="/profile"
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive ? 'bg-white/12 text-white' : 'text-slate-300 hover:text-white hover:bg-white/6'
            }`
          }
        >
          <User className="h-4 w-4 shrink-0" />
          <span className="truncate">{profile?.displayName || 'Profile Settings'}</span>
        </NavLink>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/6 transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  const breadcrumbSegment = location.pathname.split('/').filter(Boolean)[0] || 'dashboard';

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-[260px] shrink-0 bg-[#0B1D33] text-white sticky top-0 h-screen overflow-y-auto">
        {renderSidebarLinks()}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative w-[270px] max-w-[85vw] bg-[#0B1D33] text-white h-full overflow-y-auto z-10">
            {renderSidebarLinks(() => setMobileOpen(false))}
          </aside>
        </div>
      )}

      {/* Main Content Viewport */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 capitalize">
                <span>TripMate</span>
                <span aria-hidden="true">/</span>
                <span>{breadcrumbSegment}</span>
              </div>
              <h1 className="font-display text-base sm:text-lg font-semibold text-slate-900 truncate">
                {title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {actions}
            <Link
              to="/notifications"
              className="relative p-2 text-slate-600 hover:text-slate-900 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="ml-1 font-mono text-[11px] font-semibold text-[#0D7377] tabular-nums">
                  {unreadCount}
                </span>
              )}
            </Link>
            <Link
              to="/profile"
              className="hidden sm:flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <div className="h-6 w-6 rounded-full bg-[#0B1D33] text-white text-xs font-semibold flex items-center justify-center shrink-0">
                {(profile?.displayName || 'T')[0]?.toUpperCase()}
              </div>
              <span className="text-xs font-medium text-slate-700 max-w-[120px] truncate">
                {profile?.displayName || 'Traveler'}
              </span>
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1360px] w-full mx-auto">
          {subtitle && <p className="text-sm text-slate-600 mb-6">{subtitle}</p>}
          {children}
        </main>
      </div>
    </div>
  );
};
