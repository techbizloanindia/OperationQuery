'use client';

import React, { useState, useEffect } from 'react';
import ApprovalSidebar from './ApprovalSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Filter, 
  Search, 
  MoreVertical, 
  CheckCircle, 
  X, 
  Calendar,
  User,
  DollarSign,
  Clock,
  AlertTriangle,
  ArrowUp,
  Pause,
  HandHeart,
  MessageSquare
} from 'lucide-react';
import type { ApprovalRequest, ApprovalFilter } from '@/types/approval';

const PendingApprovals: React.FC = () => {
  const { user } = useAuth(); // Get current user for auto-populating approver name
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [filter, setFilter] = useState<ApprovalFilter>({});
  const [pendingRequests, setPendingRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ pending: 0, urgent: 0 });
  const [processing, setProcessing] = useState<string[]>([]);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState<'approve' | 'reject'>('approve');
  const [actionComment, setActionComment] = useState('');
  const [selectedRequestForAction, setSelectedRequestForAction] = useState<any>(null);
  const [approverName, setApproverName] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Success message state
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Auto-populate approver name from user context
  useEffect(() => {
    if (user?.name) {
      setApproverName(user.name);
    } else {
      setApproverName('Approval Team Member');
    }
  }, [user]);

  // Fetch real-time pending approvals with polling every 10 seconds for real-time updates
  const fetchPendingApprovals = async () => {
    try {
      const response = await fetch('/api/approvals?status=pending');
      const result = await response.json();
      
      if (result.success && result.data) {
        const pendingApprovals = result.data.approvals.map((approval: any) => ({
          ...approval,
          submittedAt: new Date(approval.submittedAt),
          dueDate: approval.dueDate ? new Date(approval.dueDate) : undefined
        }));
        
        console.log('📋 Fetched pending approvals:', pendingApprovals);
        setPendingRequests(pendingApprovals);
        
        // Calculate stats
        const urgentCount = pendingApprovals.filter((approval: any) => 
          approval.priority === 'urgent'
        ).length;
        
        setStats({
          pending: pendingApprovals.length,
          urgent: urgentCount
        });
      }
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingApprovals();
    
    // Set up polling for real-time updates every 10 seconds for more responsive updates
    const interval = setInterval(fetchPendingApprovals, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const handleSelectRequest = (requestId: string) => {
    setSelectedRequests(prev => 
      prev.includes(requestId)
        ? prev.filter(id => id !== requestId)
        : [...prev, requestId]
    );
  };

  const handleSelectAll = () => {
    if (selectedRequests.length === pendingRequests.length) {
      setSelectedRequests([]);
    } else {
      setSelectedRequests(pendingRequests.map(req => req.id));
    }
  };

  const handleBulkApprove = () => {
    console.log('Bulk approve:', selectedRequests);
    // Implement bulk approve logic
    setSelectedRequests([]);
    setShowBulkActions(false);
  };

  const handleBulkReject = () => {
    console.log('Bulk reject:', selectedRequests);
    // Implement bulk reject logic
    setSelectedRequests([]);
    setShowBulkActions(false);
  };

  // Enhanced action handlers for three-stage approval process
  const handleApproveAction = (request: any) => {
    setSelectedRequestForAction(request);
    setSelectedAction('approve');
    setActionComment('');
    setShowActionModal(true);
  };

  const handleRejectAction = (request: any) => {
    setSelectedRequestForAction(request);
    setSelectedAction('reject');
    setActionComment('');
    setShowActionModal(true);
  };


  const processApprovalAction = async (action: 'approve' | 'reject', requestIds: string[], comment?: string, approver?: string) => {
    setProcessing(prev => [...prev, ...requestIds]);
    
    try {
      const response = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          requestIds,
          comment,
          approverName: approver || approverName
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Refresh the pending requests immediately for real-time updates
        await fetchPendingApprovals();
        
        // Clear selections
        setSelectedRequests([]);
        setShowBulkActions(false);
        
        // Show success message
        const message = `✅ Successfully ${action === 'approve' ? 'approved' : 'rejected'} ${requestIds.length} request(s)!`;
        setSuccessMessage(message);
        setShowSuccessMessage(true);
        
        // Auto-hide success message after 5 seconds
        setTimeout(() => {
          setShowSuccessMessage(false);
          setTimeout(() => setSuccessMessage(null), 300); // Allow fade out animation
        }, 5000);
        
        console.log(`✅ ${action === 'approve' ? 'Approved' : 'Rejected'} ${requestIds.length} request(s) successfully`);
      } else {
        console.error('Approval action failed:', result.error);
      }
    } catch (error) {
      console.error('Error processing approval action:', error);
    } finally {
      setProcessing(prev => prev.filter(id => !requestIds.includes(id)));
    }
  };

  const handleActionSubmit = async () => {
    if (!selectedRequestForAction) return;
    
    await processApprovalAction(
      selectedAction, 
      [selectedRequestForAction.id], 
      actionComment.trim() || undefined, 
      approverName
    );
    
    // Reset modal
    setShowActionModal(false);
    setActionComment('');
    setSelectedRequestForAction(null);
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

  // Get action-specific badge and icon for proposed actions
  const getProposedActionBadge = (proposedAction: string) => {
    const actionStyles = {
      'approve': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200', icon: CheckCircle },
      'deferral': { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200', icon: Pause },
      'otc': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200', icon: HandHeart }
    };
    
    const style = actionStyles[proposedAction as keyof typeof actionStyles] || actionStyles.approve;
    const IconComponent = style.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border ${style.bg} ${style.text} ${style.border}`}>
        <IconComponent className="w-3 h-3" />
        {proposedAction.toUpperCase()}
      </span>
    );
  };

  const getSLAIndicator = (slaStatus: string) => {
    const styles = {
      'on-time': 'text-green-600 bg-green-100',
      'due-soon': 'text-yellow-600 bg-yellow-100',
      'overdue': 'text-red-600 bg-red-100'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[slaStatus as keyof typeof styles] || styles['on-time']}`}>
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

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
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
        <ApprovalSidebar pendingCount={stats.pending} urgentCount={stats.urgent} />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 lg:ml-0 p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8">
        {/* Header */}
        <div className="mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Pending Approvals</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Review and process pending approval requests</p>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3">
              <span className="text-xs sm:text-sm text-gray-600">
                {loading ? 'Loading...' : `${pendingRequests.length} pending`}
              </span>
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
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
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Real-time Recent Approvals Activity */}
        <div className="mb-4 sm:mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="hidden sm:inline">Recent Approvals Activity</span>
              <span className="sm:hidden">Activity</span>
            </h2>
            <span className="text-xs text-gray-500">Updates every 10s</span>
          </div>
          
          <div className="space-y-3 max-h-32 overflow-y-auto">
            {pendingRequests.slice(0, 3).map((request) => (
              <div key={`activity-${request.id}`} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Clock className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-gray-900">{request.requestId}</p>
                    {(request as any).proposedAction && getProposedActionBadge((request as any).proposedAction)}
                  </div>
                  <p className="text-xs text-gray-500">
                    Awaiting approval from {approverName} • {formatDate(request.submittedAt)}
                  </p>
                </div>
                <div className="text-xs text-gray-400">
                  Pending
                </div>
              </div>
            ))}
            {pendingRequests.length === 0 && (
              <div className="text-center py-4 text-gray-500 text-sm">
                No recent activity. All caught up! 🎉
              </div>
            )}
          </div>
        </div>

        {/* Filters and Search */}
        <div className="mb-4 sm:mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0 gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search requests..."
                  className="w-full sm:w-48 lg:w-64 pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                />
              </div>
              
              <div className="flex space-x-2 sm:space-x-3">
                <select className="flex-1 sm:flex-none border border-gray-300 rounded-lg px-2 sm:px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white">
                  <option value="">All Types</option>
                  <option value="loan">Loan</option>
                  <option value="expense">Expense</option>
                  <option value="policy">Policy</option>
                  <option value="credit">Credit</option>
                  <option value="budget">Budget</option>
                </select>

                <select className="flex-1 sm:flex-none border border-gray-300 rounded-lg px-2 sm:px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white">
                  <option value="">All Priorities</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <button className="flex items-center space-x-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">More Filters</span>
                <span className="sm:hidden">Filters</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedRequests.length > 0 && (
          <div className="mb-4 sm:mb-6 bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
              <span className="text-sm font-medium text-blue-800">
                {selectedRequests.length} request(s) selected
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleBulkApprove}
                  className="flex items-center space-x-2 bg-green-600 text-white px-3 sm:px-4 py-2 text-sm rounded-lg hover:bg-green-700 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">Bulk Approve</span>
                  <span className="sm:hidden">Approve</span>
                </button>
                <button
                  onClick={handleBulkReject}
                  className="flex items-center space-x-2 bg-red-600 text-white px-3 sm:px-4 py-2 text-sm rounded-lg hover:bg-red-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span className="hidden sm:inline">Bulk Reject</span>
                  <span className="sm:hidden">Reject</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Requests Table */}
        <div className="bg-white rounded-lg lg:rounded-xl shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 sm:px-4 lg:px-6 py-3">
                    <input
                      type="checkbox"
                      checked={selectedRequests.length === pendingRequests.length}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-2 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request</th>
                  <th className="px-2 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Proposed Action</th>
                  <th className="px-2 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Requester</th>
                  <th className="px-2 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Priority</th>
                  <th className="px-2 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">Due Date</th>
                  <th className="px-2 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4">
                      <input
                        type="checkbox"
                        checked={selectedRequests.includes(request.id)}
                        onChange={() => handleSelectRequest(request.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4">
                      <div className="flex items-start space-x-2 sm:space-x-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 space-y-1 sm:space-y-0">
                            <span className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                              {request.requestId}
                            </span>
                            <span className="capitalize text-xs bg-gray-100 text-gray-800 px-2 py-0.5 sm:py-1 rounded flex-shrink-0 w-fit">
                              {request.type}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-gray-900 font-medium mt-1 truncate">{request.title}</p>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{request.description}</p>
                          
                          {/* Mobile-only info */}
                          <div className="md:hidden mt-2 space-y-1">
                            {request.proposedAction && (
                              <div>{getProposedActionBadge(request.proposedAction)}</div>
                            )}
                            <div className="sm:hidden flex items-center space-x-1 text-xs text-gray-500">
                              <User className="w-3 h-3" />
                              <span>{request.requester.name}</span>
                            </div>
                            <div className="lg:hidden">
                              {getPriorityBadge(request.priority)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 hidden md:table-cell">
                      <div className="flex items-center">
                        {(request as any).proposedAction ? 
                          getProposedActionBadge((request as any).proposedAction) :
                          <span className="text-xs text-gray-400">No action specified</span>
                        }
                      </div>
                    </td>
                    <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 hidden sm:table-cell">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-medium text-gray-900 truncate">{request.requester.name}</div>
                          <div className="text-xs text-gray-500 truncate">{request.requester.department}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap hidden lg:table-cell">
                      {getPriorityBadge(request.priority)}
                    </td>
                    <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap hidden xl:table-cell">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {request.dueDate ? formatDate(request.dueDate) : '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1 sm:space-x-2">
                        {/* Action-specific approve button */}
                        <button 
                          onClick={() => handleApproveAction(request)}
                          disabled={processing.includes(request.id)}
                          className="bg-green-600 text-white px-2 sm:px-3 py-1 rounded text-xs hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                        >
                          {processing.includes(request.id) ? (
                            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <CheckCircle className="w-3 h-3" />
                          )}
                          <span className="hidden sm:inline">
                            {(request as any).proposedAction 
                              ? `Approve ${(request as any).proposedAction.charAt(0).toUpperCase() + (request as any).proposedAction.slice(1)}`
                              : 'Approve'
                            }
                          </span>
                        </button>
                        
                        {/* Reject button with approver name */}
                        <button 
                          onClick={() => handleRejectAction(request)}
                          disabled={processing.includes(request.id)}
                          className="bg-red-600 text-white px-2 sm:px-3 py-1 rounded text-xs hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                        >
                          <X className="w-3 h-3" />
                          <span className="hidden sm:inline">Reject</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>


        {/* Enhanced Action Modal for Three-Stage Approval */}
        {showActionModal && selectedRequestForAction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">
                {selectedAction === 'approve' 
                  ? `Approve ${(selectedRequestForAction as any).proposedAction ? (selectedRequestForAction as any).proposedAction.charAt(0).toUpperCase() + (selectedRequestForAction as any).proposedAction.slice(1) : ''} Request`
                  : 'Reject Request'
                }
              </h3>
              
              {/* Show proposed action details */}
              {selectedAction === 'approve' && (selectedRequestForAction as any).proposedAction && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-sm font-medium text-gray-700">Proposed Action:</span>
                    {getProposedActionBadge((selectedRequestForAction as any).proposedAction)}
                  </div>
                  <p className="text-xs text-gray-600">{selectedRequestForAction.description}</p>
                </div>
              )}
              
              {/* Auto-populated approver name */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Approver Name
                </label>
                <input
                  type="text"
                  value={approverName}
                  onChange={(e) => setApproverName(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 text-gray-900"
                  placeholder="Your name will be recorded"
                />
              </div>
              
              {/* Comments/Remarks */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {selectedAction === 'approve' ? 'Approval Comments (Optional)' : 'Rejection Reason (Required)'}
                </label>
                <textarea
                  value={actionComment}
                  onChange={(e) => setActionComment(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                  rows={4}
                  placeholder={selectedAction === 'approve' 
                    ? 'Add any comments about this approval...' 
                    : 'Please provide a reason for rejection...'
                  }
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowActionModal(false);
                    setActionComment('');
                    setSelectedRequestForAction(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleActionSubmit}
                  disabled={selectedAction === 'reject' && !actionComment.trim()}
                  className={`px-4 py-2 rounded-lg text-white ${
                    selectedAction === 'approve' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {selectedAction === 'approve' 
                    ? `Approve ${(selectedRequestForAction as any).proposedAction ? (selectedRequestForAction as any).proposedAction.charAt(0).toUpperCase() + (selectedRequestForAction as any).proposedAction.slice(1) : 'Request'}`
                    : `Reject with ${approverName}`
                  }
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PendingApprovals;
