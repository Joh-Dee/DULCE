'use strict';

const SUPABASE_URL = 'https://ehjfkrabnbgbfiaqlwfd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoamZrcmFibmJnYmZpYXFsd2ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NzcxMTksImV4cCI6MjA5MTE1MzExOX0.4qC2R9UyauOLhqfuMos8JX2nR02KDYJXumOEoazDa1k';

// ============ INIT ============

let db;
let currentUser = null;
let userProfile = null;
let partnerProfile = null;
let myAnim = null;
let partnerAnim = null;
let myUpdatedAt = null;
let partnerUpdatedAt = null;

const $ = id => document.getElementById(id);

const STATUS = [
  { id: 'free', label: 'Free', file: 'free.json' },
  { id: 'teaching', label: 'Teaching', file: 'teaching.json' },
  { id: 'busy', label: 'Busy', file: 'busy.json' },
  { id: 'eating', label: 'Eating', file: 'eating.json' },
  { id: 'tired', label: 'Tired', file: 'tired.json' },
  { id: 'studying', label: 'Studying', file: 'studying.json' },
  { id: 'sleeping', label: 'Sleeping', file: 'sleeping.json' },
  { id: 'working', label: 'Working', file: 'working.json' }
];

const QUOTES = [
  'No sugar needed when I have CHO.',
  'Two souls, one heartbeat.',
  'Miles apart, but always close at heart.',
  'Just thinking about you... again.',
  'CHO, you are as sweet as ever.'
];

// ============ DOM READY ============

document.addEventListener('DOMContentLoaded', () => {
  if (typeof supabase !== 'undefined') {
    db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  } else {
    console.error('Supabase not loaded');
    return;
  }

  checkSession();
  setupAuthListeners();
});

// ============ SESSION CHECK ============

async function checkSession() {
  const { data: { session } } = await db.auth.getSession();
  
  if (session) {
    currentUser = session.user;
    await loadProfile();
  }
}

async function loadProfile() {
  const { data } = await db
    .from('profiles')
    .select('*')
    .eq('id', currentUser.id)
    .single();

  if (data) {
    userProfile = data;
    checkPairing();
  }
}

// ============ AUTH LISTENERS ============

function setupAuthListeners() {
  // Login Form
  $('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = $('loginEmail').value.trim();
    const password = $('loginPassword').value;

    const { data, error } = await db.auth.signInWithPassword({ email, password });

    if (error) {
      showAuthError('login', error.message);
    } else {
      currentUser = data.user;
      await loadProfile();
    }
  });

  // Register Form
  $('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = $('regName').value.trim();
    const email = $('regEmail').value.trim();
    const password = $('regPassword').value;
    
    const selectedGender = document.querySelector('.gender-card.selected');
    const selectedAvatar = document.querySelector('.avatar-card.selected');
    
    if (!selectedGender) {
      showAuthError('register', 'Please select gender');
      return;
    }
    if (!selectedAvatar) {
      showAuthError('register', 'Please select an avatar');
      return;
    }

    const gender = selectedGender.dataset.gender;
    const avatar = selectedAvatar.dataset.avatar;

    // Sign Up
    const { data, error } = await db.auth.signUp({ email, password });

    if (error) {
      showAuthError('register', error.message);
      return;
    }

    currentUser = data.user;

    // Save Profile
    const { error: profileError } = await db
      .from('profiles')
      .insert({
        id: currentUser.id,
        display_name: name,
        gender: gender,
        avatar: avatar
      });

    if (profileError) {
      showAuthError('register', profileError.message);
    } else {
      userProfile = { id: currentUser.id, display_name: name, gender, avatar };
      checkPairing();
    }
  });

  // Toggle Login/Register
  $('showRegister').addEventListener('click', () => {
    $('loginPage').classList.add('hidden');
    $('registerPage').classList.remove('hidden');
  });

  $('showLogin').addEventListener('click', () => {
    $('registerPage').classList.add('hidden');
    $('loginPage').classList.remove('hidden');
  });

  // Gender Select
  document.querySelectorAll('.gender-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.gender-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      updateAvatarGrid(card.dataset.gender);
    });
  });
}

// ============ AVATAR GRID ============

function updateAvatarGrid(gender) {
  const grid = $('avatarGrid');
  grid.innerHTML = '';

  const avatars = gender === 'boy' 
    ? ['boy1.jpg', 'boy2.jpg']
    : ['girl1.jpg', 'girl2.jpg'];

  avatars.forEach(avatar => {
    const card = document.createElement('div');
    card.className = 'avatar-card';
    card.dataset.avatar = avatar;
    card.innerHTML = `<img src="${avatar}" alt="avatar" />`;

    card.addEventListener('click', () => {
      document.querySelectorAll('.avatar-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
    });

    grid.appendChild(card);
  });
}

// ============ ERROR ============

function showAuthError(type, message) {
  const errorEl = type === 'login' ? $('loginError') : $('registerError');
  errorEl.textContent = message;
  errorEl.classList.remove('hidden');
  setTimeout(() => errorEl.classList.add('hidden'), 4000);
}

// ============ PAIRING CHECK ============

// ============ PAIRING CHECK ============

async function checkPairing() {
  // Check if user is already paired
  const { data: pairData } = await db
    .from('pairs')
    .select('*')
    .or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`)
    .single();

  if (pairData) {
    // Already paired  Go to Main App
    const partnerId = pairData.user1_id === currentUser.id 
      ? pairData.user2_id 
      : pairData.user1_id;
    
    // Load partner profile
    const { data: partner } = await db
      .from('profiles')
      .select('*')
      .eq('id', partnerId)
      .single();
    
    partnerProfile = partner;
    
    // Hide auth pages, show main app
    $('loginPage').classList.add('hidden');
    $('registerPage').classList.add('hidden');
    $('pairingPage').classList.add('hidden');
    $('mainApp').classList.remove('hidden');
    
    startApp();
  } else {
    // Not paired  Go to Pairing Screen
    $('loginPage').classList.add('hidden');
    $('registerPage').classList.add('hidden');
    $('pairingPage').classList.remove('hidden');
    $('mainApp').classList.add('hidden');
    
    setupPairingScreen();
  }
}


// ============ PAIRING SCREEN ============

async function setupPairingScreen() {
  await generateInviteCode();

  // Copy button
  $('shareCodeBtn').addEventListener('click', () => {
    const code = $('myInviteCode').textContent;
    if (code === '----' || !code) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(() => {
        showToast('Code copied! ');
      }).catch(() => {
        fallbackCopy(code);
      });
    } else {
      fallbackCopy(code);
    }
  });

  // Join button
  $('joinCodeBtn').addEventListener('click', async () => {
    const code = $('partnerCode').value.trim().toUpperCase();
    if (!code) {
      showPairingError('Please enter a code');
      return;
    }
    await joinWithCode(code);
  });
}

//  ဒီ function က setupPairingScreen အပြင်မှာ ရှိရပါမယ်
function fallbackCopy(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();

  try {
    document.execCommand('copy');
    showToast('Code copied! ');
  } catch (e) {
    showPairingError('Failed to copy');
  }

  document.body.removeChild(textarea);
  }



async function generateInviteCode() {
  console.log('Generating code for user:', currentUser.id);
  
  const { data: existing, error: existError } = await db
    .from('invite_codes')
    .select('*')
    .eq('created_by', currentUser.id)
    .eq('is_used', false)
    .maybeSingle();
  
  console.log('Existing:', existing, 'Error:', existError);
  
  if (existing) {
    console.log('Found existing code:', existing.code);
    $('myInviteCode').textContent = existing.code;
    return;
  }
  
  const code = 'DULCE-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  console.log('Generated new code:', code);
  
  const { error } = await db
    .from('invite_codes')
    .insert({
      code: code,
      created_by: currentUser.id
    });
  
  if (error) {
    console.error('Insert error:', error.message, error.details);
    showPairingError('Failed to generate code: ' + error.message);
  } else {
    console.log('Code saved!');
    $('myInviteCode').textContent = code;
  }
}

async function joinWithCode(code) {
  // Find the code
  const { data: codeData, error: codeError } = await db
    .from('invite_codes')
    .select('*')
    .eq('code', code)
    .eq('is_used', false)
    .maybeSingle();
  
  if (codeError || !codeData) {
    showPairingError('Invalid or expired code');
    return;
  }
  
  // Can't pair with yourself
  if (codeData.created_by === currentUser.id) {
    showPairingError('You cannot pair with yourself');
    return;
  }
  
  // Check if partner is already paired
  const { data: partnerPair } = await db
    .from('pairs')
    .select('*')
    .or(`user1_id.eq.${codeData.created_by},user2_id.eq.${codeData.created_by}`)
    .maybeSingle();
  
  if (partnerPair) {
    showPairingError('This person is already paired');
    return;
  }
  
  // Create pair
  const { error: pairError } = await db
    .from('pairs')
    .insert({
      user1_id: codeData.created_by,
      user2_id: currentUser.id
    });
  
  if (pairError) {
    showPairingError('Failed to pair. Try again.');
    return;
  }
  
  // Mark code as used
  await db
    .from('invite_codes')
    .update({ is_used: true, used_by: currentUser.id })
    .eq('code', code);
  
  // Load partner profile
  const { data: partner } = await db
    .from('profiles')
    .select('*')
    .eq('id', codeData.created_by)
    .single();
  
  partnerProfile = partner;
  
  // Go to Main App
  $('pairingPage').classList.add('hidden');
  $('mainApp').classList.remove('hidden');
  
  startApp();
}

function showPairingError(message) {
  const el = $('pairingError');
  el.textContent = message;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 4000);
    }
