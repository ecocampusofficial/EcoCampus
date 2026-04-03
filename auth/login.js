const sb = window.sb;

// get redirect param
const params = new URLSearchParams(window.location.search);
const redirectTo = params.get("redirect") || "/";

async function login() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    document.getElementById("status").innerText = "Logging in...";

    const { data, error } = await sb.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        document.getElementById("status").innerText = error.message;
        return;
    }

    // ✅ success → redirect
    window.location.href = redirectTo;
}
