# ⚙️ Operations Checklist App

A mobile-first checklist system for warehouse and operations teams. Built with React + Firebase.

---

## 🗂️ Project Structure

```
ops-checklist/
├── public/
│   └── index.html
├── src/
│   ├── contexts/
│   │   └── AuthContext.js        # Role + admin session management
│   ├── pages/
│   │   ├── RoleSelect.js         # Landing page — choose your role
│   │   ├── NameEntry.js          # Step 1: enter your name
│   │   ├── ChecklistPage.js      # Step 2: complete the checklist
│   │   └── AdminDashboard.js     # Protected admin analytics view
│   ├── utils/
│   │   ├── firestoreService.js   # All Firestore reads/writes
│   │   └── exportUtils.js        # Excel + CSV export logic
│   ├── seedData.js               # Role passwords + all checklist items
│   ├── firebase.js               # Firebase initialization
│   ├── App.js                    # Router
│   └── index.js                  # Entry point
├── .github/workflows/deploy.yml  # Auto-deploy on push to main
├── firebase.json                 # Firebase Hosting config
├── firestore.rules               # Firestore security rules
├── firestore.indexes.json        # Composite indexes
├── .env.example                  # Env var template
└── README.md
```

---

## 🚀 Setup Guide (Step by Step)

### Step 1 — Firebase Project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Add project"** → name it (e.g. `ops-checklist`) → Continue
3. Disable Google Analytics (optional) → **Create project**

#### Enable Firestore
4. Left sidebar → **Build → Firestore Database**
5. Click **"Create database"**
6. Choose **"Start in production mode"** → Select region (e.g. `europe-west1`) → Enable

#### Get your Firebase config
7. Left sidebar → **Project Settings** (gear icon)
8. Scroll to **"Your apps"** → Click **"</>"** (Web app)
9. Register app name → Copy the `firebaseConfig` object values

---

### Step 2 — Local Development

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/ops-checklist.git
cd ops-checklist

# 2. Install dependencies
npm install

# 3. Create your .env file
cp .env.example .env
# Edit .env and paste your Firebase credentials

# 4. Start the dev server
npm start
# App opens at http://localhost:3000
```

---

### Step 3 — Seed the Database

After the app loads:

1. Click **"🔐 Admin Dashboard"** on the landing screen
2. Enter admin password: `admin@ops2024`
3. Go to the **⚙️ Setup** tab
4. Click **"🌱 Seed Firestore Database"**

This will:
- Create all 14 roles in the `roles` collection
- Load all checklist items (from your Excel file) into `checklist_items`

> ✅ You only need to do this **once**. After seeding, items are served from Firestore (with local fallback if offline).

---

### Step 4 — Deploy to Firebase Hosting

#### Install Firebase CLI
```bash
npm install -g firebase-tools
firebase login
```

#### Initialize hosting
```bash
firebase init hosting
# Choose your project
# Public directory: build
# Single-page app: Yes
# Auto builds: No
```

#### Build and deploy
```bash
npm run build
firebase deploy --only hosting
```

Your app will be live at: `https://YOUR_PROJECT_ID.web.app`

---

### Step 5 — Deploy Firestore Rules & Indexes

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

---

## 🔄 GitHub CI/CD (Auto-Deploy)

Every push to `main` automatically builds and deploys.

### Setup GitHub Secrets

In your GitHub repo → **Settings → Secrets and variables → Actions**, add:

| Secret Name | Value |
|---|---|
| `FIREBASE_API_KEY` | Your Firebase API key |
| `FIREBASE_AUTH_DOMAIN` | `your-project.firebaseapp.com` |
| `FIREBASE_PROJECT_ID` | `your-project-id` |
| `FIREBASE_STORAGE_BUCKET` | `your-project.appspot.com` |
| `FIREBASE_MESSAGING_SENDER_ID` | Your sender ID |
| `FIREBASE_APP_ID` | Your app ID |
| `FIREBASE_SERVICE_ACCOUNT` | JSON from Firebase service account |

#### Get the service account JSON:
1. Firebase Console → Project Settings → **Service accounts**
2. Click **"Generate new private key"** → Download JSON
3. Paste the **entire JSON content** as the `FIREBASE_SERVICE_ACCOUNT` secret

---

## 👤 Role Passwords

| Role | Password |
|---|---|
| Chiller | `chiller2024` |
| Freezer | `freezer2024` |
| Dry | `dry2024` |
| Veg | `veg2024` |
| Receiving | `receiving2024` |
| Dispatch | `dispatch2024` |
| Batteries | `batteries2024` |
| Assets Lead | `assets2024` |
| Night Shift Lead | `nightshift2024` |
| Put Away Supervisor | `putaway2024` |
| Receiving Supervisor | `recsup2024` |
| Packing Lead | `packing2024` |
| Logistics Lead | `logistics2024` |
| Warehouse Lead | `warehouse2024` |
| **Admin** | `admin@ops2024` |

> ⚠️ **Change all passwords** before production use. Edit `src/seedData.js`.

---

## 🗃️ Firestore Data Structure

```
firestore/
├── roles/
│   └── {role_id}
│       ├── name: "Chiller"
│       ├── color: "#3b82f6"
│       └── active: true
│
├── checklist_items/
│   └── {role_id}_{index}
│       ├── role_id: "chiller"
│       ├── task: "Temperature check completed and recorded 7:00 AM"
│       ├── order: 11
│       └── active: true
│
├── submissions/
│   └── {auto_id}
│       ├── role_id: "chiller"
│       ├── role_name: "Chiller"
│       ├── user_name: "John Kamau"
│       ├── timestamp: Timestamp
│       ├── date: "2024-01-15"
│       ├── time: "07:32:10"
│       ├── completion_rate: 92
│       ├── total_items: 24
│       ├── done_count: 22
│       └── responses: [
│           { item_id, task, status: "done"|"not_done", comment }
│           ...
│         ]
│
└── audit_log/
    └── {auto_id}
        ├── action: "checklist_submitted"
        ├── submission_id: "..."
        ├── role_id: "chiller"
        ├── user_name: "John Kamau"
        ├── timestamp: Timestamp
        └── completion_rate: 92
```

---

## ✨ Features Summary

| Feature | Status |
|---|---|
| 14 role-based logins with passwords | ✅ |
| Dynamic checklists from Firestore | ✅ |
| Done / Not Done per item | ✅ |
| Required comment (max 30 words) for Not Done | ✅ |
| Progress bar during checklist | ✅ |
| Auto-save draft (localStorage) | ✅ |
| Submission with timestamp to Firestore | ✅ |
| Admin dashboard with completion rates | ✅ |
| 3-month trend + 3-month forecast charts | ✅ |
| Export to Excel (.xlsx) with summary tab | ✅ |
| Export to CSV | ✅ |
| Audit log | ✅ |
| Offline capability (IndexedDB persistence) | ✅ |
| Mobile-first UI with large tap targets | ✅ |
| GitHub Actions CI/CD pipeline | ✅ |
| Firebase Hosting | ✅ |

---

## 🛠️ Customization

### Change passwords
Edit `src/seedData.js` → `ROLES` array → `password` field for each role.

### Add a new role
1. Add to `ROLES` array in `src/seedData.js`
2. Add checklist items to `CHECKLIST_ITEMS` object
3. Re-seed the database from Admin → Setup tab

### Add/edit checklist items
**Option A (quick):** Edit `CHECKLIST_ITEMS` in `src/seedData.js`, re-seed.  
**Option B (live):** Edit documents directly in the Firebase Console → Firestore.

### Change admin password
Edit `ADMIN_PASSWORD` constant in `src/seedData.js`.

---

## 📱 PWA / Add to Home Screen

The app works as a Progressive Web App on mobile:
- iOS: Safari → Share → "Add to Home Screen"
- Android: Chrome → Menu → "Add to Home Screen"

---

## 🔒 Security Notes

- Role passwords are stored in `seedData.js` (client-side). This is appropriate for internal ops tools where the goal is accountability, not high security.
- For higher security, migrate passwords to Firestore and use Firebase Auth with custom claims.
- Firestore rules prevent reading submissions without server-side auth — data is write-only from the app.
- Admin dashboard reads are not protected at the Firestore level in this version — protect the admin password carefully.
