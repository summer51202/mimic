import './instrument';
import 'reflect-metadata';
import { RequestValidationPipe } from './common/pipes/request-validation.pipe';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureCors } from './configure-cors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureCors(app);
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new RequestValidationPipe());
  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
