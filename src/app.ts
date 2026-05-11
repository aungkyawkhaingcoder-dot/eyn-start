import express, { NextFunction, Request, Response, Express } from "express";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";
import morgan from "morgan";
import { limiter } from "./middleware/raterLimiter";
import { check } from "./middleware/check";
import userRoutes from "./routes/userRoutes";

const app:Express = express();
app.use(morgan("combined"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(compression({}));
app.use(limiter);

// Routes
app.use("/api/users", userRoutes);
app.use("/api/users", check); // Apply check middleware to user routes

app.use((error:any,req:Request,res:Response,next:NextFunction)=>{
    const status = error.status || 500;
    const message = error.message || "Server Error";
    const errorCode = error.code || "Error_code";
    res.status(status).json({message,error:errorCode})
});

export default app;
