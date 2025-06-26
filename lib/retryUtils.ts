import React from 'react';

interface RetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoff?: 'linear' | 'exponential';
  onRetry?: (attempt: number, error: Error) => void;
}

export class NetworkError extends Error {
  constructor(
    message: string,
    public status?: number,
    public isRetryable: boolean = true
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}

export const isNetworkError = (error: any): boolean => {
  return (
    error instanceof TypeError ||
    error.message?.includes('fetch') ||
    error.message?.includes('network') ||
    error.name === 'NetworkError'
  );
};

export const isRetryableError = (error: any): boolean => {
  if (error instanceof NetworkError) {
    return error.isRetryable;
  }
  
  // GitHub API specific error handling
  if (error.status) {
    // 5xx errors are generally retryable
    if (error.status >= 500) return true;
    
    // Rate limiting (403) and timeout (408) are retryable
    if ([403, 408, 429].includes(error.status)) return true;
    
    // Authentication errors (401, 404) are not retryable
    if ([401, 404].includes(error.status)) return false;
  }
  
  return isNetworkError(error);
};

export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const calculateDelay = (
  attempt: number, 
  baseDelay: number, 
  backoff: 'linear' | 'exponential'
): number => {
  switch (backoff) {
    case 'exponential':
      return baseDelay * Math.pow(2, attempt - 1);
    case 'linear':
    default:
      return baseDelay * attempt;
  }
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delay: baseDelay = 1000,
    backoff = 'exponential',
    onRetry
  } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry if it's the last attempt or error is not retryable
      if (attempt === maxAttempts || !isRetryableError(error)) {
        throw error;
      }

      // Call retry callback if provided
      if (onRetry) {
        onRetry(attempt, lastError);
      }

      // Wait before retrying
      const waitTime = calculateDelay(attempt, baseDelay, backoff);
      await delay(waitTime);
    }
  }

  throw lastError!;
}

// Enhanced GitHub API wrapper with retry logic
export const githubApiWithRetry = async (
  url: string,
  options: RequestInit = {},
  retryOptions?: RetryOptions
): Promise<Response> => {
  return withRetry(async () => {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorMessage = `GitHub API Error: ${response.status} ${response.statusText}`;
      
      // Determine if error is retryable based on status
      const isRetryable = response.status >= 500 || 
                         response.status === 403 || // Rate limiting
                         response.status === 408 || // Timeout
                         response.status === 429;   // Too many requests
      
      throw new NetworkError(errorMessage, response.status, isRetryable);
    }
    
    return response;
  }, retryOptions);
};

// Utility function to wrap any async function with error handling
export const withErrorHandling = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  errorHandler?: (error: Error) => void
) => {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      const err = error as Error;
      
      // Log error for debugging
      console.error(`Error in ${fn.name}:`, err);
      
      // Call custom error handler if provided
      if (errorHandler) {
        errorHandler(err);
      }
      
      // Re-throw the error
      throw err;
    }
  };
};

// Connection status utility
export class ConnectionMonitor {
  private static instance: ConnectionMonitor;
  private listeners: Set<(isOnline: boolean) => void> = new Set();
  
  private constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.notifyListeners(true));
      window.addEventListener('offline', () => this.notifyListeners(false));
    }
  }
  
  static getInstance(): ConnectionMonitor {
    if (!ConnectionMonitor.instance) {
      ConnectionMonitor.instance = new ConnectionMonitor();
    }
    return ConnectionMonitor.instance;
  }
  
  get isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }
  
  addListener(callback: (isOnline: boolean) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
  
  private notifyListeners(isOnline: boolean): void {
    this.listeners.forEach(callback => callback(isOnline));
  }
}

// React hook for connection status
export const useConnectionStatus = () => {
  const [isOnline, setIsOnline] = React.useState(true);
  
  React.useEffect(() => {
    const monitor = ConnectionMonitor.getInstance();
    setIsOnline(monitor.isOnline);
    
    const unsubscribe = monitor.addListener(setIsOnline);
    return unsubscribe;
  }, []);
  
  return isOnline;
}; 