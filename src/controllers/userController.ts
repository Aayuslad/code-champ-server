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
import { prisma } from "../lib/prisma";
import logger from "../lib/logger";
const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const otpLength = 6;
const PEPPER = process.env.BCRYPT_PEPPER;

// Handles user signup and sends a verification email
export async function signupUser(req: Request, res: Response) {
    const { email, name, userName, password } = req.body;

    try {
        if (req.session.signupEmail && !email && !name && !userName && !password) {
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
            name,
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
        req.session.name = name;
        req.session.userName = userName;
        req.session.password = password;

        logger.info("Data stored in session for signup:", {
            email: req.session.signupEmail,  
            name: req.session.name,
            userName: req.session.userName,
            password: req.session.password,
            otp: req.session.signupOTP,
        })

        await sendOTPMail(email, otp);

        logger.info("OTP sent to email");

        return res.status(200).json({
            message: "OTP Sent to Email",
        });
    } catch (error) {
        logger.error(error);
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

        logger.info("Verifying OTP for signup:", {
            otp: otp,
            sessionOTP: req.session.signupOTP,
            email: req.session.signupEmail,
            name: req.session.name,
            userName: req.session.userName,
        });

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
                name: req.session.name as string,
                userName: req.session.userName as string,
                password: hashedPassword,
            },
        });

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET as string, { expiresIn: "30d" });

        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
        });

        req.session.signupOTP = undefined;
        req.session.signupEmail = undefined;
        req.session.name = undefined;
        req.session.userName = undefined;
        req.session.password = undefined;

        return res.json({ message: "Successfully signed up!" });
    } catch (error) {
        logger.error(error);
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
            profileImg: user.profileImg,
            avatar: user.avatar,
        });
    } catch (error) {
        res.status(500).json({
            message: "Internal Server Error",
        });
    }
}

export async function fetchWholeUserProfile(req: Request, res: Response) {
    try {
        const [user, platformData] = await Promise.all([
            prisma.user.findUnique({
                where: { id: req.params.id },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    userName: true,
                    profileImg: true,
                    avatar: true,
                    points: true,
                    rank: true,
                    Submission: {
                        where: { status: "Accepted", points: { not: 0 } },
                        distinct: ["problemId"],
                        orderBy: { createdAt: "desc" },
                        select: {
                            languageId: true,
                            problem: {
                                select: {
                                    id: true,
                                    title: true,
                                    difficultyLevel: true,
                                    topicTags: { select: { content: true } },
                                },
                            },
                        },
                    },
                },
            }),
            prisma.$transaction([
                prisma.problem.count(),
                prisma.problem.count({ where: { difficultyLevel: "Basic" } }),
                prisma.problem.count({ where: { difficultyLevel: "Easy" } }),
                prisma.problem.count({ where: { difficultyLevel: "Medium" } }),
                prisma.problem.count({ where: { difficultyLevel: "Hard" } }),
            ]),
        ]);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const [totalProblems, totalBasic, totalEasy, totalMedium, totalHard] = platformData;

        const skillCounts = new Map();
        const languageIdCounts = new Map();
        const difficultyLevelCounts = { Basic: 0, Easy: 0, Medium: 0, Hard: 0 };

        user.Submission.forEach(submission => {
            const { problem, languageId } = submission;
            const { difficultyLevel, topicTags } = problem;

            // Count skills
            topicTags.forEach(tag => {
                skillCounts.set(tag.content, (skillCounts.get(tag.content) || 0) + 1);
            });

            // Count language IDs
            languageIdCounts.set(languageId, (languageIdCounts.get(languageId) || 0) + 1);

            // Count problems by difficulty
            difficultyLevelCounts[difficultyLevel as keyof typeof difficultyLevelCounts]++;
        });

        const userRank = await prisma.user.count({
            where: {
                points: {
                    gt: user.points,
                },
            },
        });

        const solved =
            difficultyLevelCounts.Basic + difficultyLevelCounts.Easy + difficultyLevelCounts.Medium + difficultyLevelCounts.Hard;

        const data = {
            id: user.id,
            email: user.email,
            name: user.name,
            userName: user.userName,
            profileImg: user.profileImg,
            avatar: user.avatar,
            solved: solved,
            points: user.points,
            rank: userRank + 1,
            totalProblems,
            totalBasic,
            totalEasy,
            totalMedium,
            totalHard,
            basicSolvedCount: difficultyLevelCounts.Basic,
            easySolvedCount: difficultyLevelCounts.Easy,
            mediumSolvedCount: difficultyLevelCounts.Medium,
            hardSolvedCount: difficultyLevelCounts.Hard,
            basicSolved: user.Submission.filter(s => s.problem.difficultyLevel === "Basic").map(s => ({
                id: s.problem.id,
                title: s.problem.title,
            })),
            easySolved: user.Submission.filter(s => s.problem.difficultyLevel === "Easy").map(s => ({
                id: s.problem.id,
                title: s.problem.title,
            })),
            mediumSolved: user.Submission.filter(s => s.problem.difficultyLevel === "Medium").map(s => ({
                id: s.problem.id,
                title: s.problem.title,
            })),
            hardSolved: user.Submission.filter(s => s.problem.difficultyLevel === "Hard").map(s => ({
                id: s.problem.id,
                title: s.problem.title,
            })),
            skillCounts: Array.from(skillCounts, ([skill, count]) => ({ skill, count })),
            languageIdCounts: Array.from(languageIdCounts, ([languageId, count]) => ({ languageId, count })),
        };

        return res.json(data);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: "Internal Server Error" });
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
        if(!user.password) {
            return res.status(400).json({
                message: "Please sign in with Google as you registered using Google",
            });
        }
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
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
        });

        return res.json({ message: "Successfully signed in!" });
    } catch (error) {
        logger.error("Error during sign in:", error);
        res.status(500).json({
            message: "Internal Server Error",
        });
    }
}

export async function signoutUser(req: Request, res: Response) {
    try {
        res.clearCookie("token", {
            httpOnly: true,
            secure: true,
            sameSite: "none",
        });
        return res.status(200).json({ message: "Signed Out" });
    } catch (error) {
        logger.error("Error during sign out:", error);
        return res.status(500).json({ message: "An error occurred during sign out" });
    }
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
    } catch (error) {
        logger.error(error);
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
    } catch (error) {
        logger.error(error);
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
    } catch (error) {
        logger.error(error);
        res.status(500).json({
            message: "Internal Server Error",
        });
    }
}

export async function googleOAuth20Controller(req: Request, res: Response) {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "Authentication failed" });
        }

        const token = jwt.sign({ id: req.user.id }, process.env.JWT_SECRET as string, { expiresIn: "30d" });

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "none",
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
        });

        logger.info("token cookie and User authenticated via Google OAuth:", req.user.id);

        const redirectUrl = "https://app.codechamp.online/problems";
        res.redirect(redirectUrl);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
}

export async function googleOneTapController(req: Request, res: Response) {
    const { token } = req.body;

    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const googleId = payload?.sub;
        const email = payload?.email;
        const name = payload?.name;
        const userName = payload.email.split("@")[0] as string;
        const avatar = payload?.picture;

        // Check if user already exists
        let user = await prisma.user.findUnique({
            where: { googleId: googleId },
        });

        if (!user) {
            // If no user with googleId, check by email
            const existingUserByEmail = await prisma.user.findUnique({
                where: { email: email },
            });

            if (existingUserByEmail) {
                // If user exists but no googleId, associate Google account
                user = await prisma.user.update({
                    where: { email: email },
                    data: { googleId: googleId, avatar },
                });
            } else {
                // Create new user if no existing one
                user = await prisma.user.create({
                    data: {
                        email,
                        name,
                        userName,
                        googleId,
                        avatar,
                    },
                });

                logger.info("New user created via Google One Tap:", JSON.stringify(user));
            }
        }

        const jwtToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET as string, { expiresIn: "30d" });
        res.cookie("token", jwtToken, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
        });

        logger.info("token cookie & User authenticated via Google One Tap:", user.id);

        res.status(200).json({ success: true });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
}
