/****************************************************
 * PURGE GAME - Version Firebase Complète
 ****************************************************/

// État
const state = {
  user: null,
  users: JSON.parse(localStorage.getItem('purge_users') || '[]'),
  currentTeam: { code: null, players: [] },
  game1: { round: 0, playerDebts: {} },
  game2: { currentImgIndex: 0, positions: {} }
};

let teamListener = null;

// ========== LISTE ADMINS ==========
let ADMIN_LIST = ["+221708137251","+221769426236","+22897173547","+2250777315113","+50946801238"];
const OWNER_PHONE = "+24160248210";

// ========== FONCTIONS ADMIN ==========
async function loadAdminList() {
  try {
    const snapshot = await database.ref('admins').get();
    if (snapshot.exists()) {
      const admins = snapshot.val();
      ADMIN_LIST.length = 0;
      admins.forEach(admin => ADMIN_LIST.push(admin));
    }
  } catch (error) {
    console.error("Erreur chargement admins:", error);
  }
}

async function saveAdminList() {
  try {
    await database.ref('admins').set(ADMIN_LIST);
  } catch (error) {
    console.error("Erreur sauvegarde admins:", error);
  }
}

async function addAdmin(phone) {
  if (!ADMIN_LIST.includes(phone)) {
    ADMIN_LIST.push(phone);
    await saveAdminList();
    displayAdminList();
    alert("✅ Admin ajouté !");
  }
}

async function removeAdmin(index) {
  ADMIN_LIST.splice(index, 1);
  await saveAdminList();
  displayAdminList();
}

function displayAdminList() {
  const list = document.getElementById('admin-list');
  if (list) {
    list.innerHTML = ADMIN_LIST.map((p, i) => 
      `<li>${p} <button onclick="window.removeAdmin(${i})">❌</button></li>`
    ).join('');
  }
}

function isAdmin(phone) {
  return phone === OWNER_PHONE || ADMIN_LIST.includes(phone);
}

// ========== FONCTIONS UTILITAIRES ==========
function saveUsers() { localStorage.setItem('purge_users', JSON.stringify(state.users)); }

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

// ========== AFFICHAGE ÉCRANS ==========
function showScreen(screenId) {
  console.log("📱 Affichage écran:", screenId);
  const screens = ['screen-subscribe', 'screen-auth', 'screen-team-choice', 'screen-lobby', 
                   'screen-game1', 'screen-game2', 'screen-game3', 'screen-results'];
  screens.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  });
  const targetScreen = document.getElementById(screenId);
  if (targetScreen) targetScreen.classList.add('active');
}

// ========== LOBBY ==========
function updateLobbyUI() {
  const t = state.currentTeam;
  if (!t || !t.code) return;
  
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
        </div>
      `).join('');
    }
  }
}

// ========== FIREBASE ÉQUIPES ==========
async function saveTeamToDatabase() {
  if (!state.currentTeam.code) return;
  
  try {
    await database.ref(`teams/${state.currentTeam.code}`).set({
      code: state.currentTeam.code,
      players: state.currentTeam.players,
      updatedAt: Date.now()
    });
    console.log("✅ Équipe sauvegardée");
  } catch (error) {
    console.error("❌ Erreur:", error);
  }
}

function listenToTeamChanges() {
  if (teamListener) teamListener();
  if (!state.currentTeam.code) return;
  
  const teamRef = database.ref(`teams/${state.currentTeam.code}`);
  
  teamListener = teamRef.on('value', (snapshot) => {
    const data = snapshot.val();
    if (data && data.players) {
      const oldCount = state.currentTeam.players.length;
      state.currentTeam.players = data.players;
      if (oldCount !== state.currentTeam.players.length) {
        console.log("🔄 Synchronisation! Nouveaux joueurs:", state.currentTeam.players.length);
        updateLobbyUI();
      }
    }
  });
}

async function joinTeam(code) {
  try {
    const snapshot = await database.ref(`teams/${code}`).get();
    let team = snapshot.val();
    
    if (team) {
      console.log("📂 Équipe trouvée avec", team.players.length, "joueurs");
    } else {
      team = { code: code, players: [] };
      console.log("🆕 Nouvelle équipe créée");
    }
    
    if (team.players.length >= 4) {
      alert("❌ Cette équipe est déjà complète (4/4) !");
      return false;
    }
    
    if (!team.players.find(p => p.phone === state.user.phone)) {
      team.players.push(state.user);
      await database.ref(`teams/${code}`).set({
        code: code,
        players: team.players,
        updatedAt: Date.now()
      });
      state.currentTeam = { code: code, players: team.players };
      console.log("✅ Joueur ajouté:", state.user.pseudo);
      return true;
    }
    
    state.currentTeam = { code: code, players: team.players };
    return true;
    
  } catch (error) {
    console.error("❌ Erreur:", error);
    alert("Erreur lors du rejoignement");
    return false;
  }
}

// ========== JEU 1 ==========
function startGame1() {
  state.game1.round = 1;
  state.game1.playerDebts = {};
  state.currentTeam.players.forEach(p => state.game1.playerDebts[p.phone] = 0);
  showScreen('screen-game1');
  loadQuestion();
}

function loadQuestion() {
  if (typeof GAME1_QUESTIONS === 'undefined') return;
  const q = GAME1_QUESTIONS[(state.game1.round - 1) % GAME1_QUESTIONS.length];
  
  document.getElementById('question-text').textContent = q.question;
  document.getElementById('round-current').textContent = state.game1.round;
  
  const grid = document.getElementById('players-answers');
  grid.innerHTML = '';
  state.currentTeam.players.forEach((p, i) => {
    grid.innerHTML += `
      <div class="answer-box">
        <img src="${p.avatar}" style="width:45px;height:45px;border-radius:50%;object-fit:cover;">
        <div><strong>${escapeHtml(p.pseudo)}</strong></div>
        <input type="text" id="answer-${i}" placeholder="Réponse...">
      </div>
    `;
  });
  
  document.getElementById('validate-round').disabled = false;
  startTimer(60);
}

function startTimer(seconds) {
  let timeLeft = seconds;
  const timerEl = document.getElementById('timer');
  if (window.gameTimer) clearInterval(window.gameTimer);
  
  window.gameTimer = setInterval(() => {
    timeLeft--;
    const sec = timeLeft < 10 ? '0' + timeLeft : timeLeft;
    timerEl.textContent = `00:${sec}`;
    if (timeLeft <= 0) {
      clearInterval(window.gameTimer);
      validateGame1Round();
    }
  }, 1000);
}

function validateGame1Round() {
  const answers = [];
  state.currentTeam.players.forEach((p, i) => {
    const input = document.getElementById(`answer-${i}`);
    answers.push({ player: p, answer: input?.value.trim().toLowerCase() || '' });
  });
  
  const count = {};
  answers.forEach(a => { if (a.answer) count[a.answer] = (count[a.answer] || 0) + 1; });
  
  let minoritaire = null;
  let minCount = Infinity;
  for (let [rep, c] of Object.entries(count)) {
    if (c < minCount) { minCount = c; minoritaire = rep; }
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
    showScreen('screen-game2');
    initGame2();
  }
}

// ========== JEU 2 ==========
function initGame2() {
  state.game2.currentImgIndex = 0;
  state.game2.positions = {};
  state.currentTeam.players.forEach(p => state.game2.positions[p.phone] = 0);
  document.getElementById('next-game2').classList.add('hidden');
  loadDevineImage();
}

function loadDevineImage() {
  if (typeof GAME2_IMAGES === 'undefined') return;
  const img = GAME2_IMAGES[state.game2.currentImgIndex % GAME2_IMAGES.length];
  document.getElementById('devine-img').src = img.img;
  document.getElementById('devine-question').textContent = img.description;
}

function submitDevine() {
  const answer = document.getElementById('devine-input').value.trim().toLowerCase();
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
    document.getElementById('devine-input').value = '';
    loadDevineImage();
  } else {
    const positions = Object.entries(state.game2.positions).sort((a, b) => b[1] - a[1]);
    const loser = state.currentTeam.players.find(p => p.phone === positions[0][0]);
    alert(`💀 ${loser?.pseudo} a perdu le jeu 2 ! 💀`);
    document.getElementById('next-game2').classList.remove('hidden');
  }
}

// ========== FIN DU JEU ==========
function finishGame() {
  const score = 1200;
  const finalScore = document.getElementById('final-score');
  const winReward = document.getElementById('win-reward');
  const loseBan = document.getElementById('lose-ban');
  const groupSize = document.getElementById('group-size');
  
  finalScore.textContent = `Score: ${score}`;
  
  if (score >= 1000) {
    winReward.classList.remove('hidden');
    loseBan.classList.add('hidden');
    if (groupSize) groupSize.textContent = "300";
  } else {
    winReward.classList.add('hidden');
    loseBan.classList.remove('hidden');
    localStorage.setItem('purge_ban', new Date(Date.now() + 7 * 86400000).toISOString());
  }
  showScreen('screen-results');
}
// ========== MUSIQUE DE FOND ==========
  const audio = document.getElementById('background-music');
  const toggleBtn = document.getElementById('toggle-music');
  
  if (audio && toggleBtn) {
    let musicStarted = false;
    
    function startMusic() {
      if (!musicStarted) {
        audio.volume = 0.3;
        audio.play().catch(e => console.log("Auto-play bloqué"));
        musicStarted = true;
      }
    }
    
    document.body.addEventListener('click', startMusic, { once: true });
    
    let isPlaying = true;
    toggleBtn.onclick = () => {
      if (isPlaying) {
        audio.pause();
        toggleBtn.textContent = '🔇';
        isPlaying = false;
      } else {
        audio.play();
        toggleBtn.textContent = '🔊';
        isPlaying = true;
      }
    };
  }
// ========== INITIALISATION ==========
document.addEventListener('DOMContentLoaded', () => {
  console.log("=== PURGE GAME AVEC FIREBASE ===");
  
  // Charger les admins
  loadAdminList();
  
  // Écran abonnement
  document.getElementById('verify-subscription').onclick = () => showScreen('screen-auth');
  
  // Tabs Connexion/Inscription
  document.querySelectorAll('.tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('login-form').classList.toggle('active', tab.dataset.tab === 'login');
      document.getElementById('register-form').classList.toggle('active', tab.dataset.tab === 'register');
    };
  });
  
  // Vérification numéro
  document.getElementById('reg-verify-phone').onclick = () => {
    const phone = document.getElementById('reg-phone').value.trim();
    const status = document.getElementById('phone-status');
    const registerBtn = document.getElementById('register-btn');
    if (isValidPhone(phone)) {
      status.innerHTML = '✅ Vérifié';
      registerBtn.disabled = false;
    } else {
      status.innerHTML = '❌ Numéro invalide (ex: +241612345678)';
      registerBtn.disabled = true;
    }
  };
  
  // Upload photo
  document.getElementById('reg-avatar-file').onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        document.getElementById('reg-avatar-preview').src = ev.target.result;
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Inscription
  document.getElementById('register-btn').onclick = () => {
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
    document.getElementById('choice-user-avatar').src = user.avatar;
    document.getElementById('choice-user-pseudo').textContent = user.pseudo;
  };
  
  // Connexion
  document.getElementById('login-btn').onclick = () => {
    const phone = document.getElementById('login-phone').value.trim();
    const pseudo = document.getElementById('login-pseudo').value.trim();
    const user = state.users.find(u => u.phone === phone && u.pseudo.toLowerCase() === pseudo.toLowerCase());
    
    if (!user) {
      alert("Identifiants incorrects");
      return;
    }
    
    state.user = user;
    showScreen('screen-team-choice');
    document.getElementById('choice-user-avatar').src = user.avatar;
    document.getElementById('choice-user-pseudo').textContent = user.pseudo;
  };
  
  // Créer une équipe
  document.getElementById('create-team-btn').onclick = async () => {
    const newCode = generateTeamCode();
    state.currentTeam = { code: newCode, players: [state.user] };
    await saveTeamToDatabase();
    listenToTeamChanges();
    showScreen('screen-lobby');
    updateLobbyUI();
  };
  
  // Afficher formulaire rejoindre
  document.getElementById('show-join-team-btn').onclick = () => {
    document.getElementById('join-team-section').classList.toggle('hidden');
  };
  
  // Rejoindre une équipe
  document.getElementById('choice-join-btn').onclick = async () => {
    const code = document.getElementById('choice-join-code').value.toUpperCase().trim();
    if (!code) {
      alert("Entrez un code d'invitation");
      return;
    }
    
    const success = await joinTeam(code);
    if (success) {
      listenToTeamChanges();
      showScreen('screen-lobby');
      updateLobbyUI();
    }
  };
  
  // Quitter l'équipe
  document.getElementById('leave-team').onclick = async () => {
    if (confirm("Quitter l'équipe ?")) {
      state.currentTeam.players = state.currentTeam.players.filter(p => p.phone !== state.user.phone);
      await saveTeamToDatabase();
      if (state.currentTeam.players.length === 0) {
        state.currentTeam = { code: null, players: [] };
        showScreen('screen-team-choice');
      } else {
        updateLobbyUI();
      }
    }
  };
  
  // Déconnexion
  document.getElementById('choice-logout').onclick = () => {
    state.user = null;
    state.currentTeam = { code: null, players: [] };
    if (teamListener) database.ref(`teams/${state.currentTeam.code}`).off();
    showScreen('screen-auth');
  };
  
  document.getElementById('lobby-logout-btn').onclick = () => {
    state.user = null;
    state.currentTeam = { code: null, players: [] };
    if (teamListener) database.ref(`teams/${state.currentTeam.code}`).off();
    showScreen('screen-auth');
  };
  
  // Copier code
  document.getElementById('copy-code-btn').onclick = () => {
    if (state.currentTeam.code) {
      navigator.clipboard.writeText(state.currentTeam.code);
      alert("✅ Code copié !");
    }
  };
  
  // Lancer le jeu
  document.getElementById('start-game').onclick = () => {
    if (state.currentTeam.players.length === 4) {
      startGame1();
    } else {
      alert(`Il faut 4 joueurs ! Actuellement: ${state.currentTeam.players.length}/4`);
    }
  };
  
  // Retour
  document.getElementById('g1-back').onclick = () => showScreen('screen-lobby');
  document.getElementById('g2-back').onclick = () => showScreen('screen-lobby');
  
  // ========== ADMIN ==========
  const showAdminBtn = document.getElementById('show-admin-btn');
  const closeAdmin = document.getElementById('close-admin');
  const adminLoginBtn = document.getElementById('admin-login-btn');
  const addAdminBtn = document.getElementById('add-admin-btn');
  const addQuestionBtn = document.getElementById('add-question-btn');
  const newQuestionType = document.getElementById('new-question-type');
  
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
  
  if (adminLoginBtn) {
    adminLoginBtn.onclick = () => {
      const phone = document.getElementById('admin-phone-input').value.trim();
      const ownerSection = document.getElementById('owner-section');
      const adminSection = document.getElementById('admin-section');
      
      if (phone === OWNER_PHONE) {
        if (ownerSection) ownerSection.classList.remove('hidden');
        if (adminSection) adminSection.classList.remove('hidden');
        displayAdminList();
        alert("👑 Connecté en tant que OWNER");
      } else if (ADMIN_LIST.includes(phone)) {
        if (adminSection) adminSection.classList.remove('hidden');
        alert("🛡️ Connecté en tant que ADMIN");
      } else {
        alert("❌ Accès refusé. Vous n'êtes pas admin.");
      }
    };
  }
  
  if (addAdminBtn) {
    addAdminBtn.onclick = async () => {
      const newAdmin = document.getElementById('new-admin-phone').value.trim();
      if (newAdmin && !ADMIN_LIST.includes(newAdmin)) {
        await addAdmin(newAdmin);
        document.getElementById('new-admin-phone').value = '';
      } else {
        alert("Numéro invalide ou déjà admin");
      }
    };
  }
  
  if (addQuestionBtn) {
    addQuestionBtn.onclick = () => {
      const type = newQuestionType ? newQuestionType.value : 'game1';
      const question = document.getElementById('new-question-text').value;
      const answer = document.getElementById('new-question-answer').value;
      
      if (type === 'game1' && question && answer) {
        if (typeof GAME1_QUESTIONS !== 'undefined') {
          GAME1_QUESTIONS.push({ question: question, reponse: answer.toLowerCase() });
          localStorage.setItem('purge_game1_questions', JSON.stringify(GAME1_QUESTIONS));
          alert("✅ Question ajoutée !");
          document.getElementById('new-question-text').value = '';
          document.getElementById('new-question-answer').value = '';
        }
      } else if (type === 'game2') {
        const img = document.getElementById('new-question-image').value;
        const pers = document.getElementById('new-question-personnage').value;
        const desc = document.getElementById('new-question-description').value;
        if (img && pers && desc && typeof GAME2_IMAGES !== 'undefined') {
          GAME2_IMAGES.push({ img: img, personnage: pers, description: desc });
          localStorage.setItem('purge_game2_images', JSON.stringify(GAME2_IMAGES));
          alert("✅ Image ajoutée !");
          document.getElementById('new-question-image').value = '';
          document.getElementById('new-question-personnage').value = '';
          document.getElementById('new-question-description').value = '';
        }
      } else {
        alert("Veuillez remplir tous les champs");
      }
    };
  }
  
  if (newQuestionType) {
    newQuestionType.onchange = (e) => {
      const field = document.getElementById('game2-image-field');
      if (field) field.classList.toggle('hidden', e.target.value !== 'game2');
    };
  }
  
  window.removeAdmin = (index) => {
    removeAdmin(index);
  };
  
  // Écouteurs des boutons du jeu
  document.getElementById('validate-round').onclick = validateGame1Round;
  document.getElementById('submit-devine').onclick = submitDevine;
  document.getElementById('vote-blanc').onclick = voteBlanc;
  document.getElementById('next-game2').onclick = () => showScreen('screen-game3');
  document.getElementById('finish-game3').onclick = finishGame;
  document.getElementById('play-again').onclick = () => { localStorage.clear(); location.reload(); };
  
  console.log("=== INITIALISATION TERMINÉE ===");
});
