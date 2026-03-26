/**
 * TypeORM entity for conversations (database schema).
 */
import { DocModule, DocField } from "@docspec/ts";

@DocModule({ name: "Conversation", description: "TypeORM entity for conversations (database schema)" })
export class ConversationEntity {
  @DocField({ description: "Primary key, auto-generated" })
  id!: string;

  @DocField({ description: "Conversation title" })
  title!: string;

  @DocField({ type: "json", description: "List of participant IDs" })
  participants!: string[];

  @DocField({ type: "varchar", description: "Conversation status, defaults to active" })
  status!: string;

  @DocField({ type: "timestamp", description: "Creation timestamp" })
  createdAt!: Date;

  @DocField({ type: "timestamp", description: "Last update timestamp" })
  updatedAt!: Date;
}

@DocModule({ name: "Message", description: "TypeORM entity for messages" })
export class MessageEntity {
  @DocField({ description: "Primary key, auto-generated" })
  id!: string;

  @DocField({ description: "Foreign key to conversations table" })
  conversationId!: string;

  @DocField({ description: "Sender user ID" })
  senderId!: string;

  @DocField({ type: "text", description: "Message content" })
  content!: string;

  @DocField({ type: "timestamp", description: "Message timestamp" })
  timestamp!: Date;
}
