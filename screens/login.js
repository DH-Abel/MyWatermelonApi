import React, { useEffect, useState, useContext } from 'react'
import { View, Text, TextInput, Button, Alert, StyleSheet } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNavigation } from '@react-navigation/native'
import { database } from '../src/database/database'
import { AuthContext } from './context/AuthContext'

export default function Login() {
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const { login } = useContext(AuthContext)
  const navigation = useNavigation()

  const handleLogin = async () => {
    try {
      const usuariosCollection = database.collections.get('t_usuarios')
      const allUsers = await usuariosCollection.query().fetch()
      const userRecord = allUsers.find(u => u.f_usuario === usuario)

      if (!userRecord) {
        console.log(allUsers)
        return Alert.alert('Error', 'Usuario no encontrado')
      }

      // Construcción de la contraseña dinámica para Omega
      const now = new Date()
      const h = now.getHours()
      const m = now.getMinutes()
      const M = now.getMonth() + 1
      const d = now.getDate()
      const suffix = `${h}${m}${M}${d}`
      const expectedPass = userRecord.f_password

      // ► Console.log agregado para depuración:
      console.log(`🔑 Contraseña esperada para ${usuario}:`, expectedPass + suffix)

      const valid = usuario === 'Omega'
        ? password === expectedPass + suffix
        : password === expectedPass

      if (valid) {
        await AsyncStorage.setItem('currentUser', usuario)
        login(usuario)
        navigation.replace('MenuPrincipal')
      } else {
        Alert.alert('Error', 'Contraseña incorrecta')
      }
    } catch (error) {
      console.error(error)
      Alert.alert('Error', 'Algo salió mal en el login')
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Iniciar Sesión</Text>
      <TextInput
        placeholder="Usuario"
        value={usuario}
        onChangeText={setUsuario}
        style={styles.input}
        autoCapitalize='none'
      />
      <TextInput
        placeholder="Contraseña"
        value={password}
        onChangeText={setPassword}
        style={styles.input}
        secureTextEntry
      />
      <Button title="Entrar" onPress={handleLogin} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 16 },
  title: { fontSize: 24, marginBottom: 16, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, marginBottom: 12, borderRadius: 4 }
})
