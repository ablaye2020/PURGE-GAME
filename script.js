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
    if (screens.lobby.classList.contains('active')) updateLobbyUI();
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
  return phoneInput.value.trim().replace(/\s/g, '');
}

// Écrans
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
  console.log("Affichage écran:", id); // Pour déboguer
  Object.values(screens).forEach(s => {
    if (s) s.classList.remove('active');
  }); 
  if (screens[id]) screens[id].classList.add('active');
}
// Mise à jour UI choix équipe
function updateChoiceUI() {
  if (state.user) {
    document.getElementById('choice-user-avatar').src = state.user.avatar;
    document.getElementById('choice-user-pseudo').textContent = state.user.pseudo;
  }
}

// Setup écran choix équipe
function setupTeamChoice() {
  document.getElementById('create-team-btn').onclick = () => {
    const newCode = generateTeamCode();
    state.currentTeam = { code: newCode, players: [state.user] };
    saveTeam();
    localStorage.setItem(`team_${newCode}`, JSON.stringify(state.currentTeam));
    broadcastTeam();
    showScreen('lobby');
    updateLobbyUI();
  };
  
  document.getElementById('show-join-team-btn').onclick = () => {
    const section = document.getElementById('join-team-section');
    section.classList.toggle('hidden');
  };
  
  document.getElementById('choice-join-btn').onclick = () => {
    const code = document.getElementById('choice-join-code').value.toUpperCase().trim();
    if (!code) return;
    
    const existingTeam = localStorage.getItem(`team_${code}`);
    if (existingTeam) {
      state.currentTeam = JSON.parse(existingTeam);
    } else {
      state.currentTeam = { code: code, players: [] };
    }
    
    if (state.currentTeam.players.length >= 4) {
      document.getElementById('join-error').textContent = '❌ Cette équipe est déjà complète (4/4) !';
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
  
  document.getElementById('choice-logout').onclick = () => {
    state.user = null;
    state.currentTeam = { code: null, players: [] };
    showScreen('auth');
  };
}

// Init
document.addEventListener('DOMContentLoaded', ()=>{
  setupTeamChoice();
  
  document.getElementById('verify-subscription').onclick = ()=> showScreen('auth');

  // Tabs
  document.querySelectorAll('.tab').forEach(tab => tab.onclick = ()=>{
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active')); tab.classList.add('active');
    document.getElementById('login-form').classList.toggle('active', tab.dataset.tab==='login');
    document.getElementById('register-form').classList.toggle('active', tab.dataset.tab==='register');
  });

  // // Inscription
document.getElementById('register-btn').onclick = ()=>{
  const phone = getFullPhoneNumber('reg');
  const pseudo = document.getElementById('reg-pseudo').value.trim();
  const avatar = document.getElementById('reg-avatar-preview').src;
  if(!phone || !pseudo || !isValidPhone(phone)){ 
    document.getElementById('reg-error').textContent='Numéro invalide (ex: +241612345678) ou pseudo manquant'; 
    return; 
  }
  if(state.users.find(u=>u.phone===phone)){ 
    document.getElementById('reg-error').textContent='Numéro déjà utilisé'; 
    return; 
  }
  const user={phone,pseudo,avatar,score:0}; 
  state.users.push(user); 
  saveUsers(); 
  state.user=user; 
  console.log("Utilisateur créé:", state.user); // Déboguer
  console.log("Affichage team-choice...");
  showScreen('teamChoice');  // Changé : 'teamChoice' au lieu de 'team-choice'
  updateChoiceUI();
};

// Connexion
document.getElementById('login-btn').onclick = ()=>{
  const phone = getFullPhoneNumber('login');
  const pseudo = document.getElementById('login-pseudo').value.trim();
  const user = state.users.find(u=>u.phone===phone && u.pseudo.toLowerCase()===pseudo.toLowerCase());
  if(!user){ 
    document.getElementById('login-error').textContent='Identifiants incorrects'; 
    return; 
  }
  state.user=user; 
  console.log("Utilisateur connecté:", state.user);
  showScreen('teamChoice');  // Changé : 'teamChoice'
  updateChoiceUI();
};

  // Login
  document.getElementById('login-btn').onclick = ()=>{
    const phone = getFullPhoneNumber('login');
    const pseudo = document.getElementById('login-pseudo').value.trim();
    const user = state.users.find(u=>u.phone===phone && u.pseudo.toLowerCase()===pseudo.toLowerCase());
    if(!user){ 
      document.getElementById('login-error').textContent='Identifiants incorrects'; 
      return; 
    }
    state.user=user; 
    showScreen('team-choice');
    updateChoiceUI();
  };

  // Lobby
  document.getElementById('lobby-logout-btn').onclick = ()=>{ state.user=null; state.currentTeam={code:null,players:[]}; showScreen('auth'); };
  document.getElementById('copy-code-btn').onclick = ()=> navigator.clipboard?.writeText(state.currentTeam.code) && alert('✅ Code copié ! Partage-le avec tes amis');
  document.getElementById('leave-team').onclick = ()=>{
    if(confirm("Quitter l'équipe ?")) {
      state.currentTeam.players = state.currentTeam.players.filter(p=>p.phone!==state.user.phone);
      if(state.currentTeam.players.length === 0){ 
        localStorage.removeItem(`team_${state.currentTeam.code}`);
        state.currentTeam = {code:null,players:[]}; 
        showScreen('team-choice'); 
      } else { 
        saveTeam();
        localStorage.setItem(`team_${state.currentTeam.code}`, JSON.stringify(state.currentTeam));
        broadcastTeam(); 
        updateLobbyUI(); 
      }
    }
  };
  document.getElementById('start-game').onclick = startGame1;

  // Jeux
  document.getElementById('validate-round').onclick = validateGame1Round;
  document.getElementById('submit-devine').onclick = submitDevine;
  document.getElementById('vote-blanc').onclick = voteBlanc;
  document.getElementById('next-game2').onclick = ()=> showScreen('game3');
  document.getElementById('finish-game3').onclick = finishGame;
  document.getElementById('play-again').onclick = ()=> { localStorage.clear(); location.reload(); };
  document.getElementById('g1-back').onclick = ()=> showScreen('lobby');
  document.getElementById('g2-back').onclick = ()=> showScreen('lobby');

  // Admin
  document.getElementById('show-admin-btn').onclick = ()=> document.getElementById('admin-panel').classList.toggle('hidden');
  document.getElementById('close-admin').onclick = ()=> document.getElementById('admin-panel').classList.add('hidden');
  document.getElementById('admin-login-btn').onclick = ()=>{
    const p=document.getElementById('admin-phone-input').value.trim();
    if(p===OWNER_PHONE){ document.getElementById('owner-section').classList.remove('hidden'); document.getElementById('admin-section').classList.remove('hidden'); displayAdminList(); }
    else if(ADMIN_LIST.includes(p)) document.getElementById('admin-section').classList.remove('hidden');
  };
  document.getElementById('add-admin-btn').onclick = ()=>{
    const p=document.getElementById('new-admin-phone').value.trim(); if(p&&!ADMIN_LIST.includes(p)){ ADMIN_LIST.push(p); localStorage.setItem('purge_admin_list',JSON.stringify(ADMIN_LIST)); displayAdminList(); }
  };
  document.getElementById('add-question-btn').onclick = ()=>{
    const type=document.getElementById('new-question-type').value, q=document.getElementById('new-question-text').value, a=document.getElementById('new-question-answer').value;
    if(type==='game1' && q && a){ GAME1_QUESTIONS.push({question:q, reponse:a.toLowerCase()}); localStorage.setItem('purge_game1_questions',JSON.stringify(GAME1_QUESTIONS)); alert('✅ Question ajoutée'); }
    else if(type==='game2'){ const img=document.getElementById('new-question-image').value, pers=document.getElementById('new-question-personnage').value, desc=document.getElementById('new-question-description').value; if(img&&pers&&desc){ GAME2_IMAGES.push({img, personnage:pers, description:desc}); localStorage.setItem('purge_game2_images',JSON.stringify(GAME2_IMAGES)); alert('✅ Image ajoutée'); } }
  };
  document.getElementById('new-question-type').onchange = (e)=> document.getElementById('game2-image-field').classList.toggle('hidden', e.target.value!=='game2');
  function displayAdminList(){ document.getElementById('admin-list').innerHTML = ADMIN_LIST.map((p,i)=>`<li>${p} <button onclick="removeAdmin(${i})">X</button></li>`).join(''); }
  window.removeAdmin = (i)=>{ ADMIN_LIST.splice(i,1); localStorage.setItem('purge_admin_list',JSON.stringify(ADMIN_LIST)); displayAdminList(); };

  // Charger données
  if(localStorage.getItem('purge_admin_list')) ADMIN_LIST = JSON.parse(localStorage.getItem('purge_admin_list'));
  if(localStorage.getItem('purge_game1_questions')) {
    const saved = JSON.parse(localStorage.getItem('purge_game1_questions'));
    GAME1_QUESTIONS.push(...saved);
  }
  if(localStorage.getItem('purge_game2_images')) {
    const saved = JSON.parse(localStorage.getItem('purge_game2_images'));
    GAME2_IMAGES.push(...saved);
  }
  checkBan();
});

function updateLobbyUI(){
  const t=state.currentTeam;
  if(!t || !t.players) return;
  
  document.getElementById('online-count').innerHTML = `(${t.players.length}/4) ${t.players.length === 4 ? '✅ Complet !' : '⏳ En attente...'}`;
  document.getElementById('invite-code').textContent = t.code;
  document.getElementById('start-game').disabled = t.players.length !== 4;
  
  const membersDiv = document.getElementById('members-list');
  
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

function checkBan(){ if(localStorage.getItem('purge_ban') && new Date(localStorage.getItem('purge_ban'))>new Date()){ document.body.innerHTML='<h1 style="color:red;text-align:center;margin-top:50px;">⛔ VOUS ÊTES BANNI ⛔</h1><p style="text-align:center">Contact: PrimePurge@proton.me</p>'; } }

// === GAME FUNCTIONS ===
function startGame1(){ state.game1.round=1; state.game1.playerDebts={}; state.currentTeam.players.forEach(p=>state.game1.playerDebts[p.phone]=0); showScreen('game1'); loadQuestion(); }

function loadQuestion(){ 
  const q=GAME1_QUESTIONS[(state.game1.round-1)%GAME1_QUESTIONS.length]; 
  document.getElementById('question-text').textContent=q.question; 
  document.getElementById('round-current').textContent=state.game1.round; 
  const grid=document.getElementById('players-answers'); 
  grid.innerHTML=''; 
  state.currentTeam.players.forEach((p,i)=>{ 
    grid.innerHTML+=`<div class="answer-box"><img src="${p.avatar}"><div><strong>${p.pseudo}</strong></div><input type="text" id="answer-${i}" placeholder="Réponse..."></div>`; 
  }); 
  document.getElementById('validate-round').disabled=false; 
  startTimer(60); 
}

function startTimer(s){ 
  let t=s; 
  const d=document.getElementById('timer'); 
  const i=setInterval(()=>{ 
    t--; 
    const sec = t<10?'0'+t:t;
    d.textContent=`00:${sec}`; 
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

function initGame2(){ state.game2.currentImgIndex=0; state.game2.positions={}; state.currentTeam.players.forEach(p=>state.game2.positions[p.phone]=0); loadDevineImage(); }

function loadDevineImage(){ 
  const img=GAME2_IMAGES[state.game2.currentImgIndex%GAME2_IMAGES.length]; 
  if(img){ 
    document.getElementById('devine-img').src=img.img; 
    document.getElementById('devine-question').textContent=img.description; 
  } 
}

function submitDevine(){ 
  const ans=document.getElementById('devine-input').value.trim().toLowerCase(); 
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
    document.getElementById('devine-input').value = '';
    loadDevineImage(); 
  } else { 
    const pos=Object.entries(state.game2.positions).sort((a,b)=>b[1]-a[1]); 
    const loser=state.currentTeam.players.find(p=>p.phone===pos[0][0]); 
    alert(`💀 ${loser?.pseudo || 'Quelqu\'un'} a perdu le jeu 2 avec ${pos[0][1]} points ! 💀`); 
    document.getElementById('next-game2').classList.remove('hidden'); 
  } 
}

function finishGame(){ 
  const pts=1200; 
  const sz=pts>=1000?300:0; 
  document.getElementById('final-score').textContent=`Score: ${pts}`; 
  if(sz){ 
    document.getElementById('win-reward').classList.remove('hidden'); 
    document.getElementById('group-size').textContent=sz; 
    document.getElementById('lose-ban').classList.add('hidden');
  } else { 
    document.getElementById('lose-ban').classList.remove('hidden'); 
    document.getElementById('win-reward').classList.add('hidden');
    localStorage.setItem('purge_ban', new Date(Date.now()+7*86400000).toISOString()); 
  } 
  showScreen('results'); 
}
