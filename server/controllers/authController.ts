import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Expense } from '../models/Expense.js';
import { AuthenticatedRequest, signToken } from '../middleware/auth.js';

export class AuthController {
  public static async register(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { email, password, name, currency = 'USD', monthlyBudget = 800 } = req.body;

      if (!email || !password) {
        res.status(400).json({ success: false, message: 'Email and password are required.' });
        return;
      }

      if (password.length < 6) {
        res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
        return;
      }

      const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
      if (existingUser) {
        res.status(409).json({ success: false, message: 'An account with this email already exists.' });
        return;
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const newUser = await User.create({
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        name: name || 'Student',
        currency,
        monthlyBudget: Number(monthlyBudget) || 800,
        preferences: {
          sensitivity: 'medium',
          minHistoryCount: 5,
          excludedCategories: [],
          theme: 'dark',
          currencySymbol: currency === 'INR' ? '₹' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$',
          notificationsEnabled: true,
        },
      });

      const token = signToken(newUser);
      const userProfile = newUser.toObject();
      delete (userProfile as any).password;

      res.status(201).json({
        success: true,
        message: 'Account created successfully',
        token,
        user: userProfile,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error registering user' });
    }
  }

  public static async login(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ success: false, message: 'Email and password are required.' });
        return;
      }

      const user = await User.findOne({ email: email.toLowerCase().trim() });
      if (!user) {
        res.status(401).json({ success: false, message: 'Invalid email or password.' });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        res.status(401).json({ success: false, message: 'Invalid email or password.' });
        return;
      }

      const token = signToken(user);
      const userProfile = user.toObject();
      delete (userProfile as any).password;

      res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        user: userProfile,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error logging in' });
    }
  }

  public static async getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Not authenticated' });
        return;
      }

      res.status(200).json({
        success: true,
        user: req.user,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error fetching user' });
    }
  }

  public static async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      const { name, currency, monthlyBudget, preferences } = req.body;

      const updateData: any = {};
      if (name !== undefined) updateData.name = name.trim();
      if (currency !== undefined) updateData.currency = currency.trim();
      if (monthlyBudget !== undefined) updateData.monthlyBudget = Number(monthlyBudget);
      if (preferences) {
        updateData.preferences = {
          ...req.user?.preferences,
          ...preferences,
        };
      }

      const updatedUser = await User.findByIdAndUpdate(userId, { $set: updateData }, { new: true }).select('-password');

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        user: updatedUser,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error updating profile' });
    }
  }

  public static async deleteAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;

      // Delete all expenses belonging to user
      await Expense.deleteMany({ userId });
      // Delete user document
      await User.findByIdAndDelete(userId);

      res.status(200).json({
        success: true,
        message: 'Account and all associated records permanently removed.',
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error deleting account' });
    }
  }

  public static async exportUserData(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      const user = await User.findById(userId).select('-password');
      const expenses = await Expense.find({ userId }).sort({ date: -1 });

      res.status(200).json({
        success: true,
        exportDate: new Date(),
        user,
        expensesCount: expenses.length,
        expenses,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error exporting user data' });
    }
  }
}
