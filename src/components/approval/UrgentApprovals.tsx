'use client';

import React, { useState, useEffect } from 'react';
import ApprovalSidebar from './ApprovalSidebar';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  X, 
  User,
  DollarSign,
  Calendar,
  Zap,
  ArrowRight
} from 'lucide-react';
import type { ApprovalRequest } from '@/types/approval';

const UrgentApprovals: React.FC = () => {
  const [urgentRequests, setUrgentRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch real-time urgent approval data
  const fetchUrgentApprovals = async () => {
    try {
      const response = await fetch('/api/approvals?priority=urgent');
      const result = await response.json();
      
      if (result.success && result.data) {
        const urgentApprovals = result.data.approvals.filter((approval: any) => 
          approval.priority === 'urgent' && approval.status === 'pending'
        ).map((approval: any) => ({
          ...approval,
          submittedAt: new Date(approval.submittedAt),
          dueDate: approval.dueDate ? new Date(approval.dueDate) : undefined
        }));
        
        setUrgentRequests(urgentApprovals);
      }
    } catch (error) {
      console.error('Error fetching urgent approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUrgentApprovals();
    
    // Set up polling for real-time updates every 10 seconds
    const interval = setInterval(fetchUrgentApprovals, 10000);
    
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

  const handleQuickApprove = (requestId: string) => {
    console.log('Quick approve request:', requestId);
    // Implement quick approve logic
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

  const getTimeRemaining = (dueDate: Date) => {
    const now = new Date();
    const diff = dueDate.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diff < 0) {
      return { text: 'OVERDUE', color: 'text-red-600', bgColor: 'bg-red-100' };
    } else if (hours < 2) {
      return { text: `${hours}h ${minutes}m`, color: 'text-red-600', bgColor: 'bg-red-100' };
    } else if (hours < 24) {
      return { text: `${hours}h ${minutes}m`, color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    } else {
      const days = Math.floor(hours / 24);
      return { text: `${days}d ${hours % 24}h`, color: 'text-green-600', bgColor: 'bg-green-100' };
    }
  };

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <ApprovalSidebar pendingCount={12} urgentCount={urgentRequests.length} />
      
      {/* Main Content */}
      <div className="ml-64 flex-1 p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-8 h-8 text-red-600" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Urgent Approvals</h1>
                  <p className="text-gray-600 mt-1">Critical requests requiring immediate attention</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="bg-red-100 border border-red-200 rounded-lg px-4 py-2">
                <span className="text-red-800 font-semibold text-sm">
                  {urgentRequests.length} urgent request(s)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Alert Banner */}
        <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                <span className="font-medium">Attention:</span> These requests have urgent priority or are approaching SLA deadlines. 
                Review and take action immediately to maintain service levels.
              </p>
            </div>
          </div>
        </div>

        {/* Urgent Requests Cards */}
        <div className="space-y-6">
          {urgentRequests.map((request) => {
            const timeRemaining = getTimeRemaining(request.dueDate!);
            
            return (
              <div key={request.id} className="bg-white rounded-xl shadow-sm border-l-4 border-red-500 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  {/* Request Details */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="text-lg font-semibold text-blue-600 hover:text-blue-800 cursor-pointer">
                        {request.requestId}
                      </span>
                      <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-semibold uppercase">
                        {request.priority}
                      </span>
                      <span className="capitalize bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs font-medium">
                        {request.type}
                      </span>
                    </div>
                    
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{request.title}</h3>
                    <p className="text-gray-600 mb-4">{request.description}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      {/* Requester */}
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{request.requester.name}</p>
                          <p className="text-xs text-gray-500">{request.requester.department}</p>
                        </div>
                      </div>
                      
                      {/* Amount */}
                      {request.amount && (
                        <div className="flex items-center space-x-2">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {formatCurrency(request.amount, request.currency)}
                            </p>
                            <p className="text-xs text-gray-500">Amount</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Due Date */}
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {formatDate(request.dueDate!)}
                          </p>
                          <p className="text-xs text-gray-500">Due Date</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Time Remaining */}
                    <div className="flex items-center space-x-2 mb-4">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${timeRemaining.bgColor} ${timeRemaining.color}`}>
                        {timeRemaining.text} remaining
                      </span>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex flex-col space-y-2 ml-6">
                    <button
                      onClick={() => handleQuickApprove(request.id)}
                      className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                      <Zap className="w-4 h-4" />
                      <span>Quick Approve</span>
                    </button>
                    
                    <button
                      onClick={() => handleApprove(request.id)}
                      className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Review & Approve</span>
                    </button>
                    
                    <button
                      onClick={() => handleReject(request.id)}
                      className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      <span>Reject</span>
                    </button>
                    
                    <button className="flex items-center space-x-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <span>View Details</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {urgentRequests.length === 0 && (
          <div className="text-center py-12">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Urgent Approvals</h3>
            <p className="text-gray-600">Great! All urgent requests have been processed.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UrgentApprovals;
