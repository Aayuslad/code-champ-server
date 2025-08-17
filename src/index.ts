import express from "express";
import "dotenv/config";
import cookieParser from "cookie-parser";
import userRouter from "./routes/userRoutes";
import problemRouter from "./routes/problemRouter";
import cors from "cors";
import session from "express-session";
import morgan from "morgan";
import bodyParser from "body-parser";
import passport from "./middlewares/passportMiddleware";
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
        origin: ["https://app.codechamp.online", "http://localhost:5173", "http://localhost:5174"],
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true,
    }),
);
app.use(bodyParser.json({ limit: "50mb" }));
app.use(express.json());
app.use(cookieParser());
app.disable("x-powerd-by");
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
    // Use MemoryStore only in development
    store: process.env.NODE_ENV === 'production' 
        ? undefined // Vercel will handle this
        : new (require('express-session').MemoryStore)(),
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
    
const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);
    
    // Stop accepting new connections
    server.close(async () => {
        console.log('HTTP server closed');
        
        try {
            // Close database connections
            await disconnectPrisma();
            console.log('Database connections closed');
            
            process.exit(0);
        } catch (error) {
            console.error('Error during shutdown:', error);
            process.exit(1);
        }
    });
    
    // Force close after 30 seconds
    setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 30000);
};

// Handle different termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection');
});
