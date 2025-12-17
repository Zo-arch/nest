import { ApiProperty } from '@nestjs/swagger';
import { UserRole, AuthProvider } from '../../../common/enums';

export class UserResponseDto {
	@ApiProperty({ example: 1 })
	id: number;

	@ApiProperty({ example: 'user@example.com' })
	email: string;

	@ApiProperty({ example: 'João Silva' })
	nome: string;

	@ApiProperty({ example: [UserRole.USER], enum: UserRole, isArray: true })
	roles: UserRole[];

	@ApiProperty({ example: true })
	ativo: boolean;

	@ApiProperty({ example: false })
	emailVerified: boolean;

	@ApiProperty({ example: AuthProvider.LOCAL, enum: AuthProvider })
	provider: AuthProvider;

	@ApiProperty({ example: '123456789', required: false })
	providerId?: string;

	@ApiProperty({ example: 1 })
	version: number;

	@ApiProperty({ example: '2025-01-31T10:00:00.000Z' })
	createdDate: Date;

	@ApiProperty({ example: '2025-01-31T10:00:00.000Z' })
	lastModifiedDate: Date;
}

