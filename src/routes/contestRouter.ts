import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware";
import {
    createContest,
    getContestRegisterDetails,
    getLeaderBard,
    getLiveContestDetails,
    getFeedContests,
    registerUserForContest,
} from "../controllers/contestController";
const contestRouter = Router();

contestRouter.post("/create", authMiddleware, createContest);
contestRouter.get("/feed/:userId", getFeedContests);
contestRouter.post("/register/:contestId", authMiddleware, registerUserForContest);
contestRouter.get("/register-details/:contestId/:userId", getContestRegisterDetails);
contestRouter.get("/live-contest/:contestId", authMiddleware, getLiveContestDetails);
contestRouter.get("/live-contest/leader-board/:contestId", getLeaderBard);

export default contestRouter;
