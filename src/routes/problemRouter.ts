import { Router } from "express";
import {
    contributeProblem,
    getProblem,
    getFeedProblems,
    getSubmissions,
    submitSolution,
    checkBatchSubmission,
} from "../controllers/problemController";
import axios from "axios";
import { authMiddleware } from "../middlewares/authMiddleware";
const problemRouter = Router();

problemRouter.get("/bulk", getFeedProblems);
problemRouter.post("/contribute", authMiddleware, contributeProblem);
problemRouter.post("/submit", authMiddleware, submitSolution);
problemRouter.get("/submission/:problemId", authMiddleware, getSubmissions);
problemRouter.get("/check/:taskId/:problemId", authMiddleware, checkBatchSubmission);
problemRouter.get("/:id", getProblem);

export default problemRouter;
