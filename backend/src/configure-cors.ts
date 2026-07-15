import { INestApplication } from '@nestjs/common';

export function configureCors(app: INestApplication): void {
  const origins = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  if (origins.length === 0) {
    return;
  }

  app.enableCors({
    origin: origins,
    credentials: true,
  });
}
