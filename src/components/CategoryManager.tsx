import React, { useState } from 'react';
import { Category } from '../types.ts';
import { AVAILABLE_EMOJIS, CATEGORY_COLORS } from '../data/defaultCategories.ts';
import { Plus, Edit2, Trash2, ArrowUp, ArrowDown, RotateCcw, Check, X, AlertCircle } from 'lucide-react';

interface CategoryManagerProps {
  categories: Category[];
  onCategoryCreated: (cat: { name: string; emoji: string; color: string }) => Promise<void>;
  onCategoryUpdated: (id: string, updates: Partial<Category>) => Promise<void>;
  onCategoryDeleted: (id: string) => Promise<void>;
  onResetDefaults: () => Promise<void>;
  onReorder: (orderedIds: string[]) => Promise<void>;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  categories,
  onCategoryCreated,
  onCategoryUpdated,
  onCategoryDeleted,
  onResetDefaults,
  onReorder
}) => {
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);

  // Form states
  const [name, setName] = useState<string>('');
  const [emoji, setEmoji] = useState<string>('🍔');
  const [color, setColor] = useState<string>('#10b981');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const startCreate = () => {
    setName('');
    setEmoji('🍔');
    setColor('#10b981');
    setErrorMsg(null);
    setIsCreatingNew(true);
    setEditingCategory(null);
  };

  const startEdit = (cat: Category) => {
    setName(cat.name);
    setEmoji(cat.emoji);
    setColor(cat.color);
    setErrorMsg(null);
    setEditingCategory(cat);
    setIsCreatingNew(false);
  };

  const cancelForm = () => {
    setEditingCategory(null);
    setIsCreatingNew(false);
    setErrorMsg(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Category name is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      if (isCreatingNew) {
        await onCategoryCreated({
          name: name.trim(),
          emoji,
          color
        });
      } else if (editingCategory) {
        await onCategoryUpdated(editingCategory.id, {
          name: name.trim(),
          emoji,
          color
        });
      }
      cancelForm();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save category.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const reordered = [...categories];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    await onReorder(reordered.map((c) => c.id));
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-neutral-200/80 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100">
        <div>
          <h3 className="text-base font-bold text-[#2B2B2B]">Category Manager</h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Customize emoji icons, names, and display colors across all views
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={startCreate}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs text-white shadow-xs"
            style={{ backgroundColor: '#0B6121' }}
          >
            <Plus className="w-4 h-4" />
            <span>Add Category</span>
          </button>

          <button
            type="button"
            onClick={async () => {
              if (window.confirm('Reset categories to standard default set?')) {
                await onResetDefaults();
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restore Defaults</span>
          </button>
        </div>
      </div>

      {/* Create / Edit Modal Surface */}
      {(isCreatingNew || editingCategory) && (
        <form
          onSubmit={handleSave}
          className="p-5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-4 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-[#2B2B2B]">
              {isCreatingNew ? 'Create New Category' : `Edit Category: ${editingCategory?.name}`}
            </h4>
            <button
              type="button"
              onClick={cancelForm}
              className="p-1 text-neutral-400 hover:text-neutral-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">
                Category Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Coffee &amp; Snacks"
                className="w-full px-3.5 py-2 rounded-xl border border-neutral-300 bg-white text-sm text-[#2B2B2B] focus:outline-none focus:ring-2 focus:ring-[#0B6121]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">
                Badge Color
              </label>
              <div className="flex items-center gap-1.5 flex-wrap p-2 bg-white rounded-xl border border-neutral-300">
                {CATEGORY_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full transition-transform ${
                      color === c ? 'scale-125 ring-2 ring-offset-1 ring-black' : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Interactive Emoji Picker */}
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1">
              Select Emoji Icon (Selected: <span className="text-lg">{emoji}</span>)
            </label>
            <div className="grid grid-cols-8 sm:grid-cols-12 gap-1.5 p-3 rounded-xl bg-white border border-neutral-300 max-h-36 overflow-y-auto">
              {AVAILABLE_EMOJIS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setEmoji(em)}
                  className={`h-9 rounded-lg text-lg flex items-center justify-center transition-all ${
                    emoji === em
                      ? 'bg-[#0B6121]/15 ring-2 ring-[#0B6121] scale-110'
                      : 'hover:bg-neutral-100 active:scale-95'
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={cancelForm}
              className="px-4 py-2 rounded-xl border border-neutral-300 text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-xs flex items-center gap-1.5"
              style={{ backgroundColor: '#0B6121' }}
            >
              <Check className="w-4 h-4" />
              <span>{isCreatingNew ? 'Create Category' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Category List */}
      <div className="space-y-2">
        {categories.map((cat, index) => (
          <div
            key={cat.id}
            className="flex items-center justify-between p-3.5 rounded-2xl border border-neutral-200/80 hover:border-neutral-300 bg-white shadow-2xs transition-all"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                style={{ backgroundColor: `${cat.color}20` }}
              >
                <span>{cat.emoji}</span>
              </div>
              <div className="min-w-0">
                <span className="text-sm font-bold text-[#2B2B2B] truncate block">
                  {cat.name}
                </span>
                <span className="text-[11px] text-neutral-400 block">
                  Color: <span className="font-mono">{cat.color}</span>
                </span>
              </div>
            </div>

            {/* Actions: Reorder, Edit, Delete */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => handleMove(index, 'up')}
                disabled={index === 0}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 disabled:opacity-20"
                title="Move Up"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleMove(index, 'down')}
                disabled={index === categories.length - 1}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 disabled:opacity-20"
                title="Move Down"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => startEdit(cat)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-emerald-700 hover:bg-emerald-50"
                title="Edit Category"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (
                    window.confirm(
                      `Remove category "${cat.name}"? Historical transactions will be kept safely.`
                    )
                  ) {
                    await onCategoryDeleted(cat.id);
                  }
                }}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-red-700 hover:bg-red-50"
                title="Delete Category"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
