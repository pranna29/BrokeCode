import React, { useState, useEffect } from 'react';
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  Check,
  Palette,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  Smile,
  AlertCircle,
  FolderPlus,
} from 'lucide-react';
import { api } from '../services/api';
import { ICategory, ICategoryBreakdown } from '../types';
import { useAuth } from '../context/AuthContext';

const COMMON_EMOJIS = [
  '🍔', '🛒', '🚗', '🛍️', '🎓', '🏠', '💡', '💊',
  '🎬', '✈️', '💅', '🎁', '📱', '💸', '☕', '🍕',
  '🏋️', '🐶', '📚', '⚡', '💻', '🎮', '🍸', '🏥',
  '🚌', '🚕', '👶', '🎉', '🪴', '🛠️', '💼', '🏷️'
];

const COLOR_PALETTE = [
  '#f97316', '#10b981', '#06b6d4', '#ec4899', '#8b5cf6',
  '#eab308', '#3b82f6', '#ef4444', '#a855f7', '#14b8a6',
  '#6366f1', '#64748b', '#0B6121', '#84cc16', '#d97706',
];

export const CategoriesView: React.FC = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [breakdown, setBreakdown] = useState<ICategoryBreakdown[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State for Add / Edit
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ICategory | null>(null);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🏷️');
  const [color, setColor] = useState('#0B6121');
  const [budget, setBudget] = useState('0');
  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const currencySymbol = user?.preferences?.currencySymbol || '₹';

  const loadData = async () => {
    setLoading(true);
    try {
      const [catRes, breakRes] = await Promise.all([
        api.categories.list(),
        api.analytics.getCategoryBreakdown().catch(() => ({ success: false, data: [] })),
      ]);
      if (catRes.success) setCategories(catRes.data);
      if (breakRes.success) setBreakdown(breakRes.data);
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreate = () => {
    setEditingCategory(null);
    setName('');
    setEmoji('🏷️');
    setColor('#0B6121');
    setBudget('0');
    setModalError(null);
    setShowModal(true);
  };

  const openEdit = (cat: ICategory) => {
    setEditingCategory(cat);
    setName(cat.name);
    setEmoji(cat.emoji || '🏷️');
    setColor(cat.color || '#6366f1');
    setBudget(String(cat.budget || 0));
    setModalError(null);
    setShowModal(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setModalError('Please enter a category name.');
      return;
    }

    setSaving(true);
    setModalError(null);
    try {
      if (editingCategory) {
        await api.categories.update(editingCategory._id, {
          name: name.trim(),
          emoji: emoji || '🏷️',
          color,
          budget: parseFloat(budget) || 0,
        });
      } else {
        await api.categories.create({
          name: name.trim(),
          emoji: emoji || '🏷️',
          color,
          budget: parseFloat(budget) || 0,
        });
      }
      setShowModal(false);
      await loadData();
    } catch (err: any) {
      setModalError(err.message || 'Error saving category');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat: ICategory) => {
    if (!confirm(`Are you sure you want to remove "${cat.name}"? Historical transactions will remain preserved.`)) {
      return;
    }
    try {
      await api.categories.delete(cat._id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error deleting category');
    }
  };

  const handleRestoreDefaults = async () => {
    if (!confirm('Restore BrokeCode standard category list? Custom categories will be preserved alongside standard categories.')) {
      return;
    }
    try {
      const res = await api.categories.restoreDefaults();
      if (res.success) {
        setCategories(res.data);
      }
    } catch (err: any) {
      alert(err.message || 'Error restoring default categories');
    }
  };

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const newCategories = [...categories];
    const temp = newCategories[index];
    newCategories[index] = newCategories[targetIndex];
    newCategories[targetIndex] = temp;

    setCategories(newCategories);

    try {
      await api.categories.reorder(newCategories.map((c) => c._id));
    } catch (err) {
      console.error('Failed to save category order:', err);
      loadData();
    }
  };

  return (
    <div className="space-y-6 text-xs">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-[#E0DDDA] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
        <div>
          <h2 className="text-base font-extrabold text-[#2B2B2B] dark:text-white flex items-center gap-2">
            <Tag className="w-5 h-5 text-[#0B6121]" />
            Category & Emoji Customizer
          </h2>
          <p className="text-slate-500 mt-1">
            Customize category names, select cute emojis, assign distinct colors, and rearrange display order.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleRestoreDefaults}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition cursor-pointer"
            title="Restore default category icons and ordering"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restore Defaults</span>
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0B6121] hover:bg-[#094e1a] text-white font-extrabold text-xs shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>New Category</span>
          </button>
        </div>
      </div>

      {/* Grid of Categories */}
      {loading ? (
        <div className="py-20 text-center text-slate-500">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0B6121] border-t-transparent mx-auto mb-2" />
          <span>Loading categories...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((cat, idx) => {
            const stats = breakdown.find((b) => b.category.toLowerCase() === cat.name.toLowerCase());
            const totalSpent = stats?.totalSpend || 0;
            const hasBudget = (cat.budget || 0) > 0;
            const percentUsed = hasBudget ? Math.round((totalSpent / cat.budget!) * 100) : null;

            return (
              <div
                key={cat._id}
                className="rounded-2xl border border-[#E0DDDA] dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs flex flex-col justify-between transition hover:border-[#0B6121]/50"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-2xl shrink-0 p-1 rounded-xl bg-slate-50 dark:bg-slate-800 border border-[#E0DDDA]/60 dark:border-slate-700 flex items-center justify-center w-10 h-10">
                        {cat.emoji || '🏷️'}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="font-bold text-[#2B2B2B] dark:text-white text-xs truncate">
                            {cat.name}
                          </span>
                        </div>
                        {hasBudget ? (
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Budget: {currencySymbol}{cat.budget}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            No limit set
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Order buttons */}
                    <div className="flex items-center gap-0.5 shrink-0 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveOrder(idx, 'up')}
                        className="p-1 text-slate-400 hover:text-[#0B6121] disabled:opacity-30 disabled:pointer-events-none transition"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === categories.length - 1}
                        onClick={() => handleMoveOrder(idx, 'down')}
                        className="p-1 text-slate-400 hover:text-[#0B6121] disabled:opacity-30 disabled:pointer-events-none transition"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Progress bar if budget exists */}
                  {hasBudget && percentUsed !== null && (
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span>Used: {currencySymbol}{totalSpent.toFixed(0)}</span>
                        <span className={percentUsed > 100 ? 'text-rose-600 font-bold' : ''}>
                          {percentUsed}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            percentUsed > 100 ? 'bg-rose-500' : 'bg-[#0B6121]'
                          }`}
                          style={{ width: `${Math.min(100, percentUsed)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions bottom bar */}
                <div className="mt-4 pt-3 border-t border-[#E0DDDA]/60 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-medium">
                    {cat.isDefault ? 'Default' : 'Custom'}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(cat)}
                      className="p-1 text-slate-400 hover:text-[#0B6121] dark:hover:text-emerald-400 transition"
                      title="Edit Category"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {!cat.isDefault && (
                      <button
                        onClick={() => handleDelete(cat)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition"
                        title="Delete Category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal for Creating or Editing Category */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-[#E0DDDA] dark:border-slate-800 shadow-2xl p-6 text-xs">
            <h3 className="text-sm font-bold text-[#2B2B2B] dark:text-white pb-3 border-b border-[#E0DDDA] dark:border-slate-800">
              {editingCategory ? `Edit Category: ${editingCategory.name}` : 'Create New Category'}
            </h3>

            {modalError && (
              <div className="mt-3 flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 text-rose-600 border border-rose-500/20">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveCategory} className="mt-4 space-y-4">
              {/* Category Name */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1 text-[10px]">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Subscriptions, Gym, Coffee"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-[#E0DDDA] dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-[#2B2B2B] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#0B6121]"
                />
              </div>

              {/* Emoji Picker */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                    Emoji Icon
                  </label>
                  <span className="text-xl">{emoji}</span>
                </div>
                <div className="grid grid-cols-8 gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-[#E0DDDA] dark:border-slate-700 max-h-32 overflow-y-auto">
                  {COMMON_EMOJIS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setEmoji(em)}
                      className={`h-8 w-8 flex items-center justify-center rounded-lg text-lg transition ${
                        emoji === em
                          ? 'bg-[#0B6121] text-white scale-110 shadow-xs'
                          : 'hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Picker */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1 text-[10px]">
                  Color Accent
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`h-6 w-6 rounded-full border-2 transition ${
                        color === c ? 'border-[#2B2B2B] dark:border-white scale-110' : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Optional Monthly Budget */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1 text-[10px]">
                  Monthly Budget Cap ({currencySymbol})
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0 (optional)"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full rounded-xl border border-[#E0DDDA] dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-[#2B2B2B] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#0B6121]"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E0DDDA] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#E0DDDA] dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-[#0B6121] hover:bg-[#094e1a] text-white font-extrabold shadow-sm transition flex items-center gap-1.5"
                >
                  {saving ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
