import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../user/user.service';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
	constructor(
		private configService: ConfigService,
		private userService: UserService,
	) {
		super({
			jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
			ignoreExpiration: false,
			secretOrKey: configService.get<string>('JWT_REFRESH_SECRET') || 'your-refresh-secret-key',
		});
	}

	async validate(payload: any) {
		const user = await this.userService.findById(payload.sub);
		
		if (!user || !user.ativo) {
			throw new UnauthorizedException('Usuário não encontrado ou inativo');
		}

		// O refresh token vem do body, não do payload
		// A validação será feita no AuthService
		return {
			id: user.id,
			email: user.email,
			nome: user.nome,
			roles: user.roles,
		};
	}
}

