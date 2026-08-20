# Backend implementation in this package

## Added
- Support Requirement master module.
- WhatsApp interaction persistence and provider boundary.
- Participant journey/status tracking.
- Admin participant list/detail APIs.
- Vendor CSV import.
- Vendor related fields for requirement matching.
- Government Scheme route registration and controller validation fixes.
- WhatsApp webhook endpoints.
- WhatsApp admin individual/bulk messaging endpoints.

## Updated
- Volunteer registration now supports WITH_MOBILE and WITHOUT_MOBILE.
- Self registration records OTP as the mobile verification method.
- Admin/vendor/government scheme routes are protected for SUPER_ADMIN.
- JWT expiry now uses `JWT_EXPIRES_IN`.

## No WhatsApp credentials included
WhatsApp is disabled by default. Add credentials to `.env` later.

## No new runtime dependency was added
The WhatsApp provider uses Node's built-in `fetch`.
Vendor CSV import uses the existing `xlsx` dependency.

## Latest participant/WhatsApp changes

1. Participant timestamps are available through `createdAt` and `updatedAt`.
2. Participant journey status fields were added:
   - `participantStatus`: `REGISTERED`, `QUERY_RAISED`, `IN_PROGRESS`, `PROBLEM_SOLVED`, etc.
   - `whatsappStatus`: `NOT_AVAILABLE`, `PENDING`, `CONTACTED`, `ACTIVE`, `FAILED`.
3. Welcome WhatsApp template is persisted as a background job after registration. Registration does not wait for WhatsApp delivery.
4. Active mobile numbers remain unique and duplicate registration returns HTTP 409.
5. Registration language is stored as a small language code (`en`, `hi`, `mr`, `gu`). English remains the master question text in the database; the public registration-question endpoint can translate it dynamically with Google Translation.

### Public registration question endpoint

`GET /api/v1/participant-questions/registration?language=en|hi|mr|gu`

### TryowBot provider implementation

The provider is now implemented against TryowBot's documented API:

- Send endpoint: `POST https://web.tryowbot.com/api/v1/send`
- Receive endpoint: `POST https://web.tryowbot.com/api/v1/receive`
- Required send fields: `appid`, `apikey`, `apiname`, `to`, `parameters`
- Template variables use `var1`, `var2`, etc.
- Incoming messages are normalized and stored in `WhatsAppInteraction`.
- Duplicate incoming records are prevented using an `externalMessageKey`.

### Dynamic language campaign support

The participant's `preferredLanguage` is already stored as `en`, `hi`, `mr` or `gu`. If each language has its own approved TryowBot API Campaign, configure `WHATSAPP_WELCOME_API_NAMES` as a JSON map. Example:

`{"mr":"event_registration_success_mr","hi":"event_registration_success_hi"}`

If the map is empty, the backend uses the single `WHATSAPP_API_NAME` campaign.

### Important TryowBot limitation

TryowBot's documented API is template/campaign based. The current implementation therefore does not pretend that arbitrary free-text WhatsApp replies can be sent through the same endpoint. Incoming participant messages are stored and participant status is updated. Any automatic reply should use an approved API Campaign/template configured for that purpose.
