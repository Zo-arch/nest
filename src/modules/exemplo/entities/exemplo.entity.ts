import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { ExemploEnum } from '../../../common/enum/exemplo.enum';
import { ApiProperty } from '@nestjs/swagger';

@Entity('exemplo')
export class Exemplo extends BaseEntity {
	@ApiProperty({ example: ExemploEnum.TIPO_A })
	@Column({
		type: 'enum',
		enum: ExemploEnum,
		name: 'enum_type'
	})
	enumType: ExemploEnum;

	@ApiProperty({ example: 'Exemplo de descrição' })
	@Column({ length: 255 })
	descricao: string;

	@ApiProperty({ example: 199.9 })
	@Column({ type: 'decimal', precision: 10, scale: 2 })
	valor: number;

	@ApiProperty({ example: '2025-01-31' })
	@Column({ name: 'data_exemplo', type: 'date' })
	dataExemplo: Date;

	@ApiProperty({ example: true })
	@Column()
	ativo: boolean;
}