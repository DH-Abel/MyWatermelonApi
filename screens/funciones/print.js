// print.js
import React, { useEffect } from 'react';
import { Button, View, Text } from 'react-native';
import { BLEPrinter } from 'react-native-thermal-receipt-printer-image-qr';
import { PermissionsAndroid, Platform } from 'react-native';

// Exporta la función de impresión para poder reutilizarla en otros módulos
export async function printTest(texto) {
  try {
    // Obtén la lista de impresoras emparejadas
    const printers = await BLEPrinter.getDeviceList();
    console.log("Emparejadas:", printers);
    if (printers.length === 0) {
      alert("No hay impresoras emparejadas");
      return;
    }
    const firstPrinter = printers[0];
    await BLEPrinter.connectPrinter(firstPrinter.inner_mac_address || firstPrinter.device_name);
    console.log(`Conectado a ${firstPrinter.device_name}`);
    
    // Envía el texto a la impresora
    await BLEPrinter.printText(texto, {});
    
    // Espera unos segundos para que se complete la impresión y cierra la conexión
    setTimeout(() => {
      BLEPrinter.closeConn();
      console.log("Conexión cerrada");
    }, 2000);
  } catch (error) {
    console.error("Error de impresión:", error);
  }
}

const PrinterExample = () => {

  async function requestBluetoothPermission() {
    if (Platform.OS === 'android' && Platform.Version >= 31) {
      await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        {
          title: 'Permiso para usar Bluetooth',
          message: 'Esta app necesita acceso Bluetooth para conectarse a la impresora.',
          buttonPositive: 'OK',
        },
      );
    }
  }

  useEffect(() => {
    BLEPrinter.init().then(() => {
      requestBluetoothPermission();
      console.log("Módulo BLEPrinter inicializado");
    });
  }, []);

  const texto2 = "Hola Mundo\nReact Native 0.76.7\n\n\nAbel\n\n\n";

  return (
    <View style={{ padding: 20 }}>
      <Text>Ejemplo de impresión térmica</Text>
      <Button title="Imprimir ticket de prueba" onPress={() => printTest(texto2)} />
    </View>
  );
};

export default PrinterExample;
