'use client';

import React, { useState, useEffect } from 'react';
import CreditNavbar from './CreditNavbar';
import CreditSidebar from './CreditSidebar';
import CreditQueriesRaised from './CreditQueriesRaised';
import CreditQueriesResolved from './CreditQueriesResolved';
import QueriesByAppNo from '@/components/shared/QueriesByAppNo';
import { useAuth } from '@/contexts/AuthContext';
import { querySyncService } from '@/lib/querySyncService';

export type CreditTabType = 'queries-raised' | 'queries-resolved';

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

  const { user } = useAuth();

  // Helper function to get user's assigned branches with enhanced validation
  const getUserBranches = (user: any) => {
    if (!user) return [];
    
    // Priority: assignedBranches > branch > branchCode
    if (user.assignedBranches && user.assignedBranches.length > 0) {
      console.log('🏢 Credit User assigned branches:', user.assignedBranches);
      return user.assignedBranches;
    }
    
    const branches = [];
    if (user.branch) branches.push(user.branch);
    if (user.branchCode && user.branchCode !== user.branch) branches.push(user.branchCode);
    
    const filteredBranches = branches.filter(Boolean);
    console.log('🏢 Credit User detected branches:', filteredBranches);
    return filteredBranches;
  };

  // Enhanced fetch query statistics with app number filtering
  const fetchQueryStats = async (appNoFilter?: string) => {
    try {
      const userBranches = getUserBranches(user);
      const branchParam = userBranches.length > 0 ? `&branches=${userBranches.join(',')}` : '';
      const appNoParam = appNoFilter ? `&appNo=${appNoFilter}` : '';
      
      const response = await fetch(`/api/queries?team=credit&stats=true&includeBoth=true${branchParam}${appNoParam}`);
      const result = await response.json();
      
      if (result.success) {
        setNewQueriesCount(result.data?.pending || 0);
        console.log(`📊 Credit Query Stats - Pending: ${result.data?.pending}, Resolved: ${result.data?.resolved}, Total: ${result.data?.total}`);
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

        // Subscribe to real-time updates for credit team
        const unsubscribe = queryUpdateService.subscribe('credit', (update) => {
          console.log('📨 Credit Dashboard received query update:', update.appNo, update.action);

          // Refresh stats when we receive updates
          fetchQueryStats(filterByAppNo || undefined);

          // Force refresh of the active tab
          setRefreshTrigger(prev => prev + 1);
        });

        console.log('🌐 Credit Dashboard: Initialized real-time updates');

        // Cleanup on unmount
        return () => {
          unsubscribe();
        };
      });
    }
  }, [filterByAppNo]);

  // Auto-refresh every 30 seconds as fallback (like sales dashboard)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchQueryStats(filterByAppNo || undefined);
    }, 30000);
    return () => clearInterval(interval);
  }, [filterByAppNo]);

  // Auto-refresh every 10 seconds for real-time updates (like sales dashboard)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchQueryStats(filterByAppNo || undefined);
    }, 10000);
    return () => clearInterval(interval);
  }, [filterByAppNo]);

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

  const handleTabChange = (tab: CreditTabType) => {
    setActiveTab(tab);
  };

  const renderActiveTab = () => {
    try {
      switch (activeTab) {
        case 'queries-raised':
          return <CreditQueriesRaised key={refreshTrigger} searchAppNo={filterByAppNo} />;
        case 'queries-resolved':
          return <CreditQueriesResolved key={refreshTrigger} searchAppNo={filterByAppNo} />;
        default:
          return <CreditQueriesRaised key={refreshTrigger} searchAppNo={filterByAppNo} />;
      }
    } catch (error) {
      console.error('Error rendering tab:', error);
      return (
        <div className="p-6 bg-white rounded-lg shadow-sm border">
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Content</h3>
            <p className="text-gray-500 mb-4">There was an issue loading this section.</p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
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
      
      <div className="flex">
        <CreditSidebar 
          activeTab={activeTab} 
          onTabChange={handleTabChange}
          newQueriesCount={newQueriesCount}
        />
        
        <div className="flex-1 lg:ml-0">
          {/* Mobile tab navigation for smaller screens */}
          <div className="lg:hidden bg-white border-b">
            <div className="px-4 py-3">
              <select
                value={activeTab}
                onChange={(e) => handleTabChange(e.target.value as CreditTabType)}
                className="w-full p-2 border rounded-lg"
              >
                <option value="queries-raised">Queries Raised</option>
                <option value="queries-resolved">Queries Resolved</option>
              </select>
            </div>
          </div>
          
          {renderActiveTab()}
        </div>
      </div>
    </div>
  );
}
