import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Ningún dato personal se guarda en claro:
 * - email_hash: HMAC-SHA256 del email (una sola vía) para buscar y garantizar unicidad.
 * - email_encrypted / full_name_encrypted: AES-256-GCM (reversible con la clave del servidor).
 * - password_hash: bcrypt (una sola vía).
 */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'email_hash', type: 'char', length: 64, unique: true })
  emailHash: string;

  @Column({ name: 'email_encrypted', type: 'text' })
  emailEncrypted: string;

  @Column({ name: 'full_name_encrypted', type: 'text' })
  fullNameEncrypted: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 100 })
  passwordHash: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
