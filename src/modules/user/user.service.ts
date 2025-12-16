import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
	constructor(
		@InjectRepository(User)
		private readonly userRepository: Repository<User>,
	) { }

	async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
		const existingUser = await this.userRepository.findOne({
			where: { email: createUserDto.email },
		});

		if (existingUser) {
			throw new ConflictException('Email já está em uso');
		}

		const user = this.userRepository.create({
			...createUserDto,
			roles: createUserDto.roles || [UserRole.USER],
		});

		// Hash será feito pelo @BeforeInsert hook da entidade
		const savedUser = await this.userRepository.save(user);

		// Remover campos sensíveis do retorno
		const {
			password,
			refreshToken,
			passwordResetCode,
			passwordResetExpires,
			emailVerificationCode,
			emailVerificationExpires,
			...result
		} = savedUser;
		return result as UserResponseDto;
	}

	async findByEmail(email: string): Promise<User | null> {
		return this.userRepository.findOne({ where: { email } });
	}

	async findById(id: number): Promise<UserResponseDto> {
		const user = await this.userRepository.findOne({ where: { id } });
		if (!user) {
			throw new NotFoundException(`Usuário com id ${id} não encontrado`);
		}
		const {
			password,
			refreshToken,
			passwordResetCode,
			passwordResetExpires,
			emailVerificationCode,
			emailVerificationExpires,
			...result
		} = user;
		return result as UserResponseDto;
	}

	async updateRefreshToken(userId: number, refreshToken: string): Promise<void> {
		const hashedToken = await bcrypt.hash(refreshToken, 10);
		// Usar query SQL raw para não incrementar a version
		// Usar aspas duplas para preservar o case exato da coluna
		await this.userRepository.query(
			'UPDATE users SET "refreshToken" = $1 WHERE id = $2',
			[hashedToken, userId],
		);
	}

	async removeRefreshToken(userId: number): Promise<void> {
		// Usar query SQL raw para não incrementar a version
		// Usar aspas duplas para preservar o case exato da coluna
		await this.userRepository.query(
			'UPDATE users SET "refreshToken" = NULL WHERE id = $1',
			[userId],
		);
	}

	async setPasswordResetCode(email: string, code: string, expires: Date): Promise<void> {
		await this.userRepository.update(
			{ email },
			{ passwordResetCode: code, passwordResetExpires: expires },
		);
	}

	async resetPassword(code: string, newPassword: string): Promise<void> {
		const user = await this.userRepository.findOne({
			where: { passwordResetCode: code },
		});

		if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
			throw new NotFoundException('Código inválido ou expirado');
		}

		user.password = newPassword;
		user.passwordResetCode = undefined;
		user.passwordResetExpires = undefined;

		await this.userRepository.save(user);
	}

	async validateRefreshToken(userId: number, refreshToken: string): Promise<boolean> {
		const user = await this.userRepository.findOne({ where: { id: userId } });
		if (!user || !user.refreshToken) {
			return false;
		}
		return bcrypt.compare(refreshToken, user.refreshToken);
	}

	async setEmailVerificationCode(email: string, code: string, expires: Date): Promise<void> {
		await this.userRepository.update(
			{ email },
			{ emailVerificationCode: code, emailVerificationExpires: expires },
		);
	}

	async verifyEmail(email: string, code: string): Promise<void> {
		// Se código vazio, apenas marcar como verificado (para development)
		if (!code) {
			const user = await this.userRepository.findOne({ where: { email } });
			if (user) {
				await this.markEmailAsVerified(user.id);
			}
			return;
		}

		const user = await this.userRepository.findOne({
			where: {
				email,
				emailVerificationCode: code,
			},
		});

		if (!user) {
			throw new NotFoundException('Código inválido ou não corresponde ao email informado');
		}

		if (!user.emailVerificationExpires || user.emailVerificationExpires < new Date()) {
			throw new NotFoundException('Código expirado');
		}

		user.emailVerified = true;
		user.emailVerificationCode = undefined;
		user.emailVerificationExpires = undefined;

		await this.userRepository.save(user);
	}

	async markEmailAsVerified(userId: number): Promise<void> {
		await this.userRepository.update(userId, {
			emailVerified: true,
			emailVerificationCode: undefined,
			emailVerificationExpires: undefined,
		});
	}
}

