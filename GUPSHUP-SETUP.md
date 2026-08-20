# Gupshup WhatsApp integration

The backend now supports `WHATSAPP_PROVIDER=gupshup` while keeping the old TryowBot provider available for rollback.

## Required environment variables

```env
WHATSAPP_ENABLED=true
WHATSAPP_PROVIDER=gupshup
GUPSHUP_API_KEY=YOUR_GUPSHUP_API_KEY
GUPSHUP_APP_NAME=YOUR_GUPSHUP_APP_NAME
GUPSHUP_SOURCE=91XXXXXXXXXX
GUPSHUP_API_BASE_URL=https://api.gupshup.io
GUPSHUP_WEBHOOK_SECRET=

WHATSAPP_WELCOME_TEMPLATE_NAME=your_approved_template_id
WHATSAPP_WELCOME_TEMPLATE_LANGUAGE=mr
GUPSHUP_WELCOME_TEMPLATE_ID=7b02ea3e-7783-4442-8f9e-8fbe16dbdb59
WHATSAPP_WELCOME_TEMPLATE_NAMES={"mr":"your_approved_template_id","hi":"your_approved_template_id","en":"your_approved_template_id","gu":"your_approved_template_id"}
WHATSAPP_WELCOME_TEMPLATE_VARIABLES=name,event

WHATSAPP_POST_EVENT_TEMPLATE_NAME=your_approved_post_event_template_id
WHATSAPP_POST_EVENT_TEMPLATE_LANGUAGE=mr
WHATSAPP_POST_EVENT_TEMPLATE_NAMES={"mr":"your_approved_post_event_template_id","hi":"your_approved_post_event_template_id","en":"your_approved_post_event_template_id","gu":"your_approved_post_event_template_id"}
WHATSAPP_POST_EVENT_TEMPLATE_VARIABLES=name,event
WHATSAPP_EVENT_NAME=Nandurbar Event
```

Do not commit `GUPSHUP_API_KEY` or any other secret to GitHub.

## Webhook

Set the Gupshup callback URL to:

`https://YOUR-BACKEND-DOMAIN/api/v1/whatsapp/webhook`

The endpoint accepts Gupshup v2 `message` and `message-event` callbacks. Inbound messages are linked to participants by the last 10 digits of the sender number.

## Post-event conversation

1. Admin sends the approved post-event template from a participant profile.
2. The participant's saved language determines the template mapping.
3. The backend records `postEventStep=LIVELIHOOD`.
4. Participant replies with a livelihood category.
5. Backend asks for support/solution.
6. Backend asks for a specific solution/provider.
7. Backend asks for the desired next action.
8. Backend asks what was useful.
9. Backend asks what could have been better.
10. The participant is marked `COMPLETED` for the post-event questionnaire and the saved solution/value-chain information remains available for dashboard filtering and vendor matching.

During an active WhatsApp conversation the backend can send session text responses; the first business-initiated post-event message must use an approved template.
