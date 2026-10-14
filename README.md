# Meme'd Campaign Payout Tracker

A full-stack campaign management and creator payout platform. Brands create campaigns with budgets and view-based payout milestones. Creators browse live campaigns, submit social media posts, track views, and view their earnings.

**Live Application:** https://memed-payout-tracker-ten.vercel.app/

**Backend Health Check:** https://memed-payout-tracker-api.onrender.com/api/health

## Project Structure

```text
memed-payout-tracker/
├── backend/
│   ├── src/
│   ├── tests/
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   ├── public/
│   ├── .env.example
│   └── package.json
├── .gitignore
└── README.md

```

## Technology Stack

### Backend
- Node.js and Express
- TypeScript
- MongoDB and Mongoose
- JWT authentication
- bcrypt password hashing
- Zod request validation
- Jest and Supertest testing

### Frontend
- Next.js
- React
- TypeScript

## Features

### Brand
- Register and log in as a brand.
- Create campaigns with a platform, budget, and payout milestones.
- View campaigns created by the brand.
- Track campaign spending and remaining budgets.

### Creator
- Register and log in as a creator.
- Browse live campaigns.
- Submit Instagram or YouTube post links.
- Update simulated view counts.
- Track submission history and earnings.

### Payout and Budget Rules
- Payouts are calculated using the highest qualifying view milestone.
- A campaign cannot spend more than its total budget.
- Payout allocation is protected against concurrent budget overspending.
- Repeating an update with the same view count does not generate an additional payout.
- A post cannot be submitted twice to the same campaign.
- A live campaign is marked completed when its budget is exhausted.
- Unusual rapid view increases can be flagged for review.

## Prerequisites

Install:
- Node.js and npm
- MongoDB, either locally or through MongoDB Atlas
- Git

## Local Setup

Clone the repository, then open a terminal in the project root.

### 1. Configure the backend

```powershell
cd backend
Copy-Item .env.example .env
npm install
```

Edit `backend/.env` with your own configuration:

```dotenv
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/memed_payout_tracker
JWT_SECRET=replace_with_a_random_secret_at_least_32_characters_long
```

Use a unique, randomly generated JWT secret of at least 32 characters. Use a MongoDB URI for a database you control.

Start the backend:

```powershell
npm run dev
```

The API should run on `http://localhost:5000`.

Health check: `http://localhost:5000/api/health`

### 2. Configure the frontend

Open another terminal in the project root:

```powershell
cd frontend
Copy-Item .env.example .env.local
npm install
```

Set `frontend/.env.local`:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:5000
```

Start the frontend:

```powershell
npm run dev
```

Open `http://localhost:3000`.

The frontend and backend must both be running for the complete application workflow.

## API Endpoints

All endpoints use the `/api` prefix.

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| POST | `/api/auth/signup` | Register an account | Public |
| POST | `/api/auth/login` | Log in | Public |
| GET | `/api/health` | API health check | Public |
| GET | `/api/campaigns/live` | Browse live campaigns | Public |
| POST | `/api/campaigns` | Create a campaign | Brand |
| GET | `/api/campaigns/mine` | List the brand's campaigns | Brand |
| POST | `/api/submissions` | Submit a post to a campaign | Creator |
| GET | `/api/submissions/mine` | List the creator's submissions | Creator |
| GET | `/api/submissions/earnings` | Retrieve creator earnings | Creator |
| PATCH | `/api/submissions/:id/views` | Update simulated post views | Public |

Protected endpoints require a valid JWT in the authorization header:

```text
Authorization: Bearer <token>
```

The views endpoint is intentionally unauthenticated for simulated platform view updates in this assignment. A production deployment should verify view counts through trusted platform integrations or a secured ingestion service.

## Testing

Run backend tests from the `backend` directory:

```powershell
npm test
```

Run the backend TypeScript check:

```powershell
npx tsc --noEmit
```

Build the backend:

```powershell
npm run build
```

Integration tests use `backend/.env.test`. Configure it with a dedicated test database named `memed_payout_tracker_test`. Never point integration tests at a production database or a database containing data you need to preserve.

The test suite covers API validation, authentication behavior, payout calculations, duplicate submissions, budget caps, repeated view updates, and campaign completion.

## Environment Variables

### Backend

| Variable | Purpose |
|---|---|
| `PORT` | Backend server port |
| `MONGODB_URI` | MongoDB connection URI |
| `JWT_SECRET` | JWT signing secret |

### Frontend

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL |

Never commit `.env`, `.env.local`, `.env.test`, database credentials, or production secrets. Only example environment files with placeholder values should be committed.

## Assumptions and Limitations

- View counts are simulated rather than fetched from social media platforms.
- Milestone payouts use the highest qualifying milestone rather than adding every lower milestone together.
- Campaign budget is a hard cap on the total amount allocated to creators.
- A completed campaign is excluded from live campaign browsing.
- The application uses JWT-based authentication and role-based access control for brand and creator workflows.
- Payment settlement and real social platform verification are outside the current simulated payout workflow.

## Scaling to 10,000 Creators

To support 10,000 creators, I would scale the API horizontally behind a load balancer and keep the frontend and backend independently deployable. MongoDB indexes would optimize campaign and submission queries, while pagination would prevent large lists from loading at once. View updates could be processed through a durable queue and background workers. Atomic database transactions and idempotency checks would ensure simultaneous or repeated updates cannot allocate the same payout twice or exceed a campaign budget. Social-platform integrations would verify post ownership and view counts instead of trusting client-supplied values. Redis could cache live campaign listings with short expiration times and appropriate invalidation. Rate limiting, structured logs, monitoring, alerts, and audit records would help detect unusual activity and investigate payout disputes. Finally, load and concurrency tests would guide database connection-pool settings, worker concurrency, and capacity planning.

## Deployment

Deploy the backend and frontend as separate services. Configure environment variables through the hosting provider's secret management settings rather than committing credentials. Use a production MongoDB database, a strong JWT secret, HTTPS, and the deployed backend URL in `NEXT_PUBLIC_API_URL`.

Before deploying, build and test both applications and verify authentication, campaign creation, submission, and budget-capped payouts in the deployed environment.

