/****************************************************
 * PURGE GAME - Version finale qui fonctionne
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

// BroadcastChannel pour synchronisation
const channel = new BroadcastChannel('purge_team');

channel.onmessage = (e) => {
  const { type, data } = e.data;
  if (type === 'TEAM_UPDATE' && data.code === state.currentTeam.code) {
    console.log("Mise à jour reçue - Nouveaux joueurs:", data.players.length);
    state.currentTeam.players = data.players;
    saveTeam();
    if (document.getElementById('screen-lobby')?.classList.contains('active')) {
      updateLobbyUI();
    }
  }
};

function broadcastTeam() { 
  channel.postMessage({ 
    type: 'TEAM_UPDATE', 
    data: { code: state.currentTeam.code, players: state.currentTeam.players } 
  }); 
}

// Helpers
function saveUsers() { localStorage.setItem('purge_users', JSON.stringify(state.users)); }
function saveTeam() { 
  if (state.currentTeam.code) {
    localStorage.setItem('purge_team', JSON.stringify(state.currentTeam));
    localStorage.setItem(`team_${state.currentTeam.code}`, JSON.stringify(state.currentTeam));
  }
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

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

// AFFICHAGE ÉCRAN
function showScreen(screenId) {
  console.log("=== AFFICHAGE ÉCRAN:", screenId);
  
  const screens = ['screen-subscribe', 'screen-auth', 'screen-team-choice', 'screen-lobby', 
                   'screen-game1', 'screen-game2', 'screen-game3', 'screen-results'];
  
  screens.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  });
  
  const targetScreen = document.getElementById(screenId);
  if (targetScreen) {
    targetScreen.classList.add('active');
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
  
  console.log("🔄 Mise à jour lobby - Joueurs:", t.players.length);
  
  const onlineCount = document.getElementById('online-count');
  const inviteCode = document.getElementById('invite-code');
  const startGame = document.getElementById('start-game');
  
  if (onlineCount) onlineCount.innerHTML = `(${t.players.length}/4) ${t.players.length === 4 ? '✅ Complet !' : '⏳ En attente...'}`;
  if (inviteCode) inviteCode.textContent = t.code;
  if (startGame) startGame.disabled = t.players.length !== 4;
  
  const membersDiv = document.getElementById('members-list');
  if (membersDiv) {
    if (t.players.length === 0) {
      membersDiv.innerHTML = '<div class="empty-members">👻 Aucun membre pour le moment.<br>Invitez vos amis avec le code !</div>';
    } else {
      membersDiv.innerHTML = t.players.map(p => `
        <div class="member-card">
          <div class="member-avatar">
            <img src="${p.avatar || 'https://i.pravatar.cc/150?img=7'}" style="width:60px;height:60px;border-radius:50%;object-fit:cover;">
            ${p.phone === state.user?.phone ? '<span class="owner-badge">👑</span>' : ''}
          </div>
          <span class="member-name">${escapeHtml(p.pseudo)}</span>
          <span class="member-phone">${p.phone ? p.phone.substring(0, 10) + '...' : ''}</span>
        </div>
      `).join('');
    }
  }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
  console.log("=== PAGE CHARGÉE ===");
  
  // Vérifier si une équipe existe déjà pour l'utilisateur
  const savedTeam = localStorage.getItem('purge_team');
  if (savedTeam) {
    try {
      const team = JSON.parse(savedTeam);
      if (team.players && team.players.length > 0) {
        state.currentTeam = team;
      }
    } catch(e) {}
  }
  
  // ÉTAPE 1: Abonnement
  const verifyBtn = document.getElementById('verify-subscription');
  if (verifyBtn) {
    verifyBtn.onclick = () => {
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
      console.log("📝 INSCRIPTION");
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
      
      showScreen('screen-team-choice');
      updateChoiceUI();
    };
  }
  
  // CONNEXION
  const loginBtn = document.getElementById('login-btn');
  if (loginBtn) {
    loginBtn.onclick = () => {
      console.log("🔐 CONNEXION");
      const phone = document.getElementById('login-phone').value.trim();
      const pseudo = document.getElementById('login-pseudo').value.trim();
      const user = state.users.find(u => u.phone === phone && u.pseudo.toLowerCase() === pseudo.toLowerCase());
      
      if (!user) {
        alert("Identifiants incorrects");
        return;
      }
      
      state.user = user;
      
      // Vérifier si l'utilisateur était dans une équipe
      if (state.currentTeam.players && state.currentTeam.players.find(p => p.phone === user.phone)) {
        showScreen('screen-lobby');
        updateLobbyUI();
      } else {
        showScreen('screen-team-choice');
        updateChoiceUI();
      }
    };
  }
  
  // CRÉER UNE ÉQUIPE
  const createTeamBtn = document.getElementById('create-team-btn');
  if (createTeamBtn) {
    createTeamBtn.onclick = () => {
      console.log("✨ CRÉER ÉQUIPE");
      const newCode = generateTeamCode();
      state.currentTeam = { code: newCode, players: [state.user] };
      saveTeam();
      broadcastTeam();
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
      console.log("🔗 REJOINDRE ÉQUIPE");
      const code = document.getElementById('choice-join-code').value.toUpperCase().trim();
      if (!code) {
        alert("Entrez un code d'invitation");
        return;
      }
      
      // Chercher l'équipe dans localStorage
      let existingTeam = localStorage.getItem(`team_${code}`);
      
      if (existingTeam) {
        state.currentTeam = JSON.parse(existingTeam);
        console.log("Équipe trouvée avec", state.currentTeam.players.length, "joueurs");
      } else {
        // Si l'équipe n'existe pas, la créer
        state.currentTeam = { code: code, players: [] };
        console.log("Nouvelle équipe créée avec code:", code);
      }
      
      // Vérifier si l'équipe est pleine
      if (state.currentTeam.players.length >= 4) {
        alert("❌ Cette équipe est déjà complète (4/4) !");
        return;
      }
      
      // Vérifier si le joueur est déjà dans l'équipe
      if (!state.currentTeam.players.find(p => p.phone === state.user.phone)) {
        state.currentTeam.players.push(state.user);
        console.log("✅ Joueur ajouté:", state.user.pseudo);
        console.log("👥 Nombre total de joueurs:", state.currentTeam.players.length);
        
        saveTeam();
        broadcastTeam();
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
          broadcastTeam();
          updateLobbyUI();
        }
      }
    };
  }
  
  // DÉCONNEXION (lobby)
  const lobbyLogout = document.getElementById('lobby-logout-btn');
  if (lobbyLogout) {
    lobbyLogout.onclick = () => {
      // Enlever le joueur de l'équipe
      if (state.currentTeam.players) {
        state.currentTeam.players = state.currentTeam.players.filter(p => p.phone !== state.user?.phone);
        if (state.currentTeam.players.length === 0) {
          localStorage.removeItem(`team_${state.currentTeam.code}`);
          state.currentTeam = { code: null, players: [] };
        } else {
          saveTeam();
          broadcastTeam();
        }
      }
      state.user = null;
      showScreen('screen-auth');
    };
  }
  
  // COPIER CODE
  const copyBtn = document.getElementById('copy-code-btn');
  if (copyBtn) {
    copyBtn.onclick = () => {
      if (state.currentTeam.code) {
        navigator.clipboard.writeText(state.currentTeam.code);
        alert("✅ Code copié !");
      }
    };
  }
  
  // LANCER LE JEU 1
  const startGame = document.getElementById('start-game');
  if (startGame) {
    startGame.onclick = () => {
      if (state.currentTeam.players.length === 4) {
        console.log("🎮 LANCEMENT DU JEU");
        startGame1();
      } else {
        alert(`Il faut 4 joueurs pour commencer ! Actuellement: ${state.currentTeam.players.length}/4`);
      }
    };
  }
  
  // ADMIN (version simplifiée)
  const showAdminBtn = document.getElementById('show-admin-btn');
  const closeAdmin = document.getElementById('close-admin');
  
  if (showAdminBtn) {
    showAdminBtn.onclick = () => {
      const panel = document.getElementById('admin-panel');
      if (panel) panel.classList.toggle('hidden');
    };
  }
  
  if (closeAdmin) {
    closeAdmin.onclick = () => {
      const panel = document.getElementById('admin-panel');
      if (panel) panel.classList.add('hidden');
    };
  }
  
  console.log("=== INITIALISATION TERMINÉE ===");
});

// ========== FONCTIONS DU JEU ==========

function startGame1() {
  console.log("🎮 Début du Jeu 1");
  state.game1.round = 1;
  state.game1.playerDebts = {};
  state.currentTeam.players.forEach(p => state.game1.playerDebts[p.phone] = 0);
  showScreen('screen-game1');
  loadQuestion();
}

function loadQuestion() {
  if (typeof GAME1_QUESTIONS === 'undefined') {
    console.error("GAME1_QUESTIONS non défini");
    return;
  }
  
  const q = GAME1_QUESTIONS[(state.game1.round - 1) % GAME1_QUESTIONS.length];
  
  const questionText = document.getElementById('question-text');
  const roundCurrent = document.getElementById('round-current');
  const playersAnswers = document.getElementById('players-answers');
  const validateRound = document.getElementById('validate-round');
  
  if (questionText) questionText.textContent = q.question;
  if (roundCurrent) roundCurrent.textContent = state.game1.round;
  
  if (playersAnswers) {
    playersAnswers.innerHTML = '';
    state.currentTeam.players.forEach((p, i) => {
      playersAnswers.innerHTML += `
        <div class="answer-box">
          <img src="${p.avatar}" style="width:45px;height:45px;border-radius:50%;object-fit:cover;">
          <div><strong>${escapeHtml(p.pseudo)}</strong></div>
          <input type="text" id="answer-${i}" placeholder="Votre réponse...">
        </div>
      `;
    });
  }
  
  if (validateRound) validateRound.disabled = false;
  startTimer(60);
}

function startTimer(seconds) {
  let timeLeft = seconds;
  const timerEl = document.getElementById('timer');
  
  if (window.gameTimer) clearInterval(window.gameTimer);
  
  window.gameTimer = setInterval(() => {
    timeLeft--;
    const sec = timeLeft < 10 ? '0' + timeLeft : timeLeft;
    if (timerEl) timerEl.textContent = `00:${sec}`;
    
    if (timeLeft <= 0) {
      clearInterval(window.gameTimer);
      validateGame1Round();
    }
  }, 1000);
}

function validateGame1Round() {
  console.log("✅ Validation manche", state.game1.round);
  
  const answers = [];
  
  state.currentTeam.players.forEach((p, i) => {
    const input = document.getElementById(`answer-${i}`);
    const answer = input ? input.value.trim().toLowerCase() : '';
    answers.push({ player: p, answer: answer });
  });
  
  const count = {};
  answers.forEach(a => {
    if (a.answer.length > 0) {
      count[a.answer] = (count[a.answer] || 0) + 1;
    }
  });
  
  let minoritaire = null;
  let minCount = Infinity;
  
  for (let [rep, c] of Object.entries(count)) {
    if (c < minCount && c >= 1) {
      minCount = c;
      minoritaire = rep;
    }
  }
  
  if (minoritaire) {
    const loser = answers.find(a => a.answer === minoritaire);
    if (loser) {
      state.game1.playerDebts[loser.player.phone] = (state.game1.playerDebts[loser.player.phone] || 0) + 500;
      alert(`⚠️ ${loser.player.pseudo} a donné une réponse minoritaire ! +500 dettes`);
    }
  } else {
    alert("🤝 Tout le monde a répondu la même chose !");
  }
  
  state.game1.round++;
  
  if (state.game1.round <= 5) {
    loadQuestion();
  } else {
    // Fin du jeu 1 - déterminer le perdant
    const phones = Object.keys(state.game1.playerDebts);
    if (phones.length > 0) {
      const max = phones.reduce((a, b) => state.game1.playerDebts[a] > state.game1.playerDebts[b] ? a : b);
      const total = Object.values(state.game1.playerDebts).reduce((s, x) => s + x, 0);
      const loser = state.currentTeam.players.find(p => p.phone === max);
      alert(`💀 ${loser?.pseudo} est le GRAND PERDANT avec ${total} dettes ! 💀`);
    }
    showScreen('screen-game2');
    initGame2();
  }
}

function initGame2() {
  console.log("🎮 Début du Jeu 2");
  state.game2.currentImgIndex = 0;
  state.game2.positions = {};
  state.currentTeam.players.forEach(p => state.game2.positions[p.phone] = 0);
  
  const nextBtn = document.getElementById('next-game2');
  if (nextBtn) nextBtn.classList.add('hidden');
  
  loadDevineImage();
}

function loadDevineImage() {
  if (typeof GAME2_IMAGES === 'undefined') {
    console.error("GAME2_IMAGES non défini");
    return;
  }
  
  const img = GAME2_IMAGES[state.game2.currentImgIndex % GAME2_IMAGES.length];
  
  const devineImg = document.getElementById('devine-img');
  const devineQuestion = document.getElementById('devine-question');
  
  if (devineImg) devineImg.src = img.img;
  if (devineQuestion) devineQuestion.textContent = img.description;
}

function submitDevine() {
  const answer = document.getElementById('devine-input')?.value.trim().toLowerCase() || '';
  if (typeof GAME2_IMAGES === 'undefined') return;
  
  const current = GAME2_IMAGES[state.game2.currentImgIndex % GAME2_IMAGES.length];
  const correct = answer === current.personnage.toLowerCase();
  
  state.currentTeam.players.forEach(p => {
    state.game2.positions[p.phone] = (state.game2.positions[p.phone] || 0) + (correct ? 2 : 1);
  });
  
  alert(correct ? "✅ Bonne réponse ! +2 positions" : "❌ Mauvaise réponse ! +1 position");
  nextDevine();
}

function voteBlanc() {
  state.currentTeam.players.forEach(p => {
    state.game2.positions[p.phone] = (state.game2.positions[p.phone] || 0) + 1;
  });
  alert("⚪ Bulletin blanc ! +1 position pour tout le monde");
  nextDevine();
}

function nextDevine() {
  state.game2.currentImgIndex++;
  
  if (state.game2.currentImgIndex < 3) {
    const input = document.getElementById('devine-input');
    if (input) input.value = '';
    loadDevineImage();
  } else {
    const positions = Object.entries(state.game2.positions).sort((a, b) => b[1] - a[1]);
    const loser = state.currentTeam.players.find(p => p.phone === positions[0][0]);
    alert(`💀 ${loser?.pseudo} a perdu le jeu 2 avec ${positions[0][1]} points ! 💀`);
    
    const nextBtn = document.getElementById('next-game2');
    if (nextBtn) nextBtn.classList.remove('hidden');
  }
}

function finishGame() {
  console.log("🏆 FIN DU JEU");
  const score = 1200;
  const win = score >= 1000;
  
  const finalScore = document.getElementById('final-score');
  const winReward = document.getElementById('win-reward');
  const loseBan = document.getElementById('lose-ban');
  const groupSize = document.getElementById('group-size');
  
  if (finalScore) finalScore.textContent = `Score: ${score}`;
  
  if (win) {
    if (winReward) winReward.classList.remove('hidden');
    if (loseBan) loseBan.classList.add('hidden');
    if (groupSize) groupSize.textContent = "300";
  } else {
    if (winReward) winReward.classList.add('hidden');
    if (loseBan) loseBan.classList.remove('hidden');
    localStorage.setItem('purge_ban', new Date(Date.now() + 7 * 86400000).toISOString());
  }
  
  showScreen('screen-results');
}

// Boutons du jeu
document.addEventListener('click', (e) => {
  if (e.target.id === 'validate-round') validateGame1Round();
  if (e.target.id === 'submit-devine') submitDevine();
  if (e.target.id === 'vote-blanc') voteBlanc();
  if (e.target.id === 'next-game2') {
    showScreen('screen-game3');
  }
  if (e.target.id === 'finish-game3') finishGame();
  if (e.target.id === 'play-again') { 
    localStorage.clear(); 
    location.reload(); 
  }
  if (e.target.id === 'g1-back') {
    if (window.gameTimer) clearInterval(window.gameTimer);
    showScreen('screen-lobby');
  }
  if (e.target.id === 'g2-back') showScreen('screen-lobby');
});
