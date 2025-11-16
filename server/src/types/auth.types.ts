export interface SignupRequestDTO {
  email: string;
  password: string;
  name?: string;
}

export interface SignupResponseDTO {
  id: string;
  email: string;
  name?: string | null;
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
}
