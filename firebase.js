const firebaseConfig = {
    apiKey: "AIzaSyAl2Yy6a5w5RVDxC92H8st4ddQPKlMjs8E",
    authDomain: "a-ten-79cb3.firebaseapp.com",
    projectId: "a-ten-79cb3",
    storageBucket: "a-ten-79cb3.firebasestorage.app",
    messagingSenderId: "1058216326991",
    appId: "1:1058216326991:web:6d5af1c44f07404588373a"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
let messaging;
try { messaging = firebase.messaging(); } catch (e) { console.warn('Messaging not available:', e); }

const VAPID_KEY = "BC9l2CW5wr_VoqKp4pr2DvKenWv24lGemx4Vp-_8YyPBL0s7xvdskPyCJV7oU_lFxinGWoX8dgV9kQVCpPNheiw";

// ── Save meds to Firestore ────────────────────────────────────────────────────
window.syncMedsToFirestore = async function (caretakerUsername, meds) {
    try {
        await db.collection('caretakers').doc(caretakerUsername).set({ medications: meds }, { merge: true });
    } catch (e) { console.error('Firestore save error:', e); }
};

// ── Load meds from Firestore ──────────────────────────────────────────────────
window.loadMedsFromFirestore = async function (caretakerUsername) {
    try {
        const snap = await db.collection('caretakers').doc(caretakerUsername).get();
        if (snap.exists) return snap.data().medications || [];
        return [];
    } catch (e) { console.error('Firestore load error:', e); return []; }
};

// ── Listen for real-time med changes ─────────────────────────────────────────
window.listenToMeds = function (caretakerUsername, callback) {
    return db.collection('caretakers').doc(caretakerUsername).onSnapshot(snap => {
        if (snap.exists) callback(snap.data().medications || []);
    });
};

// ── Register FCM token for this device ───────────────────────────────────────
window.registerFCMToken = async function (caretakerUsername, userUsername) {
    try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        const token = await messaging.getToken({ vapidKey: VAPID_KEY });
        if (!token) return;

        await db.collection('caretakers').doc(caretakerUsername)
            .collection('users').doc(userUsername)
            .set({ fcmToken: token, username: userUsername }, { merge: true });

        console.log('FCM token registered:', token);
    } catch (e) { console.error('FCM token error:', e); }
};

// ── Save pill count update back to Firestore ──────────────────────────────────
// ── Save pill count update back to Firestore ──────────────────────────────────
window.updatePillCountInFirestore = async function (caretakerUsername, medId, newCount) {
    try {
        const snap = await db.collection('caretakers').doc(caretakerUsername).get();
        if (!snap.exists) return;
        const meds = snap.data().medications || [];
        const idx = meds.findIndex(m => m.id === medId);
        if (idx !== -1) {
            meds[idx].pillCount = newCount;
            await db.collection('caretakers').doc(caretakerUsername).set({ medications: meds }, { merge: true });
        }
    } catch (e) { console.error('Firestore pill update error:', e); }
};  // <-- close the function HERE

// ── Register caretaker profile in Firestore ───────────────────────────────────
window.registerCaretaker = async function (username, encryptedPhone) {
    try {
        const data = { username, role: 'caretaker' };
        if (encryptedPhone) data.phone = encryptedPhone;
        await db.collection('caretakers').doc(username).set(data, { merge: true });
    } catch (e) { console.error('registerCaretaker error:', e); }
};

// ── Get caretaker's encrypted phone from Firestore ───────────────────────────
window.getCaretakerPhone = async function (username) {
    try {
        const snap = await db.collection('caretakers').doc(username).get();
        return snap.exists ? (snap.data().phone || '') : '';
    } catch (e) { console.error('getCaretakerPhone error:', e); return ''; }
};

// ── Check if a caretaker exists in Firestore ──────────────────────────────────
window.getCaretaker = async function (username) {
    try {
        const snap = await db.collection('caretakers').doc(username).get();
        return snap.exists ? snap.data() : null;
    } catch (e) { console.error('getCaretaker error:', e); return null; }
};

// ── Send a join request (pending) from user to caretaker ─────────────────────
window.linkUserToCaretaker = async function (caretakerUsername, userUsername) {
    try {
        const ref = db.collection('caretakers').doc(caretakerUsername)
            .collection('users').doc(userUsername);
        const snap = await ref.get();
        // Don't overwrite an already-accepted link
        if (snap.exists && snap.data().status === 'accepted') return;
        await ref.set({ username: userUsername, status: 'pending', requestedAt: new Date().toISOString() }, { merge: true });
    } catch (e) { console.error('linkUserToCaretaker error:', e); }
};

// ── Accept a pending user request ─────────────────────────────────────────────
window.acceptUserRequest = async function (caretakerUsername, userUsername) {
    try {
        await db.collection('caretakers').doc(caretakerUsername)
            .collection('users').doc(userUsername)
            .set({ username: userUsername, status: 'accepted', acceptedAt: new Date().toISOString() }, { merge: true });
    } catch (e) { console.error('acceptUserRequest error:', e); }
};

// ── Get all users for a caretaker (optionally filter by status) ───────────────
window.getCaretakerUsers = async function (caretakerUsername) {
    try {
        const snap = await db.collection('caretakers').doc(caretakerUsername).collection('users').get();
        return snap.docs.map(d => d.data());
    } catch (e) { console.error('getCaretakerUsers error:', e); return []; }
};

// ── Remove a user from a caretaker in Firestore ───────────────────────────────
window.removeUserFromCaretaker = async function (caretakerUsername, userUsername) {
    try {
        await db.collection('caretakers').doc(caretakerUsername)
            .collection('users').doc(userUsername).delete();
    } catch (e) { console.error('removeUserFromCaretaker error:', e); }
};

// ── Handle foreground notifications ──────────────────────────────────────────
if (messaging) {
    messaging.onMessage((payload) => {
        const { title, body } = payload.notification;
        if (Notification.permission === 'granted') {
            new Notification(title, { body, icon: '/miclcon.png' });
        }
    });
}