import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { encryptMessage, decryptMessage } from '@/lib/crypto';
import { Send, LogOut, Trash2, Archive, X, Plus, ExternalLink, FileText, Image as ImageIcon } from 'lucide-react';
import Dialog from './ui/Dialog';

interface ChatProps {
    encryptionKey: CryptoKey;
    roomId: string;
    userName: string;
    onLogout: () => void;
}

interface Message {
    id: string;
    content: string;
    sender_name: string;
    created_at: string;
    decryptedContent?: string;
    isOwn?: boolean;
}

interface ArchiveItem {
    id: string;
    type: 'link' | 'note' | 'photo';
    content: string; // Decrypted
    tags: string[];
    created_by: string;
    created_at: string;
}

const ARCHIVE_TAGS = ['Link', 'Photo', 'Note', 'Important', 'Memory', 'Idea', 'To-Do'];

export default function Chat({ encryptionKey, roomId, userName, onLogout }: ChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [roomName, setRoomName] = useState('');

    // Archive State
    const [showArchives, setShowArchives] = useState(false);
    const [archives, setArchives] = useState<ArchiveItem[]>([]);
    const [newArchiveContent, setNewArchiveContent] = useState('');
    const [selectedTag, setSelectedTag] = useState(ARCHIVE_TAGS[0]);

    // Dialog States
    const [deleteChatOpen, setDeleteChatOpen] = useState(false);
    const [deleteArchiveId, setDeleteArchiveId] = useState<string | null>(null);
    const [errorDialog, setErrorDialog] = useState<string | null>(null);

    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    useEffect(() => {
        supabase.from('rooms').select('name').eq('id', roomId).single()
            .then(({ data }) => {
                if (data) setRoomName(data.name);
            });
    }, [roomId]);

    useEffect(() => {
        const fetchMessages = async () => {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('room_id', roomId)
                .order('created_at', { ascending: true });

            if (error) return;

            const decrypted = await Promise.all(
                data.map(async (msg) => {
                    try {
                        const text = await decryptMessage(msg.content, encryptionKey);
                        return { ...msg, decryptedContent: text, isOwn: msg.sender_name === userName };
                    } catch (e) {
                        return { ...msg, decryptedContent: '⚠️ Decryption failed', isOwn: msg.sender_name === userName };
                    }
                })
            );
            setMessages(decrypted);
            scrollToBottom();
        };

        fetchMessages();

        const channel = supabase
            .channel(`room:${roomId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
                async (payload) => {
                    if (payload.eventType === 'INSERT') {
                        const newMsg = payload.new as Message;
                        try {
                            const text = await decryptMessage(newMsg.content, encryptionKey);
                            const isOwn = newMsg.sender_name === userName;
                            setMessages((prev) => {
                                if (prev.find(m => m.id === newMsg.id)) return prev;
                                return [...prev, { ...newMsg, decryptedContent: text, isOwn }];
                            });
                            scrollToBottom();
                            if (!isOwn && document.visibilityState === 'hidden' && Notification.permission === 'granted') {
                                new Notification(`New message from ${newMsg.sender_name}`, { body: text, icon: '/icon-192x192.png' });
                            }
                        } catch (e) { console.error(e); }
                    } else if (payload.eventType === 'DELETE') {
                        const deletedId = payload.old.id;
                        setMessages(prev => prev.filter(m => m.id !== deletedId));
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [roomId, encryptionKey, userName]);

    // Fetch Archives
    useEffect(() => {
        if (showArchives) {
            const fetchArchives = async () => {
                const { data, error } = await supabase
                    .from('archives')
                    .select('*')
                    .eq('room_id', roomId)
                    .order('created_at', { ascending: false });

                if (error) return;

                const decrypted = await Promise.all(
                    data.map(async (item) => {
                        try {
                            const text = await decryptMessage(item.content, encryptionKey);
                            return { ...item, content: text };
                        } catch (e) {
                            return { ...item, content: '⚠️ Decryption failed' };
                        }
                    })
                );
                setArchives(decrypted);
            };
            fetchArchives();
        }
    }, [showArchives, roomId, encryptionKey]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim()) return;
        setSending(true);
        try {
            const encryptedContent = await encryptMessage(inputText, encryptionKey);
            const { error } = await supabase.from('messages').insert({ room_id: roomId, sender_name: userName, content: encryptedContent });
            if (error) throw error;
            setInputText('');
        } catch (err: any) {
            console.error('Error sending message:', err);
            setErrorDialog(`Failed to send message: ${err.message}`);
        } finally { setSending(false); }
    };

    const confirmDeleteChat = async () => {
        setDeleteChatOpen(false);
        try {
            await supabase.from('messages').delete().eq('room_id', roomId);
        } catch (err: any) {
            setErrorDialog(`Failed to delete chat: ${err.message}`);
        }
    };

    const handleAddArchive = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newArchiveContent.trim()) return;
        try {
            const encryptedContent = await encryptMessage(newArchiveContent, encryptionKey);

            // Infer type based on tag or content
            let type: 'link' | 'photo' | 'note' = 'note';
            if (selectedTag === 'Link' || newArchiveContent.startsWith('http')) type = 'link';
            if (selectedTag === 'Photo') type = 'photo';

            const { error } = await supabase.from('archives').insert({
                room_id: roomId,
                created_by: userName,
                type: type,
                content: encryptedContent,
                tags: [selectedTag]
            });

            if (error) throw error;

            setNewArchiveContent('');
            // Refresh archives list
            const { data } = await supabase.from('archives').select('*').eq('room_id', roomId).order('created_at', { ascending: false });
            if (data) {
                const decrypted = await Promise.all(data.map(async (item) => ({ ...item, content: await decryptMessage(item.content, encryptionKey) })));
                setArchives(decrypted);
            }
        } catch (err: any) {
            console.error('Error adding archive:', err);
            setErrorDialog(`Failed to add archive: ${err.message}`);
        }
    };

    const confirmDeleteArchive = async () => {
        if (!deleteArchiveId) return;
        const id = deleteArchiveId;
        setDeleteArchiveId(null);
        try {
            const { error } = await supabase.from('archives').delete().eq('id', id);
            if (error) throw error;
            setArchives(prev => prev.filter(item => item.id !== id));
        } catch (err: any) {
            console.error('Error deleting archive:', err);
            setErrorDialog('Failed to delete archive');
        }
    };

    return (
        <div className="flex h-screen bg-surface-variant-light dark:bg-surface-variant-dark overflow-hidden">
            {/* Dialogs */}
            <Dialog
                isOpen={deleteChatOpen}
                title="Delete All Messages?"
                message="This will permanently delete all messages in this room for both participants. This action cannot be undone."
                confirmText="Delete All"
                type="danger"
                onConfirm={confirmDeleteChat}
                onCancel={() => setDeleteChatOpen(false)}
            />
            <Dialog
                isOpen={!!deleteArchiveId}
                title="Delete Archive Item?"
                message="Are you sure you want to remove this item from the archives?"
                confirmText="Delete"
                type="danger"
                onConfirm={confirmDeleteArchive}
                onCancel={() => setDeleteArchiveId(null)}
            />
            <Dialog
                isOpen={!!errorDialog}
                title="Error"
                message={errorDialog || ''}
                onCancel={() => setErrorDialog(null)}
                type="danger"
            />

            {/* Main Chat Area */}
            <div className={`flex-1 flex flex-col h-full transition-all duration-300 ${showArchives ? 'mr-80 hidden md:flex' : ''}`}>
                {/* Header */}
                <header className="p-4 bg-surface-light dark:bg-surface-dark border-b border-outline-light/10 dark:border-outline-dark/10 flex items-center justify-between shadow-sm z-10">
                    <div>
                        <h1 className="font-medium text-onSurface-light dark:text-onSurface-dark text-lg">{roomName || 'Aura'}</h1>
                        <p className="text-xs text-onSurface-variant-light dark:text-onSurface-variant-dark">Online as {userName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowArchives(!showArchives)} className="p-2 text-onSurface-variant-light dark:text-onSurface-variant-dark hover:bg-surface-variant-light dark:hover:bg-surface-variant-dark rounded-full transition-colors" title="Archives">
                            <Archive className="w-5 h-5" />
                        </button>
                        <button onClick={() => setDeleteChatOpen(true)} className="p-2 text-onSurface-variant-light dark:text-onSurface-variant-dark hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors" title="Delete Chat">
                            <Trash2 className="w-5 h-5" />
                        </button>
                        <button onClick={onLogout} className="p-2 text-onSurface-variant-light dark:text-onSurface-variant-dark hover:bg-surface-variant-light dark:hover:bg-surface-variant-dark rounded-full transition-colors" title="Logout">
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </header>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface-variant-light dark:bg-surface-variant-dark">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex flex-col ${msg.isOwn ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm ${msg.decryptedContent === '⚠️ Decryption failed' ? 'bg-red-100 text-red-800' :
                                    msg.isOwn ? 'bg-primary-light dark:bg-primary-dark text-white dark:text-gray-900 rounded-br-none' : 'bg-surface-light dark:bg-surface-dark text-onSurface-light dark:text-onSurface-dark rounded-bl-none'
                                }`}>
                                <p className="break-words">{msg.decryptedContent}</p>
                                <span className={`text-[10px] block mt-1 text-right opacity-70`}>
                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Composer */}
                <div className="p-4 bg-surface-light dark:bg-surface-dark border-t border-outline-light/10 dark:border-outline-dark/10">
                    <form onSubmit={handleSend} className="flex gap-3 items-center">
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Message..."
                            className="flex-1 p-3 rounded-full bg-surface-variant-light dark:bg-surface-variant-dark border-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark outline-none transition-all text-onSurface-light dark:text-onSurface-dark"
                        />
                        <button type="submit" disabled={sending || !inputText.trim()} className="p-3 bg-primary-light dark:bg-primary-dark rounded-full text-white dark:text-gray-900 shadow-md hover:shadow-lg transition-all disabled:opacity-50">
                            <Send className="w-5 h-5" />
                        </button>
                    </form>
                </div>
            </div>

            {/* Archives Sidebar */}
            {showArchives && (
                <div className="w-full md:w-80 bg-surface-light dark:bg-surface-dark border-l border-outline-light/10 dark:border-outline-dark/10 flex flex-col h-full absolute md:relative z-20">
                    <div className="p-4 border-b border-outline-light/10 dark:border-outline-dark/10 flex items-center justify-between">
                        <h2 className="font-medium text-lg">Archives</h2>
                        <button onClick={() => setShowArchives(false)} className="p-2 hover:bg-surface-variant-light dark:hover:bg-surface-variant-dark rounded-full">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {/* Add New Archive */}
                        <form onSubmit={handleAddArchive} className="p-4 bg-surface-variant-light dark:bg-surface-variant-dark rounded-xl space-y-3">
                            <select
                                value={selectedTag}
                                onChange={(e) => setSelectedTag(e.target.value)}
                                className="w-full p-2 rounded-lg bg-surface-light dark:bg-surface-dark text-sm outline-none border-none"
                            >
                                {ARCHIVE_TAGS.map(tag => (
                                    <option key={tag} value={tag}>{tag}</option>
                                ))}
                            </select>
                            <textarea
                                value={newArchiveContent}
                                onChange={(e) => setNewArchiveContent(e.target.value)}
                                placeholder="Content..."
                                className="w-full p-2 rounded-lg bg-surface-light dark:bg-surface-dark text-sm outline-none resize-none"
                                rows={3}
                            />
                            <button type="submit" className="w-full py-2 bg-primary-light dark:bg-primary-dark text-white dark:text-gray-900 rounded-lg text-sm font-medium">
                                Save to Archives
                            </button>
                        </form>

                        {/* Archive List */}
                        {archives.map(item => (
                            <div key={item.id} className="p-3 bg-surface-variant-light dark:bg-surface-variant-dark rounded-xl border border-outline-light/10 dark:border-outline-dark/10 group relative">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-surface-light dark:bg-surface-dark rounded-full shrink-0">
                                        {item.type === 'link' && <ExternalLink className="w-4 h-4" />}
                                        {item.type === 'note' && <FileText className="w-4 h-4" />}
                                        {item.type === 'photo' && <ImageIcon className="w-4 h-4" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        {item.type === 'link' ? (
                                            <a href={item.content} target="_blank" rel="noopener noreferrer" className="text-primary-light dark:text-primary-dark text-sm hover:underline break-all block">
                                                {item.content}
                                            </a>
                                        ) : (
                                            <p className="text-sm text-onSurface-light dark:text-onSurface-dark whitespace-pre-wrap break-words">{item.content}</p>
                                        )}
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {item.tags?.map((tag, i) => (
                                                <span key={i} className="px-2 py-0.5 bg-surface-light dark:bg-surface-dark rounded text-[10px] text-onSurface-variant-light dark:text-onSurface-variant-dark">#{tag}</span>
                                            ))}
                                        </div>
                                        <p className="text-[10px] text-onSurface-variant-light dark:text-onSurface-variant-dark mt-2">
                                            Added by {item.created_by} • {new Date(item.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setDeleteArchiveId(item.id)}
                                        className="opacity-0 group-hover:opacity-100 p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-full transition-all absolute top-2 right-2"
                                        title="Delete Archive"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
