import express, { NextFunction, Request, Response } from 'express';
import { FolderModel } from '../models/folder.model';
import { CatchAsyncError } from '../middleware/cacthAsyncErrors';
import ErrorHandler from '../utils/ErrorHandler';
import { StudySessionModel } from '../models/studysession.model';
import { FlashcardModel } from '../models/flashcard.model';


const shuffleArray = (array: any[]) => array.sort(() => Math.random() - 0.5);
// create folder
export const startStudySession = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    const { userId, setId } = req.body;
    try {


        let session = await StudySessionModel.findOne({ user: userId, set: setId });

        // Nếu chưa có session, tạo mới
        if (!session) {
            session = new StudySessionModel({ user: userId, set: setId });
            await session.save();
        }

        // Lấy các flashcards chưa trả lời
        const completedFlashcards = session.completedFlashcards;
        const allFlashcards = await FlashcardModel.find({ set: setId });
        const unansweredFlashcards = allFlashcards.filter(
            flashcard => !completedFlashcards.includes(flashcard._id)
        );

        // Xáo trộn ngẫu nhiên danh sách câu hỏi chưa trả lời
        const shuffledFlashcards = shuffleArray(unansweredFlashcards);

        res.status(200).json({
            session,
            flashcards: shuffledFlashcards
        });
    } catch (error: any) {
        next(new ErrorHandler(error.message, 500))
    }
})




export const updateStudySession = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    const { sessionId, completedFlashcardId, score } = req.body;
    try {
        const session = await StudySessionModel.findById(sessionId);

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        // Thêm flashcard đã hoàn thành vào danh sách nếu chưa có
        if (completedFlashcardId && !session.completedFlashcards.includes(completedFlashcardId)) {
            session.completedFlashcards.push(completedFlashcardId);
        }

        session.score = score || session.score;
        session.lastStudiedAt = new Date();
        await session.save();

        res.status(200).json(session);

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))

    }
});

export const getStudySessionbyId = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    const { userId, setId } = req.params;

    try {
        const session = await StudySessionModel.findOne({ user: userId, set: setId });

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        res.status(200).json(session);



    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))

    }
});

// get all courses --without purchasing 
export const deleteStudySession = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    const { userId, setId } = req.params;
    try {
        const session = await StudySessionModel.findOneAndDelete({ user: userId, set: setId });

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        res.status(204).send();

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))

    }
});



