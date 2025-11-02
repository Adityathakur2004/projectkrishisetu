const express = require('express');
const axios = require('axios');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get government schemes
router.get('/schemes', auth, async (req, res) => {
  try {
    const { category, state, eligibility } = req.query;

    // In a real implementation, this would fetch from government APIs
    // For now, we'll return mock data

    const schemes = [
      {
        id: 'pmkisan',
        name: 'PM-KISAN',
        description: 'Income support scheme for farmers',
        category: 'Financial Support',
        eligibility: 'Small and marginal farmers',
        benefits: '₹6,000 per year in three installments',
        applicationProcess: 'Online through official portal',
        documents: ['Aadhaar', 'Bank details', 'Land records'],
        status: 'Active'
      },
      {
        id: 'soilhealth',
        name: 'Soil Health Card Scheme',
        description: 'Soil testing and health management',
        category: 'Technical Support',
        eligibility: 'All farmers',
        benefits: 'Free soil testing, customized fertilizer recommendations',
        applicationProcess: 'Through local agriculture office',
        documents: ['Land documents', 'Identity proof'],
        status: 'Active'
      },
      {
        id: 'cropinsurance',
        name: 'Pradhan Mantri Fasal Bima Yojana',
        description: 'Crop insurance against natural calamities',
        category: 'Insurance',
        eligibility: 'Farmers growing notified crops',
        benefits: 'Coverage against yield loss due to natural calamities',
        applicationProcess: 'Through banks and CSC centers',
        documents: ['Land records', 'Crop details', 'Bank account'],
        status: 'Active'
      }
    ];

    let filteredSchemes = schemes;

    if (category) {
      filteredSchemes = filteredSchemes.filter(scheme =>
        scheme.category.toLowerCase().includes(category.toLowerCase())
      );
    }

    if (state) {
      // Filter by state if state-specific schemes exist
      filteredSchemes = filteredSchemes.filter(scheme =>
        !scheme.stateSpecific || scheme.states?.includes(state)
      );
    }

    res.json({
      schemes: filteredSchemes,
      total: filteredSchemes.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Check scheme eligibility
router.post('/schemes/:schemeId/eligibility', auth, async (req, res) => {
  try {
    const { schemeId } = req.params;
    const userData = req.body;

    // Simulate eligibility check
    const eligibility = {
      eligible: true,
      score: 85,
      criteria: {
        landHolding: 'Satisfied',
        income: 'Satisfied',
        documents: 'All verified',
        residence: 'Satisfied'
      },
      missingRequirements: [],
      nextSteps: [
        'Complete online application',
        'Upload required documents',
        'Submit through CSC center'
      ]
    };

    res.json(eligibility);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Apply for scheme
router.post('/schemes/:schemeId/apply', auth, async (req, res) => {
  try {
    const { schemeId } = req.params;
    const applicationData = req.body;

    // Simulate application submission
    const application = {
      id: 'APP' + Date.now(),
      schemeId,
      userId: req.user._id,
      status: 'Submitted',
      submittedAt: new Date(),
      documents: applicationData.documents,
      trackingId: 'TRK' + Math.random().toString(36).substr(2, 9).toUpperCase()
    };

    res.json({
      message: 'Application submitted successfully',
      application
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get application status
router.get('/applications/:applicationId', auth, async (req, res) => {
  try {
    const { applicationId } = req.params;

    // Simulate application status
    const status = {
      id: applicationId,
      status: 'Under Review',
      submittedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      lastUpdated: new Date(),
      progress: 60,
      nextSteps: 'Document verification in progress',
      estimatedCompletion: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    };

    res.json(status);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get MSP rates
router.get('/msp', async (req, res) => {
  try {
    const { crop, year } = req.query;

    // Mock MSP data
    const mspData = [
      {
        crop: 'Wheat',
        year: 2024,
        msp: 2275,
        bonus: 225,
        total: 2500
      },
      {
        crop: 'Rice',
        year: 2024,
        msp: 2040,
        bonus: 240,
        total: 2280
      },
      {
        crop: 'Cotton',
        year: 2024,
        msp: 6260,
        bonus: 240,
        total: 6500
      }
    ];

    let filteredData = mspData;

    if (crop) {
      filteredData = filteredData.filter(item =>
        item.crop.toLowerCase().includes(crop.toLowerCase())
      );
    }

    if (year) {
      filteredData = filteredData.filter(item => item.year === parseInt(year));
    }

    res.json({
      msp: filteredData,
      lastUpdated: new Date()
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get weather alerts
router.get('/weather-alerts', async (req, res) => {
  try {
    const { location } = req.query;

    // Mock weather alerts
    const alerts = [
      {
        id: 1,
        type: 'Heavy Rainfall',
        severity: 'High',
        location: 'Maharashtra',
        description: 'Heavy rainfall expected in next 24 hours',
        startDate: new Date(),
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        advice: 'Secure crops, ensure proper drainage'
      },
      {
        id: 2,
        type: 'Heat Wave',
        severity: 'Medium',
        location: 'Rajasthan',
        description: 'Temperature above 45°C expected',
        startDate: new Date(),
        endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        advice: 'Increase irrigation, provide shade to crops'
      }
    ];

    res.json({
      alerts,
      total: alerts.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get subsidy information
router.get('/subsidies', auth, async (req, res) => {
  try {
    const { category } = req.query;

    // Mock subsidy data
    const subsidies = [
      {
        id: 'solarpump',
        name: 'Solar Pump Subsidy',
        category: 'Equipment',
        description: 'Subsidy for solar-powered irrigation pumps',
        amount: 'Up to ₹2,00,000',
        eligibility: 'Farmers with irrigation needs',
        applicationDeadline: new Date('2024-12-31'),
        status: 'Available'
      },
      {
        id: 'dripirrigation',
        name: 'Micro Irrigation Subsidy',
        category: 'Equipment',
        description: 'Subsidy for drip and sprinkler irrigation systems',
        amount: '55% of total cost',
        eligibility: 'All farmers',
        applicationDeadline: new Date('2024-11-30'),
        status: 'Available'
      }
    ];

    let filteredSubsidies = subsidies;

    if (category) {
      filteredSubsidies = filteredSubsidies.filter(subsidy =>
        subsidy.category.toLowerCase().includes(category.toLowerCase())
      );
    }

    res.json({
      subsidies: filteredSubsidies,
      total: filteredSubsidies.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
