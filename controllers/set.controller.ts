import express, { NextFunction, Request, Response } from 'express';
import { FolderModel } from '../models/folder.model';
import { CatchAsyncError } from '../middleware/cacthAsyncErrors';
import ErrorHandler from '../utils/ErrorHandler';
import { SetModel } from '../models/set.model';

// create folder
export const createSet = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { title, description, flashcards, owner, isPublic, tags, category } = req.body;
        const newSet = new SetModel({ title, description, flashcards, owner, isPublic, tags, category });
        const savedSet = await newSet.save();
        res.status(201).json(savedSet);

    } catch (error: any) {
        next(new ErrorHandler(error.message, 500))
    }
})




export const updateSet = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const updatedSet = await SetModel.findByIdAndUpdate(
            req.params.setId,
            req.body,
            { new: true }
        );
        if (!updatedSet) return res.status(404).json({ error: 'Set not found' });
        res.status(200).json(updatedSet);

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))

    }
});

export const getSetbyId = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const sets = await SetModel.find({ owner: req.params.userId });
        res.status(200).json(sets);



    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))

    }
});

// get all courses --without purchasing 
export const deleteSet = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const deletedSet = await SetModel.findByIdAndDelete(req.params.setId);
        if (!deletedSet) return res.status(404).json({ error: 'Set not found' });
        res.status(204).send();

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))

    }
});



// get all courses --without purchasing 
export const searchSet = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    const { keyword } = req.query;

    try {
        const sets = await SetModel.find({
            title: { $regex: keyword as string, $options: 'i' }
        });
        res.status(200).json(sets);


    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))

    }
});

// get all courses --without purchasing 
export const getIsPublic = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {

    try {
        const isPublic = req.params.isPublic === 'true';
        const sets = await SetModel.find({ isPublic });
        res.status(200).json(sets);


    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))

    }
});

