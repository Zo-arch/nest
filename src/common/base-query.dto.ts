import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsPositive, IsString, Min } from 'class-validator';

export class BaseQueryDto {
	@ApiPropertyOptional({ description: 'Página (0-based)', example: 0 })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(0)
	page?: number = 0;

	@ApiPropertyOptional({ description: 'Tamanho da página', example: 10 })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@IsPositive()
	size?: number = 10;

	@ApiPropertyOptional({ description: 'Campo para ordenação', example: 'id' })
	@IsOptional()
	@IsString()
	sortBy?: string = 'id';

	@ApiPropertyOptional({
		description: 'Direção da ordenação',
		example: 'asc',
		enum: ['asc', 'desc'],
	})
	@IsOptional()
	@IsString()
	sortDirection?: 'asc' | 'desc' = 'asc';
}


