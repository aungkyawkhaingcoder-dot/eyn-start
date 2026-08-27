"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.check = void 0;
const jsonwebtoken_1 = require("jsonwebtoken");
const check = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        const err = new Error("Authentication required");
        err.status = 401;
        err.code = 'Error_AuthRequired';
        return next(err);
    }
    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            const err = new Error("JWT_SECRET is not configured");
            err.status = 500;
            err.code = "Error_ServerConfig";
            return next(err);
        }
        const decoded = (0, jsonwebtoken_1.verify)(token, secret);
        req.userId = decoded.userId;
        next();
    }
    catch (error) {
        const err = new Error("Token has expired or is invalid");
        err.status = 401;
        err.code = 'Error_TokenExpired';
        return next(err);
    }
};
exports.check = check;
//# sourceMappingURL=check.js.map