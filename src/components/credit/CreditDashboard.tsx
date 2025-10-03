'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// Dynamic imports for better error handling
const CreditNavbar = React.lazy(() => import('./CreditNavbar').catch(err => {
  console.error('Failed to load CreditNavbar:', err);
  return { default: () => <div className="h-16 bg-white border-b" /> };
}));

const CreditSidebar = React.lazy(() => import('./CreditSidebar').catch(err => {
  console.error('Failed to load CreditSidebar:', err);
  return { default: () => <div className="hidden md:flex w-64 bg-gray-900" /> };
}));

const CreditQueriesRaised = React.lazy(() => import('./CreditQueriesRaised').catch(err => {
  console.error('Failed to load CreditQueriesRaised:', err);
  return { default: () => (
    <div className="p-6 bg-white rounded-lg shadow-sm border">
      <h3 className="text-lg font-medium text-gray-900 mb-2">Credit Queries</h3>
      <p className="text-gray-500">Loading queries component...</p>
    </div>
  )};
}));

const CreditQueriesResolved = React.lazy(() => import('./CreditQueriesResolved').catch(err => {
  console.error('Failed to load CreditQueriesResolved:', err);
  return { default: () => (
    <div className="p-6 bg-white rounded-lg shadow-sm border">
      <h3 className="text-lg font-medium text-gray-900 mb-2">Resolved Queries</h3>
      <p className="text-gray-500">Loading resolved queries component...</p>
    </div>
  )};
}));

const QueriesByAppNo = React.lazy(() => import('@/components/shared/QueriesByAppNo').catch(err => {
  console.error('Failed to load QueriesByAppNo:', err);
  return { default: () => (
    <div className="p-6 bg-white rounded-lg shadow-sm border">
      <h3 className="text-lg font-medium text-gray-900 mb-2">Application Queries</h3>
      <p className="text-gray-500">Loading application queries component...</p>
    </div>
  )};
}));

export type CreditTabType = 'queries-raised' | 'queries-resolved';

interface CreditDashboardError {
  message: string;
  component?: string;
}

export default function CreditDashboard() {
  const [activeTab, setActiveTab] = useState<CreditTabType>('queries-raised');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [newQueriesCount, setNewQueriesCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [assignedBranches, setAssignedBranches] = useState<string[]>([]);
  const [searchAppNo, setSearchAppNo] = useState<string>(''); // App number search
  const [filterByAppNo, setFilterByAppNo] = useState<string>(''); // Active filter
  const [dashboardError, setDashboardError] = useState<CreditDashboardError | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { user } = useAuth();

  // Helper function to get user's assigned branches with enhanced validation
  const getUserBranches = useCallback((user: any) => {
    if (!user) return [];
    
    try {
      // Priority: assignedBranches > branch > branchCode
      if (user.assignedBranches && Array.isArray(user.assignedBranches) && user.assignedBranches.length > 0) {
        console.log('🏢 Credit User assigned branches:', user.assignedBranches);
        return user.assignedBranches;
      }
      
      const branches = [];
      if (user.branch && typeof user.branch === 'string') branches.push(user.branch);
      if (user.branchCode && typeof user.branchCode === 'string' && user.branchCode !== user.branch) {
        branches.push(user.branchCode);
      }
      
      const filteredBranches = branches.filter(Boolean);
      console.log('🏢 Credit User detected branches:', filteredBranches);
      return filteredBranches;
    } catch (error) {
      console.error('❌ Error getting user branches:', error);
      return [];
    }
  }, []);

  // Enhanced fetch query statistics with app number filtering and error handling
  const fetchQueryStats = useCallback(async (appNoFilter?: string) => {
    try {
      setDashboardError(null);
      const userBranches = getUserBranches(user);
      const branchParam = userBranches.length > 0 ? `&branches=${userBranches.join(',')}` : '';
      const appNoParam = appNoFilter ? `&appNo=${encodeURIComponent(appNoFilter)}` : '';
      
      const response = await fetch(`/api/queries?team=credit&stats=true&includeBoth=true${branchParam}${appNoParam}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setNewQueriesCount(result.data?.pending || 0);
        console.log(`📊 Credit Query Stats - Pending: ${result.data?.pending}, Resolved: ${result.data?.resolved}, Total: ${result.data?.total}`);
      } else {
        console.warn('⚠️ API returned unsuccessful result:', result.message);
        setDashboardError({ message: result.message || 'Failed to fetch query stats' });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error fetching query stats';
      console.error('❌ Error fetching query stats:', error);
      setDashboardError({ message: errorMsg, component: 'query-stats' });
    }
  }, [user, getUserBranches]);

  // Fetch assigned branches with error handling
  const fetchAssignedBranches = useCallback(async () => {
    try {
      const response = await fetch('/api/branches?isActive=true', {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success && Array.isArray(result.data)) {
        const branchNames = result.data
          .filter((branch: any) => branch && branch.branchName)
          .map((branch: any) => branch.branchName);
        setAssignedBranches(branchNames);
        console.log('🏢 Fetched branches:', branchNames);
      } else {
        console.warn('⚠️ No branches data available');
        setAssignedBranches([]);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error fetching branches';
      console.error('❌ Error fetching branches:', error);
      setDashboardError({ message: errorMsg, component: 'branches' });
      setAssignedBranches([]);
    }
  }, []);

  // Initial load with comprehensive error handling
  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        setIsLoading(true);
        setDashboardError(null);
        
        // Load initial data
        await Promise.all([
          fetchQueryStats(),
          fetchAssignedBranches()
        ]);
        
        // Initialize real-time updates with error handling
        if (typeof window !== 'undefined') {
          try {
            const { queryUpdateService } = await import('@/lib/queryUpdateService').catch(() => ({
              queryUpdateService: null
            }));
            
            if (queryUpdateService) {
              queryUpdateService.initialize();

              // Subscribe to real-time updates for credit team
              const unsubscribe = queryUpdateService.subscribe('credit', (update) => {
                console.log('📨 Credit Dashboard received query update:', update.appNo, update.action);

                // Refresh stats when we receive updates
                fetchQueryStats(filterByAppNo || undefined);

                // Force refresh of the active tab
                setRefreshTrigger(prev => prev + 1);
              });

              console.log('🌐 Credit Dashboard: Initialized real-time updates');

              // Store cleanup function
              return () => {
                unsubscribe();
              };
            }
          } catch (serviceError) {
            console.warn('⚠️ Real-time services unavailable:', serviceError);
            // Continue without real-time updates
          }
        }
      } catch (error) {
        console.error('❌ Failed to initialize credit dashboard:', error);
        setDashboardError({
          message: error instanceof Error ? error.message : 'Failed to initialize dashboard',
          component: 'initialization'
        });
      } finally {
        setIsLoading(false);
      }
    };

    const cleanup = initializeDashboard();
    
    return () => {
      cleanup?.then(cleanupFn => cleanupFn?.());
    };
  }, [filterByAppNo, fetchQueryStats, fetchAssignedBranches]);

  // Auto-refresh with error handling
  useEffect(() => {
    if (isLoading) return; // Don't start auto-refresh during initial load
    
    const interval = setInterval(() => {
      if (!dashboardError) {
        fetchQueryStats(filterByAppNo || undefined);
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [filterByAppNo, isLoading, dashboardError, fetchQueryStats]);

  // Handle app number search
  const handleAppNoSearch = useCallback((appNo: string) => {
    try {
      setFilterByAppNo(appNo);
      setRefreshTrigger(prev => prev + 1);
      fetchQueryStats(appNo || undefined);
    } catch (error) {
      console.error('❌ Error handling app number search:', error);
      setDashboardError({
        message: 'Failed to search by application number',
        component: 'search'
      });
    }
  }, [fetchQueryStats]);

  // Clear app number filter with error handling
  const clearAppNoFilter = useCallback(() => {
    try {
      setSearchAppNo('');
      setFilterByAppNo('');
      setRefreshTrigger(prev => prev + 1);
      fetchQueryStats();
    } catch (error) {
      console.error('❌ Error clearing app number filter:', error);
      setDashboardError({
        message: 'Failed to clear application filter',
        component: 'filter'
      });
    }
  }, [fetchQueryStats]);

  const handleRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setDashboardError(null);
      setRefreshTrigger(prev => prev + 1);
      setLastRefreshed(new Date());
      
      // Fetch latest stats with current filter
      await Promise.all([
        fetchQueryStats(filterByAppNo || undefined),
        fetchAssignedBranches()
      ]);
      
      console.log('✅ Credit dashboard refreshed successfully');
    } catch (error) {
      console.error('❌ Error refreshing dashboard:', error);
      setDashboardError({
        message: 'Failed to refresh dashboard',
        component: 'refresh'
      });
    } finally {
      // Small delay to show refresh state
      setTimeout(() => {
        setIsRefreshing(false);
      }, 500);
    }
  }, [filterByAppNo, fetchQueryStats, fetchAssignedBranches]);

  const handleTabChange = useCallback((tab: CreditTabType) => {
    try {
      setActiveTab(tab);
      setDashboardError(null); // Clear errors when changing tabs
    } catch (error) {
      console.error('❌ Error changing tab:', error);
      setDashboardError({
        message: 'Failed to change tab',
        component: 'tab-change'
      });
    }
  }, []);

  const renderActiveTab = useCallback(() => {
    try {
      const commonProps = {
        searchAppNo: filterByAppNo
      };

      switch (activeTab) {
        case 'queries-raised':
          return (
            <React.Suspense fallback={
              <div className="p-6 bg-white rounded-lg shadow-sm border">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-300 rounded w-1/4"></div>
                  <div className="h-32 bg-gray-300 rounded"></div>
                </div>
              </div>
            }>
              <CreditQueriesRaised key={refreshTrigger} {...commonProps} />
            </React.Suspense>
          );
        case 'queries-resolved':
          return (
            <React.Suspense fallback={
              <div className="p-6 bg-white rounded-lg shadow-sm border">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-300 rounded w-1/4"></div>
                  <div className="h-32 bg-gray-300 rounded"></div>
                </div>
              </div>
            }>
              <CreditQueriesResolved key={refreshTrigger} {...commonProps} />
            </React.Suspense>
          );
        default:
          return (
            <React.Suspense fallback={
              <div className="p-6 bg-white rounded-lg shadow-sm border">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-300 rounded w-1/4"></div>
                  <div className="h-32 bg-gray-300 rounded"></div>
                </div>
              </div>
            }>
              <CreditQueriesRaised key={refreshTrigger} {...commonProps} />
            </React.Suspense>
          );
      }
    } catch (error) {
      console.error('❌ Error rendering tab:', error);
      return (
        <div className="p-6 bg-white rounded-lg shadow-sm border">
          <div className="text-center py-12">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Content</h3>
            <p className="text-gray-500 mb-4">
              There was an issue loading this section: {error instanceof Error ? error.message : 'Unknown error'}
            </p>
            <div className="space-y-2">
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors ml-2"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }
  }, [activeTab, refreshTrigger, filterByAppNo, handleRefresh]);

  // Show loading state during initial load
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-lg font-semibold text-gray-700">Initializing Credit Dashboard...</h2>
          <p className="text-sm text-gray-500">Please wait while we load your data</p>
        </div>
      </div>
    );
  }

  // Show error state if critical error occurred
  if (dashboardError && dashboardError.component === 'initialization') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm border p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Credit Dashboard Error</h3>
            <p className="text-sm text-gray-500 mb-4">{dashboardError.message}</p>
            <div className="space-y-2">
              <button
                onClick={handleRefresh}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Retry
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Error banner for non-critical errors */}
      {dashboardError && dashboardError.component !== 'initialization' && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 shadow-sm">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-red-800">
                {dashboardError.message}
              </p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setDashboardError(null)}
                className="text-red-400 hover:text-red-600 transition-colors"
                aria-label="Dismiss error"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
      
      <React.Suspense fallback={
        <div className="h-16 bg-white border-b shadow-sm animate-pulse">
          <div className="h-full bg-gray-200"></div>
        </div>
      }>
        <CreditNavbar 
          assignedBranches={assignedBranches}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          lastRefreshed={lastRefreshed}
          searchAppNo={searchAppNo}
          onAppNoSearch={(appNo) => {
            setSearchAppNo(appNo);
            handleAppNoSearch(appNo);
          }}
          onClearFilter={clearAppNoFilter}
        />
      </React.Suspense>
      
      <div className="flex min-h-[calc(100vh-4rem)]">
        <React.Suspense fallback={
          <div className="hidden lg:flex w-64 bg-gray-900 shadow-xl animate-pulse">
            <div className="w-full h-full bg-gray-800"></div>
          </div>
        }>
          <CreditSidebar 
            activeTab={activeTab} 
            onTabChange={handleTabChange}
            newQueriesCount={newQueriesCount}
          />
        </React.Suspense>
        
        <div className="flex-1 min-w-0">
          {/* Enhanced Mobile tab navigation */}
          <div className="lg:hidden bg-white border-b shadow-sm sticky top-0 z-10">
            <div className="px-4 py-3">
              <div className="flex items-center space-x-2">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <select
                  value={activeTab}
                  onChange={(e) => handleTabChange(e.target.value as CreditTabType)}
                  className="flex-1 p-3 text-base font-medium border-0 bg-transparent focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-gray-900"
                >
                  <option value="queries-raised" className="text-gray-900 bg-white">📋 Queries Raised</option>
                  <option value="queries-resolved" className="text-gray-900 bg-white">✅ Queries Resolved</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="p-4 lg:p-6 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {renderActiveTab()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
