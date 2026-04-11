// Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyB3yYAuiGqbtrbZ1aSYxAjduZ65adNIpag",
  authDomain: "purge-game-58718.firebaseapp.com",
  databaseURL: "https://purge-game-58718-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "purge-game-58718",
  storageBucket: "purge-game-58718.firebasestorage.app",
  messagingSenderId: "554574972856",
  appId: "1:554574972856:web:9de17e7f77eb7b5be4b14d"
};

// Initialiser Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
