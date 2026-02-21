# Booking & Visitor Management System 🚀🏢🛂

A modern full-stack solution for seamless booking, visitor management, and internal request handling—leveraging QR code check-ins, real-time dashboards, and robust audit logs. Designed to streamline office operations, enhance security, and automate notifications.

---

## ✨ Features

- **Visitor Management:** QR code check-in for guests, capturing purpose and host.
- **Admin Dashboard:** Secure area for superadmins/admins to manage all operations.
- **Ticket/Request Tracking:** Admins can review, approve, resolve, cancel, and reopen service requests.
- **Audit & Visitor Logs:** Physically separated logs—office visit records and detailed internal system audits.
- **Email Notifications:** Automated emails update users as their requests/tickets progress.

---

## 🛠 Tech Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS, Lucide React
- **Database:** PostgreSQL (Supabase)
- **ORM:** Drizzle ORM
- **Authentication:** NextAuth.js / Auth.js
- **Emails:** Nodemailer (SMTP)
- **Package Manager:** pnpm

---

## ⚡ Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- [pnpm](https://pnpm.io/)
- [PostgreSQL / Supabase](https://supabase.com/) instance

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/YOUR-USERNAME/YOUR-REPO.git
cd YOUR-REPO
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment variables

Create a `.env.local` file using the template below:

```ini
# .env.example

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# PostgreSQL (App)
DATABASE_URL=postgresql://user:password@host:port/database

# (Optional: For migrations)
DIRECT_URL=postgresql://user:password@host:5432/database

NEXT_PUBLIC_APP_URL=http://localhost:3000

# Email SMTP
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_USER=your.email@example.com
EMAIL_PASS=your-email-password

# NextAuth.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret
```

### 4. Database setup

Run migrations or push to your Supabase instance:

```bash
# Generate Drizzle schema and push
pnpm db:push    # Or pnpm db:migrate
```

_Seed sample data (optional):_

```bash
pnpm exec tsx src/scripts/seed.ts
```

### 5. Start the development server

```bash
pnpm dev
```

---

## 📁 Folder Structure

```
src/
├── app/              # Next.js App Router pages & layouts
├── actions/          # Server actions and mutations
├── db/               # Drizzle schema and Postgres connection
├── lib/              # Shared helpers (Supabase, utilities, email)
├── components/       # UI components (Radix/Tailwind/CVA)
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

> Built for modern offices, smart visitor experiences, and robust admin operations.
