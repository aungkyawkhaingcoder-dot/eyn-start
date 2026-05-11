"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_1 = __importDefault(require("./app"));
const PORT = process.env.PORT || 4000;
// Change the import to reference the correct file extension for TypeScript source:
app_1.default.listen(PORT, () => {
    console.log("server listing " + PORT);
});
//# sourceMappingURL=index.js.map