/** Domain model mirroring `user_accounts` (own auth, replaces Supabase Auth). */
export interface UserAccount {
  id: string;
  email: string;
  passwordHash: string | null;
  displayName: string | null;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewUserAccount {
  id?: string;
  email: string;
  passwordHash?: string | null;
  displayName?: string | null;
}

/** Domain model mirroring `auth_identities` (pluggable social/password identities). */
export interface AuthIdentity {
  id: string;
  userId: string;
  provider: 'password' | 'google';
  providerSubject: string;
  createdAt: Date;
}
