import express from "express";
import "dotenv/config";
import cookieParser from "cookie-parser";
import userRouter from "./routes/userRoutes";
import problemRouter from "./routes/problemRouter";
import cors from "cors";
import session from "express-session";
import morgan from "morgan";

const app = express();
const PORT = process.env.PORT || 8080;

app.set("trust proxy", 1);
app.use(
	cors({
		origin: ["https://app.code-champ.xyz", "http://localhost:5173"],
		methods: ["GET", "POST", "PUT", "DELETE"],
		credentials: true,
	}),
);
app.use(express.json());
app.use(cookieParser());
app.disable("x-powerd-by");
app.use(express.urlencoded({ extended: true }));
app.use(morgan("tiny"));
app.use(
	session({
		secret: process.env.SESSION_SECRET as string,
		resave: false,
		saveUninitialized: true,
		cookie: {
			maxAge: 5 * 60 * 1000, // 5 minutes
			secure: true,
			httpOnly: true,
			sameSite: "none",
		},
	}),
);

app.get("/", (req, res) => {
	res.send("Welcome, This is code champ server 🔥.");
});

app.use("/user", userRouter);
app.use("/problem", problemRouter);

app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});
