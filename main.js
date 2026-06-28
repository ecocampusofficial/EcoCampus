// ==========================================
// GLOBAL CONFIGURATION
// ==========================================
const sb = window.sb; 
let currentSession = null;

// Cloudinary Settings
const CLOUDINARY_CLOUD_NAME = 'dnia8lb2q'; 
const CLOUDINARY_UPLOAD_PRESET = 'profiles'; 

// ==========================================
// 1. AUTH & PROFILE LOADING
// ==========================================
async function checkAuth() {
    const { data: { session } } = await sb.auth.getSession();
    
    if (!session) {
        window.location.href = "/EcoCampus/auth/login.html";
        return;
    }
    
    currentSession = session;
    fetchUserProfile(session.user.id, session.user.email);
    
    // Load secondary data
    loadDiscoverStudents();
    loadNotifications();
}

async function fetchUserProfile(authUserId, fallbackEmail) {
    try {
        const { data: userProfile, error } = await sb
            .from('users')
            .select('full_name, profile_img_url, role, course, student_id, email, bio, social_links, is_private') 
            .eq('auth_user_id', authUserId)
            .single();

        if (error) throw error; 

        if (userProfile) {
            const name = userProfile.full_name || fallbackEmail;
            
            // Map Header UI
            const headerNameEl = document.getElementById('header-name');
            if (headerNameEl) headerNameEl.innerText = name;
            
            if (userProfile.profile_img_url) {
                const headerAvatarEl = document.getElementById('header-avatar');
                if (headerAvatarEl) headerAvatarEl.src = userProfile.profile_img_url;
                
                const profileAvatarLargeEl = document.getElementById('profile-avatar-large');
                if (profileAvatarLargeEl) profileAvatarLargeEl.src = userProfile.profile_img_url;
            }

            // Map Profile Tab UI
            const elementsToUpdate = {
                'profile-name': name,
                'profile-role': userProfile.role || 'Student',
                'profile-id': userProfile.student_id || 'Not Assigned',
                'profile-course': userProfile.course || 'Not Assigned',
                'profile-bio': userProfile.bio || 'Add a bio to tell people about yourself! 🌱'
            };

            for (const [id, value] of Object.entries(elementsToUpdate)) {
                const el = document.getElementById(id);
                if (el) el.innerText = value;
            }

            // Safe HTML injections
            const profileEmailEl = document.getElementById('profile-email');
            if (profileEmailEl) profileEmailEl.innerHTML = `<span class="material-symbols-outlined text-[16px]">mail</span> ${userProfile.email || fallbackEmail}`;

            // Set Privacy Toggle State
            const privacyToggle = document.getElementById('privacy-toggle-switch');
            if (privacyToggle) privacyToggle.checked = userProfile.is_private || false;

            // Render Social Links
            renderSocialLinks(userProfile.social_links);
        }
    } catch (err) {
        console.error("Error fetching profile:", err.message);
    }
}

async function logout() {
    await sb.auth.signOut();
    window.location.href = "/EcoCampus/auth/login.html";
}

// ==========================================
// 2. CLOUDINARY UPLOAD 
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

        largeAvatarImg.style.opacity = '0.5'; // loading state

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
            alert(`Upload Failed: ${err.message}`);
        } finally {
            largeAvatarImg.style.opacity = '1';
            fileInput.value = '';
        }
    });
}

// ==========================================
// 3. SOCIAL LINKS & PRIVACY SETTINGS
// ==========================================
function renderSocialLinks(linksObj) {
    const container = document.getElementById('profile-social-links');
    if (!container) return;
    
    container.innerHTML = ''; 
    
    if (linksObj && Object.keys(linksObj).length > 0) {
        Object.entries(linksObj).forEach(([platform, url]) => {
            if (url) {
                container.innerHTML += `
                    <a href="${url}" target="_blank" rel="noopener noreferrer" 
                       class="px-4 py-2 bg-surface border border-outline/20 rounded-xl text-sm font-bold text-on-surface hover:bg-primary/10 hover:text-primary transition-colors capitalize flex items-center gap-1.5 shadow-sm">
                        <span class="material-symbols-outlined text-[18px]">link</span>
                        ${platform}
                    </a>
                `;
                // Pre-fill modal inputs if they exist
                const inputEl = document.getElementById(`input-social-${platform}`);
                if(inputEl) inputEl.value = url;
            }
        });
    } else {
        container.innerHTML = `<p class="text-[13px] text-on-surface-variant italic">No social links added yet.</p>`;
    }
}

function openSocialsModal() {
    const modal = document.getElementById('modal-edit-socials');
    if(modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closeSocialsModal() {
    const modal = document.getElementById('modal-edit-socials');
    if(modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

async function saveSocialLinks() {
    if (!currentSession) return;
    
    const btn = document.querySelector('#modal-edit-socials button.bg-primary');
    btn.innerText = "Saving...";
    
    const updatedLinks = {
        instagram: document.getElementById('input-social-instagram')?.value.trim() || '',
        linkedin: document.getElementById('input-social-linkedin')?.value.trim() || '',
        github: document.getElementById('input-social-github')?.value.trim() || ''
    };

    // Remove empty ones so DB stays clean
    Object.keys(updatedLinks).forEach(key => {
        if (!updatedLinks[key]) delete updatedLinks[key];
    });

    try {
        const { error } = await sb
            .from('users')
            .update({ social_links: updatedLinks })
            .eq('auth_user_id', currentSession.user.id);

        if (error) throw error;
        
        closeSocialsModal();
        renderSocialLinks(updatedLinks); // Live refresh UI
    } catch (err) {
        console.error("Failed to save social links:", err.message);
        alert("Could not save links.");
    } finally {
        btn.innerText = "Save Links";
    }
}

// Listen for Privacy Toggle
const privacyToggleEl = document.getElementById('privacy-toggle-switch');
if (privacyToggleEl) {
    privacyToggleEl.addEventListener('change', async (e) => {
        if (!currentSession) return;
        try {
            const { error } = await sb
                .from('users')
                .update({ is_private: e.target.checked })
                .eq('auth_user_id', currentSession.user.id);
            if (error) throw error;
        } catch (err) {
            console.error("Failed to update privacy:", err.message);
            e.target.checked = !e.target.checked; // revert UI
        }
    });
}

// ==========================================
// 4. SEARCH / DISCOVER SYSTEM
// ==========================================
async function loadDiscoverStudents() {
    const container = document.getElementById('discover-students-list'); 
    if (!container) return;

    try {
        const { data: users, error } = await sb
            .from('users')
            .select('auth_user_id, full_name, course, profile_img_url, is_private, connection_count')
            .neq('auth_user_id', currentSession.user.id)
            .order('connection_count', { ascending: false })
            .limit(10);

        if (error) throw error;

        container.innerHTML = '';
        
        users.forEach(user => {
            const lockIcon = user.is_private 
                ? '<span class="material-symbols-outlined text-[14px] text-on-surface-variant" title="Private">lock</span>' 
                : '';
                
            container.innerHTML += `
                <div class="bg-surface-container-lowest dark:bg-[#1e1e1e] rounded-[24px] p-4 border border-surface-variant/60 shadow-sm flex items-center gap-4">
                    <div class="w-[52px] h-[52px] rounded-full overflow-hidden shrink-0 border border-surface-variant">
                        <img src="${user.profile_img_url || 'https://via.placeholder.com/150'}" class="w-full h-full object-cover">
                    </div>
                    <div class="flex-1">
                        <h4 class="text-[15px] font-bold text-on-surface leading-tight flex items-center gap-1">
                            ${user.full_name} ${lockIcon}
                        </h4>
                        <p class="text-[12px] text-on-surface-variant mt-0.5">${user.course || 'Student'} • ${user.connection_count || 0} Conns</p>
                    </div>
                    <button onclick="sendConnectionRequest('${user.auth_user_id}', this)" class="bg-primary/10 text-primary px-4 py-2 rounded-xl text-[12px] font-bold active:scale-95 transition-all min-w-[80px]">
                        Connect
                    </button>
                </div>
            `;
        });
    } catch (err) {
        console.error("Failed to load students:", err.message);
        container.innerHTML = '<p class="text-sm text-error text-center">Failed to load users.</p>';
    }
}

async function sendConnectionRequest(receiverId, btnElement) {
    btnElement.innerText = "...";
    btnElement.disabled = true;
    
    try {
        const { error: connError } = await sb
            .from('connections')
            .insert({ requester_id: currentSession.user.id, receiver_id: receiverId, status: 'pending' });
            
        if (connError) {
            if (connError.code === '23505') throw new Error("Request already sent.");
            throw connError;
        }

        const { error: notifError } = await sb
            .from('notifications')
            .insert({
                user_id: receiverId,
                sender_id: currentSession.user.id,
                type: 'connection_request',
                message: 'sent you a connection request.'
            });

        if (notifError) throw notifError;
        
        btnElement.innerText = "Pending";
        btnElement.classList.replace("text-primary", "text-on-surface-variant");
        btnElement.classList.replace("bg-primary/10", "bg-surface-variant/50");
        
    } catch (err) {
        console.error("Connection failed:", err.message);
        alert(err.message);
        btnElement.innerText = "Connect";
        btnElement.disabled = false;
    }
}

// ==========================================
// 5. NOTIFICATIONS SYSTEM
// ==========================================
async function loadNotifications() {
    const container = document.getElementById('notifications-list');
    if (!container) return;

    try {
        const { data: notifications, error } = await sb
            .from('notifications')
            .select(`
                id, message, is_read, created_at,
                users!notifications_sender_id_fkey(full_name, profile_img_url)
            `)
            .eq('user_id', currentSession.user.id)
            .order('created_at', { ascending: false })
            .limit(15);

        if (error) throw error;

        container.innerHTML = '';
        
        if (notifications.length === 0) {
            container.innerHTML = '<p class="text-sm text-center py-6 text-on-surface-variant">No new notifications.</p>';
            return;
        }

        notifications.forEach(notif => {
            const sender = notif.users;
            const bgClass = notif.is_read ? 'bg-transparent' : 'bg-primary/5';
            
            container.innerHTML += `
                <div class="p-5 border-b border-surface-variant/50 cursor-pointer ${bgClass} hover:bg-surface-variant/20 transition-colors">
                    <div class="flex gap-4 items-center">
                        <img src="${sender.profile_img_url || 'https://via.placeholder.com/150'}" class="w-12 h-12 rounded-full object-cover shrink-0 border border-surface-variant">
                        <div>
                            <p class="text-[14px] text-on-surface leading-snug">
                                <span class="font-extrabold">${sender.full_name}</span> ${notif.message}
                            </p>
                        </div>
                    </div>
                </div>
            `;
        });
    } catch (err) {
        console.error("Failed to load notifications:", err.message);
    }
}

// ==========================================
// 6. UI: TAB SWITCHING & THEME LOGIC
// ==========================================
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.remove('bg-[#006e1c]', 'dark:bg-primary', 'text-white', 'active');
        el.classList.add('text-on-surface-variant', 'hover:bg-surface-variant/40');
        el.querySelector('.material-symbols-outlined').style.fontVariationSettings = "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24";
    });

    const activeNav = document.getElementById('nav-' + tabName);
    if (activeNav) {
        activeNav.classList.remove('text-on-surface-variant', 'hover:bg-surface-variant/40');
        activeNav.classList.add('bg-[#006e1c]', 'dark:bg-primary', 'text-white', 'active');
        activeNav.querySelector('.material-symbols-outlined').style.fontVariationSettings = "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24";
    }

    const targetView = document.getElementById('view-' + tabName);
    if (targetView) {
        targetView.classList.remove('hidden');
        targetView.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
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
// INITIALIZATION ON LOAD
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    checkAuth();
    setupProfileImageUpload();
});
