import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(request: NextRequest) {
  try {
    // Clear the global approvals database
    if (global.approvalRequestsDatabase) {
      global.approvalRequestsDatabase = [];
    }

    return NextResponse.json({
      success: true,
      message: 'All approval database entries have been cleared'
    });
  } catch (error) {
    console.error('Error clearing approvals database:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to clear approvals database'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { targetEntries } = body;

    if (!global.approvalRequestsDatabase) {
      global.approvalRequestsDatabase = [];
    }

    let removedCount = 0;

    if (targetEntries && Array.isArray(targetEntries)) {
      // Remove specific entries by request ID
      const initialLength = global.approvalRequestsDatabase.length;
      global.approvalRequestsDatabase = global.approvalRequestsDatabase.filter((approval: any) => {
        return !targetEntries.includes(approval.requestId);
      });
      removedCount = initialLength - global.approvalRequestsDatabase.length;
    } else {
      // Remove the specific entries we identified
      const initialLength = global.approvalRequestsDatabase.length;
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
      removedCount = initialLength - global.approvalRequestsDatabase.length;
    }

    return NextResponse.json({
      success: true,
      message: `Removed ${removedCount} entries from approvals database`,
      removedCount,
      remainingCount: global.approvalRequestsDatabase.length
    });
  } catch (error) {
    console.error('Error removing specific approvals:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to remove specific approvals'
      },
      { status: 500 }
    );
  }
}