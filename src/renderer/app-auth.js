// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', async () => {
    if (window.lucide) lucide.createIcons();
    const rememberedUser = localStorage.getItem('rememberedUser');
    const sessionUser = sessionStorage.getItem('currentUser');
    const raw = rememberedUser || sessionUser;
    if (raw) {
        try {
            currentUser = JSON.parse(raw);
            showApp();
        } catch {
            localStorage.removeItem('rememberedUser');
            sessionStorage.removeItem('currentUser');
        }
    }

    // Keyboard shortcuts from main process (tray, globalShortcut)
    if (window.electronAPI?.onShortcut) {
        window.electronAPI.onShortcut('newDoc', type => {
            createDocOfType(type || 'facture');
        });
        window.electronAPI.onShortcut('navigate', page => {
            navigateTo(page || 'dashboard');
        });
        window.electronAPI.onShortcut('focusSearch', () => {
            const el = document.getElementById('globalSearch');
            if (el) {
                el.focus();
                el.select();
            }
        });
    }

    // In-app keyboard shortcuts
    document.addEventListener('keydown', e => {
        // POS shortcuts
        if (e.key === 'F1') {
            if (document.getElementById('page-pos')?.classList.contains('active')) {
                e.preventDefault();
                posToggleFullscreen();
            }
        }
        if (e.key === 'F2') {
            const barcodeInput = document.getElementById('posBarcodeInput');
            if (barcodeInput && document.getElementById('page-pos')?.classList.contains('active')) {
                e.preventDefault();
                barcodeInput.focus();
                barcodeInput.select();
            }
        }
        if (e.key === 'F3') {
            if (document.getElementById('page-pos')?.classList.contains('active')) {
                e.preventDefault();
                posToggleTTCMode();
            }
        }
        if (e.key === 'F4') {
            if (document.getElementById('page-pos')?.classList.contains('active')) {
                e.preventDefault();
                posToggleTodaySales();
            }
        }
        if (e.key === 'F5') {
            if (document.getElementById('page-pos')?.classList.contains('active')) {
                e.preventDefault();
                posXReport();
            }
        }
        if (e.key === 'F6') {
            if (document.getElementById('page-pos')?.classList.contains('active')) {
                e.preventDefault();
                posShowFavorites();
            }
        }
        if (e.key === 'F7') {
            if (document.getElementById('page-pos')?.classList.contains('active')) {
                e.preventDefault();
                posOpenCreateProduct();
            }
        }
        if (e.key === 'F8') {
            if (document.getElementById('page-pos')?.classList.contains('active')) {
                e.preventDefault();
                posAddCashMove();
            }
        }
        if (e.key === 'Escape') {
            const activeModal = document.querySelector('.modal-overlay.active');
            if (activeModal) {
                const closeBtn = activeModal.querySelector('.modal-close');
                if (closeBtn) closeBtn.click();
            }
        }
        // Ctrl+S saves document
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            const docPage = document.getElementById('page-new-document');
            if (docPage && docPage.classList.contains('active')) {
                e.preventDefault();
                const saveBtn = document.getElementById('saveBtn');
                if (saveBtn && saveBtn.onclick) saveBtn.onclick();
            }
        }
    });
});
// ==================== AUTH ====================
function switchAuthTab(tab, btn) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    if (btn) btn.classList.add('active');

    if (tab === 'forgot') {
        document.getElementById('forgotForm').classList.add('active');
    } else {
        document.getElementById(tab === 'login' ? 'loginForm' : 'registerForm').classList.add('active');
    }
    hideError();
}
function hideError() {
    document.getElementById('authError').classList.add('hidden');
}
function showError(msg) {
    document.getElementById('errorText').textContent = msg;
    document.getElementById('authError').classList.remove('hidden');
}

function togglePasswordVisibility(btn) {
    const wrap = btn.closest('.password-wrap');
    const input = wrap.querySelector('input');
    if (!input) return;
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    // Lucide replaces <i> with <svg> on first render, so handle both
    const icon = btn.querySelector('i') || btn.querySelector('svg');
    if (icon) icon.setAttribute('data-lucide', isPassword ? 'eye-off' : 'eye');
    if (window.lucide) lucide.createIcons();
}

async function handleLogin(e) {
    e.preventDefault();
    hideError();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader" class="lucide-sm spin"></i> Connexion...';
    if (window.lucide) lucide.createIcons();
    try {
        const result = await window.electronAPI.authLogin({
            email: document.getElementById('loginEmail').value.trim(),
            password: document.getElementById('loginPassword').value
        });
        if (result.success) {
            const safeUser = {
                id: result.user.id || result.user._id,
                name: result.user.name || 'User',
                email: result.user.email,
                company: result.user.company || '',
                mf: result.user.mf || ''
            };
            currentUser = safeUser;
            if (document.getElementById('rememberMe')?.checked) localStorage.setItem('rememberedUser', JSON.stringify(safeUser));
            else localStorage.removeItem('rememberedUser');
            sessionStorage.setItem('currentUser', JSON.stringify(safeUser));
            showApp();
        } else {
            showError(result.error || 'Identifiants incorrects');
        }
    } catch {
        showError('Erreur de connexion. Veuillez réessayer.');
    } finally {
        btn.disabled = false;
        btn.textContent = '🔐 Se connecter';
    }
}

async function handleForgotPassword(e) {
    e.preventDefault();
    hideError();
    const btn = e.target.querySelector('button[type="submit"]');
    const email = document.getElementById('forgotEmail').value.trim();
    const masterKey = document.getElementById('forgotMasterKey').value.trim();
    const newPassword = document.getElementById('forgotNewPassword').value;

    if (newPassword.length < 6) return showError('Minimum 6 caractères');

    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader" class="lucide-sm spin"></i> Réinitialisation...';
    if (window.lucide) lucide.createIcons();
    try {
        const result = await window.electronAPI.authResetPasswordMasterKey({ email, masterKey, newPassword });
        if (result.success) {
            showToast('Mot de passe réinitialisé !', 'success', 5000);
            document.getElementById('forgotForm').reset();
            switchAuthTab('login', document.querySelector('.auth-tab'));
            document.getElementById('loginEmail').value = email;
        } else {
            showError(result.error || 'Clé ou email incorrect');
        }
    } catch (err) {
        showError('Erreur lors de la réinitialisation.');
    } finally {
        btn.disabled = false;
        btn.textContent = '🔑 Réinitialiser le mot de passe';
    }
}

async function handleRegister(e) {
    e.preventDefault();
    hideError();
    const password = document.getElementById('regPassword').value;
    const passwordConfirm = document.getElementById('regPasswordConfirm').value;
    if (password !== passwordConfirm) return showError('Les mots de passe ne correspondent pas');
    if (password.length < 6) return showError('Minimum 6 caractères');
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader" class="lucide-sm spin"></i> Création...';
    if (window.lucide) lucide.createIcons();
    try {
        const result = await window.electronAPI.authRegister({
            name: document.getElementById('regName').value.trim(),
            email: document.getElementById('regEmail').value.trim(),
            company: document.getElementById('regCompany').value.trim(),
            mf: document.getElementById('regMF').value.trim(),
            password
        });
        if (result.success) {
            const mKey = result.user.masterKey;
            showConfirm(
                '🔑 ATTENTION: Clé de Récupération',
                `<div style="text-align:left;font-size:0.9rem">
                    <p style="margin-bottom:10px;color:#ef4444;font-weight:bold">Veuillez sauvegarder cette clé immédiatement !</p>
                    <p style="margin-bottom:10px">Factarlou est 100% hors-ligne. Si vous oubliez votre mot de passe, <b>CETTE CLÉ EST LE SEUL MOYEN</b> de récupérer votre compte.</p>
                    <div style="background:#f3f4f6;padding:12px;border-radius:6px;font-family:monospace;font-size:1.2rem;text-align:center;font-weight:bold;letter-spacing:2px;color:#1e3a8a;user-select:all;margin-bottom:10px">${mKey}</div>
                    <p style="font-size:0.8rem;color:#6b7280">Copiez cette clé et gardez-la dans un endroit sûr (ex: gestionnaire de mots de passe, ou imprimée).</p>
                </div>`,
                () => {
                    showToast('Compte créé ! Veuillez vous connecter.', 'success', 5000);
                    switchAuthTab('login', document.querySelector('.auth-tab.active'));
                    document.getElementById('loginEmail').value = document.getElementById('regEmail').value.trim();
                },
                "J'ai bien sauvegardé ma clé",
                'btn-primary'
            );
        } else {
            showError(result.error || 'Erreur lors de la création');
        }
    } catch {
        showError('Erreur serveur.');
    } finally {
        btn.disabled = false;
        btn.textContent = '📝 Créer mon compte';
    }
}

function confirmLogout() {
    showConfirm('🚪 Déconnexion', 'Tout document non sauvegardé sera perdu. Continuer ?', logout, 'Déconnexion');
}
function logout() {
    currentUser = null;
    localStorage.removeItem('rememberedUser');
    sessionStorage.removeItem('currentUser');
    document.getElementById('appContainer').classList.add('hidden');
    document.getElementById('authContainer').classList.remove('hidden');
    document.getElementById('loginForm').reset();
    document.getElementById('registerForm').reset();
}
async function showApp() {
    document.getElementById('authContainer').classList.add('hidden');
    document.getElementById('appContainer').classList.remove('hidden');
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userEmail').textContent = currentUser.email;
    document.getElementById('userAvatar').textContent = currentUser.name.charAt(0).toUpperCase();
    const hour = new Date().getHours();
    document.getElementById('dashboardGreeting').textContent = `${hour < 18 ? 'Bonjour' : 'Bonsoir'}, ${currentUser.name.split(' ')[0]} 👋`;
    // Load user settings (decimal places, rounding, document theme)
    await loadUserFormatSettings();
    await loadDocumentTheme();
    await loadAppVersion();
    loadDashboard();
    initNewDocument();
    // Restore last visited page
    const lastPage = localStorage.getItem('tuni_last_page');
    if (lastPage && lastPage !== 'login' && lastPage !== 'register') {
        setTimeout(() => navigateTo(lastPage), 100);
    }
}

async function loadAppVersion() {
    try {
        const v = await window.electronAPI.getAppVersion();
        console.log('[App] Version:', v);
        const el = document.getElementById('appVersion');
        if (el && v) el.textContent = `v${v}`;
    } catch (e) {
        console.error('[App] Failed to load version:', e);
    }
}
// ==================== NAVIGATION ====================
function navigateTo(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const pageEl = document.getElementById(`page-${page}`);
    if (!pageEl) return;
    pageEl.classList.add('active');

    // Highlight the active nav item
    const navItem = document.querySelector(`.nav-item[onclick*="navigateTo('${page}')"]`);
    if (navItem) navItem.classList.add('active');

    if (page === 'dashboard') loadDashboard();
    if (page === 'documents') loadDocuments();
    if (page === 'clients') loadClients();
    if (page === 'fournisseurs') loadFournisseurs();
    if (page === 'services') loadServices();
    if (page === 'pos') loadPOS();
    else document.body.classList.remove('pos-mode');
    if (page === 'company') loadCompanyPage();
    if (page === 'contracts') loadContracts();
    if (page === 'achat') loadAchats();
    if (page === 'hr') loadHR();
    if (page === 'retenues') loadRetenues();
    if (page === 'outils') {
        document.getElementById('relanceFactureSelect').style.display = 'none';
        document.getElementById('fiscalPeriodSelect').style.display = 'none';
    }
    if (page === 'notes') loadNotes();
    if (page === 'reminders') loadReminders();
    if (page === 'documents') updateBreadcrumb('Tous les documents');
    if (page === 'new-document') updateBreadcrumb(getDocTypeLabel(currentDocType) + ' — Nouveau');
    if (page === 'audit-log') loadAuditLog();
    if (page === 'annual') loadAnnualReport();
    if (page === 'settings') {
        loadSettings();
        loadSerialSettings();
        loadThemeSettings();
        loadDocumentThemeSettings();
        loadFormatSettings();
        loadRecurringInvoices();
        restoreSettingsTab();
    }
    try {
        localStorage.setItem('tuni_last_page', page);
    } catch {}
}

function createDocOfType(type) {
    currentDocType = type;
    try {
        localStorage.setItem('tuni_last_doc_type', currentDocType);
    } catch {}
    document.querySelectorAll('input[name="docType"]').forEach(r => (r.checked = r.value === type));
    updateDocType();
    navigateTo('new-document');
}
// ==================== CHANGE PASSWORD ====================
function openChangePasswordModal() {
    document.getElementById('cpOldPassword').value = '';
    document.getElementById('cpNewPassword').value = '';
    document.getElementById('cpConfirmPassword').value = '';
    document.getElementById('changePasswordModal').classList.add('active');
}
function closeChangePasswordModal() {
    document.getElementById('changePasswordModal').classList.remove('active');
}

async function saveNewPassword() {
    const oldPw = document.getElementById('cpOldPassword').value;
    const newPw = document.getElementById('cpNewPassword').value;
    const confPw = document.getElementById('cpConfirmPassword').value;
    if (!oldPw || !newPw) {
        showToast('Tous les champs sont requis', 'warning');
        return;
    }
    if (newPw !== confPw) {
        showToast('Les mots de passe ne correspondent pas', 'warning');
        return;
    }
    if (newPw.length < 6) {
        showToast('Minimum 6 caractères', 'warning');
        return;
    }
    try {
        const r = await window.electronAPI.changePassword({ userId: currentUser.id, oldPassword: oldPw, newPassword: newPw });
        if (r.success) {
            showToast('Mot de passe modifié avec succès', 'success');
            closeChangePasswordModal();
        } else showToast(r.error || 'Erreur', 'error');
    } catch {
        showToast('Erreur', 'error');
    }
}
// ==================== SIDEBAR TOGGLE ====================
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (window.innerWidth <= 900) {
        sidebar.classList.toggle('open');
    } else {
        const container = document.getElementById('appContainer');
        const isCollapsed = container.classList.toggle('sidebar-collapsed');
        try {
            localStorage.setItem('tuni_sidebar_collapsed', isCollapsed ? '1' : '0');
        } catch {}
    }
}
// Close sidebar on nav click for mobile
document.addEventListener('click', e => {
    if (window.innerWidth <= 900 && !e.target.closest('.sidebar') && !e.target.closest('.hamburger-btn')) {
        document.querySelector('.sidebar')?.classList.remove('open');
    }
});
// Restore sidebar state
document.addEventListener('DOMContentLoaded', () => {
    try {
        if (localStorage.getItem('tuni_sidebar_collapsed') === '1') {
            document.getElementById('appContainer').classList.add('sidebar-collapsed');
        }
    } catch {}
});

// ==================== HOOK showApp to init new features ====================
const _origShowApp = window.showApp;
window.showApp = async function () {
    if (_origShowApp) _origShowApp.apply(this, arguments);
    // Init updater listener after login
    setTimeout(() => {
        initUpdaterListener();
        loadAppVersion();
    }, 500);
};
