import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function createSwaggerDocument(app: INestApplication) {
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
- **MODERATOR**: Reviews and approves verification requests
- **AUDITOR**: Read-only access to verification and audit data
- **ADMIN**: System administration and operational exception handling
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

  return SwaggerModule.createDocument(app, config);
}

export function setupSwagger(app: INestApplication): void {
  const document = createSwaggerDocument(app);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
