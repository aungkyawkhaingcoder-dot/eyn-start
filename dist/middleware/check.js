"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.check = void 0;
const check = (req, res, next) => {
    //   const err: any = new Error("Token has expired");
    //   err.status =  401;
    //   err.code = 'Error_TokenExpired';
    //   return next(err)
    req.userId = 123;
    next();
};
exports.check = check;
//# sourceMappingURL=check.js.map