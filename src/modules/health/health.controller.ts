import { Controller, Get } from '@nestjs/common';
import {
	HealthCheckService,
	HealthCheck,
	TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('health')
@Controller('health')
@Public()
export class HealthController {
	constructor(
		private health: HealthCheckService,
		private db: TypeOrmHealthIndicator,
	) { }

	@Get()
	@HealthCheck()
	@ApiOperation({ summary: 'Verifica a saúde da aplicação e do banco de dados' })
	check() {
		return this.health.check([
			() => this.db.pingCheck('database'),
		]);
	}
}

