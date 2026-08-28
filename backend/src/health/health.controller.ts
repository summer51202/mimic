import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  getHealth() {
    return { data: this.healthService.liveness() };
  }

  @Get('live')
  getLiveness() {
    return { data: this.healthService.liveness() };
  }

  @Get('ready')
  async getReadiness() {
    return { data: await this.healthService.readiness() };
  }
}
