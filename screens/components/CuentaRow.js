// CuentaRow.js
import React, { useState, useEffect, memo } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';

function CuentaRow({
  item,
  pagoGlobal,
  descuentoPct,
  onPagoCommit,
  onSaldar,
  onLongPress
}) {
  const [local, setLocal] = useState(pagoGlobal ?? '');

  // Sincroniza si cambian los pagos desde fuera
  useEffect(() => {
    setLocal(pagoGlobal ?? '');
  }, [pagoGlobal]);

  return (
    <View style={styles.item}>
      <View style={{ flex: 2 }}>
        {/* …tu zona de textos: documento, fecha, balance… */}
        <Pressable onLongPress={() => onLongPress(item.f_documento, descuentoPct)} delayLongPress={500}>
          <Text style={{ fontWeight: 'bold' }}>{item.f_documento}</Text>
          {/* Resto de Text con formatearFecha, formatear monto, etc. */}
        </Pressable>
      </View>

      <View style={{ alignItems: 'center', flex: 1 }}>
        <TextInput
          style={[ styles.input2, pagoGlobal == balanceConDescuento && { borderColor: 'green', borderWidth: 3 } ]}
          keyboardType="numeric"
          value={local}
          onChangeText={setLocal}
          onBlur={() => onPagoCommit(item.f_documento, local)}
          placeholder="Abono"
        />
        <Pressable onPress={() => onSaldar(item.f_documento)} style={styles.button2}>
          <Text style={styles.buttonText}>Saldar</Text>
        </Pressable>
      </View>
    </View>
  );
}

// Evita re-render si no cambian props relevantes
export default memo(CuentaRow, (prev, next) =>
  prev.pagoGlobal === next.pagoGlobal &&
  prev.descuentoPct === next.descuentoPct
);
