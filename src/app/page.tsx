"use client";

import { useState, useEffect } from 'react';
import Login from '@/components/Login';
import Chat from '@/components/Chat';
import { supabase } from '@/lib/supabase';

export default function Home() {
    const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);
    const [roomId, setRoomId] = useState<string | null>(null);
    const [userName, setUserName] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for saved session with timeout
        const loadSession = async () => {
            const savedRoomId = localStorage.getItem('chat_roomId');
            const savedUserName = localStorage.getItem('chat_userName');
            const savedKeyJwk = localStorage.getItem('chat_masterKey');

            if (savedRoomId && savedUserName && savedKeyJwk) {
                try {
                    // Promise.race to timeout after 5 seconds
                    const checkRoom = supabase.from('rooms').select('id').eq('id', savedRoomId).single();
                    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000));

                    const { data: room } = await Promise.race([checkRoom, timeout]) as any;

                    if (!room) {
                        console.warn("Room not found, clearing session");
                        localStorage.clear();
                        setLoading(false);
                        return;
                    }

                    const jwk = JSON.parse(savedKeyJwk);
                    const key = await window.crypto.subtle.importKey(
                        "jwk",
                        jwk,
                        { name: "AES-GCM", length: 256 },
                        true,
                        ["encrypt", "decrypt"]
                    );
                    setEncryptionKey(key);
                    setRoomId(savedRoomId);
                    setUserName(savedUserName);
                } catch (e) {
                    console.error("Failed to restore session", e);
                    localStorage.clear();
                }
            }
            setLoading(false);
        };

        loadSession();
    }, []);

    const handleLogin = async (key: CryptoKey, room: string, user: string) => {
        setEncryptionKey(key);
        setRoomId(room);
        setUserName(user);

        // Persist session
        try {
            const jwk = await window.crypto.subtle.exportKey("jwk", key);
            localStorage.setItem('chat_roomId', room);
            localStorage.setItem('chat_userName', user);
            localStorage.setItem('chat_masterKey', JSON.stringify(jwk));
        } catch (e) {
            console.error("Failed to save session", e);
        }
    };

    const handleLogout = () => {
        setEncryptionKey(null);
        setRoomId(null);
        setUserName(null);
        localStorage.clear();
    };

    if (loading) {
        return <div className="min-h-screen bg-surface-variant-light dark:bg-surface-variant-dark flex items-center justify-center text-onSurface-light dark:text-onSurface-dark">Loading...</div>;
    }

    if (!encryptionKey || !roomId || !userName) {
        return <Login onLogin={handleLogin} />;
    }

    return <Chat encryptionKey={encryptionKey} roomId={roomId} userName={userName} onLogout={handleLogout} />;
}
