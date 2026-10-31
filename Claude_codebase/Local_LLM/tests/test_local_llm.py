from local_llm.client import LocalLLMClient


def test_client_defaults():
    client = LocalLLMClient(base_url="http://localhost:11434", model="llama3.2")
    assert client.base_url == "http://localhost:11434"
    assert client.model == "llama3.2"


def test_extract_text_from_ollama_response():
    payload = {"response": "hello from local llm"}
    assert LocalLLMClient._extract_text_from_response(payload) == "hello from local llm"


def test_extract_text_from_openai_style_response():
    payload = {"choices": [{"message": {"content": "hi there"}}]}
    assert LocalLLMClient._extract_text_from_response(payload) == "hi there"
