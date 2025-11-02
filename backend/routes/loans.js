const express = require('express');
const Loan = require('../models/Loan');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get loan eligibility
router.post('/eligibility', auth, async (req, res) => {
  try {
    const { amount, purpose, duration } = req.body;

    // Simulate eligibility calculation
    const user = await User.findById(req.user._id);

    const eligibility = {
      eligible: true,
      maxAmount: 500000,
      interestRate: 8.5,
      emi: Math.round((amount * (1 + (8.5/100) * (duration/12))) / duration),
      factors: {
        creditScore: 750,
        incomeStability: 'Good',
        landHolding: 'Verified',
        repaymentHistory: 'Excellent'
      },
      requirements: [
        'Aadhaar card',
        'Bank statements (6 months)',
        'Land documents',
        'Income proof'
      ]
    };

    res.json(eligibility);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Apply for loan
router.post('/apply', auth, async (req, res) => {
  try {
    const { amount, purpose, duration, documents } = req.body;

    const interestRate = 8.5; // Fixed rate for simulation
    const emi = Math.round((amount * (1 + (interestRate/100) * (duration/12))) / duration);
    const totalAmount = amount + (amount * interestRate/100 * duration/12);

    const loan = new Loan({
      applicant: req.user._id,
      amount,
      purpose,
      duration,
      interestRate,
      emi,
      totalAmount,
      documents
    });

    await loan.save();
    await loan.populate('applicant', 'name email phone');

    res.status(201).json({
      message: 'Loan application submitted successfully',
      loan
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user's loans
router.get('/my-loans', auth, async (req, res) => {
  try {
    const loans = await Loan.find({ applicant: req.user._id })
      .sort({ createdAt: -1 });

    res.json(loans);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get loan by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id)
      .populate('applicant', 'name email phone location');

    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    // Check if user owns this loan
    if (loan.applicant._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(loan);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update loan status (admin only)
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status, disbursedDate } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const loan = await Loan.findById(req.params.id);
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    loan.status = status;
    if (status === 'disbursed' && disbursedDate) {
      loan.disbursedDate = disbursedDate;
    }

    await loan.save();

    res.json({
      message: 'Loan status updated successfully',
      loan
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Make loan payment
router.post('/:id/payment', auth, async (req, res) => {
  try {
    const { amount, paymentMethod } = req.body;

    const loan = await Loan.findById(req.params.id);
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    if (loan.applicant.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (loan.status !== 'disbursed') {
      return res.status(400).json({ message: 'Loan not yet disbursed' });
    }

    // Add payment to loan
    loan.payments.push({
      amount,
      date: new Date(),
      status: 'paid'
    });

    // Check if loan is fully paid
    const totalPaid = loan.payments.reduce((sum, payment) => sum + payment.amount, 0);
    if (totalPaid >= loan.totalAmount) {
      loan.status = 'repaid';
    }

    await loan.save();

    res.json({
      message: 'Payment processed successfully',
      payment: loan.payments[loan.payments.length - 1],
      remainingAmount: loan.totalAmount - totalPaid
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get loan calculator
router.post('/calculator', async (req, res) => {
  try {
    const { amount, interestRate, duration } = req.body;

    const monthlyRate = interestRate / 100 / 12;
    const emi = (amount * monthlyRate * Math.pow(1 + monthlyRate, duration)) /
                (Math.pow(1 + monthlyRate, duration) - 1);

    const totalAmount = emi * duration;
    const totalInterest = totalAmount - amount;

    res.json({
      emi: Math.round(emi),
      totalAmount: Math.round(totalAmount),
      totalInterest: Math.round(totalInterest),
      breakdown: {
        principal: amount,
        interest: Math.round(totalInterest),
        total: Math.round(totalAmount)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get loan schemes
router.get('/schemes', async (req, res) => {
  try {
    const schemes = [
      {
        id: 'kisancredit',
        name: 'Kisan Credit Card',
        description: 'Revolving credit facility for farmers',
        maxAmount: 300000,
        interestRate: 7,
        features: ['Flexible repayment', 'Cash withdrawal', 'Input purchase']
      },
      {
        id: 'agribusiness',
        name: 'Agri Business Loan',
        description: 'Loan for agricultural business activities',
        maxAmount: 1000000,
        interestRate: 9,
        features: ['Equipment purchase', 'Working capital', 'Longer tenure']
      },
      {
        id: 'croploan',
        name: 'Crop Loan',
        description: 'Short-term loan for crop cultivation',
        maxAmount: 200000,
        interestRate: 7,
        features: ['Quick disbursement', 'Flexible tenure', 'Collateral free']
      }
    ];

    res.json({ schemes });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
