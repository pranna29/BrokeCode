import { Category } from '../types.ts';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-food', name: 'Food & Dining', emoji: '🍔', color: '#f97316', order: 0 },
  { id: 'cat-groceries', name: 'Groceries', emoji: '🛒', color: '#16a34a', order: 1 },
  { id: 'cat-transport', name: 'Transport', emoji: '🚗', color: '#2563eb', order: 2 },
  { id: 'cat-shopping', name: 'Shopping', emoji: '🛍️', color: '#ec4899', order: 3 },
  { id: 'cat-education', name: 'Education', emoji: '🎓', color: '#8b5cf6', order: 4 },
  { id: 'cat-housing', name: 'Rent & Housing', emoji: '🏠', color: '#d97706', order: 5 },
  { id: 'cat-bills', name: 'Bills & Utilities', emoji: '💡', color: '#06b6d4', order: 6 },
  { id: 'cat-healthcare', name: 'Healthcare', emoji: '💊', color: '#ef4444', order: 7 },
  { id: 'cat-entertainment', name: 'Entertainment', emoji: '🎬', color: '#a855f7', order: 8 },
  { id: 'cat-travel', name: 'Travel', emoji: '✈️', color: '#0284c7', order: 9 },
  { id: 'cat-personal', name: 'Personal Care', emoji: '💅', color: '#f43f5e', order: 10 },
  { id: 'cat-gifts', name: 'Gifts', emoji: '🎁', color: '#10b981', order: 11 },
  { id: 'cat-subs', name: 'Subscriptions', emoji: '📱', color: '#6366f1', order: 12 },
  { id: 'cat-other', name: 'Other', emoji: '💸', color: '#64748b', order: 13 },
];

export const AVAILABLE_EMOJIS = [
  '🍔', '🍕', '☕', '🍜', '🍱', '🍦', '🛒', '🍎', '🥦',
  '🚗', '🚌', '🚕', '⛽', '✈️', '🚆', '🚲', '🛴',
  '🛍️', '👕', '👟', '💍', '📦', '🎓', '📚', '✏️',
  '🏠', '🛋️', '🔑', '💡', '💧', '⚡', '📶', '📱',
  '💊', '🏥', '🩺', '🦷', '🎬', '🍿', '🎮', '🎧',
  '💅', '💈', '🧴', '🎁', '🎉', '💸', '💰', '💳',
  '🏋️', '⚽', '🐾', '🛠️', '💼', '🪴'
];

export const CATEGORY_COLORS = [
  '#f97316', // Orange
  '#16a34a', // Green
  '#2563eb', // Blue
  '#ec4899', // Pink
  '#8b5cf6', // Violet
  '#d97706', // Amber
  '#06b6d4', // Cyan
  '#ef4444', // Red
  '#a855f7', // Purple
  '#0284c7', // Sky
  '#f43f5e', // Rose
  '#10b981', // Emerald
  '#6366f1', // Indigo
  '#64748b', // Slate
  '#0B6121', // Forest Green
  '#84cc16', // Lime
  '#14b8a6', // Teal
  '#eab308', // Yellow
];
