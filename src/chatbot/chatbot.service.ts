import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import csvParser from 'csv-parser';

dotenv.config();

interface ExchangeRatesResponse {
  disclaimer: string;
  license: string;
  timestamp: number;
  base: string;
  rates: { [currencyCode: string]: number };
}

interface Product {
  displayTitle: string;
  embeddingText: string;
  url: string;
  imageUrl: string;
  productType: string;
  discount: string;
  price: string;
  variants: string;
  createDate: string;
  embedding?: number[];
}

@Injectable()
export class ChatbotService {
  private openai: OpenAI;
  private csvPath: string = path.resolve(__dirname, '../../products_list.csv');

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
          const productResults = await this.searchProducts(args.query);
          return await this.formatResponseWithGPT(productResults);
        } else if (name === 'convertCurrencies') {
          const currencyResult = await this.convertCurrencies(args.amount, args.fromCurrency, args.toCurrency);
          return await this.formatResponseWithGPT(currencyResult);
        }
      }

      return message.content;
    } catch (error) {
      console.error('Error processing inquiry:', error.response?.data || error.message || error);
      throw new HttpException('Failed to process inquiry', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async searchProducts(query: string): Promise<string> {
    try {
      const queryEmbedding = await this.getEmbedding(query);
      const products = await this.getProductsFromDatabase();
      const embeddings = await Promise.all(products.map(async (product) => ({
        ...product,
        embedding: await this.getEmbedding(product.displayTitle + " " + product.embeddingText),
      })));

      const bestMatches = this.findBestMatches(queryEmbedding, embeddings, 2);

      return bestMatches.map(match => 
        `Product: ${match.displayTitle}\nPrice: ${match.price}\nDiscount: ${match.discount}\nURL: ${match.url}\nType: ${match.productType}\nVariants: ${match.variants}\nCreated Date: ${match.createDate}\n\n`
      ).join('\n');
    } catch (error) {
      console.error('Error searching products:', error.message || error);
      throw new HttpException('Failed to search products', HttpStatus.INTERNAL_SERVER_ERROR);
    }
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
      console.error('Error converting currencies:', error.message || error);
      throw new HttpException('Failed to convert currencies', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async formatResponseWithGPT(text: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-0613',
        messages: [
          { role: 'user', content: `Please format the following information in natural language:\n\n${text}` }
        ]
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error formatting response with GPT:', error.message || error);
      throw new HttpException('Failed to format response', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async getEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text,
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error.message || error);
      throw new Error('Failed to generate embedding');
    }
  }

  private async getProductsFromDatabase(): Promise<Product[]> {
    return new Promise((resolve, reject) => {
      const results: Product[] = [];

      fs.createReadStream(this.csvPath)
        .pipe(csvParser())
        .on('data', (row) => {
          results.push({
            displayTitle: row['displayTitle'],
            embeddingText: row['embeddingText'],
            url: row['url'],
            imageUrl: row['imageUrl'],
            productType: row['productType'],
            discount: row['discount'],
            price: row['price'],
            variants: row['variants'],
            createDate: row['createDate']
          });
        })
        .on('end', () => {
          resolve(results);
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  private findBestMatches(queryEmbedding: number[], products: Product[], topN: number): Product[] {
    const similarities = products.map(product => ({
      ...product,
      similarity: this.cosineSimilarity(queryEmbedding, product.embedding!),
    }));

    similarities.sort((a, b) => b.similarity - a.similarity);
    return similarities.slice(0, topN);
  }

  private cosineSimilarity(embedding1: number[], embedding2: number[]): number {
    const dotProduct = embedding1.reduce((sum, value, index) => sum + value * embedding2[index], 0);
    const norm1 = Math.sqrt(embedding1.reduce((sum, value) => sum + value * value, 0));
    const norm2 = Math.sqrt(embedding2.reduce((sum, value) => sum + value * value, 0));
    return dotProduct / (norm1 * norm2);
  }
}
