'use client';

import React, { useState } from 'react';
import { RefreshCw, Bell, User, ChevronDown, Building2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import NotificationCenter from '@/components/shared/NotificationCenter';

interface SalesNavbarProps {
  assignedBranches: string[];
  onRefresh: () => void;
  isRefreshing: boolean;
  lastRefreshed: Date;
  searchAppNo?: string;
  onAppNoSearch?: (appNo: string) => void;
  onClearFilter?: () => void;
}

export default function SalesNavbar({ 
  assignedBranches, 
  onRefresh, 
  isRefreshing, 
  lastRefreshed,
  searchAppNo = '',
  onAppNoSearch,
  onClearFilter
}: SalesNavbarProps) {
  const { user, logout } = useAuth();
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [localSearchTerm, setLocalSearchTerm] = useState(searchAppNo);

  const formatLastRefreshed = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const handleLogout = () => {
    logout();
    // Redirect to login page
    window.location.href = '/login';
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onAppNoSearch) {
      onAppNoSearch(localSearchTerm.trim());
    }
  };

  const handleClearSearch = () => {
    setLocalSearchTerm('');
    if (onClearFilter) {
      onClearFilter();
    }
  };

  return (
    <nav className="navbar sales-navbar bg-white shadow-sm border-b border-gray-200">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Logo and Title */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg">
                  <span className="text-white font-bold text-lg">B</span>
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold text-blue-600" style={{ color: '#2563eb !important' }}>BizLoan</h1>
                <p className="text-sm text-gray-500" style={{ color: '#6b7280 !important' }}>Sales Dashboard</p>
              </div>
            </div>
            
            {/* Refresh button */}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${
                isRefreshing ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="font-medium">Refresh</span>
            </button>

            {/* Last refreshed indicator */}
            <span className="text-sm font-medium text-gray-700 bg-gray-50 px-3 py-1 rounded-full" style={{ color: '#374151 !important', backgroundColor: '#f9fafb !important' }}>
              Last updated: {formatLastRefreshed(lastRefreshed)}
            </span>

            {/* App Number Search */}
            <form onSubmit={handleSearchSubmit} className="flex items-center space-x-2">
              <div className="relative">
                <input
                  type="text"
                  value={localSearchTerm}
                  onChange={(e) => setLocalSearchTerm(e.target.value)}
                  placeholder="Search by App No..."
                  className="w-48 px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-md placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  style={{ color: '#111827 !important', backgroundColor: '#ffffff !important' }}
                />
                {localSearchTerm && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                style={{ backgroundColor: '#2563eb !important', color: '#ffffff !important' }}
              >
                Search
              </button>
            </form>
          </div>

          {/* Right side - Branches, Notifications, Settings, Profile */}
          <div className="flex items-center space-x-4">
            {/* Assigned Branches Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowBranchDropdown(!showBranchDropdown)}
                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <Building2 className="h-4 w-4" />
                <span>Branches ({assignedBranches.length})</span>
                <ChevronDown className="h-4 w-4" />
              </button>
              
              {showBranchDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                  <div className="py-2 px-3 border-b border-gray-200">
                    <h3 className="text-sm font-medium text-gray-900">Assigned Branches</h3>
                  </div>
                  <div className="py-1 max-h-60 overflow-y-auto">
                    {assignedBranches.length > 0 ? (
                      assignedBranches.map((branch, index) => (
                        <div
                          key={index}
                          className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                        >
                          <Building2 className="h-3 w-3 text-gray-400" />
                          <span>{branch}</span>
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-gray-500">
                        No branches assigned
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Notifications */}
            <NotificationCenter team="sales" />


            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <User className="h-5 w-5" />
                {user && (
                  <span className="text-sm font-medium text-gray-700">
                    {user.name}
                  </span>
                )}
                <ChevronDown className="h-4 w-4" />
              </button>
              
              {showProfileDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                  {user && (
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.role}</p>
                      {user.branch && (
                        <p className="text-xs text-gray-500">{user.branch}</p>
                      )}
                    </div>
                  )}
                  <div className="py-1">
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {(showBranchDropdown || showProfileDropdown) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowBranchDropdown(false);
            setShowProfileDropdown(false);
          }}
        />
      )}
    </nav>
  );
}