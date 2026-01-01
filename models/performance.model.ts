import { model, Schema } from "mongoose";

interface PerformanceMetrics extends Document {
    user: Schema.Types.ObjectId;
    totalFlashcardsStudied: number; // Tổng số flashcards đã học
    averageScore: number; // Điểm số trung bình
    accuracyRate: number; // Tỷ lệ đúng (%)
    createdAt: Date;
    updatedAt: Date;
  }
  
  const PerformanceMetricsSchema = new Schema<PerformanceMetrics>({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    totalFlashcardsStudied: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
    accuracyRate: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  });
  
  export const PerformanceMetricsModel = model<PerformanceMetrics>('PerformanceMetrics', PerformanceMetricsSchema);
  