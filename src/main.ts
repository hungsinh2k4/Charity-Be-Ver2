import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

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
  const config = new DocumentBuilder()
    .setTitle('Transparent Donation System API')
    .setDescription(
      `
## Overview
A blockchain-enabled donation platform ensuring transparency, auditability, and immutability.

## Features
- **User Management**: Registration, authentication, and verification
- **Organization Management**: CRUD with blockchain recording
- **Campaign Management**: Create and manage fundraising campaigns
- **Donations**: Anonymous donation support with blockchain verification
- **Verification System**: Multi-level verification for users, organizations, and campaigns
- **Audit Trail**: Complete blockchain-backed audit history

## Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

## Roles
- **USER**: Standard user account
- **ADMIN**: Full administrative access
- **AUDITOR**: Read-only access to verification and audit data
      `,
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Users', 'User management endpoints')
    .addTag('Organizations', 'Organization management endpoints')
    .addTag('Campaigns', 'Campaign management endpoints')
    .addTag('Donations', 'Donation endpoints (public)')
    .addTag('Verification', 'Verification request endpoints')
    .addTag('Admin', 'Administrative endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

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
