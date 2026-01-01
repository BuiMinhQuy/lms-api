import { activateUser, deleteUser, forgotPassword, getAllUsers, getUserInfo, loginUser, logoutUser, registrationUser, socialAuth, updateAccessToken, updatePassword, updateProfilePicture, updateUserInfo, updateUserRole, verifyForgotPassword } from '../controllers/user.controller';
import express from 'express';
import { authorizeRoles, isAuthenticated } from '../middleware/auth';
import { access } from 'fs';
const router = express.Router();

router.post(
    '/registration',
    registrationUser
);
router.post(
    '/activate-user',
    activateUser
);
router.post(
    '/login-user',
    loginUser
);
router.get(
    '/logout',
    updateAccessToken,
    isAuthenticated,
    logoutUser
);
router.get(
    '/refresh',
    updateAccessToken,
    // (req, res) => {
    //     res.status(200).json({
    //         success: true,
    //         message: "Token refreshed successfully"
    //         ,accessToken: req.body.accessToken,
    //         refreshToken: req.body.refreshToken

    //     });
    // }
);
router.get(
    '/me',
    updateAccessToken,
    isAuthenticated,
    getUserInfo
);


router.post(
    '/social-auth',
    socialAuth
);

router.put(
    '/update-user-info',
    updateAccessToken,
    isAuthenticated,
    updateUserInfo
);

router.put(
    '/update-user-password',
    updateAccessToken,
    isAuthenticated,
    updatePassword
);

router.put(
    '/update-user-avatar',
    updateAccessToken,
    isAuthenticated,
    updateProfilePicture
);

router.post(
    '/forgot-password',
    forgotPassword
);

router.post(
    '/verify-forgot-password',
    verifyForgotPassword
);

router.get(
    '/get-all-users',
    updateAccessToken,
    isAuthenticated,
    authorizeRoles("admin"),
    getAllUsers
);
//only -- admin
router.put(
    '/update-user-role',
    updateAccessToken,
    isAuthenticated,
    authorizeRoles("admin"),
    updateUserRole
);
//only -- admin
router.delete(
    '/delete-user',
    updateAccessToken,
    isAuthenticated,
    authorizeRoles("admin"),
    deleteUser
);



export default router;
