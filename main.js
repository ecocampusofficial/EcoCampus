const sb = window.sb; 
let currentSession = null;

// Initialize Lucide Icons
function renderIcons() {
    lucide.createIcons();
}

// Theme Initialization
const themeToggles = document.querySelectorAll('.theme-toggle');

function initTheme() {
    const savedTheme = localStorage.getItem('ecoCampusTheme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeUI(savedTheme);
}

function updateThemeUI(theme) {
    themeToggles.forEach(btn => {
        const textSpan = btn.querySelector('.theme-text');
        const iconSpan = btn.querySelector('.theme-icon');
        
        if(textSpan) textSpan.innerText = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
        
        // Update lucide icon attribute and re-render
        if(iconSpan) {
            iconSpan.setAttribute('data-lucide', theme === 'dark' ? 'sun' : 'moon');
        }
    });
    renderIcons();
}

themeToggles.forEach(btn => {
    btn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('ecoCampusTheme', newTheme);
        updateThemeUI(newTheme);
    });
});

// Authentication and Profile Loading
async function checkAuth() {
    const { data: { session } } = await sb.auth.getSession();
    currentSession = session;

    const authActions = document.getElementById("auth-actions");
    const authRequiredElements = document.querySelectorAll(".auth-required");
    const userNameEl = document.getElementById("user-name");

    if (!session) {
        if(userNameEl) userNameEl.innerText = "Guest";
        document.getElementById("user-role").innerText = "Not logged in";
        authActions.innerHTML = `<button class="login-btn" onclick="goLogin()">Login</button>`;
        authRequiredElements.forEach(el => el.style.display = "none");
    } else {
        authActions.innerHTML = ""; 
        authRequiredElements.forEach(el => el.style.display = "flex"); // Shows logout buttons & mobile points pill
        fetchUserProfile(session.user.id, session.user.email);
    }
}

async function fetchUserProfile(authUserId, fallbackEmail) {
    try {
        const { data: userProfile, error } = await sb
            .from('users')
            .select('full_name, profile_img_url, role')
            .eq('auth_user_id', authUserId)
            .single();

        // Check if error is related to infinite recursion RLS policy
        if (error) {
            console.error("Supabase Error:", error.message);
            throw error; 
        }

        if (userProfile) {
            document.getElementById('user-name').innerText = userProfile.full_name || fallbackEmail;
            
            if (userProfile.profile_img_url) {
                document.getElementById('profile-img').src = userProfile.profile_img_url;
            }
            if (userProfile.role) {
                document.getElementById('user-role').innerText = userProfile.role;
            }
            
            // You can replace '0' with actual point fetching logic here later
            // document.getElementById('mobile-user-points').innerText = "150"; 
        }
    } catch (err) {
        console.error("Error fetching profile. (Did you fix your RLS Policy?)", err.message);
        document.getElementById('user-name').innerText = fallbackEmail;
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

// Initial Calls
document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    renderIcons();
    checkAuth();
});
