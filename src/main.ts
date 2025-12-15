import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	app.useGlobalPipes(new ValidationPipe({
		whitelist: true,
		forbidNonWhitelisted: true,
		transform: true,
	}));

	const config = new DocumentBuilder()
		.setTitle('Exemplo API')
		.setDescription('API de exemplos')
		.setVersion('1.0')
		.addTag('exemplos')
		.build();

	const document = SwaggerModule.createDocument(app, config);

	SwaggerModule.setup('api', app, document);

	const scalarConfig: any = {
		theme: 'purple',
		darkMode: true,
		spec: {
			content: document,
		},
	};

	app.use('/reference', apiReference(scalarConfig));

	await app.listen(process.env.SERVER_PORT || 3000);
}
bootstrap();