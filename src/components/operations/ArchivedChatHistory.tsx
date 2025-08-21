'use client';

import React, { useState, useEffect } from 'react';
import { FaComments, FaCalendarAlt, FaUser, FaBuilding, FaEye, FaTimes, FaClock, FaFilter } from 'react-icons/fa';

interface ChatMessage {
  _id?: string;
  queryId: string;
  message: string;
  sender: string;
  senderRole: string;
  team: string;
  timestamp: Date | string;
  actionType?: string;
}

interface ArchivedChat {
  _id: string;
  queryId: string;
  appNo: string;
  customerName: string;
  queryTitle: string;
  queryStatus: string;
  markedForTeam: string;
  messages: ChatMessage[];
  createdAt: Date | string;
  updatedAt: Date | string;
  archivedAt: Date | string;
  archiveReason: string;
}

export default function ArchivedChatHistory() {
  const [archivedChats, setArchivedChats] = useState<ArchivedChat[]>([]);
  const [filteredChats, setFilteredChats] = useState<ArchivedChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChat, setSelectedChat] = useState<ArchivedChat | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Filter states
  const [filters, setFilters] = useState({
    appNo: '',
    customerName: '',
    team: '',
    archiveReason: '',
    dateFrom: '',
    dateTo: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  // Fetch archived chats
  const fetchArchivedChats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams();
      if (filters.appNo) params.append('appNo', filters.appNo);
      if (filters.customerName) params.append('customerName', filters.customerName);
      if (filters.team) params.append('markedForTeam', filters.team);
      if (filters.archiveReason) params.append('archiveReason', filters.archiveReason);
      params.append('limit', '100');

      const response = await fetch(`/api/chat-archives?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setArchivedChats(data.data || []);
        setFilteredChats(data.data || []);
      } else {
        setError(data.error || 'Failed to fetch archived chats');
      }
    } catch (err) {
      console.error('Error fetching archived chats:', err);
      setError('Failed to load archived chat histories');
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  const applyFilters = () => {
    let filtered = [...archivedChats];

    // Date range filter
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(chat => new Date(chat.archivedAt) >= fromDate);
    }
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      filtered = filtered.filter(chat => new Date(chat.archivedAt) <= toDate);
    }

    setFilteredChats(filtered);
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      appNo: '',
      customerName: '',
      team: '',
      archiveReason: '',
      dateFrom: '',
      dateTo: ''
    });
    setFilteredChats(archivedChats);
  };

  // View chat details
  const viewChatDetails = (chat: ArchivedChat) => {
    setSelectedChat(chat);
    setShowModal(true);
  };

  // Format date
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'deferred': return 'bg-yellow-100 text-yellow-800';
      case 'otc': return 'bg-blue-100 text-blue-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get team color
  const getTeamColor = (team: string) => {
    switch (team.toLowerCase()) {
      case 'sales': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'credit': return 'bg-green-50 text-green-700 border-green-200';
      case 'both': return 'bg-purple-50 text-purple-700 border-purple-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  // Get message sender color
  const getSenderColor = (senderRole: string) => {
    switch (senderRole?.toLowerCase()) {
      case 'operations': return 'bg-purple-50 border-purple-200 text-purple-900';
      case 'sales': return 'bg-blue-50 border-blue-200 text-blue-900';
      case 'credit': return 'bg-green-50 border-green-200 text-green-900';
      default: return 'bg-gray-50 border-gray-200 text-gray-900';
    }
  };

  useEffect(() => {
    fetchArchivedChats();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, archivedChats]);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FaComments className="text-2xl text-blue-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Archived Chat Histories</h1>
              <p className="text-sm text-gray-600">Chat histories from approved/resolved queries</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                showFilters ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FaFilter />
              Filters
            </button>
            <button
              onClick={fetchArchivedChats}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <input
                type="text"
                placeholder="App No"
                value={filters.appNo}
                onChange={(e) => setFilters({ ...filters, appNo: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <input
                type="text"
                placeholder="Customer Name"
                value={filters.customerName}
                onChange={(e) => setFilters({ ...filters, customerName: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <select
                value={filters.team}
                onChange={(e) => setFilters({ ...filters, team: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">All Teams</option>
                <option value="sales">Sales</option>
                <option value="credit">Credit</option>
                <option value="both">Both</option>
              </select>
              <select
                value={filters.archiveReason}
                onChange={(e) => setFilters({ ...filters, archiveReason: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">All Statuses</option>
                <option value="approved">Approved</option>
                <option value="deferred">Deferred</option>
                <option value="otc">OTC</option>
                <option value="rejected">Rejected</option>
              </select>
              <input
                type="date"
                placeholder="From Date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <input
                type="date"
                placeholder="To Date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={resetFilters}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Reset
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-gray-600">Loading archived chats...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-red-500 mb-2">⚠️ Error</div>
            <p className="text-gray-600">{error}</p>
            <button
              onClick={fetchArchivedChats}
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="text-center py-12">
            <FaComments className="text-4xl text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Archived Chats Found</h3>
            <p className="text-gray-600">No chat histories match your current filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredChats.map((chat) => (
              <div
                key={chat._id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{chat.appNo}</h3>
                    <p className="text-sm text-gray-600 mb-2">{chat.customerName}</p>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(chat.archiveReason)}`}>
                        {chat.archiveReason.charAt(0).toUpperCase() + chat.archiveReason.slice(1)}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded border ${getTeamColor(chat.markedForTeam)}`}>
                        {chat.markedForTeam.charAt(0).toUpperCase() + chat.markedForTeam.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <FaComments />
                    <span>{chat.messages.length} messages</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FaCalendarAlt />
                    <span>Archived: {formatDate(chat.archivedAt)}</span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-sm text-gray-700 line-clamp-2 mb-2">{chat.queryTitle}</p>
                  <button
                    onClick={() => viewChatDetails(chat)}
                    className="w-full px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 flex items-center justify-center gap-2"
                  >
                    <FaEye />
                    View Chat History
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chat Details Modal */}
      {showModal && selectedChat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Chat History - {selectedChat.appNo}</h2>
                <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                  <span>{selectedChat.customerName}</span>
                  <span className={`px-2 py-1 rounded-full ${getStatusColor(selectedChat.archiveReason)}`}>
                    {selectedChat.archiveReason.charAt(0).toUpperCase() + selectedChat.archiveReason.slice(1)}
                  </span>
                  <span>Archived: {formatDate(selectedChat.archivedAt)}</span>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <FaTimes className="text-gray-500" />
              </button>
            </div>

            {/* Query Info */}
            <div className="p-4 bg-blue-50 border-b border-blue-200">
              <p className="text-sm text-blue-800">{selectedChat.queryTitle}</p>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {selectedChat.messages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FaComments className="text-3xl mx-auto mb-2 text-gray-300" />
                  <p>No messages in this chat history</p>
                </div>
              ) : (
                selectedChat.messages.map((message, index) => (
                  <div key={index} className={`p-4 rounded-lg border ${getSenderColor(message.senderRole)}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {message.team} - {message.sender}
                        </span>
                        <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                          {message.senderRole}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <FaClock />
                        <span>{formatDate(message.timestamp)}</span>
                      </div>
                    </div>
                    <p className="text-gray-800 whitespace-pre-wrap">{message.message}</p>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
