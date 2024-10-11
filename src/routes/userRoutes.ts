import { Router } from "express";
import jwt from "jsonwebtoken";
import passport from "passport";
import {
	fetchUserProfile,
	sendPasswordResetOTP,
	signinUser,
	signoutUser,
	signupUser,
	updatePassword,
	verifyPasswordResetOTP,
	verifySignupOTP
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
userRouter.get(
    "/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/" }),
    (req, res) => {
        if (req.user) {
            const token = jwt.sign({ id: req.user.id }, process.env.JWT_SECRET as string, { expiresIn: "30d" });

            res.cookie("token", token, {
                httpOnly: true,
                secure: true,
                sameSite: "none",
            });

            res.redirect("https://app.code-champ.xyz/home"); // Redirect to your frontend app
        } else {
            res.status(401).json({ error: "Authentication failed" });
        }
    }
);

export default userRouter;
