import os
import requests
import base64

class MultimodalEmbeddingService:
    def __init__(self, model_name="mistral/mistral-embed", api_url="http://localhost:20128/v1/embeddings"):
        """
        Initialize the Multimodal Embedding Service using OmniRoute.
        """
        self.model_name = model_name
        self.api_url = api_url
        self.api_key = os.environ.get("OMINIROUTE_API_KEY", "")

    def _get_headers(self):
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    def get_text_embedding(self, text):
        """
        Generate embedding for a text string.
        """
        try:
            response = requests.post(
                self.api_url,
                json={"input": [text], "model": self.model_name},
                headers=self._get_headers(),
                timeout=60
            )
            if response.status_code == 200:
                data = response.json()
                return data["data"][0]["embedding"]
            else:
                raise Exception(f"OmniRoute Error ({response.status_code}): {response.text}")
        except Exception as e:
            print(f"Text embedding failed: {str(e)}")
            raise

    def get_image_embedding(self, image_source, content_type="image/png"):
        """
        Generate embedding for an image.
        @param image_source: Path to image (str) OR base64 string OR raw bytes.
        @param content_type: The MIME type of the image (default: image/png).
        """
        if isinstance(image_source, str):
            if image_source.startswith("data:") or len(image_source) > 512: # Likely base64
                if "," in image_source:
                    image_base64 = image_source.split(",")[1]
                else:
                    image_base64 = image_source
            else: # Likely path
                with open(image_source, "rb") as image_file:
                    image_base64 = base64.b64encode(image_file.read()).decode('utf-8')
        elif isinstance(image_source, bytes):
            image_base64 = base64.b64encode(image_source).decode('utf-8')
        else:
            raise ValueError("Unsupported image source type")

        # Use vision model to get a description
        vision_url = "http://localhost:20128/v1/chat/completions"
        vision_payload = {
            "model": "fast-vision-combo",
            "stream": False,  # Explicitly disable streaming to get full JSON response
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Describe this food/dish image in extreme detail for semantic search indexing. Identify exact ingredients, textures, branding/labels if visible, and unique visual features. If it's a packaged food, name the brand. Be specific to differentiate it from similar items."},
                        {"type": "image_url", "image_url": {"url": f"data:{content_type};base64,{image_base64}"}}
                    ]
                }
            ]
        }

        try:
            response = requests.post(vision_url, json=vision_payload, headers=self._get_headers(), timeout=60)
            if response.status_code == 200:
                try:
                    data = response.json()
                    description = data["choices"][0]["message"]["content"]
                    # Now embed the description
                    return self.get_text_embedding(description)
                except Exception as json_err:
                    print(f"Vision API JSON error: {json_err}. Raw response: {response.text}")
                    raise Exception(f"Vision API returned invalid JSON: {response.text[:200]}")
            else:
                print(f"Vision API Error ({response.status_code}): {response.text}")
                raise Exception(f"Vision API Error ({response.status_code}): {response.text}")
        except Exception as e:
            print(f"Image embedding (via vision) failed: {str(e)}")
            raise
