import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class InboundEmailDto {
  @ApiProperty({
    description: `The email address of the sender.`,
    example: 'email1@gmail.com',
  })
  @IsEmail()
  from: string;

  @ApiProperty({
    description: `The email address of the recipient.`,
    example: 'email2@gmail.com',
  })
  @IsEmail()
  to: string;

  @ApiProperty({
    description: `The subject of the email.`,
    example: 'Hello World',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  subject: string;

  @ApiProperty({
    description: `The body of the email.`,
    example: 'This is the body of the email.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50000) // ~50KB max body
  body: string;
}
