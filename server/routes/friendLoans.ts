import { Router } from 'express';
import { FriendLoanController } from '../controllers/friendLoanController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', FriendLoanController.getLoans);
router.post('/', FriendLoanController.createLoan);
router.post('/:id/repayments', FriendLoanController.addRepayment);
router.delete('/:id', FriendLoanController.deleteLoan);

export default router;
