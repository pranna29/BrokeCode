import { Response } from 'express';
import mongoose from 'mongoose';
import { Category, DEFAULT_CATEGORIES } from '../models/Category.js';
import { Expense } from '../models/Expense.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export class CategoryController {
  public static async getCategories(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = new mongoose.Types.ObjectId(req.userId);

      // Check if user has initialized categories
      let userCategories = await Category.find({ userId }).sort({ order: 1, createdAt: 1 });

      if (userCategories.length === 0) {
        // Initialize default categories for user
        const defaults = DEFAULT_CATEGORIES.map((cat, idx) => ({
          userId,
          name: cat.name,
          emoji: cat.emoji,
          color: cat.color,
          icon: cat.icon,
          budget: 0,
          order: idx,
          isDefault: true,
        }));
        await Category.insertMany(defaults);
        userCategories = await Category.find({ userId }).sort({ order: 1, createdAt: 1 });
      }

      res.status(200).json({
        success: true,
        data: userCategories,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error fetching categories' });
    }
  }

  public static async createCategory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      const { name, emoji = '🏷️', color = '#6366f1', icon = 'tag', budget = 0 } = req.body;

      if (!name || !name.trim()) {
        res.status(400).json({ success: false, message: 'Category name is required.' });
        return;
      }

      const existing = await Category.findOne({ userId, name: name.trim() });
      if (existing) {
        res.status(409).json({ success: false, message: 'A category with this name already exists.' });
        return;
      }

      const count = await Category.countDocuments({ userId });

      const newCategory = await Category.create({
        userId,
        name: name.trim(),
        emoji: emoji || '🏷️',
        color,
        icon,
        budget: Math.max(0, Number(budget) || 0),
        order: count,
        isDefault: false,
      });

      res.status(201).json({
        success: true,
        data: newCategory,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error creating category' });
    }
  }

  public static async updateCategory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.userId;
      const { name, emoji, color, icon, budget } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: 'Invalid category ID' });
        return;
      }

      const existingCategory = await Category.findOne({ _id: id, userId });
      if (!existingCategory) {
        res.status(404).json({ success: false, message: 'Category not found' });
        return;
      }

      const oldName = existingCategory.name;
      const updateData: any = {};
      if (name && name.trim()) updateData.name = name.trim();
      if (emoji !== undefined) updateData.emoji = emoji;
      if (color) updateData.color = color;
      if (icon) updateData.icon = icon;
      if (budget !== undefined) updateData.budget = Math.max(0, Number(budget) || 0);

      const updated = await Category.findOneAndUpdate(
        { _id: id, userId },
        { $set: updateData },
        { new: true }
      );

      // If category was renamed, update linked historical expenses so they display the updated category name
      if (name && name.trim() !== oldName) {
        await Expense.updateMany(
          { userId, category: oldName },
          { $set: { category: name.trim() } }
        );
      }

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error updating category' });
    }
  }

  public static async reorderCategories(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      const { orderedIds } = req.body;

      if (!Array.isArray(orderedIds)) {
        res.status(400).json({ success: false, message: 'orderedIds array is required.' });
        return;
      }

      const bulkOps = orderedIds.map((id: string, index: number) => ({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(id), userId: new mongoose.Types.ObjectId(userId) },
          update: { $set: { order: index } },
        },
      }));

      if (bulkOps.length > 0) {
        await Category.bulkWrite(bulkOps);
      }

      const reordered = await Category.find({ userId }).sort({ order: 1, createdAt: 1 });

      res.status(200).json({
        success: true,
        data: reordered,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error reordering categories' });
    }
  }

  public static async restoreDefaults(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = new mongoose.Types.ObjectId(req.userId);

      // Keep custom categories, but ensure default categories exist or reset their names/emojis/order
      await Category.deleteMany({ userId, isDefault: true });

      const defaults = DEFAULT_CATEGORIES.map((cat, idx) => ({
        userId,
        name: cat.name,
        emoji: cat.emoji,
        color: cat.color,
        icon: cat.icon,
        budget: 0,
        order: idx,
        isDefault: true,
      }));

      await Category.insertMany(defaults);

      const allCategories = await Category.find({ userId }).sort({ order: 1, createdAt: 1 });

      res.status(200).json({
        success: true,
        message: 'Default categories restored successfully.',
        data: allCategories,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error restoring categories' });
    }
  }

  public static async deleteCategory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.userId;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: 'Invalid category ID' });
        return;
      }

      // Safe deletion: remove category record, but historical transactions remain untouched!
      const deleted = await Category.findOneAndDelete({ _id: id, userId });
      if (!deleted) {
        res.status(404).json({ success: false, message: 'Category not found' });
        return;
      }

      res.status(200).json({ success: true, message: 'Category deleted successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error deleting category' });
    }
  }
}
