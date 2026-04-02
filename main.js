// 🔐 AUTH PROJECT CONFIG
const SUPABASE_URL = "https://YOUR_AUTH_PROJECT.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_ANON_KEY";

const supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

let currentSession = null;

// ✅ Check Auth
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();

    currentSession = session;

    if (!session) {
        document.getElementById("status").innerText = "You are not logged in";

        document.getElementById("auth-actions").innerHTML = `
            <button class="btn login-btn" onclick="goLogin()">Login</button>
        `;
    } else {
        document.getElementById("status").innerText = "Welcome " + session.user.email;

        document.getElementById("auth-actions").innerHTML = `
            <button class="btn logout-btn" onclick="logout()">Logout</button>
        `;
    }
}

// 🔐 Go to login
function goLogin() {
    window.location.href = "/auth/login.html?redirect=/";
}

// 🚪 Logout
async function logout() {
    await supabase.auth.signOut();
    location.reload();
}

// 📦 Open app
function openApp(path) {
    if (!currentSession) {
        window.location.href = "/auth/login.html?redirect=" + path;
        return;
    }

    window.location.href = path;
}

// Run on load
checkAuth();
