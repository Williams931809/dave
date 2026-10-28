# FettyEffect portfolio

The frontend runs on Vercel. The private ChatGPT Sites backend stores administrator credentials, project metadata (D1), and uploaded media (R2).

- Public site: https://fettydigital.vercel.app
- Admin panel: https://fettydigital.vercel.app/admin.html
- Owner-only account setup: https://fetty-portfolio-backend.calmtetra14.chatgpt.site/setup

The owner creates the email/password once on the private setup page. There is no public registration endpoint. Passwords are salted and hashed, sign-in attempts are limited, and admin sessions use secure HttpOnly cookies and expire after eight hours.

Vercel's server-only `PORTFOLIO_BACKEND_URL` and sensitive `PORTFOLIO_BACKEND_TOKEN` connect the gateway to the private backend. Never put the token in client JavaScript. The gateway only exposes the portfolio API, never the private setup page. Uploads use 3 MB requests up to 100 MB per project; media responses stream and support byte ranges for seeking.

Backend source is maintained in its ChatGPT Sites source repository. The old Supabase files are retained for reference but are no longer loaded.
