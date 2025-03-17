// MainTabs.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import SelectedCliente from '../components/selectedCliente';
import TestApi from '../testApi';

const Tab = createBottomTabNavigator();

const MainTabs = () => {
  return (
    <Tab.Navigator>
      <Tab.Screen
        name="Cliente"
        component={SelectedCliente}
        options={{ title: 'Cliente' }}
      />
      <Tab.Screen
        name="Productos"
        component={TestApi}
        options={{ title: 'Productos' }}
      />
    </Tab.Navigator>
  );
};

export default MainTabs;
