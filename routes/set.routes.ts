import express from 'express';
import { authorizeRoles, isAuthenticated } from '../middleware/auth';
import { createSet, deleteSet, getSetbyId, updateSet } from '../controllers/set.controller';
const setRouter = express.Router();

setRouter.post(
    '/create-set',
    isAuthenticated,
    createSet
);

setRouter.put(
    '/update-set/:id',
    isAuthenticated,
    updateSet
);

setRouter.get(
    '/get-set/:id',
    getSetbyId
);


setRouter.delete(
    '/delete-set/:id',
    isAuthenticated,
    deleteSet
);




export default setRouter;