// Approval Types
export interface ApprovalRequest {
  id: string;
  requestId: string;
  type: 'loan' | 'credit' | 'expense' | 'policy' | 'budget';
  title: string;
  description: string;
  proposedAction?: 'approve' | 'deferral' | 'otc'; // Added proposedAction field
  requester: {
    id: string;
    name: string;
    email: string;
    department: string;
  };
  amount?: number;
  currency?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'approved' | 'rejected' | 'under_review';
  submittedAt: Date;
  dueDate?: Date;
  approver?: {
    id: string;
    name: string;
    email: string;
  };
  approvedAt?: Date;
  rejectedAt?: Date;
  slaStatus: 'on-time' | 'due-soon' | 'overdue';
  attachments?: Array<{
    name: string;
    url: string;
    type: string;
  }>;
  comments?: Array<{
    id: string;
    author: string;
    content: string;
    timestamp: Date;
  }>;
  workflow?: {
    id: string;
    name: string;
    steps: Array<{
      name: string;
      status: 'pending' | 'completed' | 'skipped';
      assignee?: string;
    }>;
  };
}

export interface ApprovalStats {
  pendingCount: number;
  urgentCount: number;
  approvedToday: number;
  averageApprovalTime: string;
  slaCompliance: number;
}

export interface WorkflowRule {
  id: string;
  name: string;
  description: string;
  triggers: Array<{
    type: 'amount' | 'type' | 'department';
    operator: 'gt' | 'lt' | 'eq' | 'contains';
    value: string | number;
  }>;
  approvers: Array<{
    level: number;
    userId: string;
    name: string;
    isRequired: boolean;
  }>;
  slaHours: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApprovalActivity {
  id: string;
  requestId: string;
  type: 'submitted' | 'approved' | 'rejected' | 'commented' | 'escalated';
  actor: string;
  timestamp: Date;
  details: string;
}

export interface ApprovalFilter {
  dateRange?: {
    from: Date;
    to: Date;
  };
  type?: string[];
  status?: string[];
  priority?: string[];
  requester?: string;
  approver?: string;
}

export interface BulkAction {
  type: 'approve' | 'reject' | 'assign';
  requestIds: string[];
  assigneeId?: string;
  comment?: string;
}

export interface ApprovalReport {
  id: string;
  name: string;
  type: 'summary' | 'detailed' | 'compliance' | 'performance';
  dateRange: {
    from: Date;
    to: Date;
  };
  filters: ApprovalFilter;
  format: 'pdf' | 'csv' | 'excel';
  generatedAt?: Date;
  downloadUrl?: string;
}
