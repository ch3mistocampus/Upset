/**
 * Input Validation Utilities
 * Centralized validation logic for auth forms
 */

/**
 * Validate email format
 * @param email - Email address to validate
 * @returns Error message or null if valid
 */
export const validateEmail = (email: string): string | null => {
  const trimmed = email.trim();

  if (!trimmed) {
    return 'Email is required';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return 'Please enter a valid email address';
  }

  return null;
};

/**
 * Validate password strength
 * Requirements: Min 8 characters, at least 1 number
 * @param password - Password to validate
 * @returns Error message or null if valid
 */
export const validatePassword = (password: string): string | null => {
  if (!password) {
    return 'Password is required';
  }

  if (password.length < 8) {
    return 'Password must be at least 8 characters';
  }

  if (!/\d/.test(password)) {
    return 'Password must contain at least one number';
  }

  return null;
};

/**
 * Validate username format
 * Requirements: 3-30 characters, alphanumeric + underscore only
 * @param username - Username to validate
 * @returns Error message or null if valid
 */
export const validateUsername = (username: string): string | null => {
  const trimmed = username.trim();

  if (!trimmed) {
    return 'Username is required';
  }

  if (trimmed.length < 3) {
    return 'Username must be at least 3 characters';
  }

  if (trimmed.length > 30) {
    return 'Username must be 30 characters or less';
  }

  // Only allow alphanumeric and underscore
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return 'Username can only contain letters, numbers, and underscores';
  }

  return null;
};

/**
 * Check if input looks like an email (contains @)
 * Used for smart detection in sign-in
 * @param input - User input
 * @returns true if input appears to be an email
 */
export const isEmail = (input: string): boolean => {
  return input.includes('@');
};

/**
 * Get user-friendly error message from Supabase auth error
 * @param error - Error object from Supabase
 * @returns Human-readable error message
 */
export const getAuthErrorMessage = (error: unknown): string => {
  const errorObj = error as { code?: string; message?: string } | null;
  const code = errorObj?.code || errorObj?.message;

  // Map common Supabase error codes to user-friendly messages
  const errorMessages: Record<string, string> = {
    'user_already_exists': 'An account with this email already exists',
    'invalid_credentials': 'Invalid email or password',
    'email_not_confirmed': 'Please confirm your email before signing in',
    'weak_password': 'Password must be at least 8 characters with 1 number',
    'invalid_grant': 'Invalid email or password',
    'email_exists': 'An account with this email already exists',
    'over_email_send_rate_limit': 'Too many requests. Please try again later',
    'user_not_found': 'No account found with this email',
  };

  // Check if we have a mapped message
  if (code && errorMessages[code]) {
    return errorMessages[code];
  }

  // Check if error message contains known patterns
  if (typeof code === 'string') {
    if (code.toLowerCase().includes('already registered')) {
      return 'An account with this email already exists';
    }
    if (code.toLowerCase().includes('invalid login')) {
      return 'Invalid email or password';
    }
    if (code.toLowerCase().includes('email not confirmed')) {
      return 'Please confirm your email before signing in';
    }
  }

  // Fall back to error message or generic message
  return error?.message || 'An error occurred. Please try again.';
};
