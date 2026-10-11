import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { EncryptionService } from '../crypto/encryption.service';
import { HashingService } from '../crypto/hashing.service';
import { User } from './user.entity';

const PG_UNIQUE_VIOLATION = '23505';

export interface CreateUserInput {
  fullName: string;
  email: string;
  password: string;
}

export interface PublicUser {
  id: string;
  fullName: string;
  email: string;
  createdAt: Date;
}

export interface StoredUser {
  id: string;
  emailHash: string;
  emailEncrypted: string;
  fullNameEncrypted: string;
  passwordHash: string;
  createdAt: Date;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly encryption: EncryptionService,
    private readonly hashing: HashingService,
  ) {}

  async create({ fullName, email, password }: CreateUserInput): Promise<User> {
    const emailHash = this.encryption.blindIndex(email);
    if (await this.users.findOne({ where: { emailHash } })) {
      throw new ConflictException('El correo ya está registrado');
    }

    const user = this.users.create({
      emailHash,
      emailEncrypted: this.encryption.encrypt(email.trim().toLowerCase()),
      fullNameEncrypted: this.encryption.encrypt(fullName.trim()),
      passwordHash: await this.hashing.hash(password),
    });

    try {
      return await this.users.save(user);
    } catch (error) {
      // Dos registros simultáneos con el mismo email
      if (error instanceof QueryFailedError && (error.driverError as { code?: string })?.code === PG_UNIQUE_VIOLATION) {
        throw new ConflictException('El correo ya está registrado');
      }
      throw error;
    }
  }

  findByEmail(email: string): Promise<User | null> {
    return this.users.findOne({ where: { emailHash: this.encryption.blindIndex(email) } });
  }

  findById(id: string): Promise<User | null> {
    return this.users.findOne({ where: { id } });
  }

  toPublic(user: User): PublicUser {
    return {
      id: user.id,
      fullName: this.encryption.decrypt(user.fullNameEncrypted),
      email: this.encryption.decrypt(user.emailEncrypted),
      createdAt: user.createdAt,
    };
  }

  /** Registro tal como está guardado en la base de datos (para verificar el cifrado). */
  toStored(user: User): StoredUser {
    return {
      id: user.id,
      emailHash: user.emailHash,
      emailEncrypted: user.emailEncrypted,
      fullNameEncrypted: user.fullNameEncrypted,
      passwordHash: user.passwordHash,
      createdAt: user.createdAt,
    };
  }
}
