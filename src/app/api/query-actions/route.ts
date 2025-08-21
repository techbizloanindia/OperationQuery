import { NextRequest, NextResponse } from 'next/server';
import { broadcastQueryUpdate } from '@/lib/eventStreamUtils';
import { logQueryUpdate } from '@/lib/queryUpdateLogger';
import { ChatStorageService } from '@/lib/services/ChatStorageService';

interface QueryAction {
  queryId: number;
  action: 'approve' | 'deferral' | 'otc' | 'revert' | 'assign-branch' | 'respond' | 'escalate';
  assignedTo?: string;
  assignedToBranch?: string;
  remarks?: string;
  operationTeamMember?: string;
  salesTeamMember?: string;
  team?: string;
  actionBy?: string;
  responseText?: string;
}

interface QueryMessage {
  queryId: number;
  message: string;
  addedBy: string;
  team: 'Operations' | 'Sales' | 'Credit';
}

// In-memory storage for query actions
const queryActionsDatabase: any[] = [];

// Use global message database for sharing between routes
if (typeof global.queryMessagesDatabase === 'undefined') {
  global.queryMessagesDatabase = [];
}

// Global approval requests database for sharing between routes - Force clean slate
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

// Global counter for sequential BIZLN IDs
declare global {
  var bizlnCounter: number | undefined;
}

// Reference to the queries database
let queriesDatabase: any[] = [];

// Archive chat history when query is approved
async function archiveChatOnApproval(queryId: number, queryData: any, action: string) {
  try {
    if (!queryData) return;

    const archiveReason = action === 'approve' ? 'approved' : 
                         action === 'deferral' ? 'deferred' : 
                         action === 'otc' ? 'otc' : 'resolved';

    // Sync in-memory messages to database first
    const inMemoryMessages = global.queryMessagesDatabase?.filter(
      (msg: any) => msg.queryId === queryId || msg.queryId === queryId.toString()
    ) || [];

    if (inMemoryMessages.length > 0) {
      await ChatStorageService.syncInMemoryMessages(inMemoryMessages);
    }

    // Archive the chat history
    const archived = await ChatStorageService.archiveQueryChat(
      queryId.toString(),
      {
        appNo: queryData.appNo || `APP-${queryId}`,
        customerName: queryData.customerName || 'Unknown Customer',
        queryTitle: queryData.title || queryData.queries?.[0]?.text || 'Query',
        queryStatus: archiveReason,
        markedForTeam: queryData.markedForTeam || queryData.team || 'unknown'
      },
      archiveReason
    );

    if (archived) {
      console.log(`✅ Chat history archived for query ${queryId} with reason: ${archiveReason}`);
    }

  } catch (error) {
    console.error(`Error archiving chat history for query ${queryId}:`, error);
  }
}

// Initialize the queriesDatabase from the queries API route
const initializeQueriesDatabase = async () => {
  try {
    // Skip initialization in build mode or production
    if (process.env.NODE_ENV === 'production' || process.env.BUILDING === 'true') {
      console.log('Skipping database initialization in production/build mode');
      return;
    }
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/queries`);
    if (response.ok) {
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        queriesDatabase = data.data;
      }
    }
  } catch (error) {
    console.error('Error initializing queries database:', error);
  }
};

// Initialize sample data
const initializeData = () => {
  // Ensure we have some sample messages if none exist
  if (global.queryMessagesDatabase.length === 0) {
    console.log('Initializing clean database in query-actions');
    global.queryMessagesDatabase = [
      // No sample messages - clean database for production use
    ];
  }
};

// POST - Handle query actions, messages, and reverts
export async function POST(request: NextRequest) {
  try {
    // Initialize data
    initializeData();
    
    // Ensure we have the latest queries database
    await initializeQueriesDatabase();
    
    const body = await request.json();
    const { type, queryId, action, remarks, sentTo } = body;

    // Handle direct query actions without type field (for backward compatibility)
    if (!type && queryId && action) {
      console.log(`⚡ Handling direct query action: ${action} for query ${queryId}`);
      
      // Map action to proper status
      let status = 'pending';
      if (action === 'approved') status = 'request-approved';
      else if (action === 'otc') status = 'request-otc';
      else if (action === 'deferral') status = 'request-deferral';
      
      return handleQueryAction({
        type: 'action',
        queryId,
        action,
        remarks
      });
    }

    if (type === 'action') {
      console.log('⚡ Handling action type');
      return handleQueryAction(body);
    } else if (type === 'message') {
      console.log('💬 Handling message type');
      return handleAddMessage(body);
    } else if (type === 'revert') {
      console.log('🔄 Handling revert type');
      return handleRevertAction(body);
    } else {
      console.log('❌ Invalid request type received:', type);
      return NextResponse.json(
        { success: false, error: 'Invalid request type' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Error handling query action:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Create approval request for operations team actions
async function createApprovalRequest(params: {
  queryId: number;
  action: string;
  assignedTo?: string;
  assignedToBranch?: string;
  remarks?: string;
  teamMember: string;
  actionTeam: string;
  responseText?: string;
}) {
  const { queryId, action, assignedTo, assignedToBranch, remarks, teamMember, actionTeam, responseText } = params;

  // Find the query to get details for the approval request
  let queryDetails = null;
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/queries?queryId=${queryId}`);
    if (response.ok) {
      const result = await response.json();
      if (result.success && result.data.length > 0) {
        queryDetails = result.data[0];
      }
    }
  } catch (error) {
    console.error('Error fetching query details:', error);
  }

  // Generate sequential BIZLN approval request ID
  const generateApprovalRequestId = () => {
    if (typeof global.bizlnCounter === 'undefined') {
      global.bizlnCounter = 0;
    }
    global.bizlnCounter = (global.bizlnCounter || 0) + 1;
    const sequentialNumber = global.bizlnCounter.toString().padStart(3, '0');
    const newId = `BIZLN${sequentialNumber}`;
    console.log(`🆔 Generated new BIZLN Request ID: ${newId} (Counter: ${global.bizlnCounter})`);
    return newId;
  };

  // Create approval request
  const approvalRequestId = generateApprovalRequestId();
  const approvalRequest = {
    id: approvalRequestId,
    requestId: approvalRequestId, // Use the same BIZLN ID for consistency
    type: 'query-action',
    queryId: queryId,
    proposedAction: action,
    title: `${action.charAt(0).toUpperCase() + action.slice(1)} Query: ${queryDetails?.appNo || queryId}`,
    description: `${actionTeam} team request to ${action} query for application ${queryDetails?.appNo || queryId}. ${remarks ? `Remarks: ${remarks}` : ''}`,
    requester: {
      id: teamMember.toLowerCase().replace(/\s+/g, ''),
      name: teamMember,
      email: `${teamMember.toLowerCase().replace(/\s+/g, '.')}@company.com`,
      department: actionTeam
    },
    assignedTo,
    assignedToBranch,
    queryDetails: queryDetails,
    priority: 'medium',
    status: 'pending',
    submittedAt: new Date(),
    slaStatus: 'on-time',
    remarks: remarks || '',
    responseText: responseText
  };

  // Store the approval request
  if (!global.approvalRequestsDatabase) {
    global.approvalRequestsDatabase = [];
  }
  global.approvalRequestsDatabase.push(approvalRequest);

  // Update query status to pending-approval
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const updateData = {
      queryId,
      status: 'waiting for approval', // Correct status for approval workflow
      lastUpdated: new Date().toISOString(),
      approvalRequestId: approvalRequestId,
      proposedAction: action,
      proposedBy: teamMember,
      proposedAt: new Date().toISOString(),
      // Keep query visible in dashboards while waiting for approval
      isResolved: false,
      markedForTeam: queryDetails?.markedForTeam || 'operations'
    };
    
    console.log('📝 Sending approval status update to queries API:', updateData);
    
    const response = await fetch(`${baseUrl}/api/queries`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });
    
    if (response.ok) {
      console.log('✅ Query status updated to "waiting for approval"');
      
      // Broadcast update to all dashboards
      try {
        const updateBroadcast = {
          id: queryDetails?.id || queryId,
          appNo: queryDetails?.appNo || `APP-${queryId}`,
          customerName: queryDetails?.customerName || 'Unknown Customer',
          branch: queryDetails?.branch || 'Unknown Branch',
          status: 'waiting for approval',
          priority: queryDetails?.priority || 'medium',
          team: queryDetails?.team || 'operations',
          markedForTeam: queryDetails?.markedForTeam || 'operations',
          createdAt: queryDetails?.createdAt || new Date().toISOString(),
          submittedBy: queryDetails?.submittedBy || 'Operations User',
          action: 'pending-approval' as const,
          proposedAction: action,
          proposedBy: teamMember,
          approvalRequestId: approvalRequestId
        };
        
        broadcastQueryUpdate(updateBroadcast);
        console.log('📡 Broadcasted approval pending status to all dashboards');
      } catch (broadcastError) {
        console.warn('Failed to broadcast approval pending status:', broadcastError);
      }
    } else {
      console.warn('⚠️ Failed to update query status to "waiting for approval"');
    }
  } catch (error) {
    console.error('Error updating query status to pending-approval:', error);
  }

  // Add system message about approval request
  const message = `📋 ${action.charAt(0).toUpperCase() + action.slice(1)} request submitted to Approval Team by ${teamMember} (${actionTeam} Team)\n\n📝 Remarks: ${remarks || 'No additional remarks'}\n\n⏳ Status: Waiting for approval from approval team\n\n🕒 Submitted on: ${new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })}`;

  const messageRecord = {
    id: `${Date.now().toString()}-${Math.random().toString(36).substring(2, 9)}`,
    queryId: queryId,
    message: message,
    sender: 'System',
    senderRole: 'System',
    timestamp: new Date().toISOString(),
    team: 'System',
    actionType: 'approval-request',
    isSystemMessage: true
  };

  global.queryMessagesDatabase.push(messageRecord);

  console.log(`✅ Approval request created with BIZLN ID: ${approvalRequestId}`, approvalRequest);

  return NextResponse.json({
    success: true,
    message: `${action.charAt(0).toUpperCase() + action.slice(1)} request sent to approval team successfully! Request ID: ${approvalRequestId}`,
    data: {
      approvalRequestId: approvalRequestId,
      queryId: queryId,
      status: 'pending-approval',
      proposedAction: action
    }
  });
}

// Handle query actions
async function handleQueryAction(body: QueryAction & { type: string; status?: string }) {
  const { queryId, action, assignedTo, assignedToBranch, remarks, operationTeamMember, salesTeamMember, team, responseText, status } = body;
  
  if (!queryId || !action) {
    return NextResponse.json(
      { success: false, error: 'Query ID and action are required' },
      { status: 400 }
    );
  }

  // Determine the team member based on which field is provided
  const teamMember = salesTeamMember || operationTeamMember || 'System User';
  const actionTeam = team || (salesTeamMember ? 'Sales' : 'Operations');

  // Check if this is an approval action from any team (Operations, Sales, Credit)
  const isApprovalAction = ['approve', 'deferral', 'otc'].includes(action) && 
                          ['Operations', 'Sales', 'Credit'].includes(actionTeam);

  if (isApprovalAction) {
    // Create an approval request instead of directly resolving for all teams
    return await createApprovalRequest({
      queryId,
      action,
      assignedTo,
      assignedToBranch,
      remarks,
      teamMember,
      actionTeam,
      responseText
    });
  }

  // For non-approval actions, continue with the original flow
  // Create action record with resolver name
  const actionRecord = {
    id: `${Date.now().toString()}-${Math.random().toString(36).substring(2, 9)}`,
    queryId,
    action,
    assignedTo,
    assignedToBranch,
    remarks,
    teamMember,
    team: actionTeam,
    responseText,
    actionDate: new Date().toISOString(),
    status: 'completed'
  };

  // Store the action
  queryActionsDatabase.push(actionRecord);

  // Update the query status in the queries database
  try {
    // For direct actions (not going through approval), use the final status
    const resolvedStatus = status || (
      action === 'approve' ? 'approved' :
      action === 'deferral' ? 'deferred' :
      action === 'otc' ? 'otc' :
      action
    );
    
    // Try to update via API call first for better consistency
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    const now = new Date();
    const updateData = {
      queryId,
      status: resolvedStatus,
      resolvedAt: now.toISOString(),
      resolvedBy: teamMember,
      resolutionReason: action,
      assignedTo: assignedTo || null,
      assignedToBranch: assignedToBranch || null,
      remarks: remarks || '',
      // Always mark as resolved when action is taken directly
      isResolved: true,
      isIndividualQuery: true, // Most actions are on individual queries
      // Add approval tracking for direct actions
      approvedBy: teamMember,
      approvedAt: now.toISOString(),
      approvalDate: now.toISOString(),
      approvalStatus: action === 'approve' ? 'approved' :
                     action === 'deferral' ? 'deferral' :
                     action === 'otc' ? 'otc' : null
    };
    
    console.log('📝 Sending update to queries API:', updateData);
    
    const response = await fetch(`${baseUrl}/api/queries`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });
    
    if (response.ok) {
      const successData = await response.json();
      console.log('✅ Query status updated successfully via API:', successData);
      
      // Archive chat history if this is an approval action
      if (['approve', 'deferral', 'otc'].includes(action) && successData.data) {
        await archiveChatOnApproval(queryId, successData.data, action);
      }
      
      // Broadcast real-time update when query action is successful
      if (successData.data) {
        const query = successData.data;
        
        try {
          // Log the update for polling fallback
          logQueryUpdate({
            queryId: query.id,
            appNo: query.appNo,
            customerName: query.customerName,
            branch: query.branch,
            status: query.status,
            priority: query.priority,
            team: query.team,
            markedForTeam: query.markedForTeam,
            createdAt: query.createdAt,
            submittedBy: query.submittedBy,
            action: query.status === 'resolved' ? 'resolved' : 'updated'
          });
          
          // Broadcast via SSE
          broadcastQueryUpdate({
            id: query.id,
            appNo: query.appNo,
            customerName: query.customerName,
            branch: query.branch,
            status: query.status,
            priority: query.priority,
            team: query.team,
            markedForTeam: query.markedForTeam,
            createdAt: query.createdAt,
            submittedBy: query.submittedBy,
            action: query.status === 'resolved' ? 'resolved' : 'updated'
          });
          console.log('📡 Broadcasted query action update:', query.appNo);
        } catch (error) {
          console.warn('Failed to broadcast query action update:', error);
        }
      }
    } else {
      const errorData = await response.json();
      console.warn('⚠️ Failed to update query status via API:', errorData);
      
      // Fallback: Direct database update
      const foundQuery = queriesDatabase.find(q => q.id === queryId);
      if (foundQuery) {
        foundQuery.status = resolvedStatus;
        foundQuery.resolvedAt = new Date().toISOString();
        foundQuery.resolvedBy = teamMember;
        foundQuery.resolutionReason = action;
        foundQuery.lastUpdated = new Date().toISOString();
        (foundQuery as any).isResolved = true;
        console.log(`✅ Query ${queryId} updated via fallback method`);
        
        // Broadcast update for fallback method too
        try {
          logQueryUpdate({
            queryId: foundQuery.id,
            appNo: foundQuery.appNo,
            customerName: foundQuery.customerName,
            branch: foundQuery.branch,
            status: foundQuery.status,
            priority: foundQuery.priority,
            team: foundQuery.team,
            markedForTeam: foundQuery.markedForTeam,
            createdAt: foundQuery.createdAt,
            submittedBy: foundQuery.submittedBy,
            action: foundQuery.status === 'resolved' ? 'resolved' : 'updated'
          });
          
          broadcastQueryUpdate({
            id: foundQuery.id,
            appNo: foundQuery.appNo,
            customerName: foundQuery.customerName,
            branch: foundQuery.branch,
            status: foundQuery.status,
            priority: foundQuery.priority,
            team: foundQuery.team,
            markedForTeam: foundQuery.markedForTeam,
            createdAt: foundQuery.createdAt,
            submittedBy: foundQuery.submittedBy,
            action: foundQuery.status === 'resolved' ? 'resolved' : 'updated'
          });
          console.log('📡 Broadcasted fallback query update:', foundQuery.appNo);
        } catch (error) {
          console.warn('Failed to broadcast fallback query update:', error);
        }
      }
    }
  } catch (error) {
    console.error('Error updating query status:', error);
  }

  console.log('📋 Query action recorded:', actionRecord);

  // Create appropriate message based on action and assigned person
  let message = '';
  const timestamp = new Date().toISOString();
  const actorName = teamMember;
  
  switch (action) {
    case 'approve':
      message = `✅ Query APPROVED by ${actorName}\n\n📝 Remarks: ${remarks || 'No additional remarks'}\n\n🕒 Approved on: ${new Date(timestamp).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })}\n\n✅ Query has been moved to Query Resolved section.`;
      break;
    case 'deferral':
      message = `⏸️ Query DEFERRED by ${actorName}\n\n👤 Assigned to: ${assignedTo || 'Not specified'}\n📝 Remarks: ${remarks || 'No additional remarks'}\n\n🕒 Deferred on: ${new Date(timestamp).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })}\n\n📋 Query has been moved to Query Resolved section with Deferral status.`;
      break;
    case 'otc':
      message = `🔄 Query marked as OTC by ${actorName}\n\n👤 Assigned to: ${assignedTo || 'Not specified'}\n📝 Remarks: ${remarks || 'No additional remarks'}\n\n🕒 OTC assigned on: ${new Date(timestamp).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })}\n\n🏢 Query has been moved to Query Resolved section with OTC status.`;
      break;
    case 'assign-branch':
      message = `🏢 Query ASSIGNED TO BRANCH by ${actorName}\n\n🏢 Assigned to Branch: ${assignedToBranch || 'Not specified'}\n📝 Remarks: ${remarks || 'No additional remarks'}\n\n🕒 Assigned on: ${new Date(timestamp).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })}\n\n📤 Branch assignment completed by Sales team.`;
      break;
    case 'respond':
      message = `📧 RESPONSE SENT by ${actorName}\n\n💬 Response: ${responseText || 'No response text'}\n📝 Remarks: ${remarks || 'No additional remarks'}\n\n🕒 Responded on: ${new Date(timestamp).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })}\n\n📤 Response sent by Sales team.`;
      break;
    case 'escalate':
      message = `🚀 Query ESCALATED by ${actorName}\n\n📝 Remarks: ${remarks || 'No additional remarks'}\n\n🕒 Escalated on: ${new Date(timestamp).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })}\n\n⬆️ Query escalated by Sales team for further review.`;
      break;
  }

  // Add a comprehensive system message to the global chat history
  const systemMessage = {
    id: `${Date.now().toString()}-system-${Math.random().toString(36).substring(2, 9)}`,
    queryId,
    message: message,
    responseText: message,
    sender: actorName,
    senderRole: actionTeam.toLowerCase(),
    team: actionTeam,
    timestamp: timestamp,
    isSystemMessage: true,
    actionType: action,
    assignedTo: assignedTo || null,
    assignedToBranch: assignedToBranch || null,
    remarks: remarks || ''
  };
  
  global.queryMessagesDatabase.push(systemMessage);
  console.log('💬 System message added to global message database:', systemMessage);

  return NextResponse.json({
    success: true,
    data: actionRecord,
    message,
    systemMessage
  });
}

// Handle revert actions
async function handleRevertAction(body: any) {
  const { queryId, remarks, team, actionBy, timestamp } = body;
  
  if (!queryId) {
    return NextResponse.json(
      { success: false, error: 'Query ID is required' },
      { status: 400 }
    );
  }

  if (!remarks) {
    return NextResponse.json(
      { success: false, error: 'Remarks are required for revert action' },
      { status: 400 }
    );
  }

  // Create revert action record
  const revertRecord = {
    id: `${Date.now().toString()}-${Math.random().toString(36).substring(2, 9)}`,
    queryId: parseInt(queryId),
    action: 'revert',
    remarks,
    team: team || 'Unknown Team',
    actionBy: actionBy || 'Team Member',
    actionDate: timestamp || new Date().toISOString(),
    status: 'completed'
  };

  // Store the revert action
  queryActionsDatabase.push(revertRecord);

  // Update the query status in the queries database
  try {
    // Find the query in the database
    const queryIndex = queriesDatabase.findIndex(q => q.id === parseInt(queryId));
    
    if (queryIndex !== -1) {
      // Update the query to revert it back to pending status
      queriesDatabase[queryIndex] = {
        ...queriesDatabase[queryIndex],
        status: 'pending',
        revertedAt: new Date().toISOString(),
        revertedBy: actionBy || 'Team Member',
        revertReason: remarks,
        lastUpdated: new Date().toISOString(),
        // Remove resolution fields since it's reverted
        resolvedAt: undefined,
        resolvedBy: undefined,
        resolutionReason: undefined
      };
      
      console.log(`✅ Query ${queryId} reverted back to pending status`);
    } else {
      console.warn(`⚠️ Query ${queryId} not found in database`);
    }
    
    // Also make the API call to ensure consistency
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const updateData = {
      queryId,
      status: 'pending',
      revertedAt: new Date().toISOString(),
      revertedBy: actionBy || 'Team Member',
      revertReason: remarks
    };
    
    console.log('📝 Sending revert update to queries API:', updateData);
    
    const response = await fetch(`${baseUrl}/api/queries`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.warn('Failed to update query status via API:', errorData);
    } else {
      const successData = await response.json();
      console.log('✅ Query revert status updated via API:', successData);
    }
  } catch (error) {
    console.warn('Error updating query revert status:', error);
  }

  console.log('📋 Query revert action recorded:', revertRecord);

  // Create a better formatted system message for the revert action
  const teamName = team ? `${team} Team` : 'Team';
  const actionByName = actionBy || 'Team Member';
  
  // Build comprehensive revert message with structured format
  const revertMessage = `🔄 Query Reverted by ${teamName}

👤 Reverted by: ${actionByName}
📅 Reverted on: ${new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })}
📝 Reason: ${remarks}

ℹ️ This query has been reverted back to pending status and will need to be processed again by the appropriate team.`;

  // Add a system message to the global chat history
  const systemMessage = {
    id: `${Date.now().toString()}-revert-${Math.random().toString(36).substring(2, 9)}`,
    queryId: parseInt(queryId),
    message: revertMessage,
    responseText: revertMessage,
    sender: actionByName,
    senderRole: team ? team.toLowerCase() : 'team',
    team: teamName,
    timestamp: timestamp || new Date().toISOString(),
    isSystemMessage: true,
    actionType: 'revert',
    revertReason: remarks,
    revertedBy: actionByName
  };
  
  global.queryMessagesDatabase.push(systemMessage);
  console.log('💬 Revert message added to global message database:', systemMessage);

  return NextResponse.json({
    success: true,
    data: revertRecord,
    message: revertMessage,
    systemMessage: systemMessage
  });
}

// Handle adding messages to queries
async function handleAddMessage(body: QueryMessage & { type: string }) {
  const { queryId, message, addedBy, team } = body;
  
  if (!queryId || !message) {
    return NextResponse.json(
      { success: false, error: 'Query ID and message are required' },
      { status: 400 }
    );
  }

  const messageRecord = {
    id: `${Date.now().toString()}-${Math.random().toString(36).substring(2, 9)}`,
    queryId,
    message,
    responseText: message,
    sender: addedBy || `${team} Team Member`,
    senderRole: team ? team.toLowerCase() : 'operations',
    team: team || 'Operations',
    timestamp: new Date().toISOString()
  };

  // Add to global message database for backwards compatibility
  global.queryMessagesDatabase.push(messageRecord);

  // Store in MongoDB using ChatStorageService
  try {
    const chatMessage = {
      queryId: queryId.toString(),
      message,
      responseText: message,
      sender: addedBy || `${team} Team Member`,
      senderRole: team ? team.toLowerCase() : 'operations',
      team: team || 'Operations',
      timestamp: new Date(),
      isSystemMessage: false,
      actionType: 'message' as const
    };

    const stored = await ChatStorageService.storeChatMessage(chatMessage);
    if (stored) {
      console.log(`💾 Message stored to database: ${stored._id}`);
    }
  } catch (error) {
    console.error('Error storing message to database:', error);
    // Continue with in-memory storage as fallback
  }

  console.log(`💬 Message from ${team} added to global message database:`, messageRecord);

  return NextResponse.json({
    success: true,
    data: messageRecord,
    message: 'Message added successfully'
  });
}

// GET - Retrieve query actions and messages
export async function GET(request: NextRequest) {
  try {
    // Initialize data
    initializeData();
    
    // Ensure we have the latest queries database
    await initializeQueriesDatabase();
    
    const { searchParams } = new URL(request.url);
    const queryId = searchParams.get('queryId');
    const type = searchParams.get('type'); // 'actions' or 'messages'

    if (type === 'actions') {
      let actions = [...queryActionsDatabase];
      if (queryId) {
        actions = actions.filter(a => a.queryId === parseInt(queryId));
      }
      
      return NextResponse.json({
        success: true,
        data: actions,
        count: actions.length
      });
    } else if (type === 'messages') {
      let messages = [...global.queryMessagesDatabase];
      if (queryId) {
        messages = messages.filter(m => m.queryId === parseInt(queryId));
      }
      
      // Sort messages by timestamp (oldest first)
      messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      return NextResponse.json({
        success: true,
        data: messages,
        count: messages.length
      });
    } else {
      // Return both actions and messages
      let actions = [...queryActionsDatabase];
      let messages = [...global.queryMessagesDatabase];
      
      if (queryId) {
        const qId = parseInt(queryId);
        actions = actions.filter(a => a.queryId === qId);
        messages = messages.filter(m => m.queryId === qId);
      }
      
      // Sort messages by timestamp (oldest first)
      messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      return NextResponse.json({
        success: true,
        data: {
          actions,
          messages
        },
        count: {
          actions: actions.length,
          messages: messages.length
        }
      });
    }
  } catch (error: any) {
    console.error('Error fetching query actions:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Make queryMessagesDatabase accessible globally
declare global {
  var queryMessagesDatabase: any[];
}
