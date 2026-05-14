import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { setupSwagger } from './swagger';
import './polyfills';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Swagger/OpenAPI Documentation
  setupSwagger(app);

  // Health check endpoint (dùng cho Docker healthcheck)
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/health', (_req: any, res: any) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);


  console.log(`
╔═══════════════════════════════════════════════════════════╗
║       Transparent Donation System Backend                 ║
╠═══════════════════════════════════════════════════════════╣
║  Server running at: http://localhost:${port}                 ║
║  Swagger docs at:   http://localhost:${port}/api             ║
║  Blockchain mode:   ${(process.env.BLOCKCHAIN_MODE || 'mock').padEnd(36)}║
╚═══════════════════════════════════════════════════════════╝
  `);
}

bootstrap();
