# Chatbot API

This repository contains the implementation of a Chatbot API using NestJS. The chatbot is designed to handle user inquiries, search for products, and perform currency conversions. For evaluating the implementation, you will find the main logical structure of the project in /src/chatbot/chatbot.service.ts

## Features

- **Product Search**: Search for products based on user queries using text embeddings and cosine similarity.
- **Currency Conversion**: Convert currency amounts between different currencies using real-time exchange rates (from https://openexchangerates.org/).
- **Natural Language Processing**: Utilizes OpenAI's GPT-4 for generating and formatting responses in natural language.

## Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/alejobarrera28/ChatbotAPI.git
   cd ChatbotAPI
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the root directory and add the following environment variables:
   ```plaintext
   OPENAI_API_KEY=your_openai_api_key
   OPENEXCHANGERATES_APP_ID=your_openexchangerates_app_id
   ```

## Running the Application

To start the application:

```bash
npm run start
```

The application should now be running on the default port (e.g., `http://localhost:3000`).

## Usage

The Chatbot API provides endpoints for handling inquiries, searching products, and converting currencies.

### Sample Requests

- **Product Search:**
  Send a query to search for products based on user input.

- **Currency Conversion:**
  Convert amounts between different currencies.

### API Endpoints

- **`POST /chatbot`**: Process a user inquiry and return a response.

### Example

```bash
curl --location 'http://localhost:3000/chatbot' \
--header 'Content-Type: application/json' \
--data '{
    "query": "How many Canadian Dollars are 350 Euros"
}'
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
