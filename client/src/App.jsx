import React, { useState } from 'react'
import Login from './components/Login.jsx'
import Chat from './components/chat.jsx'
const App = () => {
  const [user,setUser] = useState(
localStorage.getItem('user')|| ""
  )
  return (
    <div className='h-screen bg-gray-100 flex items-center justify-center'>
      {!user ? <Login setUser={setUser} /> : <Chat user={user} />}
    </div>
  )
}

export default App
