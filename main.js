const sb = window.sb; 
let currentSession = null;

// ==========================================
// 1. SUPABASE AUTH & PROFILE LOADING
// ==========================================
async function checkAuth() {
    // Check if user is logged in
    const { data: { session } } = await sb.auth.getSession();
    
    // Redirect to login if no active session
    if (!session) {
        window.location.href = "/EcoCampus/auth/login.html";
        return;
    }
    
    currentSession = session;
    
    // If logged in, fetch profile data
    fetchUserProfile(session.user.id, session.user.email);
}

async function fetchUserProfile(authUserId, fallbackEmail) {
    try {
        const { data: userProfile, error } = await sb
            .from('users')
            .select('full_name, profile_img_url, role, course, student_id, mobile, email') 
            .eq('auth_user_id', authUserId)
            .single();

        if (error) throw error; 

        if (userProfile) {
            const name = userProfile.full_name || fallbackEmail;
            
            // Populate Header
            document.getElementById('header-name').innerText = name;
            if (userProfile.profile_img_url) {
                document.getElementById('header-avatar').src = userProfile.profile_img_url;
                document.getElementById('profile-avatar-large').src = userProfile.profile_img_url;
            }

            // Populate Full Profile Tab
            document.getElementById('profile-name').innerText = name;
            document.getElementById('profile-role').innerText = userProfile.role || 'Student';
            document.getElementById('profile-email').innerHTML = `<span class="material-symbols-outlined text-[16px]">mail</span> ${userProfile.email || fallbackEmail}`;
            document.getElementById('profile-id').innerText = userProfile.student_id || 'Not Assigned';
            document.getElementById('profile-course').innerText = userProfile.course || 'Not Assigned';
            document.getElementById('profile-mobile').innerText = userProfile.mobile || 'Not Assigned';
        }
    } catch (err) {
        console.error("Error fetching profile:", err.message);
        document.getElementById('header-name').innerText = fallbackEmail;
        document.getElementById('profile-name').innerText = fallbackEmail;
    }
}

// Logout Function
async function logout() {
    await sb.auth.signOut();
    window.location.href = "/EcoCampus/auth/login.html";
}

// Redirect Function for Cards
function openApp(path) {
    if (!currentSession) {
        window.location.href = "/EcoCampus/auth/login.html?redirect=" + path;
        return;
    }
    window.location.href = path;
}


// ==========================================
// 2. TAB SWITCHING LOGIC (BOTTOM NAV)
// ==========================================
function switchTab(tabName) {
    // Hide all views
    document.querySelectorAll('.tab-content').forEach(el => {
        el.classList.remove('active');
    });
    
    // Reset all nav icons to unselected state
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.remove('bg-[#006e1c]', 'dark:bg-[#4caf50]', 'text-white', 'rounded-2xl', 'px-4');
        el.classList.add('text-slate-500', 'dark:text-slate-400', 'px-4');
        el.querySelector('.material-symbols-outlined').style.fontVariationSettings = "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24";
    });

    // Highlight the clicked nav icon
    const activeNav = document.getElementById('nav-' + tabName);
    if (activeNav) {
        activeNav.classList.remove('text-slate-500', 'dark:text-slate-400');
        activeNav.classList.add('bg-[#006e1c]', 'dark:bg-[#4caf50]', 'text-white', 'rounded-2xl');
        activeNav.querySelector('.material-symbols-outlined').style.fontVariationSettings = "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24";
    }

    // Show the target view
    const targetView = document.getElementById('view-' + tabName);
    if (targetView) {
        targetView.classList.add('active');
        window.scrollTo(0,0); // Scroll to top when switching tabs
    }
}

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    checkAuth();
});
