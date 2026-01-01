import axios from 'axios';
import {app} from './app';
import connectDB from './utils/db';
import {v2 as cloudinary} from 'cloudinary';
require("dotenv").config();
import http from 'http';
import { initSocketServer } from './socketServer';


// cloudinary config
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET,

})

const server = http.createServer(app);




initSocketServer(server);
// todo: create server

server.listen(process.env.PORT, ()=>{
    console.log(`Server is running on port ${process.env.PORT}`);
    connectDB();
})