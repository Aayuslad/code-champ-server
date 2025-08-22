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
import { disconnectPrisma, prisma } from "./lib/prisma";

const app = express();
const PORT = process.env.PORT || 8080;

app.set("trust proxy", 1);
app.use(
    cors({
        origin: ["https://app.codechamp.online", "http://localhost:5173", "http://localhost:5174", "http://app.codechamp.online", "https://codesandbox.2.codechamp.online"],
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
// temprary week hook handlers dumped here, will move to seprate server later
app.post("/submit-task-callback", async (req, res) => {
	console.log("req body: ", req.body);

	try {
		const { submissionId, status } = req.body;

		const submission = await prisma.submission.findUnique({
			where: { id: submissionId },
			select: { problemId: true, difficultyLevel: true, createdById: true, status: true },
		});

		if (!submission) {
			return res.status(404).json({ message: "Submission not found" });
		}

		const prevSub = await prisma.submission.findFirst({
			where: {
				problemId: submission.problemId,
				status: "Accepted",
			},
		});

		let points = undefined;

		if (!prevSub && status === "Accepted") {
			const pointsMap = {
				Basic: 1,
				Easy: 2,
				Medium: 4,
				Hard: 8,
			};

			points = pointsMap[submission.difficultyLevel] || 0;

			await prisma.user.update({
				where: { id: submission.createdById },
				data: { points: { increment: points } },
			});
		}

		await prisma.submission.update({
			where: { id: submissionId },
			data: { status, points: points || 0 },
		});

		if (status === "Accepted") {
			await prisma.problem.update({
				where: { id: submission.problemId },
				data: { acceptedSubmissions: { increment: 1 } },
			});
		}

		return res.json({ message: "Webhook received" });
	} catch (error) {
		console.error("Error updating submission status:", error);
		return res.status(500).json({ message: "Error updating submission status" });
	}
});
app.post("/submit-contest-task-callback", async (req, res) => {
	const { submissionId, status, passedTestCases } = req.body;

	console.log("Contest submission callback received:", req.body);

	try {
		// STEP 1: Fetch the submitted record from the DB
		const submission = await prisma.contestSubmission.findUnique({
			where: { id: submissionId },
			select: { contestProblemId: true, points: true, createdByParticipantId: true, status: true },
		});

		// STEP 2: If submission doesn't exist, return 404
		if (!submission) {
			return res.status(404).json({ message: "Submission not found" });
		}

		// STEP 3: Fetch contest problem details (points, test case count, bestOf rule, contestId)
		const contestProblem = await prisma.contestProblem.findUnique({
			where: { id: submission.contestProblemId },
			select: { 
				points: true, 
				problem: { select: { testCasesCount: true } },
				contest: { select: { bestOf: true } },
				contestId: true,
			},
		});

		// STEP 4: Calculate points for this submission based on passed test cases
		const _points = Math.round(
			((contestProblem?.points ?? 0) * (passedTestCases / (contestProblem?.problem?.testCasesCount ?? 1))) * 100
		) / 100;

		// STEP 5: Update submission record with new status & calculated points
		await prisma.contestSubmission.update({
			where: { id: submissionId },
			data: { status, points: _points || 0 },
		});

		// STEP 6: Get the latest submission for each contest problem by this participant (in this contest)
		const lastSubmissions = await prisma.contestSubmission.findMany({
			where: { 
				createdByParticipantId: submission.createdByParticipantId, 
				contestProblem: { contestId: contestProblem?.contestId } 
			},
			distinct: ['contestProblemId'], // one per problem
			orderBy: [
				{ contestProblemId: 'asc' }, // required for DISTINCT ON
				{ createdAt: 'desc' }        // latest first
			],
			select: { contestProblemId: true, points: true, createdAt: true }
		});

		console.log("Last submissions for participant:", JSON.stringify(lastSubmissions));

		// STEP 7: Calculate total score according to "bestOf" rule
		let sum = 0;
		if (contestProblem?.contest?.bestOf === 0) {
			// Take sum of all latest submissions
			sum = lastSubmissions.reduce((acc, sub) => acc + (sub.points ?? 0), 0);
		} else {
			// Sort by points (highest first), take top N = bestOf, then sum
			sum = lastSubmissions
				.sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
				.slice(0, contestProblem?.contest?.bestOf)
				.reduce((acc, sub) => acc + (sub.points ?? 0), 0);
		}

		// STEP 8: Update participant's total score in the contest
		await prisma.contestParticipant.update({
			where: { 
				id: submission.createdByParticipantId, 
				contestId: contestProblem?.contestId 
			},
			data: { score: sum },
		});

		// STEP 9: Send success response
		return res.json({ message: "Webhook received" });

	} catch (error) {
		// STEP 10: Handle errors
		console.error("Error updating submission status:", error);
		return res.status(500).json({ message: "Error updating submission status" });
	}
});

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
