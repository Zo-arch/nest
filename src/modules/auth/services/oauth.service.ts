import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import axios from 'axios';
import * as jwt from 'jsonwebtoken';
import { createRemoteJWKSet, jwtVerify } from 'jose';

export interface SocialUserData {
	email: string;
	nome: string;
	providerId: string;
	picture?: string;
}

@Injectable()
export class OAuthService {
	private googleClient: OAuth2Client;
	private readonly googleClientId: string;
	private readonly appleClientId: string;

	constructor(private configService: ConfigService) {
		this.googleClientId = this.configService.get<string>('GOOGLE_CLIENT_ID') || '';
		this.appleClientId = this.configService.get<string>('APPLE_CLIENT_ID') || '';

		this.googleClient = new OAuth2Client(this.googleClientId);
	}

	async validateGoogleToken(token: string): Promise<SocialUserData> {
		try {
			const ticket = await this.googleClient.verifyIdToken({
				idToken: token,
				audience: this.googleClientId,
			});

			const payload = ticket.getPayload();

			if (!payload) {
				throw new UnauthorizedException('Token do Google inválido');
			}

			if (!payload.email) {
				throw new UnauthorizedException('Email não encontrado no token do Google');
			}

			return {
				email: payload.email,
				nome: payload.name || payload.given_name || 'Usuário',
				providerId: payload.sub,
				picture: payload.picture,
			};
		} catch (error) {
			if (error instanceof UnauthorizedException) {
				throw error;
			}
			throw new UnauthorizedException('Falha ao validar token do Google');
		}
	}

	async validateAppleToken(token: string): Promise<SocialUserData> {
		try {
			// Criar JWKS remoto para buscar as chaves públicas da Apple
			const JWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

			// Verificar o token
			const { payload } = await jwtVerify(token, JWKS, {
				audience: this.appleClientId,
				issuer: 'https://appleid.apple.com',
			});

			if (!payload.email || typeof payload.email !== 'string') {
				throw new UnauthorizedException('Email não encontrado no token do Apple');
			}

			if (!payload.sub || typeof payload.sub !== 'string') {
				throw new UnauthorizedException('ID do usuário não encontrado no token do Apple');
			}

			return {
				email: payload.email,
				nome: (payload.name as any)?.fullName || payload.email.split('@')[0] || 'Usuário',
				providerId: payload.sub,
			};
		} catch (error) {
			if (error instanceof UnauthorizedException) {
				throw error;
			}
			throw new UnauthorizedException('Falha ao validar token do Apple');
		}
	}
}

