import { Router } from "express";
import passport from "passport";
import {
    fetchUserProfile,
    googleOAuth20Controller,
    googleOneTapController,
    sendPasswordResetOTP,
    signinUser,
    signoutUser,
    signupUser,
    updatePassword,
    verifyPasswordResetOTP,
    verifySignupOTP,
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
// Trigger Google OAuth process
userRouter.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));
// Google OAuth callback URL
userRouter.get("/auth/google/callback", passport.authenticate("google", { failureRedirect: "/" }), googleOAuth20Controller);
// Google one tap login
userRouter.post("/auth/google-one-tap", googleOneTapController);

export default userRouter;
