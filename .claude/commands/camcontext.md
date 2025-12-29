# Camera Context Command

Grabs the latest frame from Claude Vision app and applies it to the user's prompt/context.

## Instructions

1. Read the latest camera frame from `C:\Users\myers\claude-vision-app\latest-frame.jpg`
2. Analyze the image in the context of the user's prompt: $ARGUMENTS
3. If no arguments provided, just describe what you see
4. Respond naturally as if you're looking at what the user is showing you

## Notes
- The Claude Vision app must be running with camera ON for fresh frames
- Frame is auto-saved every 2 seconds
- If the frame is old (>60 seconds), warn the user that the app may not be running
