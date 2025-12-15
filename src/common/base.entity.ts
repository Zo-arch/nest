import {
	PrimaryGeneratedColumn,
	CreateDateColumn,
	UpdateDateColumn,
	VersionColumn
} from 'typeorm';

export abstract class BaseEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@VersionColumn()
	version: number;

	@CreateDateColumn({ name: 'created_date' })
	createdDate: Date;

	@UpdateDateColumn({ name: 'last_modified_date' })
	lastModifiedDate: Date;
}