# Drum homework (drumhof.com/huiswerk)

- Student page: `https://drumhof.com/huiswerk/?s=<name>` (e.g. `?s=casper`)
- Teacher page: `https://drumhof.com/huiswerk/leraar.html` (sign in with Google, add/edit/delete homework, add students, copy links)
- Data: Firebase Firestore (`students/<name>` and `students/<name>/homework/<date>`). Homework is live as soon as you press Add.
- Boekhouding (teacher only): `private/<name>` {price, duration, opening} and `private/<name>/lessen/<id>` {date, duration, price, paid, method, note, hw}. Saldo = opening + paid − lesson prices (+ = credit, − = owes). Logged from the "+ Huiswerk" form or with "+ Les" / "+ Betaling"; CSV export on the overview. Needs the `match /private/{document=**}` rule the teacher page shows.
- Practice ticks: `progress/<name>` {days, tempos, updated}, written by the student page (no account; the link is the key, only for students that exist in `students/`). Kept on the phone too; offline changes are merged in on the next visit. The teacher page shows the last 14 days, streak and days/7 per student. Needs the `match /progress/{student}` rule the teacher page shows.
- Until Firebase is connected (`firebase-config.js` is `null`), student pages read the old files at bengladine.github.io/drumhomework.
- Old links (`bengladine.github.io/drumhomework/?s=…`) redirect here and take the student's ticks/streak along.
- Grooves play in the Drumsheet embed on drumsheet.app (`PLAYER` in `index.html`).

## One-time Firebase setup (Ben, ~10 min)
1. console.firebase.google.com → **Add project** (e.g. `drumhof`), Analytics off.  Use your own (Drumhof) Google account; Drumsheet gets its own project under its own account.
2. **Build → Firestore Database → Create database** → location `eur3 (europe-west)` → production mode.
3. **Build → Authentication → Get started → Google** → enable → save.
4. **Authentication → Settings → Authorized domains** → add `drumhof.com`.
5. **Project settings (gear) → Your apps → Web `</>`** → register app → copy the `firebaseConfig` block → send it to Claude (it goes into `firebase-config.js`; it's public by design).
6. Open the teacher page, sign in. It shows the database rules with your email filled in → **Firestore → Rules** → paste → **Publish** → reload.
7. Press **Bestaande leerlingen importeren** once. After that the old GitHub JSON files and the nightly Drive sync are no longer used.
