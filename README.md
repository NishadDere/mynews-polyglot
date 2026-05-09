# 📰 MyNews — Polyglot Persistence News Platform

A full-stack web application demonstrating a **Polyglot Persistence** database architecture — using **PostgreSQL** and **MongoDB** together within a single Node.js + Express.js backend.

> Built as a DBMS Project at MIT World Peace University, Pune.

---

## 🏗️ Architecture Overview

The core idea: **use the right database for the right data.**

| Data Type | Database | Why |
|-----------|----------|-----|
| User Accounts | PostgreSQL (SQL) | Structured data, needs UNIQUE constraints & integrity |
| News Posts & Votes | MongoDB (NoSQL) | Flexible schema, high-speed atomic `$inc` updates for upvotes |

A single **Node.js + Express.js** API connects to both databases simultaneously and manages all data flow between them.

```
Frontend (HTML/CSS/JS)
        │
        ▼
  Express.js API (Node.js)
    ┌────┴────┐
    ▼         ▼
PostgreSQL  MongoDB
 (Users)    (Posts)
```

---

## ✨ Features

- **User Registration** — stores credentials in PostgreSQL with UNIQUE username constraint
- **User Login** — authenticates against PostgreSQL
- **Submit News Posts** — polyglot logic: validates author in SQL, then writes post to MongoDB
- **Live News Feed** — fetches all posts from MongoDB, sorted by upvotes
- **Upvoting** — atomic `$inc` operation in MongoDB (no row-locking bottleneck)

---

## 🛠️ Tech Stack

**Backend**
- Node.js + Express.js
- PostgreSQL (via `pg` Pool)
- MongoDB (via Mongoose ODM)
- CORS middleware

**Frontend**
- HTML5, CSS3
- Vanilla JavaScript (Fetch API)

**Dev Tools**
- nodemon
- pgAdmin, MongoDB Compass
- dotenv for environment variables

---

## 🚀 Getting Started

### Prerequisites

- Node.js v18+
- PostgreSQL installed and running
- MongoDB installed and running locally

### 1. Clone the repository

```bash
git clone https://github.com/NishadDere/mynews-polyglot.git
cd mynews-polyglot
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the root directory:

```env
DB_USER=postgres
DB_HOST=localhost
DB_NAME=my_news_db
DB_PASSWORD=your_postgres_password
DB_PORT=5432
```

### 4. Set up PostgreSQL database

Open pgAdmin or psql and run:

```sql
CREATE DATABASE my_news_db;

\c my_news_db

CREATE TABLE users (
  user_id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  registered_at TIMESTAMP DEFAULT NOW()
);
```

### 5. Start the server

```bash
npm start
```

Server runs at `http://localhost:3000`

### 6. Open the frontend

Open `index.html` in your browser and follow the 4-step flow:
1. Register a user
2. Login
3. Submit a post
4. View the feed

---

## 📡 API Endpoints

| Method | Endpoint | Database | Description |
|--------|----------|----------|-------------|
| `POST` | `/register` | PostgreSQL | Register a new user |
| `POST` | `/login` | PostgreSQL | Authenticate a user |
| `GET` | `/users` | PostgreSQL | Get all users |
| `POST` | `/posts` | PostgreSQL + MongoDB | Create a post (validates author in SQL, writes to Mongo) |
| `GET` | `/posts` | MongoDB | Get all posts sorted by upvotes |
| `PUT` | `/posts/:id/upvote` | MongoDB | Atomically increment upvote count |

---

## 🔑 Key Technical Decisions

**Why not store everything in PostgreSQL?**
Every upvote would trigger a SQL `UPDATE` with row-level locking — a bottleneck under high traffic. MongoDB's `$inc` operator is atomic and lock-free, making it far better for high-frequency counter updates.

**Why not store everything in MongoDB?**
User accounts need strict constraints (e.g., no duplicate usernames). MongoDB's flexible schema doesn't enforce this as reliably as PostgreSQL's `UNIQUE` constraint.

**Polyglot Logic in `/posts` (POST):**
```js
// First, verify the author exists in PostgreSQL
const userCheck = await pgPool.query('SELECT * FROM users WHERE user_id = $1', [author_id]);
if (userCheck.rows.length === 0) return res.status(404).json({ error: 'User not found' });

// Only then, write the post to MongoDB
const newPost = new Post({ title, content, author_id });
await newPost.save();
```

---

## ⚠️ Known Limitations (Demo Scope)

- Passwords are stored as plain text — production would use **bcrypt** hashing
- No JWT authentication — production would use **JWT tokens** for session management
- No input validation middleware — production would use **express-validator**

---

## 📁 Project Structure

```
mynews-polyglot/
├── index.js          # Express server, API routes, DB connections
├── index.html        # News feed page
├── login.html        # Login page
├── register.html     # Registration page
├── submit.html       # Post submission page
├── package.json
├── .env              # Environment variables (not committed)
└── .gitignore
```

---

## 👨‍💻 Author

**Nishad Dere**
B.Tech ECE (AI-ML) — MIT World Peace University, Pune
[GitHub](https://github.com/NishadDere) · [LinkedIn](https://linkedin.com/in/nishaddere) · nishaddere@gmail.com
