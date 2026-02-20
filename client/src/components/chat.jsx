import axios from 'axios';
import { useEffect, useRef, useState } from 'react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Chat = ({ user }) => {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const lastTimeRef = useRef(0);
  const boxRef = useRef(null);
  const isMountedRef = useRef(true);
  const pollingRef = useRef(false);

  const loadInitialMessages = async () => {
    try {
      const res = await axios.get(`${API}/poll`, {
        params: { lastTime: 0 }
      });

      if (!isMountedRef.current) return;

      if (res.data.length > 0) {
        const userMessages = res.data.filter(m => !m.isSystem);
        setMessages(userMessages);
        lastTimeRef.current = userMessages[userMessages.length - 1]?.time || 0;
      }
      setIsConnected(true);
    } catch (err) {
      console.error('Initial load error', err);
      setIsConnected(false);
    }
  };

  const pollMessages = async () => {
    if (pollingRef.current || !isMountedRef.current) return;
    pollingRef.current = true;

    try {
      const res = await axios.get(`${API}/poll`, {
        params: { lastTime: lastTimeRef.current },
        timeout: 30000
      });

      if (!isMountedRef.current) return;

      if (res.data.length > 0) {
        const userMessages = res.data.filter(m => !m.isSystem);

        if (userMessages.length > 0) {
          setMessages(prev => [...prev, ...userMessages]);
          lastTimeRef.current = userMessages[userMessages.length - 1].time;
        }
      }
      setIsConnected(true);
    } catch (err) {
      console.error('Polling error', err);
      setIsConnected(false);
    } finally {
      pollingRef.current = false;
      if (isMountedRef.current) {
        pollMessages();
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;

    const startChat = async () => {
      await loadInitialMessages();
      pollMessages();
    };

    startChat();

    return () => {
      isMountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    boxRef.current?.scrollTo(0, boxRef.current.scrollHeight);
  }, [messages]);

  const sendMessage = async () => {
    if (!text.trim()) return;

    try {
      await axios.post(`${API}/send`, { user, text });
      setText('');
    } catch (err) {
      console.error('Send error', err);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex flex-col h-screen w-full bg-gray-100">
      {/* Header */}
      <div className="bg-blue-600 border-b px-4 py-3 shadow-md">
        <div className="flex justify-between items-center">
          <h1 className="text-xl text-white font-semibold">Group Chat</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-400' : 'bg-red-400'
              }`} />
              <span className="text-sm text-white">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <span className="text-sm text-white">
              You: <span className="font-medium">{user}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={boxRef} className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="text-4xl mb-2">💬</div>
              <p className="text-lg font-medium">No messages yet</p>
              <p className="text-sm mt-1">Start the conversation!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((m, i) => {
              const isOwnMessage = m.user === user;

              return (
                <div
                  key={`${m.time}-${i}`}
                  className={`flex ${
                    isOwnMessage ? 'justify-end' : 'justify-start'
                  }`}
                  data-testid={`chat-message-${i}`}
                >
                  <div
                    className={`max-w-md px-4 py-3 rounded-lg shadow-sm ${
                      isOwnMessage
                        ? 'bg-blue-500 text-white rounded-br-none'
                        : 'bg-white border border-gray-200 rounded-bl-none'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`font-medium text-sm ${
                          isOwnMessage ? 'text-blue-100' : 'text-blue-600'
                        }`}
                      >
                        {m.user}
                      </span>
                      <span
                        className={`text-xs ${
                          isOwnMessage ? 'text-blue-200' : 'text-gray-500'
                        }`}
                      >
                        {formatTime(m.time)}
                      </span>
                    </div>
                    <p className="break-words">{m.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-4 shadow-lg">
        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            data-testid="chat-input"
          />
          <button
            onClick={sendMessage}
            disabled={!text.trim()}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            data-testid="chat-send-button"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
