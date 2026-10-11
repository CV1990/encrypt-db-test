import { Body, Controller, Get, HttpCode, NotFoundException, Post, Req, UseGuards } from '@nestjs/common';
import { User } from '../users/user.entity';
import { PublicUser, StoredUser, UsersService } from '../users/users.service';
import { AuthenticatedRequest, AuthGuard } from './auth.guard';
import { AuthService, LoginResult } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto): Promise<PublicUser> {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto): Promise<LoginResult> {
    return this.authService.login(dto);
  }

  /** Datos del usuario autenticado, descifrados por el servidor. */
  @UseGuards(AuthGuard)
  @Get('me')
  async me(@Req() req: AuthenticatedRequest): Promise<PublicUser> {
    return this.usersService.toPublic(await this.currentUser(req));
  }

  /** Registro del usuario autenticado tal como está guardado (cifrado) en Postgres. */
  @UseGuards(AuthGuard)
  @Get('me/stored')
  async stored(@Req() req: AuthenticatedRequest): Promise<StoredUser> {
    return this.usersService.toStored(await this.currentUser(req));
  }

  private async currentUser(req: AuthenticatedRequest): Promise<User> {
    const user = await this.usersService.findById(req.user.sub);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }
}
