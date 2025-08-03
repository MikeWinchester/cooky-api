import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../config/env';

class AuthService {
  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  generateToken(userId: string): string {
    return jwt.sign({ user_id: userId }, config.JWT_SECRET, {
      expiresIn: '30d',
    });
  }

  verifyToken(token: string): { user_id: string } {
    return jwt.verify(token, config.JWT_SECRET) as { user_id: string };
  }
}

export default new AuthService();