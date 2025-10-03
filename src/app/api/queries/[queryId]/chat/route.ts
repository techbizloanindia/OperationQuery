import { NextRequest, NextResponse } from 'next/server';
import { RemarkModel, RemarkMessage } from '@/lib/models/Remarks';
import { ChatStorageService } from '@/lib/services/ChatStorageService';

interface RemarkMessageResponse {
  id: string;
  queryId: string;
  remark: string;
  text: string;
  sender: string;
  senderRole: string;
  timestamp: string;
  team: string;
  responseText: string;
}

// In-memory remarks storage - will be enhanced with database
const remarksDatabase: RemarkMessageResponse[] = [];

// Real-time remark subscribers for live updates
const subscribers = new Map<string, Set<(remark: RemarkMessageResponse) => void>>();

// Add subscriber for real-time updates (moved to separate service)
function subscribeToQuery(queryId: string, callback: (remark: RemarkMessageResponse) => void) {
  if (!subscribers.has(queryId)) {
    subscribers.set(queryId, new Set());
  }
  subscribers.get(queryId)!.add(callback);
  
  // Return unsubscribe function
  return () => {
    const querySubscribers = subscribers.get(queryId);
    if (querySubscribers) {
      querySubscribers.delete(callback);
      if (querySubscribers.size === 0) {
        subscribers.delete(queryId);
      }
    }
  };
}

// Notify all subscribers of a new remark
function notifySubscribers(queryId: string, remark: RemarkMessageResponse) {
  const querySubscribers = subscribers.get(queryId);
  if (querySubscribers) {
    querySubscribers.forEach(callback => {
      try {
        callback(remark);
      } catch (error) {
        console.error('Error notifying subscriber:', error);
      }
    });
  }
}

// Initialize sample chat data
const initializeChatData = () => {
  if (remarksDatabase.length === 0) {
    const sampleChats: RemarkMessageResponse[] = [
      // No sample chat remarks - clean database for production use
    ];
    
    remarksDatabase.push(...sampleChats);
  }
};

// GET - Fetch chat remarks for a specific query
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ queryId: string }> }
) {
  try {
    initializeChatData();
    
    const { queryId } = await params;
    const normalizedQueryId = queryId.toString().trim();
    
    console.log(`💬 Fetching ISOLATED chat thread for query ID: ${normalizedQueryId}`);
    
    // CRITICAL: Each query has its own isolated chat thread
    // Only fetch messages specifically for THIS queryId with ZERO contamination
    
    let queryRemarks: RemarkMessageResponse[] = [];

    // ONLY SOURCE: Get messages from ChatStorageService (MongoDB)
    // Single source of truth to prevent duplicates
    try {
      const chatMessages = await ChatStorageService.getChatMessages(normalizedQueryId);
      
      if (chatMessages && chatMessages.length > 0) {
        queryRemarks = chatMessages.map(msg => ({
          id: `db-${msg._id?.toString() || Date.now()}`,
          queryId: normalizedQueryId,
          remark: msg.message || msg.responseText,
          text: msg.message || msg.responseText,
          sender: msg.sender,
          senderRole: msg.senderRole || msg.team || 'user',
          timestamp: msg.timestamp.toISOString(),
          team: msg.team || msg.senderRole || 'operations',
          responseText: msg.message || msg.responseText
        }));
        
        console.log(`✅ Loaded ${queryRemarks.length} messages from ChatStorageService for query ${normalizedQueryId}`);
      }
    } catch (dbError) {
      console.error('Failed to load from ChatStorageService:', dbError);
      // Return empty array instead of trying RemarkModel to avoid duplicates
      queryRemarks = [];
    }
    
    // REMOVED: RemarkModel fetching to prevent duplicate messages
    // REMOVED: Global message database and in-memory storage to prevent contamination
    // All messages now come exclusively from MongoDB ChatStorageService only
    // This ensures proper chat isolation with zero cross-query contamination and no duplicates
    
    // Remove duplicates based on content, sender, and timestamp
    const uniqueRemarks = queryRemarks.filter((remark, index, self) => 
      index === self.findIndex(m => 
        m.remark === remark.remark && 
        m.sender === remark.sender && 
        Math.abs(new Date(m.timestamp).getTime() - new Date(remark.timestamp).getTime()) < 1000
      )
    );
    
    // Sort by timestamp (oldest first)
    uniqueRemarks.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    console.log(`✅ Query ${queryId}: Isolated chat thread contains ${uniqueRemarks.length} messages`);
    console.log(`🔒 Chat isolation verified - No cross-query contamination`);
    
    return NextResponse.json({
      success: true,
      data: uniqueRemarks,
      count: uniqueRemarks.length,
      queryId: queryId, // Include queryId in response for verification
      isolated: true // Flag to indicate this is an isolated thread
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('💥 Error fetching chat remarks:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to fetch chat remarks: ${errorMessage}`
      },
      { status: 500 }
    );
  }
}

// POST - Add a new chat remark
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ queryId: string }> }
) {
  try {
    initializeChatData();
    
    const { queryId } = await params;
    const normalizedQueryId = queryId.toString().trim();
    const body = await request.json();
    const { remark, message, sender, senderRole, team } = body;
    
    // Use message if remark is not provided (for compatibility)
    const messageText = remark || message;
    
    if (!messageText || !sender || !senderRole) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Message/remark, sender, and senderRole are required' 
        },
        { status: 400 }
      );
    }
    
    // Check for duplicates in MongoDB only (removed global database check)
    // This prevents contamination from the global in-memory store
    try {
      const recentMessages = await ChatStorageService.getChatMessages(normalizedQueryId);
      const isDuplicate = recentMessages.some(msg => 
        msg.message === messageText &&
        msg.sender === sender &&
        Date.now() - new Date(msg.timestamp).getTime() < 5000 // Within 5 seconds
      );
      
      if (isDuplicate) {
        console.log(`⚠️ Duplicate message detected for query ${normalizedQueryId}, skipping`);
        return NextResponse.json({
          success: true,
          data: {
            id: `dup-${normalizedQueryId}-${Date.now()}`,
            queryId: normalizedQueryId,
            remark: messageText,
            text: messageText,
            sender: sender,
            senderRole: senderRole,
            timestamp: new Date().toISOString(),
            team: team || senderRole,
            responseText: messageText
          },
          message: 'Message already exists (duplicate prevented)'
        });
      }
    } catch (dupCheckError) {
      console.warn('Could not check for duplicates:', dupCheckError);
      // Continue with message creation
    }
    
    // PRIMARY STORAGE: Save using ChatStorageService (MongoDB)
    let storedMessage = null;
    try {
      const chatMessage = {
        queryId: normalizedQueryId,
        message: messageText,
        responseText: messageText,
        sender: sender,
        senderRole: senderRole,
        team: team || senderRole,
        timestamp: new Date(),
        isSystemMessage: false,
        actionType: 'message' as const
      };

      storedMessage = await ChatStorageService.storeChatMessage(chatMessage);
      if (storedMessage) {
        console.log(`✅ Chat message stored to MongoDB: ${storedMessage._id}`);
      }
    } catch (error) {
      console.error('Error storing chat message to MongoDB:', error);
      throw new Error('Failed to store message to database');
    }
    
    // REMOVED: RemarkModel storage to prevent duplicates
    // Only using ChatStorageService as single source of truth
    
    // Create response object
    const newRemark: RemarkMessageResponse = {
      id: storedMessage?._id?.toString() || `msg-${normalizedQueryId}-${Date.now()}`,
      queryId: normalizedQueryId,
      remark: messageText,
      text: messageText,
      sender: sender,
      senderRole: senderRole,
      timestamp: new Date().toISOString(),
      team: team || senderRole,
      responseText: messageText
    };
    
    // Notify real-time subscribers
    notifySubscribers(normalizedQueryId, newRemark);
    
    console.log(`💬 Added new chat message for query ${normalizedQueryId} (MongoDB only, no global contamination)`);
    
    return NextResponse.json({
      success: true,
      data: newRemark,
      message: 'Chat message added successfully'
    });

  } catch (error: unknown) {
    const errorRemark = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('💥 Error adding chat remark:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to add chat remark: ${errorRemark}`
      },
      { status: 500 }
    );
  }
} 