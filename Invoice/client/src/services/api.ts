const isLocal = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const API_BASE = isLocal 
  ? 'http://127.0.0.1:5001/api' 
  : 'https://oms-invoice-api-two.vercel.app/api';

export const getAuthToken = (): string | null => {
  return localStorage.getItem('oms_token');
};

export const setAuthToken = (token: string): void => {
  localStorage.setItem('oms_token', token);
};

export const clearAuthToken = (): void => {
  localStorage.removeItem('oms_token');
  localStorage.removeItem('oms_user');
};

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; message?: string; errors?: any }> {
  const token = getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await res.json();
    if (!res.ok) {
      if (res.status === 401) {
        clearAuthToken();
        if (!window.location.pathname.endsWith('/login')) {
          window.location.href = '/OMS/invoice/login';
        }
      }
      return {
        success: false,
        message: data.message || 'حدث خطأ في الخادم',
        errors: data.errors,
      };
    }
    return data;
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'تعذر الاتصال بالخادم. يرجى التأكد من تشغيل الـ Backend',
    };
  }
}
