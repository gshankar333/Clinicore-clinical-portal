# Clinicore Clinical Portal - AppSec Pipeline Demo

A deliberately vulnerable healthcare portal built to demonstrate an end-to-end Application Security pipeline, integrating SAST, DAST, IAST, and RASP to detect, analyze, and protect against common web application vulnerabilities.

Around this application sits a four-layer security pipeline:
| Layer | Tool | What it does | Runs |
|---|---|---|---|
| **SAST** | Semgrep (public rulesets + 11 custom rules) | Scans source code, no execution | Every push |
| **DAST** | OWASP ZAP (baseline + authenticated + IDOR) | Attacks the running app from outside | Every push |
| **IAST** | Custom Node.js agent | Watches the app from inside while it runs, correlates input to dangerous behavior | Every push (regression-gated) |
| **RASP** | Custom Node.js agent | Actively blocks attacks in real time, in a production-like config | Every push (regression-gated both directions) |

All four are wired into GitHub Actions and confirmed running successfully

## Tech stack
- **Backend:** Node.js, Express, PostgreSQL, JWT auth
- **Frontend:** React 18, Vite, Tailwind CSS
- **Infrastructure:** Docker, Docker Compose, GitHub Actions
- **Security tooling:** Semgrep (SAST), OWASP ZAP (DAST), two custom
  Node.js runtime agents (IAST, RASP)
  
## Application Architecture
#### Full Entity Relationship Diagram :
<img width="1642" height="816" alt="Clinico_healthcare_portal_schema" src="https://github.com/user-attachments/assets/ad17d507-bcd0-4dcb-811d-2174da2425f4" />

#### Project Workflow
<img width="722" height="906" alt="overall_project_workflow" src="https://github.com/user-attachments/assets/a80e8926-2f15-4f4e-b191-46e7786ae522" />



## Application Features
### Backend
- Postgres schema (`backend/db/schema.sql`) according to ERD
- Seed intital doctors data (`backend/db/seed.sql`)
- seed initial random patients data (`backend/db/seed-demo-full.js`)
- Auth: register, login, forgot-password, reset-password, `/api/me`
- Doctor routes: search and view patient records, add notes to patients, fetch and export lab report
- Admin routes: list, create, update, delete patients , doctors, view audit logs, import records
- JWT-based authentication + role-based authorization middleware

### Frontend
- React 18 + Vite + Tailwind 
- Role-based routing: `/admin/*` and `/doctor/*` routes.
- Pages: Login, Admin (Users, Doctors, Doctor 
  Profiles, Audit Logs, Import), Doctor (My Patients, Search, Patient Detail)
- Custom SVG `VitalsChart` component plots BP,heart-rate trends from
  lab_results time-series data  no charting library dependency added
- Verified: `npm run build` succeeds; frontend dev server + Vite proxy
  correctly forwards `/api/*` to the backend (tested live, not just built)

## Application security pipeline workflow
<img width="722" height="906" alt="overall_project_workflow" src="https://github.com/user-attachments/assets/6b2a8e5a-34a1-423b-add7-d2d407cb738f" />

## OWASP Top 10:2025 - End-to-End Implementation, Exploitation & Verification

Every vulnerability below was manually exploited with a real proof-of-concept
before being handed to the automated pipeline. The pipeline's job was to
confirm it could find or block what we already knew was there.

| Category | Location | Vulnerability | Verified via |
|---|---|---|---|
| **A01** Broken Access Control (IDOR) | `patientController.getPatientById` | No ownership check on any doctor can read any patient | Manual PoC + IAST + RASP-adjacent (not yet block-protected) |
| **A01** Broken Access Control (SSRF) | `patientController.fetchLabResult` | `fetch(req.body.url)` with no allow-list | Manual PoC + SAST + DAST + IAST + **RASP (blocks)** |
| **A02** Security Misconfiguration | `middleware/errorHandler.js` | Full stack trace returned to client | SAST + IAST |
| **A02** Security Misconfiguration | `server.js` | `cors()` with no restriction (wildcard origin) | **Found independently by both SAST and DAST** - genuine cross-validation |
| **A03** Software Supply Chain Failures | `package.json` | `lodash@4.17.15` pinned, actively used via `_.merge()` | SAST + `npm audit` |
| **A04** Cryptographic Failures | `utils/password.js` | Unsalted SHA-256 password hashing | SAST |
| **A05** Injection (SQLi) | `patientController.searchPatients` | Raw string concatenation into SQL | SAST + DAST (active exploitation) + IAST + **RASP (blocks)** |
| **A05** Injection (Stored XSS) | `patientController.addNote` + frontend render | Unsanitized `dangerouslySetInnerHTML` | SAST |
| **A06** Insecure Design | `authController.forgotPassword` | Reset token = `md5(email + current minute)` - attacker computes it independently(As of now ,removed from frontend but still can access via backend endpoint) | Manual full account-takeover PoC + SAST + IAST |
| **A07** Authentication Failures | `.env.example` | Weak, short JWT secret | SAST + IAST (runtime config audit) |
| **A08** Software/Data Integrity Failures | `adminController.importRecords` | `new Function()` on user-supplied code | Manual RCE PoC (read env vars, run OS commands) + SAST + IAST + **RASP (blocks)** |
| **A09** Logging & Alerting Failures | login, note access, import, export | No `audit_logs` writes on any sensitive action | IAST + **RASP writes them anyway, as a compensating control** |
| **A10** Mishandling of Exceptional Conditions | `patientController.exportPatientRecord` | Auth-check exception swallowed; request proceeds anyway | SAST + IAST |

## SAST - Static Application Security Testing
SAST scans an application's actual source code and the text of the program
without ever running it. It works like an extremely thorough code
reviewer who reads every line looking for known dangerous patterns
SAST is fundamentally different from the other three layers in one
important way: **it has visibility into every line of source code,
whether or not any test traffic ever exercises that line.** DAST, IAST,
and RASP can only find what they happen to trigger whether a SQLi payload has
to actually be sent, a tainted value has to actually reach a sink during
a real request. 
It's the only layer that can catch a dangerous pattern that a specific test scenario simply never
happens to trigger. It's also the cheapest and fastest by a wide margin no database, no running application, no network calls, which is why it runs first in this pipeline.

### Methods and techniques used
**Tool:** Semgrep, chosen specifically for this project because custom
rules can be written and tested in minutes with no server to run.

**Technique:** AST-based structural pattern matching for JavaScript rules and  `generic`-language regex rules for scanning non-code files like `.env.example` and `package.json`
where structural matching doesn't apply.

**Rule sources:** 3 public rulesets (`p/owasp-top-ten`, `p/javascript`,`p/secrets`) for broad, general coverage, plus 16 custom rules written specifically for this codebase's exact vulnerabilities.
### Implementation:
- Developed 11 custom Semgrep rules, with each rule targeting a specific vulnerability category.
- Tested the rules against the actual codebase and refined three rules that initially failed to detect the intended patterns:
  - SQL Injection: The query was constructed through an intermediate variable rather than inline, so the rule was redesigned using a regex-based pattern.
  - JWT Secret: The initial rule checked the jwt.sign() call, but the weak secret was actually defined in .env.example. The rule was changed to scan the configuration file directly.
  - Fail-Open Error Handling: The original rule expected an assignment inside the catch block, while the application used an empty catch. The rule was updated to detect empty catch blocks.
- Added the public Semgrep rulesets `p/owasp-top-ten`, `p/javascript`, and `p/secrets` for broader coverage.
- Added 5 additional custom rules to detect potential denial-of-service patterns, including unsafe regular expressions, unbounded JSON parsing, unrestricted array processing, and unhandled promises.
- Built sast.yml to run the analysis automatically through GitHub Actions.
- Configured the workflow to upload findings as SARIF results to GitHub's Security tab.

### What was found: All 16 rules: OWASP-mapped

| Rule | OWASP Category | Finds |
|---|---|---|
| `unsalted-hash-password` | A04 | Cryptographic Failures |
| `sql-string-concatenation` | A05 | Injection (SQLi) |
| `dangerous-new-function` | A08 | Software/Data Integrity Failures |
| `dangerously-set-inner-html` | A05 | Injection (Stored XSS) |
| `weak-jwt-secret-in-env-example` | A02/A07 | Security Misconfiguration / Authentication Failures |
| `fail-open-catch-block` | A10 | Mishandling of Exceptional Conditions |
| `ssrf-unvalidated-fetch` | A01 | Broken Access Control (SSRF) |
| `verbose-error-stack-in-response` | A02 | Security Misconfiguration |
| `weak-hash-for-security-token` | A06 | Insecure Design |
| `permissive-cors-no-options` | A02 | Security Misconfiguration |
| `known-vulnerable-lodash-version` | A03 | Software Supply Chain Failures |
| `javascript-unsafe-regex` | A06 | Insecure Design |
| `regex-nested-quantifier` | A06 | Insecure Design |
| `unbounded-json-parse` | A06 | Insecure Design |
| `unrestricted-array-processing` | A06 | Insecure Design |
| `promise-without-catch` | A10 | Mishandling of Exceptional Conditions |

## DAST - Dynamic Application Security Testing
DAST never looks at source code at all. It treats the application as a
**black box** exactly the way a real external attacker would see it:
just a running website or API it can send requests to and observe
responses from. It actively attacks the live application, sending real
malicious payloads and checking whether the responses prove the attack actually worked.

SAST can say "this code *looks like* it builds a SQL query unsafely" 
but it can never prove an attacker sitting outside the network can
actually reach and exploit that code, because SAST has no concept of
authentication, routing, or the real deployed network. DAST proves
**exploitability**: it doesn't infer risk from code shape, it sends the
actual attack and watches whether it works. It's also the only one of
the four techniques that tests the fully assembled, deployed system like  
frontend, backend, and network configuration together.

But the limitation of DAST was it can only find what it specifically thinks to test.
An unauthenticated scan structurally cannot reach anything behind login,
and even an authenticated scan can only exploit what it's told to try.
It has no way to discover, on its own, that a specific field feeds
directly into `new Function()` deep inside the code.

### Methods and techniques used

**Tool:** OWASP ZAP, run in three progressively deeper passes rather than
one single scan, since each pass proves something the previous one
structurally couldn't:

1. **Baseline scan:** This type of scan was passive only and unauthenticated. Spiders in the app observe traffic for header or config-level issues, without sending any
   attack payloads at all.
2. **Full scan:** same unauthenticated access, but with active fuzzing
   enabled for the real attack payloads that were sent and still limited to whatever's reachable without logging in.
3. **Authenticated scan: ** This scan the real payoff. A hand-written OpenAPI spec
   feeds ZAP the exact vulnerable endpoints directly since ZAP's normal
   link-crawling spider cannot discover a pure JSON API at all, which was combined with a JWT Bearer token injected via ZAP's Replacer
   feature so the scanner can reach endpoints behind login. A separate
   Automation Framework plan adds a genuine **IDOR check**, comparing
   responses across two different authenticated doctor identities something a single-session scan cannot do by definition.

### Implementation
- Started with an unauthenticated baseline scan using passive analysis to establish the application's initial security posture.
- The scan reported no High-severity findings, with only header-related issues. This was expected because login-protected API endpoints were not accessible at this stage.
- Next, tested an authenticated full scan, but found that ZAP was not reaching the API. Since the application exposes JSON APIs rather than HTML navigation links, the spider could only discover `/`, `/robots.txt`, and `/sitemap.xml`.
- Created an OpenAPI specification containing the application's actual API endpoints and switched to `zap-api-scan.py` so ZAP could scan the API directly.
- Configured ZAP to attach a JWT token to requests using the Replacer feature, allowing authenticated endpoints to be tested.
- Created a separate scan setup using two doctor accounts to test IDOR by comparing whether one account could access another user's resources.
- Added `dast.yml` to automate the DAST process through GitHub Actions.


### What was found
**Baseline (unauthenticated), frontend:** 0 High / 3 Medium / 6 Low / 2
Info — entirely header-hygiene findings (CSP, clickjacking, SRI,
cross-origin isolation headers). Expected and correct for this stage.

**Full scan (unauthenticated), backend:** CORS Misconfiguration
(Medium) the same bug SAST's `permissive-cors-no-options` rule found,
discovered completely independently by black-box probing with zero
knowledge of the source code. This is the strongest single piece of
"defense in depth actually works" evidence in the whole project: two
unrelated methods, static analysis and live attack traffic, converged on
the exact same real bug.

**Authenticated scan:** SQL Injection (High) was genuine active
exploitation, confirmed. Remote File Inclusion (High) was ZAP's legacy
name for the SSRF pattern it detected. Cross-Domain Misconfiguration
(Medium) the same CORS bug, confirmed a third time across three
different methods.

**Honest gaps, stated rather than hidden:** stored XSS wasn't found
automatically scanners generally struggle with "injected on one
request, executes on a different, later one," and the example payload
supplied in the OpenAPI spec was also fairly benign. The admin RCE
endpoint was never expected to be found by a generic scanner at all.

## IAST - Interactive Application Security Testing
IAST runs the real application, close to a normal test environment, but
with the code silently instrumented from within. Small hooks inserted
at the exact moments specific functions are called, so it can watch what
actually happens to a piece of data as it flows through the system, from
the moment it enters as user input to the moment it reaches a
potentially dangerous operation like a database query. It's called
"interactive" because it needs real traffic to observe anything at all
it isn't scanning code at rest, and it isn't attacking from
outside , it's watching the application's own internal
behavior live, while something else generates the traffic.

SAST can be wrong about whether a flaw is reachable in the real system.
DAST can only observe the *outside effect* of an attack with zero insight into what happened internally to cause it,
and it can only test what it specifically thinks to try. IAST closes
both gaps by watching from inside the running process for any request,
it can precisely confirm which internal function received which piece of
tainted data, and whether that data reached a dangerous operation,
without needing to guess or brute-force a working exploit the way DAST
does. It also sees things neither SAST nor DAST structurally can, the *actual runtime value* of a configuration secret

But a limitation of DAST was that it only sees what real traffic actually exercises during
the test run. A vulnerable code path nobody's test traffic happens to
touch produces nothing for IAST to find, which is exactly why it still needs SAST underneath it, not instead of it.

### IAST Workflow
<img width="602" height="612" alt="iast_architecture" src="https://github.com/user-attachments/assets/8de5aba6-287c-4695-b9d6-7f3145c1a6cc" />


### Methods and techniques used
No off-the-shelf tool exists for this technique, so an agent was built from scratch using AI in Node.js.

| Technique | How | Catches |
|---|---|---|
| **Taint tracking** | `AsyncLocalStorage` tags every value from `req.body`/`query`/`params` at the moment a request arrives; `pg.Pool.query`, `fetch`, and `Function` are monkey-patched to check, at the exact moment they're called, whether the value they received was one of those tagged values | SQLi, SSRF, code injection |
| **Config/API audit** | Patches `crypto.createHash` to flag always-wrong algorithms regardless of context; checks the real, running `JWT_SECRET`'s length at startup; inspects every outgoing response body for a leaked `stack` field | Weak crypto, weak secrets, leaked stack traces |
| **Behavioral monitoring** | Hooks the *end* of each request (`res.on('finish')`) and asks "did the right thing happen?" — was there a matching audit-log write for this sensitive action? Did an auth check throw, yet the response still succeed? Does the returned resource's actual owner match the requester's identity? | Missing audit logs, fail-open auth, IDOR |

### Implementation
- Built a custom Node.js IAST agent from scratch, using AI as a development aid.
- Added three ways of detecting vulnerabilities: taint tracking, configuration/API checks, and behavioral monitoring.
- Tested the agent against the actual running application and refined the detection logic based on the results.
- During testing, found a false positive where the weak-hash check was also inspecting Express's internal code. Adjusted the logic to focus only on application code.
- Discovered that IDOR detection was silently failing because `req.path` was not reliable throughout the request lifecycle. Traced the issue and fixed it by using `req.originalUrl`.
- Ran the tests again and confirmed that all 9 targeted vulnerability categories were being detected correctly.
- Created iast-exercise.js to send real attack scenarios to the application and trigger the IAST checks.
- Added verify-iast-findings.js to automatically verify that all expected findings are generated and fail the build if any are missing.
- Integrated everything into iast.yml so IAST testing and verification run automatically through GitHub Actions.

### what was found

| Category | Rule |
|---|---|
| A05 SQLi | `sql-injection-tainted-query` |
| A01 SSRF | `ssrf-tainted-fetch` |
| A08 Code injection | `code-injection-new-function` |
| A02 Leaked stack trace | `stack-trace-in-response` |
| A06 Weak token hashing | `weak-hash-algorithm-used` |
| A07 Weak JWT secret | `weak-jwt-secret-at-runtime` |
| A09 Missing audit log | `missing-audit-log`  |
| A01 IDOR | `idor-cross-doctor-patient-access`|
| A10 Fail-open auth | `fail-open-auth-bypass` |

## RASP - Runtime Application Self-Protection
RASP uses the same vantage point as IAST instrumentation living inside
the running application process but instead of only observing and
reporting, it actively intervenes and instantly it detects a dangerous
operation about to happen, it stops it before it executes. The
application defends itself in real time, without needing an external
firewall or a human watching a dashboard.

SAST, DAST, and IAST all answer some version of "does a vulnerability
exist, and can it be exploited", but none of them protect a system
that's already live and already vulnerable, right now, while a real code
fix is still being written, reviewed, and deployed. RASP is the layer
for exactly that gap a **compensating control** running in production,
stopping real attacks the moment they happen, even though the underlying
vulnerable code is completely unchanged.
### RASP Workflow
<img width="762" height="862" alt="rasp_component_flow" src="https://github.com/user-attachments/assets/1c3faa27-b32f-4f92-8727-038135a1bc2e" />

### Methods and techniques used
Reuses IAST's exact hook points (`pg.Pool.query`, `fetch`, `Function`),
but the action taken at each hook is different: **reject the operation
before it runs**, rather than log and continue. A custom `RaspBlockError`
is thrown at the moment of detection, caught by a dedicated Express
error-handling middleware positioned *before* the app's generic error
handler so a blocked request gets a clean 403, never the app's normal
(verbose) error response. That same catch point also fires a
**compensating audit-log write** on every block, regardless of which
specific rule triggered it.

### Implementation

- Reused the existing IAST hook points and extended them to block malicious requests instead of only logging them.
- Implemented the first RASP protections for SQL Injection, SSRF, and Code Injection and tested them against the running application.
- During testing, identified false positives where legitimate searches were being blocked. Improved the SQL Injection detection to consider actual attack patterns rather than blocking all user input.
- Strengthened SSRF protection by checking the destination IP, including the full loopback range, and resolving internal hostnames such as db before validation.
- Added audit logging for every blocked request and verified the entries directly in the database.
- Created rasp-exercise.js to verify both malicious requests being blocked and legitimate requests remaining functional.
- Added rasp.yml to automate RASP validation through GitHub Actions.
- **Result:** malicious requests were blocked, legitimate functionality remained available, and every blocked request generated a verified audit-log entry.

### What was found
| Test | Expected | Result |
|---|---|---|
| Legitimate search | pass through | ✅ |
| Legitimate external lab fetch | pass through | ✅ |
| SQLi: tautology, UNION, time-based blind, stacked/DROP, mixed-case | blocked | ✅ all |
| SSRF: localhost, cloud metadata, `127.0.0.2`, `127.1`, decimal/hex-encoded IPs | blocked | ✅ all (decimal/hex forms are auto-normalized by Node's own URL parser before the check even runs was confirmed, not assumed) |
| Code injection: environment-variable theft, OS command execution | blocked | ✅ all |
| Compensating `audit_logs` write per block | present | ✅ confirmed via direct SQL query — real rows exist with `action LIKE 'blocked_%'` |

## Infrastructure & Security Pipeline
The project relies on a containerized infrastructure designed to provide a consistent environment for application development, security testing, and CI/CD execution.

- **Docker:** The application is containerized using separate Dockerfiles for the backend and frontend. The backend runs as an independent Node.js service, while Nginx serves the frontend's static production build. Nginx also acts as a reverse proxy, forwarding /api/* requests to the backend and providing SPA routing fallback.
- **Docker Compose:** docker-compose.yml orchestrates the application stack locally, including the frontend, backend, and a disposable PostgreSQL database. A dedicated seeder profile is provided to populate the database with demonstration data required for security testing. Configuration values and credentials are supplied through environment variables using a git-ignored .env file, preventing sensitive values from being committed to the repository.
- **PostgreSQL:** A containerized PostgreSQL instance is used for local and CI security-testing environments. The database is intentionally isolated from any persistent development database so that security testing, vulnerability exploitation, and database resets can be performed safely and repeatedly.
- **GitHub Actions:** The CI/CD environment is divided into dedicated workflows for different stages of the Application Security lifecycle:
  - **docker-image.yml:** validates that the application stack builds and starts successfully.
  - **sast.yml:** performs source-code security analysis using Semgrep and custom security rules.
  - **dast.yml:** performs dynamic security testing against the running application using OWASP ZAP.
  - **iast.yml:** executes the application with runtime instrumentation to identify vulnerable data flows and security-sensitive sinks.
  - **rasp.yml:** validates runtime protection mechanisms and attack-detection behavior.
- **CI/CD Secrets:** Sensitive configuration required by the workflows, including database credentials, JWT secrets, and authenticated DAST test credentials, is managed through GitHub Actions Secrets and injected into the appropriate workflow at runtime. Secrets are not stored directly in source code or committed configuration files.




## Running locally 

**Backend:**
```bash
cd backend
cp .env.example .env
npm install
# Requires a local Postgres (or set DATABASE_URL to Neon in .env instead
# of the separate DB_* fields). Then, in order:
node db/run-sql.js db/schema.sql
node db/run-sql.js db/seed.sql
node db/reset-demo-data.js      # removes patient accounts, ensures 3 doctors
node db/seed-demo-full.js       # generates 24 patients across the 3 doctors
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```
Visit `http://localhost:5173`. Sample Logins for  mail id's (`admin@clinic.test`, `dr.reyes@clinic.test`) are (password `Password123!`).

**Docker**
```bash
docker compose up --build             # To create the images and initialize the containers
or
docker compose -f docker-compose.yml up --build

docker compose run --rm seeder        #To seed patients data
docker compose ps                     #To check the process
docker compose down                   #To stop and remove the containers
docker compose down -v                #To stop and remove the containers as well volume
docker compose up                     #To start and create the containers
```


