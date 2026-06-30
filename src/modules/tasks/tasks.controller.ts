import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { GetTasksQueryDto, ReviewTaskDto } from './dto';
import { TenantGuard } from '../../common/guards/tenant.guard';
import {
  CurrentCompany,
  CurrentUser,
} from '../../common/decorators/current-tenant.decorator';

@ApiTags('Tasks')
@ApiHeader({ name: 'X-User-Id', description: 'Authenticated user MongoDB ID', required: true })
@UseGuards(TenantGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) { }

  @Get()
  @ApiOperation({ summary: 'List tasks for current company (paginated)' })
  findAll(
    @CurrentCompany() company: { _id: string },
    @Query() query: GetTasksQueryDto,
  ) {
    return this.tasksService.findAll(company._id.toString(), query);
  }

  @Post(':id/review')
  @ApiOperation({ summary: 'Accept or reject an LLM-generated task' })
  review(
    @Param('id') id: string,
    @CurrentCompany() company: { _id: string },
    @CurrentUser() user: { _id: string },
    @Body() dto: ReviewTaskDto,
  ) {
    return this.tasksService.review(
      id,
      company._id.toString(),
      user._id.toString(),
      dto,
    );
  }
}
