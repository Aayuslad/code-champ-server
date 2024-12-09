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
    getProblemsBySearch,
    getProblemForContribution,
    contrubuteTestCases,
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
problemRouter.get("/search", getProblemsBySearch);
problemRouter.get("/for-contribution/:problemId", getProblemForContribution);
problemRouter.get("/:id", getProblem);
problemRouter.post("/contribute-testcases", contrubuteTestCases);

export default problemRouter;
