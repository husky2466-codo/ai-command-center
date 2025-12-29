Debug the Vision app's camera and API integration.

Check these in order:
1. Read `src/components/vision/VisionApp.jsx` and identify the issue
2. Verify camera enumeration logic (loadCameras function)
3. Check stream management (startCamera, stopCamera)
4. Validate Claude Vision API call format and headers
5. Check frame capture and base64 encoding
6. Verify file saving to latest-frame.txt

Common issues:
- Missing `anthropic-dangerous-direct-browser-access` header
- Stream not properly cleaned up on stop
- Canvas not sized before capture
- API key not loaded (check apiKeys prop)
