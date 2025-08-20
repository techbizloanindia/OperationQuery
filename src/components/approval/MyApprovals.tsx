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
      <ApprovalSidebar pendingCount={12} urgentCount={3} />
      
      {/* Main Content */}
      <div className="ml-64 flex-1 p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Approvals</h1>
              <p className="text-gray-600 mt-1">Manage requests assigned to you for approval</p>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600">
                Assigned to: Approval Team
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <nav className="flex space-x-8 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'pending'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Pending
              {tabCounts.pending > 0 && (
                <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                  {tabCounts.pending}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'approved'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Approved
              {tabCounts.approved > 0 && (
                <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                  {tabCounts.approved}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('rejected')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'rejected'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Rejected
              {tabCounts.rejected > 0 && (
                <span className="ml-2 bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                  {tabCounts.rejected}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Filters */}
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search approvals..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                />
              </div>
              
              <select className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="">All Types</option>
                <option value="loan">Loan</option>
                <option value="expense">Expense</option>
                <option value="policy">Policy</option>
                <option value="credit">Credit</option>
                <option value="budget">Budget</option>
              </select>
            </div>

            <button className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Filter className="w-4 h-4" />
              <span>More Filters</span>
            </button>
          </div>
        </div>

        {/* Approvals List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requester</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {activeTab === 'pending' ? 'Due Date' : 'Processed Date'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  {activeTab === 'pending' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getCurrentApprovals().map((approval) => (
                  <tr key={approval.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer">
                            {approval.requestId}
                          </span>
                          <span className="capitalize text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                            {approval.type}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900 font-medium mt-1">{approval.title}</p>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">{approval.description}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{approval.requester.name}</div>
                          <div className="text-xs text-gray-500">{approval.requester.department}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(approval.amount, approval.currency)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getPriorityBadge(approval.priority)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(approval.status)}
                    </td>
                    {activeTab === 'pending' && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleApprove(approval.id)}
                            className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(approval.id)}
                            className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700 transition-colors"
                          >
                            Reject
                          </button>
                          <button className="text-gray-400 hover:text-gray-600">
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
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4">
                {activeTab === 'pending' && <Clock className="w-16 h-16 text-gray-400" />}
                {activeTab === 'approved' && <CheckCircle className="w-16 h-16 text-green-400" />}
                {activeTab === 'rejected' && <X className="w-16 h-16 text-red-400" />}
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No {activeTab} approvals
              </h3>
              <p className="text-gray-600">
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
