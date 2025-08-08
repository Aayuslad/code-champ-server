import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
const prisma = new PrismaClient();

export const adminLogin = (req: Request, res: Response) => {
    const { password } = req.body;
    if (password === process.env.ADMIN_PASSWORD) {
        const token = jwt.sign({ isAdmin: true }, process.env.JWT_SECRET as string, { expiresIn: "1h" });

        res.cookie("admin-token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 60 * 60 * 1000, // 1 hour
        });

        return res.status(200).json({ message: "Admin logged in successfully" });
    }
    return res.status(401).json({ message: "Invalid admin password" });
};

export const adminLogout = (req: Request, res: Response) => {
    res.clearCookie("admin-token", { httpOnly: true, secure: true, sameSite: "none" });

    return res.status(200).json({ message: "Admin logged out successfully" });
};

export const adminStatus = (req: Request, res: Response) => {
    return res.status(200).json({ message: "You are logged in as admin!" });
};

export const getQuestionRequests = async (req: Request, res: Response) => {
    try {
        const questions = await prisma.problem.findMany({
            where: {
                approved: false,
            },
            select: {
                id: true,
                title: true,
                createdAt: true,
                createdBy: {
                    select: {
                        id: true,
                        userName: true,
                    },
                },
            },
        });

        res.status(200).json([...questions]);
    } catch (err) {
        res.status(500).json({
            message: "Internal Server Error",
        });
    }
};

export const getContestRequests = async (req: Request, res: Response) => {
    try {
        const contests = await prisma.contest.findMany({
            where: {
                approved: false,
            },
            select: {
                id: true,
                title: true,
                startTime: true,
                endTime: true,
                createdAt: true,
                createdBy: {
                    select: {
                        id: true,
                        userName: true,
                    },
                },
            },
        });

        res.status(200).json([...contests]);
    } catch (err) {
        res.status(500).json({
            message: "Internal Server Error",
        });
    }
};

export const approveQuestionRequest = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const question = await prisma.problem.update({
            where: { id: id },
            data: { approved: true },
        });

        res.status(200).json({
            message: "Question request approved successfully",
        });
    } catch (err) {
        res.status(500).json({
            message: "Internal Server Error",
        });
    }
};

export const approveContestRequest = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const contest = await prisma.contest.update({
            where: { id: id },
            data: { approved: true },
        });

        res.status(200).json({
            message: "Contest request approved successfully",
        });
    } catch (err) {
        res.status(500).json({
            message: "Internal Server Error",
        });
    }
};

export const rejectQuestionRequest = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const question = await prisma.problem.delete({
            where: { id: id },
        });

        res.status(200).json({
            message: "Question request rejected successfully",
        });
    } catch (err) {
        res.status(500).json({
            message: "Internal Server Error",
        });
    }
};

export const rejectContestRequest = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const contest = await prisma.contest.delete({
            where: { id: id },
        });

        res.status(200).json({
            message: "Contest request rejected successfully",
        });
    } catch (err) {
        res.status(500).json({
            message: "Internal Server Error",
        });
    }
};
