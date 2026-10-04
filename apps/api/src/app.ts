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
import storeRouter from "./routes/v1/stores";
import { getPublicStore } from "./controller/storeController";
import { checkout } from "./controller/orderController";
import { rateLimit } from "express-rate-limit";
import i18next from "i18next";
import Backend from "i18next-fs-backend";
import i18nextMiddleware from "i18next-http-middleware";
import path from "path";
import routerLanguage from "./routes/v1/profileRoute";
import { authorise } from "./middleware/authorise";
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
app.use(morgan("combined", { skip: req => req.path === "/api/v1/google/redirect/callback" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));
app.use(helmet());
app.use(compression({}));
app.use(limiter);
i18next.use(Backend).use(i18nextMiddleware.LanguageDetector).init({
    backend: {
        loadPath: path.join(process.cwd(), "src/locales", "{{lng}}", "{{ns}}.json"),
    },
    detection: {
        order: ["querystring", "cookie", ],
        caches: ["cookie"],
    },
    fallbackLng: "en",
    preload: ["en","mm", "es", "fr", "de", "zh"],
    ns: ["translation"],
    defaultNS: "translation",
});
app.use(i18nextMiddleware.handle(i18next));

// Liveness only: does not claim that PostgreSQL/Redis are ready.
app.get("/healthz", (_req, res) => { res.status(200).json({ status: "ok" }); });

// Routes
app.use('/api/v1/profile',routerLanguage);
app.get('/api/v1/storefront/:slug', getPublicStore);
app.post('/api/v1/storefront/:slug/orders', rateLimit({ windowMs: 60000, limit: 10, standardHeaders: true, legacyHeaders: false }), checkout);
app.use('/api/v1/stores', authMiddleware, storeRouter);
app.use('/api/v1', authRouter)

app.use('/api/v1/admin', authMiddleware, authorise(true, 'ADMIN'), userRouter)

app.use((error: any, req: Request, res: Response, next: NextFunction) => {
    const status = error.status || 500;
    const message = error.message || "Server Error";
    const errorCode = error.code || "Error_code";
    res.status(status).json({ message, error: errorCode })
});

export default app;
