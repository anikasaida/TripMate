import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AlertTriangle, X } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';
import { TripDataProvider } from './contexts/TripDataContext';
import { ToastProvider } from './contexts/ToastContext';
import { ProtectedRoute, AdminRoute } from './components/Auth/ProtectedRoute';

import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPages';
import { DashboardPage } from './pages/DashboardPage';
import { TripsPage } from './pages/TripsPage';
import { CreateTripPage } from './pages/CreateTripPage';
import { TripDetailPage } from './pages/TripDetailPage';
import { DestinationsPage } from './pages/DestinationsPage';
import { PackingChecklistPage } from './pages/PackingChecklistPage';
import { AiPackingPage } from './pages/AiPackingPage';
import { ItineraryPlannerPage } from './pages/ItineraryPlannerPage';
import { BudgetTrackerPage } from './pages/BudgetTrackerPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { WeatherPage } from './pages/WeatherPage';
import { AiAssistantPage } from './pages/AiAssistantPage';
import { JournalPage } from './pages/JournalPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';

const MAPS_QUOTA_DOCS_URL =
  'https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors';

export default function App() {
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);
  const [quotaBannerDismissed, setQuotaBannerDismissed] = useState(false);

  useEffect(() => {
    const handleQuotaExceeded = () => {
      setMapsQuotaExceeded(true);
      setQuotaBannerDismissed(false);
    };
    window.addEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    return () => {
      window.removeEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    };
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <TripDataProvider>
          <ToastProvider>
            {mapsQuotaExceeded && !quotaBannerDismissed && (
              <div
                role="alert"
                className="sticky top-0 z-50 bg-amber-50 border-b border-amber-300 px-4 py-2.5 text-amber-950 text-xs sm:text-sm flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" />
                  <span>
                    Google Maps usage quota exceeded for this demo key. Review quota options in the{' '}
                    <a
                      href={MAPS_QUOTA_DOCS_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-semibold text-amber-900 hover:text-amber-950"
                    >
                      Google Maps AI Studio Quota Guide
                    </a>
                    .
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setQuotaBannerDismissed(true)}
                  className="p-1 text-amber-800 hover:text-amber-950"
                  aria-label="Dismiss quota notice"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <BrowserRouter>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/explore" element={<DestinationsPage publicView />} />
                <Route path="/login" element={<AuthPage mode="login" />} />
                <Route path="/register" element={<AuthPage mode="register" />} />
                <Route path="/forgot-password" element={<AuthPage mode="forgot" />} />

                {/* Authenticated Traveler Routes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/trips"
                  element={
                    <ProtectedRoute>
                      <TripsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/trips/new"
                  element={
                    <ProtectedRoute>
                      <CreateTripPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/trips/:tripId"
                  element={
                    <ProtectedRoute>
                      <TripDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/trips/:tripId/edit"
                  element={
                    <ProtectedRoute>
                      <CreateTripPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/destinations"
                  element={
                    <ProtectedRoute>
                      <DestinationsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/packing"
                  element={
                    <ProtectedRoute>
                      <PackingChecklistPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/ai-packing"
                  element={
                    <ProtectedRoute>
                      <AiPackingPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/itinerary"
                  element={
                    <ProtectedRoute>
                      <ItineraryPlannerPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/budget"
                  element={
                    <ProtectedRoute>
                      <BudgetTrackerPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/documents"
                  element={
                    <ProtectedRoute>
                      <DocumentsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/weather"
                  element={
                    <ProtectedRoute>
                      <WeatherPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/ai-assistant"
                  element={
                    <ProtectedRoute>
                      <AiAssistantPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/journal"
                  element={
                    <ProtectedRoute>
                      <JournalPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/notifications"
                  element={
                    <ProtectedRoute>
                      <NotificationsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />

                {/* Admin Protected Route */}
                <Route
                  path="/admin"
                  element={
                    <AdminRoute>
                      <AdminDashboardPage />
                    </AdminRoute>
                  }
                />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </ToastProvider>
        </TripDataProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
