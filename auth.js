/**
 * auth.js — Atomix Tools Google Sign-In Gate
 * Drop this script into any tool page. It will block access until
 * the user authenticates with an @atomixlogistics.com Google account.
 *
 * Usage: Add ONE line to each HTML page (before closing </body>):
 *   <script type="module" src="auth.js"></script>
 *
 * Features:
 *  - Google Sign-In popup, domain-restricted to @atomixlogistics.com
 *  - "Remember me" toggle: localStorage persistence vs session-only
 *  - Signed-in user shown in nav bar with logout button
 *  - Works alongside existing PIN/admin flows
 */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const ALLOWED_DOMAIN = "atomixlogistics.com";

const FIREBASE_CFG = {
  apiKey: "AIzaSyCXWwp346vnAQmarUYocvb7DSTana0jNwA",
  authDomain: "atomix-tools.firebaseapp.com",
  projectId: "atomix-tools",
  storageBucket: "atomix-tools.firebasestorage.app",
  messagingSenderId: "211594945190",
  appId: "1:211594945190:web:bf70681d9335816984ca67"
};

// ── Init Firebase (reuse existing app if already initialized by index.html) ──
const app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CFG);
const auth = getAuth(app);

// ── Inject styles ────────────────────────────────────────────────────────────
const style = document.createElement("style");
style.textContent = `
  #atomix-auth-gate {
    display: none;
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: #080c10;
    align-items: center;
    justify-content: center;
    font-family: 'Outfit', sans-serif;
  }
  #atomix-auth-gate.visible { display: flex; }

  #atomix-auth-gate::before {
    content: '';
    position: absolute;
    inset: 0;
    opacity: .025;
    pointer-events: none;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
    background-size: 128px;
  }

  .auth-blob {
    position: absolute;
    border-radius: 50%;
    filter: blur(100px);
    pointer-events: none;
  }
  .auth-blob-1 {
    width: 600px; height: 500px;
    background: radial-gradient(circle, rgba(62,189,132,0.13), transparent 70%);
    top: -200px; left: -150px;
  }
  .auth-blob-2 {
    width: 500px; height: 500px;
    background: radial-gradient(circle, rgba(74,159,212,0.08), transparent 70%);
    bottom: -150px; right: -100px;
  }

  .auth-card {
    position: relative;
    z-index: 1;
    background: #0d1219;
    border: 1px solid #1a2535;
    border-radius: 22px;
    padding: 44px 40px 40px;
    width: 360px;
    text-align: center;
    box-shadow: 0 40px 100px rgba(0,0,0,.9), 0 0 0 1px rgba(62,189,132,0.08), 0 0 60px rgba(62,189,132,0.07);
  }

  .auth-logo {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 28px;
    text-decoration: none;
  }
  .auth-logo-icon {
    width: 36px; height: 36px;
    background: linear-gradient(135deg, #3EBD84, #2dd4bf);
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-size: 16px; font-weight: 900; color: #080c10;
    box-shadow: 0 0 24px rgba(62,189,132,0.25);
  }
  .auth-logo-text {
    font-size: 18px; font-weight: 800; color: #ddeeff; letter-spacing: -.4px;
  }
  .auth-logo-text em { color: #3EBD84; font-style: normal; }

  .auth-divider {
    width: 40px; height: 2px;
    background: linear-gradient(90deg, #3EBD84, #2dd4bf);
    border-radius: 2px;
    margin: 0 auto 24px;
  }

  .auth-title {
    font-size: 20px; font-weight: 800; color: #ddeeff;
    letter-spacing: -.4px; margin-bottom: 8px;
  }
  .auth-sub {
    font-size: 13px; color: #6a8aaa; line-height: 1.7;
    margin-bottom: 28px;
  }

  .auth-remember {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-bottom: 18px;
    cursor: pointer;
    user-select: none;
  }
  .auth-remember-box {
    width: 18px; height: 18px;
    border: 1.5px solid #1f2e42;
    border-radius: 5px;
    background: #111820;
    display: flex; align-items: center; justify-content: center;
    transition: all .15s;
    flex-shrink: 0;
  }
  .auth-remember-box.checked {
    background: #3EBD84;
    border-color: #3EBD84;
  }
  .auth-remember-box.checked::after {
    content: '✓';
    font-size: 11px;
    font-weight: 800;
    color: #080c10;
  }
  .auth-remember-label {
    font-size: 13px;
    color: #6a8aaa;
    font-weight: 500;
  }

  .auth-google-btn {
    width: 100%;
    padding: 14px 20px;
    border-radius: 12px;
    border: 1.5px solid #1f2e42;
    background: #111820;
    color: #ddeeff;
    font-family: 'Outfit', sans-serif;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    transition: all .2s;
    letter-spacing: -.1px;
  }
  .auth-google-btn:hover {
    border-color: rgba(62,189,132,0.4);
    background: #162030;
    box-shadow: 0 0 28px rgba(62,189,132,0.1);
    transform: translateY(-1px);
  }
  .auth-google-btn:active { transform: scale(.98); }
  .auth-google-btn:disabled {
    opacity: .5;
    cursor: not-allowed;
    transform: none;
  }

  .auth-google-icon {
    width: 20px; height: 20px; flex-shrink: 0;
  }

  .auth-error {
    margin-top: 14px;
    font-size: 12px;
    color: #f87171;
    min-height: 18px;
    font-weight: 500;
  }

  .auth-footer-note {
    margin-top: 22px;
    padding-top: 18px;
    border-top: 1px solid #1a2535;
    font-size: 11px;
    color: #2e4560;
    line-height: 1.6;
  }

  /* Spinner */
  @keyframes atomix-spin { to { transform: rotate(360deg); } }
  .auth-spinner {
    width: 16px; height: 16px;
    border: 2px solid rgba(62,189,132,0.3);
    border-top-color: #3EBD84;
    border-radius: 50%;
    animation: atomix-spin .7s linear infinite;
    flex-shrink: 0;
  }

  /* Nav user pill — injected into existing nav */
  #atomix-user-pill {
    display: none;
    align-items: center;
    gap: 8px;
    background: #0d1219;
    border: 1px solid #1a2535;
    border-radius: 20px;
    padding: 5px 14px 5px 8px;
    font-family: 'Outfit', sans-serif;
  }
  #atomix-user-pill.visible { display: flex; }
  .atomix-user-avatar {
    width: 26px; height: 26px;
    border-radius: 50%;
    background: linear-gradient(135deg, #091f14, #0a2a1a);
    border: 1.5px solid rgba(62,189,132,0.3);
    display: flex; align-items: center; justify-content: center;
    font-size: 10px; font-weight: 800;
    color: #3EBD84;
    overflow: hidden;
  }
  .atomix-user-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .atomix-user-name {
    font-size: 12px; font-weight: 600; color: #ddeeff;
    max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .atomix-logout-btn {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    color: #2e4560;
    font-size: 14px;
    line-height: 1;
    margin-left: 2px;
    transition: color .15s;
    font-family: 'Outfit', sans-serif;
  }
  .atomix-logout-btn:hover { color: #f87171; }

  /* Hide page content until auth resolves */
  body.atomix-auth-pending > *:not(#atomix-auth-gate):not(script):not(style):not(link) {
    visibility: hidden;
  }
`;
document.head.appendChild(style);

// ── Build the gate overlay ───────────────────────────────────────────────────
const gate = document.createElement("div");
gate.id = "atomix-auth-gate";
gate.innerHTML = `
  <div class="auth-blob auth-blob-1"></div>
  <div class="auth-blob auth-blob-2"></div>
  <div class="auth-card">
    <div class="auth-logo">
      <div class="auth-logo-icon">A</div>
      <span class="auth-logo-text">atomix<em>.</em></span>
    </div>
    <div class="auth-divider"></div>
    <div class="auth-title">Sign in to continue</div>
    <p class="auth-sub">Access is restricted to<br><strong style="color:#ddeeff">@atomixlogistics.com</strong> accounts only.</p>

    <label class="auth-remember" id="atomix-remember-label">
      <div class="auth-remember-box checked" id="atomix-remember-box"></div>
      <span class="auth-remember-label">Remember me on this device</span>
    </label>

    <button class="auth-google-btn" id="atomix-signin-btn">
      <svg class="auth-google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
      Sign in with Google
    </button>

    <div class="auth-error" id="atomix-auth-error"></div>

    <div class="auth-footer-note">
      Internal tool — Atomix Logistics only.<br>
      Contact your administrator if you need access.
    </div>
  </div>
`;
document.body.appendChild(gate);

// ── State ────────────────────────────────────────────────────────────────────
let rememberMe = true;
const rememberBox = document.getElementById("atomix-remember-box");
const rememberLabel = document.getElementById("atomix-remember-label");
const signinBtn = document.getElementById("atomix-signin-btn");
const authError = document.getElementById("atomix-auth-error");

rememberLabel.addEventListener("click", () => {
  rememberMe = !rememberMe;
  rememberBox.classList.toggle("checked", rememberMe);
});

// ── Sign-in handler ──────────────────────────────────────────────────────────
signinBtn.addEventListener("click", async () => {
  authError.textContent = "";
  signinBtn.disabled = true;
  signinBtn.innerHTML = `<div class="auth-spinner"></div> Signing in…`;

  try {
    const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
    await setPersistence(auth, persistence);

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    const result = await signInWithPopup(auth, provider);
    const email = result.user.email || "";
    const domain = email.split("@")[1] || "";

    if (domain !== ALLOWED_DOMAIN) {
      await signOut(auth);
      authError.textContent = `Access denied — ${email} is not an authorized account.`;
      signinBtn.disabled = false;
      signinBtn.innerHTML = `<svg class="auth-google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg> Sign in with Google`;
    }
    // onAuthStateChanged will handle showing the page on success
  } catch (err) {
    if (err.code === "auth/popup-closed-by-user") {
      authError.textContent = "Sign-in cancelled.";
    } else if (err.code === "auth/popup-blocked") {
      authError.textContent = "Pop-up blocked — please allow pop-ups for this site.";
    } else {
      authError.textContent = "Sign-in failed. Please try again.";
      console.error("Auth error:", err);
    }
    signinBtn.disabled = false;
    signinBtn.innerHTML = `<svg class="auth-google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg> Sign in with Google`;
  }
});

// ── User pill helpers ─────────────────────────────────────────────────────────
function injectUserPill(user) {
  // Remove existing pill if any
  const existing = document.getElementById("atomix-user-pill");
  if (existing) existing.remove();

  const pill = document.createElement("div");
  pill.id = "atomix-user-pill";
  pill.className = "visible";

  const initials = (user.displayName || user.email || "U")
    .split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const firstName = (user.displayName || user.email || "").split(" ")[0];

  pill.innerHTML = `
    <div class="atomix-user-avatar">
      ${user.photoURL
        ? `<img src="${user.photoURL}" alt="${initials}" referrerpolicy="no-referrer">`
        : initials}
    </div>
    <span class="atomix-user-name">${firstName}</span>
    <button class="atomix-logout-btn" id="atomix-logout-btn" title="Sign out">✕</button>
  `;

  // Insert into nav if present, else body
  const navRight = document.querySelector(".nav-right");
  if (navRight) {
    navRight.insertBefore(pill, navRight.firstChild);
  } else {
    document.body.appendChild(pill);
  }

  document.getElementById("atomix-logout-btn").addEventListener("click", async () => {
    await signOut(auth);
  });
}

// ── Auth state listener ──────────────────────────────────────────────────────
document.body.classList.add("atomix-auth-pending");

onAuthStateChanged(auth, (user) => {
  document.body.classList.remove("atomix-auth-pending");

  if (user) {
    const email = user.email || "";
    const domain = email.split("@")[1] || "";

    if (domain !== ALLOWED_DOMAIN) {
      // Shouldn't normally reach here, but belt-and-suspenders
      signOut(auth);
      gate.classList.add("visible");
      authError.textContent = `Access denied — ${email} is not authorized.`;
      return;
    }

    // Authorized — hide gate, show page
    gate.classList.remove("visible");
    injectUserPill(user);

    // Expose user globally for other scripts
    window.atomixUser = user;
    window.dispatchEvent(new CustomEvent("atomix-auth-ready", { detail: { user } }));

  } else {
    // Not signed in — show gate
    gate.classList.add("visible");
    const existing = document.getElementById("atomix-user-pill");
    if (existing) existing.remove();
    window.atomixUser = null;
  }
});
