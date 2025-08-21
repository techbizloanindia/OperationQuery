import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET() {
  try {
    const { db } = await connectToDatabase();
    
    // Check both collections
    const collections = await db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));
    
    const archivedChatsCollection = db.collection('archived_chats');
    const count = await archivedChatsCollection.countDocuments();
    
    const sampleDocs = await archivedChatsCollection.find({}).limit(2).toArray();
    
    return NextResponse.json({
      success: true,
      data: {
        collections: collections.map(c => c.name),
        archivedChatsCount: count,
        sampleDocs: sampleDocs.map(doc => ({
          _id: doc._id,
          queryId: doc.queryId,
          appNo: doc.appNo,
          customerName: doc.customerName,
          archiveReason: doc.archiveReason,
          messagesCount: doc.messages?.length || 0
        }))
      }
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error in test API:', error);
    
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}
