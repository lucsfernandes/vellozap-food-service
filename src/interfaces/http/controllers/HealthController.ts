import { Get, JsonController } from 'routing-controllers';
import { injectable } from 'tsyringe';

@injectable()
@JsonController('/health')
export class HealthController {
  @Get('/')
  public health(): { status: 'ok'; timestamp: string } {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
