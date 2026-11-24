import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  FileText,
  Upload,
  Eye,
  Download,
  Trash2,
  Plus,
  X,
  Lock,
} from 'lucide-react';
import { WorkspaceLayout } from '../components/Layout/WorkspaceLayout';
import { useTripData } from '../contexts/TripDataContext';
import { useToast } from '../contexts/ToastContext';
import { apiClient } from '../services/api';
import { addTravelDocument, deleteTravelDocument } from '../services/firestoreService';
import { DocumentCategory, TravelDocument } from '../types';

const DOC_CATEGORIES: DocumentCategory[] = [
  'Flight Ticket',
  'Bus Ticket',
  'Train Ticket',
  'Hotel Booking',
  'Confirmation',
  'Contact',
  'Other',
];

export const DocumentsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { trips, documents } = useTripData();
  const { showToast } = useToast();

  const activeTrips = useMemo(() => trips.filter((t) => !t.archived), [trips]);
  const [selectedTripId, setSelectedTripId] = useState(
    searchParams.get('trip') || activeTrips[0]?.id || ''
  );

  useEffect(() => {
    if (!selectedTripId && activeTrips.length > 0) {
      setSelectedTripId(activeTrips[0].id);
    }
  }, [activeTrips, selectedTripId]);

  const selectedTrip = useMemo(
    () => trips.find((t) => t.id === selectedTripId) || null,
    [trips, selectedTripId]
  );

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('Flight Ticket');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [previewDoc, setPreviewDoc] = useState<TravelDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const tripDocs = useMemo(
    () => documents.filter((d) => d.tripId === selectedTripId),
    [documents, selectedTripId]
  );

  const handleTripChange = (id: string) => {
    setSelectedTripId(id);
    setSearchParams(id ? { trip: id } : {});
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrip || !title.trim()) return;

    setUploading(true);
    try {
      let fileMeta:
        | { fileId: string; fileName: string; mimeType: string; fileSize: number }
        | undefined;

      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('tripId', selectedTrip.id);
        formData.append('memberIds', selectedTrip.memberIds.join(','));
        const uploadRes = await apiClient.post('/uploads', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        fileMeta = uploadRes.data;
      }

      await addTravelDocument(selectedTrip, {
        title: title.trim(),
        category,
        referenceNumber: referenceNumber.trim(),
        contactInfo: contactInfo.trim(),
        notes: notes.trim(),
        fileId: fileMeta?.fileId,
        fileName: fileMeta?.fileName,
        mimeType: fileMeta?.mimeType,
        fileSize: fileMeta?.fileSize,
      });

      showToast('Travel document saved securely.', 'success');
      setTitle('');
      setReferenceNumber('');
      setContactInfo('');
      setNotes('');
      setSelectedFile(null);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        (err instanceof Error ? err.message : 'Failed to upload document.');
      showToast(msg, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handlePreview = async (docItem: TravelDocument) => {
    if (!docItem.fileId) return;
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setPreviewDoc(docItem);
    setPreviewLoading(true);
    try {
      const res = await apiClient.get(`/uploads/${docItem.fileId}`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data as Blob);
      setPreviewUrl(url);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load document preview.', 'error');
      setPreviewDoc(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownload = async (docItem: TravelDocument) => {
    if (!docItem.fileId) return;
    try {
      const res = await apiClient.get(`/uploads/${docItem.fileId}`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = docItem.fileName || `${docItem.title}.bin`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Download failed.', 'error');
    }
  };

  const handleDelete = async (docItem: TravelDocument) => {
    try {
      if (docItem.fileId) {
        await apiClient.delete(`/uploads/${docItem.fileId}`).catch(() => {});
      }
      await deleteTravelDocument(docItem.id);
      showToast(`Deleted "${docItem.title}".`, 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete document.', 'error');
    }
  };

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewDoc(null);
  };

  return (
    <WorkspaceLayout
      title="Travel Document Organizer"
      subtitle="Private, authenticated storage for tickets, hotel confirmations, passes, and emergency contacts."
    >
      {trips.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h2 className="font-display text-lg font-semibold text-slate-900">No trips available</h2>
          <p className="text-sm text-slate-500 mt-1 mb-5">
            Create a trip first to securely store boarding passes and booking confirmations.
          </p>
          <Link
            to="/trips/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0D7377] text-white text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            Plan New Trip
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1">
              <label className="text-xs font-medium uppercase tracking-wider text-slate-500 whitespace-nowrap">
                Trip Vault
              </label>
              <select
                value={selectedTripId}
                onChange={(e) => handleTripChange(e.target.value)}
                className="px-3 py-2 text-sm font-medium border border-slate-200 rounded-lg bg-white text-[#0B1D33] max-w-sm w-full"
              >
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.tripName} ({t.destination})
                  </option>
                ))}
              </select>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              <Lock className="h-3.5 w-3.5 text-[#0D7377]" />
              Protected by Trip Member Access Control
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <form
              onSubmit={handleUploadSubmit}
              className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-3.5"
            >
              <h2 className="font-display text-base font-semibold text-[#0B1D33]">
                Add Document or Booking
              </h2>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Biman Flight BG-435, Resort Voucher"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as DocumentCategory)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                >
                  {DOC_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Booking Reference / PNR
                </label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="Optional reference code"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Important Contact
                </label>
                <input
                  type="text"
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  placeholder="Hotel desk, guide phone, embassy..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Check-in time, terminal gate, luggage allowance..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Attach File (PDF, PNG, JPG, WEBP, TXT · Max 5MB)
                </label>
                <label className="flex items-center justify-center gap-2 px-3 py-3 border border-dashed border-slate-300 rounded-lg text-xs text-slate-600 hover:border-[#0D7377] cursor-pointer bg-slate-50/50">
                  <Upload className="h-4 w-4 text-[#0D7377]" />
                  <span className="truncate">
                    {selectedFile ? selectedFile.name : 'Choose document file (optional)'}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.txt"
                    className="hidden"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={uploading}
                className="w-full py-2.5 rounded-lg bg-[#0D7377] hover:bg-[#0F766E] text-white text-sm font-medium transition-colors disabled:opacity-60"
              >
                {uploading ? 'Saving Document...' : 'Save to Document Vault'}
              </button>
            </form>

            <div className="lg:col-span-8 space-y-3">
              {tripDocs.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
                  <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="font-display text-base font-semibold text-slate-900">
                    No travel documents saved yet
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Store flight tickets, hotel reservations, and emergency numbers here.
                  </p>
                </div>
              ) : (
                tripDocs.map((docItem) => (
                  <div
                    key={docItem.id}
                    className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-medium text-[#0D7377]">{docItem.category}</span>
                        {docItem.referenceNumber && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono text-slate-700">
                              Ref: {docItem.referenceNumber}
                            </span>
                          </>
                        )}
                      </div>
                      <h3 className="font-display text-base font-semibold text-[#0B1D33] truncate">
                        {docItem.title}
                      </h3>
                      {docItem.contactInfo && (
                        <p className="text-xs text-slate-600">Contact: {docItem.contactInfo}</p>
                      )}
                      {docItem.notes && <p className="text-xs text-slate-500">{docItem.notes}</p>}
                      {docItem.fileName && (
                        <p className="font-mono text-xs text-slate-500 pt-1">
                          Attachment: {docItem.fileName} (
                          {Math.max(1, Math.round((docItem.fileSize || 0) / 1024))} KB)
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {docItem.fileId && (
                        <>
                          <button
                            type="button"
                            onClick={() => handlePreview(docItem)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Preview
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownload(docItem)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Download
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(docItem)}
                        className="p-2 text-slate-400 hover:text-red-700 border border-slate-200 rounded-lg"
                        title="Delete document"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Authenticated Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-semibold text-[#0B1D33]">
                  {previewDoc.title}
                </h3>
                <p className="text-xs text-slate-500">{previewDoc.fileName}</p>
              </div>
              <button
                type="button"
                onClick={closePreview}
                className="p-1 text-slate-500 hover:text-slate-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-slate-100 flex items-center justify-center min-h-[360px]">
              {previewLoading ? (
                <p className="text-sm text-slate-500">Loading secure document...</p>
              ) : previewUrl && previewDoc.mimeType?.startsWith('image/') ? (
                <img
                  src={previewUrl}
                  alt={previewDoc.title}
                  className="max-w-full max-h-[70vh] rounded-lg object-contain"
                />
              ) : previewUrl && previewDoc.mimeType === 'application/pdf' ? (
                <iframe
                  src={previewUrl}
                  title={previewDoc.title}
                  className="w-full h-[70vh] rounded-lg bg-white"
                />
              ) : previewUrl ? (
                <iframe
                  src={previewUrl}
                  title={previewDoc.title}
                  className="w-full h-[60vh] rounded-lg bg-white p-4"
                />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </WorkspaceLayout>
  );
};
