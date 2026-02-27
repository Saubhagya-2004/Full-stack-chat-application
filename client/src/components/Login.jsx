import React from 'react'

const Login = ({ setUser }) => {
  const handleJoin = (e) => {
    e.preventDefault();
    const name = e.target.username.value.trim();
    if (!name) return;
    localStorage.setItem('user', name);
    setUser(name);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full px-5">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#00a884] to-[#075e54] flex items-center justify-center mb-4 shadow-lg">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">WhatsApp Chat</h1>
          <p className="text-sm text-gray-400 mt-1">Enter your name to start chatting</p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleJoin}
          className="bg-[#1f2c34] rounded-2xl p-6 shadow-2xl border border-white/5"
        >
          <label className="block text-xs font-medium text-[#00a884] mb-2 uppercase tracking-wider">
            Your Name
          </label>
          <input
            name="username"
            placeholder="Type your name..."
            autoFocus
            autoComplete="off"
            className="w-full bg-[#2a3942] text-white placeholder-gray-500 rounded-xl px-4 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-[#00a884]/30 border border-transparent focus:border-[#00a884]/40 transition-all duration-200"
          />
          <button
            type="submit"
            className="w-full mt-5 bg-gradient-to-r from-[#00a884] to-[#00d4a4] text-white font-semibold py-3.5 rounded-xl hover:from-[#00c49a] hover:to-[#00e4b4] active:scale-[0.98] transition-all duration-200 shadow-lg shadow-[#00a884]/25 text-base cursor-pointer"
          >
            Start Chatting
          </button>
        </form>

        <p className="text-center text-xs text-gray-600 mt-6">
          End-to-end encrypted • Real-time messaging
        </p>
      </div>
    </div>
  );
};

export default Login;
