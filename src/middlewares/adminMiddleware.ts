import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export function adminMiddleware(req: Request, res: Response, next: NextFunction) {
    const token = req.cookies["admin-token"] || (req.headers.authorization?.split(" ")[1] ?? "");
    if (!token) {
        return res.status(401).json({ message: "Admin token missing" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
        if (typeof decoded === "string" || !(decoded as any).isAdmin) {
            return res.status(401).json({ message: "Invalid admin token" });
        }

        req.admin = { isAdmin: true };
        next();
    } catch {
        return res.status(401).json({ message: "Invalid or expired admin token" });
    }
}

export async function checkAuth(req: Request) {
    try {
        const token = req.cookies["token"] || (req.headers.authorization?.split(" ")[1] ?? "");
        if (!token) {
            const e: any = new Error("Auth token missing");
            e.status = 401;
            throw e;
        }

        const decodedToken = jwt.verify(token, process.env.JWT_SECRET as string);
        if (typeof decodedToken === "string") {
            const e: any = new Error("Invalid auth token");
            e.status = 401;
            throw e;
        }
    } catch (err) {
        if (err instanceof jwt.JsonWebTokenError || err instanceof jwt.TokenExpiredError) {
            const e: any = new Error("Invalid or expired token");
            e.status = 401;
            throw e;
        }
        throw err;
    }
}