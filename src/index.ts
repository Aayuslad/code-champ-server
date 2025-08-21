import express from "express";
import "dotenv/config";
import cookieParser from "cookie-parser";
import userRouter from "./routes/userRoutes";
import problemRouter from "./routes/problemRouter";
import cors from "cors";
import session from "express-session";
import morgan from "morgan";
import logger from "./lib/logger";
import bodyParser from "body-parser";
import passport from "./middlewares/passportMiddleware";
import { errorHandler, notFoundHandler } from "./middlewares/errorMiddleware";
import contestRouter from "./routes/contestRouter";
import "./services/cronJobs";
import contestProblemRouter from "./routes/contestProblemRouter";
import adminRouter from "./routes/adminRouter";
import { disconnectPrisma } from "./lib/prisma";

const app = express();
const PORT = process.env.PORT || 8080;

app.set("trust proxy", 1);
app.use(
    cors({
        origin: ["https://app.codechamp.online", "http://localhost:5173", "http://localhost:5174", "http://app.codechamp.online"],
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true,
    }),
);
app.use(bodyParser.json({ limit: "50mb" }));
app.use(express.json());
app.use(cookieParser());
app.disable("x-powered-by");
app.use(express.urlencoded({ extended: true }));
app.use(morgan("tiny"));

// Production-ready session configuration
const sessionConfig = {
    secret: process.env.SESSION_SECRET as string,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 5 * 60 * 1000, // 5 minutes
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    },
};

app.use(session(sessionConfig));
app.use(passport.initialize());
app.use(passport.session());

app.get("/", (req, res) => {
    res.send("Welcome, This is code champ server 🔥.");
});

app.use("/admin", adminRouter); // Import admin routes
app.use("/user", userRouter);
app.use("/problem", problemRouter);
app.use("/contest", contestRouter);
app.use("/contest-problem", contestProblemRouter);

// 404 and error handlers
app.use(notFoundHandler);
app.use(errorHandler);

const server = app
    .listen(PORT, () => {
        logger.info(`Server is running on port ${PORT}`);
    })
    .on("error", (err) => {
        logger.error("HTTP server error:", err);
    });

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
    logger.warn(`\n${signal} received. Starting graceful shutdown...`);
    
    // Stop accepting new connections
    server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
            // Close database connections
            await disconnectPrisma();
            logger.info('Database connections closed');
            
            process.exit(0);
        } catch (error) {
            logger.error('Error during shutdown:', error);
            process.exit(1);
        }
    });
    
    // Force close after 30 seconds
    setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 30000);
};

// Handle different termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    // Keep process alive on EC2; do not exit
});
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Keep process alive on EC2; do not exit
});
