import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleLoginDto {
	@ApiProperty({
		example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjEyMzQ1NiIsInR5cCI6IkpXVCJ9...',
		description: 'Token ID do Google OAuth',
	})
	@IsNotEmpty({ message: 'Token é obrigatório' })
	@IsString()
	token: string;
}

