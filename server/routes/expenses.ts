import { Router, Response } from 'express';
import { ExpenseController } from '../controllers/expenseController.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { seedDemoTransactions } from '../seed/demoData.js';

const router = Router();

router.use(requireAuth);

router.get('/', ExpenseController.getExpenses);
router.post('/', ExpenseController.createExpense);
router.get('/export-csv', ExpenseController.exportCSV);
router.post('/import-csv', ExpenseController.importCSV);
router.post('/bulk-delete', ExpenseController.bulkDeleteExpenses);

// Seed synthetic student transactions for testing
router.post('/seed-demo', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await seedDemoTransactions(req.userId!);
    res.status(200).json({
      success: true,
      message: `Successfully loaded ${result.count} synthetic demo transactions with ${result.anomaliesCount} detected anomalies.`,
      result,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Error seeding demo data' });
  }
});

router.get('/:id', ExpenseController.getExpenseById);
router.put('/:id', ExpenseController.updateExpense);
router.delete('/:id', ExpenseController.deleteExpense);

export default router;
