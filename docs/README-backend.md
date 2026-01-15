# 💈 HEADZ UP - Backend Architecture & Learning Lab

This document tracks the evolution of the HEADZ UP booking system from a static site to a professional Full-Stack application.

## 🎯 The Mission

To transition from third-party booking tools (Booksy) to a self-hosted, secure, and high-performance backend using PostgreSQL.

---

## 🛠 Tech Stack Overview

| Layer         | Technology        | Purpose                                             |
| :------------ | :---------------- | :-------------------------------------------------- |
| **Runtime 1** | Node.js (Express) | High-speed JavaScript server                        |
| **Runtime 2** | Python (FastAPI)  | Logic-heavy & data processing                       |
| **Database**  | PostgreSQL        | Relational storage for client bookings              |
| **API**       | REST              | The communication bridge between Frontend & Backend |

---

## 🏗 System Design

1. **The Request:** Frontend (HTML/JS) sends booking data via `fetch()`.
2. **The Logic:** The Backend (Node/Python) validates the data.
3. **The Storage:** Data is committed to a PostgreSQL table.
4. **The Response:** Backend sends a "Success" signal back to the UI.

---

## 🏁 Phase 1: The Node.js Sprint (In Progress)

- [x] Install Node.js & NPM
- [x] Initialize `package.json`
- [x] Create basic Express server (`app.js`)
- [ ] Implement CORS (Allowing the website to talk to the server)
- [ ] Connect Node.js to PostgreSQL using `pg` or `Prisma`

## 🐍 Phase 2: The Python Sprint

- [ ] Setup Virtual Environment (`venv`)
- [ ] Install FastAPI & Uvicorn
- [ ] Build the same booking endpoint in Python
- [ ] Compare performance and syntax with Node.js

## 🗄 Phase 3: Database Mastery (PostgreSQL)

- [ ] Design the `bookings` table schema
- [ ] Implement SQL Queries (INSERT, SELECT, DELETE)
- [ ] Set up environment variables (`.env`) for security

---

## 🧪 How to run the Backend

1. Open terminal in the project folder.
2. Run `node app.js`.
3. Server lives at `http://localhost:3000`.
