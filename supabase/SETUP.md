# Public portfolio media setup

1. Create a Supabase project.
2. In **SQL Editor**, run [`schema.sql`](schema.sql).
3. In **Authentication > Users**, create the admin account. Copy its user UUID.
4. Add that UUID in SQL Editor:

   ```sql
   insert into public.portfolio_admins (user_id)
   values ('YOUR_AUTH_USER_UUID');
   ```

5. Disable public sign-ups in the Supabase Auth settings. Only UUIDs in `portfolio_admins` can upload or delete media.
6. In **Project Settings > API**, copy the Project URL and publishable key (or legacy anon key) into [`../supabase-config.js`](../supabase-config.js). Do not use a service-role or secret key in browser code.
7. Deploy the site over HTTPS. Sign in at `/admin.html` to publish images and videos. Published work appears in the portfolio for all visitors.

The `portfolio-work` bucket is public-read and limited to 100 MB per file. The database exposes only published portfolio records; storage management is restricted to allowlisted admins.

Existing Google Drive videos also need **Anyone with the link** viewer access for the embedded player to work for visitors. New uploads through the admin panel use the public portfolio bucket instead.
