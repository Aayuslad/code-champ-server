import { Router } from "express";
import {
  adminLogin,
  adminLogout,
  adminStatus,
  getQuestionRequests,
  getContestRequests,
  approveQuestionRequest,
  approveContestRequest,
  rejectQuestionRequest,
  rejectContestRequest
} from "../controllers/adminController";
import { adminMiddleware } from "../middlewares/adminMiddleware";

const adminRouter = Router();


adminRouter.post("/login", adminLogin);
adminRouter.post("/logout", adminLogout);
adminRouter.get("/status", adminMiddleware, adminStatus);

// Admin question/contest requests and approval/rejection routes
adminRouter.get("/question-requests", adminMiddleware, getQuestionRequests);
adminRouter.get("/contest-requests", adminMiddleware, getContestRequests);
adminRouter.post("/question-requests/:id/approve", adminMiddleware, approveQuestionRequest);
adminRouter.post("/contest-requests/:id/approve", adminMiddleware, approveContestRequest);
adminRouter.post("/question-requests/:id/reject", adminMiddleware, rejectQuestionRequest);
adminRouter.post("/contest-requests/:id/reject", adminMiddleware, rejectContestRequest);

export default adminRouter;
