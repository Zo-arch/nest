import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ExemploService } from './exemplo.service';
import { CreateExemploDto } from './dto/create-exemplo.dto';
import { UpdateExemploDto } from './dto/update-exemplo.dto';
import { ExemploResponseDto } from './dto/exemplo-response.dto';
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BaseQueryDto } from 'src/common/dto/base-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('exemplos')
@Controller('api/v1/exemplos')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ExemploController {
	constructor(private readonly exemploService: ExemploService) { }

	@Post()
	@ApiOperation({ summary: 'Cria um novo exemplo' })
	@ApiBody({ type: CreateExemploDto })
	@ApiResponse({ status: 201, description: 'Exemplo criado com sucesso', type: ExemploResponseDto })
	create(@Body() createDto: CreateExemploDto): Promise<ExemploResponseDto> {
		return this.exemploService.criar(createDto);
	}

	@Get()
	@ApiOperation({ summary: 'Lista todos os exemplos' })
	@ApiResponse({
		status: 200,
		description: 'Lista paginada de exemplos retornada com sucesso',
	})
	findAll(@Query() query: BaseQueryDto) {
		return this.exemploService.buscarTodos(query);
	}

	@Get(':id')
	@ApiOperation({ summary: 'Busca um exemplo pelo ID' })
	@ApiParam({ name: 'id', type: Number })
	@ApiResponse({ status: 200, description: 'Exemplo encontrado', type: ExemploResponseDto })
	@ApiResponse({ status: 404, description: 'Exemplo não encontrado' })
	findOne(@Param('id', ParseIntPipe) id: number): Promise<ExemploResponseDto> {
		return this.exemploService.buscarPorId(id);
	}

	@Put(':id')
	@ApiOperation({ summary: 'Atualiza um exemplo pelo ID' })
	@ApiParam({ name: 'id', type: Number })
	@ApiBody({ type: UpdateExemploDto })
	@ApiResponse({ status: 200, description: 'Exemplo atualizado com sucesso', type: ExemploResponseDto })
	@ApiResponse({ status: 404, description: 'Exemplo não encontrado' })
	update(
		@Param('id', ParseIntPipe) id: number,
		@Body() updateDto: UpdateExemploDto
	): Promise<ExemploResponseDto> {
		return this.exemploService.atualizar(id, updateDto);
	}

	@Delete(':id')
	@ApiOperation({ summary: 'Remove um exemplo pelo ID' })
	@ApiParam({ name: 'id', type: Number })
	@ApiResponse({ status: 204, description: 'Exemplo removido com sucesso' })
	@ApiResponse({ status: 404, description: 'Exemplo não encontrado' })
	remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
		return this.exemploService.deletar(id);
	}
}