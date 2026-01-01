import express from 'express';
import { authorizeRoles, isAuthenticated } from '../middleware/auth';
import { createFolder, deleteFolder, getFolderbyId, updateFolder } from '../controllers/folder.controller';
import { getAllSetsbyId } from './../controllers/folder.controller';
const folderRouter = express.Router();

folderRouter.post(
    '/create-folder',
    isAuthenticated,
    authorizeRoles('admin'),
    createFolder
);

folderRouter.put(
    '/update-folder/:id',
    isAuthenticated,
    authorizeRoles('admin'),
    updateFolder
);

folderRouter.get(
    '/get-folder/:id',
    getFolderbyId
);

folderRouter.get(
    '/get-all-sets-of-folder/:id',
    getAllSetsbyId
);



folderRouter.delete(
    '/delete-folder/:id',
    isAuthenticated,
    deleteFolder
);




export default folderRouter;