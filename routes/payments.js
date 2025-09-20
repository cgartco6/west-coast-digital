const express = require('express');
const {
  processPayment,
  handleITN,
  getPaymentHistory,
  getPayment,
  refundPayment
} = require('../controllers/paymentController');
const { protect, admin } = require('../middleware/auth');

const router = express.Router();

// PayFast ITN endpoint (no auth required)
router.post('/notify', handleITN);

// Protected routes
router.use(protect);
router.post('/process', processPayment);
router.get('/history', getPaymentHistory);
router.get('/:id', getPayment);

// Admin routes
router.use(admin);
router.post('/:id/refund', refundPayment);

module.exports = router;
