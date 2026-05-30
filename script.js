'use strict';

const SUPABASE_URL = 'https://ehjfkrabnbgbfiaqlwfd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoamZrcmFibmJnYmZpYXFsd2ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NzcxMTksImV4cCI6MjA5MTE1MzExOX0.4qC2R9UyauOLhqfuMos8JX2nR02KDYJXumOEoazDa1k';

// ==========================================
//                 INIT
// ==========================================

let db;
let currentUser = null;
let userProfile = null;
let partnerProfile = null;
let myAnim = null;
let partnerAnim = null;
let myUpdatedAt = null;
let partnerUpdatedAt = null;

const $ = id => document.getElementById(id);

// ==========================================
//              STATUS CONFIG
// ==========================================

const STATUS = [
  { id: 'atHome', label: 'At Home', file: 'lottie/atHome.json' },
  { id: 'busy', label: 'Busy Right Now', file: 'lottie/busy.json' },
  { id: 'callMe', label: 'Call Me Maybe', file: 'lottie/callMe.json' },
  { id: 'doNotDisturb', label: 'Do Not Disturb', file: 'lottie/doNotDisturb.json' },
  { id: 'eating', label: 'Having a Meal', file: 'lottie/eating.json' },
  { id: 'free', label: 'Feeling Free', file: 'lottie/free.json' },
  { id: 'gaming', label: 'Gaming Time', file: 'lottie/gaming.json' },
  { id: 'goingOutside', label: 'Going Outside', file: 'lottie/goingOutside.json' },
  { id: 'happy', label: 'Feeling Happy', file: 'lottie/happy.json' },
  { id: 'listeningMusic', label: 'Listening to Music', file: 'lottie/listeningMusic.json' },
  { id: 'lowEnergy', label: 'Low Energy Mode', file: 'lottie/lowEnergy.json' },
  { id: 'missYou', label: 'Missing You', file: 'lottie/missYou.json' },
  { id: 'needHug', label: 'Need a Hug', file: 'lottie/needHug.json' },
  { id: 'relaxed', label: 'Just Relaxing', file: 'lottie/relaxed.json' },
  { id: 'sad', label: 'Feeling Sad', file: 'lottie/sad.json' },
  { id: 'sleeping', label: 'Fast Asleep', file: 'lottie/sleeping.json' },
  { id: 'teaching', label: 'Teaching Mode', file: 'lottie/teaching.json' },
  { id: 'tired', label: 'Feeling Tired', file: 'lottie/tired.json' },
  { id: 'watchingMovie', label: 'Movie Time', file: 'lottie/watchingMovie.json' },
  { id: 'working', label: 'Working Hard', file: 'lottie/working.json' }
];

// ==========================================
//              QUOTES
// ==========================================

const QUOTES = [
  'No sugar needed when I have CHO.',
  'Two souls, one heartbeat.',
  'Miles apart, but always close at heart.',
  'Just thinking about you... again.',
  'CHO, you are as sweet as ever.'
];

// ==========================================
//              DOM READY
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  if (typeof supabase !== 'undefined') {
    db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  } else {
    console.error(' Supabase not loaded');
    return;
  }

  checkSession();
  setupAuthListeners();
});

// ==========================================
//            SESSION CHECK
// ==========================================

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
    .maybeSingle();

  if (data) {
    userProfile = data;
    checkPairing();
  }
}

// ==========================================
//            AUTH LISTENERS
// ==========================================

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

// ==========================================
//            AVATAR GRID
// ==========================================

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

// ==========================================
//            AUTH ERROR
// ==========================================

function showAuthError(type, message) {
  const errorEl = type === 'login' ? $('loginError') : $('registerError');
  errorEl.textContent = message;
  errorEl.classList.remove('hidden');
  setTimeout(() => errorEl.classList.add('hidden'), 4000);
}

// ==========================================
//            PAIRING CHECK
// ==========================================

async function checkPairing() {
  const { data: pairData } = await db
    .from('pairs')
    .select('*')
    .or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`)
    .maybeSingle(); //  fixed: .single()  .maybeSingle()

  if (pairData) {
    // Already paired  Go to Main App
    const partnerId = pairData.user1_id === currentUser.id 
      ? pairData.user2_id 
      : pairData.user1_id;
    
    const { data: partner } = await db
      .from('profiles')
      .select('*')
      .eq('id', partnerId)
      .single();
    
    partnerProfile = partner;
    
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

// ==========================================
//            PAIRING SCREEN
// ==========================================

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

// ==========================================
//            FALLBACK COPY
// ==========================================

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

// ==========================================
//          GENERATE INVITE CODE
// ==========================================

async function generateInviteCode() {
  const { data: existing } = await db
    .from('invite_codes')
    .select('*')
    .eq('created_by', currentUser.id)
    .eq('is_used', false)
    .maybeSingle();
  
  if (existing) {
    $('myInviteCode').textContent = existing.code;
    return;
  }
  
  const code = 'DULCE-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  
  const { error } = await db
    .from('invite_codes')
    .insert({
      code: code,
      created_by: currentUser.id
    });
  
  if (error) {
    showPairingError('Failed to generate code: ' + error.message);
  } else {
    $('myInviteCode').textContent = code;
  }
}

// ==========================================
//            JOIN WITH CODE
// ==========================================

async function joinWithCode(code) {
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
  
  if (codeData.created_by === currentUser.id) {
    showPairingError('You cannot pair with yourself');
    return;
  }
  
  const { data: partnerPair } = await db
    .from('pairs')
    .select('*')
    .or(`user1_id.eq.${codeData.created_by},user2_id.eq.${codeData.created_by}`)
    .maybeSingle();
  
  if (partnerPair) {
    showPairingError('This person is already paired');
    return;
  }
  
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
  
// Mark partner's code as used
await db
  .from('invite_codes')
  .update({ is_used: true, used_by: currentUser.id })
  .eq('code', code);

//  ဒါထည့် - ကိုယ့်ရဲ့ code တွေကိုလည်း used လုပ်
await db
  .from('invite_codes')
  .update({ is_used: true })
  .eq('created_by', currentUser.id)
  .eq('is_used', false);

  
  const { data: partner } = await db
    .from('profiles')
    .select('*')
    .eq('id', codeData.created_by)
    .maybeSingle();
  
  partnerProfile = partner;
  
  $('pairingPage').classList.add('hidden');
  $('mainApp').classList.remove('hidden');
  
  startApp();
}

// ==========================================
//            PAIRING ERROR
// ==========================================

function showPairingError(message) {
  const el = $('pairingError');
  if (!el) return;
  
  el.textContent = message;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 4000);
}

// ==========================================
//               TOAST
// ==========================================

let toastTimer;

function showToast(text) {
  const toast = $('toast');
  if (!toast) return;
  
  toast.textContent = text;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

// ==========================================
//             MAIN APP
// ==========================================

async function startApp() {
  console.log('userProfile:');
  
  // Determine who is who
  const isBoy = userProfile.gender === 'boy';
  
  // Set My Avatar & Name (always left side)
  $('myAvatar').src = userProfile.avatar;
  $('myName').textContent = userProfile.display_name;
  
  // Set Partner Avatar & Name (always right side)
  $('partnerAvatar').src = partnerProfile.avatar;
  $('partnerName').textContent = partnerProfile.display_name;

    // Update QUOTES with partner name
  QUOTES.length = 0;
  QUOTES.push(
    'Two souls, one heartbeat.',
    `No sugar needed when I have ${partnerProfile?.display_name || 'you'}.`,
    'Miles apart, but always close at heart.',
    `Just thinking about ${partnerProfile?.display_name || 'you'}... again.`,
    'You are sweeter than honey.'
  );

  buildStatusList();
  await loadStates();
  subscribeRealtime();
  subscribeBuzz();
  subscribePairingRealtime();
  setupSheet();
  setupFlutter();
  startTyping();
  setInterval(updateTimes, 1000);
}

// ==========================================
//           BUILD STATUS LIST
// ==========================================

function buildStatusList() {
  $('statusList').innerHTML = '';

  STATUS.forEach(status => {
    const div = document.createElement('div');
    div.className = 'status-item';
    div.textContent = status.label;

    div.addEventListener('click', () => updateStatus(status));
    

    $('statusList').appendChild(div);
  });
}

// ==========================================
//           UPDATE STATUS
// ==========================================

async function updateStatus(status) {
  const now = new Date().toISOString();

  const { error } = await db
    .from('couple_state')
    .upsert({
      user_id: currentUser.id,
      current_status: status.id,
      updated_at: now
    }, {
      onConflict: 'user_id'
    });

  if (error) {
    console.error('Update error:', error);
    showToast('Failed to update');
    return;
  }

  renderMy(status.id, now);
  closeSheet();
  showToast('Status updated ');
}

// ==========================================
//            LOAD STATES
// ==========================================

async function loadStates() {
  // Load my state
  const { data: myData } = await db
    .from('couple_state')
    .select('*')
    .eq('user_id', currentUser.id)
    .maybeSingle();

  if (myData) {
    renderMy(myData.current_status, myData.updated_at);
  }

  // Load partner state
  if (partnerProfile) {
    const { data: partnerData } = await db
      .from('couple_state')
      .select('*')
      .eq('user_id', partnerProfile.id)
      .maybeSingle();

    if (partnerData) {
      renderPartner(partnerData.current_status, partnerData.updated_at);
    }
  }
}

// ==========================================
//              RENDER
// ==========================================

function renderMy(statusId, time) {
  const status = STATUS.find(s => s.id === statusId);
  if (!status) return;

  $('myStatus').textContent = status.label;
  myUpdatedAt = time;
  loadLottie('my', status.file);
}

function renderPartner(statusId, time) {
  const status = STATUS.find(s => s.id === statusId);
  if (!status) return;

  $('partnerStatus').textContent = status.label;
  partnerUpdatedAt = time;
  loadLottie('partner', status.file);
}

// ==========================================
//              LOTTIE
// ==========================================

function loadLottie(type, file) {
  const container = type === 'my' ? $('myLottie') : $('partnerLottie');

  if (type === 'my' && myAnim) {
    myAnim.destroy();
    myAnim = null;
  }
  if (type === 'partner' && partnerAnim) {
    partnerAnim.destroy();
    partnerAnim = null;
  }

  container.innerHTML = '';

  const anim = lottie.loadAnimation({
    container,
    renderer: 'svg',
    loop: true,
    autoplay: true,
    path: file
  });

  if (type === 'my') {
    myAnim = anim;
  } else {
    partnerAnim = anim;
  }
}



// ==========================================
//            REALTIME
// ==========================================

function subscribeRealtime() {
  db.channel('couple-sync')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'couple_state' },
      payload => {
        const row = payload.new;
        if (!row) return;

        if (partnerProfile && row.user_id === partnerProfile.id) {
          renderPartner(row.current_status, row.updated_at);
        }
      }
    )
    .subscribe();
}

// ==========================================
//               TIME
// ==========================================

function updateTimes() {
  if (myUpdatedAt) {
    $('myTime').textContent = timeAgo(myUpdatedAt);
  }
  if (partnerUpdatedAt) {
    $('partnerTime').textContent = timeAgo(partnerUpdatedAt);
  }
}

function timeAgo(date) {
  const sec = Math.floor((Date.now() - new Date(date)) / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  return `${hr}h ago`;
}

// ==========================================
//              TYPING
// ==========================================

let quoteIndex = 0;
let charIndex = 0;
let deleting = false;
let typingTimer = null;
let isTypingPaused = false;

function startTyping() {
  const el = $('typingText');

  function type() {
    if (isTypingPaused) return;

    const quote = QUOTES[quoteIndex];

    if (!deleting) {
      el.textContent = quote.slice(0, charIndex++);
      if (charIndex > quote.length) {
        deleting = true;
        typingTimer = setTimeout(type, 2000);
        return;
      }
      typingTimer = setTimeout(type, 160);
    } else {
      el.textContent = quote.slice(0, charIndex--);
      if (charIndex < 0) {
        deleting = false;
        quoteIndex = (quoteIndex + 1) % QUOTES.length;
        typingTimer = setTimeout(type, 600);
        return;
      }
      typingTimer = setTimeout(type, 26);
    }
  }

  type();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      isTypingPaused = true;
      clearTimeout(typingTimer);
    } else {
      isTypingPaused = false;
      type();
    }
  });
}

// ==========================================
//              SHEET
// ==========================================

function setupSheet() {
  $('openSheetBtn').addEventListener('click', openSheet);
  $('openSheetBtn').addEventListener('touchend', (e) => {
    e.preventDefault();
    openSheet();
  });

  $('overlay').addEventListener('click', closeSheet);
  $('overlay').addEventListener('touchend', (e) => {
    e.preventDefault();
    closeSheet();
  });

  window.addEventListener('popstate', () => {
    if ($('sheet').classList.contains('active')) {
      closeSheetSilent();
    }
  });

  //  Swipe Down on Handle ONLY (not on scroll area)
  let startY = 0;

  $('sheetHandle').addEventListener('touchstart', (e) => {
    startY = e.touches[0].clientY;
  });

  $('sheetHandle').addEventListener('touchend', (e) => {
    const endY = e.changedTouches[0].clientY;
    if (endY - startY > 50) {
      closeSheet();
    }
    startY = 0;
  });

  // Logout Button
  $('logoutBtn').addEventListener('click', () => {
    $('logoutConfirm').classList.add('active');
  });

  // Cancel Logout
  $('cancelLogout').addEventListener('click', () => {
    $('logoutConfirm').classList.remove('active');
  });

  // Confirm Logout
  $('confirmLogout').addEventListener('click', async () => {
    await db.auth.signOut();
    localStorage.clear();
    location.reload();
  });
        }

function openSheet() {
  if ($('sheet').classList.contains('active')) return;

  $('sheet').classList.add('active');
  $('overlay').classList.add('active');
  history.pushState({ sheetOpen: true }, '', window.location.href);
}

function closeSheet() {
  if (!$('sheet').classList.contains('active')) return;

  $('sheet').classList.remove('active');
  $('overlay').classList.remove('active');

  if (history.state && history.state.sheetOpen) {
    history.back();
  }
}

function closeSheetSilent() {
  $('sheet').classList.remove('active');
  $('overlay').classList.remove('active');
}

// ==========================================
//            MISS YOU (FLUTTER)
// ==========================================

const LONG_PRESS = 2000;
const RING = 351.8;
let pressing = false;
let startPressTime = 0;
let raf;

function setupFlutter() {
  const btn = $('flutterBtn');

  btn.addEventListener('touchstart', beginPress, { passive: false });
  btn.addEventListener('mousedown', beginPress);

  ['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach(event => {
    btn.addEventListener(event, stopPress);
  });
}

function beginPress(e) {
  e.preventDefault();
  pressing = true;
  startPressTime = Date.now();
  tickPress();
}

function tickPress() {
  if (!pressing) return;

  const elapsed = Date.now() - startPressTime;
  const progress = Math.min(elapsed / LONG_PRESS, 1);
  $('ringFill').style.strokeDashoffset = RING * (1 - progress);

  if (progress >= 1) {
    finishPress();
    return;
  }

  raf = requestAnimationFrame(tickPress);
}

function stopPress() {
  pressing = false;
  cancelAnimationFrame(raf);
  $('ringFill').style.strokeDashoffset = RING;
}

async function finishPress() {
  pressing = false;
  cancelAnimationFrame(raf);
  $('ringFill').style.strokeDashoffset = RING;

  // Partner ရဲ့ buzz_count +1
  const { data: existing } = await db
    .from('buzz_counter')
    .select('buzz_count')
    .eq('user_id', partnerProfile.id)
    .maybeSingle();

  const newCount = existing ? existing.buzz_count + 1 : 1;

  await db
    .from('buzz_counter')
    .upsert({
      user_id: partnerProfile.id,
      buzz_count: newCount,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    });

  showToast('Miss you sent ');

  try {
    if (navigator.vibrate) {
      navigator.vibrate([120, 60, 120]);
    }
  } catch (e) {
    // vibrate not supported
  }

  showBuzz();
}
// ==========================================
//         PAIRING REALTIME
// ==========================================

function subscribePairingRealtime() {
  db.channel('pairing-sync')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'pairs' },
      payload => {
        const row = payload.new;
        if (row.user1_id === currentUser.id || row.user2_id === currentUser.id) {
          loadProfile();
        }
      }
    )
    .subscribe();
    }

// ==========================================
//               BUZZ
// ==========================================

function subscribeBuzz() {
  db.channel('buzz-sync')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'buzz_counter' },
      payload => {
        if (payload.new.user_id === currentUser.id) {
          showBuzz();
        }
      }
    )
    .subscribe();
}

function showBuzz() {
  $('buzzOverlay').classList.add('active');

  try {
    if (navigator.vibrate) {
      navigator.vibrate([120, 60, 120]);
    }
  } catch (e) {
    // vibrate not supported
  }

  setTimeout(() => {
    $('buzzOverlay').classList.remove('active');
  }, 3000);
}

    console.log('Success');
