import { Request, Response, NextFunction } from 'express';
import { getUserById } from '../services/authservices';
import { CustomError } from '../utils/commonType';
import { Prisma } from '../generated/prisma/browser';

interface AuthenticatedRequest extends Request {
    userId?: number | string;
    user?: Prisma.UserGetPayload<{}>; // You can replace 'any' with your actual user type if you have one
}


export const authorise = (permissions: boolean, ...roles: string[]) => {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const userId = req.userId;
        
        if (!userId) {
            const error = new Error('User ID not found') as CustomError;
            error.code = 'Error_Unauthorized';
            error.status = 401;
            return next(error);
        }

        const user = await getUserById(Number(userId));
        
        if (!user) {
            const error = new Error('This account is not authorized') as CustomError;
            error.code = 'Error_Unauthorized';
            error.status = 401;
            return next(error);
        }
        
        const result = roles.includes(user.role);
        if (permissions && !result) {
            const error = new Error('This account is not authorized') as CustomError;
            error.code = 'Error_Unauthorized';
            error.status = 401;
            return next(error);
        }

        if (!permissions && result) {
            const error = new Error('This account is not authorized') as CustomError;
            error.code = 'Error_Unauthorized';
            error.status = 401;
            return next(error);
        }
        req.user = user;
        next();
    };
};