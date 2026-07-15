import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const data = await this.authService.register({
      email: dto.email,
      password: dto.password,
      displayName: dto.display_name,
    });
    return { data };
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const data = await this.authService.login(dto.email, dto.password);
    return { data };
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshDto) {
    const data = await this.authService.refresh(dto.refresh_token);
    return { data };
  }

  @Post('logout')
  logout() {
    return { data: { ok: true } };
  }
}
