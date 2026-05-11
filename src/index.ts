import "dotenv/config";
import app from "./app";
const PORT = process.env.PORT || 4000;
// Change the import to reference the correct file extension for TypeScript source:
app.listen(PORT,()=>{
    console.log("server listing "+PORT)
})