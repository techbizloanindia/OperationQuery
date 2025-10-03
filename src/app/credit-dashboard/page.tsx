'use client';

import React, { useEffect, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import CreditDashboard from '@/components/credit/CreditDashboard';

// Create a client with robust error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      staleTime: 0, // Always consider data stale for real-time updates
      retry: (failureCount, error) => {
        // Don't retry for 4xx errors
        if (error && typeof error === 'object' && 'status' in error) {
          const status = (error as any).status;
          if (status >= 400 && status < 500) return false;
        }
        return failureCount < 3;
      },
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: false, // Don't retry mutations
    },
  },
});

// Loading component
function CreditDashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-lg font-semibold text-gray-700">Loading Credit Dashboard...</h2>
        <p className="text-sm text-gray-500">Please wait while we load your data</p>
      </div>
    </div>
  );
}

// Error boundary component
function CreditDashboardError({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm border p-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Credit Dashboard</h3>
          <p className="text-sm text-gray-500 mb-4">{error.message}</p>
          <div className="space-y-2">
            <button
              onClick={retry}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.href = '/login'}
              className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CreditDashboardPage() {
  const [hasError, setHasError] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  // Initialize real-time services when page loads
  useEffect(() => {
    const unsubscribeServices: (() => void)[] = [];

    const initializeServices = async () => {
      try {
        // Import and initialize query update service with error handling
        const { queryUpdateService } = await import('@/lib/queryUpdateService').catch(err => {
          console.warn('⚠️ Credit Page: Query update service not available:', err.message);
          return { queryUpdateService: null };
        });
        
        if (queryUpdateService) {
          queryUpdateService.initialize();
          console.log('🌐 Credit Page: Initialized query update service');
        }
        
        // Import and initialize query sync service with error handling
        const { querySyncService } = await import('@/lib/querySyncService').catch(err => {
          console.warn('⚠️ Credit Page: Query sync service not available:', err.message);
          return { querySyncService: null };
        });
        
        if (querySyncService) {
          // Start auto-sync for credit team
          const intervalId = querySyncService.startAutoSync('credit', 1);
          console.log('🔄 Credit Page: Started auto-sync for credit team');
          
          unsubscribeServices.push(() => {
            clearInterval(intervalId);
          });
        }
      } catch (err) {
        console.error('❌ Credit Page: Failed to initialize services:', err);
        // Don't break the entire page for service initialization failures
      }
    };

    initializeServices();

    // Cleanup on unmount
    return () => {
      unsubscribeServices.forEach(cleanup => cleanup());
    };
  }, []);

  // Error boundary effect
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('🚨 Credit Dashboard Error:', event.error);
      setError(event.error);
      setHasError(true);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError && error) {
    return <CreditDashboardError error={error} retry={() => { setHasError(false); setError(null); }} />;
  }

  return (
    <ProtectedRoute allowedRoles={['credit']}>
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<CreditDashboardLoading />}>
          <CreditDashboard />
        </Suspense>
        {process.env.NODE_ENV === 'development' && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </QueryClientProvider>
    </ProtectedRoute>
  );
} 