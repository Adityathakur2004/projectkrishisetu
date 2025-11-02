const express = require('express');
const Message = require('../models/Message');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get user's conversations
router.get('/conversations', auth, async (req, res) => {
  try {
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: req.user._id },
            { receiver: req.user._id }
          ]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: {
              if: { $eq: ['$sender', req.user._id] },
              then: '$receiver',
              else: '$sender'
            }
          },
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$receiver', req.user._id] },
                    { $eq: ['$read', false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          user: {
            _id: 1,
            name: 1,
            profile: 1,
            role: 1
          },
          lastMessage: {
            content: 1,
            createdAt: 1,
            type: 1
          },
          unreadCount: 1
        }
      }
    ]);

    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get messages with a specific user
router.get('/:userId', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: req.params.userId },
        { sender: req.params.userId, receiver: req.user._id }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .populate('sender', 'name profile.avatar')
    .populate('receiver', 'name profile.avatar');

    // Mark messages as read
    await Message.updateMany(
      {
        sender: req.params.userId,
        receiver: req.user._id,
        read: false
      },
      { read: true, readAt: new Date() }
    );

    res.json(messages.reverse()); // Reverse to show chronological order
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Send message
router.post('/:userId', auth, async (req, res) => {
  try {
    const { content, type = 'text' } = req.body;

    // Check if receiver exists
    const receiver = await User.findById(req.params.userId);
    if (!receiver) {
      return res.status(404).json({ message: 'User not found' });
    }

    const message = new Message({
      sender: req.user._id,
      receiver: req.params.userId,
      content,
      type
    });

    await message.save();
    await message.populate('sender', 'name profile.avatar');
    await message.populate('receiver', 'name profile.avatar');

    // Emit socket event (would be handled by socket.io)
    // io.to(req.params.userId).emit('receiveMessage', message);

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mark messages as read
router.put('/:userId/read', auth, async (req, res) => {
  try {
    await Message.updateMany(
      {
        sender: req.params.userId,
        receiver: req.user._id,
        read: false
      },
      { read: true, readAt: new Date() }
    );

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete message
router.delete('/:messageId', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Message.findByIdAndDelete(req.params.messageId);

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get unread message count
router.get('/unread/count', auth, async (req, res) => {
  try {
    const count = await Message.countDocuments({
      receiver: req.user._id,
      read: false
    });

    res.json({ unreadCount: count });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Send WhatsApp message (integration placeholder)
router.post('/:userId/whatsapp', auth, async (req, res) => {
  try {
    const { content } = req.body;

    // In a real implementation, this would integrate with WhatsApp Business API
    // For now, we'll simulate the response

    const whatsappMessage = {
      to: req.params.userId,
      content,
      sent: true,
      messageId: 'WA' + Date.now(),
      timestamp: new Date()
    };

    res.json({
      message: 'WhatsApp message sent successfully',
      whatsappMessage
    });
  } catch (error) {
    res.status(500).json({ message: 'WhatsApp service error', error: error.message });
  }
});

// Get message statistics
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const stats = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: req.user._id },
            { receiver: req.user._id }
          ]
        }
      },
      {
        $group: {
          _id: null,
          totalMessages: { $sum: 1 },
          sentMessages: {
            $sum: { $cond: [{ $eq: ['$sender', req.user._id] }, 1, 0] }
          },
          receivedMessages: {
            $sum: { $cond: [{ $eq: ['$receiver', req.user._id] }, 1, 0] }
          },
          unreadMessages: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$receiver', req.user._id] },
                    { $eq: ['$read', false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    res.json(stats[0] || {
      totalMessages: 0,
      sentMessages: 0,
      receivedMessages: 0,
      unreadMessages: 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
