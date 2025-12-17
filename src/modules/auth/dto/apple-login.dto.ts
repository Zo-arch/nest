import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AppleLoginDto {
	@ApiProperty({
		example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjEyMzQ1NiIsInR5cCI6IkpXVCJ9...',
		description: 'Token ID do Apple Sign In',
	})
	@IsNotEmpty({ message: 'Token é obrigatório' })
	@IsString()
	token: string;
}

