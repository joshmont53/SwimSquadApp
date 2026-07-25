import type { Express } from "express";

const baseStyles = `
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 15px;
      line-height: 1.7;
      color: #1a1a1a;
      background: #f9f9f7;
      padding: 0;
    }
    .page-wrap {
      max-width: 780px;
      margin: 0 auto;
      padding: 48px 32px 80px;
      background: #fff;
      min-height: 100vh;
    }
    .logo-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 40px;
      padding-bottom: 24px;
      border-bottom: 2px solid #4B9A4A;
    }
    .logo-mark {
      width: 36px;
      height: 36px;
      background: #4B9A4A;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 18px;
      letter-spacing: -0.5px;
    }
    .logo-text {
      font-size: 18px;
      font-weight: 700;
      color: #1a1a1a;
    }
    .doc-type {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #4B9A4A;
      margin-left: auto;
    }
    h1 {
      font-size: 28px;
      font-weight: 700;
      color: #1a1a1a;
      line-height: 1.2;
      margin-bottom: 8px;
    }
    .meta {
      font-size: 13px;
      color: #666;
      margin-bottom: 36px;
      padding-bottom: 24px;
      border-bottom: 1px solid #e5e5e5;
    }
    .meta span { margin-right: 20px; }
    h2 {
      font-size: 18px;
      font-weight: 700;
      color: #1a1a1a;
      margin: 40px 0 12px;
      padding-top: 8px;
    }
    h2::before {
      content: '';
      display: block;
      height: 2px;
      width: 32px;
      background: #4B9A4A;
      margin-bottom: 10px;
    }
    h3 {
      font-size: 15px;
      font-weight: 600;
      color: #1a1a1a;
      margin: 24px 0 8px;
    }
    p { margin-bottom: 14px; color: #333; }
    ul, ol { padding-left: 20px; margin-bottom: 14px; }
    li { margin-bottom: 6px; color: #333; }
    strong { color: #1a1a1a; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0 24px;
      font-size: 14px;
    }
    th {
      background: #f3f4f2;
      text-align: left;
      padding: 10px 14px;
      font-weight: 600;
      color: #1a1a1a;
      border: 1px solid #e0e0e0;
    }
    td {
      padding: 9px 14px;
      border: 1px solid #e0e0e0;
      color: #333;
      vertical-align: top;
    }
    tr:nth-child(even) td { background: #fafafa; }
    .callout {
      background: #f0f7f0;
      border-left: 3px solid #4B9A4A;
      padding: 14px 18px;
      border-radius: 0 6px 6px 0;
      margin: 16px 0 24px;
      font-size: 14px;
      color: #2d5c2d;
    }
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #e5e5e5;
      font-size: 12px;
      color: #999;
      text-align: center;
    }
    a { color: #4B9A4A; text-decoration: none; }
    a:hover { text-decoration: underline; }
    @media (max-width: 600px) {
      .page-wrap { padding: 28px 20px 60px; }
      h1 { font-size: 22px; }
    }
    @media print {
      body { background: white; }
      .page-wrap { padding: 20px; }
    }
  </style>
`;

export function registerPrivacyRoutes(app: Express) {
  app.get("/privacy", (req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  ${baseStyles}
  <title>Privacy Policy — Swim Squad</title>
  <meta name="description" content="Swim Squad Privacy Policy for coaches and club administrators.">
</head>
<body>
  <div class="page-wrap">
    <div class="logo-bar">
      <div class="logo-mark">S</div>
      <span class="logo-text">Swim Squad</span>
      <span class="doc-type">Privacy Policy</span>
    </div>

    <h1>Privacy Policy</h1>
    <div class="meta">
      <span>Version 1.1</span>
      <span>Last updated: 25 July 2026</span>
      <span>Effective: 25 July 2026</span>
    </div>

    <h2>1. Introduction</h2>
    <p>This Privacy Policy explains how Swim Squad ("the App", "we", "us") collects, uses, stores, and protects personal data in connection with the coaching management software provided to swimming clubs.</p>
    <p>Swim Squad is a closed, invitation-only platform provided to swimming clubs for use by their authorised coaching staff. Access is granted exclusively to individuals who have received a formal invitation from their club's administrator.</p>
    <p>This policy applies to all coaches who use the App. It covers the personal data we hold about you as a coach, and the personal data relating to swimmers that you enter and manage through the App in the course of your coaching duties.</p>
    <p>This policy should be read alongside the separate <a href="/privacy/swimmers">Swim Squad Data Notice for Parents and Swimmers</a>, which covers how swimmer data is handled and which your club administrator can provide to the parents and guardians of your swimmers.</p>

    <h2>2. Who is Responsible for Your Data?</h2>
    <h3>Data Controller</h3>
    <p><strong>Your swimming club</strong> is the Data Controller for personal data entered into the App by its coaches and administrators. This means the club determines what data is collected and how it is used within the App.</p>
    <h3>Data Processor</h3>
    <p>Swim Squad (developed by Josh Montgomery) acts as a Data Processor on behalf of each swimming club, processing personal data only in accordance with the club's instructions and this policy. A Data Processing Agreement is in place between Swim Squad and each club that uses the platform.</p>
    <p>For any data protection enquiries relating to the Swim Squad platform itself, please contact:<br>
    <strong>Josh Montgomery — Swim Squad</strong><br>
    <a href="mailto:admin@swimsquadapp.co.uk">admin@swimsquadapp.co.uk</a></p>

    <h2>3. Data We Collect About You (Coaches)</h2>
    <table>
      <tr><th>Category</th><th>Data</th><th>Purpose</th></tr>
      <tr><td><strong>Identity</strong></td><td>First name, last name</td><td>Identifying you across the platform</td></tr>
      <tr><td><strong>Contact</strong></td><td>Email address</td><td>Account access, invitations, notifications</td></tr>
      <tr><td><strong>Professional</strong></td><td>Qualification level (Level 1–3 or None)</td><td>Calculating coaching rates, displaying credentials</td></tr>
      <tr><td><strong>Personal</strong></td><td>Date of birth</td><td>Verifying coach eligibility, record keeping</td></tr>
      <tr><td><strong>Authentication</strong></td><td>Email address, hashed password</td><td>Secure account login (passwords are never stored in plain text)</td></tr>
      <tr><td><strong>Account Status</strong></td><td>Active / pending / suspended status</td><td>Access management</td></tr>
      <tr><td><strong>Device</strong></td><td>iOS device token</td><td>Sending push notifications to your device</td></tr>
      <tr><td><strong>Activity</strong></td><td>Sessions you led, co-coached, assisted, or wrote</td><td>Scheduling, accountability, and payroll records</td></tr>
      <tr><td><strong>Financial</strong></td><td>Coaching hours worked, session writing credits</td><td>Invoice generation and payroll calculation</td></tr>
    </table>
    <p>We do not collect payment card details, bank account information, device location data, or advertising identifiers.</p>

    <h2>4. Data We Collect and Store About Swimmers</h2>
    <table>
      <tr><th>Category</th><th>Data</th><th>Purpose</th></tr>
      <tr><td><strong>Identity</strong></td><td>First name, last name</td><td>Identifying individual swimmers</td></tr>
      <tr><td><strong>Registration</strong></td><td>Swim England (ASA) number</td><td>Matching club membership records</td></tr>
      <tr><td><strong>Personal</strong></td><td>Date of birth</td><td>Determining age range, age-appropriate training</td></tr>
      <tr><td><strong>Personal</strong></td><td>Gender</td><td>Training record categorisation</td></tr>
      <tr><td><strong>Organisational</strong></td><td>Squad assignment</td><td>Managing training groups and session allocation</td></tr>
      <tr><td><strong>Attendance</strong></td><td>Present / Absent / Part Session, lateness notes</td><td>Monitoring engagement, duty of care</td></tr>
    </table>
    <p>Swimmer data is accessible to all active coaches within the same club. Data is never shared between clubs — each club's data is completely isolated.</p>

    <h2>5. Training Session Data</h2>
    <p>When sessions are created and managed, the App stores: date, start time, end time, and duration; pool location; lead coach, second coach, helper, and set writer assignments; training set content (free text written by coaches); coaching notes; session focus; AI-calculated distance breakdowns; linked drills; session feedback ratings; and swimmer attendance records.</p>
    <p>Session content and coach assignments — including the date, time, and location of coaching sessions — are visible to all active coaches within the same club.</p>

    <h2>6. Legal Basis for Processing</h2>
    <table>
      <tr><th>Data</th><th>Legal Basis</th></tr>
      <tr><td>Coach identity, contact, and professional details</td><td><strong>Contractual necessity</strong> — required to fulfil your coaching role with the club</td></tr>
      <tr><td>Coach authentication data</td><td><strong>Contractual necessity</strong> — required to provide access to the App</td></tr>
      <tr><td>Coach financial records</td><td><strong>Legitimate interests</strong> — payroll and invoicing</td></tr>
      <tr><td>Device tokens for push notifications</td><td><strong>Consent</strong> — you may opt out via your device settings at any time</td></tr>
      <tr><td>Swimmer personal data</td><td><strong>Legitimate interests</strong> of the club — managing a sports programme, safeguarding, duty of care</td></tr>
      <tr><td>Swimmer attendance records</td><td><strong>Legitimate interests</strong> — safeguarding, attendance monitoring, programme quality</td></tr>
      <tr><td>Session feedback</td><td><strong>Legitimate interests</strong> — improving coaching quality and programme delivery</td></tr>
    </table>

    <h2>7. AI Features — What Data Is Involved</h2>
    <p>The App uses artificial intelligence provided by <strong>OpenAI</strong> (via their business API) in two specific ways.</p>
    <h3>7.1 Automated Session Distance Parsing</h3>
    <p>When you write a training session, the App sends the <strong>session content text only</strong> (e.g., "4 x 100m FC as 25m Drill / 75m Swim") to OpenAI. The AI calculates distances per stroke and activity type. No personal identifiers — names, dates of birth, or registration numbers — are included in this request.</p>
    <h3>7.2 AI Coaching Assistant</h3>
    <p>When you use the coaching assistant, the following context is sent to OpenAI: squad name; number of swimmers in the squad; the age range and average age of the squad (derived from dates of birth — <strong>no individual's DOB is transmitted</strong>); pool name and length; the current session's date, focus, distance, and content; a summary of up to 10 recent sessions (dates, focus areas, and distances only); and your message to the assistant.</p>
    <div class="callout"><strong>Individual swimmer names, dates of birth, Swim England numbers, gender, or attendance records are never sent to OpenAI.</strong></div>
    <h3>7.3 OpenAI Data Handling</h3>
    <p>Under OpenAI's API terms (as at March 2026), data submitted via the API is not used to train OpenAI's AI models. Learn more at <a href="https://openai.com/policies/api-data-usage-policies" target="_blank" rel="noopener noreferrer">openai.com/policies/api-data-usage-policies</a>.</p>

    <h2>8. Third-Party Services</h2>
    <table>
      <tr><th>Service</th><th>Purpose</th><th>Data Shared</th></tr>
      <tr><td><strong>OpenAI</strong></td><td>AI session parsing and coaching assistant</td><td>Session text content, squad aggregate demographics, training history summaries</td></tr>
      <tr><td><strong>Resend</strong></td><td>Sending invitation and verification emails</td><td>Coach email address and invitation link</td></tr>
      <tr><td><strong>Apple Push Notification Service (APNs)</strong></td><td>Delivering push notifications to iOS devices</td><td>Device token only</td></tr>
      <tr><td><strong>Replit / PostgreSQL</strong></td><td>Application hosting and database</td><td>All App data, stored on Replit's managed infrastructure</td></tr>
    </table>

    <h2>8a. International Data Transfers</h2>
    <p>Some of the third-party services listed in Section 8 are based in the United States of America, which means that personal data processed by them is transferred to and stored in a country outside the United Kingdom.</p>
    <p>This applies to:</p>
    <ul>
      <li><strong>Replit / PostgreSQL</strong> — application hosting and database storage (USA)</li>
      <li><strong>OpenAI</strong> — AI session parsing and coaching assistant (USA)</li>
      <li><strong>Resend</strong> — email delivery (USA)</li>
    </ul>
    <p>These transfers are lawful under UK GDPR. Each provider operates under <strong>Standard Contractual Clauses (SCCs)</strong> — a legal mechanism approved under UK data protection law that requires these providers to protect your data to a standard equivalent to UK law.</p>
    <p>We have reviewed the data handling commitments of each provider and are satisfied that appropriate safeguards are in place.</p>

    <h2>9. Data Isolation Between Clubs</h2>
    <p>Swim Squad serves multiple swimming clubs. Data entered by one club is completely isolated from all other clubs. Coaches can only access data belonging to their own club. There is no cross-club data sharing of any kind.</p>

    <h2>10. Data Security</h2>
    <p>Passwords are hashed using bcrypt and never stored in plain text. Access is restricted to invited coaches only — there is no public registration. Invitation tokens expire after 48 hours. Email verification tokens expire after 24 hours. HTTPS is enforced for all data in transit. All data is stored in a managed PostgreSQL database on Replit's infrastructure. In the event of a breach, we will notify affected clubs and the relevant supervisory authority in line with our legal obligations.</p>

    <h2>11. Data Retention</h2>
    <table>
      <tr><th>Data Type</th><th>Retention Period</th></tr>
      <tr><td>Coach account and profile data</td><td>Duration of active coaching role, and 7 years thereafter (or until deletion is requested)</td></tr>
      <tr><td>Session and attendance data</td><td>7 years from creation, or until deletion is requested</td></tr>
      <tr><td>Swimmer data</td><td>Duration of active club membership, and 7 years thereafter (or until the club requests removal)</td></tr>
      <tr><td>Invitation tokens</td><td>Expire automatically after 48 hours</td></tr>
      <tr><td>Email verification tokens</td><td>Expire automatically after 24 hours</td></tr>
      <tr><td>Push notification device tokens</td><td>Retained while the account is active; removed upon deactivation</td></tr>
    </table>
    <p>The 7-year retention period aligns with standard safeguarding record-keeping obligations for sports organisations in the United Kingdom.</p>

    <h2>12. Your Rights Under UK GDPR</h2>
    <ul>
      <li><strong>Right of access</strong> — request a copy of personal data we hold about you</li>
      <li><strong>Right to rectification</strong> — request correction of inaccurate data</li>
      <li><strong>Right to erasure</strong> — request deletion, subject to legal obligations</li>
      <li><strong>Right to restrict processing</strong> — request limits on how we use your data</li>
      <li><strong>Right to data portability</strong> — request your data in a machine-readable format</li>
      <li><strong>Right to object</strong> — object to processing based on legitimate interests</li>
      <li><strong>Right to withdraw consent</strong> — withdraw consent for push notifications via your device settings at any time</li>
    </ul>
    <p>To exercise these rights, contact your club administrator or reach us directly at <a href="mailto:admin@swimsquadapp.co.uk">admin@swimsquadapp.co.uk</a>. We will respond within one calendar month.</p>
    <p>You also have the right to complain to the <strong>Information Commissioner's Office (ICO)</strong> at <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer">ico.org.uk</a> or by calling 0303 123 1113.</p>

    <h2>13. Children's Data</h2>
    <p>The App is for use by coaches only and is not intended for use by individuals under 18. However, the App stores personal data relating to swimmers, many of whom may be under 18. This data is managed by coaches acting in their professional capacity on behalf of their club. Information for parents and guardians is available in the separate <a href="/privacy/swimmers">Data Notice for Parents and Swimmers</a>.</p>

    <h2>14. Changes to This Policy</h2>
    <p>We may update this policy from time to time. Where changes are material, we will notify coaches via their registered email address. The current version is always accessible within the App.</p>

    <h2>15. Contact</h2>
    <p><strong>Josh Montgomery — Swim Squad</strong><br>
    <a href="mailto:admin@swimsquadapp.co.uk">admin@swimsquadapp.co.uk</a></p>

    <div class="footer">
      Swim Squad Privacy Policy &mdash; Version 1.1 &mdash; 25 July 2026<br>
      <a href="/privacy/swimmers">View: Data Notice for Parents and Swimmers</a>
    </div>
  </div>
</body>
</html>`);
  });

  app.get("/privacy/swimmers", (req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  ${baseStyles}
  <title>Data Notice for Parents and Swimmers — Swim Squad</title>
  <meta name="description" content="How Swim Squad handles information about swimmers — a notice for parents, guardians, and swimmers.">
</head>
<body>
  <div class="page-wrap">
    <div class="logo-bar">
      <div class="logo-mark">S</div>
      <span class="logo-text">Swim Squad</span>
      <span class="doc-type">Parent &amp; Swimmer Notice</span>
    </div>

    <h1>Data Notice for Parents, Guardians, and Swimmers</h1>
    <div class="meta">
      <span>Version 1.1</span>
      <span>Last updated: 25 July 2026</span>
      <span>Issued by Swim Squad on behalf of your swimming club</span>
    </div>

    <div class="callout">
      <strong>A message to parents and guardians:</strong> Your swimming club uses a platform called Swim Squad to help coaches organise training, track attendance, and improve the programme. This notice explains exactly what information we hold about your child, why we hold it, and what your rights are. Please read it carefully and keep a copy.
    </div>

    <h2>1. Who is Responsible for Your Child's Information?</h2>
    <p><strong>Your swimming club</strong> is responsible for the information about your child entered into Swim Squad. The club's administrator controls what is stored and who can see it.</p>
    <p>The Swim Squad platform is provided by <strong>Josh Montgomery (Swim Squad)</strong>, who acts as a data processor on behalf of your club — meaning Swim Squad stores and processes the information only on your club's instruction.</p>
    <p>For questions about your data, contact your club administrator first. You may also contact Swim Squad directly:<br>
    <strong>Josh Montgomery — Swim Squad</strong><br>
    <a href="mailto:admin@swimsquadapp.co.uk">admin@swimsquadapp.co.uk</a></p>

    <h2>2. What Information Do We Hold About Your Child?</h2>
    <table>
      <tr><th>Information</th><th>Why We Hold It</th></tr>
      <tr><td><strong>First name and last name</strong></td><td>To identify your child within the coaching system</td></tr>
      <tr><td><strong>Date of birth</strong></td><td>To ensure they are in the right age group and to help coaches plan age-appropriate training</td></tr>
      <tr><td><strong>Gender</strong></td><td>For training record categorisation</td></tr>
      <tr><td><strong>Swim England (ASA) registration number</strong></td><td>To match our records with your child's national swimming registration</td></tr>
      <tr><td><strong>Squad assignment</strong></td><td>To place your child in the correct training group</td></tr>
    </table>
    <p>We do <strong>not</strong> hold: home addresses or phone numbers, medical information (held separately under club safeguarding procedures), school information, or any financial details about your family.</p>

    <h2>3. What Do We Record During Training?</h2>
    <p>Each time your child attends or misses a session, coaches record:</p>
    <ul>
      <li><strong>Attendance</strong> — whether they were present, absent, or attended only part of a session</li>
      <li><strong>Lateness</strong> — if they arrived late, this may be noted (e.g., "Late" or "Very Late")</li>
    </ul>
    <p>These records help coaches monitor engagement, plan training loads, and fulfil duty of care obligations.</p>

    <h2>4. Who Can See This Information?</h2>
    <p>Your child's information is accessible to all active coaches at your swimming club who use the Swim Squad platform, and to the club administrator.</p>
    <p>It is <strong>not</strong> shared with parents or guardians of other swimmers, coaches from other clubs, or any commercial third parties for marketing.</p>
    <p>Swim Squad serves multiple swimming clubs. Each club's data is kept completely separate — coaches from other clubs cannot see your child's information.</p>

    <h2>5. Do We Use Artificial Intelligence (AI) With This Data?</h2>
    <p>The Swim Squad platform includes AI features that help coaches plan better training sessions. We want to be clear about exactly how this works.</p>
    <h3>What the AI does</h3>
    <ul>
      <li><strong>Calculates training distances</strong> — when a coach writes a training set (e.g., "4 x 100m freestyle"), the AI calculates distances covered per stroke type</li>
      <li><strong>Helps coaches plan sessions</strong> — coaches can ask the AI for session design suggestions based on their squad</li>
    </ul>
    <h3>What information is sent to the AI?</h3>
    <ul>
      <li>The squad's name (e.g., "Junior Development")</li>
      <li>The number of swimmers in the squad</li>
      <li>The <strong>age range and average age</strong> of the squad — for example, "ages 11–14, average age 12.5". This is calculated from dates of birth, but <strong>no individual's date of birth is transmitted to the AI</strong></li>
      <li>The training content written by the coach (e.g., "4 x 200m IM")</li>
      <li>A summary of recent sessions (dates, training focus, and total distances only)</li>
    </ul>
    <div class="callout"><strong>Your child's name, individual date of birth, Swim England number, gender, and attendance records are never sent to the AI.</strong></div>
    <h3>Who runs the AI?</h3>
    <p>The AI is provided by <strong>OpenAI</strong> (the company behind ChatGPT), using their professional business API. Under OpenAI's business API terms, data sent through the API is <strong>not used to train their AI models</strong>. Swim Squad has reviewed OpenAI's data handling commitments and is satisfied that this use is appropriate, proportionate, and does not put your child's personal information at risk.</p>

    <h2>5a. Where Is This Information Stored?</h2>
    <p>Swim Squad uses trusted cloud services to run the platform and store data. Some of these services are based in the United States of America, which means your child's information may be stored on servers located outside the United Kingdom.</p>
    <p>This applies to:</p>
    <ul>
      <li><strong>Replit / PostgreSQL</strong> — the platform that hosts the app and its database</li>
      <li><strong>OpenAI</strong> — the AI service that helps coaches plan training sessions</li>
      <li><strong>Resend</strong> — the service used to send emails to coaches</li>
    </ul>
    <p>This is lawful under UK data protection law. Each provider is required to protect your child's data to a standard equivalent to UK law, through a legal arrangement called <strong>Standard Contractual Clauses</strong>. We have checked each provider's commitments and are satisfied that your child's information is properly protected.</p>

    <h2>6. Why Are We Allowed to Hold This Information?</h2>
    <p>Under UK data protection law (UK GDPR), organisations must have a lawful reason to hold and use personal information. We hold your child's information on the basis of our <strong>legitimate interests</strong> as a sports club providing a structured swimming programme. These include: running a safe and well-organised training programme; monitoring attendance as part of our duty of care; ensuring training is appropriate for each swimmer's age and ability; and planning and improving the quality of coaching.</p>
    <p>We have assessed that these purposes are fair and proportionate, and that they do not override the rights of your child.</p>

    <h2>7. How Long Do We Keep This Information?</h2>
    <p>We keep your child's information for as long as they are an active member of your club. After a swimmer leaves, their information is retained for <strong>7 years</strong> in line with standard safeguarding and record-keeping obligations for sports organisations in the United Kingdom, after which it is deleted.</p>
    <p>If you would like your child's information removed earlier, please contact your club administrator.</p>

    <h2>8. Keeping Information Safe</h2>
    <p>The Swim Squad platform protects your child's information through: a closed, invitation-only system accessible only to authorised coaches with verified accounts; encrypted connections for all data in transit; a secure, managed database; and no public accessibility of swimmer information.</p>

    <h2>9. Your Rights — and Your Child's Rights</h2>
    <ul>
      <li><strong>Right to be informed</strong> — you have the right to know what information is held, which this notice explains</li>
      <li><strong>Right of access</strong> — you can request a copy of all information held about your child, provided within one calendar month</li>
      <li><strong>Right to rectification</strong> — if any information is wrong, you can ask us to correct it</li>
      <li><strong>Right to erasure</strong> — you can ask us to delete your child's information (unless retention is legally required)</li>
      <li><strong>Right to restrict processing</strong> — you can ask us to limit how we use your child's information</li>
      <li><strong>Right to object</strong> — you can object to us using your child's information where we rely on legitimate interests</li>
    </ul>
    <p>To exercise any of these rights, contact your club administrator or reach Swim Squad directly at <a href="mailto:admin@swimsquadapp.co.uk">admin@swimsquadapp.co.uk</a>. We will respond within one calendar month at no charge.</p>
    <h3>If you are not satisfied</h3>
    <p>You can complain to the <strong>Information Commissioner's Office (ICO)</strong>:<br>
    Website: <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer">ico.org.uk</a><br>
    Telephone: 0303 123 1113<br>
    Post: ICO, Wycliffe House, Water Lane, Wilmslow, Cheshire, SK9 5AF</p>

    <h2>10. Changes to This Notice</h2>
    <p>We may update this notice from time to time. Your club administrator will let you know if significant changes are made to how your child's information is used.</p>

    <h2>11. Contact</h2>
    <p><strong>Josh Montgomery — Swim Squad</strong><br>
    <a href="mailto:admin@swimsquadapp.co.uk">admin@swimsquadapp.co.uk</a></p>
    <p>For questions specific to how your club manages its data, please contact your club's administrator directly.</p>

    <div class="footer">
      Swim Squad — Data Notice for Parents and Swimmers &mdash; Version 1.1 &mdash; 25 July 2026<br>
      <a href="/privacy">View: Coach Privacy Policy</a>
    </div>
  </div>
</body>
</html>`);
  });
}
