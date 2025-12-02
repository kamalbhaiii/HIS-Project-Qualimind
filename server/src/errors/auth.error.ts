export class EmailAlreadyExistsError extends Error {
  constructor(message = 'A user with this email already exists.') {
    super(message);
    this.name = 'EmailAlreadyExistsError';
  }
}
export class AccountNotVerifiedError extends Error {
  constructor() {
    super('A user with this email already exists. Please verify your account using the link sent on your email.');
    this.name = 'AccountNotVerifiedError';
  }
}
export class InvalidOrExpiredVerificationTokenError extends Error {
  constructor() {
    super('INVALID_OR_EXPIRED_VERIFICATION_TOKEN');
    this.name = 'InvalidOrExpiredVerificationTokenError';
  }
}

export class UserNotFoundError extends Error {
  constructor() {
    super('USER_NOT_FOUND');
    this.name = 'UserNotFoundError';
  }
}

export class UserAlreadyVerifiedError extends Error {
  constructor() {
    super('User account is already verified.');
    this.name = 'UserAlreadyVerifiedError';
  }
}

export class GoogleAccountNotAllowedError extends Error {
  constructor() {
    super('Operation not allowed for Google sign-in accounts');
    this.name = 'GoogleAccountNotAllowedError';
  }
}

export class InvalidPasswordError extends Error {
  constructor() {
    super('INVALID_PASSWORD');
    this.name = 'InvalidPasswordError';
  }
}