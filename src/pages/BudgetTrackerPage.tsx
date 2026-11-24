import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Wallet,
  AlertTriangle,
  Plus,
  Edit3,
  Trash2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { WorkspaceLayout } from '../components/Layout/WorkspaceLayout';
import { useTripData } from '../contexts/TripDataContext';
import { useToast } from '../contexts/ToastContext';
import { addExpense, updateExpense, deleteExpense } from '../services/firestoreService';
import { CurrencyCode, Expense, ExpenseCategory } from '../types';

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Transportation',
  'Accommodation',
  'Food',
  'Shopping',
  'Tickets',
  'Entertainment',
  'Emergency',
  'Other',
];

const CHART_COLORS = [
  '#0B1D33',
  '#0D7377',
  '#1E5F74',
  '#D97706',
  '#0284C7',
  '#0F766E',
  '#B45309',
  '#64748B',
];

const CURRENCIES: CurrencyCode[] = ['USD', 'BDT', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY'];

export const BudgetTrackerPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { trips, expenses } = useTripData();
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

  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Food');
  const [estimatedAmount, setEstimatedAmount] = useState(0);
  const [actualAmount, setActualAmount] = useState(0);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [paidBy, setPaidBy] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (selectedTrip) {
      setCurrency(selectedTrip.currency || 'USD');
    }
  }, [selectedTrip]);

  const tripExpenses = useMemo(
    () => expenses.filter((e) => e.tripId === selectedTripId),
    [expenses, selectedTripId]
  );

  const totalBudget = selectedTrip?.estimatedBudget || 0;
  const totalSpent = tripExpenses.reduce((sum, e) => sum + (e.actualAmount || 0), 0);
  const remaining = totalBudget - totalSpent;
  const usagePct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
  const isOverBudget = totalBudget > 0 && totalSpent > totalBudget;

  const categoryChartData = useMemo(() => {
    return EXPENSE_CATEGORIES.map((cat) => {
      const catItems = tripExpenses.filter((e) => e.category === cat);
      return {
        category: cat,
        estimated: catItems.reduce((s, e) => s + (e.estimatedAmount || 0), 0),
        actual: catItems.reduce((s, e) => s + (e.actualAmount || 0), 0),
      };
    }).filter((row) => row.estimated > 0 || row.actual > 0);
  }, [tripExpenses]);

  const handleTripChange = (id: string) => {
    setSelectedTripId(id);
    setSearchParams(id ? { trip: id } : {});
  };

  const resetForm = () => {
    setEditingExpense(null);
    setTitle('');
    setCategory('Food');
    setEstimatedAmount(0);
    setActualAmount(0);
    setDate(new Date().toISOString().slice(0, 10));
    setPaidBy('');
    setNotes('');
  };

  const startEdit = (exp: Expense) => {
    setEditingExpense(exp);
    setTitle(exp.title);
    setCategory(exp.category);
    setEstimatedAmount(exp.estimatedAmount);
    setActualAmount(exp.actualAmount);
    setCurrency(exp.currency);
    setDate(exp.date);
    setPaidBy(exp.paidBy || '');
    setNotes(exp.notes || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrip || !title.trim()) return;
    setSubmitting(true);
    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, {
          title: title.trim(),
          category,
          estimatedAmount,
          actualAmount,
          currency,
          date,
          paidBy: paidBy.trim(),
          notes: notes.trim(),
        });
        showToast('Expense updated.', 'success');
      } else {
        await addExpense(selectedTrip, {
          title: title.trim(),
          category,
          estimatedAmount,
          actualAmount,
          currency,
          date,
          paidBy: paidBy.trim(),
          notes: notes.trim(),
        });
        showToast('Expense recorded.', 'success');
      }
      resetForm();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save expense.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (exp: Expense) => {
    try {
      await deleteExpense(exp.id);
      showToast(`Deleted "${exp.title}".`, 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete expense.', 'error');
    }
  };

  return (
    <WorkspaceLayout
      title="Budget & Expense Tracker"
      subtitle="Compare planned budgets against real spending across categories and currencies."
    >
      {trips.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <Wallet className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h2 className="font-display text-lg font-semibold text-slate-900">No trips available</h2>
          <p className="text-sm text-slate-500 mt-1 mb-5">
            Create a trip with an estimated budget to track expenses and view analytics.
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
          {/* Trip Selector */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1">
              <label className="text-xs font-medium uppercase tracking-wider text-slate-500 whitespace-nowrap">
                Trip Budget
              </label>
              <select
                value={selectedTripId}
                onChange={(e) => handleTripChange(e.target.value)}
                className="px-3 py-2 text-sm font-medium border border-slate-200 rounded-lg bg-white text-[#0B1D33] max-w-sm w-full"
              >
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.tripName} ({t.estimatedBudget.toLocaleString()} {t.currency})
                  </option>
                ))}
              </select>
            </div>
            <span className="font-mono text-xs text-slate-500">
              Trip Currency: {selectedTrip?.currency || 'USD'}
            </span>
          </div>

          {isOverBudget && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-red-900">
              <AlertTriangle className="h-5 w-5 text-red-700 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Budget Limit Exceeded</p>
                <p className="text-xs mt-0.5">
                  Actual expenses ({totalSpent.toLocaleString()} {selectedTrip?.currency}) exceed your
                  planned budget ({totalBudget.toLocaleString()} {selectedTrip?.currency}) by{' '}
                  {Math.abs(remaining).toLocaleString()} {selectedTrip?.currency}.
                </p>
              </div>
            </div>
          )}

          {/* KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500">Total Planned Budget</p>
              <p className="font-mono text-2xl font-bold text-[#0B1D33] tabular-nums mt-1">
                {totalBudget.toLocaleString()} {selectedTrip?.currency}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500">Total Spent</p>
              <p className="font-mono text-2xl font-bold text-[#0D7377] tabular-nums mt-1">
                {totalSpent.toLocaleString()} {selectedTrip?.currency}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500">Remaining Balance</p>
              <p
                className={`font-mono text-2xl font-bold tabular-nums mt-1 ${
                  remaining < 0 ? 'text-red-700' : 'text-emerald-700'
                }`}
              >
                {remaining.toLocaleString()} {selectedTrip?.currency}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500">Budget Usage</p>
              <p className="font-mono text-2xl font-bold text-[#0B1D33] tabular-nums mt-1">
                {usagePct}%
              </p>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2">
                <div
                  className={`h-full rounded-full ${
                    isOverBudget ? 'bg-red-600' : 'bg-[#0D7377]'
                  }`}
                  style={{ width: `${Math.min(100, usagePct)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Analytics Charts */}
          {categoryChartData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h3 className="font-display text-sm font-semibold text-[#0B1D33] mb-4">
                  Estimated vs. Actual by Category
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="estimated" name="Estimated" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="actual" name="Actual" fill="#0D7377" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h3 className="font-display text-sm font-semibold text-[#0B1D33] mb-4">
                  Spending Share by Category
                </h3>
                <div className="h-64 flex flex-col sm:flex-row items-center">
                  <div className="flex-1 h-full w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryChartData.filter((c) => c.actual > 0)}
                          dataKey="actual"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          outerRadius={82}
                          innerRadius={45}
                        >
                          {categoryChartData.map((_, idx) => (
                            <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-1.5 text-xs pr-2">
                    {categoryChartData
                      .filter((c) => c.actual > 0)
                      .map((row, idx) => (
                        <div key={row.category} className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-xs shrink-0"
                            style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                          />
                          <span className="text-slate-700">{row.category}</span>
                          <span className="font-mono text-slate-500 tabular-nums ml-auto">
                            {row.actual.toLocaleString()}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Add Expense + Expense Ledger */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <form
              onSubmit={handleSubmit}
              className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-3.5"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-semibold text-[#0B1D33]">
                  {editingExpense ? 'Edit Expense' : 'Record Expense'}
                </h3>
                {editingExpense && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-xs text-slate-500 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Expense Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Resort Night, Train Ticket"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                  >
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Currency</label>
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Estimated Amount
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={estimatedAmount}
                    onChange={(e) => setEstimatedAmount(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Actual Spent
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    required
                    value={actualAmount}
                    onChange={(e) => setActualAmount(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Paid By</label>
                  <input
                    type="text"
                    value={paidBy}
                    onChange={(e) => setPaidBy(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Receipt ref or split note"
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
                  : editingExpense
                  ? 'Update Expense'
                  : 'Add Expense'}
              </button>
            </form>

            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-display text-base font-semibold text-[#0B1D33]">
                  Expense Ledger ({tripExpenses.length})
                </h3>
              </div>

              {tripExpenses.length === 0 ? (
                <div className="p-10 text-center text-sm text-slate-500">
                  No expenses logged for this trip yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
                        <th className="py-3 px-4">Item</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4 text-right">Estimated</th>
                        <th className="py-3 px-4 text-right">Actual</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tripExpenses.map((exp) => (
                        <tr key={exp.id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4">
                            <p className="font-medium text-slate-900">{exp.title}</p>
                            {exp.paidBy && (
                              <p className="text-xs text-slate-500">Paid by {exp.paidBy}</p>
                            )}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600">{exp.category}</td>
                          <td className="py-3 px-4 font-mono text-xs text-slate-500 tabular-nums">
                            {exp.date}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-xs text-slate-500 tabular-nums">
                            {exp.estimatedAmount.toLocaleString()} {exp.currency}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-xs font-semibold text-slate-900 tabular-nums">
                            {exp.actualAmount.toLocaleString()} {exp.currency}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => startEdit(exp)}
                              className="p-1 text-slate-400 hover:text-[#0B1D33] mr-1"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(exp)}
                              className="p-1 text-slate-400 hover:text-red-700"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </WorkspaceLayout>
  );
};
