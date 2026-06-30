import { Module } from '@nestjs/common';

import configuration from './config'
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { TasksModule } from './modules/tasks/tasks.module';
import { UserModule } from './modules/users/user.module';
import { CompanyModule } from './modules/companies/company.module';
import { LlmModule } from './modules/llm/llm.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      cache: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    CompanyModule,
    LlmModule,
    TasksModule,
    UserModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
