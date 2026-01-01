import { model, Schema, Document, Types } from "mongoose";

interface Category extends Document {
    name: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
}

const CategorySchema = new Schema<Category>({
    name: { type: String, required: true, unique: true },
    description: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

// Tự động cập nhật `updatedAt` khi tài liệu thay đổi
CategorySchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

export const CategoryModel = model<Category>('Category', CategorySchema);
