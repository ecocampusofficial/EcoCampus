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
    const userMetaEl = document.getElementById("user-meta");

    if (!session) {
        if(userNameEl) userNameEl.innerText = "Guest";
        document.getElementById("user-role").innerText = "Not logged in";
        if(userMetaEl) userMetaEl.innerText = "";
        
        authActions.innerHTML = `<button class="login-btn" onclick="goLogin()">Login</button>`;
        authRequiredElements.forEach(el => el.style.display = "none");
    } else {
        authActions.innerHTML = ""; 
        authRequiredElements.forEach(el => el.style.display = "flex"); 
        fetchUserProfile(session.user.id, session.user.email);
    }
}

async function fetchUserProfile(authUserId, fallbackEmail) {
    try {
        // Updated to fetch 'course' and 'student_id' based on the schema
        const { data: userProfile, error } = await sb
            .from('users')
            .select('full_name, profile_img_url, role, course, student_id') 
            .eq('auth_user_id', authUserId)
            .single();

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
            
            // Format Course and Student ID dynamically from DB
            const metaInfo = [];
            if(userProfile.course) metaInfo.push(userProfile.course);
            if(userProfile.student_id) metaInfo.push(userProfile.student_id);
            document.getElementById('user-meta').innerText = metaInfo.join(' • ');
        }
    } catch (err) {
        console.error("Error fetching profile.", err.message);
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
