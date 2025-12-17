import * as fs from 'fs';
import * as path from 'path';

interface Property {
	name: string;
	type: string;
	optional: boolean;
	description?: string;
	example?: string;
	enum?: string;
	isArray?: boolean;
	default?: string;
}

interface EnumValue {
	name: string;
	value: string;
}

interface TypeDefinition {
	name: string;
	type: 'enum' | 'dto' | 'entity';
	properties: Property[];
	enumValues?: EnumValue[];
	filePath: string;
	module: string;
}

const SRC_DIR = path.join(__dirname, '../src');
const OUTPUT_FILE = path.join(__dirname, '../FRONTEND_TYPES.md');

// Função para extrair enums
function extractEnum(filePath: string, content: string): TypeDefinition | null {
	const enumMatch = content.match(/export\s+enum\s+(\w+)\s*\{([^}]+)\}/s);
	if (!enumMatch) return null;

	const enumName = enumMatch[1];
	const enumBody = enumMatch[2];
	const values: EnumValue[] = [];

	// Extrair valores do enum
	const valueRegex = /(\w+)\s*=\s*['"]([^'"]+)['"]/g;
	let match;
	while ((match = valueRegex.exec(enumBody)) !== null) {
		values.push({
			name: match[1],
			value: match[2],
		});
	}

	const module = extractModule(filePath);

	return {
		name: enumName,
		type: 'enum',
		properties: [],
		enumValues: values,
		filePath: path.relative(SRC_DIR, filePath),
		module,
	};
}

// Função para extrair DTOs e Entities
function extractClass(filePath: string, content: string): TypeDefinition[] {
	const results: TypeDefinition[] = [];
	
	// Regex melhorado para capturar classes com múltiplas linhas
	const classRegex = /export\s+class\s+(\w+)(?:\s+extends\s+[\w<>,\s]+)?\s*\{([\s\S]*?)\n\}/g;
	let match;

	while ((match = classRegex.exec(content)) !== null) {
		const className = match[1];
		const classBody = match[2];
		const properties: Property[] = [];

		// Extrair todas as propriedades (linha por linha)
		const lines = classBody.split('\n');
		let currentDecorators = '';
		let inDecorator = false;
		
		for (let i = 0; i < lines.length; i++) {
			let line = lines[i].trim();
			
			// Ignorar linhas vazias e comentários
			if (!line || line.startsWith('//') || line.startsWith('*')) {
				continue;
			}
			
			// Se a linha começa com @, é um decorator
			if (line.startsWith('@')) {
				currentDecorators += line + ' ';
				inDecorator = true;
				// Verificar se o decorator termina na mesma linha
				if (!line.includes('(') || (line.match(/\(/g) || []).length === (line.match(/\)/g) || []).length) {
					inDecorator = false;
				}
				continue;
			}
			
			// Se está dentro de um decorator multi-linha, continuar acumulando
			if (inDecorator) {
				currentDecorators += line + ' ';
				if (line.includes(')')) {
					inDecorator = false;
				}
				continue;
			}
			
			// Se a linha tem uma propriedade (nome: tipo) - deve começar com letra/número, não @
			const propMatch = line.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)(\??):\s*([^;=]+?)(?:\s*=\s*[^;]+)?;?$/);
			if (propMatch) {
				const propName = propMatch[1];
				const optional = propMatch[2] === '?';
				let typeDef = propMatch[3].trim();

				// Extrair informações dos decorators
				let description = '';
				let example = '';
				let enumType = '';
				let isArray = false;

				// Extrair @ApiProperty
				const apiPropertyRegex = /@ApiProperty\(([\s\S]*?)\)/g;
				let apiMatch;
				while ((apiMatch = apiPropertyRegex.exec(currentDecorators)) !== null) {
					const apiContent = apiMatch[1];
					
					// Extrair example
					const exampleMatch = apiContent.match(/example:\s*([^,}]+)/);
					if (exampleMatch) {
						example = exampleMatch[1].trim().replace(/['"]/g, '');
					}
					
					// Extrair enum
					const enumMatch = apiContent.match(/enum:\s*(\w+)/);
					if (enumMatch) {
						enumType = enumMatch[1];
					}
					
					// Verificar se é array
					if (apiContent.includes('isArray:') && apiContent.includes('true')) {
						isArray = true;
					}
				}

				// Determinar tipo
				let type = typeDef;
				
				// Verificar se é array ANTES de processar union types
				if (type.includes('[]')) {
					type = type.replace(/\s*\[\]\s*/g, '');
					isArray = true;
				}
				
				// Preservar union types literais (ex: 'asc' | 'desc')
				const literalUnionMatch = type.match(/^(['"]\w+['"]\s*\|\s*['"]\w+['"])+$/);
				if (literalUnionMatch) {
					// Manter union type literal
					type = type.trim();
				} else if (type.includes('|')) {
					// Para outros union types, pegar primeiro ou simplificar
					const parts = type.split('|').map(p => p.trim());
					// Se todos são do mesmo tipo básico, usar o tipo
					if (parts.every(p => ['string', 'number', 'boolean', 'null', 'undefined'].includes(p))) {
						type = parts[0];
					} else {
						// Pegar o primeiro tipo não-null/undefined
						type = parts.find(p => !['null', 'undefined'].includes(p)) || parts[0];
					}
				}
				
				// Limpar tipos complexos
				type = type.replace(/import\([^)]+\)\./g, '');
				type = type.replace(/Promise<([^>]+)>/g, '$1');
				type = type.replace(/Partial<([^>]+)>/g, '$1');
				type = type.replace(/Record<[^>]+>/g, 'object');
				type = type.trim();
				
				// Limpar valores padrão
				type = type.replace(/\s*=\s*[^,;]+$/, '').trim();

				properties.push({
					name: propName,
					type,
					optional,
					description,
					example,
					enum: enumType || undefined,
					isArray,
				});
				
				currentDecorators = '';
			} else {
				// Se não é propriedade, limpar decorators
				currentDecorators = '';
			}
		}

		// Determinar se é DTO ou Entity
		const isEntity = content.includes('@Entity') || filePath.includes('entities');
		const isDto = filePath.includes('dto') || className.includes('Dto') || className.includes('DTO');

		const module = extractModule(filePath);

		results.push({
			name: className,
			type: isEntity ? 'entity' : 'dto',
			properties,
			filePath: path.relative(SRC_DIR, filePath),
			module,
		});
	}

	return results;
}

function extractModule(filePath: string): string {
	const relativePath = path.relative(SRC_DIR, filePath);
	const parts = relativePath.split(path.sep);
	if (parts.length > 1 && parts[0] === 'modules') {
		return parts[1];
	}
	if (parts[0] === 'common') {
		return 'common';
	}
	return 'root';
}

// Função para encontrar todos os arquivos
function findFiles(dir: string, pattern: string): string[] {
	const files: string[] = [];
	
	if (!fs.existsSync(dir)) {
		return files;
	}
	
	const items = fs.readdirSync(dir);

	for (const item of items) {
		const fullPath = path.join(dir, item);
		const stat = fs.statSync(fullPath);

		if (stat.isDirectory() && !item.includes('node_modules') && !item.includes('dist') && !item.startsWith('.')) {
			files.push(...findFiles(fullPath, pattern));
		} else if (stat.isFile() && item.includes(pattern)) {
			files.push(fullPath);
		}
	}

	return files;
}

// Função para gerar markdown
function generateMarkdown(types: TypeDefinition[]): string {
	let md = '# Frontend Types Documentation\n\n';
	md += '> Este arquivo foi gerado automaticamente. Não edite manualmente.\n\n';
	md += 'Gerado em: ' + new Date().toISOString() + '\n\n';

	// Separar por tipo
	const enums = types.filter(t => t.type === 'enum');
	const dtos = types.filter(t => t.type === 'dto');
	const entities = types.filter(t => t.type === 'entity');

	// Enums
	if (enums.length > 0) {
		md += '## 📋 Enums\n\n';
		for (const enumDef of enums) {
			md += `### ${enumDef.name}\n\n`;
			md += `**Módulo:** \`${enumDef.module}\`  \n`;
			md += `**Arquivo:** \`${enumDef.filePath}\`\n\n`;
			md += '```typescript\n';
			md += `export enum ${enumDef.name} {\n`;
			for (const value of enumDef.enumValues || []) {
				md += `  ${value.name} = '${value.value}',\n`;
			}
			md += '}\n';
			md += '```\n\n';
			md += '**Valores:**\n\n';
			for (const value of enumDef.enumValues || []) {
				md += `- \`${value.name}\` = \`"${value.value}"\`\n`;
			}
			md += '\n---\n\n';
		}
	}

	// DTOs
	if (dtos.length > 0) {
		md += '## 📦 DTOs (Data Transfer Objects)\n\n';
		for (const dto of dtos) {
			md += `### ${dto.name}\n\n`;
			md += `**Módulo:** \`${dto.module}\`  \n`;
			md += `**Arquivo:** \`${dto.filePath}\`\n\n`;
			md += '```typescript\n';
			md += `export interface ${dto.name} {\n`;
			for (const prop of dto.properties) {
				const optional = prop.optional ? '?' : '';
				const array = prop.isArray ? '[]' : '';
				md += `  ${prop.name}${optional}: ${prop.type}${array};\n`;
			}
			md += '}\n';
			md += '```\n\n';

			if (dto.properties.length > 0) {
				md += '**Propriedades:**\n\n';
				md += '| Nome | Tipo | Obrigatório | Descrição |\n';
				md += '|------|------|-------------|----------|\n';
				for (const prop of dto.properties) {
					const required = prop.optional ? '❌' : '✅';
					const type = prop.isArray ? `${prop.type}[]` : prop.type;
					md += `| \`${prop.name}\` | \`${type}\` | ${required} | ${prop.example ? `Exemplo: \`${prop.example}\`` : '-'} |\n`;
				}
				md += '\n';
			}
			md += '---\n\n';
		}
	}

	// Entities
	if (entities.length > 0) {
		md += '## 🗄️ Entities (Models)\n\n';
		for (const entity of entities) {
			md += `### ${entity.name}\n\n`;
			md += `**Módulo:** \`${entity.module}\`  \n`;
			md += `**Arquivo:** \`${entity.filePath}\`\n\n`;
			md += '```typescript\n';
			md += `export interface ${entity.name} {\n`;
			for (const prop of entity.properties) {
				const optional = prop.optional ? '?' : '';
				const array = prop.isArray ? '[]' : '';
				md += `  ${prop.name}${optional}: ${prop.type}${array};\n`;
			}
			md += '}\n';
			md += '```\n\n';

			if (entity.properties.length > 0) {
				md += '**Propriedades:**\n\n';
				md += '| Nome | Tipo | Obrigatório | Descrição |\n';
				md += '|------|------|-------------|----------|\n';
				for (const prop of entity.properties) {
					const required = prop.optional ? '❌' : '✅';
					const type = prop.isArray ? `${prop.type}[]` : prop.type;
					md += `| \`${prop.name}\` | \`${type}\` | ${required} | ${prop.example ? `Exemplo: \`${prop.example}\`` : '-'} |\n`;
				}
				md += '\n';
			}
			md += '---\n\n';
		}
	}

	return md;
}

// Função principal
function main() {
	console.log('🔍 Procurando arquivos...');

	const enumFiles = findFiles(SRC_DIR, '.enum.ts');
	const dtoFiles = findFiles(SRC_DIR, '.dto.ts');
	const entityFiles = findFiles(SRC_DIR, '.entity.ts');

	console.log(`📋 Encontrados ${enumFiles.length} enums`);
	console.log(`📦 Encontrados ${dtoFiles.length} DTOs`);
	console.log(`🗄️  Encontrados ${entityFiles.length} entities`);

	const allTypes: TypeDefinition[] = [];

	// Processar enums
	for (const file of enumFiles) {
		const content = fs.readFileSync(file, 'utf-8');
		const enumDef = extractEnum(file, content);
		if (enumDef) {
			allTypes.push(enumDef);
		}
	}

	// Processar DTOs e Entities
	for (const file of [...dtoFiles, ...entityFiles]) {
		const content = fs.readFileSync(file, 'utf-8');
		const classes = extractClass(file, content);
		allTypes.push(...classes);
	}

	console.log(`✅ Total de ${allTypes.length} tipos encontrados`);

	// Gerar markdown
	const markdown = generateMarkdown(allTypes);

	// Salvar arquivo
	fs.writeFileSync(OUTPUT_FILE, markdown, 'utf-8');

	console.log(`📝 Documentação gerada em: ${OUTPUT_FILE}`);
}

main();

