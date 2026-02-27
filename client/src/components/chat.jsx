import axios from 'axios';
import { useEffect, useRef, useState, useCallback } from 'react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const Chat = ({ user, setUser }) => {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [reactions, setReactions] = useState({});
  const [activeReactionPicker, setActiveReactionPicker] = useState(null);
  const [sendAnimating, setSendAnimating] = useState(false);
  const lastTimeRef = useRef(0);
  const boxRef = useRef(null);
  const isMountedRef = useRef(true);
  const pollingRef = useRef(false);
  const inputRef = useRef(null);

  // ---------- data loading ----------
  const loadReactions = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/reactions`);
      if (isMountedRef.current) setReactions(res.data);
    } catch (err) {
      console.error('Load reactions error', err);
    }
  }, []);

  const loadInitialMessages = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/poll`, { params: { lastTime: 0 } });
      if (!isMountedRef.current) return;
      if (res.data.length > 0) {
        const msgs = res.data.filter(m => !m.isSystem);
        setMessages(msgs);
        lastTimeRef.current = msgs[msgs.length - 1]?.time || 0;
      }
      setIsConnected(true);
      await loadReactions();
    } catch (err) {
      console.error('Initial load error', err);
      setIsConnected(false);
    }
  }, [loadReactions]);

  const pollMessages = useCallback(async () => {
    if (pollingRef.current || !isMountedRef.current) return;
    pollingRef.current = true;
    try {
      const res = await axios.get(`${API}/poll`, {
        params: { lastTime: lastTimeRef.current },
        timeout: 30000,
      });
      if (!isMountedRef.current) return;
      if (res.data.length > 0) {
        const msgs = res.data.filter(m => !m.isSystem);
        if (msgs.length > 0) {
          setMessages(prev => [...prev, ...msgs]);
          lastTimeRef.current = msgs[msgs.length - 1].time;
        }
      }
      setIsConnected(true);
    } catch (err) {
      console.error('Polling error', err);
      setIsConnected(false);
    } finally {
      pollingRef.current = false;
      if (isMountedRef.current) pollMessages();
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    const start = async () => { await loadInitialMessages(); pollMessages(); };
    start();
    const ri = setInterval(loadReactions, 5000);
    return () => { isMountedRef.current = false; clearInterval(ri); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const close = () => setActiveReactionPicker(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  // ---------- actions ----------
  const sendMessage = async () => {
    const msg = text.trim();
    if (!msg) return;
    setText('');
    setSendAnimating(true);
    setTimeout(() => setSendAnimating(false), 200);
    try {
      await axios.post(`${API}/send`, { user, text: msg });
    } catch (err) {
      console.error('Send error', err);
    }
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleReaction = async (messageTime, messageIndex, emoji) => {
    setActiveReactionPicker(null);
    const key = `${messageTime}:${messageIndex}`;
    setReactions(prev => {
      const u = { ...prev };
      if (!u[key]) u[key] = {};
      if (!u[key][emoji]) u[key][emoji] = [];
      const arr = [...u[key][emoji]];
      if (arr.includes(user)) {
        u[key][emoji] = arr.filter(x => x !== user);
        if (u[key][emoji].length === 0) delete u[key][emoji];
      } else {
        u[key][emoji] = [...arr, user];
      }
      return u;
    });
    try {
      await axios.post(`${API}/react`, { messageTime, messageIndex, emoji, user });
      await loadReactions();
    } catch (err) { console.error('Reaction error', err); loadReactions(); }
  };

  const handleLogout = () => { localStorage.removeItem('user'); setUser(''); };

  // ---------- helpers ----------
  const fmtTime = (t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const initial = (n) => n.charAt(0).toUpperCase();
  const userColor = (name) => {
    const c = ['#f87171', '#fb923c', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa', '#f472b6', '#38bdf8'];
    let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return c[Math.abs(h) % c.length];
  };

  // ---------- render ----------
  return (
    <div className="flex flex-col h-screen w-full">
      {/* ── Header ── */}
      <header className="flex items-center justify-between px-3 sm:px-5 py-3 shrink-0 bg-[#1f2c34] border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00a884] to-[#075e54] flex items-center justify-center text-white font-bold text-lg shrink-0">
            G
          </div>
          <div className="min-w-0">
            <h1 className="text-[15px] sm:text-base font-semibold text-white leading-tight truncate">Group Chat</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isConnected ? 'bg-[#00a884]' : 'bg-red-400'}`} />
              <span className="text-[11px] text-white/50">{isConnected ? 'online' : 'connecting...'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-xs font-medium px-2.5 py-1 rounded-full bg-[#00a884]/15 text-[#00a884]">{user}</span>
          <button onClick={handleLogout} className="text-xs px-3 py-1.5 rounded-lg text-white/50 hover:bg-white/10 transition-colors cursor-pointer">Leave</button>
        </div>
      </header>

      {/* ── Messages ── */}
      <main ref={boxRef} className="flex-1 overflow-y-auto chat-wallpaper px-2 sm:px-4 py-3 scroll-smooth [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-track]:bg-transparent">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center bg-[#00a884]/10">
                <span className="text-3xl">💬</span>
              </div>
              <p className="text-base font-medium text-white/40">No messages yet</p>
              <p className="text-sm mt-1 text-white/20">Send a message to start the conversation</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {messages.map((m, i) => {
              const own = m.user === user;
              const rk = `${m.time}:${i}`;
              const mr = reactions[rk] || {};
              const hasR = Object.keys(mr).length > 0;
              const showP = activeReactionPicker === rk;

              return (
                <div
                  key={`${m.time}-${i}`}
                  className={`flex animate-msg-in ${own ? 'justify-end' : 'justify-start'}`}
                  style={{ animationDelay: `${Math.min(i * 25, 250)}ms` }}
                >
                  <div className={`relative group max-w-[85%] sm:max-w-[70%] ${hasR ? 'mb-5' : ''}`}>
                    {/* Bubble */}
                    <div
                      className={`px-3 py-[7px] shadow-sm min-w-[72px] ${own ? 'bubble-own bg-[#005c4b]' : 'bubble-other bg-[#202c33]'}`}
                      onDoubleClick={(e) => { e.stopPropagation(); setActiveReactionPicker(showP ? null : rk); }}
                    >
                      {!own && (
                        <p className="text-xs font-semibold mb-0.5" style={{ color: userColor(m.user) }}>{m.user}</p>
                      )}
                      <div className="flex items-end gap-2">
                        <p className="text-[14px] sm:text-sm text-white leading-relaxed break-words flex-1">{m.text}</p>
                        <span className="text-[10px] shrink-0 self-end pb-px flex items-center gap-0.5 text-white/40">
                          {fmtTime(m.time)}
                          {own && <span className="ml-0.5 text-[#53bdeb]">✓✓</span>}
                        </span>
                      </div>
                    </div>

                    {/* Reaction trigger (hover) */}
                    <button
                      className={`absolute top-1 opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded-full bg-[#233138] border border-white/[0.06] flex items-center justify-center text-xs cursor-pointer z-10 ${own ? '-left-8' : '-right-8'}`}
                      onClick={(e) => { e.stopPropagation(); setActiveReactionPicker(showP ? null : rk); }}
                    >😊</button>

                    {/* Reaction picker bar */}
                    {showP && (
                      <div
                        className={`absolute bottom-[calc(100%+6px)] bg-[#233138] rounded-3xl px-2 py-1.5 flex gap-0.5 shadow-xl shadow-black/40 z-20 animate-fade-up ${own ? 'right-0' : 'left-0'}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {REACTION_EMOJIS.map((em) => (
                          <button
                            key={em}
                            onClick={() => handleReaction(m.time, i, em)}
                            className="w-9 h-9 text-xl flex items-center justify-center rounded-full hover:bg-white/10 hover:scale-125 transition-all cursor-pointer border-none bg-transparent"
                          >{em}</button>
                        ))}
                      </div>
                    )}

                    {/* Reaction pills */}
                    {hasR && (
                      <div className={`absolute -bottom-[18px] flex flex-wrap gap-1 ${own ? 'right-2' : 'left-2'}`}>
                        {Object.entries(mr).map(([em, users]) => {
                          if (!users || users.length === 0) return null;
                          const mine = users.includes(user);
                          return (
                            <span
                              key={em}
                              onClick={(e) => { e.stopPropagation(); handleReaction(m.time, i, em); }}
                              className={`animate-reaction-pop inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-xl text-[13px] cursor-pointer border transition-colors
                                ${mine
                                  ? 'border-[#00a884] bg-[#00a884]/15'
                                  : 'border-white/10 bg-white/[0.06] hover:bg-white/10'
                                }`}
                            >
                              <span className="text-[14px]">{em}</span>
                              {users.length > 1 && <span className="text-[11px] text-white/60 font-medium">{users.length}</span>}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── Input ── */}
      <footer className="shrink-0 px-2 sm:px-4 py-2.5 flex items-center gap-2 bg-[#1f2c34] border-t border-white/5">
        <button
          className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl text-white/40 hover:text-white/60 transition-colors cursor-pointer bg-transparent border-none"
          onClick={() => inputRef.current?.focus()}
        >😊</button>

        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message"
          autoComplete="off"
          className="flex-1 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 bg-[#2a3942] border border-transparent focus:outline-none focus:ring-2 focus:ring-[#00a884]/20 focus:border-[#00a884]/30 transition-all"
        />

        <button
          onClick={sendMessage}
          disabled={!text.trim()}
          className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer border-none
            ${text.trim() ? 'bg-[#00a884] hover:bg-[#00c49a]' : 'bg-white/[0.06] cursor-not-allowed'}
            ${sendAnimating ? 'animate-send-pulse' : ''}`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={`transition-opacity ${text.trim() ? 'opacity-100' : 'opacity-30'}`}
            style={{ transform: 'rotate(45deg)' }}
          >
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </footer>
    </div>
  );
};

export default Chat;
