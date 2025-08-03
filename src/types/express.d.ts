import { UserProfile } from '../interfaces/auth.interface';

declare global {
  namespace Express {
    interface Request {
      user?: UserProfile;
    }
  }
}

export {};