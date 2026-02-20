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
    <form
      onSubmit={handleJoin}
      className="bg-white p-6 rounded-xl shadow-lg w-80"
    >
      <h2 className="text-xl font-bold mb-4 text-center">
        Join Chat
      </h2>

      <input
        name="username"
        placeholder="Enter your name"
        className="w-full border p-2 rounded mb-4 focus:outline-none"
      />

      <button className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
        Join
      </button>
    </form>
  );
};

export default Login;
