import dotenv from 'dotenv';
import connectDB from "./db/connectDB.js";
import { app } from './app.js';

dotenv.config({
    path: './.env'
})

connectDB()
.then(() => {
    app.on("error", (error) => {
        console.log("ERROR: ", error);
        throw error
    })

    app.listen(process.env.PORT || 8080, () => {
        console.log(`Server is running at port : ${process.env.PORT}`);
    })
})
.catch((err) => {
    console.log("MONGODB connection failed !!! ", err);
})