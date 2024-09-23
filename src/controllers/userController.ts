import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { sendOTPMail } from "../services/mailService";
import {
    sendPasswordResetOTPShema,
    signinUserSchema,
    signupUserSchema,
    updatePasswordSchema,
    verifyPasswordResetOTPSchema,
    verifySignupOTPSchema,
} from "@aayushlad/code-champ-common";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
const prisma = new PrismaClient();
const otpLength = 6;
const PEPPER = process.env.BCRYPT_PEPPER;

// Handles user signup and sends a verification email
export async function signupUser(req: Request, res: Response) {
    const { email, userName, password } = req.body;

    try {
        if (req.session.signupEmail && !email && !userName && !password) {
            const otp = parseInt(
                Math.floor(100000 + Math.random() * 900000)
                    .toString()
                    .slice(0, otpLength),
            );

            req.session.signupOTP = otp;

            await sendOTPMail(req.session.signupEmail, otp);

            return res.status(200).json({
                message: "OTP Resent to Email",
            });
        }

        const parsed = signupUserSchema.safeParse({
            email,
            userName,
            password,
        });
        if (parsed.error?.issues[0]?.message) {
            return res.status(422).json({ message: parsed.error?.issues[0]?.message });
        }
        if (!parsed.success) return res.status(422).json({ message: "Invalid data" });

        const emailExists = await prisma.user.findUnique({ where: { email } });
        if (emailExists) {
            return res.status(400).json({ message: "Email is already in use" });
        }

        const userNameExists = await prisma.user.findUnique({ where: { userName } });
        if (userNameExists) {
            return res.status(400).json({ message: "Username is already in use" });
        }

        const otp = parseInt(
            Math.floor(100000 + Math.random() * 900000)
                .toString()
                .slice(0, otpLength),
        );

        req.session.signupOTP = otp;
        req.session.signupEmail = email;
        req.session.userName = userName;
        req.session.password = password;

        await sendOTPMail(email, otp);

        return res.status(200).json({
            message: "OTP Sent to Email",
        });
    } catch {
        res.status(500).json({
            message: "Internal Server Error",
        });
    }
}

// Verifies the OTP sent during signup
export async function verifySignupOTP(req: Request, res: Response) {
    const { otp } = req.body;

    try {
        const parsed = verifySignupOTPSchema.safeParse({ otp });
        if (!parsed.success) return res.status(422).json({ message: "Invalid OTP" });

        if (parseInt(otp) !== req.session.signupOTP) {
            return res.status(400).json({
                message: "Wrong OTP",
            });
        }

        const passwordWithPepper = (req.session.password as string) + PEPPER;
        const hashedPassword = await bcrypt.hash(passwordWithPepper, 10);

        const user = await prisma.user.create({
            data: {
                email: req.session.signupEmail as string,
                userName: req.session.userName as string,
                password: hashedPassword,
            },
        });

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET as string, { expiresIn: "30d" });

        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
        });

        req.session.signupOTP = undefined;
        req.session.signupEmail = undefined;
        req.session.userName = undefined;
        req.session.password = undefined;

        return res.json({ message: "Successfully signed up!" });
    } catch {
        res.status(500).json({
            message: "Internal Server Error",
        });
    }
}

// Retrieves the user's profile
export async function fetchUserProfile(req: Request, res: Response) {
    try {
        const user = await prisma.user.findFirst({
            where: {
                id: req.user?.id,
            },
        });

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        return res.json({
            id: user.id,
            email: user.email,
            userName: user.userName,
        });
    } catch (error) {
        res.status(500).json({
            message: "Internal Server Error",
        });
    }
}

// Signs in the user
export async function signinUser(req: Request, res: Response) {
    const { emailOrUsername, password } = req.body;

    try {
        const parsed = signinUserSchema.safeParse({
            emailOrUsername,
            password,
        });
        if (!parsed.success) return res.status(422).json({ message: "Invalid data" });

        const user = await prisma.user.findFirst({
            where: {
                OR: [{ email: emailOrUsername }, { userName: emailOrUsername }],
            },
            select: {
                id: true,
                password: true,
            },
        });
        if (!user) {
            return res.status(400).json({
                message: "Invalid email or username",
            });
        }

        const passwordWithPepper = password + PEPPER;
        const isPasswordCorrect = await bcrypt.compare(passwordWithPepper, user.password);
        if (!isPasswordCorrect) {
            return res.status(400).json({
                message: "wrong password",
            });
        }

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET as string, { expiresIn: "30d" });

        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
        });

        return res.json({ message: "Successfully signed in!" });
    } catch {
        res.status(500).json({
            message: "Internal Server Error",
        });
    }
}

// Logs out the user
export async function signoutUser(req: Request, res: Response) {
    res.clearCookie("token");
    return res.json({ message: "signed out" });
}

// Sends an OTP to the user's email when they forget their password
export async function sendPasswordResetOTP(req: Request, res: Response) {
    const { email } = req.body;

    try {
        if (req.session.passwordResetEmail && !email) {
            const otp = parseInt(
                Math.floor(100000 + Math.random() * 900000)
                    .toString()
                    .slice(0, otpLength),
            );

            req.session.passwordResetOTP = otp;

            await sendOTPMail(req.session.passwordResetEmail, otp);

            return res.status(200).json({
                message: "OTP Resent to Email",
            });
        }

        const parsed = sendPasswordResetOTPShema.safeParse({ email });
        if (parsed.error?.issues[0]?.message) {
            return res.status(422).json({ message: parsed.error?.issues[0]?.message });
        }
        if (!parsed.success) return res.status(422).json({ message: "Invalid email" });

        const user = await prisma.user.findFirst({ where: { email } });
        if (!user) return res.status(400).json({ message: "Account does not exist with this email" });

        const otp = parseInt(
            Math.floor(100000 + Math.random() * 900000)
                .toString()
                .slice(0, otpLength),
        );

        req.session.passwordResetOTP = otp;
        req.session.passwordResetEmail = email;
        req.session.canResetPassword = false;
        await sendOTPMail(email, otp);

        return res.status(200).json({
            message: "OTP Sent to Email",
        });
    } catch {
        res.status(500).json({
            message: "Internal Server Error",
        });
    }
}

// Verifies the OTP sent to the user's email when they forget their password
export async function verifyPasswordResetOTP(req: Request, res: Response) {
    const { otp } = req.body;

    try {
        const parsed = verifyPasswordResetOTPSchema.safeParse({ otp });
        if (!parsed.success) return res.status(422).json({ message: "Invalid OTP" });

        if (parseInt(otp) !== req.session.passwordResetOTP) {
            return res.status(400).json({
                message: "Wrong OTP",
            });
        }

        req.session.canResetPassword = true;

        return res.json({ message: "OTP verified" });
    } catch {
        res.status(500).json({
            message: "Internal Server Error",
        });
    }
}

// Allows the user to update their password after OTP verification
export async function updatePassword(req: Request, res: Response) {
    const { password } = req.body;

    try {
        const parsed = updatePasswordSchema.safeParse({ password });
        if (!parsed.success) return res.status(422).json({ message: "Invalid password" });

        if (!req.session.canResetPassword) {
            return res.status(400).json({
                message: "OTP not verified",
            });
        }

        const passwordWithPepper = password + PEPPER;
        const hashedPassword = await bcrypt.hash(passwordWithPepper, 10);

        await prisma.user.update({
            where: {
                email: req.session.passwordResetEmail as string,
            },
            data: {
                password: hashedPassword,
            },
        });

        req.session.passwordResetOTP = undefined;
        req.session.passwordResetEmail = undefined;
        req.session.canResetPassword = undefined;

        return res.json({ message: "Password updated" });
    } catch {
        res.status(500).json({
            message: "Internal Server Error",
        });
    }
}
