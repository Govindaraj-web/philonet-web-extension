// Share service for handling share functionality
export interface ShareToRoomParams {
  roomId: number;
  articleUrl: string;
  articleTitle?: string;
  message?: string;
}

export interface ShareToFriendParams {
  friendId: number;
  articleUrl: string;
  articleTitle?: string;
  message?: string;
}

export interface Room {
  id: number;
  name: string;
  description: string;
  memberCount: number;
  isPrivate: boolean;
  adminName: string;
  lastActive?: string;
  unreadCount?: number;
}

export interface Friend {
  id: number;
  name: string;
  username: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen?: string;
  mutualFriends?: number;
}

class ShareService {
  // Get user's rooms
  async getRooms(): Promise<Room[]> {
    // TODO: Replace with actual API call when backend is ready
    // For now, return mock data
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            id: 1,
            name: "Tech Discussion",
            description: "Latest in technology and innovation",
            memberCount: 128,
            isPrivate: false,
            adminName: "Alex Chen",
            lastActive: "2 hours ago",
            unreadCount: 3
          },
          {
            id: 2,
            name: "Book Club",
            description: "Monthly book discussions and reviews",
            memberCount: 45,
            isPrivate: false,
            adminName: "Sarah Johnson",
            lastActive: "5 hours ago"
          },
          {
            id: 3,
            name: "Private Study Group",
            description: "Focused study sessions",
            memberCount: 12,
            isPrivate: true,
            adminName: "Michael Davis",
            lastActive: "1 day ago"
          },
          {
            id: 4,
            name: "AI & Machine Learning",
            description: "Discussions about AI developments",
            memberCount: 89,
            isPrivate: false,
            adminName: "Jennifer Liu",
            lastActive: "30 minutes ago",
            unreadCount: 7
          },
          {
            id: 5,
            name: "Startup Founders",
            description: "Entrepreneur community",
            memberCount: 67,
            isPrivate: true,
            adminName: "Robert Kim",
            lastActive: "4 hours ago",
            unreadCount: 2
          }
        ]);
      }, 800);
    });
  }

  // Get user's friends
  async getFriends(): Promise<Friend[]> {
    // TODO: Replace with actual API call when backend is ready
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            id: 1,
            name: "Emma Wilson",
            username: "@emma_w",
            isOnline: true,
            mutualFriends: 12
          },
          {
            id: 2,
            name: "David Chen",
            username: "@david_c",
            isOnline: true,
            mutualFriends: 8
          },
          {
            id: 3,
            name: "Lisa Rodriguez",
            username: "@lisa_r",
            isOnline: false,
            lastSeen: "2 hours ago",
            mutualFriends: 15
          },
          {
            id: 4,
            name: "John Smith",
            username: "@john_s",
            isOnline: false,
            lastSeen: "1 day ago",
            mutualFriends: 5
          },
          {
            id: 5,
            name: "Maria Garcia",
            username: "@maria_g",
            isOnline: true,
            mutualFriends: 9
          },
          {
            id: 6,
            name: "Tom Anderson",
            username: "@tom_a",
            isOnline: false,
            lastSeen: "3 hours ago",
            mutualFriends: 7
          }
        ]);
      }, 600);
    });
  }

  // Share article to a room
  async shareToRoom(params: ShareToRoomParams): Promise<{ success: boolean; message: string }> {
    // TODO: Replace with actual API call when backend is ready
    console.log('🏠 Sharing to room:', params);
    
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          message: `Article shared successfully to room!`
        });
      }, 1000);
    });
  }

  // Share article to a friend
  async shareToFriend(params: ShareToFriendParams): Promise<{ success: boolean; message: string }> {
    // TODO: Replace with actual API call when backend is ready
    console.log('👤 Sharing to friend:', params);
    
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          message: `Article shared successfully to friend!`
        });
      }, 1000);
    });
  }
}

export const shareService = new ShareService();
