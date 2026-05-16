# Team Management System

A full-stack, production-ready project management application designed to help teams collaborate, track tasks, and manage project workflows efficiently.

## 🚀 Features

- **Authentication & Authorization**: Secure login/registration with JWT and bcrypt password hashing. Role-based access control (Admin vs. Member).
- **Dashboard**: A comprehensive bird's-eye view of your workload across all projects, highlighting overdue tasks and personal assignments.
- **Projects Management**: Create, customize (with color codes), archive, and restore projects.
- **Team Collaboration**: Invite members to projects via email, manage roles, and track workload statistics.
- **Task Tracking**: Create detailed tasks with titles, descriptions, priorities, statuses (To Do, In Progress, Done), assignees, and due dates.
- **Task Comments**: Communicate directly on tasks with timestamped comments.
- **Activity Logging**: An automated audit trail of all project activities (task creation, role changes, member additions, etc.).
- **Unified Deployment**: The backend serves both the API and the compiled React frontend from a single Express server.

## 💻 Tech Stack

**Frontend:**
- React 19
- React Router DOM
- Vite
- Vanilla CSS (Custom styled components and themes)

**Backend:**
- Node.js & Express 5
- TypeScript
- Prisma ORM
- MongoDB Atlas
- Zod (Request validation)
- JSON Web Tokens (JWT)

## 🛠️ Getting Started

### Prerequisites
- Node.js (v20+ recommended)
- A MongoDB Atlas cluster (or local MongoDB instance)

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/Gourav910/Team-management-system.git
cd Team-management-system

# Install client dependencies
cd client
npm install

# Install server dependencies
cd ../server
npm install
```

### 2. Environment Variables

Create a `.env` file in the `server` directory and add the following:

```env
# MongoDB Connection String
DATABASE_URL=mongodb://<username>:<password>@<cluster-url>/<db-name>?ssl=true&replicaSet=atlas-...&authSource=admin

# JWT Secret Key (Generate a random string)
JWT_SECRET=your_super_secret_jwt_key_here

PORT=4000
NODE_ENV=development
```

### 3. Database Setup

Push the Prisma schema to your MongoDB database to create the necessary collections and indexes:

```bash
cd server
npm run db:push
```

### 4. Running Locally

You can run the full application (frontend served by the backend) with the following commands:

```bash
# From the server directory:
# 1. Build the frontend and backend
npm run build:full

# 2. Start the server (runs on http://localhost:4000)
npm run dev
```

Alternatively, for active frontend development with Hot Module Replacement (HMR):

```bash
# Terminal 1: Start the backend API
cd server
npm run dev

# Terminal 2: Start the Vite dev server
cd client
npm run dev
```

## 📁 Project Structure

```text
Team-management-system/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── auth/           # Authentication context
│   │   ├── pages/          # React components for each route
│   │   ├── api.ts          # Centralized API fetch wrapper
│   │   └── styles.css      # Global application styles
│   └── vite.config.ts      # Vite configuration (builds to server/public)
│
└── server/                 # Express Backend
    ├── prisma/             # Prisma schema and configuration
    ├── src/
    │   ├── lib/            # Utilities (jwt, http responses, activity logger)
    │   ├── middleware/     # Express middleware (requireAuth)
    │   ├── routes/         # API endpoints (auth, projects, tasks, comments, me)
    │   ├── schemas/        # Zod validation schemas
    │   └── index.ts        # Express app entry point
    └── .env                # Environment variables
```

## 📄 License

This project is open-source and available under the MIT License.
