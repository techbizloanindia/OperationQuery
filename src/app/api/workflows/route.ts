import { NextRequest, NextResponse } from 'next/server';

// Mock workflow data
const mockWorkflows = [
  {
    id: '1',
    name: 'Standard Expense Approval',
    description: 'Default workflow for expense approvals under $10,000',
    triggers: [
      { type: 'type', operator: 'eq', value: 'expense' },
      { type: 'amount', operator: 'lt', value: 10000 }
    ],
    approvers: [
      { level: 1, userId: '1', name: 'Department Manager', isRequired: true },
      { level: 2, userId: '2', name: 'Finance Director', isRequired: true }
    ],
    slaHours: 24,
    isActive: true,
    createdAt: new Date('2024-01-10T10:00:00'),
    updatedAt: new Date('2024-01-15T14:30:00')
  },
  {
    id: '2',
    name: 'High-Value Expense Approval',
    description: 'Enhanced workflow for high-value expense approvals above $10,000',
    triggers: [
      { type: 'type', operator: 'eq', value: 'expense' },
      { type: 'amount', operator: 'gt', value: 10000 }
    ],
    approvers: [
      { level: 1, userId: '1', name: 'Department Manager', isRequired: true },
      { level: 2, userId: '2', name: 'Finance Director', isRequired: true },
      { level: 3, userId: '3', name: 'CFO', isRequired: true }
    ],
    slaHours: 48,
    isActive: true,
    createdAt: new Date('2024-01-08T09:00:00'),
    updatedAt: new Date('2024-01-12T11:20:00')
  }
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');

    let filteredWorkflows = [...mockWorkflows];

    if (active !== null) {
      const isActive = active === 'true';
      filteredWorkflows = filteredWorkflows.filter(workflow => workflow.isActive === isActive);
    }

    return NextResponse.json({
      success: true,
      data: filteredWorkflows,
      total: filteredWorkflows.length
    });
  } catch (error) {
    console.error('Error fetching workflows:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch workflows'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Creating new workflow:', body);

    // Mock workflow creation
    const newWorkflow = {
      id: Date.now().toString(),
      ...body,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return NextResponse.json({
      success: true,
      message: 'Workflow created successfully',
      data: newWorkflow
    });
  } catch (error) {
    console.error('Error creating workflow:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create workflow'
      },
      { status: 500 }
    );
  }
}
