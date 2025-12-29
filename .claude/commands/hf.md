---
description: Query Hugging Face models via Inference API
argument-hint: <model> <prompt> OR just <prompt>
---

Use the Hugging Face Inference API to run models. The API token is stored in ~/.env as HF_TOKEN.

**Usage formats:**
- `/hf What is the capital of France?` - Uses default model (mistralai/Mistral-7B-Instruct-v0.3)
- `/hf meta-llama/Llama-3.2-3B-Instruct What is AI?` - Uses specified model

**Popular models:**
- `mistralai/Mistral-7B-Instruct-v0.3` (default, fast)
- `meta-llama/Llama-3.2-3B-Instruct` (good quality)
- `google/flan-t5-xxl` (fast, good for Q&A)
- `HuggingFaceH4/zephyr-7b-beta` (conversational)

Parse the arguments: $ARGUMENTS

If the first word looks like a model path (contains `/`), use it as the model and the rest as the prompt.
Otherwise, use `mistralai/Mistral-7B-Instruct-v0.3` as the default model.

Make an HTTP POST request to: `https://api-inference.huggingface.co/models/{model}`
With headers:
- Authorization: Bearer {HF_TOKEN}
- Content-Type: application/json

Body for text generation:
```json
{
  "inputs": "<prompt>",
  "parameters": {
    "max_new_tokens": 500,
    "return_full_text": false
  }
}
```

Return the generated text to the user.
