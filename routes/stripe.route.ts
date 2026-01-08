import express from 'express';
import { isAuthenticated } from '../middleware/auth';
import { createCheckoutSession } from '../controllers/stripe.controller';

const stripeRouter = express.Router();

// Stripe Checkout - Create session
stripeRouter.post(
    "/stripe/checkout",
    isAuthenticated,
    createCheckoutSession
);

export default stripeRouter;

