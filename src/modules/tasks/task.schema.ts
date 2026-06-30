import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TaskDocument = Task & Document;

export enum TaskStatus {
  PENDING = 'pending',     // LLM yaratdi, odam hali ko'rmagan
  ACCEPTED = 'accepted',   // Odam qabul qildi
  REJECTED = 'rejected',   // Odam rad etdi
}

@Schema({ timestamps: true })
export class Task {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId: Types.ObjectId;

  // Who the task is assigned to (optional - LLM extracts this)
  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  assigneeId: Types.ObjectId | null;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: Date,default: null })
  dueDate: Date | null;

  @Prop({ type: String, enum: TaskStatus, default: TaskStatus.PENDING })
  status: TaskStatus;

  // Source email metadata for traceability
  @Prop({ required: true })
  sourceEmailFrom: string;

  @Prop({ required: true })
  sourceEmailSubject: string;

  @Prop({ required: true })
  sourceEmailBody: string;

  // LLM raw output saved for debugging
  @Prop({ type: Object, default: null })
  llmRaw: Record<string, any> | null;

  // Who accepted/rejected (for audit trail)
  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  reviewedBy: Types.ObjectId | null;

  @Prop({ type: Date,default: null })
  reviewedAt: Date | null;
}

export const TaskSchema = SchemaFactory.createForClass(Task);

// Indexes for GET /tasks queries
TaskSchema.index({ companyId: 1, status: 1, createdAt: -1 });
