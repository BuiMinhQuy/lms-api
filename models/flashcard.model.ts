import { model, Schema } from "mongoose";

interface Flashcard extends Document {
  question: string;
  answer: string;
  category: string;
  tags: string[];
  image?:string;
  owner: Schema.Types.ObjectId; // Người tạo flashcard
  set: Schema.Types.ObjectId; // Bộ câu hỏi mà flashcard thuộc về
  createdAt: Date;
  updatedAt: Date;
}

const FlashcardSchema = new Schema<Flashcard>({
  question: { type: String, required: true },
  answer: { type: String, required: true },
  category: { type: String, required: true },
  tags: [{ type: String }],
  image: { type: String },
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  set: { type: Schema.Types.ObjectId, ref: 'Set', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const FlashcardModel = model<Flashcard>('Flashcard', FlashcardSchema);
