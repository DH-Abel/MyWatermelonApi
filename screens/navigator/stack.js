import { createStackNavigator } from "@react-navigation/stack";
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaView, Text } from "react-native";
import React from "react";
import ConsultaPedidos from "../consultaPedido";
import Pedido from "../pedido";
import DetallesPedido from "../detallePedido";
import { View } from "react-native";
import { enableScreens } from 'react-native-screens';
import SelectClientScreen from "../components/selectClientes";
import SelectedCliente from "../components/selectedCliente";
import MainTabs from "./MainTabs";

enableScreens();

const Stack = createNativeStackNavigator();

export default function MyStack() {
    return (
        <NavigationContainer>
            <Stack.Navigator>
                <Stack.Screen name="ConsultaPedidos" component={ConsultaPedidos} />
                <Stack.Screen
                    name="MainTabs"
                    component={MainTabs}
                    options={{ headerShown: false }}
                />
                <Stack.Screen name="SelectClientScreen" component={SelectClientScreen} options={{ headerShown: false }} />
                <Stack.Screen name="SelectedCliente" component={SelectedCliente} options={{ headerShown: false }} />
                <Stack.Screen name="Pedido" component={Pedido} options={{ headerShown: false }} />
                <Stack.Screen name="DetallesPedido" component={DetallesPedido} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}
