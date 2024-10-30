import { Router } from "express";
import {
    contributeProblem,
    getProblem,
    getFeedProblems,
    getSubmissions,
    submitSolution,
    checkBatchSubmission,
    putOngoingProblem,
    getOngoingProblem,
    testSolution,
} from "../controllers/problemController";
import { authMiddleware } from "../middlewares/authMiddleware";
const problemRouter = Router();

problemRouter.get("/bulk", getFeedProblems);
problemRouter.post("/contribute", authMiddleware, contributeProblem);
problemRouter.post("/submit", authMiddleware, submitSolution);
problemRouter.post("/test", authMiddleware, testSolution);
problemRouter.get("/submission/:problemId", authMiddleware, getSubmissions);
problemRouter.get("/check/:taskId/:problemId", authMiddleware, checkBatchSubmission);
problemRouter.put("/ongoing-problem", authMiddleware, putOngoingProblem);
problemRouter.get("/ongoing-problem/:problemId/:userId", authMiddleware, getOngoingProblem);
problemRouter.get("/:id", getProblem);

export default problemRouter;
