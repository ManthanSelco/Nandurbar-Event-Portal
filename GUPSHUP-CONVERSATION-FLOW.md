# Gupshup WhatsApp Conversation Flow

The backend now supports the post-event conversational journey for Gupshup v2 webhooks.

## Flow

1. Participant registers.
2. Welcome template is queued/sent.
3. The participant conversation state is initialized to `LIVELIHOOD`.
4. The participant replies with a number or label.
5. The answer is stored in the Participant document and `WhatsAppInteraction` history.
6. The next question is sent in the participant language.
7. When a support solution is selected, matching active vendors and government schemes are searched and sent to the participant.
8. The participant can continue through specific solution, next action, usefulness and feedback steps.
9. The full conversation remains visible from the participant profile.

## Current states

`NONE -> LIVELIHOOD -> SUPPORT -> SPECIFIC_SOLUTION -> NEXT_ACTION -> USEFUL -> FEEDBACK -> COMPLETED`

## Example

Participant receives a welcome message and replies:

`2`

If the second livelihood option is selected, the backend stores it and sends the support question. If the participant then replies `7` for Training, the backend stores `TRAINING`, looks for matching solution providers/government support, sends the available details, and asks what the participant wants to do next.

## Gupshup webhook

Configure the public callback URL as:

`POST https://YOUR-BACKEND-DOMAIN/api/v1/whatsapp/webhook`

Gupshup v2 inbound messages contain `version: 2`, `type: message`, `payload.source`, `payload.type` and the message payload. Quick-reply clicks are also received through the message webhook.

## Template ID

Gupshup's template API expects the template **ID/UUID**, not only the display name. Configure:

`GUPSHUP_WELCOME_TEMPLATE_ID=<approved-template-id>`

Keep `WHATSAPP_WELCOME_TEMPLATE_NAME` for application logs and language mapping.

The first outbound business-initiated message still requires an approved WhatsApp template and recipient opt-in. After the participant replies, the conversation can continue through session messages.
