import { Controller, Post, Body } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';

@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post()
  async handleInquiry(@Body('query') query: string): Promise<string> {
    return await this.chatbotService.processInquiry(query);
  }
}
