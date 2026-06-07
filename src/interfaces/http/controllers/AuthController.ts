import type { Request, Response } from 'express';
import {
  Authorized,
  Body,
  CurrentUser,
  Get,
  HttpCode,
  JsonController,
  Post,
  Req,
  Res,
} from 'routing-controllers';
import { injectable } from 'tsyringe';
import { SignUp } from '../../../application/use-cases/auth/SignUp.js';
import { SignIn } from '../../../application/use-cases/auth/SignIn.js';
import { RefreshTokens } from '../../../application/use-cases/auth/RefreshTokens.js';
import { SignOut } from '../../../application/use-cases/auth/SignOut.js';
import { GetCurrentUser } from '../../../application/use-cases/auth/GetCurrentUser.js';
import type { AuthUser } from '../../../application/auth/AuthUser.js';
import { validate } from '../../../application/dtos/validate.js';
import { signInSchema, signUpSchema, refreshSchema } from '../../../application/dtos/schemas.js';
import { UnauthorizedError } from '../../../domain/errors/index.js';
import {
  clearRefreshCookie,
  readRefreshToken,
  requestMeta,
  setRefreshCookie,
} from '../http-helpers.js';

@injectable()
@JsonController('/auth')
export class AuthController {
  public constructor(
    private readonly signUpUc: SignUp,
    private readonly signInUc: SignIn,
    private readonly refreshUc: RefreshTokens,
    private readonly signOutUc: SignOut,
    private readonly currentUserUc: GetCurrentUser,
  ) {}

  @Post('/signup')
  public async signup(@Body() body: unknown, @Req() req: Request, @Res() res: Response): Promise<Response> {
    const dto = validate(signUpSchema, body);
    const meta = requestMeta(req);
    const result = await this.signUpUc.execute({ ...dto, ...meta });
    setRefreshCookie(res, result.refreshToken, result.refreshExpiresAt);
    return res.status(201).json({
      accessToken: result.accessToken,
      user: result.user,
      restaurant: result.restaurant,
    });
  }

  @Post('/login')
  public async login(@Body() body: unknown, @Req() req: Request, @Res() res: Response): Promise<Response> {
    const dto = validate(signInSchema, body);
    const meta = requestMeta(req);
    const result = await this.signInUc.execute({ ...dto, ...meta });
    setRefreshCookie(res, result.refreshToken, result.refreshExpiresAt);
    return res.status(200).json({ accessToken: result.accessToken, user: result.user });
  }

  @Post('/refresh')
  public async refresh(@Body() body: unknown, @Req() req: Request, @Res() res: Response): Promise<Response> {
    const parsed = validate(refreshSchema, body ?? {});
    const token = readRefreshToken(req, parsed.refreshToken);
    if (!token) {
      throw new UnauthorizedError('Missing refresh token');
    }
    const meta = requestMeta(req);
    const result = await this.refreshUc.execute({ refreshToken: token, ...meta });
    setRefreshCookie(res, result.refreshToken, result.refreshExpiresAt);
    return res.status(200).json({ accessToken: result.accessToken });
  }

  @Post('/logout')
  @Authorized()
  @HttpCode(204)
  public async logout(@Body() body: unknown, @Req() req: Request, @Res() res: Response): Promise<Response> {
    const parsed = validate(refreshSchema, body ?? {});
    const token = readRefreshToken(req, parsed.refreshToken);
    await this.signOutUc.execute(token);
    clearRefreshCookie(res);
    return res.status(204).send();
  }

  @Get('/me')
  @Authorized()
  public async me(@CurrentUser() user: AuthUser): Promise<unknown> {
    return this.currentUserUc.execute(user.id, user.role);
  }
}
