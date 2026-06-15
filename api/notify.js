import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

function getApp() {
    if (getApps().length) return getApps()[0];
    return initializeApp({
        credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        })
    });
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const { token, medName } = req.body;

    try {
        getApp();
        const messaging = getMessaging();

        await messaging.send({
            token,
            notification: {
                title: '💊 Time to take your medication',
                body: medName,
            },
            webpush: {
                fcmOptions: {
                    link: 'https://summative-csp-5-rho.vercel.app/user.html'
                }
            }
        });

        res.status(200).json({ success: true });
    } catch (e) {
        console.error('Notify error:', e);
        res.status(500).json({ error: e.message });
    }
}