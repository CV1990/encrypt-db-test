import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(100)
  fullName: string;

  @IsEmail({}, { message: 'El correo no es válido' })
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72, { message: 'La contraseña no puede superar 72 caracteres' }) // límite de bcrypt
  @Matches(/(?=.*[A-Za-z])(?=.*\d)/, { message: 'La contraseña debe contener letras y números' })
  password: string;
}
