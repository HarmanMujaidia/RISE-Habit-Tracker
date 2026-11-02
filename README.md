# Rise

A calm personal growth tracker for daily habits, daily plans and dreams, with charts, streaks and badges that show how much of your goals you have achieved.

## Features

- **Habits**: add habits, tick them off daily, and watch streaks and completion rates grow
- **Daily plans**: plan your day with times and priorities
- **Dreams & goals**: write your dreams, split them into milestones and track progress
- **Analytics**: weekly, monthly and yearly charts, a consistency heatmap and badges
- **Light and dark mode**, responsive on phone, tablet and desktop

Everything starts from zero for a new user. Progress is calculated only from what you add and complete.

## Accounts and cloud sync (optional)

Without any setup, Rise saves progress in the browser on one device. To add sign-in (Google or email) and sync across devices, connect a free Supabase project:

1. Create a project at supabase.com.
2. Open **SQL Editor** and run `supabase/schema.sql`.
3. Under **Authentication > Providers**, enable **Email** and **Google**.
4. Under **Authentication > URL Configuration**, set the **Site URL** to your live address and add it (and `http://localhost:3000`) to **Redirect URLs**.
5. Copy the project URL and anon key from **Project Settings > API** into `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (see `.env.example`). On Vercel, add them under **Project Settings > Environment Variables** and redeploy.

Never put the `service_role` key in this project.

## Install on a phone

Open the live site in Chrome (Android) or Safari (iPhone) and choose **Add to Home screen**.

## Development

You need Node.js and npm.

```sh
git clone <this-repository-url>
cd <repository-name>
npm install
npm run dev
```

## Build

```sh
npm run build
```
