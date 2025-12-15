import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { VerificationStatus } from '../../../common/enums';

@Injectable()
export class VerifiedUserGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const { user } = context.switchToHttp().getRequest();

        if (!user) {
            throw new ForbiddenException('User not authenticated');
        }

        if (user.verificationStatus !== VerificationStatus.VERIFIED) {
            throw new ForbiddenException('User must be verified to perform this action');
        }

        return true;
    }
}
