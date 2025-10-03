'use client';

import React, { useState, useEffect } from 'react';
import SalesNavbar from './SalesNavbar';
import SalesSidebar from './SalesSidebar';
import SalesQueriesRaised from './SalesQueriesRaised';
import SalesQueriesResolved from './SalesQueriesResolved';
import QueriesByAppNo from '@/components/shared/QueriesByAppNo';
import { useAuth } from '@/contexts/AuthContext';
import { querySyncService } from '@/lib/querySyncService';

export type SalesTabType = 'queries-raised' | 'queries-resolved';

export default function SalesDashboard() {
  const [activeTab, setActiveTab] = useState<SalesTabType>('queries-raised');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newQueriesCount, setNewQueriesCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [assignedBranches, setAssignedBranches] = useState<string[]>([]);
  const [searchAppNo, setSearchAppNo] = useState<string>(''); // App number search
  const [filterByAppNo, setFilterByAppNo] = useState<string>(''); // Active filter

  const { user } = useAuth();

  // Helper function to get user's assigned branches with enhanced validation
  const getUserBranches = (user: any) => {
    if (!user) return [];
    
    // Priority: assignedBranches > branch > branchCode
    if (user.assignedBranches && user.assignedBranches.length > 0) {
      console.log('🏢 Sales User assigned branches:', user.assignedBranches);
      return user.assignedBranches;
    }
    
    const branches = [];
    if (user.branch) branches.push(user.branch);
    if (user.branchCode && user.branchCode !== user.branch) branches.push(user.branchCode);
    
    const filteredBranches = branches.filter(Boolean);
    console.log('🏢 Sales User detected branches:', filteredBranches);
    return filteredBranches;
  };

  // Enhanced fetch query statistics with app number filtering
  const fetchQueryStats = async (appNoFilter?: string) => {
    try {
      const userBranches = getUserBranches(user);
      const branchParam = userBranches.length > 0 ? `&branches=${userBranches.join(',')}` : '';
      const appNoParam = appNoFilter ? `&appNo=${appNoFilter}` : '';
      
      const response = await fetch(`/api/queries?team=sales&stats=true&includeBoth=true${branchParam}${appNoParam}`);
      const result = await response.json();
      
      if (result.success) {
        setNewQueriesCount(result.data?.pending || 0);
        console.log(`📊 Sales Query Stats - Pending: ${result.data?.pending}, Resolved: ${result.data?.resolved}, Total: ${result.data?.total}`);
      }
    } catch (error) {
      console.error('Error fetching query stats:', error);
    }
  };

  // Fetch assigned branches
  const fetchAssignedBranches = async () => {
    try {
      const response = await fetch('/api/branches?isActive=true');
      const result = await response.json();
      
      if (result.success) {
        const branchNames = result.data.map((branch: any) => branch.branchName);
        setAssignedBranches(branchNames);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  // Initial load
  useEffect(() => {
    fetchQueryStats();
    fetchAssignedBranches();
    
    // Initialize real-time updates
    if (typeof window !== 'undefined') {
      import('@/lib/queryUpdateService').then(({ queryUpdateService }) => {
        queryUpdateService.initialize();
        
        // Subscribe to real-time updates for sales team
        const unsubscribe = queryUpdateService.subscribe('sales', (update) => {
          console.log('📨 Sales Dashboard received query update:', update.appNo, update.action);
          
          // Refresh stats when we receive updates
          fetchQueryStats();
          
          // Force refresh of the active tab
          setRefreshTrigger(prev => prev + 1);
        });
        
        console.log('🌐 Sales Dashboard: Initialized real-time updates');
        
        // Cleanup on unmount
        return () => {
          unsubscribe();
        };
      });
    }
  }, []);

  // Auto-refresh every 30 seconds as fallback
  useEffect(() => {
    const interval = setInterval(() => {
      fetchQueryStats();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Auto-refresh every 10 seconds for real-time updates (like credit dashboard)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchQueryStats();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshTrigger(prev => prev + 1);
    setLastRefreshed(new Date());
    
    // Fetch latest stats with current filter
    await fetchQueryStats(filterByAppNo || undefined);
    await fetchAssignedBranches();
    
    // Small delay to show refresh state
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  // Handle app number search
  const handleAppNoSearch = (appNo: string) => {
    setFilterByAppNo(appNo);
    setRefreshTrigger(prev => prev + 1);
    fetchQueryStats(appNo || undefined);
  };

  // Clear app number filter
  const clearAppNoFilter = () => {
    setSearchAppNo('');
    setFilterByAppNo('');
    setRefreshTrigger(prev => prev + 1);
    fetchQueryStats();
  };

  const handleTabChange = (tab: SalesTabType) => {
    setActiveTab(tab);
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'queries-raised':
        return <SalesQueriesRaised key={refreshTrigger} searchAppNo={filterByAppNo} />;
      case 'queries-resolved':
        return <SalesQueriesResolved key={refreshTrigger} searchAppNo={filterByAppNo} />;
      default:
        return <SalesQueriesRaised key={refreshTrigger} searchAppNo={filterByAppNo} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <SalesNavbar 
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
      
      <div className="flex min-h-[calc(100vh-4rem)]">
        <SalesSidebar 
          activeTab={activeTab} 
          onTabChange={handleTabChange}
          newQueriesCount={newQueriesCount}
        />
        
        <div className="flex-1 min-w-0">
          {/* Enhanced Mobile tab navigation */}
          <div className="lg:hidden bg-white border-b shadow-sm sticky top-0 z-10">
            <div className="px-4 py-3">
              <div className="flex items-center space-x-2">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <select
                  value={activeTab}
                  onChange={(e) => handleTabChange(e.target.value as SalesTabType)}
                  className="flex-1 p-3 text-base font-medium border-0 bg-transparent focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900"
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