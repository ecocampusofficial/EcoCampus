// main.js

const supabase = window.supabaseClient;

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

// 🔐 Login redirect
function goLogin() {
    window.location.href = "/auth/login.html?redirect=/";
}

// 🚪 Logout
async function logout() {
    await supabase.auth.signOut();
    location.reload();
}

// 📦 Open apps
function openApp(path) {
    if (!currentSession) {
        window.location.href = "/auth/login.html?redirect=" + path;
        return;
    }

    window.location.href = path;
}

// run
checkAuth();
