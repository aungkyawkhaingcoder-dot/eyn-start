export interface CustomError extends Error {
  status?: number;
  code?: string;
}
// Request body schemas for auth controllers
export interface RegisterUserRequestBody {
  phone: string;
}

export interface VerifyOtpRequestBody {
  phone: string;
  otp: string;
  token: string;
}

export interface ConfirmPasswordRequestBody {
  password: string;
  phone:string;
  token:string
}

export interface LoginRequestBody {
  phone: string;
  password: string;
}

// Response body schemas for auth controllers
export interface RegisterUserResponseBody {
  message: string;
  phone: string;
  token: string;
}

export interface VerifyOtpResponseBody {
  message: string;
  phone: string;
  verifyToken: string;
}

export interface ConfirmPasswordResponseBody {
  message: string;
}

export interface LoginResponseBody {
  message: string;
  token?: string;
  id: number | string
  user?: {
    id: number;
    phone: string;
  };
}

// Generic success response
export interface SuccessResponse<T = unknown> {
  message: string;
  data?: T;
}
