import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import csvParser from 'csv-parser';

// Load environment variables from a .env file
dotenv.config();

// Interface representing the structure of the response from the exchange rates API
interface ExchangeRatesResponse {
  disclaimer: string;
  license: string;
  timestamp: number;
  base: string;
  rates: { [currencyCode: string]: number }; // Currency rates keyed by currency code
}

// Interface representing the structure of a product
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
  embedding?: number[]; // Optional embedding field to store the product's embedding vector
}

// Injectable service class for handling chatbot functionalities
@Injectable()
export class ChatbotService {
  private openai: OpenAI; // OpenAI instance for interacting with the OpenAI API
  private csvPath: string = path.resolve(__dirname, '../../products_list.csv'); // Path to the CSV file containing product data

  // Constructor initializes the OpenAI instance with the API key from environment variables
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  // Method to process a user inquiry by interacting with the OpenAI GPT-4 model
  async processInquiry(query: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-0613', // Specify the GPT-4 model version
        messages: [{ role: 'user', content: query }], // User's query message
        functions: [
          {
            name: 'searchProducts', // Define a function for searching products
            description: 'Search for products based on a query',
            parameters: {
              type: 'object',
              properties: {
                query: { type: 'string' }, // Function parameter: query string
              },
              required: ['query'],
            },
          },
          {
            name: 'convertCurrencies', // Define a function for currency conversion
            description: 'Convert currency from one to another',
            parameters: {
              type: 'object',
              properties: {
                amount: { type: 'number' }, // Function parameter: amount to convert
                fromCurrency: { type: 'string' }, // Function parameter: source currency
                toCurrency: { type: 'string' }, // Function parameter: target currency
              },
              required: ['amount', 'fromCurrency', 'toCurrency'],
            },
          },
        ],
        function_call: 'auto', // Automatically call the appropriate function
      });

      const { choices } = response;
      const message = choices[0].message;

      if (message.function_call) {
        const { name, arguments: funcArgs } = message.function_call;
        const args = JSON.parse(funcArgs);

        if (name === 'searchProducts') {
          const productResults = await this.searchProducts(args.query); // Call the searchProducts function with the query
          return await this.formatResponseWithGPT(productResults); // Format the response using GPT
        } else if (name === 'convertCurrencies') {
          const currencyResult = await this.convertCurrencies(args.amount, args.fromCurrency, args.toCurrency); // Call the convertCurrencies function
          return await this.formatResponseWithGPT(currencyResult); // Format the response using GPT
        }
      }

      return message.content; // Return the content of the message if no function call is made
    } catch (error) {
      console.error('Error processing inquiry:', error.response?.data || error.message || error);
      throw new HttpException('Failed to process inquiry', HttpStatus.INTERNAL_SERVER_ERROR); // Handle errors
    }
  }

  // Method to search products based on a query by finding the best matches using embeddings
  private async searchProducts(query: string): Promise<string> {
    try {
      const queryEmbedding = await this.getEmbedding(query); // Get embedding for the query
      const products = await this.getProductsFromDatabase(); // Get the list of products from the database (CSV file)
      const embeddings = await Promise.all(products.map(async (product) => ({
        ...product,
        embedding: await this.getEmbedding(product.displayTitle + " " + product.embeddingText), // Generate embedding for each product
      })));

      const bestMatches = this.findBestMatches(queryEmbedding, embeddings, 2); // Find the top 2 best matching products

      // Format the best matches as a string and return
      return bestMatches.map(match => 
        `Product: ${match.displayTitle}\nPrice: ${match.price}\nDiscount: ${match.discount}\nURL: ${match.url}\nType: ${match.productType}\nVariants: ${match.variants}\nCreated Date: ${match.createDate}\n\n`
      ).join('\n');
    } catch (error) {
      console.error('Error searching products:', error.message || error);
      throw new HttpException('Failed to search products', HttpStatus.INTERNAL_SERVER_ERROR); // Handle errors
    }
  }

  // Method to convert currencies using an external API
  private async convertCurrencies(amount: number, fromCurrency: string, toCurrency: string): Promise<string> {
    try {
      const appId = process.env.OPENEXCHANGERATES_APP_ID; // API key for the exchange rates service
      const response = await axios.get<ExchangeRatesResponse>(`https://openexchangerates.org/api/latest.json?app_id=${appId}`);
      const rates = response.data.rates;

      const fromRate = rates[fromCurrency]; // Get the rate for the source currency
      const toRate = rates[toCurrency]; // Get the rate for the target currency

      if (!fromRate || !toRate) {
        throw new Error(`Currency conversion rates not available for ${fromCurrency} or ${toCurrency}`); // Error if rates are missing
      }

      const convertedAmount = (amount / fromRate) * toRate; // Convert the currency amount
      return `${amount} ${fromCurrency} is approximately ${convertedAmount.toFixed(2)} ${toCurrency}`; // Return the converted amount as a string
    } catch (error) {
      console.error('Error converting currencies:', error.message || error);
      throw new HttpException('Failed to convert currencies', HttpStatus.INTERNAL_SERVER_ERROR); // Handle errors
    }
  }

  // Method to format the response text using GPT for natural language generation
  private async formatResponseWithGPT(text: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-0613', // Specify the GPT-4 model version
        messages: [
          { role: 'user', content: `Please format the following information in natural language:\n\n${text}` } // Request to format the text
        ]
      });

      return response.choices[0].message.content; // Return the formatted text
    } catch (error) {
      console.error('Error formatting response with GPT:', error.message || error);
      throw new HttpException('Failed to format response', HttpStatus.INTERNAL_SERVER_ERROR); // Handle errors
    }
  }

  // Method to generate text embeddings using OpenAI's embedding API
  private async getEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002', // Specify the embedding model
        input: text, // Input text for which to generate the embedding
      });
      return response.data[0].embedding; // Return the embedding vector
    } catch (error) {
      console.error('Error generating embedding:', error.message || error);
      throw new Error('Failed to generate embedding'); // Handle errors
    }
  }

  // Method to retrieve the list of products from a CSV file
  private async getProductsFromDatabase(): Promise<Product[]> {
    return new Promise((resolve, reject) => {
      const results: Product[] = [];

      // Stream the CSV file and parse its contents
      fs.createReadStream(this.csvPath)
        .pipe(csvParser())
        .on('data', (row) => {
          // For each row in the CSV, create a Product object and add it to the results array
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
          resolve(results); // Resolve the promise with the list of products when done
        })
        .on('error', (error) => {
          reject(error); // Reject the promise if there's an error
        });
    });
  }

  // Method to find the best matching products based on cosine similarity between embeddings
  private findBestMatches(queryEmbedding: number[], products: Product[], topN: number): Product[] {
    // Calculate the cosine similarity between the query embedding and each product's embedding
    const similarities = products.map(product => ({
      ...product,
      similarity: this.cosineSimilarity(queryEmbedding, product.embedding!), // Calculate similarity
    }));

    // Sort the products by similarity in descending order and return the top N matches
    return similarities.sort((a, b) => b.similarity - a.similarity).slice(0, topN);
  }

  // Utility method to calculate cosine similarity between two vectors
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    const dotProduct = vecA.reduce((sum, a, idx) => sum + a * vecB[idx], 0); // Dot product of two vectors
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0)); // Magnitude of the first vector
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0)); // Magnitude of the second vector
    return dotProduct / (magnitudeA * magnitudeB); // Cosine similarity
  }
}
