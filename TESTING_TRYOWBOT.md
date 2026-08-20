# TryowBot Test Checklist

## 1. Configure `.env`

Copy `.env.example` to `.env` and set only your real local values:

```env
WHATSAPP_ENABLED=true
WHATSAPP_PROVIDER=tryowbot
WHATSAPP_APP_ID=<your app id>
WHATSAPP_API_KEY=<your api key>
WHATSAPP_API_NAME=<your TryowBot API Campaign name>
WHATSAPP_TEMPLATE_NAME=event_registration_success
WHATSAPP_WELCOME_TEMPLATE_NAME=event_registration_success
WHATSAPP_WELCOME_TEMPLATE_LANGUAGE=mr
WHATSAPP_WELCOME_TEMPLATE_VARIABLES=
WHATSAPP_RECEIVE_MOBILE=<test participant number without +>
```

Do not put the API key in Git or frontend code.

## 2. Register a test participant

Complete the normal participant registration flow with a WhatsApp-enabled mobile number.

Expected result:

- Participant is created.
- `createdAt` and `updatedAt` are populated.
- Duplicate mobile registration returns HTTP `409`.
- A `WELCOME_TEMPLATE` job is created.
- The WhatsApp worker sends the configured TryowBot API Campaign.
- A `WhatsAppInteraction` with `direction=OUTBOUND` and `messageType=TEMPLATE` is stored.

## 3. Check WhatsApp

Confirm the participant receives the approved `event_registration_success` template.

If the template has no variables, keep `WHATSAPP_WELCOME_TEMPLATE_VARIABLES` empty.

## 4. Test an incoming response

Reply from the participant's WhatsApp number, for example:

- `problem solved`
- `in progress`
- `query`
- Marathi/Hindi/Gujarati equivalents supported by the backend

The receive worker polls TryowBot's Receive Message API for `WHATSAPP_RECEIVE_MOBILE`.

Expected participant status:

- problem solved -> `PROBLEM_SOLVED`
- in progress -> `IN_PROGRESS`
- other support/query text -> `QUERY_RAISED`

The message is also stored in `WhatsAppInteraction`.

## 5. Manual sync

If you do not want to wait for the polling interval, call the authenticated admin endpoint:

```text
POST /api/v1/whatsapp/participants/:participantId/sync
```

Then check:

```text
GET /api/v1/whatsapp/participants/:participantId/interactions
```

## 6. Important limitation

TryowBot's documented send API is API-Campaign/template based. The backend does not send arbitrary free-text WhatsApp messages through that endpoint. For automatic replies, create and approve a suitable API Campaign/template and configure it separately.


## 7. Direct API diagnostic

After logging into the admin portal, use the participant ID to call:

```text
POST /api/v1/whatsapp/participants/:participantId/test-welcome
```

This sends the same TryowBot API Campaign directly, without waiting for the background worker. If this fails, the response contains the provider error and the backend stores a FAILED WhatsApp interaction. If it succeeds, the TryowBot campaign should show the send and the participant should receive the approved template.

The backend also logs a line like:

```text
[whatsapp-tryowbot] send status=200 apiname=participant_registration to=919xxxxxxxxx response=...
```

Important: `WHATSAPP_API_NAME` must be the **API Campaign / apiname**, not the WhatsApp template name.
