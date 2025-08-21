import { NextRequest, NextResponse } from 'next/server';
import { broadcastQueryUpdate } from '@/lib/eventStreamUtils';

// Access global approval requests database from query-actions
declare global {
  var approvalRequestsDatabase: any[] | undefined;
}

// Global counter for sequential BIZLN IDs
declare global {
  var bizlnCounter: number | undefined;
}

// Initialize counter if not exists
if (typeof global.bizlnCounter === 'undefined') {
  global.bizlnCounter = 0;
}

// Function to initialize counter based on existing BIZLN requests
const initializeBizlnCounter = () => {
  if (global.approvalRequestsDatabase && global.approvalRequestsDatabase.length > 0) {
    const existingBizlnIds = global.approvalRequestsDatabase
      .map((approval: any) => approval.requestId || approval.id)
      .filter((id: string) => id && id.startsWith('BIZLN'))
      .map((id: string) => {
        const match = id.match(/BIZLN(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      });
    
    if (existingBizlnIds.length > 0) {
      const maxId = Math.max(...existingBizlnIds);
      const previousCounter = global.bizlnCounter || 0;
      global.bizlnCounter = Math.max(previousCounter, maxId);
      console.log(`🔄 Initialized BIZLN counter: ${previousCounter} → ${global.bizlnCounter} (found ${existingBizlnIds.length} existing BIZLN IDs)`);
    } else {
      console.log(`🔄 No existing BIZLN IDs found, counter remains at: ${global.bizlnCounter || 0}`);
    }
  } else {
    console.log(`🔄 No approval requests database or empty database, counter remains at: ${global.bizlnCounter || 0}`);
  }
};

// Generate sequential BIZLN request ID
const generateRequestId = () => {
  global.bizlnCounter = (global.bizlnCounter || 0) + 1;
  const sequentialNumber = global.bizlnCounter.toString().padStart(3, '0');
  const newId = `BIZLN${sequentialNumber}`;
  console.log(`🆔 Generated new BIZLN Request ID: ${newId} (Counter: ${global.bizlnCounter})`);
  return newId;
};

// Mock data for approval requests (fallback) - cleaned of specific entries
const mockApprovals: any[] = [];

// Initialize approval requests database if it doesn't exist - Force clean slate
if (typeof global.approvalRequestsDatabase === 'undefined') {
  global.approvalRequestsDatabase = [];
} else {
  // Clear any existing data that might match the removed entries
  global.approvalRequestsDatabase = global.approvalRequestsDatabase.filter((approval: any) => {
    const isRemovedEntry = 
      (approval.requester?.name === 'John Smith' && approval.type === 'loan') ||
      (approval.requester?.name === 'Sarah Johnson' && approval.type === 'expense') ||
      (approval.requester?.name === 'David Chen' && approval.type === 'policy') ||
      approval.requestId === 'REQ-202508-6943' ||
      approval.requestId === 'REQ-202508-9520' ||
      approval.requestId === 'REQ-202508-5382';
    return !isRemovedEntry;
  });
}

const mockStats = {
  pendingCount: 12,
  urgentCount: 3,
  approvedToday: 8,
  averageApprovalTime: '2.5 hours',
  slaCompliance: 94
};

export async function GET(request: NextRequest) {
  try {
    // Initialize BIZLN counter based on existing requests
    initializeBizlnCounter();
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');

    // Combine mock approvals with query-based approval requests
    const queryApprovals = global.approvalRequestsDatabase || [];
    let filteredApprovals = [...mockApprovals, ...queryApprovals];

    // Apply filters
    if (type) {
      filteredApprovals = filteredApprovals.filter(approval => approval.type === type);
    }
    if (status) {
      filteredApprovals = filteredApprovals.filter(approval => approval.status === status);
    }
    if (priority) {
      filteredApprovals = filteredApprovals.filter(approval => approval.priority === priority);
    }

    // Calculate real-time stats
    const allApprovals = [...mockApprovals, ...queryApprovals];
    const pendingCount = allApprovals.filter(a => a.status === 'pending').length;
    const urgentCount = allApprovals.filter(a => a.priority === 'urgent').length;
    const approvedToday = allApprovals.filter(a => {
      const today = new Date();
      const approvedAt = a.approvedAt ? new Date(a.approvedAt) : null;
      return approvedAt && 
        approvedAt.toDateString() === today.toDateString();
    }).length;

    const stats = {
      pendingCount,
      urgentCount,
      approvedToday,
      averageApprovalTime: '2.5 hours',
      slaCompliance: 94
    };

    return NextResponse.json({
      success: true,
      data: {
        approvals: filteredApprovals,
        stats: stats,
        total: filteredApprovals.length
      }
    });
  } catch (error) {
    console.error('Error fetching approvals:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch approvals'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Initialize BIZLN counter based on existing requests
    initializeBizlnCounter();
    
    const body = await request.json();
    const { action, requestIds, comment, approverName = 'Approval Team', specificAction } = body;

    if (!action || !requestIds || !Array.isArray(requestIds)) {
      return NextResponse.json(
        { success: false, error: 'Action and requestIds are required' },
        { status: 400 }
      );
    }

    console.log(`Processing ${action} for requests:`, requestIds);
    if (comment) {
      console.log('Comment:', comment);
    }

    const results = [];
    const queryApprovals = global.approvalRequestsDatabase || [];

    for (const requestId of requestIds) {
      // Find the approval request
      const approvalIndex = queryApprovals.findIndex(req => req.id === requestId);
      
      if (approvalIndex === -1) {
        // Try mock approvals as fallback
        const mockIndex = mockApprovals.findIndex(req => req.id === requestId);
        if (mockIndex !== -1) {
          const mockApproval = mockApprovals[mockIndex] as any;
          mockApproval.status = action === 'approve' ? 'approved' : 'rejected';
          mockApproval[action === 'approve' ? 'approvedAt' : 'rejectedAt'] = new Date();
          mockApproval.approver = {
            id: 'approval-team',
            name: approverName,
            email: 'approval@company.com'
          };
          results.push({ requestId, status: 'success', type: 'mock' });
        } else {
          results.push({ requestId, status: 'not_found' });
        }
        continue;
      }

      const approvalRequest = queryApprovals[approvalIndex];
      
      // Update approval request status
      approvalRequest.status = action === 'approve' ? 'approved' : 'rejected';
      approvalRequest[action === 'approve' ? 'approvedAt' : 'rejectedAt'] = new Date();
      approvalRequest.approver = {
        id: 'approval-team',
        name: approverName,
        email: 'approval@company.com'
      };
      if (comment) {
        approvalRequest.approverComment = comment;
      }

      // If this is a query-action approval request, update the original query
      if (approvalRequest.type === 'query-action' && approvalRequest.queryId) {
        try {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || `${process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://' + (request.headers.get('host') || 'localhost')}`;
          
          if (action === 'approve') {
            // Determine final status based on specificAction or fallback to proposedAction
            const actionType = specificAction || approvalRequest.proposedAction || 'approve';
            const finalStatus = actionType === 'approve' ? 'approved' :
                               actionType === 'deferral' ? 'deferred' :
                               actionType === 'otc' ? 'otc' : 'resolved';
            
            const now = new Date();
            const updateData = {
              queryId: approvalRequest.queryId,
              status: finalStatus,
              resolvedAt: now.toISOString(),
              resolvedBy: approverName,
              resolutionReason: actionType,
              assignedTo: approvalRequest.assignedTo || null,
              assignedToBranch: approvalRequest.assignedToBranch || null,
              remarks: approvalRequest.remarks || '',
              approverComment: comment || '',
              isResolved: true,
              isIndividualQuery: true,
              // Add approval tracking fields
              approvedBy: approverName,
              approvedAt: now.toISOString(),
              approvalDate: now.toISOString(),
              approvalStatus: actionType === 'approve' ? 'approved' :
                             actionType === 'deferral' ? 'deferral' :
                             actionType === 'otc' ? 'otc' : 'approved'
            };
            
            const response = await fetch(`${baseUrl}/api/queries`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updateData),
            });

            // Broadcast real-time update for approved query
            try {
              const approvalUpdateData = {
                id: approvalRequest.queryId,
                appNo: approvalRequest.appNo || `APP-${approvalRequest.queryId}`,
                customerName: approvalRequest.customerName || 'Unknown Customer',
                branch: approvalRequest.branch || 'Unknown Branch',
                status: finalStatus,
                priority: approvalRequest.priority || 'medium',
                team: approvalRequest.team || 'operations',
                markedForTeam: approvalRequest.markedForTeam || 'operations',
                createdAt: approvalRequest.createdAt || new Date().toISOString(),
                submittedBy: approvalRequest.submittedBy || 'Operations User',
                resolvedBy: approverName,
                resolvedAt: new Date().toISOString(),
                approverComment: comment || '',
                action: 'approved' as const
              };
              
              broadcastQueryUpdate(approvalUpdateData);
              console.log('📡 Broadcasted approval update:', approvalUpdateData.appNo);
            } catch (broadcastError) {
              console.warn('Failed to broadcast approval update:', broadcastError);
            }

            // Add system message about approval with proper status
            const statusText = finalStatus === 'approved' ? 'APPROVED' :
                              finalStatus === 'deferred' ? 'DEFERRED' :
                              finalStatus === 'otc' ? 'marked as OTC' : 'RESOLVED';
            
            const approvalMessage = {
              id: `${Date.now().toString()}-${Math.random().toString(36).substring(2, 9)}`,
              queryId: approvalRequest.queryId,
              message: `✅ Query ${statusText} by ${approverName}\n\n📝 Approval Comment: ${comment || 'No additional comments'}\n\n🕒 ${actionType.toUpperCase()} on: ${now.toLocaleString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              })}\n\n✅ Query has been moved to Queries Resolved section with status: ${finalStatus.toUpperCase()}.`,
              sender: approverName,
              senderRole: 'Approval Team',
              timestamp: now.toISOString(),
              team: 'Approval',
              actionType: actionType,
              isSystemMessage: true,
              metadata: {
                approvedBy: approverName,
                approvalStatus: finalStatus,
                approvalDate: now.toISOString(),
                specificAction: actionType
              }
            };

            global.queryMessagesDatabase = global.queryMessagesDatabase || [];
            global.queryMessagesDatabase.push(approvalMessage);
            
          } else {
            // Reject the proposed action - revert query back to pending
            const updateData = {
              queryId: approvalRequest.queryId,
              status: 'pending',
              lastUpdated: new Date().toISOString(),
              approvalRequestId: null,
              proposedAction: null,
              proposedBy: null,
              proposedAt: null
            };
            
            const response = await fetch(`${baseUrl}/api/queries`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updateData),
            });

            // Add system message about rejection
            const rejectionMessage = {
              id: `${Date.now().toString()}-${Math.random().toString(36).substring(2, 9)}`,
              queryId: approvalRequest.queryId,
              message: `❌ ${approvalRequest.proposedAction.charAt(0).toUpperCase() + approvalRequest.proposedAction.slice(1)} request REJECTED by ${approverName}\n\n📝 Rejection Reason: ${comment || 'No reason provided'}\n\n🕒 Rejected on: ${new Date().toLocaleString('en-US', {
                year: 'numeric',
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              })}\n\n🔄 Query has been reverted to pending status for operations team review.`,
              sender: approverName,
              senderRole: 'Approval Team',
              timestamp: new Date().toISOString(),
              team: 'Approval',
              actionType: 'rejected',
              isSystemMessage: true
            };

            global.queryMessagesDatabase = global.queryMessagesDatabase || [];
            global.queryMessagesDatabase.push(rejectionMessage);
          }
          
        } catch (error) {
          console.error('Error updating query after approval/rejection:', error);
        }
      }

      results.push({ 
        requestId, 
        status: 'success', 
        type: 'query-action',
        action: action,
        queryId: approvalRequest.queryId 
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully ${action === 'approve' ? 'approved' : 'rejected'} ${results.filter(r => r.status === 'success').length} request(s)`,
      data: { results }
    });
  } catch (error) {
    console.error('Error processing approval action:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process approval action' },
      { status: 500 }
    );
  }
}
