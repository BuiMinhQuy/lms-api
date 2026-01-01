import express from 'express';
import { authorizeRoles, isAuthenticated } from '../middleware/auth';
import { createSet, deleteSet, getSetbyId, updateSet } from '../controllers/set.controller';
const categoryRouter = express.Router();

categoryRouter.post(
    '/create-category',
    isAuthenticated,
    createSet
);

categoryRouter.put(
    '/update-category/:id',
    isAuthenticated,
    updateSet
);

categoryRouter.get(
    '/get-category/:id',
    getSetbyId
);


categoryRouter.delete(
    '/delete-category/:id',
    isAuthenticated,
    deleteSet
);




export default categoryRouter;