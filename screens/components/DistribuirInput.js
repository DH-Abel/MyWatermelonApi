// DistribuirInput.js
import React, { useState, memo } from 'react';
import { View, TextInput, Pressable, Text, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default memo(function DistribuirInput({ onDistribuir, onLimpiar }) {
  const [local, setLocal] = useState('');

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <TextInput
        style={[ /* copia aquí styles.input */ ]}
        keyboardType="numeric"
        placeholder="Monto distribuir"
        value={local}
        onChangeText={setLocal}
      />
      <Pressable
        onPress={() => {
          if (!local) {
            Alert.alert('Error','Ingrese un monto para distribuir');
          } else {
            onDistribuir(local);
            setLocal('');
          }
        }}
        style={[ /* styles.button */ ]}
      >
        <Text style={[ /* styles.buttonText */ ]}>Distribuir</Text>
      </Pressable>
      <Pressable
        onPress={() => {
          Alert.alert('Confirmación','¿Desea limpiar?',[
            { text:'Cancelar', style:'cancel' },
            { text:'Aceptar', onPress: onLimpiar }
          ]);
        }}
        style={[ /* styles.clearButton */ ]}
      >
        <Ionicons name="trash-outline" size={24} color="#fff" />
      </Pressable>
    </View>
  );
});
