import { NextFunction, Request, Response } from "express";
import logger from "../lib/logger";

export function notFoundHandler(req: Request, res: Response) {
    res.status(404).json({ message: "Route not found" });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
    const statusCode = err.status || err.statusCode || 500;
    const errorId = Date.now().toString(36);

    logger.error({ errorId, message: err?.message || "Unhandled error", stack: err?.stack });

    if (statusCode >= 500) {
        return res.status(statusCode).json({ message: "Internal Server Error", errorId });
    }

    return res.status(statusCode).json({ message: err.message || "Error", errorId });
}


