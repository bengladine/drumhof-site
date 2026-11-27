# Pushmeldingen instellen (eenmalig, ~10 min)

Wat het doet:
- **Leerlingen** kiezen op hun pagina (onder "Ik heb vandaag geoefend") een herinnering: 17:00 t/m 21:00, of "alleen als je leraar antwoordt".
  Ze krijgen "🥁 Al geoefend vandaag?" **alleen op dagen dat ze nog niet aangevinkt hebben**, en een melding als jij antwoordt.
- **Jij** zet op de leraarpagina de 🔕/🔔-knop (rechtsboven) aan en krijgt een melding bij een nieuw bericht of opname.
- iPhone: werkt alleen als de leerling de pagina **op het beginscherm** zet (iOS 16.4+). De pagina legt dat zelf uit.
- Verstuurd door GitHub (gratis), ongeveer elke 15 minuten. Een melding kan dus tot ~15–20 min na een bericht komen.

## 1. Database-regels publiceren
Firebase console → Firestore Database → **Rules** → alles vervangen door het blok onderaan → **Publish**.

## 2. Firebase-sleutel maken (voor GitHub)
1. Firebase console → ⚙️ **Project settings** → tab **Service accounts**.
2. **Generate new private key** → bevestigen → er wordt een `.json`-bestand gedownload.
3. Open dat bestand met Kladblok en kopieer **alles**.

## 3. Twee geheimen in GitHub zetten
GitHub → repo **drumhof-site** → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Name | Secret |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | de volledige inhoud van het `.json`-bestand uit stap 2 |
| `VAPID_PRIVATE` | de code uit `drumhof-site/.push-secrets.txt` (staat alleen op je pc, niet op GitHub) |

Daarna: het `.json`-bestand en `.push-secrets.txt` **verwijderen** (de geheimen staan nu veilig in GitHub).

## 4. Live zetten en testen
1. De code pushen (Claude doet dit met je: branch `push-notifications` → `main`).
2. GitHub → tab **Actions** → "Push notifications" → **Run workflow** → na ±30 s groen = werkt.
3. Op je gsm: `drumhof.com/huiswerk/?s=ben` → herinnering kiezen → toestaan.
4. Op de leraarpagina: 🔕 aanklikken → toestaan → wordt 🔔.
5. Stuur vanop je gsm een vraag bij een oefening → binnen ~15 min een melding op je pc.

Goed om te weten:
- GitHub zet geplande taken stil als er **60 dagen niets** in de repo veranderd is; dan krijg je een mail met een knop om ze weer aan te zetten.
- Een leerling zet het uit met dezelfde keuzelijst ("Herinnering: uit").

## Database-regels (stap 1)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isTeacher() {
      return request.auth != null
        && request.auth.token.email_verified == true
        && request.auth.token.email.lower() == "drumhof.gent@gmail.com";
    }
    // Drum homework: a student opens their own page by link; only the teacher writes
    match /students/{student} {
      allow get: if true;
      allow list, write: if isTeacher();
      match /homework/{id} {
        allow read: if true;
        allow write: if isTeacher();
      }
    }
    // Practice ticks: the student's page saves them by link (no account), only for existing students
    match /progress/{student} {
      allow get: if true;
      allow list, delete: if isTeacher();
      allow create, update: if exists(/databases/$(database)/documents/students/$(student))
        && request.resource.data.keys().hasOnly(["days", "tempos", "opened", "updated"])
        && request.resource.data.days is list && request.resource.data.days.size() <= 3000
        && request.resource.data.tempos is map;
      // Questions/notes from the student page, replies from the teacher
      match /messages/{id} {
        allow read: if true;
        allow create: if exists(/databases/$(database)/documents/students/$(student))
          && request.resource.data.keys().hasOnly(["from", "text", "ex", "exTitle", "at", "clip", "dur"])
          && request.resource.data.text is string && request.resource.data.text.size() <= 1000
          && (request.resource.data.from == "student" || (request.resource.data.from == "teacher" && isTeacher()));
        allow update: if isTeacher()
          || (request.resource.data.diff(resource.data).affectedKeys().hasOnly(["solved"])
              && request.resource.data.solved == true);
        allow delete: if isTeacher();
      }
      // Push notifications: one doc per phone/browser (hour = daily reminder, -1 = only replies)
      match /devices/{id} {
        allow create, update: if exists(/databases/$(database)/documents/students/$(student))
          && request.resource.data.keys().hasOnly(["endpoint", "keys", "hour", "tz", "lang", "updated"])
          && request.resource.data.endpoint is string && request.resource.data.endpoint.size() < 1000
          && request.resource.data.hour is int && request.resource.data.hour >= -1 && request.resource.data.hour <= 23;
        allow delete: if true;
        allow get, list: if isTeacher();
      }
      // Audio recordings (base64, max ~1 minute), linked from a message
      match /clips/{id} {
        allow get: if true;
        allow list, update, delete: if isTeacher();
        allow create: if exists(/databases/$(database)/documents/students/$(student))
          && request.resource.data.keys().hasOnly(["data", "mime", "from", "at"])
          && request.resource.data.data is string && request.resource.data.data.size() <= 950000
          && (request.resource.data.from == "student" || (request.resource.data.from == "teacher" && isTeacher()));
      }
    }
    // Your own devices for notifications about new messages
    match /teacherDevices/{id} {
      allow read, write: if isTeacher();
    }
    // Boekhouding (rates, lessons, payments): only the teacher can read or write
    match /private/{document=**} {
      allow read, write: if isTeacher();
    }
  }
}
```
