import { IsNotEmpty, IsString, Length, IsEnum, IsNumber, Min, IsBoolean, IsDateString } from 'class-validator';
import { ExemploEnum } from 'src/common/enum/exemplo.enum';
import { ApiProperty } from '@nestjs/swagger';

export class ExemploRequestDTO {
	@ApiProperty({ enum: ExemploEnum, example: ExemploEnum.TIPO_A })
	@IsNotEmpty({ message: 'O tipo do enum não pode ser nulo' })
	@IsEnum(ExemploEnum)
	enumType: ExemploEnum;

	@ApiProperty({ example: 'Descrição do exemplo' })
	@IsNotEmpty({ message: 'A descrição não pode ser nula' })
	@IsString()
	@Length(3, 255, { message: 'A descrição deve ter entre 3 e 255 caracteres' })
	descricao: string;

	@ApiProperty({ example: 199.9 })
	@IsNotEmpty()
	@IsNumber()
	@Min(0, { message: 'O valor deve ser positivo ou zero' })
	valor: number;

	@ApiProperty({ example: '2025-01-31' })
	@IsNotEmpty()
	@IsDateString()
	dataExemplo: string;

	@ApiProperty({ example: true })
	@IsNotEmpty()
	@IsBoolean()
	ativo: boolean;
}