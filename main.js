// ==========================================
// GLOBAL CONFIGURATION
// ==========================================
const sb = window.sb; 
let currentSession = null;

const CLOUDINARY_CLOUD_NAME = 'dnia8lb2q'; 
const CLOUDINARY_UPLOAD_PRESET = 'profiles'; 

// ==========================================
// 1. AUTH & INITIALIZATION
// ==========================================
async function checkAuth() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
        window.location.href = "/EcoCampus/auth/login.html";
        return;
    }
    currentSession = session;
    
    // Initialize everything
    fetchUserProfile(session.user.id, session.user.email);
    loadPosts();
    loadDiscoverStudents();
    if(typeof loadNotifications === 'function') loadNotifications();
}

// ==========================================
// 2. PROFILE DATA HANDLING
// ==========================================
async function fetchUserProfile(authUserId, fallbackEmail) {
    try {
        const { data: userProfile, error } = await sb
            .from('users')
            .select('full_name, profile_img_url, role, course, student_id, email, bio, social_links, is_private') 
            .eq('auth_user_id', authUserId)
            .single();

        if (error) throw error; 

        if (userProfile) {
            // FIX: Replaced broken via.placeholder.com with reliable UI-Avatars
            const avatarUrl = userProfile.profile_img_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.full_name)}&background=e1e3e4`;
            
            const headerAvatar = document.getElementById('header-avatar');
            if(headerAvatar) headerAvatar.src = avatarUrl;
            
            const profileAvatar = document.getElementById('profile-avatar-large');
            if(profileAvatar) profileAvatar.src = avatarUrl;
            
            const feedAvatar = document.getElementById('feed-avatar');
            if(feedAvatar) feedAvatar.src = avatarUrl;
            
            const feedInputAvatar = document.getElementById('feed-input-avatar');
            if(feedInputAvatar) feedInputAvatar.src = avatarUrl;

            // Text Fields
            const fields = {
                'profile-name': userProfile.full_name,
                'profile-role': userProfile.role || 'Student',
                'profile-id': userProfile.student_id,
                'profile-course': userProfile.course,
                'profile-bio': userProfile.bio || 'Add a bio to tell people about yourself! 🌱'
            };
            Object.entries(fields).forEach(([id, val]) => {
                const el = document.getElementById(id);
                if (el) el.innerText = val;
            });

            const emailEl = document.getElementById('profile-email');
            if(emailEl) emailEl.innerHTML = `<span class="material-symbols-outlined text-[16px]">mail</span> ${userProfile.email || fallbackEmail}`;
            
            const privacyToggle = document.getElementById('privacy-toggle-switch');
            if(privacyToggle) privacyToggle.checked = userProfile.is_private;

            renderMySocialLinks(userProfile.social_links);
        }
    } catch (err) {
        console.error("Profile fetch error:", err.message);
    }
}

// ==========================================
// 3. POSTING SYSTEM (TEXT ONLY)
// ==========================================
window.submitPost = async function() {
    const input = document.getElementById('post-input');
    const btn = document.getElementById('send-post-btn');
    const content = input.value.trim();

    if (!content || !currentSession) return;

    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined text-[20px] animate-spin">sync</span>';

    try {
        const { error } = await sb.from('posts').insert({
            user_id: currentSession.user.id,
            content: content
        });
        if (error) throw error;
        input.value = '';
        await loadPosts();
    } catch (err) {
        console.error("Failed to post:", err.message);
        alert("Failed to post update.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span class="material-symbols-outlined text-[20px] ml-1">send</span>';
    }
};

async function loadPosts() {
    const container = document.getElementById('feed-posts-container');
    if (!container) return;

    const { data: posts, error } = await sb.from('posts').select(`
        id, content, likes, created_at,
        users!posts_user_id_fkey(full_name, profile_img_url)
    `).order('created_at', { ascending: false }).limit(20);

    if (error) { console.error("Error loading posts:", error); return; }

    // FIX: Added dark:text-gray-100 to headings and dark:text-gray-200 to paragraphs
    container.innerHTML = posts.length > 0 ? posts.map(p => `
        <div class="bg-white dark:bg-neutral-900 rounded-[32px] p-5 border border-gray-200 dark:border-neutral-800 shadow-sm mb-5 transition-colors">
            <div class="flex items-center gap-3 mb-3">
                <img src="${p.users.profile_img_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.users.full_name)}&background=e1e3e4`}" class="w-10 h-10 rounded-full border border-gray-200 dark:border-neutral-700 shadow-sm object-cover">
                <div class="flex-1">
                    <h4 class="font-bold text-[14px] text-gray-900 dark:text-gray-100">${p.users.full_name}</h4>
                    <p class="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Just now</p>
                </div>
            </div>
            <p class="text-[14px] text-gray-800 dark:text-gray-200 leading-relaxed mb-4 px-1">
                ${p.content}
            </p>
            <div class="flex items-center gap-6 border-t border-gray-200 dark:border-neutral-800 pt-3 px-1">
                <button class="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-primary transition-colors text-[13px] font-medium active:scale-95">
                    <span class="material-symbols-outlined text-[20px]">favorite</span> ${p.likes || 0}
                </button>
            </div>
        </div>
    `).join('') : '<p class="text-sm italic text-center py-4 text-gray-500 dark:text-gray-400">No posts yet. Be the first!</p>';
}

// ==========================================
// 4. CLOUDINARY UPLOAD FIX
// ==========================================
function setupProfileImageUpload() {
    const avatarContainer = document.getElementById('profile-avatar-container');
    const fileInput = document.getElementById('avatar-upload-input');
    const largeAvatarImg = document.getElementById('profile-avatar-large');
    const headerAvatarImg = document.getElementById('header-avatar');

    if (!avatarContainer || !fileInput) return;

    avatarContainer.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        largeAvatarImg.style.opacity = '0.5';

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

            const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
                method: 'POST',
                body: formData
            });
            
            const cloudinaryData = await uploadRes.json();

            if (!uploadRes.ok) {
                console.error("Cloudinary Error:", cloudinaryData);
                throw new Error(cloudinaryData.error?.message || "Cloudinary rejected the upload.");
            }

            const newImageUrl = cloudinaryData.secure_url;

            // Sync with Supabase
            const { error: dbError } = await sb
                .from('users')
                .update({ profile_img_url: newImageUrl })
                .eq('auth_user_id', currentSession.user.id);

            if (dbError) throw dbError;

            // Update UI
            largeAvatarImg.src = newImageUrl;
            if (headerAvatarImg) headerAvatarImg.src = newImageUrl;
            
        } catch (err) {
            console.error("Profile image upload failed:", err);
            alert(`Upload failed: ${err.message}`);
        } finally {
            largeAvatarImg.style.opacity = '1';
            fileInput.value = '';
        }
    });
}

// ==========================================
// 5. SOCIAL LINKS MANAGEMENT
// ==========================================
function renderMySocialLinks(linksObj) {
    const container = document.getElementById('profile-social-links');
    if (!container) return;
    
    container.innerHTML = ''; 
    
    if (linksObj && Object.keys(linksObj).length > 0) {
        Object.entries(linksObj).forEach(([platform, url]) => {
            if (url) {
                container.innerHTML += `
                    <a href="${url}" target="_blank" rel="noopener noreferrer" 
                       class="px-4 py-2 bg-gray-100 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm font-bold text-gray-800 dark:text-gray-200 hover:bg-primary/10 hover:text-primary transition-colors capitalize flex items-center gap-1.5 shadow-sm">
                        <span class="material-symbols-outlined text-[18px]">link</span>
                        ${platform}
                    </a>
                `;
                const inputEl = document.getElementById(`input-social-${platform}`);
                if(inputEl) inputEl.value = url;
            }
        });
    } else {
        container.innerHTML = `<p class="text-[13px] text-gray-500 dark:text-gray-400 italic">No social links added yet.</p>`;
    }
}

window.openSocialsModal = () => {
    const modal = document.getElementById('modal-edit-socials');
    if(modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
};

window.closeSocialsModal = () => {
    const modal = document.getElementById('modal-edit-socials');
    if(modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
};

window.saveSocialLinks = async function() {
    if (!currentSession) return;
    
    const updatedLinks = {
        instagram: document.getElementById('input-social-instagram')?.value.trim() || '',
        linkedin: document.getElementById('input-social-linkedin')?.value.trim() || '',
        github: document.getElementById('input-social-github')?.value.trim() || ''
    };

    Object.keys(updatedLinks).forEach(key => { if (!updatedLinks[key]) delete updatedLinks[key]; });

    try {
        const { error } = await sb.from('users').update({ social_links: updatedLinks }).eq('auth_user_id', currentSession.user.id);
        if (error) throw error;
        closeSocialsModal();
        renderMySocialLinks(updatedLinks); 
    } catch (err) { alert("Error saving social links."); }
};

// ==========================================
// 6. PRIVACY & SEARCH SYSTEM
// ==========================================
const privacyToggleEl = document.getElementById('privacy-toggle-switch');
if (privacyToggleEl) {
    privacyToggleEl.addEventListener('change', async (e) => {
        if (!currentSession) return;
        await sb.from('users').update({ is_private: e.target.checked }).eq('auth_user_id', currentSession.user.id);
    });
}

let allDiscoverUsers = []; 

async function loadDiscoverStudents() {
    const container = document.getElementById('discover-students-container'); 
    if (!container) return;

    const { data: users, error } = await sb
        .from('users')
        .select('auth_user_id, full_name, course, profile_img_url, bio, social_links, is_private, connection_count')
        .neq('auth_user_id', currentSession.user.id)
        .order('connection_count', { ascending: false })
        .limit(10);

    if (error) return;

    // FIX: Added dark:text-gray-100 to names in student discovery
    allDiscoverUsers = users;
    container.innerHTML = users.map((u, i) => `
        <div class="bg-white dark:bg-neutral-900 rounded-[24px] p-4 border border-gray-200 dark:border-neutral-800 shadow-sm flex items-center gap-4 cursor-pointer hover:border-primary transition-colors" onclick="viewStudentProfile(${i})">
            <img src="${u.profile_img_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.full_name)}&background=e1e3e4`}" class="w-12 h-12 rounded-full object-cover">
            <div class="flex-1">
                <h4 class="font-bold text-[14px] text-gray-900 dark:text-gray-100">${u.full_name} ${u.is_private ? '🔒' : ''}</h4>
                <p class="text-[12px] text-gray-500 dark:text-gray-400">${u.course || 'Student'} • ${u.connection_count || 0} Conns</p>
            </div>
        </div>
    `).join('');
}

window.viewStudentProfile = function(index) {
    const user = allDiscoverUsers[index];
    if (user.is_private) {
        document.getElementById('private-profile-name').innerText = user.full_name;
        document.getElementById('modal-profile-private').classList.remove('hidden');
        document.getElementById('modal-profile-private').classList.add('flex');
    } else {
        document.getElementById('public-profile-name').innerText = user.full_name;
        document.getElementById('public-profile-bio').innerText = user.bio || 'No bio.';
        document.getElementById('modal-profile-public').classList.remove('hidden');
        document.getElementById('modal-profile-public').classList.add('flex');
    }
};

window.closeProfileModals = () => {
    document.querySelectorAll('[id^="modal-profile-"]').forEach(m => { m.classList.add('hidden'); m.classList.remove('flex'); });
};

// ==========================================
// 7. NOTIFICATIONS SYSTEM
// ==========================================
window.markNotifRead = async function(notifId) {
    try {
        await sb.from('notifications').update({ is_read: true }).eq('id', notifId);
        if(typeof loadNotifications === 'function') loadNotifications();
    } catch (err) {
        console.error("Error marking read:", err);
    }
};

// ==========================================
// 8. UI: TAB SWITCHING & THEME LOGIC
// ==========================================
window.switchTab = (tabName) => {
    document.querySelectorAll('.tab-content').forEach(el => {
        el.classList.add('hidden');
        el.classList.remove('active');
    });
    
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.remove('bg-primary', 'text-white');
        el.classList.add('text-gray-500', 'dark:text-gray-400');
    });

    const activeNav = document.getElementById('nav-' + tabName);
    if (activeNav) {
        activeNav.classList.remove('text-gray-500', 'dark:text-gray-400');
        activeNav.classList.add('bg-primary', 'text-white');
    }

    const targetView = document.getElementById('view-' + tabName);
    if (targetView) {
        targetView.classList.remove('hidden');
        targetView.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

const notifBtn = document.getElementById('notif-btn');
const closeNotifBtn = document.getElementById('close-notif-btn');
const fullNotifPanel = document.getElementById('full-notif-panel');

if(notifBtn && closeNotifBtn && fullNotifPanel) {
    notifBtn.addEventListener('click', () => {
        fullNotifPanel.classList.remove('translate-x-full');
        document.body.style.overflow = 'hidden';
    });
    closeNotifBtn.addEventListener('click', () => {
        fullNotifPanel.classList.add('translate-x-full');
        document.body.style.overflow = 'auto';
    });
}

function initTheme() {
    const savedTheme = localStorage.getItem('ecoCampusTheme') || 'light';
    document.documentElement.setAttribute('class', savedTheme);
    const themeCheckbox = document.getElementById('theme-toggle-switch');
    if(themeCheckbox) themeCheckbox.checked = (savedTheme === 'dark');
}

const themeCheckboxEl = document.getElementById('theme-toggle-switch');
if(themeCheckboxEl) {
    themeCheckboxEl.addEventListener('change', (e) => {
        const newTheme = e.target.checked ? 'dark' : 'light';
        document.documentElement.setAttribute('class', newTheme);
        localStorage.setItem('ecoCampusTheme', newTheme);
    });
}

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    checkAuth();
    setupProfileImageUpload();
});
