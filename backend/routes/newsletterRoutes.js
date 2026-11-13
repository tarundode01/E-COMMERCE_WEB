import express from 'express';
import Newsletter from '../models/Newsletter.js';

const router = express.Router();

/**
 * @desc    Subscribe an email to the VIP Privilege Newsletter
 * @route   POST /api/newsletter/subscribe
 * @access  Public
 */
router.post('/subscribe', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'The email address format appears invalid. Please check and retry.',
      });
    }

    const existing = await Newsletter.findOne({ email: normalizedEmail });
    if (existing) {
      if (existing.status === 'unsubscribed') {
        existing.status = 'active';
        await existing.save();
        return res.status(200).json({
          success: true,
          message: 'Welcome back! Your VIP newsletter subscription has been reactivated.',
        });
      }
      return res.status(200).json({
        success: true,
        message: 'You are already subscribed to our private atelier newsletter!',
      });
    }

    const subscriber = await Newsletter.create({
      email: normalizedEmail,
      status: 'active',
      source: 'storefront_footer',
    });

    return res.status(201).json({
      success: true,
      message: 'Welcome to our Private Atelier! Your VIP newsletter subscription is confirmed.',
      subscriber: {
        id: subscriber._id,
        email: subscriber.email,
        subscribedAt: subscriber.createdAt,
      },
    });
  } catch (error) {
    console.error('Newsletter subscribe error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to process subscription right now. Please try again later.',
    });
  }
});

export default router;
