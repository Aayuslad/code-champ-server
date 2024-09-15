import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
const prisma = new PrismaClient();

export async function authMiddleware(req: Request, res: Response, next: any) {
	const token = req.cookies.token;

	try {
		if (!token) {
			return res.status(401).json({
				message: "Unauthorized",
			});
		}

		const decodedToken = jwt.verify(token, process.env.JWT_SECRET as string);
		if (typeof decodedToken === "string") {
			return res.status(401).json({
				message: "Unauthorized",
			});
		}

		const user = await prisma.user.findUnique({
			where: {
				id: decodedToken.id,
			},
		});

		req.user = user;

		next();
	} catch {
		res.status(500).json({
			message: "Internal Server Error",
		});
	}
}
