'use client';

import React from 'react';
import { 
  MessageSquare,
  CheckCircle,
  Badge
} from 'lucide-react';
import { CreditTabType } from './CreditDashboard';

interface CreditSidebarProps {
  activeTab: CreditTabType;
  onTabChange: (tab: CreditTabType) => void;
  newQueriesCount: number;
}

export default function CreditSidebar({ 
  activeTab, 
  onTabChange, 
  newQueriesCount 
}: CreditSidebarProps) {
  const tabs = [
    {
      id: 'queries-raised' as CreditTabType,
      label: 'Queries Raised',
      icon: MessageSquare,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      description: 'Incoming Queries',
      badge: newQueriesCount > 0 ? newQueriesCount : null
    },
    {
      id: 'queries-resolved' as CreditTabType,
      label: 'Queries Resolved',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      description: 'Resolved Cases'
    }
  ];

  return (
    <div className="hidden lg:flex lg:flex-shrink-0">
      <div className="flex flex-col w-72">
        <div className="flex-1 min-h-0 border-r border-gray-200 bg-white">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4 mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Credit Team</h2>
            </div>
            
            <nav className="mt-5 flex-1 px-2 space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`group flex items-center w-full px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                      isActive
                        ? `${tab.bgColor} ${tab.color} shadow-sm`
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon
                      className={`flex-shrink-0 mr-3 h-5 w-5 transition-colors ${
                        isActive ? tab.color : 'text-gray-400 group-hover:text-gray-500'
                      }`}
                    />
                    <div className="flex-1 text-left">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{tab.label}</span>
                        {tab.badge && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {tab.badge}
                          </span>
                        )}
                      </div>
                      <p className={`text-xs mt-0.5 ${
                        isActive ? 'text-current opacity-80' : 'text-gray-500'
                      }`}>
                        {tab.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </nav>
            
            {/* Team Info */}
            <div className="flex-shrink-0 px-4 mt-6 pt-4 border-t border-gray-200">
              <div className="bg-green-50 rounded-lg p-3">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Badge className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-900">
                      Credit Team
                    </p>
                    <p className="text-xs text-green-700">
                      Risk Assessment System
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
