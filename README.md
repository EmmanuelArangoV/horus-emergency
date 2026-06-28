# Horus Emergency

**Horus Emergency** is the medical identification and first aid guidance module of the Horus health platform. It delivers real-time patient medical data to emergency responders when a Horus bracelet is scanned, and provides an interactive first aid protocol library for bystanders, healthcare workers, and event staff.

---

## Overview

When a responder scans the QR code or taps the NFC chip on a Horus medical bracelet, they are directed to a secure medical card displaying the patient's critical health information: blood type, life-threatening allergies, chronic conditions, current medications, and emergency contacts — all controlled by the patient's own privacy settings.

The integrated **HORUS AID** first aid guide offers ~20 clinically structured protocols with step-by-step instructions, countdown timers, and interactive decision trees that guide users through CPR, anaphylaxis, seizures, severe bleeding, and more. When accessed from a patient's bracelet, the guide automatically surfaces protocols relevant to that patient's conditions and allergies.

---

## Features

- **Medical ID Card** — Server-side rendered patient profile with privacy-gated fields
- **Life-Threatening Alert** — Prominent red banner when the patient has critical allergies
- **Scan Logging** — Every card access is recorded with timestamp and IP address
- **HORUS AID Protocol Library** — ~20 first aid protocols, categorized and searchable
- **Fuzzy Search** — Spanish-language semantic search with synonym expansion and stemming
- **Interactive Decision Trees** — Guided yes/no evaluation for complex protocols (CPR, anaphylaxis, etc.)
- **Step Timers** — Built-in countdown timers for time-critical steps (chest compressions, 15-min rule)
- **Patient Context** — Automatically highlights protocols relevant to the scanned patient's profile
- **Emergency Call Buttons** — Direct one-tap links to 123 (emergencies), 132 (Red Cross), 119 (Fire)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| UI | React 19 + Tailwind CSS v4 |
| ORM | Prisma 5 |
| Database | PostgreSQL via Neon (serverless) |
| Search | Fuse.js 7 (fuzzy matching) |
| Deployment | Vercel |

---

## Project Structure

```
horus-emergency/
├── src/
│   ├── app/
│   │   ├── page.tsx                        # Landing — scan prompt
│   │   ├── layout.tsx                      # Root layout, fonts, global metadata
│   │   ├── globals.css                     # Design tokens (CSS variables), Tailwind base
│   │   │
│   │   ├── emergency/[userId]/
│   │   │   ├── page.tsx                    # Medical card (SSR — fetches patient data)
│   │   │   └── ScanLogger.tsx              # Client component — logs each scan via API
│   │   │
│   │   ├── api/scan/[userId]/
│   │   │   └── route.ts                    # POST — records scan event to database
│   │   │
│   │   └── firstaid/
│   │       ├── page.tsx                    # First aid landing (loads patient context if present)
│   │       └── _components/
│   │           ├── FirstAidClient.tsx      # Protocol search, filters, modal UI
│   │           ├── DecisionTree.tsx        # Interactive yes/no protocol evaluator
│   │           └── StepTimer.tsx           # Countdown timer with pause/restart
│   │
│   └── lib/
│       ├── prisma.ts                       # Singleton PrismaClient
│       └── firstaid/
│           ├── types.ts                    # Protocol, DecisionNode, ProtocolStep interfaces
│           ├── protocols.ts                # Full protocol library + symptom mapping
│           └── search.ts                   # Fuzzy search engine (tokenizer, stemmer, synonyms)
│
├── prisma/
│   └── schema.prisma                       # 11 database models, 8 enums
│
├── .env.local                              # Local environment variables (not committed)
├── next.config.ts
└── tsconfig.json
```

---

## Routes

| Route | Type | Description |
|-------|------|-------------|
| `GET /` | Page (SSR) | Landing page — instructs user to scan a Horus bracelet |
| `GET /emergency/[userId]` | Page (SSR) | Medical card — displays patient data to responders |
| `GET /firstaid` | Page (SSR + CSR) | First aid protocol browser |
| `GET /firstaid?from=[userId]` | Page (SSR + CSR) | First aid with patient-specific protocol suggestions |
| `POST /api/scan/[userId]` | API Route | Logs a profile scan event (timestamp, IP, access status) |

---

## Medical Card (`/emergency/[userId]`)

The medical card is fully server-side rendered on every request to guarantee fresh data. It fetches:

- **Identity** — name, date of birth, gender, blood type, photo, ID number
- **Allergies** — allergen, type, severity (`MILD` / `MODERATE` / `SEVERE` / `LIFE_THREATENING`), reaction
- **Chronic Conditions** — name, severity, status, diagnosed date, clinical notes
- **Current Medications** — name (generic or custom), dosage, frequency, administration route
- **Emergency Contacts** — name, relationship, primary and secondary phone, priority order
- **Medical History** — past events: surgeries, hospitalizations, relevant diagnoses
- **Physical Profile** — height, weight, organ donor status, insurance provider, additional notes

Each field is subject to the patient's **Privacy Settings** — a per-field visibility model that lets patients control exactly what responders see. If `requireAuthentication` is enabled on the patient's account, the card enforces access control before revealing sensitive data.

A **life-threatening allergy banner** is displayed prominently at the top of the card whenever the patient has one or more allergies classified as `LIFE_THREATENING`.

---

## First Aid Protocol Library (`/firstaid`)

### Protocol Structure

Each protocol contains:

```typescript
interface Protocol {
  id: string;
  title: string;
  severity: "critical" | "urgent" | "mild";
  category: string;                         // Cardíaco, Respiratorio, Neurológico, etc.
  keywords: string[];                       // Search index terms
  symptoms: string[];                       // Observable signs
  steps: ProtocolStep[];                    // Ordered instructions with optional timers
  warnings: string[];                       // Critical safety notes
  decisionTree?: DecisionNode[];            // Optional interactive evaluation
  callEmergency: boolean;                   // Whether to display emergency call prompt
  estimatedTime?: number;                   // Total protocol duration in minutes
  aliases?: string[];                       // Alternate names / common misspellings
}
```

### Included Protocols

| Protocol | Severity | Decision Tree | Est. Time |
|----------|----------|:-------------:|:---------:|
| CPR (Adult) | Critical | ✓ | 10 min |
| CPR (Child) | Critical | ✓ | 10 min |
| CPR (Infant) | Critical | ✓ | 10 min |
| Choking (Adult) | Critical | ✓ | 3 min |
| Choking (Child/Infant) | Critical | ✓ | 3 min |
| Anaphylaxis | Critical | ✓ | 5 min |
| Seizures / Epilepsy | Urgent | ✓ | 10 min |
| Severe Bleeding | Critical | ✓ | 5 min |
| Asthma Crisis | Urgent | ✓ | 10 min |
| Hypoglycemia | Urgent | ✓ | 15 min |
| Burns | Urgent | — | 15 min |
| Stroke | Critical | — | 5 min |
| Fractures | Mild | — | — |
| Fainting / Syncope | Urgent | — | 10 min |
| Poisoning / Intoxication | Urgent | — | 5 min |
| Eye Injuries | Mild | — | — |
| Heat Stroke | Critical | — | 10 min |
| Hypothermia | Urgent | — | — |
| Nosebleed | Mild | — | 10 min |
| Electric Shock | Critical | — | — |

### Search Engine

The search engine (`src/lib/firstaid/search.ts`) implements a multi-stage pipeline:

1. **Normalization** — lowercase, remove diacritics, strip non-alphanumeric characters
2. **Stop word filtering** — removes Spanish articles and prepositions (y, o, el, la, de, que, etc.)
3. **Spanish stemming** — strips common suffixes (mente, aciones, ando, ado, iendo, etc.)
4. **Synonym expansion** — maps 20+ Spanish medical synonyms to canonical terms (`desmayo` → `inconsciente`, `me quemé` → `quemadura`, `no respira` → `paro cardiaco`)
5. **Weighted fuzzy matching** — Fuse.js with field weights: title (0.40), keywords (0.35), symptoms (0.25)
6. **Score boosting** — emergency trigger terms (+1.2×), critical severity (+0.8×), priority keywords (+0.6×)

### Decision Trees

Protocols with `decisionTree` arrays provide a guided assessment flow. The `DecisionTree` component implements a state machine that:

- Presents one yes/no question at a time
- Follows branches based on user response
- Terminates at a final set of `ProtocolStep[]` instructions
- Maintains navigation history with a back button for re-evaluation
- Integrates `StepTimer` components for time-sensitive final steps

### Patient Context

When the first aid page is accessed via a link from a patient's medical card (`/firstaid?from=[userId]`), the server fetches the patient's active allergies and chronic conditions and maps them to relevant protocols:

| Patient Condition | Suggested Protocol |
|-------------------|--------------------|
| `LIFE_THREATENING` allergy | Anaphylaxis |
| Any other allergy | Anaphylaxis |
| Epilepsy (chronic condition) | Seizures |
| Asthma (chronic condition) | Asthma Crisis |
| Diabetes (chronic condition) | Hypoglycemia |

Matched protocols are surfaced at the top of the protocol list with a **"Relevant for this patient"** badge.

---

## Database Schema

The database is shared across the Horus platform. Key models used by this service:

| Model | Purpose |
|-------|---------|
| `User` | Base user record — account status, push token |
| `PersonalInformation` | Name, DOB, gender, blood type, photo, ID number |
| `MedicalProfile` | Height, weight, organ donor, insurance, notes |
| `Allergy` | Allergen, type, severity, reaction description, active flag |
| `ChronicCondition` | Name, severity, status, diagnosed date, notes |
| `UserMedication` | Active medications with dosage, frequency, route |
| `MedicationCatalog` | Generic medication reference (joined with UserMedication) |
| `EmergencyContact` | Name, relationship, phone numbers, priority order |
| `MedicalHistory` | Past events: type, name, date, location, provider, outcome |
| `PrivacySettings` | Per-field visibility toggles, authentication requirement |
| `ProfileScan` | Audit log: userId, timestamp, IP, access granted status |

---

## Ecosystem Integration

Horus Emergency is one of four interconnected services in the Horus health platform:

```
┌─────────────────┐     QR / NFC scan     ┌──────────────────────┐
│  horus-braslet  │ ─────────────────────▶ │   horus-emergency    │
│  (web app)      │                        │   (this repo)        │
└─────────────────┘                        └──────────────────────┘
                                                     │
┌─────────────────┐     health data        ┌─────────────────────┐
│  horus-watch    │ ─────────────────────▶ │     PostgreSQL       │
│  (wearable)     │                        │     (Neon)           │
└─────────────────┘                        └─────────────────────┘
                                                     │
┌─────────────────┐     write profile      ┌─────────────────────┐
│  horus-mobile   │ ─────────────────────▶ │   Firebase /        │
│  (mobile app)   │                        │   Firestore         │
└─────────────────┘                        └─────────────────────┘
```

- **horus-braslet** — Web dashboard where users manage their profile, medical data, and privacy settings. The QR code generated here points to `/emergency/[userId]` in this service.
- **horus-mobile** — Mobile companion app for updating health profile, viewing scan history, and managing emergency contacts.
- **horus-watch** — Wearable integration that syncs real-time health readings (heart rate, steps, SpO₂) to the shared database.
- **horus-emergency** (this repo) — Read-only emergency responder interface. Never writes to the medical profile; only appends to `ProfileScan`.

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database (Neon recommended)
- Prisma CLI

### Installation

```bash
git clone https://github.com/your-org/horus-emergency.git
cd horus-emergency
npm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
# PostgreSQL — pooled connection (runtime)
DATABASE_URL=postgresql://user:password@host/horus_db?sslmode=require&pgbouncer=true

# PostgreSQL — direct connection (Prisma migrations only)
DIRECT_URL=postgresql://user:password@host/horus_db?sslmode=require
```

### Database

The schema is shared with the rest of the Horus platform. If setting up from scratch:

```bash
npx prisma migrate deploy
npx prisma generate
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production Build

```bash
npm run build
npm start
```

---

## Deployment

The service is deployed on **Vercel** and connects to a **Neon** serverless PostgreSQL instance.

Set the following environment variables in Vercel's project settings:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon pooled connection string (with `pgbouncer=true`) |
| `DIRECT_URL` | Neon direct connection string (for migrations) |

Deployments are triggered automatically on push to `main`.

---

## Privacy & Security

- **No authentication** is enforced at the URL level — access is intentionally open to allow emergency responders to view critical information without friction.
- **Privacy Settings** allow each patient to control field-level visibility. A field hidden by the patient is fetched but never rendered.
- **Scan logging** creates an audit trail of every access: `ProfileScan` records the `userId`, timestamp, client IP, and whether access was granted.
- **No write access** to medical records — this service is strictly read-only with respect to the patient profile. Only `ProfileScan` records are written.

---

## License

Private — All rights reserved. Part of the Horus Health Platform.
