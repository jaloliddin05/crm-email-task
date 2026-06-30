import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Task, TaskDocument, TaskStatus } from './task.schema';
import { GetTasksQueryDto,ReviewTaskDto } from './dto';
import { ReviewAction } from './dto/review-task.dto';

@Injectable()
export class TasksService {
  constructor(
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
  ) {}

  async findAll(companyId: string, query: GetTasksQueryDto) {
    const filter: Record<string, any> = {
      companyId: new Types.ObjectId(companyId),
    };

    if (query.status) {
      filter.status = query.status;
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.taskModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('assigneeId', 'name emails')
        .lean(),
      this.taskModel.countDocuments(filter),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async review(
    taskId: string,
    companyId: string,
    reviewerId: string,
    dto: ReviewTaskDto,
  ) {
    // Validate ObjectId
    if (!Types.ObjectId.isValid(taskId)) {
      throw new BadRequestException('Invalid task ID');
    }

    const task = await this.taskModel.findById(taskId);

    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    // Tenant check: task must belong to the same company
    if (task.companyId.toString() !== companyId) {
      throw new ForbiddenException('Task does not belong to your company');
    }

    // Can only review pending tasks
    if (task.status !== TaskStatus.PENDING) {
      throw new BadRequestException(
        `Task is already ${task.status}. Only pending tasks can be reviewed.`,
      );
    }

    task.status =
      dto.action === ReviewAction.ACCEPT ? TaskStatus.ACCEPTED : TaskStatus.REJECTED;
    task.reviewedBy = new Types.ObjectId(reviewerId);
    task.reviewedAt = new Date();

    await task.save();

    return task;
  }
}
