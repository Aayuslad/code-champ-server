import { Router } from "express";
import {
	signupUser,
	verifySignupOTP,
	fetchUserProfile,
	signinUser,
	signoutUser,
	sendPasswordResetOTP,
	verifyPasswordResetOTP,
	updatePassword,
} from "../controllers/userController";
import { authMiddleware } from "../middlewares/authMiddleware";

const userRouter = Router();

userRouter.post("/signup", signupUser);
userRouter.post("/signup/verify-otp", verifySignupOTP);
userRouter.get("/profile", authMiddleware, fetchUserProfile);
userRouter.post("/signin", signinUser);
userRouter.post("/signout", authMiddleware, signoutUser);
userRouter.post("/password-reset/send-otp", sendPasswordResetOTP);
userRouter.post("/password-reset/verify-otp", verifyPasswordResetOTP);
userRouter.post("/password-reset/update", updatePassword);

export default userRouter;
