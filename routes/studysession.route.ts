import express from 'express';
import { authorizeRoles, isAuthenticated } from '../middleware/auth';
import { createSet, deleteSet, getSetbyId, updateSet } from '../controllers/set.controller';
import { startStudySession, updateStudySession } from '../controllers/studysession.controller';
const studySessionRouter = express.Router();

studySessionRouter.post(
    '/create-session',
    isAuthenticated,
    startStudySession
);

studySessionRouter.put(
    '/update-session',
    isAuthenticated,
    updateStudySession
);





export default studySessionRouter;