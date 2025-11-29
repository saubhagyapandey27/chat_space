import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { hashPassphrase, generateMasterKey, encryptMasterKey, decryptMasterKey } from '@/lib/crypto';
import { Lock, User, Key } from 'lucide-react';

interface LoginProps {
    onLogin: (key: CryptoKey, roomId: string, userName: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
    const [mode, setMode] = useState<'login' | 'create'>('login');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Login State
    const [loginPassphrase, setLoginPassphrase] = useState('');

    // Create Room State
    const [roomName, setRoomName] = useState('');
    const [user1Name, setUser1Name] = useState('');
    const [user1Pass, setUser1Pass] = useState('');
    const [user2Name, setUser2Name] = useState('');
    const [user2Pass, setUser2Pass] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const hash = await hashPassphrase(loginPassphrase);

            const { data: participant, error: fetchError } = await supabase
                .from('participants')
                .select('room_id, user_name, encrypted_master_key')
                .eq('passphrase_hash', hash)
                .single();

            if (fetchError || !participant) {
                throw new Error('Invalid passphrase or room not found.');
            }

            const masterKey = await decryptMasterKey(participant.encrypted_master_key, loginPassphrase);
            onLogin(masterKey, participant.room_id, participant.user_name);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (!roomName || !user1Name || !user1Pass || !user2Name || !user2Pass) {
                throw new Error('All fields are required');
            }

            const { data: room, error: roomError } = await supabase
                .from('rooms')
                .insert({ name: roomName })
                .select()
                .single();

            if (roomError) throw roomError;

            const masterKey = await generateMasterKey();
            const encKey1 = await encryptMasterKey(masterKey, user1Pass);
            const encKey2 = await encryptMasterKey(masterKey, user2Pass);
            const hash1 = await hashPassphrase(user1Pass);
            const hash2 = await hashPassphrase(user2Pass);

            const { error: partError } = await supabase
                .from('participants')
                .insert([
                    { room_id: room.id, user_name: user1Name, passphrase_hash: hash1, encrypted_master_key: encKey1 },
                    { room_id: room.id, user_name: user2Name, passphrase_hash: hash2, encrypted_master_key: encKey2 }
                ]);

            if (partError) throw partError;

            onLogin(masterKey, room.id, user1Name);

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to create room');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-surface-variant-light dark:bg-surface-variant-dark transition-colors">
            <div className="mb-8 text-center">
                <h1 className="text-4xl font-normal text-onSurface-light dark:text-onSurface-dark mb-2 tracking-tight">Aura</h1>
                <p className="text-onSurface-variant-light dark:text-onSurface-variant-dark">Secure. Private. Yours.</p>
            </div>

            <div className="w-full max-w-md material-card p-8">
                <div className="flex mb-8 bg-surface-variant-light dark:bg-surface-variant-dark rounded-full p-1">
                    <button
                        className={`flex-1 py-2 rounded-full text-sm font-medium transition-all ${mode === 'login' ? 'bg-surface-light dark:bg-surface-dark shadow-sm text-primary-light dark:text-primary-dark' : 'text-onSurface-variant-light dark:text-onSurface-variant-dark'}`}
                        onClick={() => setMode('login')}
                    >
                        Login
                    </button>
                    <button
                        className={`flex-1 py-2 rounded-full text-sm font-medium transition-all ${mode === 'create' ? 'bg-surface-light dark:bg-surface-dark shadow-sm text-primary-light dark:text-primary-dark' : 'text-onSurface-variant-light dark:text-onSurface-variant-dark'}`}
                        onClick={() => setMode('create')}
                    >
                        Create Room
                    </button>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-200 rounded-xl text-sm flex items-center gap-2">
                        <span className="text-lg">⚠️</span> {error}
                    </div>
                )}

                {mode === 'login' ? (
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="relative">
                            <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-onSurface-variant-light dark:text-onSurface-variant-dark" />
                            <input
                                type="password"
                                value={loginPassphrase}
                                onChange={(e) => setLoginPassphrase(e.target.value)}
                                className="material-input pl-12"
                                placeholder="Enter your passphrase"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="material-btn-primary"
                        >
                            {loading ? 'Unlocking...' : 'Enter Aura'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleCreateRoom} className="space-y-6">
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-onSurface-variant-light dark:text-onSurface-variant-dark" />
                            <input
                                type="text"
                                value={roomName}
                                onChange={(e) => setRoomName(e.target.value)}
                                className="material-input pl-12"
                                placeholder="Room Name"
                            />
                        </div>

                        <div className="space-y-4 pt-2">
                            <h3 className="text-sm font-medium text-primary-light dark:text-primary-dark uppercase tracking-wider text-xs">You</h3>
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    value={user1Name}
                                    onChange={(e) => setUser1Name(e.target.value)}
                                    className="material-input"
                                    placeholder="Your Name"
                                />
                                <input
                                    type="password"
                                    value={user1Pass}
                                    onChange={(e) => setUser1Pass(e.target.value)}
                                    className="material-input"
                                    placeholder="Your Passphrase"
                                />
                            </div>
                        </div>

                        <div className="space-y-4 pt-2">
                            <h3 className="text-sm font-medium text-primary-light dark:text-primary-dark uppercase tracking-wider text-xs">Partner</h3>
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    value={user2Name}
                                    onChange={(e) => setUser2Name(e.target.value)}
                                    className="material-input"
                                    placeholder="Partner's Name"
                                />
                                <input
                                    type="password"
                                    value={user2Pass}
                                    onChange={(e) => setUser2Pass(e.target.value)}
                                    className="material-input"
                                    placeholder="Partner's Passphrase"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="material-btn-primary"
                        >
                            {loading ? 'Creating...' : 'Create Room'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
