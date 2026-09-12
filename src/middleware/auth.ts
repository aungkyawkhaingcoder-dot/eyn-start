import { NextFunction, Request, Response } from "express";
import { CustomError } from "../utils/commonType";
import jwt from "jsonwebtoken";
import { getUserById, updateUser } from "../services/authservices";
import { Prisma } from "../generated/prisma/browser";

interface CustomRequest extends Request {
    userId?: number | string;
}

export const authMiddleware = async (req: CustomRequest, res: Response, next: NextFunction) => {


    const platform = req.headers['x-platform']

    if (platform === "mobile") {
        const accessTokenMobile = req.headers.authorization?.split(' ')[1] || null;
        const refreshTokenMobile = req.headers['x-refresh-token'] as string || null;
        if (!refreshTokenMobile) {
            const error = new Error('You are not an authenticated user.') as CustomError;
            error.status = 401
            error.code = 'Error_Unauthenticated'
            return next(error)
        }

                let verifyRefreshToken;
        try {
            verifyRefreshToken = jwt.verify(refreshTokenMobile!, process.env.REFRESH_TOKEN_SECRET!) as {
                id: number | string;
                phone: string;
            };
        } catch (error: any) {
            if (error.name === "TokenExpiredError") {
                const error = new Error('Your account is not authenticated.') as CustomError;
                error.status = 401;
                error.code = 'Error_Unauthenticated';
                return next(error);
            } else {
                const error = new Error('Invalid refresh token.') as CustomError;
                error.status = 400;
                error.code = 'Error_InvalidRefreshToken';
                return next(error);
            }
        }

        const user = await getUserById(Number(verifyRefreshToken.id));
     

        if (user?.randomToken !== refreshTokenMobile) {
            const error = new Error('Your account is not authenticated.') as CustomError;
            error.status = 401;
            error.code = 'Error_Unauthenticated';
            return next(error);
        }

        if(user?.phone !== verifyRefreshToken.phone){
          const error = new Error('Phone number does not match.') as CustomError;
          error.status = 401;
          error.code = 'Error_Unauthenticated';
          return next(error);
        }
        if(!user){
          const error = new Error('Your account is not authenticated.') as CustomError;
          error.status = 404;
          error.code = 'Error_Unauthenticated';
          return next(error);
        }


        if (!accessTokenMobile) {
            const error = new Error('Access token has expired. Please refresh your token.') as CustomError;
            error.status = 401;
            error.code = 'Error_AccessTokenExpired';
            return next(error);
        } else {
            let decoded;
            try {
                decoded = jwt.verify(accessTokenMobile!, process.env.ACCESS_TOKEN_SECRET!) as {
                    id: number | string;
                };
            } catch (error: any) {
                if (error.name === "TokenExpiredError") {
                    const error = new Error('Access token has expired. Please refresh your token.') as CustomError;
                    error.status = 401;
                    error.code = 'Error_AccessTokenExpired';
                    return next(error);
                } else {
                    const error = new Error('Invalid access token.') as CustomError;
                    error.status = 400;
                    error.code = 'Error_InvalidAccessToken';
                    return next(error);
                }
            }

            const user = await getUserById(Number(decoded.id));

            if (!user) {
                const error = new Error('This user does not exist.') as CustomError;
                error.status = 401;
                error.code = 'Error_Unauthenticated';
                return next(error);
            }

            if (user.randomToken! !== refreshTokenMobile) {
                const error = new Error('Invalid refresh token.') as CustomError;
                error.status = 401;
                error.code = 'Error_InvalidRefreshToken';
                return next(error);
            }

            req.userId = user.id;
            next();
        }

    } else {
        const accessToken = req.cookies ? req.cookies.accessToken : null;
        const refreshToken = req.cookies ? req.cookies.refreshToken : null;

        let verifyRefreshToken;
        try {
            verifyRefreshToken = jwt.verify(refreshToken!, process.env.REFRESH_TOKEN_SECRET!) as {
                id: number | string;
                phone: string;
            };
        } catch (error: any) {
            if (error.name === "TokenExpiredError") {
                const error = new Error('Your account is not authenticated.') as CustomError;
                error.status = 401;
                error.code = 'Error_Unauthenticated';
                return next(error);
            } else {
                const error = new Error('Invalid refresh token.') as CustomError;
                error.status = 400;
                error.code = 'Error_InvalidRefreshToken';
                return next(error);
            }
        }

        const user = await getUserById(Number(verifyRefreshToken.id));
     

        if (user?.randomToken !== refreshToken) {
            const error = new Error('Your account is not authenticated.') as CustomError;
            error.status = 401;
            error.code = 'Error_Unauthenticated';
            return next(error);
        }

        if(user?.phone !== verifyRefreshToken.phone){
          const error = new Error('Phone number does not match.') as CustomError;
          error.status = 401;
          error.code = 'Error_Unauthenticated';
          return next(error);
        }
        if(!user){
          const error = new Error('Your account is not authenticated.') as CustomError;
          error.status = 404;
          error.code = 'Error_Unauthenticated';
          return next(error);
        }

        if (!refreshToken) {
            const error = new Error('You are not an authenticated user.') as CustomError;
            error.status = 401
            error.code = 'Error_Unauthenticated'
            return next(error)
        }
        const generateNewTokens = async () => {
            let decoded;
            try {
                decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!) as {
                    id: number | string;
                    phone: string;
                };
            } catch (error) {
                const err = new Error('You are not an authenticated user.') as CustomError;
                err.status = 401;
                err.code = 'Error_Unauthenticated';
                return next(err);
            }

            const user = await getUserById(Number(decoded.id));
            if (!user) {
                const error = new Error('This user does not exist.') as CustomError;
                error.status = 401;
                error.code = 'Error_Unauthenticated';
                return next(error);
            }
            if (user.phone !== decoded.phone) {
                const error = new Error('Phone number does not match.') as CustomError;
                error.status = 401;
                error.code = 'Error_Unauthenticated';
                return next(error);
            }

            if (user.randomToken !== refreshToken) {
                const error = new Error('Your are not authenticated user') as CustomError;
                error.status = 401;
                error.code = 'Error_Unauthenticated';
                return next(error);
            }

            const accessTokenPayload = { id: user!.id };
            const refreshTokenPayload = { id: user!.id, phone: user!.phone };
            const newAccessToken = jwt.sign(accessTokenPayload, process.env.ACCESS_TOKEN_SECRET!, {
                expiresIn: 60 * 15 // 15 minute,
            });

            const newRefreshToken = jwt.sign(refreshTokenPayload, process.env.REFRESH_TOKEN_SECRET!, {
                expiresIn: '30d' // 30
            })
            const userData = {
                randomToken: newRefreshToken
            }
            await updateUser(user!.id, userData);
            res.cookie('accessToken', newAccessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'development' ? false : true,
                sameSite: 'none',
                maxAge: 15 * 60 * 1000, // 15 minute
            }).cookie('refreshToken', newRefreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'development' ? false : true,
                sameSite: 'none',
                maxAge: 30 * 24 * 60 * 60 * 1000
            })
            req.userId = user!.id;
            next();
        }
        if (!accessToken) {
            await generateNewTokens();
        } else {
            let decoded;
            try {
                decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET!) as {
                    id: number | string;
                };
            } catch (error: any) {

                if (error.name === "TokenExpiredError") {
                    await generateNewTokens();
                } else {
                    error.status = 400;
                    error.message = "Invalid Access Token";
                    error.code = "Error_InvalidAccessToken";
                    return next(error);

                }
            }
            if (decoded) {
                req.userId = decoded.id;
            }
            next();
        }
    }

}