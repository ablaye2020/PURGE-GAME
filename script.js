/****************************************************
 * PURGE GAME - Version simplifiée
 ****************************************************/

// État
const state = {
  user: null,
  users: JSON.parse(localStorage.getItem('purge_users') || '[]'),
  currentTeam: { code: null, players: [] },
  game1: { round: 0, playerDebts: {} },
  game2: { currentImgIndex: 0, positions: {} }
};

const OWNER_PHONE = "+24160248210";
let ADMIN_LIST = ["+221708137251","+221769426236","+22897173547","+2250777315113","+50946801238"];

// Helpers
function saveUsers() { localStorage.setItem('purge_users', JSON.stringify(state.users)); }
function saveTeam() { 
  if (state.currentTeam.code) localStorage.setItem('purge_team', JSON.stringify(state.currentTeam));
}

function isValidPhone(phone) {
  return /^\+\d{8,15}$/.test(phone);
}

function generateTeamCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// AFFICHAGE ÉCRAN - VERSION SIMPLIFIÉE
function showScreen(screenId) {
  console.log("=== AFFICHAGE ÉCRAN:", screenId);
  
  // Cacher tous les écrans
  const screens = ['screen-subscribe', 'screen-auth', 'screen-team-choice', 'screen-lobby', 
                   'screen-game1', 'screen-game2', 'screen-game3', 'screen-results'];
  
  screens.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  });
  
  // Afficher l'écran demandé
  const targetScreen = document.getElementById(screenId);
  if (targetScreen) {
    targetScreen.classList.add('active');
    console.log("✅ Écran affiché:", screenId);
  } else {
    console.error("❌ Écran introuvable:", screenId);
  }
}

// Mise à jour du mini profil
function updateChoiceUI() {
  if (state.user) {
    const avatar = document.getElementById('choice-user-avatar');
    const pseudo = document.getElementById('choice-user-pseudo');
    if (avatar) avatar.src = state.user.avatar;
    if (pseudo) pseudo.textContent = state.user.pseudo;
  }
}

// Mise à jour du lobby
function updateLobbyUI() {
  const t = state.currentTeam;
  if (!t || !t.players) return;
  
  const onlineCount = document.getElementById('online-count');
  const inviteCode = document.getElementById('invite-code');
  const startGame = document.getElementById('start-game');
  
  if (onlineCount) onlineCount.innerHTML = `(${t.players.length}/4)`;
  if (inviteCode) inviteCode.textContent = t.code;
  if (startGame) startGame.disabled = t.players.length !== 4;
  
  const membersDiv = document.getElementById('members-list');
  if (membersDiv) {
    membersDiv.innerHTML = t.players.map(p => `
      <div class="member-card">
        <div class="member-avatar">
          <img src="${p.avatar || 'https://i.pravatar.cc/150?img=7'}" style="width:60px;height:60px;border-radius:50%;">
          ${p.phone === state.user?.phone ? '<span class="owner-badge">👑</span>' : ''}
        </div>
        <span class="member-name">${p.pseudo}</span>
      </div>
    `).join('');
  }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
  console.log("=== PAGE CHARGÉE ===");
  
  // ÉTAPE 1: Abonnement
  const verifyBtn = document.getElementById('verify-subscription');
  if (verifyBtn) {
    verifyBtn.onclick = () => {
      console.log("Bouton CONTINUER cliqué");
      showScreen('screen-auth');
    };
  }
  
  // Tabs Connexion/Inscription
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.onclick = () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const loginForm = document.getElementById('login-form');
      const registerForm = document.getElementById('register-form');
      if (tab.dataset.tab === 'login') {
        if (loginForm) loginForm.classList.add('active');
        if (registerForm) registerForm.classList.remove('active');
      } else {
        if (loginForm) loginForm.classList.remove('active');
        if (registerForm) registerForm.classList.add('active');
      }
    };
  });
  
  // VÉRIFICATION NUMÉRO (Inscription)
  const regVerifyBtn = document.getElementById('reg-verify-phone');
  if (regVerifyBtn) {
    regVerifyBtn.onclick = () => {
      const phone = document.getElementById('reg-phone').value.trim();
      const status = document.getElementById('phone-status');
      const registerBtn = document.getElementById('register-btn');
      if (isValidPhone(phone)) {
        if (status) status.innerHTML = '✅ Vérifié';
        if (registerBtn) registerBtn.disabled = false;
      } else {
        if (status) status.innerHTML = '❌ Numéro invalide (ex: +241612345678)';
        if (registerBtn) registerBtn.disabled = true;
      }
    };
  }
  
  // UPLOAD PHOTO
  const avatarFile = document.getElementById('reg-avatar-file');
  if (avatarFile) {
    avatarFile.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const preview = document.getElementById('reg-avatar-preview');
          if (preview) preview.src = ev.target.result;
        };
        reader.readAsDataURL(file);
      }
    };
  }
  
  // INSCRIPTION
  const registerBtn = document.getElementById('register-btn');
  if (registerBtn) {
    registerBtn.onclick = () => {
      console.log("INSCRIPTION");
      const phone = document.getElementById('reg-phone').value.trim();
      const pseudo = document.getElementById('reg-pseudo').value.trim();
      const avatar = document.getElementById('reg-avatar-preview').src;
      
      if (!phone || !pseudo || !isValidPhone(phone)) {
        alert("Numéro invalide ou pseudo manquant");
        return;
      }
      if (state.users.find(u => u.phone === phone)) {
        alert("Numéro déjà utilisé");
        return;
      }
      
      const user = { phone, pseudo, avatar, score: 0 };
      state.users.push(user);
      saveUsers();
      state.user = user;
      console.log("Utilisateur créé:", user);
      
      // Afficher l'écran de choix d'équipe
      showScreen('screen-team-choice');
      updateChoiceUI();
    };
  }
  
  // CONNEXION
  const loginBtn = document.getElementById('login-btn');
  if (loginBtn) {
    loginBtn.onclick = () => {
      console.log("CONNEXION");
      const phone = document.getElementById('login-phone').value.trim();
      const pseudo = document.getElementById('login-pseudo').value.trim();
      const user = state.users.find(u => u.phone === phone && u.pseudo.toLowerCase() === pseudo.toLowerCase());
      
      if (!user) {
        alert("Identifiants incorrects");
        return;
      }
      
      state.user = user;
      console.log("Utilisateur connecté:", user);
      
      // Afficher l'écran de choix d'équipe
      showScreen('screen-team-choice');
      updateChoiceUI();
    };
  }
  
  // CRÉER UNE ÉQUIPE
  const createTeamBtn = document.getElementById('create-team-btn');
  if (createTeamBtn) {
    createTeamBtn.onclick = () => {
      console.log("CRÉER ÉQUIPE");
      const newCode = generateTeamCode();
      state.currentTeam = { code: newCode, players: [state.user] };
      saveTeam();
      localStorage.setItem(`team_${newCode}`, JSON.stringify(state.currentTeam));
      showScreen('screen-lobby');
      updateLobbyUI();
    };
  }
  
  // AFFICHER FORMULAIRE REJOINDRE
  const showJoinBtn = document.getElementById('show-join-team-btn');
  if (showJoinBtn) {
    showJoinBtn.onclick = () => {
      const section = document.getElementById('join-team-section');
      if (section) section.classList.toggle('hidden');
    };
  }
  
  // REJOINDRE UNE ÉQUIPE
  const choiceJoinBtn = document.getElementById('choice-join-btn');
  if (choiceJoinBtn) {
    choiceJoinBtn.onclick = () => {
      console.log("REJOINDRE ÉQUIPE");
      const code = document.getElementById('choice-join-code').value.toUpperCase().trim();
      if (!code) return;
      
      const existingTeam = localStorage.getItem(`team_${code}`);
      if (existingTeam) {
        state.currentTeam = JSON.parse(existingTeam);
      } else {
        state.currentTeam = { code: code, players: [] };
      }
      
      if (state.currentTeam.players.length >= 4) {
        alert("Cette équipe est déjà complète !");
        return;
      }
      
      if (!state.currentTeam.players.find(p => p.phone === state.user.phone)) {
        state.currentTeam.players.push(state.user);
        saveTeam();
        localStorage.setItem(`team_${state.currentTeam.code}`, JSON.stringify(state.currentTeam));
      }
      
      showScreen('screen-lobby');
      updateLobbyUI();
    };
  }
  
  // DÉCONNEXION (écran choix)
  const choiceLogout = document.getElementById('choice-logout');
  if (choiceLogout) {
    choiceLogout.onclick = () => {
      state.user = null;
      state.currentTeam = { code: null, players: [] };
      showScreen('screen-auth');
    };
  }
  
  // QUITTER L'ÉQUIPE (lobby)
  const leaveTeam = document.getElementById('leave-team');
  if (leaveTeam) {
    leaveTeam.onclick = () => {
      if (confirm("Quitter l'équipe ?")) {
        state.currentTeam.players = state.currentTeam.players.filter(p => p.phone !== state.user.phone);
        if (state.currentTeam.players.length === 0) {
          localStorage.removeItem(`team_${state.currentTeam.code}`);
          state.currentTeam = { code: null, players: [] };
          showScreen('screen-team-choice');
        } else {
          saveTeam();
          localStorage.setItem(`team_${state.currentTeam.code}`, JSON.stringify(state.currentTeam));
          updateLobbyUI();
        }
      }
    };
  }
  
  // DÉCONNEXION (lobby)
  const lobbyLogout = document.getElementById('lobby-logout-btn');
  if (lobbyLogout) {
    lobbyLogout.onclick = () => {
      state.user = null;
      state.currentTeam = { code: null, players: [] };
      showScreen('screen-auth');
    };
  }
  
  // COPIER CODE
  const copyBtn = document.getElementById('copy-code-btn');
  if (copyBtn) {
    copyBtn.onclick = () => {
      if (state.currentTeam.code) {
        navigator.clipboard.writeText(state.currentTeam.code);
        alert("Code copié !");
      }
    };
  }
  
  // LANCER LE JEU (à compléter plus tard)
  const startGame = document.getElementById('start-game');
  if (startGame) {
    startGame.onclick = () => {
      alert("Jeu en cours de développement...");
    };
  }
  
  console.log("=== INITIALISATION TERMINÉE ===");
});
