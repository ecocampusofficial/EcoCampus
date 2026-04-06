import { supabase } from './supabase-client.js'; // EcoVities DB
import { authClient } from './auth-client.js';   // Auth project
import { state } from './state.js';
import { els, toggleSidebar, showPage } from './utils.js';
import { loadDashboardData, renderDashboard, setupFileUploads, loadHistoryData } from './dashboard.js';
import { loadStoreAndProductData, loadUserRewardsData, renderRewards } from './store.js';
import { loadLeaderboardData } from './social.js';
import { loadChallengesData } from './challenges.js';
import { loadEventsData } from './events.js'; 

// ================= AUTH =================

const checkAuth = async () => {
    try {
        // 🔥 USE AUTH PROJECT
        const { data: { session }, error } = await authClient.auth.getSession();

        if (error) {
            console.error('Session Error:', error.message);
            redirectToLogin();
            return;
        }

        if (!session) {
            console.log('No active session.');
            redirectToLogin();
            return;
        }

        // Save auth user
        state.userAuth = session.user;

        await initializeApp();

    } catch (err) {
        console.error('Auth check failed:', err);
        redirectToLogin();
    }
};

// ================= INITIALIZE =================

const initializeApp = async () => {
    try {
        // 🔥 STEP 3: GET USER FROM ECOVITIES DB
        let { data: userProfile, error } = await supabase
            .from('users')
            .select('*')
            .eq('auth_user_id', state.userAuth.id)
            .maybeSingle();

        // 🔥 AUTO CREATE USER IF NOT EXISTS
        if (!userProfile) {
            console.log("User not found → creating in EcoVities DB");

            const { data: newUser, error: insertError } = await supabase
                .from('users')
                .insert({
                    auth_user_id: state.userAuth.id,
                    email: state.userAuth.email,
                    full_name: state.userAuth.user_metadata?.full_name || "Student",
                    student_id: state.userAuth.user_metadata?.student_id || null,
                    current_points: 0,
                    lifetime_points: 0
                })
                .select()
                .single();

            if (insertError) {
                console.error("User insert failed:", insertError);
                alert("Failed to create profile");
                await handleLogout();
                return;
            }

            userProfile = newUser;
        }

        state.currentUser = userProfile;

        // Navigation state
        history.replaceState({ pageId: 'dashboard' }, '', '#dashboard');

        // Load UI
        await loadDashboardData();
        renderDashboard();

        setTimeout(() => {
            document.getElementById('app-loading').classList.add('loaded');
        }, 500);

        if (window.lucide) window.lucide.createIcons();

        // Parallel loading
        await Promise.all([
            loadStoreAndProductData(),
            loadLeaderboardData(),
            loadHistoryData(),
            loadChallengesData(),
            loadEventsData(),
            loadUserRewardsData()
        ]);

        setupFileUploads();

    } catch (err) {
        console.error('Initialization Error:', err);
    }
};

// ================= LOGOUT =================

const handleLogout = async () => {
    try {
        // 🔥 LOGOUT FROM AUTH PROJECT
        const { error } = await authClient.auth.signOut();

        if (error) console.error('Logout error:', error.message);

        redirectToLogin();

    } catch (err) {
        console.error('Logout Error:', err);
    }
};

const redirectToLogin = () => {
    window.location.replace('https://ecocampus.in/auth/login.html');
};

// ================= REFRESH USER =================

export const refreshUserData = async () => {
    try {
        const { data: userProfile, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', state.currentUser.id)
            .single();

        if (error || !userProfile) return;

        const existingState = {
            isCheckedInToday: state.currentUser.isCheckedInToday,
            checkInStreak: state.currentUser.checkInStreak,
            impact: state.currentUser.impact
        };

        state.currentUser = { ...userProfile, ...existingState };

        const header = document.getElementById('user-points-header');
        header.classList.add('points-pulse');
        header.textContent = userProfile.current_points;

        document.getElementById('user-points-sidebar').textContent = userProfile.current_points;

        setTimeout(() => header.classList.remove('points-pulse'), 400);

        renderDashboard();

    } catch (err) {
        console.error('Refresh User Data Error:', err);
    }
};

// ================= EVENT LISTENERS =================

if (els.storeSearch) els.storeSearch.addEventListener('input', renderRewards);
if (els.storeSearchClear) els.storeSearchClear.addEventListener('click', () => {
    els.storeSearch.value = '';
    renderRewards();
});
if (els.sortBy) els.sortBy.addEventListener('change', renderRewards);

document.getElementById('sidebar-toggle-btn').addEventListener('click', () => toggleSidebar());
document.getElementById('logout-button').addEventListener('click', handleLogout);

// ================= THEME =================

const themeBtn = document.getElementById('theme-toggle-btn');
const themeText = document.getElementById('theme-text');
const themeIcon = document.getElementById('theme-icon');

const applyTheme = (isDark) => {
    document.documentElement.classList.toggle('dark', isDark);
    themeText.textContent = isDark ? 'Dark Mode' : 'Light Mode';
    themeIcon.setAttribute('data-lucide', isDark ? 'moon' : 'sun');
    if (window.lucide) window.lucide.createIcons();
};

themeBtn.addEventListener('click', () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('eco-theme', isDark ? 'dark' : 'light');
    applyTheme(isDark);
});

const savedTheme = localStorage.getItem('eco-theme');
applyTheme(savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches));

// ================= START =================

window.handleLogout = handleLogout;
checkAuth();
