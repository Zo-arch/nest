import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExemploService } from './exemplo.service';
import { ExemploController } from './exemplo.controller';
import { Exemplo } from './entities/exemplo.entity';

@Module({
	imports: [TypeOrmModule.forFeature([Exemplo])],
	controllers: [ExemploController],
	providers: [ExemploService],
})
export class ExemploModule { }