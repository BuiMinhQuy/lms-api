import express from 'express';
import { authorizeRoles, isAuthenticated } from '../middleware/auth';
import { getCouresAnalytics, getOrdersAnalytics, getUsersAnalytics } from '../controllers/analytic.controller';
const analyticsRouter = express.Router();

analyticsRouter.get(
    "/get-users-analytics",
    isAuthenticated,
    authorizeRoles("admin"),
    getUsersAnalytics
);

analyticsRouter.get(
    "/get-courses-analytics",
    isAuthenticated,
    authorizeRoles("admin"),
    getCouresAnalytics
);

analyticsRouter.get(
    "/get-orders-analytics",
    isAuthenticated,
    authorizeRoles("admin"),
    getOrdersAnalytics
);




export default analyticsRouter;
