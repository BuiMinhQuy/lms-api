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
import axios from "axios";
import crypto from "crypto";
import { getIO } from "../socketServer";

require("dotenv").config();

// PayOS API Configuration
const PAYOS_API_URL = "https://api-merchant.payos.vn/v2/payment-requests";
const PAYOS_CLIENT_ID = process.env.PAYOS_CLIENT_ID;
const PAYOS_API_KEY = process.env.PAYOS_API_KEY;
const PAYOS_CHECKSUM_KEY = process.env.PAYOS_CHECKSUM_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3001";

// Generate unique order code (using timestamp + random number)
// PayOS requires orderCode to be a positive integer
const generateOrderCode = (): number => {
    // Use current timestamp in seconds and add random number for uniqueness
    return Math.floor(Date.now() / 1000) * 1000 + Math.floor(Math.random() * 1000);
};

// Create signature for PayOS request
// PayOS requires signature from: amount, cancelUrl, description, orderCode, returnUrl
const createPayOSSignature = (data: {
    amount: number;
    cancelUrl: string;
    description: string;
    orderCode: number;
    returnUrl: string;
}): string => {
    if (!PAYOS_CHECKSUM_KEY) {
        throw new Error("PayOS checksum key is not configured");
    }

    // Create data object with only required fields for signature
    const signatureData = {
        amount: data.amount.toString(),
        cancelUrl: data.cancelUrl,
        description: data.description,
        orderCode: data.orderCode.toString(),
        returnUrl: data.returnUrl,
    };

    // Sort keys alphabetically and create query string
    const sortedKeys = Object.keys(signatureData).sort();
    const dataString = sortedKeys
        .map((key) => `${key}=${signatureData[key as keyof typeof signatureData]}`)
        .join("&");

    // Create HMAC-SHA256 signature
    const signature = crypto
        .createHmac("sha256", PAYOS_CHECKSUM_KEY)
        .update(dataString)
        .digest("hex");

    return signature;
};

// Create PayOS Payment Request and return QR code
export const createPayOSPayment = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { courseId, amount } = req.body;

            if (!courseId || !amount) {
                return next(new ErrorHandler("Course ID and amount are required", 400));
            }

            if (!PAYOS_CLIENT_ID || !PAYOS_API_KEY) {
                return next(new ErrorHandler("PayOS credentials are not configured", 500));
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

            // Generate unique order code
            const orderCode = generateOrderCode();

            // Set expire time (1 hour from now)
            const expiredAt = Math.floor(Date.now() / 1000) + 3600;

            // Prepare payment request data (without signature first)
            const cancelUrl = `${FRONTEND_URL}/payment/cancel`;
            const returnUrl = `${FRONTEND_URL}/payment/success?orderCode=${orderCode}`;
            
            // PayOS requires description to be max 25 characters
            // Create short description from course name or use order code
            let description = course.name.trim();
            if (description.length > 25) {
                // If course name is too long, truncate to 22 chars and add "..."
                description = description.substring(0, 22) + "...";
            }
            // If still too long (edge case) or empty, use order code
            if (description.length > 25 || !description) {
                description = `Khoa hoc ${orderCode.toString().slice(-6)}`;
            }
            
            const roundedAmount = Math.round(amount);

            // Create signature from required fields
            const signature = createPayOSSignature({
                amount: roundedAmount,
                cancelUrl: cancelUrl,
                description: description,
                orderCode: orderCode,
                returnUrl: returnUrl,
            });

            // Prepare final payment request data with signature
            const paymentData = {
                orderCode: orderCode,
                amount: roundedAmount, // Amount in VND
                description: description,
                cancelUrl: cancelUrl,
                returnUrl: returnUrl,
                expiredAt: expiredAt,
                signature: signature,
                items: [
                    {
                        name: course.name,
                        quantity: 1,
                        price: roundedAmount,
                    },
                ],
            };

            // Call PayOS API to create payment request
            const response = await axios.post(PAYOS_API_URL, paymentData, {
                headers: {
                    "x-client-id": PAYOS_CLIENT_ID,
                    "x-api-key": PAYOS_API_KEY,
                    "Content-Type": "application/json",
                },
            });

            if (response.data && response.data.code === "00") {
                const paymentInfo = response.data.data;

                // Save pending order to database
                const orderData = {
                    courseId: course._id,
                    userId: user._id,
                    payment_info: {
                        orderCode: paymentInfo.orderCode,
                        paymentLinkId: paymentInfo.paymentLinkId,
                        status: paymentInfo.status,
                        amount: paymentInfo.amount,
                        currency: paymentInfo.currency || "VND",
                        qrCode: paymentInfo.qrCode,
                        checkoutUrl: paymentInfo.checkoutUrl,
                        expiredAt: paymentInfo.expiredAt,
                        bin: paymentInfo.bin,
                        accountNumber: paymentInfo.accountNumber,
                        accountName: paymentInfo.accountName,
                    },
                };

                // Check if order with same orderCode already exists
                const existingOrder = await OrderModel.findOne({
                    "payment_info.orderCode": paymentInfo.orderCode,
                });

                if (!existingOrder) {
                    await OrderModel.create(orderData);
                }

                // Generate VietQR image URL if bin, accountNumber, and accountName are available
                let qrImageUrl: string | null = null;
                if (
                    paymentInfo.bin &&
                    paymentInfo.accountNumber &&
                    paymentInfo.accountName
                ) {
                    const descForQr = paymentInfo.description || description;
                    const amountForQr = roundedAmount;
                    
                    // URL encode the description and account name
                    const addInfo = encodeURIComponent(descForQr || "");
                    const accNameEnc = encodeURIComponent(paymentInfo.accountName);
                    
                    // Create VietQR URL
                    qrImageUrl = `https://api.vietqr.io/image/${paymentInfo.bin}-${paymentInfo.accountNumber}-vietqr_pro.jpg?addInfo=${addInfo}&amount=${amountForQr}&accountName=${accNameEnc}`;
                }

                // Return QR code and payment info to frontend
                res.status(200).json({
                    success: true,
                    data: {
                        qrCode: paymentInfo.qrCode,
                        checkoutUrl: paymentInfo.checkoutUrl,
                        orderCode: paymentInfo.orderCode,
                        amount: paymentInfo.amount,
                        description: paymentInfo.description,
                        expiredAt: paymentInfo.expiredAt,
                        qrImageUrl: qrImageUrl,
                    },
                });
            } else {
                return next(
                    new ErrorHandler(
                        response.data?.desc || "Failed to create payment request",
                        500
                    )
                );
            }
        } catch (error: any) {
            if (error.response) {
                return next(
                    new ErrorHandler(
                        error.response.data?.desc || error.response.data?.message || error.message,
                        error.response.status || 500
                    )
                );
            }
            return next(new ErrorHandler(error.message, 500));
        }
    }
);

// Verify PayOS webhook signature
// Based on PayOS documentation: build key=value&... with keys sorted alphabetically
// null/undefined values are converted to empty string
const verifyWebhookSignature = (data: any, signature: string): boolean => {
    if (!PAYOS_CHECKSUM_KEY || !data) {
        console.error("Missing checksum key or data");
        return false;
    }

    // For development: allow skipping signature verification
    if (process.env.NODE_ENV === 'development' && process.env.SKIP_PAYOS_SIGNATURE_VERIFY === 'true') {
        console.warn("⚠️  Skipping PayOS signature verification (development mode)");
        return true;
    }

    try {
        // PayOS rule: build key=value&... with keys sorted alphabetically
        // null/undefined values are converted to empty string
        const keyValues: string[] = [];
        
        // Get all keys and sort alphabetically
        const sortedKeys = Object.keys(data).sort();
        
        // Build key=value pairs
        sortedKeys.forEach((key) => {
            let value = data[key];
            
            // Convert null/undefined to empty string
            if (value === null || value === undefined) {
                value = '';
            } else if (typeof value === 'string' && (value === 'null' || value === 'undefined')) {
                // Handle string "null" or "undefined" as empty string
                value = '';
            } else {
                // Convert to string for other types
                value = String(value);
            }
            
            keyValues.push(`${key}=${value}`);
        });

        // Join with &
        const message = keyValues.join('&');

        // Create HMAC-SHA256 signature
        const computedSignature = crypto
            .createHmac("sha256", PAYOS_CHECKSUM_KEY)
            .update(message, 'utf8')
            .digest("hex");

        // Compare signatures (case-insensitive)
        const isMatch = computedSignature.toLowerCase() === signature.toLowerCase();
        
        if (!isMatch) {
            console.error("Signature mismatch:", {
                computed: computedSignature,
                received: signature,
                message: message,
                dataKeys: sortedKeys,
            });
        }

        return isMatch;
    } catch (error) {
        console.error("Error verifying webhook signature:", error);
        return false;
    }
};

// PayOS Webhook Handler
export const payOSWebhook = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            // PayOS may send signature in header or body
            // Check both locations
            const signature = req.headers["x-payos-signature"] || req.body.signature;
            const data = req.body.data || req.body;

            if (!data || !signature) {
                console.error("Missing data or signature", {
                    hasData: !!data,
                    hasSignature: !!signature,
                    headers: req.headers,
                    bodyKeys: Object.keys(req.body),
                });
                return res.status(400).json({ error: "Missing data or signature" });
            }

            // Log for debugging (remove in production)
            console.log("Webhook received:", {
                dataKeys: Object.keys(data),
                signatureLength: signature?.length,
            });

            // Verify webhook signature
            const isValid = verifyWebhookSignature(data, signature);
            if (!isValid) {
                console.error("Invalid webhook signature", {
                    data,
                    receivedSignature: signature,
                });
                return res.status(401).json({ error: "Invalid signature" });
            }

            const { orderCode, status, amount, code, desc } = data;

            // Log webhook data for debugging
            console.log("Processing webhook:", {
                orderCode,
                status,
                amount,
                code,
                desc,
            });

            // PayOS uses code='00' and desc='success' to indicate successful payment
            // Some webhooks may also have status='PAID'
            const isPaymentSuccess = 
                code === "00" || 
                desc === "success" || 
                status === "PAID";

            // Check if order already processed
            const existingOrder = await OrderModel.findOne({
                "payment_info.orderCode": orderCode,
            });

            if (!existingOrder) {
                // This might be a test webhook from PayOS dashboard
                // or an order that doesn't exist in our system
                console.warn("Order not found for orderCode:", orderCode, "- This might be a test webhook");
                
                // Return success to prevent PayOS from retrying
                // Only log error if it's a real payment notification
                if (isPaymentSuccess) {
                    // This is a real payment but order doesn't exist - log error
                    console.error("Real payment received for non-existent order:", orderCode);
                    return res.status(200).json({ 
                        success: true, 
                        message: "Order not found but acknowledged" 
                    });
                }
                
                // For test webhooks, just acknowledge
                return res.status(200).json({ 
                    success: true, 
                    message: "Webhook received (test or unknown order)" 
                });
            }

            // If order is already completed, ignore
            if (existingOrder.payment_info && (existingOrder.payment_info as any).status === "PAID") {
                return res.status(200).json({ success: true, message: "Order already processed" });
            }

            // Only process if payment is successful
            if (isPaymentSuccess) {
                const courseId = existingOrder.courseId;
                const userId = existingOrder.userId;

                // Get course and user
                const course = await CourseModel.findById(courseId);
                const user = await userModel.findById(userId);

                if (!course || !user) {
                    console.error("Course or user not found");
                    return res.status(404).json({ error: "Course or user not found" });
                }

                // Check if user already has this course
                const courseExistUser = user.courses.some(
                    (c: any) => c._id.toString() === courseId.toString()
                );
                if (courseExistUser) {
                    console.log("User already has this course");
                    // Update order status anyway
                    existingOrder.payment_info = {
                        ...existingOrder.payment_info,
                        status: "PAID",
                    };
                    await existingOrder.save();
                    return res.status(200).json({ success: true, message: "Course already added" });
                }

                // Update order status
                existingOrder.payment_info = {
                    ...existingOrder.payment_info,
                    status: "PAID",
                };
                await existingOrder.save();

                // Add course to user
                if (!user.courses.some((c: any) => c._id.toString() === course._id.toString())) {
                    user.courses.push(course._id);
                    await user.save();
                }

                // Send confirmation email (non-blocking - don't wait for it)
                const mailData = {
                    order: {
                        _id: course._id.toString().slice(0, 6),
                        name: course.name,
                        price: amount,
                        date: new Date().toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                        }),
                    },
                };

                // Send email in background, don't block webhook processing
                sendMail({
                    email: user.email,
                    subject: "Order Confirmation",
                    template: "order-confirmation.ejs",
                    data: mailData,
                }).catch((emailError: any) => {
                    // Silently handle email errors - don't spam logs
                    // Email failure doesn't affect webhook processing
                    // Uncomment below if you need to debug email issues:
                    // console.warn("[EMAIL] Failed to send confirmation email:", emailError.message);
                });

                // Create notification
                const notification = await NotificationModel.create({
                    userId: user._id,
                    title: "New Order",
                    message: `You have a new order for ${course.name}`,
                });

                // Update course purchased count
                course.purchased = (course.purchased || 0) + 1;
                await course.save();

                // Emit socket event to notify frontend about successful payment
                try {
                    const io = getIO();
                    const userRoom = `user_${userId}`;
                    
                    const paymentSuccessData = {
                        orderCode: orderCode,
                        courseId: courseId.toString(),
                        courseName: course.name,
                        amount: amount,
                        message: "Payment successful! Course has been added to your account.",
                        notification: notification,
                    };
                    
                    // Emit to specific user's room
                    io.to(userRoom).emit("paymentSuccess", paymentSuccessData);
                    console.log(`[SOCKET] 💰 Emitted paymentSuccess event to room: ${userRoom}`);
                    console.log(`[SOCKET] 📤 Payment data:`, {
                        userId: userId.toString(),
                        orderCode: orderCode,
                        courseName: course.name,
                        amount: amount,
                    });
                    
                    // Check how many sockets are in the room
                    const room = io.sockets.adapter.rooms.get(userRoom);
                    const roomSize = room ? room.size : 0;
                    console.log(`[SOCKET] 📊 Room ${userRoom} has ${roomSize} connected socket(s)`);
                    
                    // Also emit notification to all clients (for admin dashboard if needed)
                    io.emit("newNotification", notification);
                    console.log(`[SOCKET] 📢 Broadcasted newNotification to all clients`);
                    
                } catch (socketError: any) {
                    console.error(`[SOCKET] ❌ Failed to emit socket event:`, socketError.message);
                    // Don't fail the webhook if socket fails
                }

                console.log("Order processed successfully via webhook");
            }

            // Return success response
            res.status(200).json({ success: true });
        } catch (error: any) {
            console.error("Webhook error:", error);
            return next(new ErrorHandler(error.message, 500));
        }
    }
);

// Check payment status
export const checkPaymentStatus = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { orderCode } = req.query;

            if (!orderCode) {
                return next(new ErrorHandler("Order code is required", 400));
            }

            // Find order in database
            const order = await OrderModel.findOne({
                "payment_info.orderCode": orderCode,
            });

            if (!order) {
                return next(new ErrorHandler("Order not found", 404));
            }

            const paymentInfo = order.payment_info as any;

            res.status(200).json({
                success: true,
                data: {
                    orderCode: paymentInfo.orderCode,
                    status: paymentInfo.status,
                    amount: paymentInfo.amount,
                },
            });
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 500));
        }
    }
);

