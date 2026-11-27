// Sends the homework push notifications. Runs every ~15 minutes on GitHub Actions
// (.github/workflows/push.yml). Needs two repository secrets (see huiswerk/PUSH-SETUP.md):
//   FIREBASE_SERVICE_ACCOUNT  the JSON key of a Firebase service account (reads/writes Firestore)
//   VAPID_PRIVATE             private half of the web-push key (public half: huiswerk/push-config.js)
//
// 1. Practice reminder: progress/<code>/devices/<id> with hour H, minute M → once a day from H:M (up to 3 h later),
//    only if that day isn't ticked as practised yet. Remembers lastSent on the device doc.
// 2. New messages since the last run (pushState/main.lastMsgCheck):
//    from a student → teacherDevices/*; from the teacher → that student's devices.
// Dead subscriptions (404/410) are removed.
import fs from "node:fs";
import admin from "firebase-admin";
import webpush from "web-push";

const SITE = "https://drumhof.com/huiswerk/";
const DEFAULT_TZ = "Europe/Brussels";

const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
const vapidPrivate = process.env.VAPID_PRIVATE;
const cfg = fs.readFileSync(new URL("../../huiswerk/push-config.js", import.meta.url), "utf8");
const vapidPublic = (cfg.match(/VAPID_PUBLIC\s*=\s*"([^"]+)"/) || [])[1];
if (!sa || !vapidPrivate || !vapidPublic) {
  console.log("Push not configured yet (missing FIREBASE_SERVICE_ACCOUNT / VAPID_PRIVATE secret). Nothing sent.");
  process.exit(0);
}

admin.initializeApp({ credential: admin.credential.cert(JSON.parse(sa)) });
const db = admin.firestore();
webpush.setVapidDetails("https://drumhof.com", vapidPublic, vapidPrivate);

// Local date (YYYY-MM-DD) and hour in a time zone
function local(tz, d = new Date()) {
  let parts;
  try {
    parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d);
  } catch (e) { return local(DEFAULT_TZ, d); }
  const p = Object.fromEntries(parts.map(x => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hour: +p.hour, mins: +p.hour * 60 + +p.minute };
}
const prevDay = iso => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); };

let sent = 0, removed = 0;
async function send(ref, dev, payload) {
  try {
    await webpush.sendNotification({ endpoint: dev.endpoint, keys: dev.keys }, JSON.stringify(payload), { TTL: 6 * 3600 });
    sent++;
    return true;
  } catch (e) {
    if (e.statusCode === 404 || e.statusCode === 410) { await ref.delete(); removed++; }
    else console.warn("push failed", ref.path, e.statusCode, e.body || e.message);
    return false;
  }
}

const TXT = {
  nl: {
    remTitle: "🥁 Al geoefend vandaag?",
    remBody: streak => streak > 1 ? `Je zit aan ${streak} dagen op rij. Hou je reeks vast!` : "Even 10 minuutjes? Tik hier voor je huiswerk.",
    reply: "💬 Je leraar heeft geantwoord", rec: "🎙️ Opname"
  },
  en: {
    remTitle: "🥁 Practised yet today?",
    remBody: streak => streak > 1 ? `You're on a ${streak}-day streak. Keep it going!` : "Just 10 minutes? Tap here for your homework.",
    reply: "💬 Your teacher replied", rec: "🎙️ Recording"
  }
};

const now = new Date();
const stateRef = db.doc("pushState/main");
const state = (await stateRef.get()).data() || {};
const since = state.lastMsgCheck || new Date(now.getTime() - 20 * 60000).toISOString();
let newest = since;

const teacherDevs = (await db.collection("teacherDevices").get()).docs;
const students = (await db.collection("students").get()).docs;

for (const st of students) {
  const code = st.id;
  const name = st.get("name") || code;
  const t = TXT[st.get("lang") === "en" ? "en" : "nl"];
  const devs = (await db.collection(`progress/${code}/devices`).get()).docs;

  // 1. daily practice reminder
  if (devs.some(d => d.get("hour") >= 0)) {
    const days = new Set(((await db.doc(`progress/${code}`).get()).data() || {}).days || []);
    for (const d of devs) {
      const v = d.data();
      if (!(v.hour >= 0)) continue;
      const l = local(v.tz || DEFAULT_TZ);
      const target = v.hour * 60 + (v.minute || 0);
      if (v.lastSent === l.date || l.mins < target || l.mins > target + 180) continue;
      if (!days.has(l.date)) {
        let streak = 0;
        for (let x = prevDay(l.date); days.has(x); x = prevDay(x)) streak++;
        await send(d.ref, v, { title: t.remTitle, body: t.remBody(streak), url: SITE + "?s=" + code, tag: "practice" });
      }
      await d.ref.update({ lastSent: l.date }).catch(() => {});
    }
  }

  // 2. messages since the last run
  const ms = await db.collection(`progress/${code}/messages`).where("at", ">", since).get();
  for (const m of ms.docs) {
    const v = m.data();
    if (v.at > newest) newest = v.at;
    const body = (v.exTitle ? v.exTitle + ": " : "") + (v.text || (v.clip ? t.rec : ""));
    if (v.from === "student") {
      for (const td of teacherDevs) await send(td.ref, td.data(), { title: "💬 " + name, body, url: SITE + "leraar.html", tag: "msg-" + code });
    } else {
      for (const d of devs) await send(d.ref, d.data(), { title: t.reply, body, url: SITE + "?s=" + code, tag: "reply" });
    }
  }
}

await stateRef.set({ lastMsgCheck: newest, lastRun: now.toISOString() }, { merge: true });
console.log(`Done: ${sent} sent, ${removed} dead subscriptions removed.`);
