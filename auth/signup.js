// auth/signup.js

// ✅ use shared Supabase client
const sb = window.sb;

// DOM elements
let signupForm;
let signupButton;
let authMessage;

// 🔔 Show message
function showMessage(message, isError = true) {
    if (!authMessage) return;

    authMessage.textContent = message;
    authMessage.className = isError
        ? "text-red-500 text-sm text-center mb-4 h-5"
        : "text-green-500 text-sm text-center mb-4 h-5";
}

// ⏳ Button loading state
function setLoading(button, isLoading) {
    if (!button) return;

    const btnText = button.querySelector(".btn-text");
    const loader = button.querySelector("span:last-child");

    if (isLoading) {
        button.disabled = true;
        if (btnText) btnText.classList.add("hidden");
        if (loader) loader.classList.remove("hidden");
    } else {
        button.disabled = false;
        if (btnText) btnText.classList.remove("hidden");
        if (loader) loader.classList.add("hidden");
    }
}

// 🔐 HANDLE SIGNUP
async function handleSignup(event) {
    event.preventDefault();

    const collegeName = document.getElementById("signup-college").value.trim();
    const fullName = document.getElementById("signup-fullname").value.trim();
    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value;
    const studentId = document.getElementById("signup-studentid").value.trim();
    const course = document.getElementById("signup-course").value.trim();
    const mobile = document.getElementById("signup-mobile").value.trim();
    const gender = document.getElementById("signup-gender").value;

    if (!collegeName || !fullName || !email || !password || !studentId || !course || !mobile || !gender) {
        showMessage("Please fill all the fields.");
        return;
    }

    setLoading(signupButton, true);
    showMessage("", false);

    try {
        // 🔥 1. Sign up the user in Supabase Auth
        const { data: authData, error: authError } = await sb.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: fullName,
                    college_name: collegeName,
                    student_id: studentId,
                    course: course,
                    mobile: mobile,
                    gender: gender
                }
            }
        });

        if (authError) {
            console.error("Signup error:", authError);
            showMessage(authError.message || "Failed to create account.");
            return;
        }

        const user = authData?.user;
        
        if (user) {
            // ✅ Since we use Email Confirmation and a DB Trigger,
            // we just show a success message here.
            showMessage("Account created! Please check your email to confirm your account.", false);
            
            // Clear the form
            signupForm.reset();
        } else {
             showMessage("Something went wrong during signup.");
        }

    } catch (err) {
        console.error("Signup process error:", err);
        showMessage("An unexpected error occurred.");
    } finally {
        setLoading(signupButton, false);
    }
}

// 🔁 Check existing session
async function checkUserSession() {
    try {
        const { data } = await sb.auth.getSession();

        if (data?.session) {
            // already logged in → skip signup page
            window.location.href = "/EcoCampus/";
        }
    } catch (err) {
        console.error("Session check error:", err);
    }
}

// 🚀 INIT
document.addEventListener("DOMContentLoaded", () => {
    signupForm = document.getElementById("signup-form");
    signupButton = document.getElementById("signup-button");
    authMessage = document.getElementById("auth-message");

    if (!signupForm) {
        console.error("Signup form not found!");
        return;
    }

    signupForm.addEventListener("submit", handleSignup);

    // check if already logged in
    checkUserSession();
});
