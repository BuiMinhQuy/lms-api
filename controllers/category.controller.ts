import express, { NextFunction, Request, Response } from 'express';
import { FolderModel } from '../models/folder.model';
import { CatchAsyncError } from '../middleware/cacthAsyncErrors';
import ErrorHandler from '../utils/ErrorHandler';
import { CategoryModel } from '../models/categories.model';

// create folder
export const createCategory = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, description } = req.body;
        const newCategory = new CategoryModel({ name, description });
        const savedCategory = await newCategory.save();
        res.status(201).json(savedCategory);
    } catch (error: any) {
        next(new ErrorHandler(error.message, 500))
    }
})




export const updateCategory = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const updatedCategory = await CategoryModel.findByIdAndUpdate(
            req.params.categoryId,
            req.body,
            { new: true }
        );
        if (!updatedCategory) return res.status(404).json({ error: 'Category not found' });
        res.status(200).json(updatedCategory);

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))

    }
});

export const getCategorybyId = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const category = await CategoryModel.findById(req.params.categoryId);
        if (!category) return res.status(404).json({ error: 'Category not found' });
        res.status(200).json(category);



    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))

    }
});

// get all courses --without purchasing 
export const deleteCategory = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const deletedCategory = await CategoryModel.findByIdAndDelete(req.params.categoryId);
        if (!deletedCategory) return res.status(404).json({ error: 'Category not found' });
        res.status(204).send();

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))

    }
});



