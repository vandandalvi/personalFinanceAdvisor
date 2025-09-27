import google.generativeai as genai
import os
from dotenv import load_dotenv

# Load .env from backend directory
load_dotenv('backend/.env')
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

print(f"API Key found: {bool(GEMINI_API_KEY)}")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    
    print("Available models:")
    try:
        for model in genai.list_models():
            if 'generateContent' in model.supported_generation_methods:
                print(f"- {model.name}")
    except Exception as e:
        print(f"Error listing models: {e}")
            
    # Test the actual available models
    test_models = [
        "models/gemini-2.5-flash",
        "models/gemini-2.0-flash",
        "models/gemini-flash-latest",
        "models/gemini-2.5-pro",
        "models/gemini-2.0-flash-exp",
        "models/gemini-pro-latest",
    ]
    
    print("\nTesting models:")
    for model_name in test_models:
        try:
            model = genai.GenerativeModel(model_name)
            response = model.generate_content("Hello, can you respond briefly?")
            print(f"✅ {model_name}: Works - {response.text[:50]}...")
            break  # If one works, we're good
        except Exception as e:
            print(f"❌ {model_name}: {str(e)[:100]}...")
else:
    print("No GEMINI_API_KEY found")