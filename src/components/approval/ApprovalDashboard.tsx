'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import ApprovalSidebar from './ApprovalSidebar';
import QueryChatModal from './QueryChatModal';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Timer,
  Zap,
  Filter,
  Search,
  MoreVertical,
  ArrowUpRight,
  ArrowDownRight,
  ThumbsUp,
  FileCheck,
  Clock3,
  X
} from 'lucide-react';
import type { ApprovalRequest, ApprovalStats } from '@/types/approval';

const ApprovalDashboard: React.FC = () => {
  const [stats, setStats] = useState<ApprovalStats>({
    pendingCount: 0,
    urgentCount: 0,
    approvedToday: 0,
    averageApprovalTime: '0 hours',
    slaCompliance: 0
  });

  const [recentApprovals, setRecentApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [processingActions, setProcessingActions] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch real-time approval data
  const fetchApprovalData = async () => {
    try {
      const response = await fetch('/api/approvals');
      const result = await response.json();
      
      if (result.success && result.data) {
        // Calculate real-time stats
        const allApprovals = result.data.approvals || [];
        const pendingApprovals = allApprovals.filter((approval: any) => approval.status === 'pending');
        const urgentApprovals = allApprovals.filter((approval: any) => approval.priority === 'urgent' && approval.status === 'pending');
        const today = new Date().toDateString();
        const approvedToday = allApprovals.filter((approval: any) => {
          return approval.status === 'approved' && 
                 approval.approvedAt && 
                 new Date(approval.approvedAt).toDateString() === today;
        });

        // Calculate SLA compliance (mock calculation)
        const totalCompleted = allApprovals.filter((approval: any) => approval.status === 'approved').length;
        const slaCompliant = allApprovals.filter((approval: any) => 
          approval.status === 'approved' && approval.slaStatus === 'on-time'
        ).length;
        const slaCompliance = totalCompleted > 0 ? Math.round((slaCompliant / totalCompleted) * 100) : 0;

        setStats({
          pendingCount: pendingApprovals.length,
          urgentCount: urgentApprovals.length,
          approvedToday: approvedToday.length,
          averageApprovalTime: result.data.stats?.averageApprovalTime || '2.5 hours',
          slaCompliance: slaCompliance
        });

        // Set recent approvals (limit to 10 most recent)
        const sortedApprovals = allApprovals
          .sort((a: any, b: any) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
          .slice(0, 10)
          .map((approval: any) => ({
            ...approval,
            submittedAt: new Date(approval.submittedAt),
            dueDate: approval.dueDate ? new Date(approval.dueDate) : undefined,
            approvedAt: approval.approvedAt ? new Date(approval.approvedAt) : undefined
          }));
        
        setRecentApprovals(sortedApprovals);
      }
    } catch (error) {
      console.error('Error fetching approval data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovalData();
    
    // Set up polling for real-time updates every 30 seconds
    const interval = setInterval(fetchApprovalData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Function to display success message (can be called from child components)
  const displaySuccessMessage = (message: string) => {
    setSuccessMessage(message);
    setShowSuccessMessage(true);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      setShowSuccessMessage(false);
      setTimeout(() => setSuccessMessage(null), 300);
    }, 5000);
  };

  // Listen for approval events from child components
  useEffect(() => {
    const handleApprovalSuccess = (event: CustomEvent) => {
      displaySuccessMessage(event.detail.message);
    };

    window.addEventListener('approvalSuccess' as any, handleApprovalSuccess);
    return () => window.removeEventListener('approvalSuccess' as any, handleApprovalSuccess);
  }, []);

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      under_review: 'bg-blue-100 text-blue-800 border-blue-200'
    };
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[status as keyof typeof styles] || styles.pending}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const getSLAIndicator = (slaStatus: string) => {
    const styles = {
      'on-time': 'text-green-600',
      'due-soon': 'text-yellow-600',
      'overdue': 'text-red-600'
    };
    
    return (
      <span className={`text-xs font-medium ${styles[slaStatus as keyof typeof styles] || styles['on-time']}`}>
        {slaStatus.replace('-', ' ').toUpperCase()}
      </span>
    );
  };

  const formatCurrency = (amount?: number, currency?: string) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(amount);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  const handleRequestIdClick = (requestId: string) => {
    setSelectedRequestId(requestId);
    setIsChatModalOpen(true);
  };

  const handleCloseChatModal = () => {
    setIsChatModalOpen(false);
    setSelectedRequestId(null);
  };

  const handleApprovalAction = async (requestId: string, action: 'approve' | 'otc' | 'deferral') => {
    setProcessingActions(prev => new Set([...prev, requestId]));
    
    try {
      const response = await fetch('/api/approvals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'approve', // Backend handles the specific action type
          requestIds: [requestId],
          comment: `Request ${action.toUpperCase()} by approver`,
          approverName: 'Approval Team',
          specificAction: action // Pass the specific action
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        displaySuccessMessage(`Request ${requestId} has been ${action.toUpperCase()}`);
        fetchApprovalData(); // Refresh the data
      } else {
        throw new Error(result.error || 'Failed to process approval');
      }
    } catch (error) {
      console.error('Error processing approval:', error);
      displaySuccessMessage(`Error: Failed to ${action} request ${requestId}`);
    } finally {
      setProcessingActions(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  return (
    <div className="flex bg-gray-50 min-h-screen relative">
      {/* Mobile Sidebar Toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="bg-white p-2 rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50"
        >
          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Hidden on mobile, shown with toggle */}
      <div className={`transform transition-transform duration-300 lg:transform-none lg:block ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } fixed lg:relative z-40 lg:z-auto`}>
        <ApprovalSidebar pendingCount={stats.pendingCount} urgentCount={stats.urgentCount} />
      </div>
      
      {/* Main Content - Full width on mobile */}
      <div className="flex-1 w-full lg:ml-0 p-2 sm:p-4 md:p-6 lg:p-8 pt-16 lg:pt-4">
        {/* Header */}
        <div className="mb-4 md:mb-6 lg:mb-8">
          <div className="flex flex-col space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 min-w-0 flex-1">
                <Image 
                  src="/logo.png" 
                  alt="Bizloan Logo" 
                  width={48} 
                  height={48} 
                  className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h1 className="text-base sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 leading-tight truncate">
                    <span className="sm:hidden">Approval Dashboard</span>
                    <span className="hidden sm:inline">Bizloan Approval Dashboard</span>
                  </h1>
                  <p className="text-xs sm:text-sm md:text-base text-gray-600 mt-0.5 sm:mt-1 truncate">
                    <span className="sm:hidden">Real-time approvals</span>
                    <span className="hidden sm:inline">Real-time approval workflow management and monitoring</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full mr-1 sm:mr-2 animate-pulse"></div>
                  <span className="hidden sm:inline">Live Approval Status</span>
                  <span className="sm:hidden">Live</span>
                </span>
                {loading && (
                  <div className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm text-gray-500">
                    <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-blue-600"></div>
                    <span className="hidden lg:inline">Updating...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {showSuccessMessage && successMessage && (
          <div className={`mb-6 p-4 rounded-lg border transition-all duration-300 ${
            showSuccessMessage 
              ? 'bg-green-50 border-green-200 opacity-100 translate-y-0' 
              : 'opacity-0 -translate-y-2'
          }`}>
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-green-800 font-medium">{successMessage}</p>
                <p className="text-green-600 text-sm mt-1">
                  Query status has been updated and moved to Operations Dashboard → Query Resolved section.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowSuccessMessage(false);
                  setTimeout(() => setSuccessMessage(null), 300);
                }}
                className="flex-shrink-0 text-green-500 hover:text-green-700"
              >
                <ArrowDownRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Mobile Navigation for smaller screens */}
        <div className="lg:hidden bg-white rounded-xl shadow-sm border border-gray-200 mb-4 md:mb-6">
          <div className="p-3 sm:p-4">
            <select
              value="dashboard"
              onChange={(e) => {
                // Handle navigation for different approval sections
                if (e.target.value !== 'dashboard') {
                  window.location.href = `/approval-dashboard/${e.target.value}`;
                }
              }}
              className="w-full p-2 sm:p-3 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="dashboard">Dashboard Overview</option>
              <option value="pending-approvals">Pending Approvals ({stats.pendingCount})</option>
              <option value="my-approvals">My Approvals</option>
              <option value="approval-history">Approval History</option>
              <option value="reports">Reports</option>
            </select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-4 md:mb-6 lg:mb-8">
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-600 truncate">Pending</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mt-0.5 sm:mt-1">{stats.pendingCount}</p>
              </div>
              <div className="bg-yellow-100 p-1.5 sm:p-2 md:p-3 rounded-lg flex-shrink-0">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-yellow-600" />
              </div>
            </div>
            <div className="flex items-center mt-2 sm:mt-3 md:mt-4 text-xs">
              <ArrowUpRight className="w-3 h-3 text-red-500 mr-1 flex-shrink-0" />
              <span className="text-red-600 font-medium">+2</span>
              <span className="text-gray-600 ml-1 truncate hidden sm:inline">from yesterday</span>
            </div>
          </div>

          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-600 truncate">Approved Today</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mt-0.5 sm:mt-1">{stats.approvedToday}</p>
              </div>
              <div className="bg-green-100 p-1.5 sm:p-2 md:p-3 rounded-lg flex-shrink-0">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-green-600" />
              </div>
            </div>
            <div className="flex items-center mt-2 sm:mt-3 md:mt-4 text-xs">
              <ArrowUpRight className="w-3 h-3 text-green-500 mr-1 flex-shrink-0" />
              <span className="text-green-600 font-medium">+3</span>
              <span className="text-gray-600 ml-1 truncate hidden sm:inline">from yesterday</span>
            </div>
          </div>

          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 md:p-6 col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-600 truncate">Avg Time</p>
                <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mt-0.5 sm:mt-1 truncate">{stats.averageApprovalTime}</p>
              </div>
              <div className="bg-blue-100 p-1.5 sm:p-2 md:p-3 rounded-lg flex-shrink-0">
                <Timer className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-blue-600" />
              </div>
            </div>
            <div className="flex items-center mt-2 sm:mt-3 md:mt-4 text-xs">
              <ArrowDownRight className="w-3 h-3 text-green-500 mr-1 flex-shrink-0" />
              <span className="text-green-600 font-medium">-0.3h</span>
              <span className="text-gray-600 ml-1 truncate hidden sm:inline">from last week</span>
            </div>
          </div>
        </div>

        {/* Recent Approvals Activity Table */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200">
          <div className="p-3 sm:p-4 md:p-6 border-b border-gray-200">
            <div className="flex flex-col space-y-3 sm:space-y-4">
              <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900">Recent Approvals Activity</h2>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search requests..."
                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                  />
                </div>
                <button className="flex items-center justify-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm flex-shrink-0">
                  <Filter className="w-4 h-4" />
                  <span className="hidden sm:inline">Filter</span>
                  <span className="sm:hidden">Filter</span>
                </button>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request ID</th>
                  <th className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Requester</th>
                  <th className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Query Header</th>
                  <th className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Priority</th>
                  <th className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Submitted</th>
                  <th className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">Approver</th>
                  <th className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentApprovals.map((approval) => (
                  <tr key={approval.id} className="hover:bg-gray-50">
                    <td className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleRequestIdClick(approval.requestId)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors cursor-pointer break-all"
                        title="Click to view query details and chat history"
                      >
                        {approval.requestId}
                      </button>
                    </td>
                    <td className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap hidden sm:table-cell">
                      <div>
                        <div className="text-xs font-medium text-gray-900 truncate">{(approval as any).requester?.name || (approval as any).submittedBy || 'Operations Team'}</div>
                        <div className="text-xs text-gray-500 truncate">{(approval as any).requester?.department || (approval as any).team || 'Operations'}</div>
                      </div>
                    </td>
                    <td className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 md:py-4">
                      <div className="max-w-[200px] sm:max-w-xs">
                        <div className="text-xs font-medium text-gray-900 truncate" title={(approval as any).title || (approval as any).queryTitle || approval.description}>
                          {(approval as any).title || (approval as any).queryTitle || approval.description || 'Query request for approval'}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 truncate">
                          {(approval as any).customerName && `Customer: ${(approval as any).customerName}`}
                          {(approval as any).appNo && ` • App: ${(approval as any).appNo}`}
                        </div>
                        {/* Show hidden info on mobile */}
                        <div className="sm:hidden mt-1 space-y-1">
                          <div className="text-xs text-gray-500 truncate">
                            {(approval as any).requester?.name || (approval as any).submittedBy || 'Operations Team'}
                          </div>
                          <div className="md:hidden">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                              approval.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                              approval.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                              approval.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {approval.priority?.toUpperCase() || 'MEDIUM'}
                            </span>
                          </div>
                          <div className="lg:hidden mt-1">
                            <div className="text-xs text-gray-500">
                              {formatTime(approval.submittedAt)} • {approval.submittedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap hidden md:table-cell">
                      <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        approval.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                        approval.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        approval.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {approval.priority?.toUpperCase() || 'MEDIUM'}
                      </span>
                    </td>
                    <td className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs text-gray-900 hidden lg:table-cell">
                      <div>
                        <div>{formatTime(approval.submittedAt)}</div>
                        <div className="text-xs text-gray-500">
                          {approval.submittedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    </td>
                    <td className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap">
                      {getStatusBadge(approval.status)}
                    </td>
                    <td className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs text-gray-900 hidden xl:table-cell">
                      {approval.approver?.name || '-'}
                    </td>
                    <td className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs text-gray-500">
                      {approval.status === 'pending' ? (
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleApprovalAction(approval.requestId, 'approve')}
                            disabled={processingActions.has(approval.requestId)}
                            className="inline-flex items-center px-1.5 sm:px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                            title="Approve"
                          >
                            {processingActions.has(approval.requestId) ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
                            ) : (
                              <ThumbsUp className="w-3 h-3" />
                            )}
                          </button>
                          <button
                            onClick={() => handleApprovalAction(approval.requestId, 'otc')}
                            disabled={processingActions.has(approval.requestId)}
                            className="inline-flex items-center px-1.5 sm:px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                            title="OTC (One Time Clearance)"
                          >
                            {processingActions.has(approval.requestId) ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
                            ) : (
                              <FileCheck className="w-3 h-3" />
                            )}
                          </button>
                          <button
                            onClick={() => handleApprovalAction(approval.requestId, 'deferral')}
                            disabled={processingActions.has(approval.requestId)}
                            className="inline-flex items-center px-1.5 sm:px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
                            title="Deferral"
                          >
                            {processingActions.has(approval.requestId) ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
                            ) : (
                              <Clock3 className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">Processed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Query Chat Modal */}
      <QueryChatModal
        isOpen={isChatModalOpen}
        onClose={handleCloseChatModal}
        requestId={selectedRequestId || ''}
      />
    </div>
  );
};

export default ApprovalDashboard;
