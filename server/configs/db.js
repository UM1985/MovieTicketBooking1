import mongoose from "mongoose";

const connectDB = async () => {
    try {
        mongoose.connection.on('connected', () => {
            console.log('Mongoose is connected')
        })
        await mongoose.connect(`${process.env.MONGO_URI}/quickshow`)
    }catch (error) {
        console.log( error.message)
    }
}

export default connectDB;