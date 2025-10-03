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
    
    console.log(`💬 Chat API: Fetching ISOLATED chat thread for query ID: ${normalizedQueryId}`);
    
    // CRITICAL: Each query has its own isolated chat thread
    // Only fetch messages specifically for THIS queryId with ZERO contamination
    
    let queryRemarks: RemarkMessageResponse[] = [];

    // ONLY SOURCE: Get messages from ChatStorageService (MongoDB) - ULTRA-STRICT ISOLATION
    // Single source of truth to prevent duplicates and cross-query contamination
    try {
      const chatMessages = await ChatStorageService.getChatMessages(normalizedQueryId);
      
      if (chatMessages && chatMessages.length > 0) {
        // CRITICAL: Server-side validation to ensure ZERO cross-query contamination
        const validatedMessages = chatMessages.filter(msg => {
          const msgQueryId = msg.queryId?.toString().trim();
          const isValid = msgQueryId === normalizedQueryId;
          
          if (!isValid) {
            console.error(`🚫 CRITICAL: Rejected contaminated message in Chat API - Target: "${normalizedQueryId}", Actual: "${msgQueryId}"`);
          }
          
          return isValid;
        });
        
        if (validatedMessages.length !== chatMessages.length) {
          console.error(`🚨 SECURITY ALERT: Filtered ${chatMessages.length - validatedMessages.length} contaminated messages from Chat API response for query ${normalizedQueryId}`);
        }
        
        queryRemarks = validatedMessages.map(msg => ({
          id: `db-${msg._id?.toString() || Date.now()}`,
          queryId: normalizedQueryId, // Always use normalized ID to prevent contamination
          remark: msg.message || msg.responseText,
          text: msg.message || msg.responseText,
          sender: msg.sender,
          senderRole: msg.senderRole || msg.team || 'user',
          timestamp: msg.timestamp.toISOString(),
          team: msg.team || msg.senderRole || 'operations',
          responseText: msg.message || msg.responseText,
          // Server validation flags
          serverValidated: true,
          originalQueryId: msg.queryId
        }));
        
        console.log(`✅ Chat API: Loaded ${queryRemarks.length} messages from ChatStorageService for query ${normalizedQueryId}`);
        
        // Log message details for debugging contamination
        queryRemarks.forEach((remark, index) => {
          console.log(`  📝 Chat API Message ${index + 1}:`, {
            id: remark.id,
            queryId: remark.queryId,
            sender: remark.sender,
            senderRole: remark.senderRole,
            team: remark.team,
            messagePreview: remark.remark?.substring(0, 30) + '...'
          });
        });
      }
    } catch (dbError) {
      console.error('❌ Chat API: Failed to load from ChatStorageService:', dbError);
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
    
    console.log(`✅ Chat API: Query ${queryId} isolated chat thread contains ${uniqueRemarks.length} messages`);
    console.log(`🔒 Chat API: Chat isolation verified - No cross-query contamination`);
    
    // Final validation: Check for any sales/credit team contamination in this specific context
    const teamDistribution = uniqueRemarks.reduce((acc: any, remark) => {
      const team = remark.team || remark.senderRole || 'unknown';
      acc[team] = (acc[team] || 0) + 1;
      return acc;
    }, {});
    
    console.log(`📊 Chat API: Team message distribution for query ${queryId}:`, teamDistribution);
    
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
    const { remark, message, sender, senderRole, team, queryId: bodyQueryId } = body;
    
    // CRITICAL: Validate queryId consistency between URL and body
    if (bodyQueryId && bodyQueryId.toString().trim() !== normalizedQueryId) {
      console.error(`🚫 SECURITY ALERT: QueryId mismatch - URL: "${normalizedQueryId}", Body: "${bodyQueryId}"`);
      return NextResponse.json(
        { 
          success: false, 
          error: 'QueryId mismatch detected - potential contamination attempt' 
        },
        { status: 400 }
      );
    }
    
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
    
    console.log(`📝 Chat API POST: Adding message to ISOLATED thread for query ${normalizedQueryId}`);
    
    // Enhanced duplicate check with stricter validation
    try {
      const recentMessages = await ChatStorageService.getChatMessages(normalizedQueryId);
      const isDuplicate = recentMessages.some(msg => 
        msg.message === messageText &&
        msg.sender === sender &&
        msg.queryId === normalizedQueryId && // Additional queryId validation
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
            responseText: messageText,
            isDuplicate: true
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
        console.log(`✅ Chat message stored to MongoDB (chat_messages): ${storedMessage._id}`);
      }
    } catch (error) {
      console.error('Error storing chat message to MongoDB:', error);
      throw new Error('Failed to store message to database');
    }
    
    // CRITICAL: Also store in Query model's remarks array for Operations team visibility
    try {
      const { connectDB } = await import('@/lib/mongodb');
      const { db } = await connectDB();
      const { ObjectId } = await import('mongodb');
      
      const newRemark = {
        id: `remark-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text: messageText,
        author: sender,
        authorRole: senderRole,
        authorTeam: team || senderRole,
        timestamp: new Date(),
        isEdited: false
      };
      
      // Try to find and update the query document
      // Try multiple ID formats to ensure we find the right document
      const queryFilter: any = {
        $or: [
          { id: normalizedQueryId },
          { 'queries.id': normalizedQueryId }
        ]
      };
      
      // If it looks like an ObjectId, add that to the filter
      if (ObjectId.isValid(normalizedQueryId)) {
        queryFilter.$or.push({ _id: new ObjectId(normalizedQueryId) });
      }
      
      // Update the query document to add this remark
      const updateResult = await db.collection('queries').updateOne(
        queryFilter,
        { 
          $push: { remarks: newRemark } as any,
          $set: { lastUpdated: new Date() } as any
        }
      );
      
      if (updateResult.modifiedCount > 0) {
        console.log(`✅ Remark added to Query model for Operations team visibility`);
      } else {
        console.warn(`⚠️ Could not update Query model - query ${normalizedQueryId} may not exist in queries collection`);
      }
    } catch (remarkError) {
      console.error('❌ Error adding remark to Query model:', remarkError);
      // Don't throw - message is already stored in ChatStorageService
    }
    
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
    
    console.log(`✅ Chat API: Added new message for query ${normalizedQueryId}:`, {
      messageId: newRemark.id,
      queryId: normalizedQueryId,
      sender: newRemark.sender,
      senderRole: newRemark.senderRole,
      team: newRemark.team,
      messageLength: messageText.length,
      timestamp: newRemark.timestamp,
      isolationVerified: true,
      storedInDB: !!storedMessage
    });
    
    // Immediate verification - try to retrieve the message we just stored
    try {
      const verificationMessages = await ChatStorageService.getChatMessages(normalizedQueryId);
      const justStored = verificationMessages.find(msg => 
        msg.message === messageText && 
        msg.sender === sender &&
        Math.abs(new Date(msg.timestamp).getTime() - new Date().getTime()) < 10000 // Within 10 seconds
      );
      
      if (justStored) {
        console.log(`✅ Chat API: Verified message storage - message is retrievable:`, {
          storedId: justStored._id,
          queryId: justStored.queryId,
          message: justStored.message.substring(0, 50) + '...'
        });
      } else {
        console.warn(`⚠️ Chat API: Warning - just stored message not found in retrieval for query ${normalizedQueryId}`);
      }
    } catch (verifyError) {
      console.error('❌ Chat API: Failed to verify message storage:', verifyError);
    }
    
    return NextResponse.json({
      success: true,
      data: newRemark,
      message: 'Chat message added successfully',
      debug: {
        queryId: normalizedQueryId,
        team: newRemark.team,
        senderRole: newRemark.senderRole
      }
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