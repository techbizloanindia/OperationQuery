import { connectToDatabase } from '../mongodb';
import { ObjectId } from 'mongodb';

export interface ChatMessage {
  _id?: ObjectId;
  queryId: string;
  message: string;
  responseText: string;
  sender: string;
  senderRole: string;
  team: string;
  timestamp: Date;
  isRead?: boolean;
  isSystemMessage?: boolean;
  actionType?: 'message' | 'approval' | 'revert' | 'resolution';
  metadata?: {
    queryStatus?: string;
    approvalId?: string;
    originalQueryId?: string;
    [key: string]: any;
  };
}

export interface QueryChatHistory {
  _id?: ObjectId;
  queryId: string;
  appNo: string;
  customerName: string;
  queryTitle: string;
  queryStatus: string;
  markedForTeam: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date; // When query was approved/resolved
  archiveReason?: string; // approved, rejected, deferred, otc
}

export class ChatStorageService {
  private static collectionName = 'query_chats';
  private static messagesCollectionName = 'chat_messages';
  private static archivedChatsCollectionName = 'archived_chats';

  // Get database connection
  private static async getDatabase() {
    try {
      const { db } = await connectToDatabase();
      return db;
    } catch (error) {
      console.error('Failed to connect to database:', error);
      throw error;
    }
  }

  // Get archived chats collection
  private static async getArchivedChatsCollection() {
    const db = await this.getDatabase();
    return db.collection(this.archivedChatsCollectionName);
  }

  // Get chat collection
  private static async getChatCollection() {
    const db = await this.getDatabase();
    return db.collection(this.collectionName);
  }

  // Get messages collection
  private static async getMessagesCollection() {
    const db = await this.getDatabase();
    return db.collection(this.messagesCollectionName);
  }

  /**
   * Store a chat message to database - ISOLATED by queryId
   * Ensures message is stored only for the specific query
   */
  static async storeChatMessage(message: Omit<ChatMessage, '_id'>): Promise<ChatMessage | null> {
    try {
      const collection = await this.getMessagesCollection();
      
      // Ensure queryId is stored consistently as string
      const normalizedMessage = {
        ...message,
        queryId: message.queryId.toString()
      };
      
      // Check for duplicates within the same query only
      const existing = await collection.findOne({
        queryId: normalizedMessage.queryId,
        message: normalizedMessage.message,
        sender: normalizedMessage.sender,
        timestamp: {
          $gte: new Date(new Date(normalizedMessage.timestamp).getTime() - 5000), // 5 second window
          $lte: new Date(new Date(normalizedMessage.timestamp).getTime() + 5000)
        }
      });

      if (existing) {
        console.log(`🔒 Duplicate detected in query ${normalizedMessage.queryId} thread, skipping`);
        return existing as ChatMessage;
      }

      // Insert new message with normalized queryId
      const result = await collection.insertOne({
        ...normalizedMessage,
        timestamp: new Date(normalizedMessage.timestamp),
        createdAt: new Date(),
        isRead: false
      });

      console.log(`✅ Stored message in isolated thread for query ${normalizedMessage.queryId}: ${result.insertedId}`);
      
      // Return the stored message
      const storedMessage = await collection.findOne({ _id: result.insertedId });
      return storedMessage as ChatMessage;

    } catch (error) {
      console.error('Error storing chat message:', error);
      return null;
    }
  }

  /**
   * Get chat messages for a query - ISOLATED by queryId
   * Ensures each query has its own separate chat thread
   */
  static async getChatMessages(queryId: string): Promise<ChatMessage[]> {
    try {
      const collection = await this.getMessagesCollection();
      
      // STRICT: Only get messages for this specific queryId
      // Convert to string for consistent comparison
      const queryIdStr = queryId.toString();
      
      const messages = await collection
        .find({
          $or: [
            { queryId: queryIdStr },
            { queryId: parseInt(queryIdStr) } // Handle both string and number formats
          ]
        })
        .sort({ timestamp: 1 })
        .toArray();

      console.log(`🔒 ChatStorage: Retrieved ${messages.length} isolated messages for query ${queryId}`);
      return messages as ChatMessage[];
    } catch (error) {
      console.error('Error retrieving chat messages:', error);
      return [];
    }
  }

  /**
   * Archive chat history when query is approved/resolved
   */
  static async archiveQueryChat(
    queryId: string,
    queryData: {
      appNo: string;
      customerName: string;
      queryTitle: string;
      queryStatus: string;
      markedForTeam: string;
    },
    archiveReason: string = 'approved'
  ): Promise<QueryChatHistory | null> {
    try {
      const archivedChatsCollection = await this.getArchivedChatsCollection();
      const messagesCollection = await this.getMessagesCollection();

      // Get all messages for this query
      const messages = await messagesCollection
        .find({ queryId })
        .sort({ timestamp: 1 })
        .toArray();

      // Create chat history record
      const chatHistory: Omit<QueryChatHistory, '_id'> = {
        queryId,
        appNo: queryData.appNo,
        customerName: queryData.customerName,
        queryTitle: queryData.queryTitle,
        queryStatus: queryData.queryStatus,
        markedForTeam: queryData.markedForTeam,
        messages: messages as ChatMessage[],
        createdAt: new Date(),
        updatedAt: new Date(),
        archivedAt: new Date(),
        archiveReason
      };

      // Check if already archived
      const existing = await archivedChatsCollection.findOne({ queryId });
      if (existing) {
        // Update existing archive
        await archivedChatsCollection.updateOne(
          { queryId },
          {
            $set: {
              ...chatHistory,
              updatedAt: new Date(),
              archivedAt: new Date()
            }
          }
        );
        console.log(`✅ Updated archived chat history for query ${queryId}`);
        return existing as QueryChatHistory;
      } else {
        // Create new archive
        const result = await archivedChatsCollection.insertOne(chatHistory);
        console.log(`✅ Archived chat history for query ${queryId}: ${result.insertedId}`);
        
        const archived = await archivedChatsCollection.findOne({ _id: result.insertedId });
        return archived as QueryChatHistory;
      }

    } catch (error) {
      console.error('Error archiving chat history:', error);
      return null;
    }
  }

  /**
   * Get archived chat history for a query
   */
  static async getArchivedChatHistory(queryId: string): Promise<QueryChatHistory | null> {
    try {
      const collection = await this.getArchivedChatsCollection();
      const archived = await collection.findOne({ queryId });
      return archived as QueryChatHistory;
    } catch (error) {
      console.error('Error retrieving archived chat history:', error);
      return null;
    }
  }

  /**
   * Get all archived chats (for Query Raised section)
   */
  static async getAllArchivedChats(
    filters: {
      appNo?: string;
      customerName?: string;
      markedForTeam?: string;
      archiveReason?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<QueryChatHistory[]> {
    try {
      console.log('🔍 ChatStorageService: Getting archived chats with filters:', filters);
      const collection = await this.getArchivedChatsCollection();
      console.log('✅ ChatStorageService: Got archived chats collection');
      
      // Build query filter
      const query: any = {};
      if (filters.appNo) query.appNo = { $regex: filters.appNo, $options: 'i' };
      if (filters.customerName) query.customerName = { $regex: filters.customerName, $options: 'i' };
      if (filters.markedForTeam) query.markedForTeam = filters.markedForTeam;
      if (filters.archiveReason) query.archiveReason = filters.archiveReason;

      console.log('🔍 ChatStorageService: Query filter:', query);

      // Execute query with pagination
      const cursor = collection
        .find(query)
        .sort({ archivedAt: -1 });

      if (filters.offset) cursor.skip(filters.offset);
      if (filters.limit) cursor.limit(filters.limit);

      const results = await cursor.toArray();
      console.log(`📊 ChatStorageService: Found ${results.length} archived chats`);
      return results as QueryChatHistory[];

    } catch (error) {
      console.error('❌ ChatStorageService: Error retrieving archived chats:', error);
      return [];
    }
  }

  /**
   * Sync in-memory messages to database
   */
  static async syncInMemoryMessages(inMemoryMessages: any[]): Promise<number> {
    try {
      if (!inMemoryMessages || inMemoryMessages.length === 0) {
        return 0;
      }

      let syncedCount = 0;
      for (const msg of inMemoryMessages) {
        const chatMessage: Omit<ChatMessage, '_id'> = {
          queryId: msg.queryId?.toString() || 'unknown',
          message: msg.message || msg.responseText || '',
          responseText: msg.responseText || msg.message || '',
          sender: msg.sender || 'Unknown User',
          senderRole: msg.senderRole || 'unknown',
          team: msg.team || msg.senderRole || 'Unknown',
          timestamp: new Date(msg.timestamp || Date.now()),
          isRead: msg.isRead || false,
          isSystemMessage: msg.isSystemMessage || false,
          actionType: msg.actionType || 'message'
        };

        const stored = await this.storeChatMessage(chatMessage);
        if (stored) syncedCount++;
      }

      console.log(`✅ Synced ${syncedCount} in-memory messages to database`);
      return syncedCount;

    } catch (error) {
      console.error('Error syncing in-memory messages:', error);
      return 0;
    }
  }

  /**
   * Ensure database indexes for performance
   */
  static async ensureIndexes(): Promise<void> {
    try {
      const messagesCollection = await this.getMessagesCollection();
      const chatCollection = await this.getChatCollection();

      // Create indexes for messages collection
      await messagesCollection.createIndex({ queryId: 1 });
      await messagesCollection.createIndex({ timestamp: -1 });
      await messagesCollection.createIndex({ sender: 1 });
      await messagesCollection.createIndex({ senderRole: 1 });

      // Create indexes for chat history collection
      await chatCollection.createIndex({ queryId: 1 }, { unique: true });
      await chatCollection.createIndex({ appNo: 1 });
      await chatCollection.createIndex({ customerName: 1 });
      await chatCollection.createIndex({ markedForTeam: 1 });
      await chatCollection.createIndex({ archivedAt: -1 });
      await chatCollection.createIndex({ archiveReason: 1 });

      console.log('✅ Database indexes ensured for chat storage');

    } catch (error) {
      console.error('Error ensuring database indexes:', error);
    }
  }
}

// Auto-ensure indexes on module load
if (process.env.NODE_ENV !== 'production') {
  ChatStorageService.ensureIndexes().catch(console.error);
}
