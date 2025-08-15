export interface BaseUser {
  user_id: string;
  email: string;
  name: string;
}

export interface UserProfile extends BaseUser {
  dietary_restrictions: string[];
  banned_ingredients: string[];
  favorite_ingredients: string[]; // NUEVO
  allergies: string[]; // NUEVO
  subscription_status: 'free' | 'trial' | 'premium';
  trial_end_date?: string;
  subscription_end_date?: string;
  created_at: string;
}

export interface AuthUser extends BaseUser {
  subscription_status: 'free' | 'trial' | 'premium';
  favorite_ingredients?: string[];
  allergies?: string[];
}

export interface RegisterUserDto {
  email: string;
  password: string;
  name: string;
  dietary_restrictions?: string[];
  banned_ingredients?: string[];
  favorite_ingredients?: string[];
  allergies?: string[];
}

export interface LoginUserDto {
  email: string;
  password: string;
}

export interface UpdateUserProfileDto {
  name?: string;
  dietary_restrictions?: string[];
  banned_ingredients?: string[];
  favorite_ingredients?: string[];
  allergies?: string[];
}

export interface AuthTokenPayload {
  user_id: string;
}