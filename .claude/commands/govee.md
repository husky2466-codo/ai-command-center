---
description: Control Govee smart lights
argument-hint: <on|off|color|brightness>
---

Control Govee smart home devices using the API key from ~/.env (GOVEE_API_KEY).

Command: $ARGUMENTS

Actions:
- on: Turn lights on
- off: Turn lights off
- color <hex>: Set light color (e.g., #FF0000 for red)
- brightness <0-100>: Set brightness level
- list: List all Govee devices

Execute the Govee API command.
