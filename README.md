								# Student Clearance System

A full-stack digital clearance workflow platform for universities and colleges.

This version upgrades the project into a more real-world application with:
- Stronger backend security and request hardening
- Cleaner role-based operations workflow
- Modernized and responsive UI structure
- More reliable session lifecycle handling on the frontend

## Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MongoDB + Mongoose
- Auth: JWT
- Report export: PDFKit

## Features Implemented

- Multi-role authentication: student, department, library, hostel, bursary, admin
- Student clearance request initiation
- Unit-by-unit approval workflow with approve or reject actions
- Real-time clearance progress tracking for students
- Notification feed for students
- Admin user management (create, list, delete)
- Admin analytics (request and user counts)
- Final clearance slip export as PDF when fully approved

## Real-World Upgrades (Current)

- Backend middleware hardening:
	- Helmet for common security headers
	- Express rate limiting
	- Compression and request logging
	- JSON payload size controls
- Validation and data integrity:
	- Role and unit validation for route inputs
	- Stronger auth route checks
	- Admin self-delete protection
	- Student delete protection when active clearance records exist
- Frontend reliability:
	- HTTP timeout and 401 session-expiry handling
	- Auth context profile hydration based on token session
	- Refined loading and feedback states
- UI and layout refresh:
	- Production-style shell, cards, and role identity display
	- Improved onboarding and form quality
	- Better responsive behavior for desktop and mobile

## Project Structure

- client: React application
- server: Express API and business logic

## Setup

### 1) Backend

1. Go to server folder.
2. Copy .env.example to .env and set values.
3. Install dependencies.
4. Start development server.

Commands:

npm install
npm run dev

Required environment variables:

- PORT
- MONGO_URI
- JWT_SECRET
- CLIENT_URL (optional, comma-separated allowed origins for CORS)
- NODE_ENV (optional, production enables tighter logging profile)

### 2) Frontend

1. Go to client folder.
2. Install dependencies.
3. Start development server.

Commands:

npm install
npm run dev

Optional frontend environment variable:

- VITE_API_URL (defaults to /api; set this to your hosted backend URL in production)
- VITE_PROXY_TARGET (used by Vite dev proxy, defaults to http://localhost:5000)

## Deployment Notes (Important)

If the frontend and backend are deployed on different domains, registration/login will fail unless both sides are configured:

- Frontend (for example on Netlify): set `VITE_API_URL=https://your-backend-domain.com/api`
- Frontend can also read `window.__CLEARANCE_API_URL__` or `<meta name="clearance-api-url" content="...">` at runtime if you need to inject the API URL without rebuilding
- Backend: set `CLIENT_URL=https://your-frontend-domain.com`
- Backend: set `JWT_SECRET` in production (required for token signing)

Without `VITE_API_URL`, static hosts typically serve `index.html` for `/api/*`, so auth requests never reach the backend.

## API Overview

- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/profile
- POST /api/clearance/request
- GET /api/clearance/my
- GET /api/clearance/unit
- PATCH /api/approvals/:requestId
- GET /api/notifications
- PATCH /api/notifications/:id/read
- GET /api/admin/users
- POST /api/admin/users
- DELETE /api/admin/users/:id
- GET /api/admin/analytics
- GET /api/reports/slip/:requestId

## Recommended Next Improvements

- Add automated tests (unit + integration + API contract)
- Add audit history timeline for each request
- Add pagination, search, and sorting for large admin datasets
- Add password reset and account recovery
- Add CI pipeline, containerization, and deployment manifest
