import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

api_key = os.getenv("GOOGLE_API_KEY")

if not api_key:
    print("❌ GOOGLE_API_KEY सापडला नाही. कृपया .env फाईल तपासा.")
else:
    client = genai.Client(api_key=api_key)
    print("🔍 उपलब्ध असणाऱ्या Gemini मॉडेल्सची यादी:\n")
    
    try:
        for m in client.models.list():
            print(f"• {m.name}")
    except Exception as e:
        print(f"❌ एरर आला: {e}")