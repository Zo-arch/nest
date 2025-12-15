import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ExemploModule } from './modules/exemplo/exemplo.module';

@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true }),

		TypeOrmModule.forRoot({
			type: 'postgres',
			host: process.env.DB_HOST || 'localhost',
			port: parseInt(process.env.DB_PORT ?? '5432'),
			username: process.env.DB_USERNAME || 'postgres',
			password: process.env.DB_PASSWORD || 'postgres',
			database: process.env.DB_NAME || 'nemasa_nest',
			autoLoadEntities: true,
			synchronize: true, // Equivalente ao ddl-auto: update.
		}),

		ExemploModule,
	],
})
export class AppModule { }