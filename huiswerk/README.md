# Drum homework (drumhof.com/huiswerk)

- Student page: `https://drumhof.com/huiswerk/?s=<name>` (e.g. `?s=casper`)
- Teacher page: `https://drumhof.com/huiswerk/leraar.html` (sign in with Google, add/edit/delete homework, add students, copy links)
- Data: Firebase Firestore (`students/<name>` and `students/<name>/homework/<date>`). Homework is live as soon as you press Add.
- Boekhouding (teacher only): `private/<name>` {price, duration, opening} and `private/<name>/lessen/<id>` {date, duration, price, paid, method, note, hw}. Saldo = opening + paid − lesson prices (+ = credit, − = owes). Logged from the "+ Huiswerk" form or with "+ Les" / "+ Betaling"; CSV export on the overview. Needs the `match /private/{document=**}` rule the teacher page shows.
- Practice ticks: `progress/<name>` {days, tempos, opened, updated}, written by the student page (no account; the link is the key, only for students that exist in `students/`). Kept on the phone too; offline changes are merged in on the next visit. The teacher page shows the last 14 days (green = practised, light = only opened), streak, days/7 and a "today" chip per student. "Bekijk" opens the student page read-only (`&leraar=1`): no ticking, nothing saved, not counted as opened. Needs the `match /progress/{student}` rule the teacher page shows.
- Messages: `progress/<name>/messages/<id>` {from: "student"|"teacher", text (≤1000), ex, exTitle, at}. Students ask a question under each exercise; the teacher replies on the card (💬 badge = unread, seen-time in `private/<name>.msgSeen`). Needs the `match /messages/{id}` rule the teacher page shows.
- "Sinds les …" on each card: practiced/opened days after the last lesson (newest homework date, logged lesson or past calendar lesson) and goals reached on the newest homework.
- Google Calendar (primary calendar of the teacher's Google account): week overview, "Volgende les" per student, "📅 Les plannen" (creates "<Name> 🥁", optionally weekly ×4/×8). A lesson = event title with the student's name + "drum"/🥁/"les". Access via "Agenda verbinden" (scope calendar.events, token ~1 h in sessionStorage, no server). Needs the Google Calendar API enabled in Google Cloud project drumhof-a1836.
- Audio recordings: max 60 s, ~48 kbit/s, recorded in the browser (no noise suppression/auto gain, for drums). Stored as base64 in `progress/<name>/clips/<id>` {data, mime, from, at}; the message has {clip, dur} and the clip is only downloaded on ▶. Deleting the message or the student deletes the clip. Free Firestore tier (1 GB) ≈ 3,000+ one-minute clips.
- Messages: a message with `solved: true` closes that conversation round (students may set only that field). In "Bekijk" the teacher can reply inside the student page (Firebase Auth sign-in is shared on drumhof.com).
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
