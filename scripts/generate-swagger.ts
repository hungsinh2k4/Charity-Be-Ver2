import { renameSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { createSwaggerDocument } from '../src/swagger';

async function generateSwagger() {
  const app = await NestFactory.create(AppModule, { logger: false });
  const document = createSwaggerDocument(app);
  const outputPath = resolve(process.cwd(), 'swagger.json');
  const tempPath = resolve(process.cwd(), 'swagger.tmp.json');

  writeFileSync(tempPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
  renameSync(tempPath, outputPath);
  await app.close();

  console.log(`Swagger JSON updated: ${outputPath}`);
}

generateSwagger().catch((error) => {
  console.error('Failed to generate swagger.json:', error);
  process.exit(1);
});
