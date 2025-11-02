const express = require('express');
const ColdStorage = require('../models/ColdStorage');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all cold storage facilities
router.get('/', async (req, res) => {
  try {
    const {
      city,
      state,
      minCapacity,
      maxCapacity,
      page = 1,
      limit = 10
    } = req.query;

    let query = { isActive: true };

    if (city) query['location.city'] = new RegExp(city, 'i');
    if (state) query['location.state'] = new RegExp(state, 'i');
    if (minCapacity || maxCapacity) {
      query['facilities.totalCapacity'] = {};
      if (minCapacity) query['facilities.totalCapacity'].$gte = parseInt(minCapacity);
      if (maxCapacity) query['facilities.totalCapacity'].$lte = parseInt(maxCapacity);
    }

    const coldStorages = await ColdStorage.find(query)
      .populate('owner', 'name phone profile ratings')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ 'ratings.average': -1 });

    const total = await ColdStorage.countDocuments(query);

    res.json({
      coldStorages,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get cold storage by ID
router.get('/:id', async (req, res) => {
  try {
    const coldStorage = await ColdStorage.findById(req.params.id)
      .populate('owner', 'name email phone profile ratings location')
      .populate('bookings.user', 'name phone');

    if (!coldStorage) {
      return res.status(404).json({ message: 'Cold storage facility not found' });
    }

    res.json(coldStorage);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create cold storage facility (cold storage owners only)
router.post('/', auth, requireRole('coldstorage'), async (req, res) => {
  try {
    const coldStorageData = {
      ...req.body,
      owner: req.user._id
    };

    const coldStorage = new ColdStorage(coldStorageData);
    await coldStorage.save();

    await coldStorage.populate('owner', 'name profile.avatar ratings');

    res.status(201).json({
      message: 'Cold storage facility created successfully',
      coldStorage
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update cold storage facility
router.put('/:id', auth, requireRole('coldstorage'), async (req, res) => {
  try {
    const coldStorage = await ColdStorage.findById(req.params.id);

    if (!coldStorage) {
      return res.status(404).json({ message: 'Cold storage facility not found' });
    }

    if (coldStorage.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const updatedColdStorage = await ColdStorage.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    ).populate('owner', 'name profile.avatar ratings');

    res.json({
      message: 'Cold storage facility updated successfully',
      coldStorage: updatedColdStorage
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete cold storage facility
router.delete('/:id', auth, requireRole('coldstorage'), async (req, res) => {
  try {
    const coldStorage = await ColdStorage.findById(req.params.id);

    if (!coldStorage) {
      return res.status(404).json({ message: 'Cold storage facility not found' });
    }

    if (coldStorage.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await ColdStorage.findByIdAndDelete(req.params.id);

    res.json({ message: 'Cold storage facility deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get owner's cold storage facilities
router.get('/owner/my-facilities', auth, requireRole('coldstorage'), async (req, res) => {
  try {
    const coldStorages = await ColdStorage.find({ owner: req.user._id })
      .sort({ createdAt: -1 });

    res.json(coldStorages);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Book cold storage
router.post('/:id/book', auth, async (req, res) => {
  try {
    const { crop, quantity, startDate, endDate, specialInstructions } = req.body;

    const coldStorage = await ColdStorage.findById(req.params.id);
    if (!coldStorage) {
      return res.status(404).json({ message: 'Cold storage facility not found' });
    }

    // Check availability
    if (coldStorage.facilities.availableCapacity < quantity) {
      return res.status(400).json({ message: 'Insufficient capacity available' });
    }

    // Calculate cost
    const days = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
    const cost = days * quantity * coldStorage.pricing.perTonPerDay;

    const booking = {
      user: req.user._id,
      crop,
      quantity,
      startDate,
      endDate,
      status: 'pending',
      cost
    };

    coldStorage.bookings.push(booking);
    coldStorage.facilities.availableCapacity -= quantity;

    await coldStorage.save();

    res.json({
      message: 'Cold storage booking created successfully',
      booking: {
        ...booking,
        facility: coldStorage.name,
        totalCost: cost
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user's bookings
router.get('/user/bookings', auth, async (req, res) => {
  try {
    const bookings = await ColdStorage.find({
      'bookings.user': req.user._id
    }, {
      name: 1,
      location: 1,
      bookings: {
        $elemMatch: { user: req.user._id }
      }
    });

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update booking status
router.put('/:id/booking/:bookingId', auth, requireRole('coldstorage'), async (req, res) => {
  try {
    const { status } = req.body;

    const coldStorage = await ColdStorage.findById(req.params.id);
    if (!coldStorage) {
      return res.status(404).json({ message: 'Cold storage facility not found' });
    }

    if (coldStorage.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const booking = coldStorage.bookings.id(req.params.bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    booking.status = status;

    // Update capacity if booking is cancelled or completed
    if (status === 'cancelled' || status === 'completed') {
      coldStorage.facilities.availableCapacity += booking.quantity;
    }

    await coldStorage.save();

    res.json({
      message: 'Booking status updated successfully',
      booking
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get facility bookings for owner
router.get('/:id/bookings', auth, requireRole('coldstorage'), async (req, res) => {
  try {
    const coldStorage = await ColdStorage.findById(req.params.id)
      .populate('bookings.user', 'name phone');

    if (!coldStorage) {
      return res.status(404).json({ message: 'Cold storage facility not found' });
    }

    if (coldStorage.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(coldStorage.bookings);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
