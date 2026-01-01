import mongoose from 'mongoose';

require('dotenv').config();

const dbUrl:string = process.env.DB_URL || 'mongodb+srv://nphnam:0977187016nam@cluster0.htvbh.mongodb.net/';

const connectDB = async () =>{
    try{

        await mongoose.connect((dbUrl)).then((data:any)=>{
            console.log(`Data base connected with ${data.connection.host}`);
        })

    }catch(error){
        console.log(error);
        setTimeout(connectDB,5000);

    }
}

export default connectDB;