import { IsEmail, IsNotEmpty, IsString, MinLength, IsEnum, IsOptional, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
	@ApiProperty({ example: 'user@example.com' })
	@IsNotEmpty({ message: 'Email é obrigatório' })
	@IsEmail({}, { message: 'Email inválido' })
	email: string;

	@ApiProperty({ example: 'João Silva' })
	@IsNotEmpty({ message: 'Nome é obrigatório' })
	@IsString()
	@MinLength(3, { message: 'Nome deve ter no mínimo 3 caracteres' })
	nome: string;

	@ApiProperty({ example: 'senha123' })
	@IsNotEmpty({ message: 'Senha é obrigatória' })
	@IsString()
	@MinLength(6, { message: 'Senha deve ter no mínimo 6 caracteres' })
	password: string;

	@ApiProperty({ example: [UserRole.USER], enum: UserRole, isArray: true, required: false })
	@IsOptional()
	@IsArray()
	@IsEnum(UserRole, { each: true })
	roles?: UserRole[];
}

