// main.js

// ❗ DO NOT create client here
// ONLY use existing one

const sb = window.sb;  // renamed to avoid conflicts

let currentSession = null;

async function checkAuth() {
    const { data: { session } } = await sb.auth.getSession();

    currentSession = session;

    if (!session) {
        document.getElementById("status").innerText = "You are not logged in";

        document.getElementById("auth-actions").innerHTML = `
            <button onclick="goLogin()">Login</button>
        `;
    } else {
        document.getElementById("status").innerText = "Welcome " + session.user.email;

        document.getElementById("auth-actions").innerHTML = `
            <button onclick="logout()">Logout</button>
        `;
    }
}

function goLogin() {
    window.location.href = "/auth/login.html?redirect=/";
}

async function logout() {
    await sb.auth.signOut();
    location.reload();
}

function openApp(path) {
    if (!currentSession) {
        window.location.href = "/auth/login.html?redirect=" + path;
        return;
    }
    window.location.href = path;
}

checkAuth();
