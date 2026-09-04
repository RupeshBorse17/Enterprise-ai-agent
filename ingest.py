import os
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma

def process_pdf_and_create_vector_db(pdf_path):
    print("Step 1: PDF फाईल लोड होत आहे...")
    loader = PyPDFLoader(pdf_path)
    documents = loader.load()
    # print(documents[0].page_content[:500])  # फक्त पहिल्या 500 अक्षरे प्रिंट करत आहे

    print("Step 2: मजकुराचे लहान Chunks बनवत आहे...")
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )
    chunks = text_splitter.split_documents(documents)
    print(f"एकूण {len(chunks)} Chunks तयार झाले.")

    print("Step 3: Local Embeddings द्वारे Chroma DB मध्ये स्टोर करत आहे...")
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    
    vector_db = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory="./chroma_db"
    )
    print("✅ यश! Vector Database यशस्वीरित्या तयार झाला आहे!")
    return vector_db

if __name__ == "__main__":
    pdf_filename = "sample.pdf"
    if os.path.exists(pdf_filename):
        process_pdf_and_create_vector_db(pdf_filename)
    else:
        print(f"❌ त्रुटी: '{pdf_filename}' फाईल सापडली नाही.")