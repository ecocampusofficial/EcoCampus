// main.js

const sb = window.sb; 

let currentSession = null;

// Theme Initialization
const themeToggleBtn = document.getElementById('theme-toggle');
const themeText = document.getElementById('theme-text');
const themeIcon = themeToggleBtn.querySelector('i');

function initTheme() {
    const savedTheme = localStorage.getItem('ecoCampusTheme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeUI(savedTheme);
}

function updateThemeUI(theme) {
    if (theme === 'dark') {
        themeText.innerText = 'Light Mode';
        themeIcon.className = 'fa-solid fa-sun';
    } else {
        themeText.innerText = 'Dark Mode';
        themeIcon.className = 'fa-solid fa-moon';
    }
}

themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('ecoCampusTheme', newTheme);
    updateThemeUI(newTheme);
});

initTheme();

// Authentication and Profile Loading
async function checkAuth() {
    const { data: { session } } = await sb.auth.getSession();
    currentSession = session;

    const authActions = document.getElementById("auth-actions");
    const logoutBtn = document.getElementById("logout-btn");
    const userNameEl = document.getElementById("user-name");

    if (!session) {
        userNameEl.innerText = "Guest User";
        document.getElementById("user-role").innerText = "Not logged in";
        authActions.innerHTML = `<button onclick="goLogin()">Login</button>`;
        logoutBtn.style.display = "none";
    } else {
        authActions.innerHTML = ""; // Hide top login button
        logoutBtn.style.display = "flex"; // Show sidebar logout
        fetchUserProfile(session.user.id, session.user.email);
    }
}

async function fetchUserProfile(authUserId, fallbackEmail) {
    try {
        // Querying the 'users' table based on auth_user_id
        const { data: userProfile, error } = await sb
            .from('users')
            .select('full_name, profile_img_url, role, tick_type')
            .eq('auth_user_id', authUserId)
            .single();

        if (error) throw error;

        if (userProfile) {
            // Set Name
            document.getElementById('user-name').innerHTML = 
                `${userProfile.full_name || fallbackEmail} 
                 <i class="fa-solid fa-circle-check" style="color: #1da1f2; display: ${userProfile.tick_type ? 'inline-block' : 'none'};" id="verified-tick"></i>`;
            
            // Set Image
            if (userProfile.profile_img_url) {
                document.getElementById('profile-img').src = userProfile.profile_img_url;
            }

            // Set Role
            if (userProfile.role) {
                document.getElementById('user-role').innerText = userProfile.role;
            }

            // Note: EcoPoints likely come from an orders/points table, mocking for now.
            // You can add a second query here later to calculate sum of points.
            document.getElementById('user-points').innerHTML = `<i class="fa-solid fa-leaf"></i> <span>0 EcoPoints</span>`;
        }
    } catch (err) {
        console.error("Error fetching profile:", err.message);
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

checkAuth();
