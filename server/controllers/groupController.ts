import { Response } from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { Group, IGroup } from '../models/Group.js';
import { GroupExpense, Settlement } from '../models/GroupExpense.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export class GroupController {
  /**
   * List groups user is a member of
   */
  public static async getGroups(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = new mongoose.Types.ObjectId(req.userId);
      const groups = await Group.find({ 'members.userId': userId }).sort({ updatedAt: -1 }).lean();

      res.status(200).json({
        success: true,
        data: groups,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error fetching groups' });
    }
  }

  /**
   * Create a new group
   */
  public static async createGroup(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const user = req.user!;
      const { name, description = '', currency = user.currency || 'INR' } = req.body;

      if (!name || !name.trim()) {
        res.status(400).json({ success: false, message: 'Group name is required.' });
        return;
      }

      const inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();

      const newGroup = await Group.create({
        name: name.trim(),
        description: description.trim(),
        currency,
        creatorId: userId,
        inviteCode,
        members: [
          {
            userId,
            name: user.name,
            email: user.email,
            joinedAt: new Date(),
          },
        ],
      });

      res.status(201).json({
        success: true,
        data: newGroup,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error creating group' });
    }
  }

  /**
   * Join group by invite code
   */
  public static async joinGroup(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = new mongoose.Types.ObjectId(req.userId);
      const user = req.user!;
      const { inviteCode } = req.body;

      if (!inviteCode || !inviteCode.trim()) {
        res.status(400).json({ success: false, message: 'Invite code is required.' });
        return;
      }

      const group = await Group.findOne({ inviteCode: inviteCode.trim().toUpperCase() });
      if (!group) {
        res.status(404).json({ success: false, message: 'Invalid or expired invite code.' });
        return;
      }

      const alreadyMember = group.members.some((m) => m.userId.toString() === userId.toString());
      if (alreadyMember) {
        res.status(200).json({
          success: true,
          message: 'You are already a member of this group.',
          data: group,
        });
        return;
      }

      group.members.push({
        userId,
        name: user.name,
        email: user.email,
        joinedAt: new Date(),
      });

      await group.save();

      res.status(200).json({
        success: true,
        message: `Successfully joined ${group.name}!`,
        data: group,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error joining group' });
    }
  }

  /**
   * Get single group details with expenses and simplified settlements
   */
  public static async getGroupDetails(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = new mongoose.Types.ObjectId(req.userId);

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: 'Invalid group ID' });
        return;
      }

      const group = await Group.findOne({ _id: id, 'members.userId': userId }).lean();
      if (!group) {
        res.status(404).json({ success: false, message: 'Group not found or access denied.' });
        return;
      }

      const [expenses, settlements] = await Promise.all([
        GroupExpense.find({ groupId: id }).sort({ date: -1 }).lean(),
        Settlement.find({ groupId: id }).sort({ date: -1 }).lean(),
      ]);

      // Calculate member net balances: totalPaid - totalOwed
      const netBalances: Record<string, number> = {};
      group.members.forEach((m) => {
        netBalances[m.userId.toString()] = 0;
      });

      // Factor in group expenses
      expenses.forEach((e) => {
        const paidById = e.paidBy.toString();
        if (netBalances[paidById] !== undefined) {
          netBalances[paidById] += e.amount;
        }

        e.splits.forEach((split) => {
          const splitUserId = split.userId.toString();
          if (netBalances[splitUserId] !== undefined) {
            netBalances[splitUserId] -= split.amount;
          }
        });
      });

      // Factor in settlements (fromUser paid toUser)
      settlements.forEach((s) => {
        const fromId = s.fromUserId.toString();
        const toId = s.toUserId.toString();
        if (netBalances[fromId] !== undefined) {
          netBalances[fromId] += s.amount;
        }
        if (netBalances[toId] !== undefined) {
          netBalances[toId] -= s.amount;
        }
      });

      // Debt simplification algorithm (greedy minimization)
      const debtors: Array<{ userId: string; amount: number }> = [];
      const creditors: Array<{ userId: string; amount: number }> = [];

      Object.entries(netBalances).forEach(([uId, net]) => {
        const rounded = Number(net.toFixed(2));
        if (rounded < -0.01) {
          debtors.push({ userId: uId, amount: -rounded });
        } else if (rounded > 0.01) {
          creditors.push({ userId: uId, amount: rounded });
        }
      });

      const simplifiedSettlements: Array<{
        fromUserId: string;
        fromName: string;
        toUserId: string;
        toName: string;
        amount: number;
      }> = [];

      let dIdx = 0;
      let cIdx = 0;

      while (dIdx < debtors.length && cIdx < creditors.length) {
        const debtor = debtors[dIdx];
        const creditor = creditors[cIdx];
        const settledAmount = Math.min(debtor.amount, creditor.amount);

        const fromMember = group.members.find((m) => m.userId.toString() === debtor.userId);
        const toMember = group.members.find((m) => m.userId.toString() === creditor.userId);

        simplifiedSettlements.push({
          fromUserId: debtor.userId,
          fromName: fromMember?.name || 'Member',
          toUserId: creditor.userId,
          toName: toMember?.name || 'Member',
          amount: Number(settledAmount.toFixed(2)),
        });

        debtor.amount -= settledAmount;
        creditor.amount -= settledAmount;

        if (debtor.amount < 0.01) dIdx++;
        if (creditor.amount < 0.01) cIdx++;
      }

      res.status(200).json({
        success: true,
        data: {
          group,
          expenses,
          settlements,
          netBalances,
          simplifiedSettlements,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error fetching group details' });
    }
  }

  /**
   * Add a group expense
   */
  public static async addGroupExpense(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = new mongoose.Types.ObjectId(req.userId);
      const { description, amount, paidBy, date = new Date(), category = 'Food', splitType = 'equal', splits } = req.body;

      const group = await Group.findOne({ _id: id, 'members.userId': userId });
      if (!group) {
        res.status(404).json({ success: false, message: 'Group not found or access denied.' });
        return;
      }

      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        res.status(400).json({ success: false, message: 'Valid positive amount required.' });
        return;
      }

      let finalSplits: any[] = [];

      if (splitType === 'equal') {
        const perPerson = Number((numAmount / group.members.length).toFixed(2));
        finalSplits = group.members.map((m, idx) => ({
          userId: m.userId,
          amount: idx === group.members.length - 1 ? Number((numAmount - perPerson * (group.members.length - 1)).toFixed(2)) : perPerson,
        }));
      } else if (Array.isArray(splits)) {
        finalSplits = splits.map((s) => ({
          userId: s.userId,
          amount: Number(s.amount),
        }));
      }

      const newExpense = await GroupExpense.create({
        groupId: id,
        description: description.trim(),
        amount: numAmount,
        currency: group.currency,
        paidBy: paidBy || userId,
        date: new Date(date),
        category,
        splitType,
        splits: finalSplits,
      });

      res.status(201).json({
        success: true,
        data: newExpense,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error adding group expense' });
    }
  }

  /**
   * Record a group settlement repayment
   */
  public static async recordSettlement(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = new mongoose.Types.ObjectId(req.userId);
      const { fromUserId, toUserId, amount, notes = '' } = req.body;

      const group = await Group.findOne({ _id: id, 'members.userId': userId });
      if (!group) {
        res.status(404).json({ success: false, message: 'Group not found or access denied.' });
        return;
      }

      const newSettlement = await Settlement.create({
        groupId: id,
        fromUserId: fromUserId || userId,
        toUserId,
        amount: Number(amount),
        currency: group.currency,
        date: new Date(),
        notes: notes.trim(),
      });

      res.status(201).json({
        success: true,
        data: newSettlement,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error recording settlement' });
    }
  }
}
