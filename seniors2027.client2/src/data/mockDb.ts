export interface User {
  id: string;
  name: string;
  gender: 'male' | 'female';
  avatar: string;
  bio: string;
  gallery: string[];
}

export interface Memory {
  id: string;
  senderName: string;
  receiverId: string;
  content: string;
  timestamp: number;
}

export const mockUsers: User[] = [];
export const mockMemories: Memory[] = [];
