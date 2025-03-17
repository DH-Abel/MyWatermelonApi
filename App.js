import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import Pedido from './screens/pedido.js';
import ConsultaPedidos from './screens/consultaPedido';
import MyStack from './screens/navigator/stack';
import React from 'react';
import MyCheckbox from './screens/utilities/checkbox.js';
//import { enableScreens } from 'react-native-screens';


//enableScreens(false);
export default function App() {
  return (
    
    <MyStack/>
    //<MyCheckbox />
  //<ConsultaPedidos/>
  // <TestApi/>
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
