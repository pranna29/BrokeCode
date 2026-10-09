import { Router } from 'express';
import { AnalyticsController } from '../controllers/analyticsController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/summary', AnalyticsController.getSummary);
router.get('/period-report', AnalyticsController.getPeriodReport);
router.get('/calendar', AnalyticsController.getCalendarData);
router.get('/monthly-trends', AnalyticsController.getMonthlyTrends);
router.get('/category-breakdown', AnalyticsController.getCategoryBreakdown);
router.get('/anomaly-distribution', AnalyticsController.getAnomalyDistribution);
router.get('/merchant-insights', AnalyticsController.getMerchantInsights);

export default router;
