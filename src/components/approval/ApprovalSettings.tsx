'use client'

import { useState } from 'react'

export default function ApprovalSettings() {
  const [settings, setSettings] = useState({
    autoApproval: false,
    approvalThreshold: 10000,
    notificationEmails: true,
    escalationTimeout: 24
  })

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Approval Settings</h1>
      
      <div className="space-y-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">General Settings</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Auto Approval</label>
              <input
                type="checkbox"
                checked={settings.autoApproval}
                onChange={(e) => handleSettingChange('autoApproval', e.target.checked)}
                className="rounded"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Approval Threshold</label>
              <input
                type="number"
                value={settings.approvalThreshold}
                onChange={(e) => handleSettingChange('approvalThreshold', Number(e.target.value))}
                className="border rounded px-3 py-1 text-gray-900 bg-white"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Email Notifications</label>
              <input
                type="checkbox"
                checked={settings.notificationEmails}
                onChange={(e) => handleSettingChange('notificationEmails', e.target.checked)}
                className="rounded"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Escalation Timeout (hours)</label>
              <input
                type="number"
                value={settings.escalationTimeout}
                onChange={(e) => handleSettingChange('escalationTimeout', Number(e.target.value))}
                className="border rounded px-3 py-1 text-gray-900 bg-white"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}