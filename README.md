# Aegis - College Management System

Full-stack college ERP: students, staff, attendance, fees, exams and reports, with a React admin dashboard and an Express + SQLite API.

- Live demo: https://college-management-xi.vercel.app

## Tech stack

- Client: React 19 + Vite (TypeScript), Tailwind CSS, lucide-react
- Server: Node.js + Express, SQLite, JWT auth, helmet, rate limiting
- Docker Compose for local full-stack runs

## Getting started

Client:

```bash
cd client
npm install
npm run dev
```

Server:

```bash
cd server
npm install
npm run seed   # seed the database
npm run dev
```

Or start both with Docker:

```bash
docker compose up --build
```

## Structure

```
client/    React admin dashboard
server/    Express API and SQLite database
Dockerfile, docker-compose.yml
```

## Author

Rehan Tanwar
