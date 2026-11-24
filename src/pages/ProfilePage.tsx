import React, { useState, useEffect } from 'react';
import { User, Lock, Save, Upload } from 'lucide-react';
import { WorkspaceLayout } from '../components/Layout/WorkspaceLayout';
import { PrivateUploadImage } from '../components/Common/PrivateUploadImage';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { apiClient } from '../services/api';
import { CurrencyCode } from '../types';

const CURRENCIES: CurrencyCode[] = ['USD', 'BDT', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY'];

export const ProfilePage: React.FC = () => {
  const { firebaseUser, profile, updateUserProfile, changePassword } = useAuth();
  const { showToast } = useToast();

  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [homeCity, setHomeCity] = useState(profile?.homeCity || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [currency, setCurrency] = useState<CurrencyCode>(profile?.currency || 'USD');
  const [photoURL, setPhotoURL] = useState(profile?.photoURL || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName || '');
    setHomeCity(profile.homeCity || '');
    setBio(profile.bio || '');
    setCurrency(profile.currency || 'USD');
    setPhotoURL(profile.photoURL || '');
  }, [profile]);

  const isPasswordProvider = Boolean(
    firebaseUser?.providerData.some((p) => p.providerId === 'password')
  );

  const handleAvatarUpload = async (file: File | null) => {
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('tripId', 'profile');
      const res = await apiClient.post<{ fileId: string }>('/uploads', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const uploadedPath = `/api/uploads/${res.data.fileId}`;
      setPhotoURL(uploadedPath);
      await updateUserProfile({ photoURL: uploadedPath });
      showToast('Profile picture updated.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to upload profile photo.', 'error');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateUserProfile({
        displayName,
        homeCity,
        bio,
        currency,
        photoURL,
      });
      showToast('Profile details saved.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update profile.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showToast('New password must be at least 6 characters.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('New password and confirmation do not match.', 'error');
      return;
    }
    setUpdatingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      showToast('Password updated successfully.', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to change password.', 'error');
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <WorkspaceLayout
      title="Profile Settings"
      subtitle="Manage your traveler profile, preferred default currency, avatar, and account security."
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleSaveProfile}
          className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-5"
        >
          <div className="flex items-center gap-4 pb-5 border-b border-slate-100">
            <div className="h-16 w-16 rounded-full overflow-hidden bg-[#0B1D33] text-white flex items-center justify-center shrink-0 border border-slate-200">
              {photoURL ? (
                <PrivateUploadImage src={photoURL} alt={displayName || 'Profile'} />
              ) : (
                <User className="h-7 w-7" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-display text-base font-semibold text-[#0B1D33] truncate">
                {profile?.displayName || 'Traveler'}
              </h2>
              <p className="text-xs text-slate-500 truncate">{profile?.email}</p>
              <label className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer">
                <Upload className="h-3.5 w-3.5 text-[#0D7377]" />
                Upload Photo
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => handleAvatarUpload(e.target.files?.[0] || null)}
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Default Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Home City</label>
            <input
              type="text"
              value={homeCity}
              onChange={(e) => setHomeCity(e.target.value)}
              placeholder="e.g., Dhaka, Bangladesh"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Profile Picture URL (Optional)
            </label>
            <input
              type="text"
              value={photoURL}
              onChange={(e) => setPhotoURL(e.target.value)}
              placeholder="https://... or uploaded file path"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Traveler Bio</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Favorite travel style, bucket-list regions..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>

          <button
            type="submit"
            disabled={savingProfile}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0D7377] hover:bg-[#0F766E] text-white text-sm font-medium disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {savingProfile ? 'Saving Changes...' : 'Save Profile'}
          </button>
        </form>

        {/* Change Password */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-[#0D7377]" />
            <h2 className="font-display text-base font-semibold text-[#0B1D33]">
              Account Password
            </h2>
          </div>

          {!isPasswordProvider ? (
            <p className="text-xs text-slate-600 leading-relaxed bg-[#F8FAFC] border border-slate-200 rounded-lg p-4">
              You signed in with Google Authentication. Password management is handled directly through your Google Account security settings.
            </p>
          ) : (
            <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <button
                type="submit"
                disabled={updatingPassword}
                className="w-full py-2.5 rounded-lg bg-[#0B1D33] hover:bg-slate-800 text-white text-sm font-medium disabled:opacity-60"
              >
                {updatingPassword ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </WorkspaceLayout>
  );
};
