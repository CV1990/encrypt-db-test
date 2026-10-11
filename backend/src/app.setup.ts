import { INestApplication, ValidationPipe } from '@nestjs/common';

/** Configuración compartida por main.ts y las pruebas e2e. */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
  const origins = process.env.CORS_ORIGIN?.split(',').map((o) => o.trim());
  app.enableCors({ origin: origins ?? true });
}
