import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { JwtPayload } from '../strategies/jwt.strategy';

export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{
      user: JwtPayload;
    }>();

    const user = request.user;

    return data ? user?.[data] : user;
  },
);
