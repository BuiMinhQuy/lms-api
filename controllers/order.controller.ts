import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/cacthAsyncErrors";
import OrderModel, { IOrder } from "../models/order.model";
import userModel from "../models/user.model";
import CourseModel from "../models/course.model";
import path from "path";
import ejs from "ejs";
import sendMail from "../utils/sendMail";
import NotificationModel from "../models/notification.model";
import ErrorHandler from "../utils/ErrorHandler";
import { getAllOrdersService, newOrder } from "../services/order.service";

require("dotenv").config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
//create order
export const createOrder = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {courseId,payment_info} = req.body as IOrder;
        console.log(courseId)
        console.log(payment_info)
        let paymentIntentId: string | undefined;
        if(payment_info){
            if("id" in (payment_info as any)){
                paymentIntentId = (payment_info as any).id as string;
                // Guard against re-processing the same PaymentIntent
                const existingOrder = await OrderModel.findOne({ "payment_info.id": paymentIntentId });
                if (existingOrder) {
                    return res.status(200).json({ success: true, order: existingOrder });
                }

                const paymentIntent = await stripe.paymentIntents.retrieve(
                    paymentIntentId
                );
                console.log(paymentIntent.status)
                if(paymentIntent.status !== "succeeded"){
                    return next(new ErrorHandler("Payment not authorized",400))
                }
            }
        }
        const user = await userModel.findById(req.user?._id);
        console.log('user',user);
        const courseExistUser = user?.courses.some((course:any)=> course._id.toString() === courseId);
        
        if(courseExistUser){
            return next(new ErrorHandler('You already purchased this course',400))
        
        }

        const course = await CourseModel.findById(courseId);
        console.log('course',course)
        if(!course){
            return next(new ErrorHandler('Course not found',404));

        }
        const data:any ={
            courseId:course._id,
            userId: user?._id,
            payment_info,

        }
        const mailData ={
            order:{
                _id:course._id.toString().slice(0,6),
                name:course.name,
                price:course.price,
                date: new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})
            }
        }
        const html = await ejs.renderFile(path.join(__dirname,'../mails/order-confirmation.ejs'),{order:mailData});
        try{
            if(user){
                await sendMail({
                    email: user.email,
                    subject: 'Order Confirmation',
                    template:"order-confirmation.ejs",
                    data: mailData
                })
            }
        }catch(error:any){
            return next(new ErrorHandler(error.message,500));
            
        }
        // add course to user if not already added
        if(!user?.courses.some((c:any)=> c._id.toString() === course._id.toString())){
            user?.courses.push(course?._id);
        }

        await user?.save();
        await NotificationModel.create({
            userId:user?._id,
            title:"New Order",
            message:`You have a new order form ${course?.name}`
        });
        course.purchased ? course.purchased +=1 : course.purchased;
        
        await course.save();
        // Idempotent create: avoid duplicate orders for same PaymentIntent
        const existingOrder = paymentIntentId ? await OrderModel.findOne({ "payment_info.id": paymentIntentId }) : null;
        if (existingOrder) {
            return res.status(200).json({ success: true, order: existingOrder });
        }
        newOrder(data,res,next);
   

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))

    }
});
export const getAllOrders = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        try{    
            getAllOrdersService(res);
        }catch(error:any){
            return next(new ErrorHandler(error.message,400))
        }
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))

    }
});

// send stripe publishble key
export const sendStripePublishableKey = CatchAsyncError(async(req: Request, res: Response) => {
    res.status(200).json({
      publishablekey: process.env.STRIPE_PUBLISHABLE_KEY
    })
  });
  
  // new payment
  export const newPayment = CatchAsyncError(async(req: Request, res: Response, next: NextFunction) => {
    try {
      const myPayment = await stripe.paymentIntents.create({
        amount: req.body.amount,
        currency: "USD",
        metadata: {
          company: "E-Learning",
        },
        automatic_payment_methods: {
          enabled: true,
        }
      });
  
      res.status(201).json({
        success: true,
        client_secret: myPayment.client_secret
      })
  
    } catch (error:any) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
