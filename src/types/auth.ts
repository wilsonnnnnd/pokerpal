export enum AuthProvider {
    GOOGLE = 'google.com',
    APPLE = 'apple.com',
    ANONYMOUS = 'anonymous',
    EMAIL = 'password',
}

export interface EmailConflictError {
    type: 'EMAIL_CONFLICT';
    email: string;
    existingProvider: string;
    currentProvider: string;
}

export type User = {
    uid: string;
    email?: string | null;
    displayName?: string | null;
    photoURL?: string | null;
    isAnonymous?: boolean;
    provider?: string;
    role?: string;
};

export interface AuthResult {
    success: boolean;
    user?: User;
    error?: string;
    conflictError?: EmailConflictError;
}

export interface UserProfile extends User { }
