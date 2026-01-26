/**
 * Form validation utilities
 * Requirements: 3.5, 6.6
 */

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates password meets minimum requirements
 * Requirement 3.5: Password must be at least 6 characters
 * 
 * @param password - Password string to validate
 * @returns Validation result with error message if invalid
 */
export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return {
      valid: false,
      error: 'Password is required',
    };
  }

  if (password.length < 6) {
    return {
      valid: false,
      error: 'Password must be at least 6 characters',
    };
  }

  return { valid: true };
}

/**
 * Validates subdomain format and length
 * Requirement 6.6: Subdomain must be 3-30 characters, lowercase alphanumeric with hyphens
 * 
 * @param subdomain - Subdomain string to validate
 * @returns Validation result with error message if invalid
 */
export function validateSubdomain(subdomain: string): ValidationResult {
  if (!subdomain) {
    return {
      valid: false,
      error: 'Subdomain is required',
    };
  }

  if (subdomain.length < 3) {
    return {
      valid: false,
      error: 'Subdomain must be at least 3 characters',
    };
  }

  if (subdomain.length > 30) {
    return {
      valid: false,
      error: 'Subdomain must be less than 30 characters',
    };
  }

  // Check for valid characters (lowercase alphanumeric and hyphens only)
  if (!/^[a-z0-9-]+$/.test(subdomain)) {
    return {
      valid: false,
      error: 'Only lowercase letters, numbers, and hyphens allowed',
    };
  }

  // Check if starts or ends with hyphen
  if (subdomain.startsWith('-') || subdomain.endsWith('-')) {
    return {
      valid: false,
      error: 'Subdomain cannot start or end with a hyphen',
    };
  }

  return { valid: true };
}

/**
 * Validates shop name length
 * Requirement 6.6: Shop name must be 2-50 characters
 * 
 * @param shopName - Shop name string to validate
 * @returns Validation result with error message if invalid
 */
export function validateShopName(shopName: string): ValidationResult {
  if (!shopName) {
    return {
      valid: false,
      error: 'Shop name is required',
    };
  }

  const trimmedName = shopName.trim();

  if (trimmedName.length < 2) {
    return {
      valid: false,
      error: 'Shop name must be at least 2 characters',
    };
  }

  if (trimmedName.length > 50) {
    return {
      valid: false,
      error: 'Shop name must be less than 50 characters',
    };
  }

  return { valid: true };
}

/**
 * Reserved subdomains that cannot be used
 */
const RESERVED_SUBDOMAINS = [
  'www',
  'api',
  'admin',
  'app',
  'mail',
  'ftp',
  'localhost',
  'staging',
  'dev',
  'test',
  'demo',
  'portal',
  'backoffice',
  'onboarding',
  'auth',
  'login',
  'signup',
  'dashboard',
  'console',
  'support',
  'help',
  'docs',
  'blog',
  'status',
  'cdn',
  'static',
  'assets',
  'media',
  'images',
  'files',
];

/**
 * Checks if subdomain is reserved
 * 
 * @param subdomain - Subdomain to check
 * @returns True if subdomain is reserved
 */
export function isReservedSubdomain(subdomain: string): boolean {
  return RESERVED_SUBDOMAINS.includes(subdomain.toLowerCase());
}

/**
 * Validates subdomain including reserved check
 * 
 * @param subdomain - Subdomain string to validate
 * @returns Validation result with error message if invalid
 */
export function validateSubdomainWithReserved(subdomain: string): ValidationResult {
  // First run standard validation
  const standardValidation = validateSubdomain(subdomain);
  if (!standardValidation.valid) {
    return standardValidation;
  }

  // Check if reserved
  if (isReservedSubdomain(subdomain)) {
    return {
      valid: false,
      error: 'This subdomain is reserved and cannot be used',
    };
  }

  return { valid: true };
}
