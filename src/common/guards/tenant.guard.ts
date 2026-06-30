import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../../modules/users/user.schema'; 
import { Company, CompanyDocument } from '../../modules/companies/company.schema';

/**
 * TenantGuard resolves the current user and company from request headers.
 *
 * In production this would be a JWT. For this exercise we use two simple headers:
 *   X-User-Id: <mongoId>
 *   (company is derived from the user record)
 *
 * Attaches req.user and req.company for downstream use.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const userId = req.headers['x-user-id'];

    if (!userId || !Types.ObjectId.isValid(userId)) {
      throw new UnauthorizedException('Missing or invalid X-User-Id header');
    }

    const user = await this.userModel.findOne({ _id: userId, isActive: true });
    if (!user) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const company = await this.companyModel.findOne({
      _id: user.companyId,
      isActive: true,
    });
    if (!company) {
      throw new ForbiddenException('Company not found or inactive');
    }

    // Attach to request for controllers/services to use
    req.user = user;
    req.company = company;

    return true;
  }
}
