
const isLocal = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const API_BASE = isLocal 
  ? 'http://127.0.0.1:5002/api' 
  : 'https://oms-media-backend.vercel.app/api';

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{
  success: boolean;
  data?: T;
  message?: string;
  errors?: any;
}> {
  try {
    const token = localStorage.getItem('oms_media_token');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string>),
    };

    const normalizedEndpoint = endpoint.startsWith('/')
      ? endpoint
      : `/${endpoint}`;

    const res = await fetch(
      `${API_BASE}${normalizedEndpoint}`,
      {
        ...options,
        headers,
      }
    );

    const contentType = res.headers.get('content-type') || '';

    if (!contentType.includes('application/json')) {
      throw new Error(
        `API returned non-JSON response. Status: ${res.status}`
      );
    }

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        message: data.message || `HTTP Error: ${res.status}`,
        errors: data.errors,
      };
    }

    return data;
  } catch (error: any) {
    console.error('OMS API Error:', error);

    return {
      success: false,
      message:
        error.message ||
        'تعذر الاتصال بخادم قسم الميديا',
    };
  }
}
