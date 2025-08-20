import { NextRequest, NextResponse } from 'next/server';

// Test endpoint to simulate the approval workflow
export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing approval workflow...');
    
    // Step 1: Create a test query for approval
    const testQuery = {
      appNo: `TEST-${Date.now()}`,
      customerName: 'Test Customer',
      branch: 'Test Branch', 
      queryText: 'Test query for approval workflow',
      queryType: 'General',
      sendTo: 'both',
      currentUser: {
        name: 'Operations Tester',
        role: 'Operations Executive'
      }
    };
    
    console.log('📝 Step 1: Creating test query...');
    const createResponse = await fetch(`${request.nextUrl.origin}/api/queries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testQuery)
    });
    
    const createResult = await createResponse.json();
    if (!createResult.success) {
      throw new Error('Failed to create test query');
    }
    
    const createdQuery = createResult.data[0];
    console.log(`✅ Step 1: Created query ${createdQuery.id} - ${createdQuery.appNo}`);
    
    // Step 2: Propose an action (simulate operations team proposing approval)
    console.log('🎯 Step 2: Proposing action for approval...');
    const proposeResponse = await fetch(`${request.nextUrl.origin}/api/query-actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        queryId: createdQuery.id,
        action: 'approve',
        operationTeamMember: 'Operations Tester',
        remarks: 'Test approval proposal',
        currentUser: {
          name: 'Operations Tester',
          role: 'Operations Executive'
        }
      })
    });
    
    const proposeResult = await proposeResponse.json();
    if (!proposeResult.success) {
      throw new Error('Failed to propose action');
    }
    
    console.log(`✅ Step 2: Proposed approval for query ${createdQuery.id}`);
    
    // Wait a moment for the approval request to be created
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 3: Get approval requests
    console.log('📋 Step 3: Getting approval requests...');
    const approvalsResponse = await fetch(`${request.nextUrl.origin}/api/approvals`);
    const approvalsResult = await approvalsResponse.json();
    
    const testApprovalRequest = approvalsResult.data.approvals.find(
      (approval: any) => approval.queryId === createdQuery.id
    );
    
    if (!testApprovalRequest) {
      throw new Error('Test approval request not found');
    }
    
    console.log(`✅ Step 3: Found approval request ${testApprovalRequest.id}`);
    
    // Step 4: Approve the request (simulate approval team approving)
    console.log('✅ Step 4: Approving the request...');
    const approveResponse = await fetch(`${request.nextUrl.origin}/api/approvals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'approve',
        requestIds: [testApprovalRequest.id],
        comment: 'Test approval by approval team',
        approverName: 'Test Approver'
      })
    });
    
    const approveResult = await approveResponse.json();
    if (!approveResult.success) {
      throw new Error('Failed to approve request');
    }
    
    console.log(`✅ Step 4: Approved request ${testApprovalRequest.id}`);
    
    // Step 5: Verify the query is now resolved
    console.log('🔍 Step 5: Verifying query resolution...');
    const verifyResponse = await fetch(`${request.nextUrl.origin}/api/queries?status=resolved`);
    const verifyResult = await verifyResponse.json();
    
    const resolvedQuery = verifyResult.data.find((query: any) => query.id === createdQuery.id);
    
    if (!resolvedQuery) {
      throw new Error('Query not found in resolved queries');
    }
    
    console.log(`✅ Step 5: Query ${resolvedQuery.id} is now resolved by ${resolvedQuery.resolvedBy}`);
    
    return NextResponse.json({
      success: true,
      message: 'Approval workflow test completed successfully',
      data: {
        testQuery: createdQuery,
        approvalRequest: testApprovalRequest,
        resolvedQuery: resolvedQuery,
        steps: [
          '✅ Created test query',
          '✅ Proposed approval action', 
          '✅ Found approval request',
          '✅ Approved by approval team',
          '✅ Verified query resolution'
        ]
      }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('❌ Approval workflow test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      message: 'Approval workflow test failed'
    }, { status: 500 });
  }
}