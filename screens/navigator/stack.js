import { createStackNavigator } from "@react-navigation/stack";
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaView, Text } from "react-native";
import React from "react";
import ConsultaPedidos from "../consultaPedido";
import Pedido from "../pedido";
import DetallesPedido from "../detallePedido";
import PrinterExample from '../funciones/print'
import { View } from "react-native";
import { enableScreens } from 'react-native-screens';
import SelectClientScreen from "../components/selectClientes";
import SelectedCliente from "../components/selectedCliente";
import MainTabs from "./MainTabs";
import MainTabsCobranza from "./MainTabsCobranza";
import SelectClientesCobranza from '../components/selectClientesCobranza';
import SelectedClienteCobranza from '../components/selectedClienteCobranza';
import ConfirmarCobranza from '../confirmarCobranza';
import ConsultaRecibos from "../consultaRecibos";
import MenuPrincipal from "../menu";
import ConsultaDevoluciones from "../consultaDevoluciones";
import SelectClientesDev from "../components/selectclienteDev";
import SelectedClienteDev from "../components/selectclienteDev";
import Devoluciones from "../devoluciones";
import MainTabsDevoluciones from "../navigator/mainTabsDevoluciones";
import  login from "../login";
import AdminScreen from "../adminScreen";

import { MapsContext, MapsProvider } from "../components/mapsContext";




enableScreens();

const Stack = createNativeStackNavigator();

export default function MyStack() {
    return (
      <MapsProvider>
        <NavigationContainer>
        <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
          {/* Login */}
          <Stack.Screen name="Login" component={login} />
          {/* Admin */}
          <Stack.Screen name="AdminScreen" component={AdminScreen} />
          {/* Menu Principal */}
          <Stack.Screen name="MenuPrincipal" component={MenuPrincipal} />
          {/* Flujo de cobranza */}
          <Stack.Screen name="ConsultaRecibos" component={ConsultaRecibos} />
          <Stack.Screen name="SelectClientesCobranza" component={SelectClientesCobranza} />
          <Stack.Screen name="MainTabsCobranza" component={MainTabsCobranza} />
          <Stack.Screen name="ConfirmarCobranza" component={ConfirmarCobranza} />
          {/* Flujo de pedidos */}
          <Stack.Screen name="SelectClientScreen" component={SelectClientScreen} />
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="ConsultaPedidos" component={ConsultaPedidos} />
          <Stack.Screen name="Pedido" component={Pedido} />
          <Stack.Screen name="DetallesPedido" component={DetallesPedido} />
          <Stack.Screen name="PrinterExample" component={PrinterExample} />
          {/* Flujo de devoluciones */}
          <Stack.Screen name="ConsultaDevoluciones" component={ConsultaDevoluciones} />
          <Stack.Screen name="SelectClientesDev" component={SelectClientesDev} />
          <Stack.Screen name="MainTabsDevoluciones" component={MainTabsDevoluciones} />
          <Stack.Screen name="SelectedClienteDev" component={SelectedClienteDev} />
          <Stack.Screen name="Devoluciones" component={Devoluciones} />

        </Stack.Navigator>
      </NavigationContainer>
      </MapsProvider>
    );
}
