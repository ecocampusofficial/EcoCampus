// auth/login.js

// ✅ use shared supabase client
const supabase = window.sb;

// DOM elements
let loginForm;
let loginButton;
let authMessage;

// 🔔 show message
function showMessage(message, isError = true) {
    if (!authMessage) return;

    authMessage.textContent = message;
    authMessage.className = isError
        ? 'text-red-500 text-sm text-center mb-4 h-5'
        : 'text-green-500 text-sm text-center mb-4 h-5';
}

// ⏳ loading state
function setLoading(button, isLoading) {
    if (!button) return;

    const btnText = button.querySelector('.btn-text');
    const loader = button.querySelector('i');

    if (isLoading) {
        button.disabled = true;
        if (btnText) btnText.classList.add('hidden');
        if (loader) loader.classList.remove('hidden');
    } else {
        button.disabled = false;
        if (btnText) btnText.classList.remove('hidden');
        if (loader) loader.classList.add('hidden');
    }
}

// 🔐 LOGIN FUNCTION
async function handleLogin(event) {
    event.preventDefault();

    setLoading(loginButton, true);
    showMessage('', false);

    const studentId = document.getElementById('login-studentid').value;
    const password = document.getElementById('login-password').value;

    try {
        // 🔥 call edge function
        const { data, error } = await supabase.functions.invoke(
            'login-with-studentid',
            {
                body: { studentId, password }
            }
        );

        if (error) {
            console.error("Function error:", error);
            showMessage("Server error. Try again.");
            return;
        }

        if (data.error) {
            showMessage(data.error);
            return;
        }

        if (data.session) {
            // ✅ set session
            const { error: sessionError } = await supabase.auth.setSession(data.session);

            if (sessionError) {
                console.error("Session error:", sessionError);
                showMessage("Login failed. Try again.");
                return;
            }

            // ✅ redirect (GitHub Pages safe)
            window.location.href = "/EcoCampus/";
        } else {
            showMessage("Unexpected error occurred.");
        }

    } catch (err) {
        console.error(err);
        showMessage("Something went wrong.");
    }

    setLoading(loginButton, false);
}

// 🔁 check if already logged in
async function checkUserSession() {
    const { data } = await supabase.auth.getSession();

    if (data.session) {
        window.location.href = "/EcoCampus/";
    }
}

// 🚀 INIT
document.addEventListener('DOMContentLoaded', () => {
    loginForm = document.getElementById('login-form');
    loginButton = document.getElementById('login-button');
    authMessage = document.getElementById('auth-message');

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    checkUserSession();
});
