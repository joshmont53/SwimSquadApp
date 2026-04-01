# Swim Squad — Privacy Policy

**Version:** 1.0  
**Last Updated:** 29 March 2026  
**Effective Date:** 29 March 2026

---

## 1. Introduction

This Privacy Policy explains how Swim Squad ("the App", "we", "us") collects, uses, stores, and protects personal data in connection with the coaching management software provided to swimming clubs.

Swim Squad is a closed, invitation-only platform provided to swimming clubs for use by their authorised coaching staff. Access to the App is granted exclusively to individuals who have received a formal invitation from their club's administrator.

This policy applies to all coaches who use the App. It covers the personal data we hold about you as a coach, and the personal data relating to swimmers that you enter and manage through the App in the course of your coaching duties.

**This policy should be read alongside the separate Swim Squad Data Notice for Parents and Swimmers**, which covers how swimmer data is handled and which your club administrator can provide to the parents and guardians of your swimmers.

---

## 2. Who is Responsible for Your Data?

### Data Controller

**Your swimming club** is the Data Controller for personal data entered into the App by its coaches and administrators. This means the club determines what data is collected and how it is used within the App.

If you have any questions about how your club manages its data, please contact your club administrator.

### Data Processor

Swim Squad (developed by Josh Montgomery) acts as a Data Processor on behalf of each swimming club, processing personal data only in accordance with the club's instructions and this policy. A Data Processing Agreement is in place between Swim Squad and each club that uses the platform.

For any data protection enquiries relating to the Swim Squad platform itself, please contact:

**Josh Montgomery**  
Swim Squad  
**admin@swimsquadapp.co.uk**

---

## 3. Data We Collect About You (Coaches)

When you are registered on the App, the following personal data is collected and stored:

| Category | Data | Purpose |
|---|---|---|
| **Identity** | First name, last name | Identifying you across the platform |
| **Contact** | Email address | Account access, invitations, notifications |
| **Professional** | Qualification level (Level 1–3 or None) | Calculating coaching rates, displaying credentials |
| **Personal** | Date of birth | Verifying coach eligibility, record keeping |
| **Authentication** | Email address, hashed password | Secure account login (passwords are never stored in plain text) |
| **Account Status** | Account status (active/pending/suspended) | Access management |
| **Device** | iOS device token | Sending push notifications to your device |
| **Activity** | Sessions you led, co-coached, assisted, or wrote | Scheduling, accountability, and payroll records |
| **Financial** | Coaching hours worked, session writing credits | Invoice generation and payroll calculation |

### What We Do Not Collect

- We do not collect payment card details or bank account information. Financial summaries are generated within the App for your club's records, but payment processing is handled separately.
- We do not collect location data from your device.
- We do not use advertising trackers or analytics cookies.

---

## 4. Data We Collect and Store About Swimmers

As a coach, you will enter and manage personal data relating to swimmers in your squads. This data is held by your swimming club and processed through the App on their behalf. The following swimmer data is stored:

| Category | Data | Purpose |
|---|---|---|
| **Identity** | First name, last name | Identifying individual swimmers |
| **Registration** | Swim England (ASA) registration number | Matching club membership records |
| **Personal** | Date of birth | Determining age range, age-appropriate training |
| **Personal** | Gender | Training record categorisation |
| **Organisational** | Squad assignment | Managing training groups and session allocation |
| **Attendance** | Present / Absent / Part Session records, lateness notes | Monitoring engagement, duty of care |

Swimmer data is accessible to all active coaches within the same club who have access to the App. Swimmer data is not shared between clubs, and is not accessible to coaches from other clubs. Swimmer data is not shared with any third parties except as described in Sections 7 and 8 below.

---

## 5. Data We Collect About Training Sessions

When sessions are created and managed in the App, the following data is stored:

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

Session content and coach assignments — including the date, time, and location of coaching sessions — are visible to all active coaches within the same club on the App.

---

## 6. Legal Basis for Processing

We process personal data on the following legal grounds under UK GDPR:

| Data | Legal Basis |
|---|---|
| Coach identity, contact, and professional details | **Contractual necessity** — required to fulfil your coaching role with the club |
| Coach authentication data | **Contractual necessity** — required to provide access to the App |
| Coach financial records (hours, rates) | **Legitimate interests** — payroll and invoicing |
| Device tokens for push notifications | **Consent** — you may opt out of notifications at any time via your device settings |
| Swimmer personal data (name, DOB, gender, ASA number) | **Legitimate interests** of the club — managing a sports programme, safeguarding, duty of care |
| Swimmer attendance records | **Legitimate interests** — safeguarding, attendance monitoring, and programme quality |
| Session feedback | **Legitimate interests** — improving coaching quality and programme delivery |

Where we rely on **legitimate interests**, we have assessed that these interests do not override the rights and freedoms of the individuals concerned.

---

## 7. How We Use AI Features — and What Data Is Involved

The App uses artificial intelligence provided by **OpenAI** (via OpenAI's API) in two specific ways. We are committed to being transparent about exactly what data is shared with OpenAI and why.

### 7.1 Automated Session Distance Parsing

When you write a training session, the App sends the **session content text** (e.g., "4 x 100m FC as 25m Drill / 75m Swim") to OpenAI's API. The AI analyses the text and returns calculated distance figures broken down by stroke and activity type (swim, kick, drill, pull).

**What is sent to OpenAI:** The raw training set text only. No coach names, swimmer names, dates of birth, or other personal identifiers are included in this request.

**Purpose:** To automate what would otherwise be a lengthy manual calculation, and to produce accurate training load data for trend analysis.

### 7.2 AI Coaching Assistant

The App includes an AI assistant that coaches can use for session planning suggestions and coaching advice. When you use the assistant, the following context is sent to OpenAI:

- The squad name
- The number of swimmers in the squad
- The **age range** and **average age** of swimmers in the squad (calculated from dates of birth — no individual swimmer's date of birth is transmitted)
- The pool name and pool length
- The current session's date, focus, total distance, and written content
- A summary of up to 10 recent sessions for the squad (dates, focus areas, and total distances only)
- Your message to the assistant

**Individual swimmer names, dates of birth, Swim England numbers, gender, or attendance records are never sent to OpenAI.**

**Purpose:** To provide contextually relevant, age-appropriate coaching suggestions tailored to the specific squad and its training history.

### 7.3 OpenAI Data Handling

The App accesses OpenAI's services via their API. Under OpenAI's API terms (as at March 2026), **data submitted via the API is not used to train OpenAI's AI models**. API data may be retained by OpenAI for a short period for safety monitoring. We recommend reviewing OpenAI's API data usage policy at [https://openai.com/policies/api-data-usage-policies](https://openai.com/policies/api-data-usage-policies).

---

## 8. Third-Party Services

The App integrates with the following third-party services, each operating under their own privacy policies.

| Service | Purpose | Data Shared |
|---|---|---|
| **OpenAI** | AI session parsing and coaching assistant | Session text content, squad aggregate demographics, training history summaries |
| **Resend** | Sending invitation and account verification emails | Coach email address and invitation link |
| **Apple Push Notification Service (APNs)** | Delivering push notifications to iOS devices | Device token only (notification content is not retained by Apple after delivery) |
| **Replit / PostgreSQL** | Application hosting and database infrastructure | All App data is stored on Replit's managed infrastructure in accordance with their security and privacy policies |

---

## 9. Data Sharing Between Clubs

Swim Squad serves multiple swimming clubs. Data entered by one club is completely isolated from all other clubs. Coaches can only access data belonging to their own club. There is no cross-club data sharing.

---

## 10. Data Security

We take the security of all data held in the App seriously. The following protections are in place:

- **Passwords** are hashed using bcrypt before storage and are never stored in plain text
- **Access** is restricted to invited coaches only — there is no public registration
- **Invitation tokens** expire after 48 hours
- **Email verification tokens** expire after 24 hours
- **HTTPS** is enforced for all data in transit
- All data is stored in a managed PostgreSQL database on Replit's infrastructure, which maintains its own industry-standard security controls

In the event of a personal data breach, we will notify affected clubs and, where required, the relevant supervisory authority in accordance with our legal obligations.

---

## 11. Data Retention

| Data Type | Retention Period |
|---|---|
| Coach account and profile data | Retained for the duration of active coaching role, and for 7 years thereafter, or until deletion is requested |
| Session data | Retained as part of the club's historical training records for 7 years, unless earlier deletion is requested |
| Swimmer data | Retained for the duration of the swimmer's active club membership and for 7 years thereafter, or until the club requests removal |
| Attendance records | Retained as part of session records for 7 years |
| Invitation tokens | Expire automatically after 48 hours |
| Email verification tokens | Expire automatically after 24 hours |
| Push notification device tokens | Retained while the account is active; removed upon account deactivation |

The 7-year retention period aligns with standard safeguarding record-keeping obligations for sports organisations in the United Kingdom.

---

## 12. Your Rights Under UK GDPR

You have the following rights in relation to your personal data:

- **Right of access** — You may request a copy of the personal data we hold about you
- **Right to rectification** — You may request that inaccurate data is corrected
- **Right to erasure** — You may request that your data is deleted, subject to our legal and contractual obligations
- **Right to restrict processing** — You may request that we limit how we use your data in certain circumstances
- **Right to data portability** — You may request your data in a structured, machine-readable format
- **Right to object** — You may object to processing based on legitimate interests
- **Right to withdraw consent** — Where processing is based on consent (e.g., push notifications), you may withdraw consent at any time through your device settings

To exercise any of these rights, please contact your club administrator in the first instance. If your request relates to the Swim Squad platform itself, you may also contact:

**Josh Montgomery — admin@swimsquadapp.co.uk**

We will respond to all requests within **one calendar month**.

If you are not satisfied with our response, you have the right to lodge a complaint with the **Information Commissioner's Office (ICO)** at [https://ico.org.uk](https://ico.org.uk) or by calling 0303 123 1113.

---

## 13. Children's Data

The App is for use by coaches only and is not intended for use by individuals under the age of 18. However, the App stores personal data relating to swimmers, many of whom may be under 18. This data is managed by coaches acting in their professional capacity on behalf of their club.

Information for parents and guardians of swimmers whose data is held in the App is provided in the separate **Swim Squad Data Notice for Parents and Swimmers**, available from your club administrator.

---

## 14. Changes to This Policy

We may update this Privacy Policy from time to time to reflect changes to the App or applicable law. Where changes are material, we will notify coaches via their registered email address. The current version of this policy is always accessible within the App.

---

## 15. Contact

For any questions or concerns about this Privacy Policy or how your data is handled, please contact:

**Josh Montgomery**  
Swim Squad  
**admin@swimsquadapp.co.uk**

---

*Swim Squad Privacy Policy — Version 1.0 — 29 March 2026*
