export class EmailAlreadyExistsError extends Error {
  constructor(message = 'A user with this email already exists.') {
    super(message);
    this.name = 'EmailAlreadyExistsError';
  }
}
