/****************************************************
 * PURGE GAME - Version internationale complète
 ****************************************************/
const CONFIG = {
  WHATSAPP_CHANNEL: 'https://whatsapp.com/channel/0029VbCLsX44IBhF4woPb93M',
  CONTACT: 'PrimePurge@proton.me'
};

const OWNER_PHONE = "+24160248210";
let ADMIN_LIST = ["+221708137251","+221769426236","+22897173547","+2250777315113","+50946801238"];

// État
const state = {
  user: null,
  users: JSON.parse(localStorage.getItem('purge_users')||'[]'),
  currentTeam: { code: null, players: [] },
  game1: { round: 0, playerDebts: {} },
  game2: { currentImgIndex: 0, positions: {} }
};

// BroadcastChannel
const channel = new BroadcastChannel('purge_team');
channel.onmessage = (e) => {
  const { type, data } = e.data;
  if (type === 'TEAM_UPDATE' && data.code === state.currentTeam.code) {
    state.currentTeam.players = data.players;
    if (screens.lobby && screens.lobby.classList.contains('active')) updateLobbyUI();
    saveTeam();
  }
};

// Helpers
function saveUsers() { localStorage.setItem('purge_users', JSON.stringify(state.users)); }
function saveTeam() { 
  if (state.currentTeam.code) localStorage.setItem('purge_team', JSON.stringify(state.currentTeam));
}
function broadcastTeam() { channel.postMessage({ type: 'TEAM_UPDATE', data: state.currentTeam }); }

// Validation numéro
function isValidPhone(phone) {
  const phoneRegex = /^\+\d{8,15}$/;
  return phoneRegex.test(phone);
}

// Générer code
function generateTeamCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Récupérer numéro
function getFullPhoneNumber(formType) {
  const phoneInput = document.getElementById(`${formType === 'reg' ? 'reg-phone' : 'login-phone'}`);
  return phoneInput ? phoneInput.value.trim().replace(/\s/g, '') : '';
}

// Écrans
const screens = {
  subscribe: document.getElementById('screen-subscribe'),
  auth: document.getElementById('screen-auth'),
  teamChoice: document.getElementById('screen-team-choice'),
  lobby: document.getElementById('screen-lobby'),
  game1: document.getElementById('screen-game1'),
  game2: document.getElementById('screen-game2'),
  game3: document.getElementById('screen-game3'),
  results: document.getElementById('screen-results')
};

function showScreen(id) { 
  console.log("Affichage écran:", id);
  Object.values(screens).forEach(s => {
    if (s) s.classList.remove('active');
  }); 
  if (screens[id]) {
    screens[id].classList.add('active');
    console.log("Écran affiché:", id);
  } else {
    console.error("Écran non trouvé:", id);
  }
}

// Mise à jour UI choix équipe
function updateChoiceUI() {
  if (state.user) {
    const avatarImg = document.getElementById('choice-user-avatar');
    const pseudoSpan = document.getElementById('choice-user-pseudo');
    if (avatarImg) avatarImg.src = state.user.avatar;
    if (pseudoSpan) pseudoSpan.textContent = state.user.pseudo;
  }
}

// Setup écran choix équipe
function setupTeamChoice() {
  const createBtn = document.getElementById('create-team-btn');
  const showJoinBtn = document.getElementById('show-join-team-btn');
  const choiceJoinBtn = document.getElementById('choice-join-btn');
  const choiceLogout = document.getElementById('choice-logout');
  
  if (createBtn) {
    createBtn.onclick = () => {
      const newCode = generateTeamCode();
      state.currentTeam = { code: newCode, players: [state.user] };
      saveTeam();
      localStorage.setItem(`team_${newCode}`, JSON.stringify(state.currentTeam));
      broadcastTeam();
      showScreen('lobby');
      updateLobbyUI();
    };
  }
  
  if (showJoinBtn) {
    showJoinBtn.onclick = () => {
      const section = document.getElementById('join-team-section');
      if (section) section.classList.toggle('hidden');
    };
  }
  
  if (choiceJoinBtn) {
    choiceJoinBtn.onclick = () => {
      const codeInput = document.getElementById('choice-join-code');
      const code = codeInput ? codeInput.value.toUpperCase().trim() : '';
      if (!code) return;
      
      const existingTeam = localStorage.getItem(`team_${code}`);
      if (existingTeam) {
        state.currentTeam = JSON.parse(existingTeam);
      } else {
        state.currentTeam = { code: code, players: [] };
      }
      
      if (state.currentTeam.players.length >= 4) {
        const joinError = document.getElementById('join-error');
        if (joinError) joinError.textContent = '❌ Cette équipe est déjà complète (4/4) !';
        return;
      }
      
      if (!state.currentTeam.players.find(p => p.phone === state.user.phone)) {
        state.currentTeam.players.push(state.user);
        saveTeam();
        localStorage.setItem(`team_${state.currentTeam.code}`, JSON.stringify(state.currentTeam));
        broadcastTeam();
        showScreen('lobby');
        updateLobbyUI();
      } else {
        showScreen('lobby');
        updateLobbyUI();
      }
    };
  }
  
  if (choiceLogout) {
    choiceLogout.onclick = () => {
      state.user = null;
      state.currentTeam = { code: null, players: [] };
      showScreen('auth');
    };
  }
}

// Init
document.addEventListener('DOMContentLoaded', ()=>{
  console.log("DOM chargé");
  setupTeamChoice();
  
  // Abonnement
  const verifyBtn = document.getElementById('verify-subscription');
  if (verifyBtn) {
    verifyBtn.onclick = ()=> showScreen('auth');
  }

  // Tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.onclick = ()=>{
      document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active')); 
      tab.classList.add('active');
      const loginForm = document.getElementById('login-form');
      const registerForm = document.getElementById('register-form');
      if (loginForm) loginForm.classList.toggle('active', tab.dataset.tab==='login');
      if (registerForm) registerForm.classList.toggle('active', tab.dataset.tab==='register');
    };
  });

  // Register - Vérification téléphone
  const regVerifyBtn = document.getElementById('reg-verify-phone');
  if (regVerifyBtn) {
    regVerifyBtn.onclick = ()=>{
      const phoneFull = getFullPhoneNumber('reg');
      const phoneStatus = document.getElementById('phone-status');
      const registerBtn = document.getElementById('register-btn');
      if(isValidPhone(phoneFull)){ 
        if (phoneStatus) phoneStatus.innerHTML='✅ Vérifié'; 
        if (registerBtn) registerBtn.disabled=false; 
      } else {
        if (phoneStatus) phoneStatus.innerHTML='❌ Numéro invalide - Utilisez le format +241XXXXXXXX';
        if (registerBtn) registerBtn.disabled=true;
      }
    };
  }
  
  // Register - Upload avatar
  const avatarFile = document.getElementById('reg-avatar-file');
  if (avatarFile) {
    avatarFile.onchange = (e)=>{
      const f=e.target.files[0]; 
      if(f){ 
        const r=new FileReader(); 
        r.onload=ev=>{
          const preview = document.getElementById('reg-avatar-preview');
          if (preview) preview.src=ev.target.result;
        }; 
        r.readAsDataURL(f); 
      }
    };
  }
  
  // Register - Inscription
  const registerBtn = document.getElementById('register-btn');
  if (registerBtn) {
    registerBtn.onclick = ()=>{
      const phone = getFullPhoneNumber('reg');
      const pseudo = document.getElementById('reg-pseudo') ? document.getElementById('reg-pseudo').value.trim() : '';
      const avatar = document.getElementById('reg-avatar-preview') ? document.getElementById('reg-avatar-preview').src : '';
      if(!phone || !pseudo || !isValidPhone(phone)){ 
        const regError = document.getElementById('reg-error');
        if (regError) regError.textContent='Numéro invalide (ex: +241612345678) ou pseudo manquant'; 
        return; 
      }
      if(state.users.find(u=>u.phone===phone)){ 
        const regError = document.getElementById('reg-error');
        if (regError) regError.textContent='Numéro déjà utilisé'; 
        return; 
      }
      const user={phone,pseudo,avatar,score:0}; 
      state.users.push(user); 
      saveUsers(); 
      state.user=user; 
      console.log("Utilisateur créé:", state.user);
      showScreen('teamChoice');
      updateChoiceUI();
    };
  }

  // Login
  const loginBtn = document.getElementById('login-btn');
  if (loginBtn) {
    loginBtn.onclick = ()=>{
      const phone = getFullPhoneNumber('login');
      const pseudo = document.getElementById('login-pseudo') ? document.getElementById('login-pseudo').value.trim() : '';
      const user = state.users.find(u=>u.phone===phone && u.pseudo.toLowerCase()===pseudo.toLowerCase());
      if(!user){ 
        const loginError = document.getElementById('login-error');
        if (loginError) loginError.textContent='Identifiants incorrects'; 
        return; 
      }
      state.user=user; 
      console.log("Utilisateur connecté:", state.user);
      showScreen('teamChoice');
      updateChoiceUI();
    };
  }

  // Lobby
  const lobbyLogout = document.getElementById('lobby-logout-btn');
  if (lobbyLogout) {
    lobbyLogout.onclick = ()=>{ 
      state.user=null; 
      state.currentTeam={code:null,players:[]}; 
      showScreen('auth'); 
    };
  }
  
  const copyBtn = document.getElementById('copy-code-btn');
  if (copyBtn) {
    copyBtn.onclick = ()=> navigator.clipboard?.writeText(state.currentTeam.code) && alert('✅ Code copié ! Partage-le avec tes amis');
  }
  
  const leaveTeamBtn = document.getElementById('leave-team');
  if (leaveTeamBtn) {
    leaveTeamBtn.onclick = ()=>{
      if(confirm("Quitter l'équipe ?")) {
        state.currentTeam.players = state.currentTeam.players.filter(p=>p.phone!==state.user.phone);
        if(state.currentTeam.players.length === 0){ 
          localStorage.removeItem(`team_${state.currentTeam.code}`);
          state.currentTeam = {code:null,players:[]}; 
          showScreen('teamChoice'); 
        } else { 
          saveTeam();
          localStorage.setItem(`team_${state.currentTeam.code}`, JSON.stringify(state.currentTeam));
          broadcastTeam(); 
          updateLobbyUI(); 
        }
      }
    };
  }
  
  const startGameBtn = document.getElementById('start-game');
  if (startGameBtn) {
    startGameBtn.onclick = startGame1;
  }

  // Jeux
  const validateRoundBtn = document.getElementById('validate-round');
  if (validateRoundBtn) validateRoundBtn.onclick = validateGame1Round;
  
  const submitDevineBtn = document.getElementById('submit-devine');
  if (submitDevineBtn) submitDevineBtn.onclick = submitDevine;
  
  const voteBlancBtn = document.getElementById('vote-blanc');
  if (voteBlancBtn) voteBlancBtn.onclick = voteBlanc;
  
  const nextGame2Btn = document.getElementById('next-game2');
  if (nextGame2Btn) nextGame2Btn.onclick = ()=> showScreen('game3');
  
  const finishGame3Btn = document.getElementById('finish-game3');
  if (finishGame3Btn) finishGame3Btn.onclick = finishGame;
  
  const playAgainBtn = document.getElementById('play-again');
  if (playAgainBtn) playAgainBtn.onclick = ()=> { localStorage.clear(); location.reload(); };
  
  const g1Back = document.getElementById('g1-back');
  if (g1Back) g1Back.onclick = ()=> showScreen('lobby');
  
  const g2Back = document.getElementById('g2-back');
  if (g2Back) g2Back.onclick = ()=> showScreen('lobby');

  // Admin
  const showAdminBtn = document.getElementById('show-admin-btn');
  const closeAdminBtn = document.getElementById('close-admin');
  const adminLoginBtn = document.getElementById('admin-login-btn');
  const addAdminBtn = document.getElementById('add-admin-btn');
  const addQuestionBtn = document.getElementById('add-question-btn');
  const newQuestionType = document.getElementById('new-question-type');
  
  if (showAdminBtn) {
    showAdminBtn.onclick = ()=> {
      const panel = document.getElementById('admin-panel');
      if (panel) panel.classList.toggle('hidden');
    };
  }
  if (closeAdminBtn) {
    closeAdminBtn.onclick = ()=> {
      const panel = document.getElementById('admin-panel');
      if (panel) panel.classList.add('hidden');
    };
  }
  if (adminLoginBtn) {
    adminLoginBtn.onclick = ()=>{
      const p = document.getElementById('admin-phone-input') ? document.getElementById('admin-phone-input').value.trim() : '';
      const ownerSection = document.getElementById('owner-section');
      const adminSection = document.getElementById('admin-section');
      if(p===OWNER_PHONE){ 
        if (ownerSection) ownerSection.classList.remove('hidden'); 
        if (adminSection) adminSection.classList.remove('hidden'); 
        displayAdminList(); 
      }
      else if(ADMIN_LIST.includes(p)) {
        if (adminSection) adminSection.classList.remove('hidden');
      }
    };
  }
  if (addAdminBtn) {
    addAdminBtn.onclick = ()=>{
      const p = document.getElementById('new-admin-phone') ? document.getElementById('new-admin-phone').value.trim() : '';
      if(p && !ADMIN_LIST.includes(p)){ 
        ADMIN_LIST.push(p); 
        localStorage.setItem('purge_admin_list',JSON.stringify(ADMIN_LIST)); 
        displayAdminList(); 
      }
    };
  }
  if (addQuestionBtn) {
    addQuestionBtn.onclick = ()=>{
      const type = document.getElementById('new-question-type') ? document.getElementById('new-question-type').value : 'game1';
      const q = document.getElementById('new-question-text') ? document.getElementById('new-question-text').value : '';
      const a = document.getElementById('new-question-answer') ? document.getElementById('new-question-answer').value : '';
      if(type==='game1' && q && a){ 
        GAME1_QUESTIONS.push({question:q, reponse:a.toLowerCase()}); 
        localStorage.setItem('purge_game1_questions',JSON.stringify(GAME1_QUESTIONS)); 
        alert('✅ Question ajoutée'); 
      }
      else if(type==='game2'){ 
        const img = document.getElementById('new-question-image') ? document.getElementById('new-question-image').value : '';
        const pers = document.getElementById('new-question-personnage') ? document.getElementById('new-question-personnage').value : '';
        const desc = document.getElementById('new-question-description') ? document.getElementById('new-question-description').value : '';
        if(img&&pers&&desc){ 
          GAME2_IMAGES.push({img, personnage:pers, description:desc}); 
          localStorage.setItem('purge_game2_images',JSON.stringify(GAME2_IMAGES)); 
          alert('✅ Image ajoutée'); 
        } 
      }
    };
  }
  if (newQuestionType) {
    newQuestionType.onchange = (e)=> {
      const field = document.getElementById('game2-image-field');
      if (field) field.classList.toggle('hidden', e.target.value!=='game2');
    };
  }
  
  function displayAdminList(){ 
    const adminListEl = document.getElementById('admin-list');
    if (adminListEl) {
      adminListEl.innerHTML = ADMIN_LIST.map((p,i)=>`<li>${p} <button onclick="removeAdmin(${i})">X</button></li>`).join('');
    }
  }
  window.removeAdmin = (i)=>{ 
    ADMIN_LIST.splice(i,1); 
    localStorage.setItem('purge_admin_list',JSON.stringify(ADMIN_LIST)); 
    displayAdminList(); 
  };

  // Charger données
  if(localStorage.getItem('purge_admin_list')) ADMIN_LIST = JSON.parse(localStorage.getItem('purge_admin_list'));
  if(localStorage.getItem('purge_game1_questions')) {
    const saved = JSON.parse(localStorage.getItem('purge_game1_questions'));
    if (typeof GAME1_QUESTIONS !== 'undefined') GAME1_QUESTIONS.push(...saved);
  }
  if(localStorage.getItem('purge_game2_images')) {
    const saved = JSON.parse(localStorage.getItem('purge_game2_images'));
    if (typeof GAME2_IMAGES !== 'undefined') GAME2_IMAGES.push(...saved);
  }
  checkBan();
});

function updateLobbyUI(){
  const t=state.currentTeam;
  if(!t || !t.players) return;
  
  const onlineCount = document.getElementById('online-count');
  const inviteCode = document.getElementById('invite-code');
  const startGame = document.getElementById('start-game');
  
  if (onlineCount) onlineCount.innerHTML = `(${t.players.length}/4) ${t.players.length === 4 ? '✅ Complet !' : '⏳ En attente...'}`;
  if (inviteCode) inviteCode.textContent = t.code;
  if (startGame) startGame.disabled = t.players.length !== 4;
  
  const membersDiv = document.getElementById('members-list');
  if (!membersDiv) return;
  
  if (t.players.length === 0) {
    membersDiv.innerHTML = '<div class="empty-members">👻 Aucun membre pour le moment.<br>Invitez vos amis avec le code !</div>';
    return;
  }
  
  membersDiv.innerHTML = t.players.map(p => `
    <div class="member-card" data-phone="${p.phone || ''}">
      <div class="member-avatar">
        <img src="${p.avatar || 'https://i.pravatar.cc/150?img=' + Math.floor(Math.random()*70)}" alt="avatar" onerror="this.src='https://i.pravatar.cc/150?img=7'">
        ${p.phone === state.user?.phone ? '<span class="owner-badge">👑</span>' : ''}
      </div>
      <span class="member-name">${escapeHtml(p.pseudo || 'Anonyme')}</span>
      <span class="member-phone">${p.phone ? p.phone.substring(0, 12) + '...' : ''}</span>
    </div>
  `).join('');
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

function checkBan(){ 
  if(localStorage.getItem('purge_ban') && new Date(localStorage.getItem('purge_ban'))>new Date()){ 
    document.body.innerHTML='<h1 style="color:red;text-align:center;margin-top:50px;">⛔ VOUS ÊTES BANNI ⛔</h1><p style="text-align:center">Contact: PrimePurge@proton.me</p>'; 
  } 
}

// === GAME FUNCTIONS ===
function startGame1(){ 
  state.game1.round=1; 
  state.game1.playerDebts={}; 
  state.currentTeam.players.forEach(p=>state.game1.playerDebts[p.phone]=0); 
  showScreen('game1'); 
  loadQuestion(); 
}

function loadQuestion(){ 
  if (typeof GAME1_QUESTIONS === 'undefined') return;
  const q=GAME1_QUESTIONS[(state.game1.round-1)%GAME1_QUESTIONS.length]; 
  const questionText = document.getElementById('question-text');
  const roundCurrent = document.getElementById('round-current');
  const grid = document.getElementById('players-answers');
  
  if (questionText) questionText.textContent=q.question; 
  if (roundCurrent) roundCurrent.textContent=state.game1.round; 
  if (grid) {
    grid.innerHTML=''; 
    state.currentTeam.players.forEach((p,i)=>{ 
      grid.innerHTML+=`<div class="answer-box"><img src="${p.avatar}"><div><strong>${p.pseudo}</strong></div><input type="text" id="answer-${i}" placeholder="Réponse..."></div>`; 
    }); 
  }
  const validateRound = document.getElementById('validate-round');
  if (validateRound) validateRound.disabled=false; 
  startTimer(60); 
}

function startTimer(s){ 
  let t=s; 
  const d=document.getElementById('timer'); 
  const i=setInterval(()=>{ 
    t--; 
    const sec = t<10?'0'+t:t;
    if (d) d.textContent=`00:${sec}`; 
    if(t<=0){ clearInterval(i); validateGame1Round(); } 
  },1000); 
}

function validateGame1Round(){ 
  const a=[]; 
  state.currentTeam.players.forEach((p,i)=>{ 
    const inp=document.getElementById(`answer-${i}`); 
    const reponseJoueur = inp?.value.trim().toLowerCase() || '';
    a.push({player:p, answer: reponseJoueur}); 
  }); 
  
  const compteur = {};
  a.forEach(x => {
    if(x.answer.length > 0) {
      compteur[x.answer] = (compteur[x.answer] || 0) + 1;
    }
  });
  
  let reponseMinoritaire = null;
  let minCount = Infinity;
  for (let [reponse, count] of Object.entries(compteur)) {
    if (count < minCount && count >= 1) {
      minCount = count;
      reponseMinoritaire = reponse;
    }
  }
  
  if (reponseMinoritaire) { 
    const perdant = a.find(x => x.answer === reponseMinoritaire); 
    if (perdant) {
      state.game1.playerDebts[perdant.player.phone] = (state.game1.playerDebts[perdant.player.phone] || 0) + 500; 
      alert(`⚠️ ${perdant.player.pseudo} a donné une réponse minoritaire ! +500 dettes`); 
    }
  } else {
    alert("🤝 Tout le monde a répondu la même chose ! Pas de dette cette manche.");
  }
  
  state.game1.round++; 
  if(state.game1.round <= 5) {
    loadQuestion(); 
  } else { 
    const phones = Object.keys(state.game1.playerDebts); 
    if (phones.length > 0) {
      const max = phones.reduce((a,b) => state.game1.playerDebts[a] > state.game1.playerDebts[b] ? a : b); 
      const totalDettes = Object.values(state.game1.playerDebts).reduce((s,x) => s + x, 0);
      state.game1.playerDebts[max] = totalDettes;
      const loser = state.currentTeam.players.find(p => p.phone === max); 
      alert(`💀 ${loser?.pseudo || 'Quelqu\'un'} est le GRAND PERDANT et récupère ${totalDettes} dettes ! 💀`); 
    }
    showScreen('game2'); 
    initGame2(); 
  } 
}

function initGame2(){ 
  state.game2.currentImgIndex=0; 
  state.game2.positions={}; 
  state.currentTeam.players.forEach(p=>state.game2.positions[p.phone]=0); 
  loadDevineImage(); 
}

function loadDevineImage(){ 
  if (typeof GAME2_IMAGES === 'undefined') return;
  const img=GAME2_IMAGES[state.game2.currentImgIndex%GAME2_IMAGES.length]; 
  const devineImg = document.getElementById('devine-img');
  const devineQuestion = document.getElementById('devine-question');
  if(img && devineImg) devineImg.src=img.img; 
  if(img && devineQuestion) devineQuestion.textContent=img.description; 
}

function submitDevine(){ 
  const ans=document.getElementById('devine-input') ? document.getElementById('devine-input').value.trim().toLowerCase() : '';
  if (typeof GAME2_IMAGES === 'undefined') return;
  const cur=GAME2_IMAGES[state.game2.currentImgIndex%GAME2_IMAGES.length]; 
  const ok=ans===cur.personnage.toLowerCase(); 
  state.currentTeam.players.forEach(p=>state.game2.positions[p.phone]=(state.game2.positions[p.phone]||0)+(ok?2:1)); 
  alert(ok ? "✅ Bonne réponse ! +2 positions" : "❌ Mauvaise réponse ! +1 position");
  nextDevine(); 
}

function voteBlanc(){ 
  state.currentTeam.players.forEach(p=>state.game2.positions[p.phone]=(state.game2.positions[p.phone]||0)+1); 
  alert("⚪ Bulletin blanc ! +1 position pour tout le monde");
  nextDevine(); 
}

function nextDevine(){ 
  state.game2.currentImgIndex++; 
  if(state.game2.currentImgIndex<3) {
    const devineInput = document.getElementById('devine-input');
    if (devineInput) devineInput.value = '';
    loadDevineImage(); 
  } else { 
    const pos=Object.entries(state.game2.positions).sort((a,b)=>b[1]-a[1]); 
    const loser=state.currentTeam.players.find(p=>p.phone===pos[0][0]); 
    alert(`💀 ${loser?.pseudo || 'Quelqu\'un'} a perdu le jeu 2 avec ${pos[0][1]} points ! 💀`); 
    const nextGame2 = document.getElementById('next-game2');
    if (nextGame2) nextGame2.classList.remove('hidden'); 
  } 
}

function finishGame(){ 
  const pts=1200; 
  const sz=pts>=1000?300:0; 
  const finalScore = document.getElementById('final-score');
  const winReward = document.getElementById('win-reward');
  const loseBan = document.getElementById('lose-ban');
  const groupSize = document.getElementById('group-size');
  
  if (finalScore) finalScore.textContent=`Score: ${pts}`; 
  if(sz){ 
    if (winReward) winReward.classList.remove('hidden'); 
    if (groupSize) groupSize.textContent=sz; 
    if (loseBan) loseBan.classList.add('hidden');
  } else { 
    if (loseBan) loseBan.classList.remove('hidden'); 
    if (winReward) winReward.classList.add('hidden');
    localStorage.setItem('purge_ban', new Date(Date.now()+7*86400000).toISOString()); 
  } 
  showScreen('results'); 
}
