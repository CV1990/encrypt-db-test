import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';

/** Hash de una sola vía (bcrypt con sal aleatoria) para contraseñas. */
@Injectable()
export class HashingService {
  private readonly rounds: number;

  constructor(config: ConfigService) {
    this.rounds = Number(config.get('BCRYPT_ROUNDS') ?? 12);
  }

  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.rounds);
  }

  compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
