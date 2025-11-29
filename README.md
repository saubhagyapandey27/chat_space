# Aura - Privacy-First Chat

Aura is a secure, end-to-end encrypted chat application designed for privacy and simplicity. It features a beautiful Material Design interface, persistent sessions, and an "Archives" feature for saving important links, notes, and photos.

## Features

*   **End-to-End Encryption**: Messages are encrypted on your device using AES-256-GCM before they ever touch the server. The server (and database) only sees encrypted gibberish.
*   **Zero-Knowledge**: The server does not know your passphrase or your messages.
*   **Archives**: Save and tag important content (Links, Photos, Notes) securely.
*   **Material Design**: A professional, clean interface with Light and Dark modes.
*   **PWA Support**: Installable on mobile and desktop.
*   **Push Notifications**: Get notified of new messages even when the app is closed.

## Tech Stack

*   **Frontend**: Next.js 14, Tailwind CSS, TypeScript
*   **Backend**: Supabase (PostgreSQL + Realtime)
*   **Encryption**: Web Crypto API (Native Browser Standard)

## Deployment Guide (Free Hosting)

You can host Aura for free using **Vercel** (Frontend) and **Supabase** (Backend).

### Step 1: Push to GitHub
1.  Create a new repository on GitHub.
2.  Push this code to your repository.

### Step 2: Set up Supabase (Backend)
1.  Go to [Supabase](https://supabase.com/) and create a new project.
2.  Go to the **SQL Editor** in your Supabase dashboard.
3.  Copy the contents of `supabase_schema.sql` from this project and run it in the SQL Editor. This sets up the database tables and security policies.
4.  Go to **Project Settings > API**. Note down your `Project URL` and `anon public` key.

### Step 3: Deploy to Vercel (Frontend)
1.  Go to [Vercel](https://vercel.com/) and sign up/login.
2.  Click **Add New > Project**.
3.  Import your GitHub repository.
4.  In the **Environment Variables** section, add the following:
    *   `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase Project URL.
    *   `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon public key.
    *   `VAPID_PUBLIC_KEY`: (Optional) For notifications. Run `node generate_keys.js` locally to generate this.
    *   `VAPID_PRIVATE_KEY`: (Optional) For notifications. Run `node generate_keys.js` locally to generate this.
5.  Click **Deploy**.

### Step 4: Finalize
Your app is now live! You can share the URL with your partner.
*   **Privacy Note**: Even though it's hosted on the cloud, your privacy is guaranteed by the **Client-Side Encryption**. Vercel and Supabase cannot read your messages because they don't have your passphrase.

## Local Development

1.  Clone the repo.
2.  Install dependencies: `npm install`
3.  Create `.env.local` with your Supabase and VAPID keys.
4.  Run dev server: `npm run dev`
