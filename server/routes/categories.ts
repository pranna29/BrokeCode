import { Router } from 'express';
import { CategoryController } from '../controllers/categoryController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', CategoryController.getCategories);
router.post('/', CategoryController.createCategory);
router.post('/reorder', CategoryController.reorderCategories);
router.post('/restore-defaults', CategoryController.restoreDefaults);
router.put('/:id', CategoryController.updateCategory);
router.delete('/:id', CategoryController.deleteCategory);

export default router;
