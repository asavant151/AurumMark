import { ICompany } from '../models/Company.js';
import { ICompanyMembership, UserRole } from '../models/CompanyMembership.js';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        companyId: string;
        role: UserRole;
        membershipId: string;
      };
      company?: ICompany;
      membership?: ICompanyMembership;
    }
  }
}

export {};
