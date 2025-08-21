import { NextRequest, NextResponse } from 'next/server';
import { ChatStorageService } from '@/lib/services/ChatStorageService';

// GET - Retrieve archived chat histories
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const appNo = searchParams.get('appNo') || undefined;
    const customerName = searchParams.get('customerName') || undefined;
    const markedForTeam = searchParams.get('markedForTeam') || undefined;
    const archiveReason = searchParams.get('archiveReason') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get archived chats with filters
    const archivedChats = await ChatStorageService.getAllArchivedChats({
      appNo,
      customerName,
      markedForTeam,
      archiveReason,
      limit,
      offset
    });

    console.log(`📋 Retrieved ${archivedChats.length} archived chat histories`);

    return NextResponse.json({
      success: true,
      data: archivedChats,
      count: archivedChats.length,
      filters: {
        appNo,
        customerName,
        markedForTeam,
        archiveReason,
        limit,
        offset
      }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error retrieving archived chat histories:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        data: []
      },
      { status: 500 }
    );
  }
}

// POST - Manually archive a specific query's chat history
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { queryId, queryData, archiveReason } = body;

    if (!queryId || !queryData) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'queryId and queryData are required' 
        },
        { status: 400 }
      );
    }

    // Sync any in-memory messages first
    if (global.queryMessagesDatabase) {
      const inMemoryMessages = global.queryMessagesDatabase.filter(
        (msg: any) => msg.queryId === queryId || msg.queryId === queryId.toString()
      );

      if (inMemoryMessages.length > 0) {
        await ChatStorageService.syncInMemoryMessages(inMemoryMessages);
      }
    }

    // Archive the chat history
    const archived = await ChatStorageService.archiveQueryChat(
      queryId.toString(),
      queryData,
      archiveReason || 'manual'
    );

    if (archived) {
      console.log(`✅ Manually archived chat history for query ${queryId}`);
      
      return NextResponse.json({
        success: true,
        data: archived,
        message: 'Chat history archived successfully'
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to archive chat history' 
        },
        { status: 500 }
      );
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error manually archiving chat history:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage
      },
      { status: 500 }
    );
  }
}

// DELETE - Clear all archived chat histories (admin function)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const confirmDelete = searchParams.get('confirm') === 'true';

    if (!confirmDelete) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Delete confirmation required. Add ?confirm=true to URL' 
        },
        { status: 400 }
      );
    }

    // This would need to be implemented in ChatStorageService
    // For now, just return a placeholder response
    console.log('🗑️ Archive deletion requested (not implemented)');

    return NextResponse.json({
      success: true,
      message: 'Archive deletion feature not yet implemented'
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error deleting archived chat histories:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage
      },
      { status: 500 }
    );
  }
}
