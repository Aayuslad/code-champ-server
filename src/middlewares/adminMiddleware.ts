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
