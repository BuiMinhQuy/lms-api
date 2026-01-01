import { Schema, model, Document, Types } from 'mongoose';

interface Folder extends Document {
  name: string;
  owner: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FolderSchema = new Schema<Folder>({
  name: { type: String, required: true },
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Hook để tự động cập nhật `updatedAt` mỗi khi tài liệu được cập nhật
FolderSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export const FolderModel = model<Folder>('Folder', FolderSchema);
