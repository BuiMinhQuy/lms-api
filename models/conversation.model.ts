import { model } from "mongoose";

const mongoose = require('mongoose');

interface message extends Document {
    role: { type: String, },
    content: { type: String }
}

interface Conversation extends Document {
    user_id: string;
    messages: message[];
}


const messageSchema = new mongoose.Schema({
    role: { type: String, required: true, enum: ['user', 'assistant'] },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
})

const conversationSchema = new mongoose.Schema({
    user_id: { type: String, required: true },
    messages: [messageSchema]
})

export const Conversation = model<Conversation>('Conversation', conversationSchema);
