import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ReviewAction {
  ACCEPT = 'accept',
  REJECT = 'reject',
}

class ReviewTaskDto {
  @ApiProperty({ enum: ReviewAction, example: 'accept' })
  @IsEnum(ReviewAction)
  action: ReviewAction;
}

export default ReviewTaskDto;