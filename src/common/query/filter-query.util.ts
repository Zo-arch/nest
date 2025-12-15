import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

type FilterFieldType = 'string' | 'number' | 'date' | 'boolean' | 'enum';

export interface FilterDefinition {
	column: string; // exemplo: 'exemplo.descricao'
	type: FilterFieldType;
}

export interface PaginatedResult<T> {
	data: T[];
	total: number;
	page: number;
	size: number;
}

export interface BaseQueryOptions {
	page?: number;
	size?: number;
	sortBy?: string;
	sortDirection?: 'asc' | 'desc';
	// demais campos de filtro vêm junto nesse objeto
	[key: string]: any;
}

export async function applyFiltersAndPaginate<T extends ObjectLiteral>(
	qb: SelectQueryBuilder<T>,
	query: BaseQueryOptions,
	filters: Record<string, FilterDefinition>,
): Promise<PaginatedResult<T>> {
	const {
		page,
		size,
		sortBy = 'id',
		sortDirection = 'asc',
		...rawFilters
	} = query;

	const numericPage = page != null ? Number(page) : 0;
	const numericSize = size != null ? Number(size) : 10;

	Object.entries(rawFilters).forEach(([key, value]) => {
		if (value === undefined || value === null || value === '') return;

		const def = filters[key];
		if (!def) return;

		const paramBase = key;

		switch (def.type) {
			case 'string': {
				qb.andWhere(`${def.column} ILIKE :${paramBase}`, {
					[paramBase]: `%${value}%`,
				});
				break;
			}
			case 'boolean':
			case 'enum': {
				qb.andWhere(`${def.column} = :${paramBase}`, {
					[paramBase]: value,
				});
				break;
			}
			case 'number':
			case 'date': {
				// suporta operadores no estilo: gte:10, lte:20, ne:5, eq:10
				const values = Array.isArray(value) ? value : [value];
				values.forEach((val, index) => {
					if (val == null || val === '') return;

					const str = String(val);
					const [opRaw, rawValue] = str.includes(':') ? str.split(':', 2) : ['eq', str];
					const op = opRaw.toLowerCase();
					const paramName = `${paramBase}_${index}`;

					let sqlOp: string;
					switch (op) {
						case 'gte':
							sqlOp = '>=';
							break;
						case 'gt':
							sqlOp = '>';
							break;
						case 'lte':
							sqlOp = '<=';
							break;
						case 'lt':
							sqlOp = '<';
							break;
						case 'ne':
							sqlOp = '!=';
							break;
						case 'eq':
						default:
							sqlOp = '=';
							break;
					}

					qb.andWhere(`${def.column} ${sqlOp} :${paramName}`, {
						[paramName]: def.type === 'number' ? Number(rawValue) : rawValue,
					});
				});
				break;
			}
			default:
				break;
		}
	});

	const direction = sortDirection?.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
	qb.orderBy(sortBy, direction as 'ASC' | 'DESC');

	qb.skip(numericPage * numericSize).take(numericSize);

	const [data, total] = await qb.getManyAndCount();

	return {
		data,
		total,
		page: numericPage,
		size: numericSize,
	};
}


