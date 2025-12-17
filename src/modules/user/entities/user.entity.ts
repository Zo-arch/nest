import { Entity, Column, BeforeInsert, BeforeUpdate } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole, AuthProvider } from '../../../common/enums';
import * as bcrypt from 'bcrypt';

@Entity('users')
export class User extends BaseEntity {
	@ApiProperty({ example: 'user@example.com' })
	@Column({ unique: true, length: 255 })
	email: string;

	@ApiProperty({ example: 'João Silva' })
	@Column({ length: 255 })
	nome: string;

	@Column({ nullable: true, length: 255 })
	password?: string;

	@ApiProperty({ example: [UserRole.USER], enum: UserRole, isArray: true })
	@Column({
		type: 'enum',
		enum: UserRole,
		array: true,
		default: [UserRole.USER],
	})
	roles: UserRole[];

	@Column({ nullable: true, length: 500 })
	refreshToken?: string;

	@Column({ nullable: true, type: 'timestamp' })
	passwordResetExpires?: Date;

	@ApiProperty({ example: true })
	@Column({ default: true })
	ativo: boolean;

	@ApiProperty({ example: false })
	@Column({ default: false })
	emailVerified: boolean;

	@Column({ nullable: true, length: 6 })
	emailVerificationCode?: string;

	@Column({ nullable: true, type: 'timestamp' })
	emailVerificationExpires?: Date;

	@Column({ nullable: true, length: 6 })
	passwordResetCode?: string;

	@ApiProperty({ example: AuthProvider.LOCAL, enum: AuthProvider })
	@Column({
		type: 'enum',
		enum: AuthProvider,
		default: AuthProvider.LOCAL,
	})
	provider: AuthProvider;

	@Column({ nullable: true, length: 255 })
	providerId?: string;

	@BeforeInsert()
	async hashPassword() {
		if (this.password && !this.password.startsWith('$2b$')) {
			const salt = await bcrypt.genSalt(10);
			this.password = await bcrypt.hash(this.password, salt);
		}
	}

	@BeforeUpdate()
	async hashPasswordIfChanged() {
		// Só hashea se a senha foi alterada (não começa com $2b$ que é o prefixo do bcrypt)
		if (this.password && !this.password.startsWith('$2b$')) {
			const salt = await bcrypt.genSalt(10);
			this.password = await bcrypt.hash(this.password, salt);
		}
	}

	async validatePassword(password: string): Promise<boolean> {
		if (!this.password) {
			return false;
		}
		return bcrypt.compare(password, this.password);
	}
}

