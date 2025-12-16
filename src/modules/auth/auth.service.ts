import {
	Injectable,
	UnauthorizedException,
	BadRequestException,
	ForbiddenException,
} from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user/user.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UserResponseDto } from '../user/dto/user-response.dto';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthService {
	constructor(
		private userService: UserService,
		private jwtService: JwtService,
		private configService: ConfigService,
	) { }

	async register(registerDto: RegisterDto, requireEmailVerification: boolean = true): Promise<AuthResponseDto> {
		const user = await this.userService.create({
			email: registerDto.email,
			nome: registerDto.nome,
			password: registerDto.password,
		});

		// Se não for development, requer verificação de email
		if (requireEmailVerification) {
			const verificationCode = this.generateVerificationCode();
			const expires = new Date();
			expires.setHours(expires.getHours() + 24); // Código expira em 24 horas

			await this.userService.setEmailVerificationCode(user.email, verificationCode, expires);

			// TODO: Enviar email com o código de verificação
			process.stdout.write(`\n📧 Código de verificação de email para ${user.email}: ${verificationCode}\n\n`);
		} else {
			// Em development, marcar como verificado automaticamente
			await this.userService.markEmailAsVerified(user.id);
		}

		const tokens = await this.generateTokens(user.id, user.email);

		await this.userService.updateRefreshToken(user.id, tokens.refreshToken);

		const updatedUser = await this.userService.findById(user.id);

		return {
			user: updatedUser,
			...tokens,
		};
	}

	async login(loginDto: LoginDto): Promise<AuthResponseDto> {
		const user = await this.userService.findByEmail(loginDto.email);

		if (!user) {
			throw new UnauthorizedException('Credenciais inválidas');
		}

		const isPasswordValid = await user.validatePassword(loginDto.password);

		if (!isPasswordValid) {
			throw new UnauthorizedException('Credenciais inválidas');
		}

		if (!user.ativo) {
			throw new UnauthorizedException('Usuário inativo');
		}

		// Verificar se o email foi verificado (sempre obrigatório, exceto em registro dev)
		if (!user.emailVerified) {
			throw new ForbiddenException('Email não verificado. Verifique sua caixa de entrada e confirme seu email antes de fazer login.');
		}

		const tokens = await this.generateTokens(user.id, user.email);

		await this.userService.updateRefreshToken(user.id, tokens.refreshToken);

		const {
			password,
			refreshToken,
			passwordResetCode,
			passwordResetExpires,
			emailVerificationCode,
			emailVerificationExpires,
			...userResponse
		} = user;

		return {
			user: userResponse as UserResponseDto,
			...tokens,
		};
	}

	async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<{ accessToken: string }> {
		try {
			const payload = this.jwtService.verify(refreshTokenDto.refreshToken, {
				secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
			});

			const user = await this.userService.findById(payload.sub);

			if (!user || !user.ativo) {
				throw new UnauthorizedException('Usuário não encontrado ou inativo');
			}

			const isValid = await this.userService.validateRefreshToken(
				user.id,
				refreshTokenDto.refreshToken,
			);

			if (!isValid) {
				throw new UnauthorizedException('Refresh token inválido');
			}

			const accessToken = this.jwtService.sign(
				{ sub: user.id, email: user.email },
				{
					expiresIn: this.configService.get<string>('JWT_EXPIRATION', '15m'),
				} as JwtSignOptions,
			);

			return { accessToken };
		} catch (error) {
			throw new UnauthorizedException('Refresh token inválido ou expirado');
		}
	}

	async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
		const user = await this.userService.findByEmail(forgotPasswordDto.email);

		if (!user) {
			return { message: 'Se o email existir, um código de recuperação foi enviado' };
		}

		const resetCode = this.generateVerificationCode();
		const expires = new Date();
		expires.setHours(expires.getHours() + 1);

		await this.userService.setPasswordResetCode(user.email, resetCode, expires);

		// TODO: Enviar email com o código de recuperação de senha
		process.stdout.write(`\n📧 Código de recuperação de senha para ${user.email}: ${resetCode}\n\n`);

		return { message: 'Se o email existir, um código de recuperação foi enviado' };
	}

	async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
		await this.userService.resetPassword(resetPasswordDto.code, resetPasswordDto.newPassword);

		return { message: 'Senha alterada com sucesso' };
	}

	async validateUser(email: string, password: string): Promise<any> {
		const user = await this.userService.findByEmail(email);

		if (user && (await user.validatePassword(password))) {
			const { password: _, ...result } = user;
			return result;
		}

		return null;
	}

	async getProfile(userId: number): Promise<UserResponseDto> {
		return this.userService.findById(userId);
	}

	async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<{ message: string }> {
		await this.userService.verifyEmail(verifyEmailDto.email, verifyEmailDto.code);
		return { message: 'Email verificado com sucesso' };
	}

	async resendVerificationEmail(resendVerificationDto: ResendVerificationDto): Promise<{ message: string }> {
		const user = await this.userService.findByEmail(resendVerificationDto.email);

		if (!user) {
			// Por segurança, não revelar se o email existe
			return { message: 'Se o email existir e não estiver verificado, um novo código foi enviado' };
		}

		if (user.emailVerified) {
			return { message: 'Email já está verificado' };
		}

		const verificationCode = this.generateVerificationCode();
		const expires = new Date();
		expires.setHours(expires.getHours() + 24); // Código expira em 24 horas

		await this.userService.setEmailVerificationCode(user.email, verificationCode, expires);

		// TODO: Enviar email com o código de verificação
		process.stdout.write(`\n📧 Código de verificação de email para ${user.email}: ${verificationCode}\n\n`);

		return { message: 'Se o email existir e não estiver verificado, um novo código foi enviado' };
	}

	private generateVerificationCode(): string {
		// Gera um código de 6 dígitos (000000 a 999999)
		return Math.floor(100000 + Math.random() * 900000).toString();
	}

	private async generateTokens(userId: number, email: string) {
		const payload = { sub: userId, email };

		const accessToken = this.jwtService.sign(payload, {
			expiresIn: this.configService.get<string>('JWT_EXPIRATION', '15m'),
		} as JwtSignOptions);

		const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET') || 'your-refresh-secret-key';
		const refreshExpiration = this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d');

		const refreshToken = jwt.sign(payload, refreshSecret, {
			expiresIn: refreshExpiration,
		} as jwt.SignOptions);

		return {
			accessToken,
			refreshToken,
		};
	}
}