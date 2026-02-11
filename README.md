# TurfAuction Pro

A full-stack MERN (MongoDB, Express, React, Node.js) web application for conducting cricket player auctions among friends.

## Features

### Core Features
- **User Authentication & Roles**: JWT-based authentication with bcrypt password hashing
  - Admin (organizer): Full control over auctions, players, and matches
  - Team Captain: Can bid in auctions and manage their team
  - Viewer: Read-only access to view auctions and matches

- **Player Management**: Add/edit players with detailed profiles including role, base price, stats, batting/bowling styles

- **Team Management**: Create teams, assign captains, track budgets (₹100,000 default), and view squad composition

- **Live Auction System**: Real-time bidding using Socket.IO with countdown timer, bid history, and automatic player assignment

- **Match Scheduler**: Create and manage matches with date, time, and location

- **Live Scoreboard**: Real-time scoring system with batsman/bowler stats, run rates, and fall of wickets

- **Dashboard**: Role-based dashboards with statistics and quick actions

## Tech Stack

### Backend
- Node.js + Express.js
- MongoDB + Mongoose
- Socket.IO for real-time features
- JWT for authentication
- bcrypt for password hashing
- express-validator for input validation

### Frontend
- React 19 + Vite
- React Router for navigation
- Tailwind CSS for styling
- Framer Motion for animations
- Socket.IO client for real-time updates
- Chart.js for analytics
- Axios for API calls

## Project Structure

```
/backend
  /config         # Database configuration
  /controllers    # Route controllers
  /middleware     # Auth and error handling middleware
  /models         # Mongoose models
  /routes         # Express routes
  /seeds          # Database seed data
  /sockets        # Socket.IO handlers
  server.js       # Entry point

/frontend
  /src
    /components   # Reusable UI components
    /context      # React Context (Auth, Socket)
    /hooks        # Custom React hooks
    /pages        # Route pages
    /services     # API service layer
    /utils        # Utility functions
```

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- MongoDB (local or Atlas)

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the backend directory:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRE=7d
```

4. Seed the database with sample data:
```bash
npm run seed
```

5. Start the development server:
```bash
npm run dev
```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the frontend directory:
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

4. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

## Demo Credentials

After seeding the database, you can use these credentials:

| Role    | Email                        | Password    |
|---------|------------------------------|-------------|
| Admin   | admin@turauction.com         | admin123    |
| Captain | captain1@turauction.com      | captain123  |
| Captain | captain2@turauction.com      | captain123  |
| Captain | captain3@turauction.com      | captain123  |
| Captain | captain4@turauction.com      | captain123  |
| Viewer  | viewer@turauction.com        | viewer123   |

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Teams
- `GET /api/teams` - Get all teams
- `GET /api/teams/:id` - Get team by ID
- `POST /api/teams` - Create team (Admin only)
- `PUT /api/teams/:id` - Update team (Admin only)
- `DELETE /api/teams/:id` - Delete team (Admin only)

### Players
- `GET /api/players` - Get all players
- `POST /api/players` - Create player (Admin only)
- `PUT /api/players/:id` - Update player (Admin only)
- `DELETE /api/players/:id` - Delete player (Admin only)

### Auctions
- `GET /api/auctions/current` - Get current active auction
- `POST /api/auctions/start` - Start auction (Admin only)
- `POST /api/auctions/:id/bid` - Place bid (Captain only)
- `POST /api/auctions/:id/end` - End auction (Admin only)
- `POST /api/auctions/reset` - Reset all auctions (Admin only)

### Matches
- `GET /api/matches` - Get all matches
- `POST /api/matches` - Create match (Admin only)
- `GET /api/matches/:id` - Get match by ID
- `PATCH /api/matches/:id/score` - Update score (Admin only)

## Deployment

### Backend (Render)
1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set environment variables in Render dashboard
4. Build Command: `npm install`
5. Start Command: `npm start`

### Frontend (Vercel)
1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Set environment variables in Vercel dashboard

### MongoDB Atlas
1. Create a cluster on MongoDB Atlas
2. Whitelist your IP address
3. Create a database user
4. Get the connection string and add to environment variables

## License

MIT License
