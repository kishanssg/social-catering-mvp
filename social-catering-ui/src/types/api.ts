export interface User {
  id: number
  email: string
  role: string
}

export interface LoginResponse {
  status: 'success'
  data: {
    user: User
  }
}

export interface ApiError {
  error: string
  status: 'error'
}
