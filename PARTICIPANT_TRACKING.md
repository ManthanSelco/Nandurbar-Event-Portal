# Participant Tracking – Final Scope

## Registration profile
- Name, gender, mobile, place
- Organisation/enterprise type
- Organisation name
- Primary sector
- Preferred language (Marathi default)

## Post-event tracking
- Livelihood categories
- Value chains
- Support/solution categories
- Specific solution/provider interest
- Desired next actions
- What was useful at the Mela
- What could be better
- Assessment status
- Recommended solutions
- Implementation status and notes
- Matched vendors

## Admin APIs
- `GET /api/v1/participants` supports `organizationType`, `sector`, `solution`, `livelihoodCategory`, `assessmentStatus`, `implementationStatus`, `preferredLanguage`, and search filters.
- `GET /api/v1/participants/stats` returns total counts plus solution/sector/livelihood/assessment/implementation groupings.
- `PATCH /api/v1/participants/:id` updates post-event and implementation tracking fields for SUPER_ADMIN.
- `GET /api/v1/participant-questions/registration?language=mr` returns registration questions translated to the requested language.
