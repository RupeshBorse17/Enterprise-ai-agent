import os
import shutil
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pypdf import PdfReader
from google import genai
from dotenv import load_dotenv

# 1. Load .env file
load_dotenv()

# Read GOOGLE_API_KEY from .env
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

if GOOGLE_API_KEY:
    client = genai.Client(api_key=GOOGLE_API_KEY)
else:
    print("⚠️ WARNING: GOOGLE_API_KEY was not found in the .env file!")

app = FastAPI(title="Enterprise AI RAG Agent Backend")

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "./uploaded_pdfs"
os.makedirs(UPLOAD_DIR, exist_ok=True)

PDF_TEXT_STORE = ""

class ChatQuery(BaseModel):
    question: str

@app.get("/")
def read_root():
    return {"status": "Backend is Active"}

# PDF Upload Endpoint
@app.post("/api/upload")
async def upload_pdf(file: UploadFile = File(...)):
    global PDF_TEXT_STORE
    try:
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        reader = PdfReader(file_path)
        extracted_text = ""
        for page in reader.pages:
            text = page.extract_text()
            if text:
                extracted_text += text + "\n"

        if not extracted_text.strip():
            raise HTTPException(status_code=400, detail="No readable text found in the PDF.")

        PDF_TEXT_STORE = extracted_text[:15000]

        return {
            "filename": file.filename, 
            "message": f"'{file.filename}' was successfully read!"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF processing error: {str(e)}")

# Chat Endpoint
@app.post("/api/chat")
async def chat_with_rag(query: ChatQuery):
    global PDF_TEXT_STORE
    try:
        user_question = query.question.strip()
        if not user_question:
            raise HTTPException(status_code=400, detail="Question cannot be empty.")

        if not GOOGLE_API_KEY:
            raise HTTPException(status_code=500, detail="GOOGLE_API_KEY is not saved in the .env file.")

        if PDF_TEXT_STORE:
            prompt = f"""
You are a smart AI assistant. Provide an accurate and detailed answer to the user's question using the context from the provided PDF below.

PDF Context:
{PDF_TEXT_STORE}

----------------
User Question: {user_question}
Answer:
"""
        else:
            prompt = f"User Question: {user_question}\n(Note: No PDF has been uploaded yet, please provide a general answer.)"

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        return {"answer": response.text}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini API error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

