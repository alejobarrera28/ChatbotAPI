import pandas as pd
from transformers import AutoTokenizer, AutoModel
import torch
from sklearn.metrics.pairwise import cosine_similarity

# Load the model and tokenizer
tokenizer = AutoTokenizer.from_pretrained('sentence-transformers/all-MiniLM-L6-v2', clean_up_tokenization_spaces=True)
model = AutoModel.from_pretrained('sentence-transformers/all-MiniLM-L6-v2')

def get_embeddings(texts):
    inputs = tokenizer(texts, padding=True, truncation=True, return_tensors='pt')
    with torch.no_grad():
        outputs = model(**inputs)
    embeddings = outputs.last_hidden_state.mean(dim=1)
    return embeddings

def find_top_matches(query, csv_path):
    # Load CSV
    df = pd.read_csv(csv_path)
    
    # Get embeddings for the query and the product texts
    product_embeddings = get_embeddings(df['embeddingText'].tolist())
    query_embedding = get_embeddings([query])
    
    # Compute cosine similarities
    similarities = cosine_similarity(query_embedding, product_embeddings)
    
    # Add similarity scores to DataFrame
    df['similarity'] = similarities[0]
    
    # Get top 2 matches
    top_matches = df.nlargest(2, 'similarity')
    
    # Return top matches
    return top_matches[['displayTitle', 'url', 'imageUrl', 'price', 'discount']].to_dict(orient='records')

if __name__ == "__main__":
    import sys
    query = sys.argv[1]
    csv_path = sys.argv[2]
    results = find_top_matches(query, csv_path)
    print(results)
