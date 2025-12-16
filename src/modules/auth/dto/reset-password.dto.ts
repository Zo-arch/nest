import { IsNotEmpty, IsString, MinLength, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
	@ApiProperty({ example: '123456' })
	@IsNotEmpty({ message: 'Código é obrigatório' })
	@IsString()
	@Length(6, 6, { message: 'Código deve ter exatamente 6 dígitos' })
	code: string;

	@ApiProperty({ example: 'novaSenha123' })
	@IsNotEmpty({ message: 'Nova senha é obrigatória' })
	@IsString()
	@MinLength(6, { message: 'Senha deve ter no mínimo 6 caracteres' })
	newPassword: string;
}

