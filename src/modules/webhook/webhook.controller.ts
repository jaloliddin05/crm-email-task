import {
  Controller,
  Post,
  Body,
  Headers,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { WebhookService } from './webhook.service';
import { InboundEmailDto } from './dto/inbound-email.dto';

@ApiTags('Webhook')
@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly webhookService: WebhookService,
    private readonly config: ConfigService,
  ) {}

  @Post('email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive inbound email from email provider' })
  async receiveEmail(
    @Headers('x-webhook-secret') secret: string,
    @Body() dto: InboundEmailDto,
  ) {
    // Validate shared secret from email provider
    const expectedSecret = this.config.get<string>('WEBHOOK_SECRET');
    if (expectedSecret && secret !== expectedSecret) {
      this.logger.warn(`Invalid webhook secret attempt`);
      throw new UnauthorizedException('Invalid webhook secret');
    }

    const result = await this.webhookService.handleInboundEmail(dto);
    return result;
  }
}
