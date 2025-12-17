import {
	Injectable,
	UnauthorizedException,
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
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { OAuthService, SocialUserData } from './services/oauth.service';
import { AuthProvider } from '../../common/enums';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';

// Constantes para configuração
const VERIFICATION_CODE_EXPIRATION_HOURS = 24;
const PASSWORD_RESET_EXPIRATION_HOURS = 1;
const VERIFICATION_CODE_LENGTH = 6;

@Injectable()
export class AuthService {
	constructor(
		private userService: UserService,
		private jwtService: JwtService,
		private configService: ConfigService,
		private oauthService: OAuthService,
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
			expires.setHours(expires.getHours() + VERIFICATION_CODE_EXPIRATION_HOURS);

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
			const payload = this.jwtService.verify<JwtPayload>(refreshTokenDto.refreshToken, {
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
		expires.setHours(expires.getHours() + PASSWORD_RESET_EXPIRATION_HOURS);

		await this.userService.setPasswordResetCode(user.email, resetCode, expires);

		// TODO: Enviar email com o código de recuperação de senha
		process.stdout.write(`\n📧 Código de recuperação de senha para ${user.email}: ${resetCode}\n\n`);

		return { message: 'Se o email existir, um código de recuperação foi enviado' };
	}

	async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
		await this.userService.resetPassword(
			resetPasswordDto.email,
			resetPasswordDto.code,
			resetPasswordDto.newPassword,
		);

		return { message: 'Senha alterada com sucesso' };
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
		expires.setHours(expires.getHours() + VERIFICATION_CODE_EXPIRATION_HOURS);

		await this.userService.setEmailVerificationCode(user.email, verificationCode, expires);

		// TODO: Enviar email com o código de verificação
		process.stdout.write(`\n📧 Código de verificação de email para ${user.email}: ${verificationCode}\n\n`);

		return { message: 'Se o email existir e não estiver verificado, um novo código foi enviado' };
	}

	async socialLogin(socialUserData: SocialUserData, provider: AuthProvider): Promise<AuthResponseDto> {
		// Buscar usuário por providerId primeiro
		let user = await this.userService.findByProviderId(provider, socialUserData.providerId);

		// Se não encontrar por providerId, buscar por email
		if (!user) {
			user = await this.userService.findByEmail(socialUserData.email);
		}

		if (!user) {
			// Criar novo usuário
			const newUser = await this.userService.create({
				email: socialUserData.email,
				nome: socialUserData.nome,
				provider,
				providerId: socialUserData.providerId,
				// Não definir senha para usuários sociais
			});

			// Marcar email como verificado (OAuth já valida o email)
			await this.userService.markEmailAsVerified(newUser.id);

			// Gerar tokens
			const tokens = await this.generateTokens(newUser.id, newUser.email);
			await this.userService.updateRefreshToken(newUser.id, tokens.refreshToken);

			const updatedUser = await this.userService.findById(newUser.id);

			return {
				user: updatedUser,
				...tokens,
			};
		} else {
			// Usuário já existe
			// Atualizar providerId se necessário (caso o usuário tenha se registrado com email e depois fez login social)
			if (user.provider !== provider || user.providerId !== socialUserData.providerId) {
				await this.userService.update(user.id, {
					provider,
					providerId: socialUserData.providerId,
				} as any);
			}

			// Garantir que email está verificado
			if (!user.emailVerified) {
				await this.userService.markEmailAsVerified(user.id);
			}

			// Gerar tokens
			const tokens = await this.generateTokens(user.id, user.email);
			await this.userService.updateRefreshToken(user.id, tokens.refreshToken);

			const updatedUser = await this.userService.findById(user.id);

			return {
				user: updatedUser,
				...tokens,
			};
		}
	}

	async loginWithGoogle(token: string): Promise<AuthResponseDto> {
		const socialUserData = await this.oauthService.validateGoogleToken(token);
		return this.socialLogin(socialUserData, AuthProvider.GOOGLE);
	}

	async loginWithApple(token: string): Promise<AuthResponseDto> {
		const socialUserData = await this.oauthService.validateAppleToken(token);
		return this.socialLogin(socialUserData, AuthProvider.APPLE);
	}

	private generateVerificationCode(): string {
		// Gera um código de 6 dígitos criptograficamente seguro (000000 a 999999)
		const randomBytes = crypto.randomBytes(3);
		const code = parseInt(randomBytes.toString('hex'), 16) % 1000000;
		return code.toString().padStart(VERIFICATION_CODE_LENGTH, '0');
	}

	private async generateTokens(userId: number, email: string) {
		const payload: JwtPayload = { sub: userId, email };

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