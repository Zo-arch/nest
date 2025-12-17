import { Controller, Post, Body, UseGuards, Get, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { AppleLoginDto } from './dto/apple-login.dto';
import { Public } from './decorators/public.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { UserResponseDto } from '../user/dto/user-response.dto';

@ApiTags('auth')
@Controller('api/v1/auth')
export class AuthController {
	constructor(
		private readonly authService: AuthService,
		private readonly configService: ConfigService,
	) { }

	@Public()
	@Post('register')
	@Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 tentativas por minuto
	@ApiOperation({ summary: 'Registra um novo usuário (requer verificação de email)' })
	@ApiResponse({ status: 201, description: 'Usuário registrado com sucesso', type: AuthResponseDto })
	@ApiResponse({ status: 409, description: 'Email já está em uso' })
	async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
		return this.authService.register(registerDto, true);
	}

	@Public()
	@Post('register/dev')
	@Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 tentativas por minuto
	@ApiOperation({ summary: 'Registra um novo usuário SEM verificação (apenas em development)' })
	@ApiResponse({ status: 201, description: 'Usuário registrado com sucesso', type: AuthResponseDto })
	@ApiResponse({ status: 409, description: 'Email já está em uso' })
	@ApiResponse({ status: 403, description: 'Rota disponível apenas em development' })
	async registerDev(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
		const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
		if (nodeEnv !== 'development') {
			throw new ForbiddenException('Esta rota está disponível apenas em ambiente de desenvolvimento');
		}
		return this.authService.register(registerDto, false);
	}

	@Public()
	@Post('login')
	@Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 tentativas por minuto (proteção contra brute force)
	@ApiOperation({ summary: 'Autentica um usuário' })
	@ApiResponse({ status: 200, description: 'Login realizado com sucesso', type: AuthResponseDto })
	@ApiResponse({ status: 401, description: 'Credenciais inválidas' })
	@ApiResponse({ status: 403, description: 'Email não verificado' })
	async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
		return this.authService.login(loginDto);
	}

	@Public()
	@Post('refresh')
	@ApiOperation({ summary: 'Renova o access token usando refresh token' })
	@ApiResponse({ status: 200, description: 'Token renovado com sucesso' })
	@ApiResponse({ status: 401, description: 'Refresh token inválido' })
	async refresh(@Body() refreshTokenDto: RefreshTokenDto): Promise<{ accessToken: string }> {
		return this.authService.refreshToken(refreshTokenDto);
	}

	@Public()
	@Post('forgot-password')
	@ApiOperation({ summary: 'Solicita recuperação de senha (envia código por email)' })
	@ApiResponse({ status: 200, description: 'Código de recuperação enviado (se email existir)' })
	async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
		return this.authService.forgotPassword(forgotPasswordDto);
	}

	@Public()
	@Post('reset-password')
	@ApiOperation({ summary: 'Reseta a senha usando código de recuperação' })
	@ApiResponse({ status: 200, description: 'Senha alterada com sucesso' })
	@ApiResponse({ status: 404, description: 'Código inválido ou expirado' })
	async resetPassword(@Body() resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
		return this.authService.resetPassword(resetPasswordDto);
	}

	@Public()
	@Post('verify-email')
	@Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 tentativas por minuto
	@ApiOperation({ summary: 'Verifica o email usando código de verificação (requer email e código)' })
	@ApiResponse({ status: 200, description: 'Email verificado com sucesso' })
	@ApiResponse({ status: 404, description: 'Código inválido, expirado ou não corresponde ao email' })
	async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto): Promise<{ message: string }> {
		return this.authService.verifyEmail(verifyEmailDto);
	}

	@Public()
	@Post('resend-verification')
	@Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 tentativas por minuto
	@ApiOperation({ summary: 'Reenvia email de verificação' })
	@ApiResponse({ status: 200, description: 'Email de verificação reenviado (se aplicável)' })
	async resendVerification(@Body() resendVerificationDto: ResendVerificationDto): Promise<{ message: string }> {
		return this.authService.resendVerificationEmail(resendVerificationDto);
	}

	@Public()
	@Post('google')
	@Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 tentativas por minuto
	@ApiOperation({ summary: 'Login ou registro com Google' })
	@ApiResponse({ status: 200, description: 'Login realizado com sucesso', type: AuthResponseDto })
	@ApiResponse({ status: 401, description: 'Token do Google inválido' })
	async loginWithGoogle(@Body() googleLoginDto: GoogleLoginDto): Promise<AuthResponseDto> {
		return this.authService.loginWithGoogle(googleLoginDto.token);
	}

	@Public()
	@Post('apple')
	@Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 tentativas por minuto
	@ApiOperation({ summary: 'Login ou registro com Apple' })
	@ApiResponse({ status: 200, description: 'Login realizado com sucesso', type: AuthResponseDto })
	@ApiResponse({ status: 401, description: 'Token do Apple inválido' })
	async loginWithApple(@Body() appleLoginDto: AppleLoginDto): Promise<AuthResponseDto> {
		return this.authService.loginWithApple(appleLoginDto.token);
	}

	@UseGuards(JwtAuthGuard)
	@Get('me')
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Retorna informações do usuário autenticado' })
	@ApiResponse({ status: 200, description: 'Informações do usuário', type: UserResponseDto })
	@ApiResponse({ status: 401, description: 'Não autenticado' })
	async getProfile(@CurrentUser() user): Promise<UserResponseDto> {
		return this.authService.getProfile(user.id);
	}
}

