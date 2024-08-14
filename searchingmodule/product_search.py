import argparse
import nltk
from nltk.corpus import wordnet
import pandas as pd
from transformers import AutoTokenizer, AutoModel
from sklearn.metrics.pairwise import cosine_similarity
import torch
import os

nltk.download('wordnet')

tokenizer = AutoTokenizer.from_pretrained('bert-base-uncased')
model = AutoModel.from_pretrained('bert-base-uncased')

CSV_FILE_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '../products_list.csv'))

def find_synonyms(word):
    synonyms = []
    for syn in wordnet.synsets(word):
        for lemma in syn.lemmas():
            synonyms.append(lemma.name())
    return set(synonyms)

def words_in_text(text, synonyms):
    text_lower = text.lower()
    return any(word.lower() in text_lower for word in synonyms)

def get_embedding(text):
    inputs = tokenizer(text, return_tensors='pt')
    with torch.no_grad():
        outputs = model(**inputs)
    embeddings = outputs.last_hidden_state.mean(dim=1).squeeze().tolist()
    return embeddings

def search_product(keyword):
    data = pd.read_csv(CSV_FILE_PATH)
    
    synonyms = find_synonyms(keyword)
    synonyms.add(keyword)
    
    data['match'] = data['embeddingText'].apply(lambda x: words_in_text(x, synonyms))

    matched_data = data[data['match']].copy()

    if len(matched_data) == 0:
        return []

    matched_data.loc[:,'embeddingTextEmbedding'] = matched_data['embeddingText'].apply(lambda x: get_embedding(x))
    query_embedding = get_embedding(keyword)

    matched_data.loc[:,'similarity'] = matched_data['embeddingTextEmbedding'].apply(lambda x: cosine_similarity([x], [query_embedding])[0][0])
    top_matches = matched_data.nlargest(2, 'similarity')

    return top_matches.index.tolist()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Search for products based on a keyword.')
    parser.add_argument('keyword', type=str, help='The keyword to search for')
    args = parser.parse_args()
    
    result = search_product(args.keyword)
    print(result)
