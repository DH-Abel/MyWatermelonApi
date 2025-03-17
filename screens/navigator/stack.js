import { createStackNavigator } from "@react-navigation/stack";
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaView, Text } from "react-native";
import React from "react";
import ConsultaPedidos from "../consultaPedido";
import TestApi from "../testApi";
import DetallesPedido from "../detallePedido";
import { View } from "react-native";
import { enableScreens } from 'react-native-screens';
enableScreens();



const Stack = createNativeStackNavigator();

export default function MyStack() {
    return (
        <NavigationContainer>
            <Stack.Navigator>
                <Stack.Screen name="ConsultaPedidos" component={ConsultaPedidos} />
                <Stack.Screen name="TestApi" component={TestApi} />
                <Stack.Screen name="DetallesPedido" component={DetallesPedido} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}
