# Hart SC Coaches Platform — Privacy Policy

**Version:** 1.0  
**Last Updated:** [DATE]  
**Effective Date:** [DATE]

---

## 1. Introduction

This Privacy Policy explains how the Hart SC Coaches Platform ("the App", "we", "us") collects, uses, stores, and protects personal data in connection with the coaching management software operated for Hart Swimming Club ("the Club").

The App is a closed, invitation-only platform for authorised swimming coaches employed by or volunteering for Hart Swimming Club. Access is restricted to individuals who have received a formal invitation from the Club's administrator.

This policy applies to all coaches who use the App and covers both the personal data we hold about you as a coach, and the personal data relating to swimmers that you enter and manage through the App in the course of your coaching duties.

**This policy should be read alongside the Club's own data protection policies and the separate Data Notice for Parents and Swimmers** (a copy of which is available from your Club administrator), which covers how swimmer data is handled.

---

## 2. Who is Responsible for Your Data?

### Data Controller

**Hart Swimming Club** is the Data Controller for all personal data processed through this App. This means the Club determines the purposes for which personal data is collected and how it is used.

Contact for data matters:  
**[Club Data Protection Lead Name]**  
**[Email Address]**  
**[Postal Address]**

### Data Processor

The App developer acts as a Data Processor on behalf of the Club, processing data only in accordance with the Club's instructions and this policy. A Data Processing Agreement is in place between the Club and the App developer.

---

## 3. Data We Collect About You (Coaches)

When you are registered on the App, the following personal data is collected and stored:

| Category | Data | Purpose |
|---|---|---|
| **Identity** | First name, last name | Identifying you across the platform |
| **Contact** | Email address | Account access, invitations, notifications |
| **Professional** | Qualification level (Level 1–3 or None) | Calculating coaching rates, displaying credentials |
| **Personal** | Date of birth | Verifying coach eligibility, record keeping |
| **Authentication** | Email address, hashed password | Secure account login |
| **Account Status** | Account status (active/pending/suspended) | Access management |
| **Device** | iOS device token | Sending push notifications to your device |
| **Activity** | Sessions you led, co-coached, helped with, or wrote | Scheduling, accountability, payroll records |
| **Financial** | Coaching hours worked, session writing credits | Invoice generation and payroll calculation |

### What We Do Not Collect

- We do not collect payment card details or bank account information directly. Financial summaries are generated within the App but payment processing, if any, is handled separately by the Club.
- We do not collect location data from your device.
- We do not use advertising trackers or analytics cookies.

---

## 4. Data We Collect and Store About Swimmers

As a coach, you will enter and manage personal data relating to swimmers in your squads. This data is held by the Club and processed through the App. The following swimmer data is stored:

| Category | Data | Purpose |
|---|---|---|
| **Identity** | First name, last name | Identifying individual swimmers |
| **Registration** | Swim England (ASA) registration number | Matching club membership records |
| **Personal** | Date of birth | Determining age range, age-appropriate training |
| **Personal** | Gender | Training record categorisation |
| **Organisational** | Squad assignment | Managing training groups and session allocation |
| **Attendance** | Present / Absent / Part Session records, lateness notes | Monitoring engagement, duty of care |

Swimmer data is visible to all active coaches within the Club who have access to the App. Swimmer data is **not** shared with any third parties except as described in Section 7 (AI Features) and Section 8 (Third-Party Services) below.

---

## 5. Data We Collect About Training Sessions

When sessions are created and managed in the App, the following session data is stored:

- Date, start time, end time, and duration of each session
- Pool location (venue name and pool type)
- Lead coach, second coach, helper, and set writer assignments
- Training set content written by coaches (free text)
- Coaching notes
- Session focus (e.g., Aerobic, Speed, Technique)
- Automatically calculated distance breakdowns by stroke and activity type
- Drills detected and linked within the session
- Session feedback ratings (1–10 across 6 categories) submitted by coaches
- Attendance records for individual swimmers

Session content and coach assignments — including the date, time, and location of coaching sessions — are visible to all active coaches within the Club on the App.

---

## 6. Legal Basis for Processing

We process personal data on the following legal grounds under UK GDPR:

| Data | Legal Basis |
|---|---|
| Coach identity, contact, professional details | **Contractual necessity** — required to fulfil coaching role with the Club |
| Coach authentication data | **Contractual necessity** — required to provide access to the App |
| Coach financial records (hours, rates) | **Legitimate interests** — payroll and invoicing |
| Device tokens for push notifications | **Consent** — you may opt out of notifications at any time via your device settings |
| Swimmer personal data (name, DOB, gender, ASA number) | **Legitimate interests** of the Club — managing a sports programme, safeguarding, duty of care |
| Swimmer attendance records | **Legitimate interests** — safeguarding, attendance monitoring, and programme quality |
| Session feedback | **Legitimate interests** — improving coaching quality and programme delivery |

Where we rely on **legitimate interests**, we have assessed that our interests do not override the rights and freedoms of the individuals concerned.

---

## 7. How We Use AI Features — and What Data Is Involved

The App uses artificial intelligence provided by **OpenAI** (via OpenAI's API) in two specific ways. It is important to be transparent about exactly what data is shared with OpenAI and why.

### 7.1 Automated Session Distance Parsing

When you write a training session, the App sends the **session content text** (e.g., "4 x 100m FC as 25m Drill / 75m Swim") to OpenAI's API. The AI analyses the text and returns calculated distance figures broken down by stroke and activity type (swim, kick, drill, pull).

**What is sent to OpenAI:** The raw training set text only. No coach names, swimmer names, dates of birth, or other personal identifiers are included in this request.

**Purpose:** To automate what would otherwise be a lengthy manual calculation, ensuring training load data is accurate and usable for trend analysis.

### 7.2 AI Coaching Assistant

The App includes an AI assistant that coaches can use to get session planning suggestions and coaching advice. When you interact with the AI assistant, the following context is sent to OpenAI:

- The squad name
- The number of swimmers in the squad
- The **age range** and **average age** of swimmers in the squad (derived from dates of birth, but no individual swimmer names or dates of birth are transmitted)
- The pool name and pool length
- The current session's date, focus, distance, and content
- A summary of up to 10 recent sessions for the squad (dates, focus areas, and total distances only)
- Your message to the assistant

**What is sent to OpenAI:** Aggregate and contextual coaching data as described above. Individual swimmer names, dates of birth, or Swim England numbers are **never** sent to OpenAI.

**Purpose:** To provide contextually relevant, age-appropriate coaching suggestions that are tailored to the specific squad and training history.

### 7.3 OpenAI Data Handling

The App uses OpenAI's API, which is subject to OpenAI's API usage policies. Under OpenAI's current API terms (as at the date of this policy), **data submitted via the API is not used to train OpenAI's models**. API data may be retained by OpenAI for a limited period for abuse monitoring purposes. We recommend reviewing OpenAI's API data usage policy at [https://openai.com/policies/api-data-usage-policies](https://openai.com/policies/api-data-usage-policies).

---

## 8. Third-Party Services

The App integrates with the following third-party services. Each has its own privacy policy.

| Service | Purpose | Data Shared |
|---|---|---|
| **OpenAI** | AI session parsing and coaching assistant | Session text content, squad aggregate demographics, training history summaries |
| **Resend** | Sending invitation and email verification emails | Coach email address, invitation link |
| **Apple Push Notification Service (APNs)** | Delivering push notifications to iOS devices | Device token only (no message content stored by Apple beyond notification delivery) |
| **Replit / PostgreSQL** | Application hosting and database | All App data is stored on Replit's infrastructure in accordance with Replit's privacy and security policies |

---

## 9. Data Sharing

We do not sell, rent, or share personal data with any third party for marketing or commercial purposes.

Data may be shared:

- **Within the Club** — all active coaches can view session data, squad data, and swimmer profiles within the App
- **With the App developer** — for the purposes of technical support, maintenance, and development
- **With third-party services** as described in Section 8
- **If required by law** — in response to a lawful request from a court, regulator, or law enforcement authority

---

## 10. Data Security

We take data security seriously. The following measures are in place:

- **Passwords** are hashed using bcrypt before storage and are never stored in plain text
- **Access** is restricted to invited coaches only — there is no public registration
- **Session tokens** expire and are managed securely
- **Invitation tokens** expire after 48 hours
- **HTTPS** is enforced for all communications
- All data is stored in a managed PostgreSQL database on Replit's infrastructure, which maintains its own security controls

Despite these measures, no system can guarantee absolute security. In the event of a data breach, we will notify affected individuals and the relevant supervisory authority (the Information Commissioner's Office, if applicable) in accordance with our legal obligations.

---

## 11. Data Retention

| Data Type | Retention Period |
|---|---|
| Coach account and profile data | Retained for the duration of your active coaching role and [X years] thereafter, or until you request deletion |
| Session data | Retained indefinitely as part of the Club's historical training records, unless deletion is requested |
| Swimmer data | Retained for the duration of the swimmer's active membership and [X years] thereafter, or until the Club requests removal |
| Attendance records | Retained as part of session records |
| Invitation tokens | Expire after 48 hours; purged automatically |
| Email verification tokens | Expire after 24 hours; purged automatically |
| Push notification device tokens | Retained while your account is active; removed when your account is deactivated |

**[Note to reviewer: You should specify exact retention periods above in consultation with your Club's data protection obligations. Common practice for sports clubs is 6–7 years after the individual's last active involvement, to align with safeguarding record-keeping requirements.]**

---

## 12. Your Rights Under UK GDPR

As a data subject, you have the following rights:

- **Right of access** — You may request a copy of the personal data we hold about you
- **Right to rectification** — You may request that inaccurate data is corrected
- **Right to erasure** — You may request that your data is deleted, subject to our legal and contractual obligations
- **Right to restrict processing** — You may request that we limit how we use your data in certain circumstances
- **Right to data portability** — You may request your data in a machine-readable format
- **Right to object** — You may object to processing based on legitimate interests
- **Right to withdraw consent** — Where processing is based on consent (e.g., push notifications), you may withdraw consent at any time

To exercise any of these rights, please contact:  
**[Club Data Protection Lead Name]**  
**[Email Address]**

We will respond to all requests within **one calendar month**.

If you are not satisfied with our response, you have the right to lodge a complaint with the **Information Commissioner's Office (ICO)** at [https://ico.org.uk](https://ico.org.uk) or by calling 0303 123 1113.

---

## 13. Children's Data

The App is for use by coaches only and is not intended for use by individuals under the age of 18. However, the App stores personal data relating to swimmers, many of whom may be under 18. This data is managed by coaches acting in their professional capacity on behalf of the Club.

Information for parents and guardians of swimmers whose data is held in the App is provided in the separate **Hart SC Swimmers and Parents Data Notice**, available from your Club administrator.

---

## 14. Changes to This Policy

We may update this Privacy Policy from time to time. Where changes are material, we will notify coaches via the email address registered on the App. The current version of this policy is always available within the App.

---

## 15. Contact

For any questions or concerns about this Privacy Policy or how your data is handled, please contact:

**[Club Data Protection Lead Name]**  
Hart Swimming Club  
**[Email Address]**  
**[Postal Address]**

---

*Hart SC Coaches Platform Privacy Policy — Version 1.0*
