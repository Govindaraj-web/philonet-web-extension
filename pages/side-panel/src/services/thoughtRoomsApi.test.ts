// Test file for thoughtRoomsApi addComment functionality and user ownership detection
import { addComment, thoughtRoomsAPI, AddCommentParams } from './thoughtRoomsApi';
import { philonetAuthStorage } from '../storage/auth-storage';

/**
 * Example usage of the addComment API and user ownership detection
 * 
 * This demonstrates how to use the new comment posting functionality
 * with the backend API endpoint: http://localhost:3000/v1/room/addcommentnew
 * and how user ownership detection works in conversations
 */

// Helper function to get current user ID for testing
export const getCurrentUserIdForTesting = async (): Promise<string | null> => {
  try {
    const authState = await philonetAuthStorage.get();
    console.log('🧪 Current auth state for testing:', authState);
    return authState.user?.id || null;
  } catch (error) {
    console.error('❌ Failed to get current user ID for testing:', error);
    return null;
  }
};

// Example 1: Add a new top-level comment
export const exampleAddTopLevelComment = async () => {
  const params: AddCommentParams = {
    articleId: 5598, // Your article ID
    content: "This is a great article! I really enjoyed reading about the AI developments.",
    title: "Great insights on AI", // Optional
    quote: "Selected text from the article", // Optional - from tagged content
  };

  try {
    const response = await addComment(params);
    console.log('✅ Top-level comment added:', response);
    return response;
  } catch (error) {
    console.error('❌ Failed to add top-level comment:', error);
    throw error;
  }
};

// Example 2: Add a reply to an existing comment
export const exampleAddReplyComment = async () => {
  const params: AddCommentParams = {
    articleId: 5598,
    content: "I completely agree with your point about ethical considerations.",
    parentCommentId: 6012, // ID of the comment you're replying to
    quote: "being in jail how can you govern for 30days", // Quote from parent comment
  };

  try {
    const response = await addComment(params);
    console.log('✅ Reply comment added:', response);
    return response;
  } catch (error) {
    console.error('❌ Failed to add reply comment:', error);
    throw error;
  }
};

// Example 3: Test user ownership detection in conversations
export const testUserOwnershipDetection = async () => {
  console.log('🧪 Testing user ownership detection...');
  
  try {
    const currentUserId = await getCurrentUserIdForTesting();
    console.log('👤 Testing with current user ID:', currentUserId);
    
    // Test fetching a conversation with user ownership detection
    const conversationData = await thoughtRoomsAPI.fetchConversationThread(
      5598, // articleId
      6012, // parentCommentId
      10,   // limit
      currentUserId || undefined // currentUserId for ownership detection
    );
    
    console.log('✅ Conversation data with ownership detection:', conversationData);
    
    // Log which messages are owned by current user
    const ownMessages = conversationData.messages.filter(msg => msg.isOwn);
    const otherMessages = conversationData.messages.filter(msg => !msg.isOwn);
    
    console.log('📊 User ownership breakdown:');
    console.log(`- Your messages: ${ownMessages.length}`);
    console.log(`- Other messages: ${otherMessages.length}`);
    console.log('- Your messages:', ownMessages.map(msg => ({ 
      id: msg.id, 
      text: msg.text.substring(0, 50) + '...', 
      author: msg.author 
    })));
    
    return {
      totalMessages: conversationData.messages.length,
      ownMessages: ownMessages.length,
      otherMessages: otherMessages.length,
      conversationData
    };
  } catch (error) {
    console.error('❌ User ownership detection test failed:', error);
    throw error;
  }
};

// Example 4: Test thought starter ownership detection
export const testThoughtStarterOwnership = async () => {
  console.log('🧪 Testing thought starter ownership detection...');
  
  try {
    const currentUserId = await getCurrentUserIdForTesting();
    console.log('👤 Testing thought starter ownership with user ID:', currentUserId);
    
    // Fetch comments and transform with user ownership detection
    const commentsResponse = await thoughtRoomsAPI.fetchComments({
      articleId: 5598,
      limit: 10
    });
    
    const transformedThoughts = commentsResponse.comments.map(comment => 
      thoughtRoomsAPI.transformCommentToThoughtStarter(comment, currentUserId || undefined)
    );
    
    // Log ownership breakdown for thought starters
    const ownThoughts = transformedThoughts.filter(thought => thought.isOwn);
    const otherThoughts = transformedThoughts.filter(thought => !thought.isOwn);
    
    console.log('✅ Thought starter ownership breakdown:');
    console.log(`- Your thought starters: ${ownThoughts.length}`);
    console.log(`- Other thought starters: ${otherThoughts.length}`);
    console.log('- Your thought starters:', ownThoughts.map(thought => ({ 
      id: thought.id, 
      title: thought.title,
      author: thought.author.name
    })));
    
    return {
      totalThoughts: transformedThoughts.length,
      ownThoughts: ownThoughts.length,
      otherThoughts: otherThoughts.length,
      thoughtStarters: transformedThoughts
    };
  } catch (error) {
    console.error('❌ Thought starter ownership detection test failed:', error);
    throw error;
  }
};

// Example 5: Add a comment with emotion
export const exampleAddCommentWithEmotion = async () => {
  const params: AddCommentParams = {
    articleId: 5598,
    content: "This made me think deeply about the implications.",
    emotion: "love", // Express emotion with the comment
    minimessage: "Additional context or note",
  };

  try {
    const response = await addComment(params);
    console.log('✅ Comment with emotion added:', response);
    return response;
  } catch (error) {
    console.error('❌ Failed to add comment with emotion:', error);
    throw error;
  }
};

// Example 4: Full-featured comment with all optional parameters
export const exampleAddFullComment = async () => {
  const params: AddCommentParams = {
    articleId: 5598,
    content: "This is a comprehensive analysis of the topic. I'd like to add some additional thoughts.",
    title: "Additional Analysis",
    parentCommentId: 6012,
    replyMessageId: 6013,
    minimessage: "Building on the previous discussion",
    quote: "The key insight from the article",
    emotion: "star",
  };

  try {
    const response = await addComment(params);
    console.log('✅ Full-featured comment added:', response);
    return response;
  } catch (error) {
    console.error('❌ Failed to add full-featured comment:', error);
    throw error;
  }
};

// Example API Response Structure
export const exampleApiResponse = {
  comment: {
    id: 6013,
    title: null,
    content: "This is a great article! I really enjoyed reading about the AI developments.",
    quote: "",
    minimessage: "",
    emotion: null,
    created_at: "2025-08-22T21:34:13.279Z",
    parent_comment_id: 6012,
    reply_message_id: null,
    parent_content: "being in jail how can you govern for 30days - this is just common sense - rightfullly puts this bill",
    parent_user_id: "Qdh6sEG7MQOkkmH557TwdAZUfzT2",
    parent_user_name: "anvith",
    senderId: "Qdh6sEG7MQOkkmH557TwdAZUfzT2",
    senderName: "anvith",
    profileImage: "https://lh3.googleusercontent.com/a/ACg8ocLeOxNqhLuCSHHmM_FhjMSB182Bfk_eYdlhFsA0gf_x6Raf7w=s96-c",
    reactionCount: 0,
    reactions: [],
    replyCount: 0,
    userReacted: false,
    userReactionType: null,
    status: "SENT",
    reply_message: null,
    mentions: [],
    comment_id: 6013,
    user_id: "Qdh6sEG7MQOkkmH557TwdAZUfzT2",
    user_picture: "https://lh3.googleusercontent.com/a/ACg8ocLeOxNqhLuCSHHmM_FhjMSB182Bfk_eYdlhFsA0gf_x6Raf7w=s96-c",
    user_name: "anvith",
    original_content: "This is a great article! I really enjoyed reading about the AI developments.",
    mentioned_users: []
  },
  room_id: 183
};

/**
 * Integration Test Function
 * 
 * This can be called from the browser console to test the API integration
 * and user ownership detection
 */
export const testAddCommentIntegration = async () => {
  console.log('🧪 Testing addComment API integration...');
  
  try {
    // Test adding a simple comment
    const result = await exampleAddTopLevelComment();
    console.log('✅ Integration test passed!', result);
    return result;
  } catch (error) {
    console.error('❌ Integration test failed:', error);
    return null;
  }
};

/**
 * Comprehensive User Ownership Test
 * 
 * Tests both thought starter and message ownership detection
 */
export const testCompleteUserOwnership = async () => {
  console.log('🎯 Running comprehensive user ownership test...');
  
  try {
    // Test 1: Thought starter ownership
    console.log('\n--- Test 1: Thought Starter Ownership ---');
    const thoughtOwnershipResult = await testThoughtStarterOwnership();
    
    // Test 2: Message ownership in conversations
    console.log('\n--- Test 2: Message Ownership in Conversations ---');
    const messageOwnershipResult = await testUserOwnershipDetection();
    
    // Test 3: Current user info
    console.log('\n--- Test 3: Current User Info ---');
    const currentUserId = await getCurrentUserIdForTesting();
    
    const summary = {
      currentUserId,
      thoughtStarters: {
        total: thoughtOwnershipResult.totalThoughts,
        own: thoughtOwnershipResult.ownThoughts,
        others: thoughtOwnershipResult.otherThoughts
      },
      messages: {
        total: messageOwnershipResult.totalMessages,
        own: messageOwnershipResult.ownMessages,
        others: messageOwnershipResult.otherMessages
      }
    };
    
    console.log('\n🎉 Complete user ownership test summary:', summary);
    return summary;
  } catch (error) {
    console.error('❌ Complete user ownership test failed:', error);
    return null;
  }
};
