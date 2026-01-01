import express from 'express';
import { authorizeRoles, isAuthenticated } from '../middleware/auth';
import { askAIbyText, conversation, StreamConversation } from '../controllers/ai.controller';
import { updateAccessToken } from '../controllers/user.controller';
const aiRouter = express.Router();

aiRouter.post(
    '/generateText',
    updateAccessToken,
    isAuthenticated,
    askAIbyText
);


aiRouter.post(
    '/conversation',
    updateAccessToken,
    isAuthenticated,
    conversation
);

aiRouter.post(
    '/streamConversation',
    updateAccessToken,
    isAuthenticated,
    StreamConversation
);





export default aiRouter;