// screens/AdminUsersScreen.js
import React, { useEffect, useState, useContext } from 'react'
import {
  View, Text, TextInput, Button, FlatList, Alert, StyleSheet,
  Pressable, ScrollView, TouchableOpacity, SafeAreaView, Modal
} from 'react-native'
import { database } from '../src/database/database'
import { AuthContext } from '../screens/context/AuthContext'
import { useNavigation } from '@react-navigation/native'
import sincronizarSecuencias from '../src/sincronizaciones/secuencias'

export default function AdminUsersScreen() {
  const { user } = useContext(AuthContext)
  const navigation = useNavigation()
  const [usuarios, setUsuarios] = useState([])
  const [form, setForm] = useState({
    usuario: '',
    password: '',
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    vendedor: '',
    vendedor_multiple: ''
  })
  const [isEditing, setIsEditing] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [modalVisible, setModalVisible] = useState(false)

  useEffect(() => {
    if (user != 'Omega') {
      Alert.alert(
        'Acceso denegado',
        'Solo el administrador puede ver esta pantalla',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      )
      return
    }
    loadUsers()
  }, [user])

  async function loadUsers() {
    const col = database.collections.get('t_usuarios')
    const all = await col.query().fetch()
    setUsuarios(all)
  }

  function openCreateModal() {
    resetForm()
    setIsEditing(false)
    setSelectedId(null)
    setModalVisible(true)
  }

  function openEditModal(item) {
    setForm({
      usuario: item.f_usuario,
      password: item.f_password,
      nombre: item.f_nombre,
      apellido: item.f_apellido,
      email: item.f_email,
      telefono: item.f_telefono,
      vendedor: item.f_vendedor != null ? String(item.f_vendedor) : 0,
      vendedor_multiple: item.Fvendedor_multiple || 0
    })
    setSelectedId(item.id)
    setIsEditing(true)
    setModalVisible(true)
  }

  async function handleSave() {
    const { usuario, password } = form
    if (!usuario || !password || !form.vendedor) {
      return Alert.alert('Error', 'Vendedor, Usuario y contraseña son obligatorios')
    }
    try {
      await database.write(async () => {
        const col = database.collections.get('t_usuarios')
        if (isEditing) {
          const record = await col.find(selectedId)
          await record.update(u => {
            u.f_usuario = form.usuario
            u.f_password = form.password
            u.f_nombre = form.nombre
            u.f_apellido = form.apellido
            u.f_email = form.email
            u.f_telefono = form.telefono
            u.f_fecha_modificacion = new Date().toISOString()
            u.f_vendedor = form.vendedor ? parseInt(form.vendedor) : 0
            u.Fvendedor_multiple = form.vendedor_multiple ? (form.vendedor_multiple) : 0
          })
          Alert.alert('Éxito', 'Usuario actualizado')
        } else {
          if (usuarios.some(u => u.f_usuario === usuario)) {
            throw new Error('duplicate')
          }
          await col.create(u => {
            u.f_usuario = form.usuario
            u.f_password = form.password
            u.f_nombre = form.nombre
            u.f_apellido = form.apellido
            u.f_email = form.email
            u.f_telefono = form.telefono
            u.f_fecha_creacion = new Date().toISOString()
            u.f_fecha_modificacion = new Date().toISOString()
            u.f_activo = true
            u.f_vendedor = form.vendedor ? parseInt(form.vendedor) : 0
            u.Fvendedor_multiple = form.vendedor_multiple ? (form.vendedor_multiple) : 0
          })
          Alert.alert('Éxito', 'Usuario creado')
        }
      })
      loadUsers()
      setModalVisible(false)
    } catch (e) {
      if (e.message === 'duplicate') {
        Alert.alert('Error', 'Ya existe un usuario con ese nombre')
      } else {
        console.error(e)
        Alert.alert('Error', 'No se pudo guardar el usuario')
      }
    }
  }

  function resetForm() {
    setForm({ usuario: '', password: '', nombre: '', apellido: '', email: '', telefono: '', vendedor: '', vendedor_multiple: '' })
  }

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View>
        <Text style={styles.cardTitle}>{item.f_usuario}</Text>
        <Text style={styles.cardSubtitle}>{item.f_nombre} {item.f_apellido} - Vendedor:{item.f_vendedor}</Text>
      </View>
      <TouchableOpacity
        style={styles.editButton}
        onPress={() => openEditModal(item)}
      >
        <Text style={styles.editButtonText}>✎</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Gestión de Usuarios</Text>
        <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
          <Text style={styles.addButtonText}>＋</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={usuarios}
        keyExtractor={u => u.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
      />

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{isEditing ? 'Editar Usuario' : 'Crear Usuario'}</Text>
            {/* Sincronizar secuencia */}
            <Pressable onPress={async () => {
              if (!form.vendedor) {
                return Alert.alert('Error', 'Debes indicar un vendedor');
              }
              await sincronizarSecuencias(parseInt(form.vendedor, 10));
              Alert.alert('Listo', 'Secuencias sincronizadas');
            }}>
              <Text style={{ color: 'blue', textAlign: 'center', marginBottom: 10, borderWidth: 1, borderColor: 'blue', padding: 5 }}>Sincronizar Secuencia</Text>
            </Pressable>

            {['usuario', 'password', 'nombre', 'apellido', 'email', 'telefono', 'vendedor', 'vendedor_multiple'].map((key, idx) => (
              <TextInput
                key={idx}
                placeholder={key.charAt(0).toUpperCase() + key.slice(1)}
                value={form[key]}
                onChangeText={val => setForm(f => ({ ...f, [key]: val }))}
                style={styles.input}
                secureTextEntry={key === 'password'}
                keyboardType={key === 'email' ? 'email-address' : key === 'telefono' ? 'phone-pad'
                  : key === 'vendedor' ? 'numeric' : 'default'}
              />
            ))}
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.primaryButton} onPress={handleSave}>
                <Text style={styles.primaryButtonText}>{isEditing ? 'Actualizar' : 'Crear'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16
  },
  header: { fontSize: 28, fontWeight: 'bold', color: '#6200ee' },
  addButton: {
    backgroundColor: '#03dac6',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  addButtonText: { color: '#fff', fontSize: 24, lineHeight: 24 },
  listContent: { paddingHorizontal: 16, paddingBottom: 16 },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2
  },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  cardSubtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  editButton: { padding: 8 },
  editButtonText: { fontSize: 18, color: '#6200ee' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 5
  },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 12, textAlign: 'center', color: '#6200ee' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#fafafa'
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  primaryButton: {
    flex: 1,
    backgroundColor: '#6200ee',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelButton: {
    flex: 1,
    backgroundColor: '#bbb',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  cancelButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' }
})
