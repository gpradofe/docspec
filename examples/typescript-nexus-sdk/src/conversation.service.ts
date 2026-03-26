/**
 * Business logic for conversation management.
 */
import { Injectable, NotFoundException } from "@nestjs/common";
import {
  DocModule, DocMethod, DocInvariant, DocPerformance,
  DocError, DocFlow, DocEvent, DocMonotonic, DocStateMachine,
} from "@docspec/ts";
import type { Conversation, CreateConversationDto, ConversationFilter, MessageDto } from "./types.js";

@DocModule({ name: "nexus-conversations", description: "Business logic for conversation management" })
@DocInvariant({ rules: ["participants SIZE > 0", "title NOT_BLANK"] })
@Injectable()
export class ConversationService {
  private conversations: Map<string, Conversation> = new Map();
  private nextId = 1;

  /**
   * Find all conversations matching the filter criteria.
   */
  @DocMethod({ description: "Queries conversations with pagination and filtering" })
  @DocPerformance({ expectedLatency: "30ms", bottleneck: "full scan" })
  async findAll(filter: ConversationFilter): Promise<Conversation[]> {
    let results = Array.from(this.conversations.values());

    if (filter.status) {
      results = results.filter((c) => c.status === filter.status);
    }

    if (filter.participantId) {
      results = results.filter((c) =>
        c.participants.includes(filter.participantId!),
      );
    }

    const offset = filter.offset ?? 0;
    const limit = filter.limit ?? 20;
    return results.slice(offset, offset + limit);
  }

  /**
   * Find a conversation by its unique ID.
   */
  @DocMethod({ description: "Retrieves a single conversation by ID" })
  @DocError({ code: "CONV_NOT_FOUND", description: "Conversation does not exist" })
  async findById(id: string): Promise<Conversation> {
    const conversation = this.conversations.get(id);
    if (!conversation) {
      throw new NotFoundException(`Conversation ${id} not found`);
    }
    return conversation;
  }

  /**
   * Create a new conversation with the given participants.
   */
  @DocMethod({ description: "Creates a conversation and notifies participants" })
  @DocFlow({ id: "conversation-creation", name: "conversation-creation" })
  @DocInvariant({ rules: ["participants SIZE >= 2"] })
  async create(dto: CreateConversationDto): Promise<Conversation> {
    const id = String(this.nextId++);
    const conversation: Conversation = {
      id,
      title: dto.title,
      participants: dto.participants,
      messages: [],
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  /**
   * Add a message to an existing conversation.
   */
  @DocMethod({ description: "Appends a message and updates the conversation timestamp" })
  @DocFlow({ id: "message-sending", name: "message-sending" })
  @DocEvent({ name: "message.sent", description: "Fired when a message is sent" })
  @DocMonotonic({ field: "messages.length", direction: "increasing" })
  async addMessage(conversationId: string, message: MessageDto): Promise<Conversation> {
    const conversation = await this.findById(conversationId);
    conversation.messages.push({
      id: String(conversation.messages.length + 1),
      senderId: message.senderId,
      content: message.content,
      timestamp: new Date().toISOString(),
    });
    conversation.updatedAt = new Date().toISOString();
    return conversation;
  }

  /**
   * Archive a conversation (soft delete).
   */
  @DocMethod({ description: "Sets conversation status to archived" })
  @DocStateMachine({ states: ["active", "archived"], transitions: ["active -> archived"] })
  async archive(id: string): Promise<void> {
    const conversation = await this.findById(id);
    conversation.status = "archived";
    conversation.updatedAt = new Date().toISOString();
  }
}
