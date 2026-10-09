import { Router } from 'express';
import { AnomalyController } from '../controllers/anomalyController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', AnomalyController.getAnomalies);
router.post('/recalculate', AnomalyController.recalculateAnomalies);
router.get('/metrics', AnomalyController.getEvaluationMetrics);
router.post('/:id/feedback', AnomalyController.submitFeedback);

export default router;
