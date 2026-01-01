import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/cacthAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";

export const template = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {




        res.status(200).json({
            success:true,
            message: "Layout created successfully"
        })  
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))

    }
});