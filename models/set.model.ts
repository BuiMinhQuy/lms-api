import { model, Schema, Document, Types } from "mongoose";

interface Set extends Document {
  title: string;
  description?: string;
  flashcards: Types.ObjectId[];
  owner: Types.ObjectId;
  isPublic: boolean;
  tags: string[];
  category: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SetSchema = new Schema<Set>({
  title: { type: String, required: true },
  description: { type: String },
  flashcards: [{ type: Schema.Types.ObjectId, ref: 'Flashcard' }],
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  isPublic: { type: Boolean, default: true },
  tags: [{ type: String }],
  category: { type: Schema.Types.ObjectId, ref: 'Category' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Hook tự động cập nhật `updatedAt` khi tài liệu thay đổi
SetSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export const SetModel = model<Set>('Set', SetSchema);
