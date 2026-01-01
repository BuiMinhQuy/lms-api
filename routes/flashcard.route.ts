import express from 'express';
import { authorizeRoles, isAuthenticated } from '../middleware/auth';
import { createFlashcard, deleteFlashcard, getFlashcardbyId, getRandomFourAnswer, updateFlashcard } from '../controllers/flashcard.controller';
const flashcardRouter = express.Router();

flashcardRouter.post(
    '/create-flashcard',
    isAuthenticated,
    createFlashcard
);

flashcardRouter.put(
    '/update-flashcard/:id',
    isAuthenticated,
    updateFlashcard
);

flashcardRouter.get(
    '/get-flashcard/:id',
    getFlashcardbyId
);

flashcardRouter.get(
    '/get-four-answers/:flashcardId',
    getRandomFourAnswer
);


flashcardRouter.delete(
    '/delete-flashcard/:id',
    isAuthenticated,
    deleteFlashcard
);




export default flashcardRouter;