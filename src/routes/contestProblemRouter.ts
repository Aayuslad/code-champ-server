import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware";
import {
    checkContestBatchSubmission,
    getContestProblem,
    getContestSubmissions,
    getOngoingContestProblem,
    putOngoingContestProblem,
    submitContestSolution,
    testContestSolution,
} from "../controllers/contestProblemController";
const contestProblemRouter = Router();

contestProblemRouter.get("/:contestProblemId/:participantId", authMiddleware, getContestProblem);
contestProblemRouter.put("/ongoing-problem", authMiddleware, putOngoingContestProblem);
contestProblemRouter.get("/ongoing-problem/:contestProblemId/:participantId", authMiddleware, getOngoingContestProblem);
contestProblemRouter.post("/test", authMiddleware, testContestSolution);
contestProblemRouter.post("/submit", authMiddleware, submitContestSolution);
contestProblemRouter.get("/check/:taskId/:contestProblemId", authMiddleware, checkContestBatchSubmission);
contestProblemRouter.get("/submissions/:contestProblemId/:participantId", authMiddleware, getContestSubmissions);

export default contestProblemRouter;
