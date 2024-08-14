// import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
// import * as dotenv from 'dotenv';
// import OpenAI from 'openai';
// import axios from 'axios';
// import { exec } from 'child_process';
// import { promisify } from 'util';
// import * as path from 'path';

// dotenv.config();

// interface ExchangeRatesResponse {
//     disclaimer: string;
//     license: string;
//     timestamp: number;
//     base: string;
//     rates: { [currencyCode: string]: number };
//   }
  
// const execPromise = promisify(exec);


// @Injectable()
// export class ChatbotService {
//   private openai: OpenAI;

//   constructor() {
//     this.openai = new OpenAI({
//       apiKey: process.env.OPENAI_API_KEY,
//     });
//   }

//   async processInquiry(query: string): Promise<string> {
//     try {
//       const response = await this.openai.chat.completions.create({
//         model: 'gpt-4-0613',
//         messages: [{ role: 'user', content: query }],
//         functions: [
//           {
//             name: 'searchProducts',
//             description: 'Search for products based on a query',
//             parameters: {
//               type: 'object',
//               properties: {
//                 query: { type: 'string' },
//               },
//               required: ['query'],
//             },
//           },
//           {
//             name: 'convertCurrencies',
//             description: 'Convert currency from one to another',
//             parameters: {
//               type: 'object',
//               properties: {
//                 amount: { type: 'number' },
//                 fromCurrency: { type: 'string' },
//                 toCurrency: { type: 'string' },
//               },
//               required: ['amount', 'fromCurrency', 'toCurrency'],
//             },
//           },
//         ],
//         function_call: 'auto',
//       });

//       const { choices } = response;
//       const message = choices[0].message;

//       if (message.function_call) {
//         const { name, arguments: funcArgs } = message.function_call;
//         const args = JSON.parse(funcArgs);

//         if (name === 'searchProducts') {
//           return await this.searchProducts(args.query);
//         } else if (name === 'convertCurrencies') {
//           return await this.convertCurrencies(args.amount, args.fromCurrency, args.toCurrency);
//         }
//       }

//       return message.content;
//     } catch (error) {
//       console.error('Error processing inquiry:', error.response?.data || error.message || error);
//       throw new HttpException('Failed to process inquiry', HttpStatus.INTERNAL_SERVER_ERROR);
//     }
//   }

//   private async searchProducts(query: string): Promise<string> {
//     const scriptPath = path.join(__dirname, '../../searchingmodule', 'product_search.py');
//     console.log(query)
//     try {
//       const { stdout, stderr } = await execPromise(`python3 ${scriptPath} "${query}"`);
      
//       if (stderr) {
//         console.error('Error executing Python script:', stderr);
//         throw new HttpException('Failed to search products', HttpStatus.INTERNAL_SERVER_ERROR);
//       }

//       const result = stdout.trim();
//       return `Top matches indices: ${result}`;
//     } catch (error) {
//       console.error('Error executing Python script:', error.message || error);
//       throw new HttpException('Failed to search products', HttpStatus.INTERNAL_SERVER_ERROR);
//     }
//   }

//   private async convertCurrencies(amount: number, fromCurrency: string, toCurrency: string): Promise<string> {
//     try {
//       const appId = process.env.OPENEXCHANGERATES_APP_ID;
//       const response = await axios.get<ExchangeRatesResponse>(`https://openexchangerates.org/api/latest.json?app_id=${appId}`);
//       const rates = response.data.rates;
  
//       const fromRate = rates[fromCurrency];
//       const toRate = rates[toCurrency];
  
//       if (!fromRate || !toRate) {
//         throw new Error(`Currency conversion rates not available for ${fromCurrency} or ${toCurrency}`);
//       }
  
//       const convertedAmount = (amount / fromRate) * toRate;
//       return `${amount} ${fromCurrency} is approximately ${convertedAmount.toFixed(2)} ${toCurrency}`;
//     } catch (error) {
//       console.error('Error converting currencies:', error.response?.data || error.message || error);
//       throw new HttpException('Failed to convert currencies', HttpStatus.INTERNAL_SERVER_ERROR);
//     }
//   }  
// }

// ------------------------------------------------------------------------------------------------------------------------------------------------------------------

// import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
// import OpenAI from 'openai';
// import * as dotenv from 'dotenv';
// import axios from 'axios';
// import { exec } from 'child_process';
// import { promisify } from 'util';
// import * as path from 'path';


// dotenv.config();
// const execPromise = promisify(exec);

// interface ExchangeRatesResponse {
//   disclaimer: string;
//   license: string;
//   timestamp: number;
//   base: string;
//   rates: { [currencyCode: string]: number };
// }

// @Injectable()
// export class ChatbotService {
//   private openai: OpenAI;

//   constructor() {
//     this.openai = new OpenAI({
//       apiKey: process.env.OPENAI_API_KEY,
//     });
//   }

//   async processInquiry(query: string): Promise<string> {
//     try {
//       const response = await this.openai.chat.completions.create({
//         model: 'gpt-4-0613',
//         messages: [{ role: 'user', content: query }],
//         functions: [
//           {
//             name: 'searchProducts',
//             description: 'Search for products based on a query',
//             parameters: {
//               type: 'object',
//               properties: {
//                 query: { type: 'string' },
//               },
//               required: ['query'],
//             },
//           },
//           {
//             name: 'convertCurrencies',
//             description: 'Convert currency from one to another',
//             parameters: {
//               type: 'object',
//               properties: {
//                 amount: { type: 'number' },
//                 fromCurrency: { type: 'string' },
//                 toCurrency: { type: 'string' },
//               },
//               required: ['amount', 'fromCurrency', 'toCurrency'],
//             },
//           },
//         ],
//         function_call: 'auto',
//       });

//       const { choices } = response;
//       const message = choices[0].message;

//       if (message.function_call) {
//         const { name, arguments: funcArgs } = message.function_call;
//         const args = JSON.parse(funcArgs);

//         if (name === 'searchProducts') {
//           return await this.searchProducts(args.query);
//         } else if (name === 'convertCurrencies') {
//           return await this.convertCurrencies(args.amount, args.fromCurrency, args.toCurrency);
//         }
//       }

//       return message.content;
//     } catch (error) {
//       console.error('Error processing inquiry:', error.response?.data || error.message || error);
//       throw new HttpException('Failed to process inquiry', HttpStatus.INTERNAL_SERVER_ERROR);
//     }
//   }

//   private async searchProducts(query: string): Promise<string> {
//     try {
//         const csvPath = path.resolve(__dirname, '../../products_list.csv'); 
//         const { stdout, stderr } = await execPromise(`python3 searchingmodule/embedding_search.py "${query}" "${csvPath}"`);
//         if (stderr) {
//           throw new Error(stderr);
//         }
//       const results = JSON.parse(stdout);
//       return JSON.stringify(results);
//     } catch (error) {
//       console.error('Error searching products:', error.message);
//       throw new HttpException('Failed to search products', HttpStatus.INTERNAL_SERVER_ERROR);
//     }
//   }

//   private async convertCurrencies(amount: number, fromCurrency: string, toCurrency: string): Promise<string> {
//     try {
//       const appId = process.env.OPENEXCHANGERATES_APP_ID;
//       const response = await axios.get<ExchangeRatesResponse>(`https://openexchangerates.org/api/latest.json?app_id=${appId}`);
//       const rates = response.data.rates;

//       const fromRate = rates[fromCurrency];
//       const toRate = rates[toCurrency];

//       if (!fromRate || !toRate) {
//         throw new Error(`Currency conversion rates not available for ${fromCurrency} or ${toCurrency}`);
//       }

//       const convertedAmount = (amount / fromRate) * toRate;
//       return `${amount} ${fromCurrency} is approximately ${convertedAmount.toFixed(2)} ${toCurrency}`;
//     } catch (error) {
//       console.error('Error converting currencies:', error.response?.data || error.message || error);
//       throw new HttpException('Failed to convert currencies', HttpStatus.INTERNAL_SERVER_ERROR);
//     }
//   }
// }


// ------------------------------------------------------------------------------------------------------------------------------------------------------------------

import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';
import * as tf from '@tensorflow/tfjs-node';
import * as use from '@tensorflow-models/universal-sentence-encoder';

dotenv.config();

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
}

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
    try {
      // Load the Universal Sentence Encoder model
      const model = await use.load();
      
      // Load the CSV file and parse it into a list of products
      const products = await this.loadCSV();
      
      // Compute the embedding for the query
      const queryEmbedding = await model.embed(query);
      
      // Compute cosine similarities between the query embedding and product embeddings
      let bestMatch: { product: Product; similarity: number } | null = null;
      
      for (const product of products) {
        const productEmbedding = await model.embed(product.embeddingText);
        const similarity = this.cosineSimilarity(queryEmbedding as unknown as tf.Tensor, productEmbedding as unknown as tf.Tensor);
        
        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = { product, similarity };
        }
      }

      if (bestMatch) {
        return `Best match: ${bestMatch.product.displayTitle} - ${bestMatch.product.url}`;
      } else {
        return 'No matching products found.';
      }
    } catch (error) {
      console.error('Error searching products:', error.message || error);
      throw new HttpException('Failed to search products', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async loadCSV(): Promise<Product[]> {
    return new Promise<Product[]>((resolve, reject) => {
      const products: Product[] = [];
      fs.createReadStream('products_list.csv')
        .pipe(csv())
        .on('data', (data: any) => products.push(data))
        .on('end', () => resolve(products))
        .on('error', (error) => reject(error));
    });
  }

  private cosineSimilarity(embeddingA: tf.Tensor, embeddingB: tf.Tensor): number {
    const dotProduct = tf.tidy(() => {
      return tf.sum(tf.mul(embeddingA, embeddingB)).arraySync() as number;
    });
  
    const normA = tf.tidy(() => {
      return tf.norm(embeddingA).arraySync() as number;
    });
  
    const normB = tf.tidy(() => {
      return tf.norm(embeddingB).arraySync() as number;
    });
  
    return dotProduct / (normA * normB);
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
