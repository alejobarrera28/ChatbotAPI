import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

interface ExchangeRatesResponse {
    disclaimer: string;
    license: string;
    timestamp: number;
    base: string;
    rates: { [currencyCode: string]: number };
  }
  

@Injectable()
export class ChatbotService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async processInquiry(query: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-0613',
        messages: [{ role: 'user', content: query }],
        functions: [
          {
            name: 'searchProducts',
            description: 'Search for products based on a query',
            parameters: {
              type: 'object',
              properties: {
                query: { type: 'string' },
              },
              required: ['query'],
            },
          },
          {
            name: 'convertCurrencies',
            description: 'Convert currency from one to another',
            parameters: {
              type: 'object',
              properties: {
                amount: { type: 'number' },
                fromCurrency: { type: 'string' },
                toCurrency: { type: 'string' },
              },
              required: ['amount', 'fromCurrency', 'toCurrency'],
            },
          },
        ],
        function_call: 'auto',
      });

      const { choices } = response;
      const message = choices[0].message;

      if (message.function_call) {
        const { name, arguments: funcArgs } = message.function_call;
        const args = JSON.parse(funcArgs);

        if (name === 'searchProducts') {
          return await this.searchProducts(args.query);
        } else if (name === 'convertCurrencies') {
          return await this.convertCurrencies(args.amount, args.fromCurrency, args.toCurrency);
        }
      }

      return message.content;
    } catch (error) {
      console.error('Error processing inquiry:', error.response?.data || error.message || error);
      throw new HttpException('Failed to process inquiry', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async searchProducts(query: string): Promise<string> {
    // Implement the product search logic here
    return `Searching products for: ${query}`;
  }

  private async convertCurrencies(amount: number, fromCurrency: string, toCurrency: string): Promise<string> {
    try {
      const appId = process.env.OPENEXCHANGERATES_APP_ID;
      const response = await axios.get<ExchangeRatesResponse>(`https://openexchangerates.org/api/latest.json?app_id=${appId}`);
      const rates = response.data.rates;
  
      const fromRate = rates[fromCurrency];
      const toRate = rates[toCurrency];
  
      if (!fromRate || !toRate) {
        throw new Error(`Currency conversion rates not available for ${fromCurrency} or ${toCurrency}`);
      }
  
      const convertedAmount = (amount / fromRate) * toRate;
      return `${amount} ${fromCurrency} is approximately ${convertedAmount.toFixed(2)} ${toCurrency}`;
    } catch (error) {
      console.error('Error converting currencies:', error.response?.data || error.message || error);
      throw new HttpException('Failed to convert currencies', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }  
}
