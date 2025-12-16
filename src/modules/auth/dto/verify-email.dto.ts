import { IsNotEmpty, IsString, Length, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
	@ApiProperty({ example: 'user@example.com' })
	@IsNotEmpty({ message: 'Email é obrigatório' })
	@IsEmail({}, { message: 'Email inválido' })
	email: string;

	@ApiProperty({ example: '123456' })
	@IsNotEmpty({ message: 'Código é obrigatório' })
	@IsString()
	@Length(6, 6, { message: 'Código deve ter exatamente 6 dígitos' })
	code: string;
}

