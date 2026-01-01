import express, { NextFunction, Request, Response } from 'express';
import { FolderModel } from '../models/folder.model';
import { CatchAsyncError } from '../middleware/cacthAsyncErrors';
import ErrorHandler from '../utils/ErrorHandler';
import { FlashcardModel } from '../models/flashcard.model';

// create folder
export const createFlashcard = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { question, answer, category, tags, owner, set, image } = req.body;

        const newFlashcard = new FlashcardModel({ question, answer, category, tags, owner, set, image });
        const savedFlashcard = await newFlashcard.save();
        res.status(201).json(savedFlashcard);

    } catch (error: any) {
        next(new ErrorHandler(error.message, 500))
    }
})




export const updateFlashcard = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const updatedFlashcard = await FlashcardModel.findByIdAndUpdate(
            req.params.flashcardId,
            req.body,
            { new: true }
          );
          if (!updatedFlashcard) return res.status(404).json({ error: 'Flashcard not found' });
          res.status(200).json(updatedFlashcard);

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))

    }
});

export const getFlashcardbyId = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const flashcard = await FlashcardModel.findById(req.params.flashcardId);
        if (!flashcard) return res.status(404).json({ error: 'Flashcard not found' });
        res.status(200).json(flashcard);

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))

    }
});

// get all courses --without purchasing 
export const deleteFlashcard = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const deletedFlashcard = await FlashcardModel.findByIdAndDelete(req.params.flashcardId);
        if (!deletedFlashcard) return res.status(404).json({ error: 'Flashcard not found' });
        res.status(204).send();

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))

    }
});



// get all courses --without purchasing 
export const getRandomFourAnswer = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    const { keyword } = req.query;

    try {
        const flashcard = await FlashcardModel.findById(req.params.flashcardId);
        if (!flashcard) return res.status(404).json({ error: 'Flashcard not found' });
    
        // Lấy các flashcards khác trong cùng bộ câu hỏi (`set`) để tạo các lựa chọn sai
        const otherFlashcards = await FlashcardModel.find({ set: flashcard.set, _id: { $ne: flashcard._id } });
        const incorrectAnswers = otherFlashcards.map(fc => fc.answer);
    
        // Lấy ngẫu nhiên 3 đáp án sai và thêm đáp án đúng vào mảng lựa chọn
        const randomIncorrectAnswers = incorrectAnswers.sort(() => 0.5 - Math.random()).slice(0, 3);
        const options = [...randomIncorrectAnswers, flashcard.answer].sort(() => 0.5 - Math.random());
    
        res.status(200).json({
          question: flashcard.question,
          options: options,
          image: flashcard.image,
          correctAnswer: flashcard.answer // Có thể ẩn khi thực hiện `test`
        });


    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))

    }
});

