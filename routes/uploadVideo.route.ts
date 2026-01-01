import express from 'express';
import { authorizeRoles, isAuthenticated } from '../middleware/auth';
import { uploadVideo } from '../controllers/video.controller';
const uploadRouter = express.Router();



uploadRouter.post(
    '/upload-video',
    uploadVideo
);
    







export default uploadRouter;