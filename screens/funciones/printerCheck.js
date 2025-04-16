import React, { useState, useEffect } from 'react';
import { View, Text, Button, Alert, Platform, PermissionsAndroid } from 'react-native';
import { BLEPrinter } from 'react-native-thermal-receipt-printer-image-qr';

// Solicitar permisos de Bluetooth (Android 12+)
const requestBluetoothPermission = async () => {
  if (Platform.OS === 'android' && Platform.Version >= 31) {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      {
        title: 'Permiso para usar Bluetooth',
        message: 'Esta app necesita acceso Bluetooth para conectarse a la impresora.',
        buttonPositive: 'OK',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }
  return true;
};

// Verifica si el Bluetooth está encendido (si el método existe)
const isBluetoothEnabled = async () => {
  if (typeof BLEPrinter.isBluetoothEnabled === 'function') {
    try {
      const enabled = await BLEPrinter.isBluetoothEnabled();
      return enabled;
    } catch (err) {
      console.error("Error comprobando Bluetooth:", err);
      return false;
    }
  }
  return true;
};

// Función que verifica la disponibilidad de una impresora
export async function checkPrinterAvailability() {
  try {
    // Inicializa BLEPrinter y solicita permisos
    await BLEPrinter.init();
    const permiso = await requestBluetoothPermission();
    if (!permiso) {
      Alert.alert("Permiso denegado", "No se otorgó el permiso para usar Bluetooth.");
      return false;
    }

    // Verifica que el Bluetooth esté activado
    const bluetoothEncendido = await isBluetoothEnabled();
    if (!bluetoothEncendido) {
      Alert.alert("Bluetooth apagado", "Por favor, activa el Bluetooth.");
      return false;
    }

    // Obtiene la lista de impresoras emparejadas
    const printers = await BLEPrinter.getDeviceList();
    console.log("Impresoras emparejadas:", printers);
    if (!printers || printers.length === 0) {
      Alert.alert("Sin impresoras", "No hay impresoras emparejadas. Verifica que la impresora esté encendida y emparejada.");
      return false;
    }

    // Verifica que la primera impresora tenga una dirección válida
    const firstPrinter = printers[0];
    const printerAddress = firstPrinter.inner_mac_address || firstPrinter.device_name;
    if (!printerAddress) {
      Alert.alert("Dispositivo inválido", "La impresora no tiene dirección válida.");
      return false;
    }

    // Si llegamos aquí, significa que hay al menos una impresora en la lista
    return true;
  } catch (error) {
    console.error("Error verificando impresora:", error);
    Alert.alert("Error", "Ocurrió un error al verificar la impresora.");
    return false;
  }
}

// Componente para verificar la disponibilidad de la impresora
const PrinterCheck = () => {
  const [printerAvailable, setPrinterAvailable] = useState(null);

  const verificarImpresora = async () => {
    const disponible = await checkPrinterAvailability();
    setPrinterAvailable(disponible);
  };

  useEffect(() => {
    verificarImpresora();
  }, []);

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 16, marginBottom: 10 }}>Verificación de impresora</Text>
      {printerAvailable === null ? (
        <Text>Verificando...</Text>
      ) : printerAvailable ? (
        <Text style={{ color: 'green' }}>¡Impresora disponible!</Text>
      ) : (
        <Text style={{ color: 'red' }}>No hay impresoras disponibles.</Text>
      )}
      <Button title="Verificar nuevamente" onPress={verificarImpresora} />
    </View>
  );
};

export default PrinterCheck;
