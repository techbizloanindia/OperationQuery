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
    
    console.log(`💬 Fetching chat remarks for query ID: ${queryId}`);
    
    // Get remarks from database first
    let queryRemarks: RemarkMessageResponse[] = [];
    
    try {
      const dbRemarks = await RemarkModel.getRemarks(queryId);
      queryRemarks = dbRemarks.map(msg => ({
        id: `db-${msg.timestamp.getTime()}-${msg.userName}`,
        queryId: queryId,
        remark: msg.content,
        text: msg.content,
        sender: msg.userName,
        senderRole: msg.userRole,
        timestamp: msg.timestamp.toISOString(),
        team: msg.team || msg.userRole,
        responseText: msg.content
      }));
    } catch (dbError) {
      console.warn('Failed to load from database, using in-memory storage:', dbError);
      // Fallback to in-memory storage
      queryRemarks = remarksDatabase.filter(msg => msg.queryId === queryId);
    }
    
    // Add in-memory remarks that aren't in database
    const inMemoryRemarks = remarksDatabase.filter(msg => 
      msg.queryId === queryId && 
      !queryRemarks.some(dbMsg => 
        dbMsg.remark === msg.remark && 
        dbMsg.sender === msg.sender && 
        Math.abs(new Date(dbMsg.timestamp).getTime() - new Date(msg.timestamp).getTime()) < 1000
      )
    );
    queryRemarks = [...queryRemarks, ...inMemoryRemarks];
    
    // Also get messages from global message database (from query-responses API)
    if (typeof global !== 'undefined' && global.queryMessagesDatabase) {
      const globalMessages = global.queryMessagesDatabase
        .filter(msg => msg.queryId === parseInt(queryId))
        .map(msg => ({
          id: `global-${msg.id}`,
          queryId: queryId,
          remark: msg.message || msg.responseText,
          text: msg.message || msg.responseText,
          sender: msg.sender,
          senderRole: msg.senderRole || msg.team || 'user',
          timestamp: msg.timestamp,
          team: msg.team || msg.senderRole || 'operations',
          responseText: msg.message || msg.responseText
        }));
        
      // Add global messages that aren't already in the result
      globalMessages.forEach(globalMsg => {
        const exists = queryRemarks.some(existingMsg => 
          existingMsg.remark === globalMsg.remark && 
          existingMsg.sender === globalMsg.sender && 
          Math.abs(new Date(existingMsg.timestamp).getTime() - new Date(globalMsg.timestamp).getTime()) < 5000
        );
        if (!exists) {
          queryRemarks.push(globalMsg);
        }
      });
      
      console.log(`📨 Added ${globalMessages.length} messages from global message database for query ${queryId}`);
    }
    
    // Also get messages from ChatStorageService (enhanced chat storage)
    try {
      const chatMessages = await (async () => {
        const { ChatStorageService } = await import('@/lib/services/ChatStorageService');
        return ChatStorageService.getChatMessages(queryId);
      })();
      
      if (chatMessages && chatMessages.length > 0) {
        const chatMessageRemarks = chatMessages.map(msg => ({
          id: `chat-${msg._id}`,
          queryId: queryId,
          remark: msg.message || msg.responseText,
          text: msg.message || msg.responseText,
          sender: msg.sender,
          senderRole: msg.senderRole || msg.team || 'user',
          timestamp: msg.timestamp.toISOString(),
          team: msg.team || msg.senderRole || 'operations',
          responseText: msg.message || msg.responseText
        }));
        
        // Add chat messages that aren't already in the result
        chatMessageRemarks.forEach(chatMsg => {
          const exists = queryRemarks.some(existingMsg => 
            existingMsg.remark === chatMsg.remark && 
            existingMsg.sender === chatMsg.sender && 
            Math.abs(new Date(existingMsg.timestamp).getTime() - new Date(chatMsg.timestamp).getTime()) < 5000
          );
          if (!exists) {
            queryRemarks.push(chatMsg);
          }
        });
        
        console.log(`💾 Added ${chatMessageRemarks.length} messages from ChatStorageService for query ${queryId}`);
      }
    } catch (dbError) {
      console.warn('Failed to load chat messages from ChatStorageService:', dbError);
    }
    
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
    
    console.log(`✅ Found ${uniqueRemarks.length} chat remarks for query ${queryId} (${queryRemarks.length - uniqueRemarks.length} duplicates removed)`);
    
    return NextResponse.json({
      success: true,
      data: uniqueRemarks,
      count: uniqueRemarks.length
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
    
    // Check for duplicates before creating new remark
    const existingRemark = remarksDatabase.find(msg => 
      msg.queryId === queryId &&
      msg.remark === messageText &&
      msg.sender === sender &&
      Date.now() - new Date(msg.timestamp).getTime() < 5000 // Within 5 seconds
    );
    
    if (existingRemark) {
      console.log(`⚠️ Duplicate remark detected, returning existing remark`);
      return NextResponse.json({
        success: true,
        data: existingRemark,
        remark: 'Remark already exists'
      });
    }
    
    // Create new chat remark
    const newRemark: RemarkMessageResponse = {
      id: `chat-${queryId}-${Date.now()}-${sender}`,
      queryId: queryId,
      remark: messageText,
      text: messageText,
      sender: sender,
      senderRole: senderRole,
      timestamp: new Date().toISOString(),
      team: team || senderRole,
      responseText: messageText
    };
    
    // Add to in-memory chat database
    remarksDatabase.push(newRemark);
    
    // Save to persistent storage using RemarkModel
    try {
      const savedRemark = await RemarkModel.addRemark(queryId, {
        caseNumber: `CASE-${queryId}`,
        userId: sender,
        userName: sender,
        userRole: senderRole,
        team: team || senderRole,
        content: messageText,
        remarkType: 'response'
      });
      
      // Update the remark with database ID if available
      if (savedRemark) {
        newRemark.id = `db-${savedRemark.timestamp.getTime()}`;
      }
    } catch (dbError) {
      console.warn('Failed to save to database, using in-memory storage:', dbError);
    }

    // Also save using ChatStorageService for enhanced chat storage
    try {
      const chatMessage = {
        queryId: queryId,
        message: messageText,
        responseText: messageText,
        sender: sender,
        senderRole: senderRole,
        team: team || senderRole,
        timestamp: new Date(),
        isSystemMessage: false,
        actionType: 'message' as const
      };

      const stored = await ChatStorageService.storeChatMessage(chatMessage);
      if (stored) {
        console.log(`💾 Chat remark stored to database: ${stored._id}`);
      }
    } catch (error) {
      console.error('Error storing chat remark to database:', error);
      // Continue with existing flow
    }
    
    // Notify real-time subscribers
    notifySubscribers(queryId, newRemark);
    
    console.log(`💬 Added new chat remark for query ${queryId}:`, newRemark);
    
    return NextResponse.json({
      success: true,
      data: newRemark,
      remark: 'Chat remark added successfully'
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