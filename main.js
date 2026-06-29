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
        window.location.href = "/auth/login.html"; // Adjust to your auth folder path
        return;
    }
    currentSession = session;
    
    // Initialize standard flows
    fetchUserProfile(session.user.id);
    loadPosts();
    loadDiscoverStudents();
    loadNotifications();
}

// ==========================================
// 2. PROFILE DATA HANDLING
// ==========================================
async function fetchUserProfile(authUserId) {
    try {
        const { data: userProfile, error } = await sb
            .from('users')
            .select('full_name, profile_img_url, role, course, student_id, email, bio, social_links, is_private, connection_count') 
            .eq('auth_user_id', authUserId)
            .single();

        if (error) throw error; 

        if (userProfile) {
            // Avatars
            const avatarUrl = userProfile.profile_img_url || 'https://via.placeholder.com/150';
            ['header-avatar', 'profile-avatar-large', 'feed-avatar'].forEach(id => {
                const el = document.getElementById(id);
                if(el) el.src = avatarUrl;
            });

            // Text Mapping
            const fields = {
                'profile-name': userProfile.full_name,
                'profile-role': userProfile.role || 'Student',
                'profile-id': userProfile.student_id || 'N/A',
                'profile-course': userProfile.course || 'N/A',
                'profile-bio': userProfile.bio || 'Passionate about sustainability and tech! 🌱'
            };
            Object.entries(fields).forEach(([id, val]) => {
                const el = document.getElementById(id);
                if (el) el.innerText = val;
            });

            const emailEl = document.getElementById('profile-email');
            if(emailEl) emailEl.innerHTML = `<span class="material-symbols-outlined text-[16px]">mail</span> ${userProfile.email}`;
            
            const privacyToggle = document.getElementById('privacy-toggle-switch');
            if(privacyToggle) privacyToggle.checked = userProfile.is_private;

            renderMySocialLinks(userProfile.social_links);
        }
    } catch (err) {
        console.error("Profile fetch error:", err.message);
    }
}

// ==========================================
// 3. POSTING & FEED SYSTEM
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
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span class="material-symbols-outlined text-[20px]">send</span>';
    }
};

async function loadPosts() {
    const container = document.getElementById('feed-posts-container');
    if (!container) return;

    const { data: posts, error } = await sb.from('posts').select(`
        id, content, likes, created_at,
        users!posts_user_id_fkey(full_name, profile_img_url)
    `).order('created_at', { ascending: false }).limit(30);

    if (error) { console.error(error); return; }

    container.innerHTML = posts.length > 0 ? posts.map(p => `
        <div class="bg-surface-container-lowest dark:bg-[#1e1e1e] rounded-[32px] p-5 border border-surface-variant/60 shadow-sm mb-5 transition-colors">
            <div class="flex items-center gap-3 mb-3">
                <img src="${p.users.profile_img_url || 'https://via.placeholder.com/150'}" class="w-10 h-10 rounded-full border border-surface-variant shadow-sm object-cover">
                <div class="flex-1">
                    <h4 class="font-bold text-[14px] text-on-surface leading-tight">${p.users.full_name}</h4>
                    <p class="text-[11px] text-on-surface-variant mt-0.5">Stream Entity</p>
                </div>
            </div>
            <p class="text-[14px] text-on-surface leading-relaxed mb-4 px-1">${p.content}</p>
            <div class="flex items-center gap-6 border-t border-surface-variant/40 pt-3 px-1">
                <button class="flex items-center gap-1.5 text-on-surface-variant hover:text-primary transition-colors text-[13px] font-medium active:scale-95">
                    <span class="material-symbols-outlined text-[20px]">favorite</span> ${p.likes || 0}
                </button>
                <button class="flex items-center gap-1.5 text-on-surface-variant hover:text-secondary transition-colors text-[13px] font-medium active:scale-95">
                    <span class="material-symbols-outlined text-[20px]">chat_bubble</span> Reply
                </button>
            </div>
        </div>
    `).join('') : '<p class="text-sm italic text-center py-4 text-on-surface-variant">No posts available.</p>';
}

// ==========================================
// 4. CONNECTION SYSTEM & DISCOVERY 
// ==========================================
let allDiscoverUsers = []; 

async function loadDiscoverStudents() {
    const container = document.getElementById('discover-students-container'); 
    if (!container) return;

    // Fetch users (not self)
    const { data: users, error } = await sb
        .from('users')
        .select('auth_user_id, full_name, course, profile_img_url, bio, social_links, is_private, connection_count')
        .neq('auth_user_id', currentSession.user.id)
        .order('connection_count', { ascending: false })
        .limit(15);

    if (error) return;

    // Optional: Get status of existing connections for proper button UI mapping
    // const { data: conns } = await sb.from('connections').select('receiver_id, status').eq('requester_id', currentSession.user.id);

    allDiscoverUsers = users;
    container.innerHTML = users.map((u, i) => `
        <div onclick="viewStudentProfile(${i})" class="bg-surface-container-lowest dark:bg-[#1e1e1e] rounded-[24px] p-4 border border-surface-variant/60 shadow-sm flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-transform">
            <div class="relative shrink-0">
                <div class="w-[52px] h-[52px] rounded-full p-[2px] ${u.is_private ? 'bg-surface-variant' : 'bg-gradient-to-tr from-primary to-blue-500'}">
                    <div class="w-full h-full rounded-full border-2 border-surface overflow-hidden bg-surface-variant">
                        <img src="${u.profile_img_url || 'https://via.placeholder.com/150'}" class="w-full h-full object-cover">
                    </div>
                </div>
            </div>
            <div class="flex-1">
                <h4 class="text-[15px] font-bold text-on-surface leading-tight flex items-center gap-1">
                    ${u.full_name} ${u.is_private ? '<span class="material-symbols-outlined text-[14px]">lock</span>' : ''}
                </h4>
                <p class="text-[12px] text-on-surface-variant mt-0.5">${u.course || 'Student'} • ${u.connection_count || 0} Conns</p>
            </div>
            <button class="bg-primary/10 text-primary px-4 py-2 rounded-xl text-[12px] font-bold tracking-wide shrink-0">
                View
            </button>
        </div>
    `).join('');
}

window.viewStudentProfile = function(index) {
    const user = allDiscoverUsers[index];
    if (user.is_private) {
        document.getElementById('private-profile-name').innerText = user.full_name;
        document.getElementById('private-profile-course').innerText = user.course || 'Student';
        document.getElementById('private-profile-avatar').src = user.profile_img_url || 'https://via.placeholder.com/150';
        
        const btn = document.getElementById('private-connect-btn');
        btn.onclick = () => requestConnection(user.auth_user_id);
        
        document.getElementById('modal-profile-private').classList.remove('hidden');
        document.getElementById('modal-profile-private').classList.add('flex');
    } else {
        document.getElementById('public-profile-name').innerText = user.full_name;
        document.getElementById('public-profile-course').innerText = user.course || 'Student';
        document.getElementById('public-profile-bio').innerText = user.bio || 'No bio attached.';
        document.getElementById('public-profile-avatar').src = user.profile_img_url || 'https://via.placeholder.com/150';
        
        const btn = document.getElementById('public-connect-btn');
        btn.onclick = () => requestConnection(user.auth_user_id);

        document.getElementById('modal-profile-public').classList.remove('hidden');
        document.getElementById('modal-profile-public').classList.add('flex');
    }
};

window.closeProfileModals = () => {
    document.querySelectorAll('[id^="modal-profile-"]').forEach(m => { m.classList.add('hidden'); m.classList.remove('flex'); });
};

window.requestConnection = async function(receiverId) {
    if(!currentSession) return;
    try {
        const { error } = await sb.from('connections').insert({
            requester_id: currentSession.user.id,
            receiver_id: receiverId,
            status: 'pending' // Utilizing the enum specified in your connections table
        });
        if (error) throw error;
        alert("Connection request sent!");
        closeProfileModals();
    } catch(err) {
        alert("Already requested or unable to process: " + err.message);
    }
}

// ==========================================
// 5. NOTIFICATIONS (SCHEMA MAPPED)
// ==========================================
async function loadNotifications() {
    const container = document.getElementById('notifications-container');
    const badge = document.getElementById('notif-badge');
    if (!container || !currentSession) return;

    const { data: notifs, error } = await sb.from('notifications')
        .select('*')
        .eq('user_id', currentSession.user.id)
        .order('created_at', { ascending: false });

    if(error) return;

    const unread = notifs.filter(n => !n.is_read).length;
    if(badge) badge.style.display = unread > 0 ? 'block' : 'none';

    container.innerHTML = notifs.length > 0 ? notifs.map(n => `
        <div onclick="markNotifRead('${n.id}')" class="p-5 border-b border-surface-variant/50 cursor-pointer transition-colors ${!n.is_read ? 'bg-primary/5' : ''}">
            <div class="flex gap-4">
                <div class="w-12 h-12 rounded-full ${n.type==='alert' ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary'} flex items-center justify-center shrink-0">
                    <span class="material-symbols-outlined">${n.type==='alert' ? 'warning' : 'notifications'}</span>
                </div>
                <div>
                    <p class="text-[14px] text-on-surface leading-snug">${n.message}</p>
                    <span class="text-[11px] text-on-surface-variant mt-2 block font-medium">System Alert</span>
                </div>
            </div>
        </div>
    `).join('') : '<p class="text-sm text-center py-10 text-on-surface-variant">No new notifications.</p>';
}

window.markNotifRead = async function(notifId) {
    try {
        await sb.from('notifications').update({ is_read: true }).eq('id', notifId);
        loadNotifications();
    } catch(e) { }
}

// ==========================================
// 6. CLOUDINARY & SOCIAL LINKS UTILS
// ==========================================
function setupProfileImageUpload() {
    const avatarContainer = document.getElementById('profile-avatar-container');
    const fileInput = document.getElementById('avatar-upload-input');
    const largeAvatarImg = document.getElementById('profile-avatar-large');

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
                method: 'POST', body: formData
            });
            const cloudinaryData = await uploadRes.json();
            if (!uploadRes.ok) throw new Error("Cloudinary rejected.");

            const newImageUrl = cloudinaryData.secure_url;
            await sb.from('users').update({ profile_img_url: newImageUrl }).eq('auth_user_id', currentSession.user.id);
            largeAvatarImg.src = newImageUrl;
        } catch (err) {
            alert(`Upload failed`);
        } finally {
            largeAvatarImg.style.opacity = '1';
        }
    });
}

function renderMySocialLinks(linksObj) {
    const container = document.getElementById('profile-social-links');
    if (!container) return;
    
    container.innerHTML = ''; 
    if (linksObj && Object.keys(linksObj).length > 0) {
        Object.entries(linksObj).forEach(([platform, url]) => {
            if (url) {
                container.innerHTML += `
                    <a href="${url}" target="_blank" class="w-12 h-12 rounded-2xl bg-surface-variant/40 text-on-surface flex items-center justify-center cursor-pointer shadow-sm border border-surface-variant/50">
                        <span class="font-bold text-[14px] capitalize">${platform.substring(0,2)}</span>
                    </a>
                `;
                const inputEl = document.getElementById(`input-social-${platform}`);
                if(inputEl) inputEl.value = url;
            }
        });
    } else {
        container.innerHTML = `<p class="text-xs text-on-surface-variant italic">No social links added yet.</p>`;
    }
}

window.openSocialsModal = () => document.getElementById('modal-edit-socials').classList.replace('hidden', 'flex');
window.closeSocialsModal = () => document.getElementById('modal-edit-socials').classList.replace('flex', 'hidden');

window.saveSocialLinks = async function() {
    if (!currentSession) return;
    const nextLinks = {
        instagram: document.getElementById('input-social-instagram')?.value.trim() || '',
        linkedin: document.getElementById('input-social-linkedin')?.value.trim() || '',
        github: document.getElementById('input-social-github')?.value.trim() || ''
    };
    Object.keys(nextLinks).forEach(k => { if (!nextLinks[k]) delete nextLinks[k]; });

    await sb.from('users').update({ social_links: nextLinks }).eq('auth_user_id', currentSession.user.id);
    renderMySocialLinks(nextLinks);
    closeSocialsModal();
};

// ==========================================
// 7. PRIVACY, THEME, UI TRIGGERS
// ==========================================
const privacyEl = document.getElementById('privacy-toggle-switch');
if(privacyEl) {
    privacyEl.addEventListener('change', async (e) => {
        if (currentSession) await sb.from('users').update({ is_private: e.target.checked }).eq('auth_user_id', currentSession.user.id);
    });
}

function initTheme() {
    const savedTheme = localStorage.getItem('ecoCampusTheme') || 'light';
    document.documentElement.setAttribute('class', savedTheme);
    const themeCheckbox = document.getElementById('theme-toggle-switch');
    if(themeCheckbox) themeCheckbox.checked = (savedTheme === 'dark');
}

const themeEl = document.getElementById('theme-toggle-switch');
if(themeEl) {
    themeEl.addEventListener('change', (e) => {
        const newTheme = e.target.checked ? 'dark' : 'light';
        document.documentElement.setAttribute('class', newTheme);
        localStorage.setItem('ecoCampusTheme', newTheme);
    });
}

const notifBtn = document.getElementById('notif-btn');
const closeNotifBtn = document.getElementById('close-notif-btn');
const fullNotifPanel = document.getElementById('full-notif-panel');

if(notifBtn && closeNotifBtn && fullNotifPanel) {
    notifBtn.addEventListener('click', () => { fullNotifPanel.classList.remove('translate-x-full'); document.body.style.overflow = 'hidden'; });
    closeNotifBtn.addEventListener('click', () => { fullNotifPanel.classList.add('translate-x-full'); document.body.style.overflow = 'auto'; });
}

document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    checkAuth();
    setupProfileImageUpload();
});
