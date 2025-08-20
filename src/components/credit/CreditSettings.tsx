'use client';

import React, { useState, useEffect } from 'react';
import { 
  FaCog, 
  FaUser, 
  FaBell, 
  FaShieldAlt, 
  FaChartLine,
  FaSave,
  FaUndo,
  FaExclamationTriangle,
  FaCheckCircle
} from 'react-icons/fa';

interface CreditSettingsProps {
  refreshTrigger?: number;
  onRefresh?: () => void;
}

interface CreditSettings {
  notifications: {
    emailAlerts: boolean;
    smsAlerts: boolean;
    dashboardNotifications: boolean;
    highRiskAlerts: boolean;
    approvalNotifications: boolean;
  };
  riskParameters: {
    lowRiskThreshold: number;
    mediumRiskThreshold: number;
    highRiskThreshold: number;
    autoApprovalLimit: number;
    manualReviewRequired: boolean;
  };
  workflowSettings: {
    autoAssignQueries: boolean;
    escalationTimeout: number;
    requireDualApproval: boolean;
    allowBulkActions: boolean;
  };
  displaySettings: {
    itemsPerPage: number;
    defaultSortOrder: string;
    showAdvancedFilters: boolean;
    compactView: boolean;
  };
  integrationSettings: {
    cibilIntegration: boolean;
    equifaxIntegration: boolean;
    experianIntegration: boolean;
    realTimeScoring: boolean;
  };
}

const CreditSettings: React.FC<CreditSettingsProps> = ({
  refreshTrigger = 0,
  onRefresh
}) => {
  const [settings, setSettings] = useState<CreditSettings>({
    notifications: {
      emailAlerts: true,
      smsAlerts: false,
      dashboardNotifications: true,
      highRiskAlerts: true,
      approvalNotifications: true
    },
    riskParameters: {
      lowRiskThreshold: 80,
      mediumRiskThreshold: 60,
      highRiskThreshold: 40,
      autoApprovalLimit: 500000,
      manualReviewRequired: true
    },
    workflowSettings: {
      autoAssignQueries: true,
      escalationTimeout: 24,
      requireDualApproval: false,
      allowBulkActions: true
    },
    displaySettings: {
      itemsPerPage: 20,
      defaultSortOrder: 'newest',
      showAdvancedFilters: true,
      compactView: false
    },
    integrationSettings: {
      cibilIntegration: true,
      equifaxIntegration: false,
      experianIntegration: false,
      realTimeScoring: true
    }
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/settings?team=credit');
      const result = await response.json();
      
      if (result.success) {
        setSettings(result.data);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [refreshTrigger]);

  const handleSettingChange = (section: keyof CreditSettings, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
    setHasChanges(true);
    setSaveStatus('idle');
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team: 'credit',
          settings
        })
      });
      
      if (response.ok) {
        setHasChanges(false);
        setSaveStatus('success');
        onRefresh?.();
        
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetSettings = () => {
    loadSettings();
    setHasChanges(false);
    setSaveStatus('idle');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <span className="ml-3 text-green-600 font-medium">Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Credit Settings</h1>
            <p className="text-gray-600">Configure your credit dashboard preferences and parameters</p>
          </div>
          
          <div className="flex items-center space-x-3">
            {hasChanges && (
              <button
                onClick={handleResetSettings}
                className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                <FaUndo className="h-4 w-4 mr-2" />
                Reset
              </button>
            )}
            
            <button
              onClick={handleSaveSettings}
              disabled={!hasChanges || saving}
              className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                hasChanges
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <FaSave className={`h-4 w-4 mr-2 ${saving ? 'animate-spin' : ''}`} />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Save Status */}
        {saveStatus !== 'idle' && (
          <div className={`mb-6 p-4 rounded-md flex items-center ${
            saveStatus === 'success' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {saveStatus === 'success' ? (
              <FaCheckCircle className="h-5 w-5 mr-2" />
            ) : (
              <FaExclamationTriangle className="h-5 w-5 mr-2" />
            )}
            {saveStatus === 'success' 
              ? 'Settings saved successfully!' 
              : 'Failed to save settings. Please try again.'
            }
          </div>
        )}

        <div className="space-y-6">
          {/* Notification Settings */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center mb-6">
              <FaBell className="h-6 w-6 text-green-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">Notification Settings</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(settings.notifications).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </label>
                    <p className="text-xs text-gray-500">
                      {key === 'emailAlerts' && 'Receive email notifications for important updates'}
                      {key === 'smsAlerts' && 'Get SMS notifications for urgent matters'}
                      {key === 'dashboardNotifications' && 'Show notifications in dashboard'}
                      {key === 'highRiskAlerts' && 'Alert for high-risk applications'}
                      {key === 'approvalNotifications' && 'Notify on approval/rejection decisions'}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => handleSettingChange('notifications', key, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Risk Parameters */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center mb-6">
              <FaShieldAlt className="h-6 w-6 text-green-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">Risk Assessment Parameters</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Low Risk Threshold (Score ≥)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.riskParameters.lowRiskThreshold}
                  onChange={(e) => handleSettingChange('riskParameters', 'lowRiskThreshold', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Medium Risk Threshold (Score ≥)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.riskParameters.mediumRiskThreshold}
                  onChange={(e) => handleSettingChange('riskParameters', 'mediumRiskThreshold', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  High Risk Threshold (Score &lt;)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.riskParameters.highRiskThreshold}
                  onChange={(e) => handleSettingChange('riskParameters', 'highRiskThreshold', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Auto Approval Limit (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={settings.riskParameters.autoApprovalLimit}
                  onChange={(e) => handleSettingChange('riskParameters', 'autoApprovalLimit', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              
              <div className="md:col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Manual Review Required for High Risk
                    </label>
                    <p className="text-xs text-gray-500">
                      Require manual review for all high-risk applications
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.riskParameters.manualReviewRequired}
                      onChange={(e) => handleSettingChange('riskParameters', 'manualReviewRequired', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Workflow Settings */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center mb-6">
              <FaCog className="h-6 w-6 text-green-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">Workflow Settings</h2>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Auto-assign Queries</label>
                  <p className="text-xs text-gray-500">Automatically assign new queries to available analysts</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.workflowSettings.autoAssignQueries}
                    onChange={(e) => handleSettingChange('workflowSettings', 'autoAssignQueries', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Escalation Timeout (hours)
                </label>
                <input
                  type="number"
                  min="1"
                  max="168"
                  value={settings.workflowSettings.escalationTimeout}
                  onChange={(e) => handleSettingChange('workflowSettings', 'escalationTimeout', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Time before escalating unresolved queries to management
                </p>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Require Dual Approval</label>
                  <p className="text-xs text-gray-500">Require two approvals for high-value loans</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.workflowSettings.requireDualApproval}
                    onChange={(e) => handleSettingChange('workflowSettings', 'requireDualApproval', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Allow Bulk Actions</label>
                  <p className="text-xs text-gray-500">Enable bulk processing of similar applications</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.workflowSettings.allowBulkActions}
                    onChange={(e) => handleSettingChange('workflowSettings', 'allowBulkActions', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Display Settings */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center mb-6">
              <FaUser className="h-6 w-6 text-green-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">Display Preferences</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Items per Page
                </label>
                <select
                  value={settings.displaySettings.itemsPerPage}
                  onChange={(e) => handleSettingChange('displaySettings', 'itemsPerPage', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Sort Order
                </label>
                <select
                  value={settings.displaySettings.defaultSortOrder}
                  onChange={(e) => handleSettingChange('displaySettings', 'defaultSortOrder', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="priority">Priority</option>
                  <option value="amount">Credit Amount</option>
                </select>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Show Advanced Filters</label>
                  <p className="text-xs text-gray-500">Display additional filtering options</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.displaySettings.showAdvancedFilters}
                    onChange={(e) => handleSettingChange('displaySettings', 'showAdvancedFilters', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Compact View</label>
                  <p className="text-xs text-gray-500">Use compact layout for better space utilization</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.displaySettings.compactView}
                    onChange={(e) => handleSettingChange('displaySettings', 'compactView', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Integration Settings */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center mb-6">
              <FaChartLine className="h-6 w-6 text-green-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">Credit Bureau Integrations</h2>
            </div>
            
            <div className="space-y-6">
              {Object.entries(settings.integrationSettings).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </label>
                    <p className="text-xs text-gray-500">
                      {key === 'cibilIntegration' && 'Enable CIBIL credit score integration'}
                      {key === 'equifaxIntegration' && 'Enable Equifax credit report integration'}
                      {key === 'experianIntegration' && 'Enable Experian credit data integration'}
                      {key === 'realTimeScoring' && 'Enable real-time credit score updates'}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => handleSettingChange('integrationSettings', key, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreditSettings;
