import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/cacthAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import CourseModel from "../models/course.model";
import OrderModel from "../models/order.model";
import userModel from "../models/user.model";
import NotificationModel from "../models/notification.model";
import path from "path";
import ejs from "ejs";
import sendMail from "../utils/sendMail";

require("dotenv").config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Create Stripe Checkout Session
export const createCheckoutSession = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { courseId, amount } = req.body;

        if (!courseId || !amount) {
            return next(new ErrorHandler("Course ID and amount are required", 400));
        }

        // Verify course exists
        const course = await CourseModel.findById(courseId);
        if (!course) {
            return next(new ErrorHandler("Course not found", 404));
        }

        // Get user from request (should be authenticated)
        const user = await userModel.findById(req.user?._id);
        if (!user) {
            return next(new ErrorHandler("User not found", 404));
        }

        // Check if user already purchased this course
        const courseExistUser = user.courses.some((c: any) => c._id.toString() === courseId);
        if (courseExistUser) {
            return next(new ErrorHandler("You already purchased this course", 400));
        }

        // Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: { 
                            name: course.name,
                            description: course.description || 'Course payment',
                        },
                        unit_amount: Math.round(amount * 100), // Convert to cents
                    },
                    quantity: 1,
                },
            ],
            metadata: {
                courseId: courseId,
                userId: user._id.toString(),
            },
            success_url: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/payment/cancel`,
        });

        res.status(200).json({
            success: true,
            url: session.url,
            sessionId: session.id,
        });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});

// Stripe Webhook Handler
export const stripeWebhook = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const sig = req.headers['stripe-signature'];
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

        if (!webhookSecret) {
            return next(new ErrorHandler("Stripe webhook secret is not configured", 500));
        }

        let event;

        try {
            event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        } catch (err: any) {
            console.error('Webhook signature verification failed:', err.message);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        // Handle the event
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;

            // Extract metadata
            const courseId = session.metadata?.courseId;
            const userId = session.metadata?.userId;

            if (!courseId || !userId) {
                console.error('Missing courseId or userId in session metadata');
                return res.status(400).json({ error: 'Missing metadata' });
            }

            // Check if order already exists
            const existingOrder = await OrderModel.findOne({ 
                "payment_info.id": session.id 
            });

            if (existingOrder) {
                console.log('Order already exists for this session');
                return res.status(200).json({ received: true });
            }

            // Get course and user
            const course = await CourseModel.findById(courseId);
            const user = await userModel.findById(userId);

            if (!course || !user) {
                console.error('Course or user not found');
                return res.status(404).json({ error: 'Course or user not found' });
            }

            // Check if user already has this course
            const courseExistUser = user.courses.some((c: any) => c._id.toString() === courseId);
            if (courseExistUser) {
                console.log('User already has this course');
                return res.status(200).json({ received: true });
            }

            // Create order
            const orderData = {
                courseId: course._id,
                userId: user._id,
                payment_info: {
                    id: session.id,
                    status: session.payment_status,
                    amount_total: session.amount_total,
                    currency: session.currency,
                },
            };

            await OrderModel.create(orderData);

            // Add course to user
            if (!user.courses.some((c: any) => c._id.toString() === course._id.toString())) {
                user.courses.push(course._id);
                await user.save();
            }

            // Send confirmation email
            const mailData = {
                order: {
                    _id: course._id.toString().slice(0, 6),
                    name: course.name,
                    price: course.price,
                    date: new Date().toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })
                }
            };

            try {
                await sendMail({
                    email: user.email,
                    subject: 'Order Confirmation',
                    template: "order-confirmation.ejs",
                    data: mailData
                });
            } catch (emailError: any) {
                // Silently handle email errors - don't spam logs
                // Email failure doesn't affect webhook processing
                // Uncomment below if you need to debug email issues:
                // console.warn('Failed to send email:', emailError.message);
            }

            // Create notification
            await NotificationModel.create({
                userId: user._id,
                title: "New Order",
                message: `You have a new order for ${course.name}`
            });

            // Update course purchased count
            course.purchased = (course.purchased || 0) + 1;
            await course.save();

            console.log('Order created successfully via webhook');
        }

        // Return a response to acknowledge receipt of the event
        res.status(200).json({ received: true });

    } catch (error: any) {
        console.error('Webhook error:', error);
        return next(new ErrorHandler(error.message, 500));
    }
});

