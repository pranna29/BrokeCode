import { Router } from 'express';
import { GroupController } from '../controllers/groupController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', GroupController.getGroups);
router.post('/', GroupController.createGroup);
router.post('/join', GroupController.joinGroup);
router.get('/:id', GroupController.getGroupDetails);
router.post('/:id/expenses', GroupController.addGroupExpense);
router.post('/:id/settlements', GroupController.recordSettlement);

export default router;
