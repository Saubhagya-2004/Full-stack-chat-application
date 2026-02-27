import React, { useState } from 'react'
import Login from './components/Login.jsx'
import Chat from './components/chat.jsx'

const App = () => {
  const [user, setUser] = useState(
    localStorage.getItem('user') || ""
  )

  return (
    <div className="h-screen w-full bg-[#111b21] flex items-center justify-center">
      {!user ? <Login setUser={setUser} /> : <Chat user={user} setUser={setUser} />}
    </div>
  )
}

export default App
