"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const reateLimiter_1 = require("./middleware/reateLimiter");
const app = (0, express_1.default)();
app.use((0, morgan_1.default)("combined"));
app.use(express_1.default.urlencoded({ extended: true }));
app.use(express_1.default.json());
app.use((0, cors_1.default)());
app.use((0, helmet_1.default)());
app.use((0, compression_1.default)({}));
app.use(reateLimiter_1.limiter);
app.use((error, req, res, next) => {
    const status = error.status || 500;
    const message = error.message || "Server Error";
    const errorCode = error.code || "Error_code";
    res.status(status).json({ message, error: errorCode });
});
exports.default = app;
//# sourceMappingURL=app.js.map