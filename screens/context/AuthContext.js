import React, { createContext, useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const AuthContext = createContext({
  user: null,
  login: () => {},
  logout: () => {},
})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)

  useEffect(() => {
    async function loadUser() {
      const storedUser = await AsyncStorage.getItem('currentUser')
      if (storedUser) setUser(storedUser)
    }
    loadUser()
  }, [])

  const login = async usuario => {
    await AsyncStorage.setItem('currentUser', usuario)
    setUser(usuario)
  }

  const logout = async () => {
    await AsyncStorage.removeItem('currentUser')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
