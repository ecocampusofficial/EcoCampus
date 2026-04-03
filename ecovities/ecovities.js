// ecovities.js

const sb = window.sb;

// 🔁 Check auth
async function checkAuth() {
    const { data: { session } } = await sb.auth.getSession();

    if (!session) {
        // ❌ Not logged in → redirect
        window.location.href = "/EcoCampus/auth/login.html?redirect=/EcoCampus/ecovities/";
        return;
    }

    document.getElementById("status").innerText = "Welcome! Loading profile...";

    loadProfile(session.user);
}

// 👤 Load EcoVities profile (from its DB)
async function loadProfile(user) {

    // 🔥 IMPORTANT:
    // assuming EcoVities uses SAME project OR connected DB
    const { data, error } = await sb
        .from("users")
        .select("*")
        .eq("email", user.email)
        .single();

    if (error) {
        console.error(error);
        document.getElementById("status").innerText = "Error loading profile";
        return;
    }

    // ✅ Show data
    document.getElementById("name").innerText = data.full_name;
    document.getElementById("email").innerText = data.email;
    document.getElementById("student_id").innerText = data.student_id;
    document.getElementById("points").innerText = data.current_points || 0;

    document.getElementById("user-card").classList.remove("hidden");
    document.getElementById("status").innerText = "";
}

// 🚪 Logout
async function logout() {
    await sb.auth.signOut();
    window.location.href = "/EcoCampus/";
}

// 🚀 Init
checkAuth();
