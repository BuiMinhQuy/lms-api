import { model, Schema } from "mongoose";

interface Interaction extends Document {
    user: Schema.Types.ObjectId;
    targetId: Schema.Types.ObjectId; // ID của flashcard hoặc set
    type: 'like' | 'comment';
    content?: string; // Nội dung cho comment
    createdAt: Date;
  }
  
  const InteractionSchema = new Schema<Interaction>({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    type: { type: String, enum: ['like', 'comment'], required: true },
    content: { type: String },
    createdAt: { type: Date, default: Date.now },
  });
  
  export const InteractionModel = model<Interaction>('Interaction', InteractionSchema);
  