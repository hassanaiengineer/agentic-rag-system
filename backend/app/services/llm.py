import json
import logging
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
import google.generativeai as genai
from google.api_core.exceptions import InvalidArgument
from langchain_google_genai import ChatGoogleGenerativeAI

from app.core.config import get_settings

logger = logging.getLogger(__name__)

class LLMService:
    def __init__(self):
        self.settings = get_settings()
        if not self.settings.gemini_api_key:
            raise ValueError("GEMINI_API_KEY is not configured")

        genai.configure(api_key=self.settings.gemini_api_key)
        self.model = genai.GenerativeModel(self.settings.gemini_model_name)
        
        # LangChain model for graph streaming
        self.chat_model = ChatGoogleGenerativeAI(
            model=self.settings.gemini_model_name,
            google_api_key=self.settings.gemini_api_key,
            temperature=self.settings.gemini_temperature,
            max_output_tokens=1024,
            timeout=self.settings.gemini_timeout_seconds
        )

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
        retry=retry_if_exception_type(Exception),
        reraise=True,
    )
    def generate(self, prompt: str) -> str:
        try:
            response = self.model.generate_content(
                prompt,
                generation_config={
                    "temperature": self.settings.gemini_temperature,
                    "max_output_tokens": 1024,
                },
                request_options={"timeout": self.settings.gemini_timeout_seconds},
            )
            
            # Check for safety blocks or empty candidates without text
            if not response.candidates or not response.parts:
                return json.dumps({
                    "error": "Safety_Filtered",
                    "message": "Response was blocked by safety filters."
                })
                
            text = (response.text or "").strip()
            return text if text else "NOT FOUND"
            
        except InvalidArgument as e:
            logger.error(f"Gemini API InvalidArgument: {e}")
            return json.dumps({
                "error": "Safety_Filtered",
                "message": str(e)
            })
        except ValueError as e:
            if "safety" in str(e).lower() or "blocked" in str(e).lower():
                return json.dumps({
                    "error": "Safety_Filtered",
                    "message": "Response was blocked by safety filters."
                })
            raise
