/**
 * Shared types for the Nexus Conversation SDK.
 */

export interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  title: string;
  participants: string[];
  messages: Message[];
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
}

export interface CreateConversationDto {
  title: string;
  participants: string[];
}

export interface MessageDto {
  senderId: string;
  content: string;
}

export interface ConversationFilter {
  status?: "active" | "archived";
  participantId?: string;
  offset?: number;
  limit?: number;
}
