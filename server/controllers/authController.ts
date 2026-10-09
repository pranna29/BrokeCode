import { Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User } from '../models/User.js';
import { Expense } from '../models/Expense.js';
import { AuthenticatedRequest, signToken } from '../middleware/auth.js';

export class AuthController {
  public static async register(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { email, password, name, currency = 'INR', monthlyBudget = 25000 } = req.body;

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

      const symbolMap: Record<string, string> = {
        INR: '₹',
        USD: '$',
        EUR: '€',
        GBP: '£',
        SGD: 'S$',
      };

      const newUser = await User.create({
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        name: name || 'SpendWise User',
        currency,
        monthlyBudget: Number(monthlyBudget) || 25000,
        preferences: {
          sensitivity: 'medium',
          minHistoryCount: 5,
          excludedCategories: [],
          theme: 'dark',
          currencySymbol: symbolMap[currency] || '₹',
          notificationsEnabled: true,
        },
      });

      const token = signToken(newUser);
      const userProfile = newUser.toObject();
      delete (userProfile as any).password;

      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days persistent session
        path: '/',
      };

      res.cookie('token', token, cookieOptions);

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

      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days persistent session
        path: '/',
      };

      res.cookie('token', token, cookieOptions);

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

  public static async logout(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
        path: '/',
      });
      res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error logging out' });
    }
  }

  public static async forgotPassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ success: false, message: 'Email is required' });
        return;
      }

      const user = await User.findOne({ email: email.toLowerCase().trim() });
      if (!user) {
        // Return same message to prevent account enumeration
        res.status(200).json({
          success: true,
          message: 'If an account exists with this email, a password reset token has been issued.',
        });
        return;
      }

      // Generate 32-byte hex reset token valid for 1 hour
      const resetToken = crypto.randomBytes(32).toString('hex');
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
      await user.save();

      res.status(200).json({
        success: true,
        message: 'Password reset token generated successfully. In production, this is emailed securely.',
        resetToken,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error requesting password reset' });
    }
  }

  public static async resetPassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        res.status(400).json({ success: false, message: 'Reset token and new password are required' });
        return;
      }

      if (newPassword.length < 6) {
        res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
        return;
      }

      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: new Date() },
      });

      if (!user) {
        res.status(400).json({ success: false, message: 'Password reset token is invalid or has expired.' });
        return;
      }

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      res.status(200).json({
        success: true,
        message: 'Password has been successfully reset. You can now log in with your new credentials.',
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error resetting password' });
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

      const symbolMap: Record<string, string> = {
        INR: '₹',
        USD: '$',
        EUR: '€',
        GBP: '£',
        SGD: 'S$',
      };

      const updateData: any = {};
      if (name !== undefined) updateData.name = name.trim();
      if (currency !== undefined) {
        updateData.currency = currency.trim();
        if (!preferences?.currencySymbol) {
          updateData['preferences.currencySymbol'] = symbolMap[currency.trim()] || '₹';
        }
      }
      if (monthlyBudget !== undefined) updateData.monthlyBudget = Number(monthlyBudget);
      if (preferences) {
        updateData.preferences = {
          ...req.user?.preferences,
          ...preferences,
          currencySymbol: symbolMap[currency || req.user?.currency || 'INR'] || preferences.currencySymbol || '₹',
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

      res.clearCookie('token');
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

