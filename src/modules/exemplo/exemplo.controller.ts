import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { ExemploService } from './exemplo.service';
import { ExemploRequestDTO } from './dto/exemplo-request.dto';
import { Exemplo } from './entities/exemplo.entity';
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('exemplos')
@Controller('api/v1/exemplos')
export class ExemploController {
	constructor(private readonly exemploService: ExemploService) { }

	@Post()
	@ApiOperation({ summary: 'Cria um novo exemplo' })
	@ApiBody({ type: ExemploRequestDTO })
	@ApiResponse({ status: 201, description: 'Exemplo criado com sucesso', type: Exemplo })
	create(@Body() createDto: ExemploRequestDTO): Promise<Exemplo> {
		return this.exemploService.criar(createDto);
	}

	@Get()
	@ApiOperation({ summary: 'Lista todos os exemplos' })
	@ApiResponse({
		status: 200,
		description: 'Lista paginada de exemplos retornada com sucesso',
	})
	findAll(@Query() query: any) {
		return this.exemploService.buscarTodos(query);
	}

	@Get(':id')
	@ApiOperation({ summary: 'Busca um exemplo pelo ID' })
	@ApiParam({ name: 'id', type: Number })
	@ApiResponse({ status: 200, description: 'Exemplo encontrado', type: Exemplo })
	@ApiResponse({ status: 404, description: 'Exemplo não encontrado' })
	findOne(@Param('id', ParseIntPipe) id: number): Promise<Exemplo> {
		return this.exemploService.buscarPorId(id);
	}

	@Put(':id')
	@ApiOperation({ summary: 'Atualiza um exemplo pelo ID' })
	@ApiParam({ name: 'id', type: Number })
	@ApiBody({ type: ExemploRequestDTO })
	@ApiResponse({ status: 200, description: 'Exemplo atualizado com sucesso', type: Exemplo })
	@ApiResponse({ status: 404, description: 'Exemplo não encontrado' })
	update(
		@Param('id', ParseIntPipe) id: number,
		@Body() updateDto: ExemploRequestDTO
	): Promise<Exemplo> {
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