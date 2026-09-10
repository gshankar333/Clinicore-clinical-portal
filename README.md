# Clinicore Clinical Portal - AppSec Pipeline Demo

Intentionally vulnerable healthcare-style portal built to showcase a full
SAST + DAST + IAST + RASP pipeline. See project planning docs (ERD and
flowchart) for the full design which will be updated soon.

### Backend
- Postgres schema (`backend/db/schema.sql`) according to ERD
- Seed intital doctors data (`backend/db/seed.sql`)
- seed initial random patients data (`backend/db/seed-demo-full.js`)
- Auth: register, login, forgot-password, reset-password, `/api/me`
- Doctor routes: search and view patient records, add notes to patients, fetch lab result, export
- Admin routes: list,create,update ,delete patients , doctors, view audit logs, import records
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
## Not yet implemented (by design, per process plan)

SAST/DAST/IAST/RASP pipeline.

