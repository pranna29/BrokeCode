import React, { useState, useRef } from 'react';
import { Transaction } from '../types.ts';
import { Edit2, Trash2, GripVertical, AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react';

interface SwipeableTransactionItemProps {
  transaction: Transaction;
  currencySymbol: string;
  isCustomOrder: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onEdit: (tx: Transaction) => void;
  onDeleteRequest: (tx: Transaction) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  isDragging?: boolean;
}

export const SwipeableTransactionItem: React.FC<SwipeableTransactionItemProps> = ({
  transaction,
  currencySymbol,
  isCustomOrder,
  canMoveUp,
  canMoveDown,
  onEdit,
  onDeleteRequest,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging = false
}) => {
  const [offsetX, setOffsetX] = useState<number>(0);
  const [isSwiping, setIsSwiping] = useState<boolean>(false);
  const [revealedAction, setRevealedAction] = useState<'edit' | 'delete' | null>(null);

  const startXRef = useRef<number>(0);
  const startYRef = useRef<number>(0);
  const isHorizontalScrollRef = useRef<boolean | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    isHorizontalScrollRef.current = null;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - startXRef.current;
    const diffY = currentY - startYRef.current;

    // Detect gesture direction on early move
    if (isHorizontalScrollRef.current === null) {
      if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) {
        isHorizontalScrollRef.current = Math.abs(diffX) > Math.abs(diffY);
      }
    }

    // Only swipe horizontally if horizontal intent was verified
    if (isHorizontalScrollRef.current) {
      // Limit offset between -100px (delete) and +100px (edit)
      const clamped = Math.max(-90, Math.min(90, diffX));
      setOffsetX(clamped);
    }
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    if (offsetX > 45) {
      // Revealed Edit
      setRevealedAction('edit');
      setOffsetX(75);
    } else if (offsetX < -45) {
      // Revealed Delete
      setRevealedAction('delete');
      setOffsetX(-75);
    } else {
      // Reset
      setRevealedAction(null);
      setOffsetX(0);
    }
    isHorizontalScrollRef.current = null;
  };

  const resetSwipe = () => {
    setOffsetX(0);
    setRevealedAction(null);
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl mb-2.5 transition-shadow select-none ${
        isDragging ? 'opacity-40 scale-[0.98]' : 'hover:shadow-xs'
      }`}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Background Action: Edit on Swipe Right (Green) */}
      <div
        className="absolute inset-y-0 left-0 w-24 bg-emerald-600 text-white flex items-center justify-center gap-1 font-semibold text-xs rounded-l-2xl cursor-pointer"
        onClick={() => {
          resetSwipe();
          onEdit(transaction);
        }}
      >
        <Edit2 className="w-4 h-4" />
        <span>Edit</span>
      </div>

      {/* Background Action: Delete on Swipe Left (Red) */}
      <div
        className="absolute inset-y-0 right-0 w-24 bg-red-600 text-white flex items-center justify-center gap-1 font-semibold text-xs rounded-r-2xl cursor-pointer"
        onClick={() => {
          resetSwipe();
          onDeleteRequest(transaction);
        }}
      >
        <Trash2 className="w-4 h-4" />
        <span>Delete</span>
      </div>

      {/* Foreground Transaction Card */}
      <div
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.22s ease-out'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative z-10 bg-white p-3.5 sm:p-4 rounded-2xl border border-neutral-200/80 shadow-2xs flex items-center gap-3 transition-colors hover:border-neutral-300"
      >
        {/* Drag Handle (Active only when Custom Order mode is selected) */}
        {isCustomOrder && (
          <div
            draggable
            onDragStart={onDragStart}
            className="cursor-grab active:cursor-grabbing p-1 text-neutral-400 hover:text-neutral-700 shrink-0 touch-none"
            title="Drag to reorder"
          >
            <GripVertical className="w-4 h-4" />
          </div>
        )}

        {/* Category Emoji Badge */}
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0 shadow-2xs border border-neutral-100"
          style={{ backgroundColor: `${transaction.categoryColor || '#10b981'}18` }}
        >
          <span>{transaction.categoryEmoji || '💸'}</span>
        </div>

        {/* Transaction Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-[#2B2B2B] truncate">
              {transaction.description || transaction.merchant || transaction.categoryName}
            </h4>
            {transaction.anomaly?.isAnomaly && (
              <span
                className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800"
                title={transaction.anomaly.reason}
              >
                <AlertTriangle className="w-2.5 h-2.5" />
                <span>Outlier</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-neutral-500 mt-0.5">
            <span className="font-medium text-neutral-600">{transaction.categoryName}</span>
            <span>•</span>
            <span className="truncate">{transaction.accountName}</span>
            <span>•</span>
            <span className="shrink-0">{transaction.date}</span>
          </div>
        </div>

        {/* Amount */}
        <div className="text-right shrink-0">
          <span className="text-base sm:text-lg font-extrabold text-[#2B2B2B] font-mono">
            -{currencySymbol}{transaction.amount.toFixed(2)}
          </span>
        </div>

        {/* Accessible Keyboard & Desktop Actions */}
        <div className="hidden sm:flex items-center gap-1 ml-2 border-l border-neutral-100 pl-2 shrink-0">
          {isCustomOrder && (
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={onMoveUp}
                disabled={!canMoveUp}
                className="p-1 rounded text-neutral-400 hover:text-neutral-700 disabled:opacity-20"
                title="Move Up"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onMoveDown}
                disabled={!canMoveDown}
                className="p-1 rounded text-neutral-400 hover:text-neutral-700 disabled:opacity-20"
                title="Move Down"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => onEdit(transaction)}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
            title="Edit Transaction"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onDeleteRequest(transaction)}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-red-700 hover:bg-red-50 transition-colors"
            title="Delete Transaction"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
