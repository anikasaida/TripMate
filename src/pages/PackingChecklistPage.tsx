import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Edit3,
  AlertTriangle,
  Search,
  Save,
  Copy,
  Sparkles,
  Layers,
  X,
} from 'lucide-react';
import { WorkspaceLayout } from '../components/Layout/WorkspaceLayout';
import { useAuth } from '../contexts/AuthContext';
import { useTripData } from '../contexts/TripDataContext';
import { useToast } from '../contexts/ToastContext';
import {
  addPackingItem,
  updatePackingItem,
  deletePackingItem,
  savePackingTemplate,
  applyPackingTemplateToTrip,
  deletePackingTemplate,
} from '../services/firestoreService';
import { PackingItem, PackingPriority } from '../types';

const DEFAULT_CATEGORIES = [
  'Clothing',
  'Personal Care',
  'Travel Essentials',
  'Health & Safety',
  'Electronics',
];

const PRIORITIES: PackingPriority[] = ['Essential', 'High', 'Medium', 'Low'];

export const PackingChecklistPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { firebaseUser } = useAuth();
  const { trips, packingItems, packingTemplates } = useTripData();
  const { showToast } = useToast();

  const activeTrips = useMemo(() => trips.filter((t) => !t.archived), [trips]);
  const initialTripId = searchParams.get('trip') || activeTrips[0]?.id || '';
  const [selectedTripId, setSelectedTripId] = useState(initialTripId);

  useEffect(() => {
    if (!selectedTripId && activeTrips.length > 0) {
      setSelectedTripId(activeTrips[0].id);
    }
  }, [activeTrips, selectedTripId]);

  const selectedTrip = useMemo(
    () => trips.find((t) => t.id === selectedTripId) || null,
    [trips, selectedTripId]
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Packed' | 'Unpacked'>('All');

  // Add / Edit item form state
  const [editingItem, setEditingItem] = useState<PackingItem | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState('Clothing');
  const [customCategory, setCustomCategory] = useState('');
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemPriority, setItemPriority] = useState<PackingPriority>('Medium');
  const [itemNotes, setItemNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Template / Duplicate modals
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [sourceTripId, setSourceTripId] = useState('');

  const tripItems = useMemo(
    () => packingItems.filter((item) => item.tripId === selectedTripId),
    [packingItems, selectedTripId]
  );

  const allCategories = useMemo(() => {
    const custom = Array.from(new Set(tripItems.map((i) => i.category))).filter(
      (c) => c && !DEFAULT_CATEGORIES.includes(c)
    );
    return [...DEFAULT_CATEGORIES, ...custom];
  }, [tripItems]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tripItems.filter((item) => {
      if (categoryFilter !== 'All' && item.category !== categoryFilter) return false;
      if (statusFilter === 'Packed' && !item.isPacked) return false;
      if (statusFilter === 'Unpacked' && item.isPacked) return false;
      if (q && !item.name.toLowerCase().includes(q) && !(item.notes || '').toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [tripItems, categoryFilter, statusFilter, searchQuery]);

  const groupedItems = useMemo(() => {
    const map: Record<string, PackingItem[]> = {};
    filteredItems.forEach((item) => {
      const cat = item.category || 'Other';
      if (!map[cat]) map[cat] = [];
      map[cat].push(item);
    });
    return map;
  }, [filteredItems]);

  const packedCount = tripItems.filter((i) => i.isPacked).length;
  const totalCount = tripItems.length;
  const progressPct = totalCount > 0 ? Math.round((packedCount / totalCount) * 100) : 0;
  const unpackedEssentials = tripItems.filter(
    (i) => !i.isPacked && i.priority === 'Essential'
  );

  const handleTripChange = (id: string) => {
    setSelectedTripId(id);
    setSearchParams(id ? { trip: id } : {});
  };

  const resetForm = () => {
    setEditingItem(null);
    setItemName('');
    setItemCategory('Clothing');
    setCustomCategory('');
    setItemQuantity(1);
    setItemPriority('Medium');
    setItemNotes('');
  };

  const startEdit = (item: PackingItem) => {
    setEditingItem(item);
    setItemName(item.name);
    if (DEFAULT_CATEGORIES.includes(item.category)) {
      setItemCategory(item.category);
      setCustomCategory('');
    } else {
      setItemCategory('__custom__');
      setCustomCategory(item.category);
    }
    setItemQuantity(item.quantity);
    setItemPriority(item.priority);
    setItemNotes(item.notes || '');
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrip || !itemName.trim()) return;
    const resolvedCategory =
      itemCategory === '__custom__' ? customCategory.trim() || 'Custom' : itemCategory;

    setSubmitting(true);
    try {
      if (editingItem) {
        await updatePackingItem(editingItem.id, {
          name: itemName.trim(),
          category: resolvedCategory,
          quantity: itemQuantity,
          priority: itemPriority,
          notes: itemNotes.trim(),
        });
        showToast('Packing item updated.', 'success');
      } else {
        await addPackingItem(selectedTrip, {
          name: itemName.trim(),
          category: resolvedCategory,
          quantity: itemQuantity,
          priority: itemPriority,
          notes: itemNotes.trim(),
        });
        showToast(`Added "${itemName.trim()}" to checklist.`, 'success');
      }
      resetForm();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save packing item.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePacked = async (item: PackingItem) => {
    try {
      await updatePackingItem(item.id, { isPacked: !item.isPacked });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update status.', 'error');
    }
  };

  const handleDelete = async (item: PackingItem) => {
    try {
      await deletePackingItem(item.id);
      showToast(`Removed "${item.name}".`, 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to remove item.', 'error');
    }
  };

  const handleSaveAsTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !selectedTrip || !templateName.trim()) return;
    try {
      await savePackingTemplate(
        firebaseUser.uid,
        templateName.trim(),
        selectedTrip.tripType,
        tripItems.map((i) => ({
          name: i.name,
          category: i.category,
          quantity: i.quantity,
          priority: i.priority,
          notes: i.notes,
        }))
      );
      showToast(`Saved template "${templateName.trim()}".`, 'success');
      setTemplateName('');
      setShowTemplateModal(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save template.', 'error');
    }
  };

  const handleApplyTemplate = async (templateId: string) => {
    if (!selectedTrip) return;
    const tpl = packingTemplates.find((t) => t.id === templateId);
    if (!tpl) return;
    try {
      await applyPackingTemplateToTrip(selectedTrip, tpl.items);
      showToast(`Applied ${tpl.items.length} items from "${tpl.name}".`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to apply template.', 'error');
    }
  };

  const handleDuplicateFromTrip = async () => {
    if (!selectedTrip || !sourceTripId) return;
    const sourceItems = packingItems.filter((i) => i.tripId === sourceTripId);
    if (sourceItems.length === 0) {
      showToast('Selected source trip has no packing items.', 'info');
      return;
    }
    try {
      await applyPackingTemplateToTrip(
        selectedTrip,
        sourceItems.map((i) => ({
          name: i.name,
          category: i.category,
          quantity: i.quantity,
          priority: i.priority,
          notes: i.notes,
        }))
      );
      showToast(`Copied ${sourceItems.length} items into "${selectedTrip.tripName}".`, 'success');
      setShowDuplicateModal(false);
      setSourceTripId('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to copy packing list.', 'error');
    }
  };

  return (
    <WorkspaceLayout
      title="Smart Packing Checklist"
      subtitle="Organize essentials across categories, track progress, and reuse templates across journeys."
      actions={
        selectedTrip && (
          <Link
            to={`/ai-packing?trip=${selectedTrip.id}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0D7377] hover:bg-[#0F766E] text-white text-xs font-medium transition-colors whitespace-nowrap"
          >
            <Sparkles className="h-3.5 w-3.5" />
            AI Packing Suggestions
          </Link>
        )
      }
    >
      {trips.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <CheckSquare className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h2 className="font-display text-lg font-semibold text-slate-900">No trips available yet</h2>
          <p className="text-sm text-slate-500 mt-1 mb-5">
            Create a trip first to automatically unlock its 36-item starter packing checklist.
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
          {/* Trip Selector & Progress Summary */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
              <label className="text-xs font-medium uppercase tracking-wider text-slate-500 whitespace-nowrap">
                Active Trip
              </label>
              <select
                value={selectedTripId}
                onChange={(e) => handleTripChange(e.target.value)}
                className="px-3 py-2 text-sm font-medium border border-slate-200 rounded-lg bg-white text-[#0B1D33] max-w-sm w-full"
              >
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.tripName} — {t.destination} ({t.startDate})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setShowTemplateModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700"
              >
                <Save className="h-3.5 w-3.5" />
                Save as Template
              </button>
              <button
                type="button"
                onClick={() => setShowDuplicateModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy From Trip
              </button>
            </div>
          </div>

          {/* Progress Bar + Unpacked Essential Alert */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="font-display text-base font-semibold text-[#0B1D33]">
                    Packing Completion
                  </h2>
                  <p className="text-xs text-slate-500">
                    {packedCount} of {totalCount} items packed for {selectedTrip?.destination}
                  </p>
                </div>
                <span className="font-mono text-2xl font-bold text-[#0D7377] tabular-nums">
                  {progressPct}%
                </span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#0D7377] rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            <div
              className={`border rounded-xl p-5 flex items-start gap-3 ${
                unpackedEssentials.length > 0
                  ? 'bg-amber-50 border-amber-200 text-amber-950'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-950'
              }`}
            >
              <AlertTriangle
                className={`h-5 w-5 shrink-0 mt-0.5 ${
                  unpackedEssentials.length > 0 ? 'text-amber-700' : 'text-emerald-700'
                }`}
              />
              <div>
                <p className="text-sm font-semibold">
                  {unpackedEssentials.length > 0
                    ? `${unpackedEssentials.length} Essential Item${unpackedEssentials.length === 1 ? '' : 's'} Unpacked`
                    : 'All Essential Items Packed'}
                </p>
                <p className="text-xs mt-1 opacity-85">
                  {unpackedEssentials.length > 0
                    ? unpackedEssentials
                        .slice(0, 4)
                        .map((i) => i.name)
                        .join(', ') + (unpackedEssentials.length > 4 ? '...' : '')
                    : 'Passport, wallet, medicines, and critical travel items are checked off.'}
                </p>
              </div>
            </div>
          </div>

          {/* Saved Templates Bar */}
          {packingTemplates.length > 0 && (
            <div className="bg-[#F4F1EA] border border-[#E5DEC9] rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-medium text-[#0B1D33]">
                <Layers className="h-4 w-4 text-[#0D7377]" />
                <span>Saved Packing Templates:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {packingTemplates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="inline-flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => handleApplyTemplate(tpl.id)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50"
                      title="Add all items from template to current trip"
                    >
                      + {tpl.name} ({tpl.items.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => deletePackingTemplate(tpl.id)}
                      className="px-2 py-1.5 text-slate-400 hover:text-red-700 border-l border-slate-200"
                      title="Delete template"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Main Grid: Add/Edit Form + Checklist */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Form */}
            <form
              onSubmit={handleSaveItem}
              className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-4 lg:sticky lg:top-24"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-semibold text-[#0B1D33]">
                  {editingItem ? 'Edit Packing Item' : 'Add Packing Item'}
                </h3>
                {editingItem && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-xs text-slate-500 hover:text-slate-800"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Item Name</label>
                <input
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g., Rain Poncho, Universal Adapter"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={itemCategory}
                    onChange={(e) => setItemCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                  >
                    {allCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="__custom__">+ Custom Category</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Priority</label>
                  <select
                    value={itemPriority}
                    onChange={(e) => setItemPriority(e.target.value as PackingPriority)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {itemCategory === '__custom__' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Custom Category Name
                  </label>
                  <input
                    type="text"
                    required
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="e.g., Camera Gear, Trekking"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Quantity</label>
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={itemQuantity}
                  onChange={(e) => setItemQuantity(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={itemNotes}
                  onChange={(e) => setItemNotes(e.target.value)}
                  placeholder="Carry-on only, waterproof pouch, etc."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-lg bg-[#0D7377] hover:bg-[#0F766E] text-white text-sm font-medium transition-colors disabled:opacity-60"
              >
                {submitting
                  ? 'Saving...'
                  : editingItem
                  ? 'Update Item'
                  : 'Add to Checklist'}
              </button>
            </form>

            {/* Right Checklist Area */}
            <div className="lg:col-span-8 space-y-4">
              {/* Filter Bar */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search items..."
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                >
                  <option value="All">All Categories</option>
                  {allCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'All' | 'Packed' | 'Unpacked')}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                >
                  <option value="All">All Statuses</option>
                  <option value="Unpacked">Unpacked Only</option>
                  <option value="Packed">Packed Only</option>
                </select>
              </div>

              {Object.keys(groupedItems).length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
                  No packing items match your current filter.
                </div>
              ) : (
                Object.entries(groupedItems).map(([category, items]) => {
                  const catPacked = items.filter((i) => i.isPacked).length;
                  return (
                    <div
                      key={category}
                      className="bg-white border border-slate-200 rounded-xl overflow-hidden"
                    >
                      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <h4 className="font-display text-sm font-semibold text-[#0B1D33]">
                          {category}
                        </h4>
                        <span className="font-mono text-xs text-slate-600 tabular-nums">
                          {catPacked}/{items.length} packed
                        </span>
                      </div>

                      <div className="divide-y divide-slate-100">
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                          >
                            <button
                              type="button"
                              onClick={() => handleTogglePacked(item)}
                              className="flex items-start gap-3 text-left flex-1 min-w-0"
                            >
                              {item.isPacked ? (
                                <CheckSquare className="h-5 w-5 text-[#0D7377] shrink-0 mt-0.5" />
                              ) : (
                                <Square className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                              )}
                              <div className="min-w-0">
                                <p
                                  className={`text-sm font-medium ${
                                    item.isPacked ? 'line-through text-slate-400' : 'text-slate-900'
                                  }`}
                                >
                                  {item.name}
                                </p>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                                  <span className="font-mono tabular-nums">Qty {item.quantity}</span>
                                  <span aria-hidden="true">·</span>
                                  <span
                                    className={
                                      item.priority === 'Essential'
                                        ? 'text-red-700 font-medium'
                                        : item.priority === 'High'
                                        ? 'text-amber-700 font-medium'
                                        : 'text-slate-500'
                                    }
                                  >
                                    {item.priority}
                                  </span>
                                  {item.aiSuggested && (
                                    <>
                                      <span aria-hidden="true">·</span>
                                      <span className="text-[#0D7377]">AI Recommended</span>
                                    </>
                                  )}
                                  {item.notes && (
                                    <>
                                      <span aria-hidden="true">·</span>
                                      <span className="truncate max-w-xs">{item.notes}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </button>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => startEdit(item)}
                                className="p-1.5 text-slate-400 hover:text-[#0B1D33] rounded-md"
                                title="Edit item"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(item)}
                                className="p-1.5 text-slate-400 hover:text-red-700 rounded-md"
                                title="Delete item"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Save Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveAsTemplate}
            className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-[#0B1D33]">
                Save Packing List as Template
              </h3>
              <button
                type="button"
                onClick={() => setShowTemplateModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Saves {tripItems.length} items from "{selectedTrip?.tripName}" for future trips.
            </p>
            <input
              type="text"
              required
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g., Monsoon Coastal Kit, Winter Hill Trek"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowTemplateModal(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#0D7377] text-white text-sm font-medium"
              >
                Save Template
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Duplicate From Trip Modal */}
      {showDuplicateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-[#0B1D33]">
                Copy Packing List From Another Trip
              </h3>
              <button
                type="button"
                onClick={() => setShowDuplicateModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <select
              value={sourceTripId}
              onChange={(e) => setSourceTripId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
            >
              <option value="">Select source trip...</option>
              {trips
                .filter((t) => t.id !== selectedTripId)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.tripName} ({packingItems.filter((i) => i.tripId === t.id).length} items)
                  </option>
                ))}
            </select>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDuplicateModal(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDuplicateFromTrip}
                disabled={!sourceTripId}
                className="px-4 py-2 rounded-lg bg-[#0D7377] text-white text-sm font-medium disabled:opacity-50"
              >
                Copy Items
              </button>
            </div>
          </div>
        </div>
      )}
    </WorkspaceLayout>
  );
};
