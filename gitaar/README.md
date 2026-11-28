# Gitaar oefenen (drumhof.com/gitaar)

Ben's own guitar practice page. Not linked from the site, `noindex`.

- Sign in with Google (same account as the teacher page; sign-in is shared on drumhof.com).
- **+ Liedje**: artist, title, tuning, capo, bpm, Ultimate Guitar link, YouTube link, and the whole tab pasted in.
- Headings in the tab (`[Intro]`, `[Riff 1]`, `[Chorus]`…) split it into parts. Missing one? Type a line like `[Riff 2]` above it.
  Same heading twice → "Chorus (2)"; an empty repeated heading shows the first one's text.
- **📌 Oefenen** on a part puts it at the top under "Nu oefenen", with a tempo ladder (metronome + ticks),
  the video from that part's start time (⚙︎ Tempo / start), and **✓ Kan ik** when it's done.
- `?demo`: try it without signing in; everything stays in that browser.

## Data (Firebase, project drumhof-a1836)
- `private/_gitaar` {days: ["2026-11-28", …]}: practice streak.
- `private/_gitaar/songs/<id>` {artist, title, tuning, capo, bpm, ug, video, notes, tab, created, updated,
  sections: {<part-key>: {pin, done, tempos, ticks, start, note}}}. Part key = heading as slug (`riff-1`, `chorus-2`).
- Covered by the existing rule `match /private/{document=**}` (teacher only), so no rule change is needed
  and the full tabs stay private. Renaming a heading in the tab gives that part a new key (pin/ticks start over).
