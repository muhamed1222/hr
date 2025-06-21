// Общие типы
export interface User {
  id: number;
  email: string;
  name: string;
  role: 'user' | 'admin';
  status: 'active' | 'inactive';
  telegramId?: string;
  settings?: Record<string, any>;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkLog {
  id: number;
  userId: number;
  date: string;
  hours: number;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: number;
  name: string;
  description?: string;
  leaderId?: number;
  members: User[];
  createdAt: string;
  updatedAt: string;
}

// Типы для компонентов
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children?: React.ReactNode;
}

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

export interface InputProps {
  type?: string;
  value: string | number;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

// Типы для API
export interface ApiResponse<T> {
  data: T;
  status: 'success' | 'error';
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// Типы для форм
export interface UserFormData {
  email: string;
  name: string;
  password?: string;
  role?: 'user' | 'admin';
  status?: 'active' | 'inactive';
  telegramId?: string;
  settings?: Record<string, any>;
}

export interface WorkLogFormData {
  date: string;
  hours: number;
  description: string;
  status?: 'pending' | 'approved' | 'rejected';
}

// Типы для состояния приложения
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface UIState {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  }>;
}

// Типы для Telegram
export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

export interface TelegramWebAppUser {
  id: number;
  is_bot?: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

// Типы для аналитики
export interface AnalyticsData {
  totalUsers: number;
  activeUsers: number;
  totalWorkLogs: number;
  averageHours: number;
  topEmployees: Array<{
    userId: number;
    name: string;
    totalHours: number;
    efficiency: number;
  }>;
  workDistribution: Array<{
    date: string;
    hours: number;
    users: number;
  }>;
} 