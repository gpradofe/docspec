/**
 * REST controller for managing conversations.
 */
import { Controller, Get, Post, Body, Param, Query, Delete, HttpCode, HttpStatus } from "@nestjs/common";
import { DocModule, DocMethod, DocEndpoint, DocError, DocEvent } from "@docspec/ts";
import { ConversationService } from "./conversation.service.js";
import type { Conversation, CreateConversationDto, ConversationFilter, MessageDto } from "./types.js";

@DocModule({ name: "nexus-conversations", description: "REST controller for managing conversations" })
@Controller("api/conversations")
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  /**
   * List all conversations with optional filtering.
   */
  @DocMethod({ description: "Returns paginated list of conversations" })
  @DocEndpoint({ path: "/api/conversations", method: "GET" })
  @Get()
  async listConversations(@Query() filter: ConversationFilter): Promise<Conversation[]> {
    return this.conversationService.findAll(filter);
  }

  /**
   * Get a single conversation by ID.
   */
  @DocMethod({ description: "Returns a conversation with its full message history" })
  @DocEndpoint({ path: "/api/conversations/:id", method: "GET" })
  @Get(":id")
  async getConversation(@Param("id") id: string): Promise<Conversation> {
    return this.conversationService.findById(id);
  }

  /**
   * Create a new conversation.
   */
  @DocMethod({ description: "Creates a new conversation and returns it" })
  @DocEndpoint({ path: "/api/conversations", method: "POST" })
  @DocError({ code: "CONV_001", description: "Invalid participant list" })
  @Post()
  async createConversation(@Body() dto: CreateConversationDto): Promise<Conversation> {
    return this.conversationService.create(dto);
  }

  /**
   * Send a message to a conversation.
   */
  @DocMethod({ description: "Appends a message to the conversation" })
  @DocEndpoint({ path: "/api/conversations/:id/messages", method: "POST" })
  @DocEvent({ name: "message.sent", description: "Fired when a message is sent" })
  @Post(":id/messages")
  async sendMessage(
    @Param("id") conversationId: string,
    @Body() message: MessageDto,
  ): Promise<Conversation> {
    return this.conversationService.addMessage(conversationId, message);
  }

  /**
   * Archive a conversation (soft delete).
   */
  @DocMethod({ description: "Archives a conversation without deleting data" })
  @DocEndpoint({ path: "/api/conversations/:id", method: "DELETE" })
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async archiveConversation(@Param("id") id: string): Promise<void> {
    return this.conversationService.archive(id);
  }
}
