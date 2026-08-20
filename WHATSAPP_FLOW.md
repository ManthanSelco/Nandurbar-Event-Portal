# WhatsApp + Participant Support Flow

## Current backend flow

1. Participant registers:
   - Self QR: OTP verified.
   - Volunteer WITH_MOBILE: OTP verified.
   - Volunteer WITHOUT_MOBILE: no OTP and `mobileVerified=false`.
2. Participant profile is stored with journey fields:
   - `participantStatus`
   - `whatsappStatus`
   - `selectedRequirement`
   - `lastWhatsAppInteractionAt`
   - `followUpRequired`
3. Super Admin manages Support Requirements such as:
   - Chilli
   - Machine
   - Livelihood equipment
4. Vendors and Government Schemes are mapped to requirements through related fields.
5. WhatsApp interactions are stored with:
   - query type
   - message type
   - method (`BOT`, `ADMIN`, `SYSTEM`, `WEBHOOK`)
   - inbound/outbound direction
   - selected requirement
   - matched vendors/schemes
   - provider message ID
   - delivery state
6. When WhatsApp credentials are configured, the service can:
   - send admin messages
   - send requirement information
   - receive webhook messages
   - detect a requirement by name/keyword
   - store the participant query and automatically find matching vendor/scheme records.

## Admin APIs

- `GET /api/v1/participants`
- `GET /api/v1/participants/:id`
- `GET /api/v1/support-requirements`
- `POST /api/v1/support-requirements`
- `PATCH /api/v1/support-requirements/:id`
- `GET /api/v1/whatsapp/requirements`
- `POST /api/v1/whatsapp/participants/requirement`
- `POST /api/v1/whatsapp/participants/:participantId/send-requirement`
- `POST /api/v1/whatsapp/participants/:participantId/message`
- `POST /api/v1/whatsapp/bulk-send`
- `GET /api/v1/whatsapp/participants/:participantId/interactions`

## TryowBot integration

The current integration uses TryowBot's documented WebAPI:

- Send: `POST https://web.tryowbot.com/api/v1/send`
- Receive: `POST https://web.tryowbot.com/api/v1/receive`
- Send authentication uses `appid`, `apikey` and an API Campaign name (`apiname`).
- The recipient number is sent with country code and without `+`.
- The receive API is queried by mobile number and date range, so the backend includes a small receive worker and a manual sync endpoint.

Admin test sync endpoint:

- `POST /api/v1/whatsapp/participants/:participantId/sync`

For a quick test, set `WHATSAPP_RECEIVE_MOBILE` to the test participant's number without `+`. For larger production deployments, the receive polling strategy should be sized carefully because TryowBot's documented receive API is contact-number based.

The old Meta webhook routes remain in the code for backward compatibility but are not used by the TryowBot provider.

## WhatsApp credentials

The code is intentionally disabled until credentials are available:

`WHATSAPP_ENABLED=false`

Later add the Meta Cloud API credentials in `.env` and set:

`WHATSAPP_ENABLED=true`

Do not commit `.env` or access tokens to GitHub.

## Important data rule

A participant without a mobile number is never marked as mobile verified.

For that case:

- `mobile = null`
- `mobileVerified = false`
- `mobileVerificationMethod = NOT_PROVIDED`
- `whatsappAvailable = false`

## Testing order

1. Create a Support Requirement.
2. Create a Vendor mapped to that requirement.
3. Create a Government Scheme mapped to that requirement.
4. Register a participant.
5. Confirm the participant appears in `GET /participants`.
6. Select a requirement.
7. Check `GET /whatsapp/participants/:participantId/interactions`.
8. Configure WhatsApp credentials only after the data flow is confirmed.
