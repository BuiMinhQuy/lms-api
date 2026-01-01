import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/cacthAsyncErrors";
import cloudinary from "cloudinary";


// upload course
export const uploadVideo = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { video } = req.body; // Expect base64 video string
    
        if (!video) {
          return res.status(400).json({ message: "No video provided!" });
        }
    
        // Upload video to Cloudinary
        const uploadedVideo = await cloudinary.v2.uploader.upload(video, {
          resource_type: "video",
          folder: "videos",
        });
    
        res.status(200).json({
          message: "Video uploaded successfully!",
          videoUrl: uploadedVideo.secure_url,
        });
      } catch (error) {
        console.error("Cloudinary upload error:", error);
        res.status(500).json({ message: "Upload failed!", error });
      }
  }
);
