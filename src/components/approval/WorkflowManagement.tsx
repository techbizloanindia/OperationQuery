'use client'

import { useState } from 'react'

interface WorkflowStep {
  id: string
  name: string
  approvers: string[]
  required: boolean
}

export default function WorkflowManagement() {
  const [workflows, setWorkflows] = useState<WorkflowStep[]>([
    {
      id: '1',
      name: 'Initial Review',
      approvers: ['manager@company.com'],
      required: true
    },
    {
      id: '2', 
      name: 'Final Approval',
      approvers: ['director@company.com'],
      required: true
    }
  ])

  const addWorkflowStep = () => {
    const newStep: WorkflowStep = {
      id: Date.now().toString(),
      name: 'New Step',
      approvers: [],
      required: false
    }
    setWorkflows([...workflows, newStep])
  }

  const updateWorkflowStep = (id: string, updates: Partial<WorkflowStep>) => {
    setWorkflows(prev => 
      prev.map(step => 
        step.id === id ? { ...step, ...updates } : step
      )
    )
  }

  const removeWorkflowStep = (id: string) => {
    setWorkflows(prev => prev.filter(step => step.id !== id))
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Workflow Management</h1>
        <button
          onClick={addWorkflowStep}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Add Step
        </button>
      </div>

      <div className="space-y-4">
        {workflows.map((step, index) => (
          <div key={step.id} className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Step {index + 1}</h3>
              <button
                onClick={() => removeWorkflowStep(step.id)}
                className="text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Step Name</label>
                <input
                  type="text"
                  value={step.name}
                  onChange={(e) => updateWorkflowStep(step.id, { name: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Approvers (comma separated)</label>
                <input
                  type="text"
                  value={step.approvers.join(', ')}
                  onChange={(e) => updateWorkflowStep(step.id, { 
                    approvers: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                  })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="user@company.com, manager@company.com"
                />
              </div>
            </div>
            
            <div className="mt-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={step.required}
                  onChange={(e) => updateWorkflowStep(step.id, { required: e.target.checked })}
                  className="mr-2"
                />
                Required Step
              </label>
            </div>
          </div>
        ))}
      </div>

      {workflows.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">No workflow steps configured</p>
          <button
            onClick={addWorkflowStep}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Add First Step
          </button>
        </div>
      )}
    </div>
  )
}