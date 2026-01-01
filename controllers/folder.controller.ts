import express, { NextFunction, Request, Response } from 'express';
import { FolderModel } from '../models/folder.model';
import { CatchAsyncError } from '../middleware/cacthAsyncErrors';
import ErrorHandler from '../utils/ErrorHandler';
import { SetModel } from '../models/set.model';

// create folder
export const createFolder = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, owner } = req.body;
        const newFolder = new FolderModel({ name, owner });
        const savedFolder = await newFolder.save();
        res.status(201).json(savedFolder);

    } catch (error: any) {
        next(new ErrorHandler(error.message, 500))
    }
})




export const updateFolder = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name } = req.body;
        const updatedFolder = await FolderModel.findByIdAndUpdate(
          req.params.folderId,
          { name, updatedAt: new Date() },
          { new: true }
        );
        if (!updatedFolder) return res.status(404).json({ error: 'Folder not found' });
        res.status(200).json(updatedFolder);

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))

    }
});

export const getFolderbyId = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const folders = await FolderModel.find({ owner: req.params.userId });
        res.status(200).json(folders);



    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))

    }
});

// get all courses --without purchasing 
export const deleteFolder = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const deletedFolder = await FolderModel.findByIdAndDelete(req.params.folderId);
    if (!deletedFolder) return res.status(404).json({ error: 'Folder not found' });
    res.status(204).send();

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))

    }
});

export const getAllSetsbyId = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const sets = await SetModel.find({ folder: req.params.folderId });
        res.status(200).json(sets);



    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))

    }
});




