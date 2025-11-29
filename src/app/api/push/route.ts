import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        'mailto:example@yourdomain.org',
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
}

export async function POST(request: Request) {
    const { roomId, senderName } = await request.json();

    if (!process.env.VAPID_PRIVATE_KEY) {
        return NextResponse.json({ success: false, error: 'VAPID keys not configured' }, { status: 500 });
    }

    try {
        // Fetch all subscriptions for this room, excluding the sender
        const { data: subscriptions, error } = await supabase
            .from('push_subscriptions')
            .select('*')
            .eq('room_id', roomId)
            .neq('user_name', senderName);

        if (error || !subscriptions) {
            console.error('Error fetching subscriptions:', error);
            return NextResponse.json({ success: false });
        }

        // Send notifications in parallel
        const notifications = subscriptions.map(sub => {
            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: sub.keys
            };

            const payload = JSON.stringify({
                title: `New message from ${senderName}`,
                body: 'Open Aura to view encrypted message.',
            });

            return webpush.sendNotification(pushSubscription, payload)
                .catch(err => {
                    if (err.statusCode === 410) {
                        // Subscription expired, delete it
                        supabase.from('push_subscriptions').delete().eq('id', sub.id).then();
                    }
                    console.error('Push error:', err);
                });
        });

        await Promise.all(notifications);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error sending push notification:', error);
        return NextResponse.json({ success: false, error: 'Failed to send notification' }, { status: 500 });
    }
}
