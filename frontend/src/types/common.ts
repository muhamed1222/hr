export interface BaseProps {
  className?: string;
  style?: React.CSSProperties;
}

export interface WithChildren {
  children: React.ReactNode;
}

export type Status = 'idle' | 'loading' | 'success' | 'error';

export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
} 