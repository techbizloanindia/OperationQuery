'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import ApprovalSidebar from './ApprovalSidebar';
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
  ArrowDownRight
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

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <ApprovalSidebar pendingCount={stats.pendingCount} urgentCount={stats.urgentCount} />
      
      {/* Main Content */}
      <div className="ml-64 flex-1 p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Image 
                src="/logo.png" 
                alt="Bizloan Logo" 
                width={48} 
                height={48} 
                className="w-12 h-12"
              />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Bizloan Approval Dashboard</h1>
                <p className="text-gray-600 mt-1">Real-time approval workflow management and monitoring</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                Live Approval Status
              </span>
              {loading && (
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span>Updating...</span>
                </div>
              )}
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Approvals</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.pendingCount}</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm">
              <ArrowUpRight className="w-4 h-4 text-red-500 mr-1" />
              <span className="text-red-600 font-medium">+2</span>
              <span className="text-gray-600 ml-1">from yesterday</span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approved Today</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.approvedToday}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm">
              <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-600 font-medium">+3</span>
              <span className="text-gray-600 ml-1">from yesterday</span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Approval Time</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.averageApprovalTime}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Timer className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm">
              <ArrowDownRight className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-600 font-medium">-0.3h</span>
              <span className="text-gray-600 ml-1">from last week</span>
            </div>
          </div>
        </div>

        {/* Recent Approvals Activity Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Recent Approvals Activity</h2>
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search requests..."
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                  />
                </div>
                <button className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <Filter className="w-4 h-4" />
                  <span>Filter</span>
                </button>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requester</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount/Value</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approver</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SLA</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentApprovals.map((approval) => (
                  <tr key={approval.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatTime(approval.submittedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer">
                        {approval.requestId}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="capitalize text-sm text-gray-900 bg-gray-100 px-2 py-1 rounded">
                        {approval.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{approval.requester.name}</div>
                        <div className="text-sm text-gray-500">{approval.requester.department}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(approval.amount, approval.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(approval.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {approval.approver?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getSLAIndicator(approval.slaStatus)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button className="text-gray-400 hover:text-gray-600">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApprovalDashboard;
