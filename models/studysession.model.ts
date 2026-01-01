import { Schema, model, Document, Types } from 'mongoose';

interface StudySession  {
  user:Types.ObjectId;
  set: Types.ObjectId;
  currentFlashcardIndex: number; // Index của flashcard đang học
  completedFlashcards: Types.ObjectId[]; // Flashcards đã hoàn thành
  score: number;
  lastStudiedAt: Date;
  createdAt: Date;
}

const StudySessionSchema = new Schema<StudySession>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  set: { type: Schema.Types.ObjectId, ref: 'Set', required: true },
  currentFlashcardIndex: { type: Number, default: 0 },
  completedFlashcards: [{ type: Schema.Types.ObjectId, ref: 'Flashcard' }],
  score: { type: Number, default: 0 },
  lastStudiedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

export const StudySessionModel = model<StudySession>('StudySession', StudySessionSchema);
