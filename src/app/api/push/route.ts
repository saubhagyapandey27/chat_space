import { NextResponse } from 'next/server';
import webpush from 'web-push';

if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        'mailto:example@yourdomain.org',
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
}

export async function POST(request: Request) {
    const { subscription, title, body } = await request.json();

    try {
        if (!process.env.VAPID_PRIVATE_KEY) {
            throw new Error('VAPID keys not configured');
        }
        await webpush.sendNotification(subscription, JSON.stringify({ title, body }));
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error sending push notification:', error);
        return NextResponse.json({ success: false, error: 'Failed to send notification' }, { status: 500 });
    }
}
