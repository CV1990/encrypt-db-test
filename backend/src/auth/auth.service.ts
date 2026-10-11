import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { HashingService } from '../crypto/hashing.service';
import { PublicUser, UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

export interface JwtPayload {
  sub: string;
}

export interface LoginResult {
  accessToken: string;
  user: PublicUser;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly hashing: HashingService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<PublicUser> {
    const user = await this.usersService.create(dto);
    return this.usersService.toPublic(user);
  }

  async login({ email, password }: LoginDto): Promise<LoginResult> {
    const user = await this.usersService.findByEmail(email);
    // Mismo mensaje en ambos casos para no revelar qué correos existen
    if (!user || !(await this.hashing.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload: JwtPayload = { sub: user.id };
    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: this.usersService.toPublic(user),
    };
  }
}
