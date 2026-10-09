import { Router } from 'express';
import { SmsImportController } from '../controllers/smsImportController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.post('/parse', SmsImportController.parseRawSms);
router.post('/ingest', SmsImportController.ingestSmsTransactions);
router.get('/pending', SmsImportController.getPendingTransactions);
router.post('/pending/:id/confirm', SmsImportController.confirmPendingTransaction);
router.post('/pending/:id/ignore', SmsImportController.ignorePendingTransaction);
router.post('/pending/batch-confirm', SmsImportController.batchConfirm);

export default router;
