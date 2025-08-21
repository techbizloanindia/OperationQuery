'use client';

import React, { useState, useEffect } from 'react';
import ApprovalSidebar from './ApprovalSidebar';
import { 
  History, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  Calendar,
  User,
  DollarSign,
  Eye,
  Download,
  RefreshCw
} from 'lucide-react';
import type { ApprovalRequest } from '@/types/approval';

const ApprovalHistory: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const itemsPerPage = 10;

  const [approvalHistory, setApprovalHistory] = useState<ApprovalRequest[]>([]);

  // Fetch real-time approval history data
  const fetchApprovalHistory = async (showLoader = false) => {
    if (showLoader) setLoading(true);
    
    try {
      const response = await fetch('/api/approvals', {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      const result = await response.json();
      
      if (result.success && result.data) {
        const allApprovals = result.data.approvals.map((approval: any) => ({
          ...approval,
          submittedAt: new Date(approval.submittedAt),
          dueDate: approval.dueDate ? new Date(approval.dueDate) : undefined,
          approvedAt: approval.approvedAt ? new Date(approval.approvedAt) : undefined,
          rejectedAt: approval.rejectedAt ? new Date(approval.rejectedAt) : undefined
        })).sort((a: any, b: any) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
        
        setApprovalHistory(allApprovals);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Error fetching approval history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovalHistory(true);
    
    // Set up polling for real-time updates every 10 seconds
    const interval = setInterval(() => fetchApprovalHistory(false), 10000);
    
    return () => clearInterval(interval);
  }, []);

  const filteredHistory = approvalHistory.filter(approval => {
    const matchesSearch = approval.requestId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         approval.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         approval.requester.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || approval.status === statusFilter;
    
    // Date filter logic can be added here
    
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredHistory.slice(startIndex, endIndex);

  const formatCurrency = (amount?: number, currency?: string) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(amount);
  };

  const formatDate = (date?: Date) => {
    if (!date) return '-';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      approved: 'bg-green-200 text-green-900 border-2 border-green-400',
      rejected: 'bg-red-200 text-red-900 border-2 border-red-400',
      pending: 'bg-yellow-200 text-yellow-900 border-2 border-yellow-400'
    };
    
    return (
      <span className={`px-4 py-2 rounded-full text-sm font-bold border ${styles[status as keyof typeof styles] || styles.pending}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const styles = {
      low: 'bg-gray-200 text-gray-900 border-2 border-gray-400',
      medium: 'bg-blue-200 text-blue-900 border-2 border-blue-400',
      high: 'bg-orange-200 text-orange-900 border-2 border-orange-400',
      urgent: 'bg-red-200 text-red-900 border-2 border-red-400'
    };
    
    return (
      <span className={`px-3 py-2 rounded-full text-sm font-bold border ${styles[priority as keyof typeof styles] || styles.medium}`}>
        {priority.toUpperCase()}
      </span>
    );
  };

  const handleExport = () => {
    console.log('Export approval history');
    // Implement export functionality
  };

  const handleRefresh = () => {
    fetchApprovalHistory(true);
  };

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
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start space-x-2 sm:space-x-3">
              <History className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-blue-600 flex-shrink-0 mt-1 sm:mt-0" />
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-gray-900">Approval History</h1>
                <p className="text-gray-600 mt-1 text-xs sm:text-sm lg:text-base">Complete record of all approval activities</p>
                <div className="flex items-center space-x-4 mt-2">
                  {loading && (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span className="text-xs text-blue-600">Loading real-time data...</span>
                    </div>
                  )}
                  {lastUpdated && !loading && (
                    <div className="text-sm font-medium text-gray-700">
                      Last updated: {lastUpdated.toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2">
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="flex items-center space-x-1 sm:space-x-2 bg-gray-600 text-white px-2 sm:px-3 py-2 lg:px-4 lg:py-2 rounded-lg hover:bg-gray-700 transition-colors text-xs sm:text-sm lg:text-base disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button
                onClick={handleExport}
                className="flex items-center space-x-1 sm:space-x-2 bg-blue-600 text-white px-2 sm:px-3 py-2 lg:px-4 lg:py-2 rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm lg:text-base"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export History</span>
                <span className="sm:hidden">Export</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="mb-4 sm:mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="space-y-4">
            {/* Search Bar - Full Width on Mobile */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by ID, title, or requester..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full lg:w-80 pl-10 pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* Filter Row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="pending">Pending</option>
                </select>

                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="quarter">This Quarter</option>
                </select>
              </div>

              <button className="flex items-center justify-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Advanced Filters</span>
                <span className="sm:hidden">Filters</span>
              </button>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="mb-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 text-xs sm:text-sm font-medium text-gray-800">
          <span>
            Showing {startIndex + 1}-{Math.min(endIndex, filteredHistory.length)} of {filteredHistory.length} records
          </span>
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <span className="text-xs sm:text-sm">
              Total: <span className="text-green-700 font-semibold">{approvalHistory.filter(a => a.status === 'approved').length} approved</span>, {' '}
              <span className="text-red-700 font-semibold">{approvalHistory.filter(a => a.status === 'rejected').length} rejected</span>
            </span>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs sm:text-sm font-semibold text-green-700">Live Updates</span>
            </div>
          </div>
        </div>

        {/* History Table */}
        <div className="bg-white rounded-lg lg:rounded-xl shadow-sm border border-gray-200">
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-800 uppercase tracking-wide">Request</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-800 uppercase tracking-wide">Requester</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-800 uppercase tracking-wide">Amount</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-800 uppercase tracking-wide">Priority</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-800 uppercase tracking-wide">Submitted</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-800 uppercase tracking-wide">Processed</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-800 uppercase tracking-wide">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-800 uppercase tracking-wide">Approver</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-800 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentItems.map((approval) => (
                  <tr key={approval.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-base font-bold text-blue-700 hover:text-blue-900 cursor-pointer">
                            {approval.requestId}
                          </span>
                          <span className="capitalize text-sm font-semibold bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                            {approval.type}
                          </span>
                        </div>
                        <p className="text-base font-semibold text-gray-900 mt-1">{approval.title}</p>
                        <p className="text-sm text-gray-700 mt-1 font-medium">{approval.description}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-blue-700" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-900">{approval.requester.name}</div>
                          <div className="text-sm font-medium text-gray-700">{approval.requester.department}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <DollarSign className="w-5 h-5 text-green-600" />
                        <span className="text-base font-bold text-gray-900">
                          {formatCurrency(approval.amount, approval.currency)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getPriorityBadge(approval.priority)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        <span className="text-sm font-bold text-gray-900">
                          {formatDate(approval.submittedAt)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-gray-900">
                        {formatDate(approval.approvedAt || approval.rejectedAt)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(approval.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      {approval.approver?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button className="text-blue-600 hover:text-blue-800">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden">
            {currentItems.map((approval) => (
              <div key={approval.id} className="p-3 sm:p-5 border-b-2 border-gray-300 last:border-b-0 bg-white">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-lg font-bold text-blue-700">
                          {approval.requestId}
                        </span>
                        <span className="capitalize text-sm font-bold bg-blue-200 text-blue-900 px-3 py-1 rounded-full">
                          {approval.type}
                        </span>
                        {getPriorityBadge(approval.priority)}
                      </div>
                      <h3 className="font-bold text-gray-900 text-base mb-2">{approval.title}</h3>
                      <p className="text-sm text-gray-700 font-medium leading-relaxed">{approval.description}</p>
                    </div>
                    <div className="flex flex-col items-end space-y-2 ml-4">
                      {getStatusBadge(approval.status)}
                      <button className="text-blue-700 hover:text-blue-900 bg-blue-50 p-2 rounded-lg">
                        <Eye className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm bg-gray-50 p-3 sm:p-4 rounded-lg">
                    <div className="space-y-3">
                      <div>
                        <span className="font-bold text-gray-800 text-base">Requester:</span>
                        <div className="flex items-center space-x-3 mt-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-blue-700" />
                          </div>
                          <div>
                            <div className="text-gray-900 font-bold text-base">{approval.requester.name}</div>
                            <div className="text-gray-700 font-semibold">{approval.requester.department}</div>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <span className="font-bold text-gray-800 text-base">Amount:</span>
                        <div className="flex items-center space-x-2 mt-2">
                          <DollarSign className="w-5 h-5 text-green-600" />
                          <span className="text-gray-900 font-bold text-base">
                            {formatCurrency(approval.amount, approval.currency)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <span className="font-bold text-gray-800 text-base">Submitted:</span>
                        <div className="flex items-center space-x-2 mt-2">
                          <Calendar className="w-5 h-5 text-blue-600" />
                          <span className="text-gray-900 font-bold text-base">{formatDate(approval.submittedAt)}</span>
                        </div>
                      </div>
                      
                      <div>
                        <span className="font-bold text-gray-800 text-base">Processed:</span>
                        <div className="text-gray-900 font-bold text-base mt-2">
                          {formatDate(approval.approvedAt || approval.rejectedAt)}
                        </div>
                      </div>
                      
                      {approval.approver && (
                        <div>
                          <span className="font-bold text-gray-800 text-base">Approver:</span>
                          <div className="text-gray-900 font-bold text-base mt-2">{approval.approver.name}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 border-t-2 border-gray-300 bg-gray-50">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div className="text-sm sm:text-base font-bold text-gray-900 text-center sm:text-left">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="flex items-center space-x-1 px-2 sm:px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Previous</span>
                  </button>
                  
                  {/* Page Numbers - Show on larger screens */}
                  <div className="hidden md:flex items-center space-x-1">
                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                      const pageNum = Math.max(1, currentPage - 2) + i;
                      if (pageNum > totalPages) return null;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-2 sm:px-3 py-2 text-xs sm:text-sm rounded-lg ${
                            pageNum === currentPage
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="flex items-center space-x-1 px-2 sm:px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {currentItems.length === 0 && (
            <div className="text-center py-8 sm:py-12 lg:py-16 bg-gray-50">
              <History className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 text-blue-600 mx-auto mb-4 sm:mb-6" />
              <h3 className="text-base sm:text-lg font-medium text-gray-800 mb-2">No approval history found</h3>
              <p className="text-sm text-gray-600 px-4">
                {searchTerm || statusFilter !== 'all' || dateFilter !== 'all'
                  ? 'Try adjusting your search criteria.'
                  : 'No approvals have been processed yet.'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApprovalHistory;
