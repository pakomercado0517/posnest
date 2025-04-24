import { NestFactory } from '@nestjs/core';
import { SeederModule } from './seeder/seeder.module';
import { SeederService } from './seeder/seeder.service';

async function bootstrap() {
  const app = await NestFactory.create(SeederModule);
  const seeder = app.get(SeederService);
  await seeder.onModuleInit();
  await seeder.seed();
  await app.close();
}
// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
