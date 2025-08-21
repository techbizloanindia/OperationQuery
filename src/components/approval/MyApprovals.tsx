'use client';

import React, { useState, useEffect } from 'react';
import ApprovalSidebar from './ApprovalSidebar';
import { 
  CheckCircle, 
  Clock, 
  X, 
  User,
  DollarSign,
  Calendar,
  Search,
  Filter,
  Eye
} from 'lucide-react';
import type { ApprovalRequest } from '@/types/approval';

const MyApprovals: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [myApprovals, setMyApprovals] = useState<{
    pending: ApprovalRequest[];
    approved: ApprovalRequest[];
    rejected: ApprovalRequest[];
  }>({
    pending: [],
    approved: [],
    rejected: []
  });

  // Fetch real-time approval data
  const fetchMyApprovals = async () => {
    try {
      const response = await fetch('/api/approvals');
      const result = await response.json();
      
      if (result.success && result.data) {
        const allApprovals = result.data.approvals.map((approval: any) => ({
          ...approval,
          submittedAt: new Date(approval.submittedAt),
          dueDate: approval.dueDate ? new Date(approval.dueDate) : undefined,
          approvedAt: approval.approvedAt ? new Date(approval.approvedAt) : undefined,
          rejectedAt: approval.rejectedAt ? new Date(approval.rejectedAt) : undefined
        }));

        setMyApprovals({
          pending: allApprovals.filter((approval: any) => approval.status === 'pending'),
          approved: allApprovals.filter((approval: any) => approval.status === 'approved'),
          rejected: allApprovals.filter((approval: any) => approval.status === 'rejected')
        });
      }
    } catch (error) {
      console.error('Error fetching my approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyApprovals();
    
    // Set up polling for real-time updates every 15 seconds
    const interval = setInterval(fetchMyApprovals, 15000);
    
    return () => clearInterval(interval);
  }, []);

  const handleApprove = (requestId: string) => {
    console.log('Approve request:', requestId);
    // Implement approve logic
  };

  const handleReject = (requestId: string) => {
    console.log('Reject request:', requestId);
    // Implement reject logic
  };

  const formatCurrency = (amount?: number, currency?: string) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200'
    };
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[status as keyof typeof styles] || styles.pending}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const styles = {
      low: 'bg-gray-100 text-gray-800 border-gray-200',
      medium: 'bg-blue-100 text-blue-800 border-blue-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      urgent: 'bg-red-100 text-red-800 border-red-200'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${styles[priority as keyof typeof styles] || styles.medium}`}>
        {priority.toUpperCase()}
      </span>
    );
  };

  const getCurrentApprovals = () => {
    return myApprovals[activeTab] || [];
  };

  const getTabCounts = () => {
    return {
      pending: myApprovals.pending.length,
      approved: myApprovals.approved.length,
      rejected: myApprovals.rejected.length
    };
  };

  const tabCounts = getTabCounts();

  return (
    <div className="flex bg-gray-50 min-h-screen">
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

      {/* Sidebar */}
      <div className={`transform transition-transform duration-300 lg:transform-none lg:block ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } fixed lg:relative z-40 lg:z-auto`}>
        <ApprovalSidebar pendingCount={12} urgentCount={3} />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 lg:ml-0 p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8">
        {/* Header */}
        <div className="mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">My Approvals</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Manage requests assigned to you for approval</p>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-xs sm:text-sm text-gray-600">
                Assigned to: Approval Team
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-4 sm:mb-6">
          <nav className="flex space-x-4 sm:space-x-8 border-b border-gray-200 overflow-x-auto">
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors flex-shrink-0 ${
                activeTab === 'pending'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="hidden sm:inline">Pending</span>
              <span className="sm:hidden">Pending</span>
              {tabCounts.pending > 0 && (
                <span className="ml-1 sm:ml-2 bg-yellow-100 text-yellow-800 text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">
                  {tabCounts.pending}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors flex-shrink-0 ${
                activeTab === 'approved'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="hidden sm:inline">Approved</span>
              <span className="sm:hidden">Approved</span>
              {tabCounts.approved > 0 && (
                <span className="ml-1 sm:ml-2 bg-green-100 text-green-800 text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">
                  {tabCounts.approved}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('rejected')}
              className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors flex-shrink-0 ${
                activeTab === 'rejected'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="hidden sm:inline">Rejected</span>
              <span className="sm:hidden">Rejected</span>
              {tabCounts.rejected > 0 && (
                <span className="ml-1 sm:ml-2 bg-red-100 text-red-800 text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">
                  {tabCounts.rejected}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Filters */}
        <div className="mb-4 sm:mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search approvals..."
                  className="w-full sm:w-48 lg:w-64 pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="">All Types</option>
                <option value="loan">Loan</option>
                <option value="expense">Expense</option>
                <option value="policy">Policy</option>
                <option value="credit">Credit</option>
                <option value="budget">Budget</option>
              </select>
            </div>

            <button className="flex items-center space-x-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">More Filters</span>
              <span className="sm:hidden">Filters</span>
            </button>
          </div>
        </div>

        {/* Approvals List */}
        <div className="bg-white rounded-lg lg:rounded-xl shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request</th>
                  <th className="px-2 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Requester</th>
                  <th className="px-2 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Amount</th>
                  <th className="px-2 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Priority</th>
                  <th className="px-2 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">
                    {activeTab === 'pending' ? 'Due Date' : 'Processed Date'}
                  </th>
                  <th className="px-2 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  {activeTab === 'pending' && (
                    <th className="px-2 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getCurrentApprovals().map((approval) => (
                  <tr key={approval.id} className="hover:bg-gray-50">
                    <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4">
                      <div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 space-y-1 sm:space-y-0">
                          <span className="text-sm sm:text-base font-semibold text-blue-700 hover:text-blue-900 cursor-pointer truncate">
                            {approval.requestId}
                          </span>
                          <span className="capitalize text-sm font-medium bg-blue-100 text-blue-900 px-3 py-1 rounded w-fit">
                            {approval.type}
                          </span>
                        </div>
                        <p className="text-sm sm:text-base text-gray-900 font-semibold mt-1 truncate">{approval.title}</p>
                        <p className="text-sm text-gray-700 mt-1 line-clamp-1 font-medium">{approval.description}</p>
                        
                        {/* Mobile-only info */}
                        <div className="mt-2 space-y-1">
                          <div className="sm:hidden flex items-center space-x-1 text-sm text-gray-700">
                            <User className="w-4 h-4" />
                            <span className="truncate font-semibold">{approval.requester.name}</span>
                          </div>
                          <div className="md:hidden flex items-center space-x-1 text-sm">
                            <DollarSign className="w-4 h-4 text-green-600" />
                            <span className="font-bold text-gray-900">
                              {formatCurrency(approval.amount, approval.currency)}
                            </span>
                          </div>
                          <div className="lg:hidden">
                            {getPriorityBadge(approval.priority)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 hidden sm:table-cell">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{approval.requester.name}</div>
                          <div className="text-sm text-gray-700 truncate font-medium">{approval.requester.department}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap hidden md:table-cell">
                      <div className="flex items-center space-x-1">
                        <DollarSign className="w-5 h-5 text-green-600" />
                        <span className="text-base font-bold text-gray-900">
                          {formatCurrency(approval.amount, approval.currency)}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap hidden lg:table-cell">
                      {getPriorityBadge(approval.priority)}
                    </td>
                    <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap hidden xl:table-cell">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        <span className="text-sm font-semibold text-gray-900">
                          {activeTab === 'pending' 
                            ? (approval.dueDate ? formatDate(approval.dueDate) : '-')
                            : (approval.approvedAt 
                                ? formatDate(approval.approvedAt) 
                                : approval.rejectedAt 
                                ? formatDate(approval.rejectedAt)
                                : '-'
                              )
                          }
                        </span>
                      </div>
                    </td>
                    <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                      {getStatusBadge(approval.status)}
                    </td>
                    {activeTab === 'pending' && (
                      <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-1 sm:space-x-2">
                          <button
                            onClick={() => handleApprove(approval.id)}
                            className="bg-green-600 text-white px-3 sm:px-4 py-2 rounded text-sm font-semibold hover:bg-green-700 transition-colors shadow-sm"
                          >
                            <span className="hidden sm:inline">Approve</span>
                            <span className="sm:hidden">✓</span>
                          </button>
                          <button
                            onClick={() => handleReject(approval.id)}
                            className="bg-red-600 text-white px-3 sm:px-4 py-2 rounded text-sm font-semibold hover:bg-red-700 transition-colors shadow-sm"
                          >
                            <span className="hidden sm:inline">Reject</span>
                            <span className="sm:hidden">✗</span>
                          </button>
                          <button className="text-gray-400 hover:text-gray-600 hidden sm:block">
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {getCurrentApprovals().length === 0 && (
            <div className="text-center py-8 sm:py-12">
              <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4">
                {activeTab === 'pending' && <Clock className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400" />}
                {activeTab === 'approved' && <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 text-green-400" />}
                {activeTab === 'rejected' && <X className="w-12 h-12 sm:w-16 sm:h-16 text-red-400" />}
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
                No {activeTab} approvals
              </h3>
              <p className="text-base sm:text-lg text-gray-700 px-4 font-semibold leading-relaxed">
                {activeTab === 'pending' && "You don't have any pending approvals assigned to you."}
                {activeTab === 'approved' && "You haven't approved any requests yet."}
                {activeTab === 'rejected' && "You haven't rejected any requests yet."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyApprovals;
