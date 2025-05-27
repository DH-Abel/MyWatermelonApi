import { StyleSheet, Text, View } from 'react-native';
import MyStack from './screens/navigator/stack';
import { useEffect } from 'react';
import { database } from './src/database/database';
import { AuthProvider } from './screens/context/AuthContext';

export default function App() {
  useEffect(() => {
    async function ensureAdmin() {
      const usuarios = database.collections.get('t_usuarios')
      const count = await usuarios.query().fetchCount()
      console.log('🔍 Usuarios en BD al iniciar:', count)   // <-- aquí ves el número
      if (count === 0) {
        try {
          console.log('database:', database)
          console.log('typeof database.action:', typeof database.action)
          await database.write(async () => {
            await usuarios.create(u => {
              u.f_usuario = 'Omega'
              u.f_password = 'Alpha'
              u.f_nombre = 'Administrador'
              u.f_apellido = ''
              u.f_email = ''
              u.f_telefono = '829-398-7647'
              u.f_fecha_creacion = new Date().toISOString()
              u.f_fecha_modificacion = new Date().toISOString()
              u.f_activo = true
            })
          })
          console.log('✅ Usuario admin creado exitosamente')
        } catch (error) {
          console.error('Error creando usuario admin:', error)
        }
      }

    }
    setTimeout(() => {
      ensureAdmin()
    }, 0)
  }, [])


  return (
    <AuthProvider>
    <MyStack />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
