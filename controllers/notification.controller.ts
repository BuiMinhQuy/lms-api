import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/cacthAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import NotificationModel from "../models/notification.model";
import { schedule } from './../node_modules/@types/node-cron/index.d';
import cron from "node-cron";

// get all notification -- only admin
export const getNotifications = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const notifications = await NotificationModel.find().sort({createdAt:-1});

        res.status(200).json({
            status: true,
            notifications
        })

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))

    }
});

export const updateNotification = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const notification = await NotificationModel.findById(req.params.id);
        if (!notification) {
            return next(new ErrorHandler("Something went wrong",400)); 

        }else{
            notification.status  ? (notification.status === "unread" ? notification.status = "read" : notification.status === "read"  )
            : notification?.status;

        }
        await notification?.save();
        const notifications = await NotificationModel.find().sort({
            createdAt: -1

        });
        res.status(200).json({
            success: true,
            notifications
        })

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))

    }
});

export const template = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {





    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))

    }
});

// cron.schedule("*/5 * * * * *", function () {
//     console.log("------------");
//     console.log("running a task every 5 minutes");
// })

cron.schedule("0 0 0 * * *",async()=>{
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
     await NotificationModel.deleteMany({status:"read",createdAt:{$lt:thirtyDaysAgo}})
     console.log("Deleted Read Notification")
    
})