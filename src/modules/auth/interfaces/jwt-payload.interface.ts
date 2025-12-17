export interface JwtPayload {
	sub: number; // userId
	email: string;
	iat?: number;
	exp?: number;
}

