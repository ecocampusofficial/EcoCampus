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
        if(iconSpan) iconSpan.setAttribute('data-lucide', theme === 'dark' ? 'sun' : 'moon');
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

// View Switcher Logic
function switchView(viewId, navElement) {
    // Hide all views
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    // Show target view
    document.getElementById(`${viewId}-view`).classList.add('active');
    
    // Update active state on nav items
    document.querySelectorAll('.nav-menu .nav-item').forEach(el => el.classList.remove('active'));
    if(navElement) navElement.classList.add('active');

    // On mobile, close sidebar after clicking
    if(window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebar-overlay').classList.remove('open');
    }
}

// Notification Panel Logic
const notifBtn = document.getElementById('notif-btn');
const notifPanel = document.getElementById('notif-panel');

if(notifBtn && notifPanel) {
    notifBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent document click from immediately closing it
        notifPanel.classList.toggle('show');
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
        if (!notifPanel.contains(e.target) && !notifBtn.contains(e.target)) {
            notifPanel.classList.remove('show');
        }
    });
}

// Mobile Sidebar Drawer Logic
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');

if(mobileMenuBtn && sidebar && sidebarOverlay) {
    mobileMenuBtn.addEventListener('click', () => {
        sidebar.classList.add('open');
        sidebarOverlay.classList.add('open');
    });

    sidebarOverlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('open');
    });
}

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
        
        document.querySelector('.notification-wrapper').style.display = 'block';

        fetchUserProfile(session.user.id, session.user.email);
    }
}

async function fetchUserProfile(authUserId, fallbackEmail) {
    try {
        const { data: userProfile, error } = await sb
            .from('users')
            .select('full_name, profile_img_url, role, course, student_id, email') 
            .eq('auth_user_id', authUserId)
            .single();

        if (error) throw error; 

        if (userProfile) {
            const name = userProfile.full_name || fallbackEmail;
            const role = userProfile.role || 'Student';
            
            // 1. Update Sidebar
            document.getElementById('user-name').innerText = name;
            document.getElementById('user-role').innerText = role;
            
            if (userProfile.profile_img_url) {
                document.getElementById('profile-img').src = userProfile.profile_img_url;
                // Update Full Profile Image too
                document.getElementById('full-profile-img').src = userProfile.profile_img_url;
            }
            
            const metaInfo = [];
            if(userProfile.course) metaInfo.push(userProfile.course);
            if(userProfile.student_id) metaInfo.push(userProfile.student_id);
            document.getElementById('user-meta').innerText = metaInfo.join(' • ');

            // 2. Update Full Profile View
            document.getElementById('full-profile-name').innerText = name;
            document.getElementById('full-profile-role').innerText = role;
            document.getElementById('full-profile-email').innerText = userProfile.email || fallbackEmail;
            document.getElementById('full-profile-course').innerText = userProfile.course || 'Not Assigned';
            document.getElementById('full-profile-id').innerText = userProfile.student_id || 'Not Assigned';
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

// Initial Calls
document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    renderIcons();
    checkAuth();
});
