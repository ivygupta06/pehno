export type StylePersona = 
  | 'minimalist' 
  | 'streetwear' 
  | 'romantic' 
  | 'preppy' 
  | 'casual' 
  | 'chic';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  persona: StylePersona;
  createdAt: number;
}

export interface AuthSession {
  user: User | null;
  isAuthenticated: boolean;
}
