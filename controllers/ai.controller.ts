import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/cacthAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
const { GoogleGenerativeAI } = require("@google/generative-ai");
import Conversation from "../models/conversation.model";


export const askAIbyText = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { prompt } = req.body;

        const genAI = new GoogleGenerativeAI("AIzaSyD-2AcVG3K3SBs57BXLSzvCOgxhDroJjWk");
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });


        const result = await model.generateContent(prompt);
        const answer = result.response.text()

        res.status(200).json({
            success: true,
            message: answer
        })
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))

    }
});


export const conversation = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { prompt } = req.body;
        const genAI = new GoogleGenerativeAI("AIzaSyD-2AcVG3K3SBs57BXLSzvCOgxhDroJjWk"); // Use environment variable for security
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        if (!prompt) {
            return next(new ErrorHandler("Prompt is required", 400));
        }

        const userId = req.user?._id;
        if (!userId) {
            return next(new ErrorHandler("Unauthorized", 401));
        }

        let conversationSession = await Conversation.findOne({ userId });
        if (!conversationSession) {
            conversationSession = new Conversation({
                userId,
                messages: [],
            });
        }
        // Check if a conversation session exists
        if (!conversationSession) {
            // If no session exists, create a new one



            // Send initial message and stream result
            const result = await model.generateContentStream(prompt);
            let conversationText = '';
            for await (const chunk of result.stream) {
                const chunkText = chunk.text();
                conversationText += chunkText;
            }

            // Send the result back to the client
            res.status(200).json({
                success: true,
                message: conversationText,
            });

        } else {
            const chat = model.startChat({
                history: [
                    {
                        role: "user",
                        parts: [{ text: "Hello" }],
                    },
                    {
                        role: "model",
                        parts: [{ text: "Great to meet you. What would you like to know?" }],
                    },
                ],
            });
            // If a session exists, continue conversation
            const result = await model.sendMessageStream(prompt);
            let conversationText = '';
            for await (const chunk of result.stream) {
                const chunkText = chunk.text();
                conversationText += chunkText;
            }

            // Send the result back to the client
            res.status(200).json({
                success: true,
                message: conversationText,
            });
        }



    } catch (error: any) {
        console.error(error);
        return next(new ErrorHandler(error.message, 500));
    }
});

export const StreamConversation = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { prompt } = req.body;
        const genAI = new GoogleGenerativeAI("AIzaSyD-2AcVG3K3SBs57BXLSzvCOgxhDroJjWk"); // Use environment variable for security
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const chat = model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{ text: "Hello" }],
                },
                {
                    role: "model",
                    parts: [{ text: "Great to meet you. What would you like to know?" }],
                },
                {
                    role: "user",
                    parts: [{ text: "give me 5 vocabs about technology" }],
                },
                {
                    role: "model",
                    parts: [{ text: "1. **Algorithm:** A set of rules or instructions followed by a computer to solve a problem or perform a task.\n2. **Cybersecurity:** The protection of computer systems and networks from theft, damage, and unauthorized access.\n3. **Artificial Intelligence (AI):**  The simulation of human intelligence processes by machines, especially computer systems.\n4. **Blockchain:** A decentralized, distributed, and public digital ledger used to record transactions across many computers.\n5. **Bandwidth:** The amount of data that can be transmitted over a network connection in a given amount of time.\n" }],
                },
                

            ],
        });
        // If a session exists, continue conversation
        const result = await chat.sendMessageStream(prompt);
        let conversationText = '';
        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            conversationText += chunkText;
        }

        // Send the result back to the client
        res.status(200).json({
            success: true,
            message: conversationText,
        })




    } catch (error: any) {
        console.error(error);
        return next(new ErrorHandler(error.message, 500));
    }
});