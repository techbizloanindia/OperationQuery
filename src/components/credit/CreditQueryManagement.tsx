'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  FaSearch, 
  FaFilter, 
  FaEye, 
  FaCheck, 
  FaTimes, 
  FaClock,
  FaExclamationTriangle,
  FaUser,
  FaCalendarAlt,
  FaSort
} from 'react-icons/fa';

interface CreditQueryManagementProps {
  refreshTrigger?: number;
  onRefresh?: () => void;
}

interface QueryItem {
  id: string;
  queryId?: string; // Individual query ID for single query actions
  appNo: string;
  customerName: string;
  branch: string;
  queryText: string;
  status: 'pending' | 'approved' | 'deferred' | 'otc' | 'waived' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  submittedBy: string;
  submittedAt: string;
  assignedTo?: string;
  riskLevel: 'low' | 'medium' | 'high';
  creditAmount: string;
}

const CreditQueryManagement: React.FC<CreditQueryManagementProps> = ({
  refreshTrigger = 0,
  onRefresh
}) => {
  const { user } = useAuth();
  const [queries, setQueries] = useState<QueryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [sortBy, setSortBy] = useState('submittedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedQuery, setSelectedQuery] = useState<QueryItem | null>(null);
  
  // Action modal state
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'deferral' | 'otc' | 'waiver' | null>(null);
  const [selectedPerson, setSelectedPerson] = useState('');
  const [actionRemarks, setActionRemarks] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchQueries = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/queries?team=credit&detailed=true');
      const result = await response.json();
      
      if (result.success) {
        setQueries(result.data.queries || []);
      } else {
        // Demo data fallback
        setQueries([
          {
            id: '1',
            appNo: 'APP001',
            customerName: 'Rajesh Kumar',
            branch: 'Mumbai Central',
            queryText: 'Credit history verification required for loan approval',
            status: 'pending',
            priority: 'high',
            submittedBy: 'Operations Team',
            submittedAt: '2024-08-14T10:30:00Z',
            assignedTo: 'Credit Analyst 1',
            riskLevel: 'medium',
            creditAmount: '₹5,00,000'
          },
          {
            id: '2',
            appNo: 'APP002',
            customerName: 'Priya Sharma',
            branch: 'Delhi NCR',
            queryText: 'Income verification documents need review',
            status: 'pending',
            priority: 'medium',
            submittedBy: 'Operations Team',
            submittedAt: '2024-08-14T09:15:00Z',
            riskLevel: 'low',
            creditAmount: '₹3,00,000'
          },
          {
            id: '3',
            appNo: 'APP003',
            customerName: 'Amit Patel',
            branch: 'Bangalore Tech',
            queryText: 'Collateral valuation confirmation needed',
            status: 'approved',
            priority: 'high',
            submittedBy: 'Operations Team',
            submittedAt: '2024-08-13T16:45:00Z',
            assignedTo: 'Credit Analyst 2',
            riskLevel: 'high',
            creditAmount: '₹15,00,000'
          },
          {
            id: '4',
            appNo: 'APP004',
            customerName: 'Sneha Reddy',
            branch: 'Chennai South',
            queryText: 'Employment verification pending',
            status: 'deferred',
            priority: 'low',
            submittedBy: 'Operations Team',
            submittedAt: '2024-08-13T14:20:00Z',
            riskLevel: 'medium',
            creditAmount: '₹2,50,000'
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching queries:', error);
      // Use demo data on error
      setQueries([
        {
          id: '1',
          appNo: 'APP001',
          customerName: 'Rajesh Kumar',
          branch: 'Mumbai Central',
          queryText: 'Credit history verification required for loan approval',
          status: 'pending',
          priority: 'high',
          submittedBy: 'Operations Team',
          submittedAt: '2024-08-14T10:30:00Z',
          assignedTo: 'Credit Analyst 1',
          riskLevel: 'medium',
          creditAmount: '₹5,00,000'
        },
        {
          id: '2',
          appNo: 'APP002',
          customerName: 'Priya Sharma',
          branch: 'Delhi NCR',
          queryText: 'Income verification documents need review',
          status: 'pending',
          priority: 'medium',
          submittedBy: 'Operations Team',
          submittedAt: '2024-08-14T09:15:00Z',
          riskLevel: 'low',
          creditAmount: '₹3,00,000'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueries();
  }, [refreshTrigger]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'deferred': return 'bg-orange-100 text-orange-800';
      case 'otc': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredQueries = queries.filter(query => {
    const matchesSearch = query.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          query.appNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          query.queryText.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || query.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || query.priority === priorityFilter;
    const matchesRisk = riskFilter === 'all' || query.riskLevel === riskFilter;
    
    return matchesSearch && matchesStatus && matchesPriority && matchesRisk;
  });

  const sortedQueries = [...filteredQueries].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'submittedAt':
        aValue = new Date(a.submittedAt).getTime();
        bValue = new Date(b.submittedAt).getTime();
        break;
      case 'customerName':
        aValue = a.customerName.toLowerCase();
        bValue = b.customerName.toLowerCase();
        break;
      case 'priority':
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        aValue = priorityOrder[a.priority as keyof typeof priorityOrder];
        bValue = priorityOrder[b.priority as keyof typeof priorityOrder];
        break;
      default:
        aValue = a[sortBy as keyof QueryItem];
        bValue = b[sortBy as keyof QueryItem];
    }
    
    if (!aValue || !bValue) return 0;
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const handleApproveQuery = async (queryId: string) => {
    try {
      const response = await fetch('/api/query-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queryId,
          action: 'approve',
          team: 'Credit'
        })
      });
      
      if (response.ok) {
        fetchQueries();
        onRefresh?.();
      }
    } catch (error) {
      console.error('Error approving query:', error);
    }
  };

  const handleDeferQuery = async (queryId: string) => {
    try {
      const response = await fetch('/api/query-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queryId,
          action: 'deferral',
          team: 'Credit'
        })
      });
      
      if (response.ok) {
        fetchQueries();
        onRefresh?.();
      }
    } catch (error) {
      console.error('Error deferring query:', error);
    }
  };

  // New unified action handlers
  const handleAction = (type: 'approve' | 'deferral' | 'otc' | 'waiver', query: QueryItem) => {
    setSelectedQuery(query);
    setActionType(type);
    setActionRemarks('');
    setSelectedPerson('');
    setShowActionModal(true);
  };

  const handleSubmitAction = async () => {
    if (!selectedQuery || !actionType) return;
    
    // Validation
    if (!actionRemarks.trim()) {
      alert('Remarks are required for all actions.');
      return;
    }

    // For waiver actions, person assignment is not required
    if ((actionType === 'approve' || actionType === 'deferral' || actionType === 'otc') && !selectedPerson.trim()) {
      alert('Person assignment is required for approval, deferral and OTC actions.');
      return;
    }

    setIsProcessing(true);

    try {
      // Use individual query ID (correct approach)
      const individualQueryId = selectedQuery.queryId || selectedQuery.id;
      console.log(`🎯 Processing individual query: ${individualQueryId} for app: ${selectedQuery.appNo}`);
      
      const requestBody: any = {
        queryId: individualQueryId,
        action: actionType,
        remarks: actionRemarks,
        creditTeamMember: user?.name || 'Credit Team Member',
        team: 'Credit'
      };

      if (selectedPerson.trim()) {
        requestBody.assignedTo = selectedPerson;
      }

      const response = await fetch('/api/query-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit action');
      }
      
      const result = await response.json();
      console.log('✅ Credit action completed successfully:', result);
      
      // Close modal and refresh data
      setShowActionModal(false);
      setActionRemarks('');
      setSelectedPerson('');
      setSelectedQuery(null);
      
      fetchQueries();
      onRefresh?.();
      
      // Show success message with single query indication
      let message = '';
      const person = selectedPerson.trim();
      
      switch (actionType) {
        case 'waiver':
          message = `Single query waived successfully! Query moved to Credit resolved section. ✅`;
          break;
        case 'approve':
          message = `Single query approved successfully! Query moved to Credit resolved section. ✅`;
          break;
        case 'deferral':
          message = `Single query deferred to ${person} successfully! Query moved to Credit resolved section. 📋`;
          break;
        case 'otc':
          message = `Single query OTC assigned to ${person} successfully! Query moved to Credit resolved section. 🏢`;
          break;
        default:
          message = `Single query ${actionType} action completed successfully! Query moved to Credit resolved section.`;
      }
      
      alert(message);
      
    } catch (error) {
      console.error('Credit action failed:', error);
      alert(`Failed to ${actionType} query: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <span className="ml-3 text-green-600 font-medium">Loading queries...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Query Management</h1>
          <p className="text-gray-600">Manage and track credit assessment queries</p>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl p-6 shadow-lg mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search queries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="deferred">Deferred</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="all">All Priority</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Risk Filter */}
            <div>
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="all">All Risk</option>
                <option value="high">High Risk</option>
                <option value="medium">Medium Risk</option>
                <option value="low">Low Risk</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field);
                  setSortOrder(order as 'asc' | 'desc');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="submittedAt-desc">Latest First</option>
                <option value="submittedAt-asc">Oldest First</option>
                <option value="priority-desc">High Priority First</option>
                <option value="customerName-asc">Customer A-Z</option>
              </select>
            </div>
          </div>
        </div>

        {/* Query List */}
        <div className="space-y-4">
          {sortedQueries.map((query) => (
            <div key={query.id} className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-4 mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">{query.appNo}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(query.status)}`}>
                      {query.status.toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(query.riskLevel)}`}>
                      {query.riskLevel.toUpperCase()} RISK
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Customer</p>
                      <p className="font-medium text-gray-900">{query.customerName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Branch</p>
                      <p className="font-medium text-gray-900">{query.branch}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Credit Amount</p>
                      <p className="font-medium text-gray-900">{query.creditAmount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Priority</p>
                      <p className={`font-medium ${getPriorityColor(query.priority)}`}>
                        {query.priority.toUpperCase()}
                      </p>
                    </div>
                  </div>
                  
                  <p className="text-gray-700 mb-3">{query.queryText}</p>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <FaUser className="h-4 w-4 mr-1" />
                      <span>{query.submittedBy}</span>
                    </div>
                    <div className="flex items-center">
                      <FaCalendarAlt className="h-4 w-4 mr-1" />
                      <span>{new Date(query.submittedAt).toLocaleDateString()}</span>
                    </div>
                    {query.assignedTo && (
                      <div className="flex items-center">
                        <FaUser className="h-4 w-4 mr-1" />
                        <span>Assigned to: {query.assignedTo}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 mt-4 lg:mt-0">
                  <button
                    onClick={() => setSelectedQuery(query)}
                    className="flex items-center px-3 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                  >
                    <FaEye className="h-4 w-4 mr-1" />
                    View
                  </button>
                  
                  {query.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleAction('approve', query)}
                        className="px-4 py-2 text-sm font-bold text-green-900 bg-green-200 border border-green-400 rounded-full hover:bg-green-300 transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-sm"
                      >
                        Approved
                      </button>
                      
                      <button
                        onClick={() => handleAction('otc', query)}
                        className="px-4 py-2 text-sm font-bold text-blue-900 bg-blue-200 border border-blue-400 rounded-full hover:bg-blue-300 transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-sm"
                      >
                        OTC
                      </button>
                      
                      <button
                        onClick={() => handleAction('deferral', query)}
                        className="px-4 py-2 text-sm font-bold text-orange-900 bg-orange-200 border border-orange-400 rounded-full hover:bg-orange-300 transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-sm"
                      >
                        Deferral
                      </button>

                      <button
                        onClick={() => handleAction('waiver', query)}
                        className="px-4 py-2 text-sm font-bold text-purple-900 bg-purple-200 border border-purple-400 rounded-full hover:bg-purple-300 transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-sm"
                      >
                        Waiver
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {sortedQueries.length === 0 && (
            <div className="text-center py-12">
              <FaExclamationTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No queries found</h3>
              <p className="text-gray-600">Try adjusting your search criteria or filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* Credit Action Modal */}
      {showActionModal && selectedQuery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold mb-4 text-black">
              {actionType === 'approve' && 'Approve Query - Credit Team'}
              {actionType === 'deferral' && 'Deferral Action - Credit Team'}
              {actionType === 'otc' && 'OTC Action - Credit Team'}
              {actionType === 'waiver' && 'Waiver Query - Credit Team'}
            </h3>
            
            <div className="space-y-4">
              {/* Display query details */}
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm text-gray-600">Query for: <span className="font-semibold">{selectedQuery.appNo}</span></p>
                <p className="text-sm text-gray-600">Customer: <span className="font-semibold">{selectedQuery.customerName}</span></p>
              </div>

              {/* Display credit user name for all actions */}
              <div>
                <label className="block text-sm font-bold text-black">Credit Team Member</label>
                <input
                  type="text"
                  value="Credit Team"
                  disabled
                  className="mt-1 block w-full pl-3 pr-3 py-3 text-gray-700 bg-gray-100 border-2 border-gray-300 rounded-md font-bold cursor-not-allowed"
                />
              </div>

              {/* Assignment field for approve, deferral and otc */}
              {(actionType === 'approve' || actionType === 'deferral' || actionType === 'otc') && (
                <div>
                  <label className="block text-sm font-bold text-black">
                    {actionType === 'approve' ? 'Approval Name' : actionType === 'deferral' ? 'Deferral Name' : 'OTC Name'} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedPerson}
                    onChange={(e) => setSelectedPerson(e.target.value)}
                    className="mt-1 shadow-sm focus:ring-green-500 focus:border-green-500 block w-full text-black bg-white border-2 border-gray-300 rounded-md p-3 font-bold"
                    style={{ color: '#000000', backgroundColor: '#ffffff', fontWeight: '700' }}
                    required
                  >
                    <option value="">Select a person...</option>
                    <option value="Abhishek Mishra">Abhishek Mishra</option>
                    <option value="Aarti Pujara - Credit Manager">Aarti Pujara - Credit Manager</option>
                    <option value="Sumit Khari - Sales Manager">Sumit Khari - Sales Manager</option>
                    <option value="Rahul Jain">Rahul Jain</option>
                    <option value="Vikram Diwan">Vikram Diwan</option>
                    <option value="Puneet Chadha">Puneet Chadha</option>
                    <option value="Mohan Keswani">Mohan Keswani</option>
                  </select>
                </div>
              )}

              {/* Waiver By field for waiver actions */}
              {actionType === 'waiver' && (
                <div>
                  <label className="block text-sm font-bold text-black">
                    Waiver By
                  </label>
                  <select
                    value={selectedPerson}
                    onChange={(e) => setSelectedPerson(e.target.value)}
                    className="mt-1 shadow-sm focus:ring-purple-500 focus:border-purple-500 block w-full text-black bg-white border-2 border-gray-300 rounded-md p-3 font-bold"
                    style={{ color: '#000000', backgroundColor: '#ffffff', fontWeight: '700' }}
                  >
                    <option value="">Select approver...</option>
                    <option value="Abhishek Mishra">Abhishek Mishra</option>
                    <option value="Aarti Pujara - Credit Manager">Aarti Pujara - Credit Manager</option>
                    <option value="Sumit Khari - Sales Manager">Sumit Khari - Sales Manager</option>
                    <option value="Rahul Jain">Rahul Jain</option>
                    <option value="Vikram Diwan">Vikram Diwan</option>
                    <option value="Puneet Chadha">Puneet Chadha</option>
                    <option value="Mohan Keswani">Mohan Keswani</option>
                  </select>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-bold text-black">
                  Remarks <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={actionRemarks}
                  onChange={(e) => setActionRemarks(e.target.value)}
                  rows={4} 
                  className="mt-1 shadow-sm focus:ring-green-500 focus:border-green-500 block w-full text-black bg-white border-2 border-gray-300 rounded-md p-3 font-bold"
                  placeholder="Enter your remarks... (required)"
                  style={{ color: '#000000', backgroundColor: '#ffffff', fontWeight: '700' }}
                  required
                />
              </div>
            </div>
              
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowActionModal(false);
                  setActionRemarks('');
                  setSelectedPerson('');
                  setSelectedQuery(null);
                }}
                className="bg-gray-200 text-black px-4 py-2 rounded-md hover:bg-gray-300 transition-colors font-bold"
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitAction}
                disabled={isProcessing || !actionRemarks.trim() || ((actionType === 'approve' || actionType === 'deferral' || actionType === 'otc' || actionType === 'waiver') && !selectedPerson.trim())}
                className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 disabled:opacity-50 transition-colors font-bold"
              >
                {isProcessing ? 'Processing...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditQueryManagement;
