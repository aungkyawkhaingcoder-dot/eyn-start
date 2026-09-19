import express, { NextFunction, Request, Response, Express } from "express";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";
import morgan from "morgan";
import { limiter } from "./middleware/raterLimiter";
import authRouter from './routes/v1/auth';
import userRouter from "./routes/admin/userRoute";
import { authMiddleware } from "./middleware/auth";
import cookieParser from "cookie-parser";
import { readServerConfig } from "./config/server";
const app: Express = express();
const serverConfig = readServerConfig();
app.set("trust proxy", serverConfig.trustProxy);

const whitelist = serverConfig.origins;
const corsOptions = {
    origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
        // allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (whitelist.includes(origin!)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true, // Allow cookies authorization header
}
app.use(morgan("combined"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));
app.use(helmet());
app.use(compression({}));
app.use(limiter);

// Liveness only: does not claim that PostgreSQL/Redis are ready.
app.get("/healthz", (_req, res) => { res.status(200).json({ status: "ok" }); });

// Routes
app.use('/api/v1', authRouter)
app.use('/api/v1/admin', authMiddleware, userRouter)

app.use((error: any, req: Request, res: Response, next: NextFunction) => {
    const status = error.status || 500;
    const message = error.message || "Server Error";
    const errorCode = error.code || "Error_code";
    res.status(status).json({ message, error: errorCode })
});

export default app;
