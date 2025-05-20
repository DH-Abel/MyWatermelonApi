import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import SelectedClienteDev from '../components/SelectedClienteDev';
import SelectClientesDev from '../components/selectClientes.js';
import Devoluciones from '../devoluciones.js';
import { useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const Tab = createBottomTabNavigator();

export default function MainTabsDevoluciones() {
  const route = useRoute();
  const initialCliente = route.params?.clienteSeleccionado || null;
  const [clienteSeleccionado, setClienteSeleccionado] = useState(initialCliente);

  // Si querremos actualizar datos de cliente, podríamos usar efecto aquí
  useEffect(() => {
    if (initialCliente) {
      setClienteSeleccionado(initialCliente);
    }
  }, [initialCliente]);

  return (
    <Tab.Navigator
      screenOptions={({ route: tabRoute }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (tabRoute.name === 'Cliente') {
            iconName = 'people-circle-outline';
          } else if (tabRoute.name === 'Devoluciones') {
            iconName = 'return-down-back-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Cliente"
        children={() => (
          <SelectedClienteDev
            clienteSeleccionado={clienteSeleccionado}
            setClienteSeleccionado={setClienteSeleccionado}
          />
        )}
        options={{ title: 'Cliente' }}
      />
      <Tab.Screen
        name="Devoluciones"
        children={() => (
          <Devoluciones clienteSeleccionado={clienteSeleccionado} />
        )}
        options={{ title: 'Devoluciones' }}
      />
    </Tab.Navigator>
  );
}
