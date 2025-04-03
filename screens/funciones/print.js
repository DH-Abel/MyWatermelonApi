// print.js
import React, { useEffect } from 'react';
import { Button, View, Text, PermissionsAndroid, Platform } from 'react-native';
import { BLEPrinter } from 'react-native-thermal-receipt-printer-image-qr';

// Función para solicitar permiso de Bluetooth (Android API >= 31)


// Inicialización del módulo BLEPrinter.
// Esta función se puede exportar si quieres llamarla desde otro componente.
export const initPrinter = async () => {
  try {
    await BLEPrinter.init();
    await requestBluetoothPermission();
    console.log("BLEPrinter inicializado");
  } catch (error) {
    console.error("Error al inicializar BLEPrinter:", error);
  }
};

// Exporta la función de impresión para poder reutilizarla en otros módulos
export async function printTest(texto) {
  try {

    const requestBluetoothPermission = async () => {
      if (Platform.OS === 'android' && Platform.Version >= 31) {
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          {
            title: 'Permiso para usar Bluetooth',
            message: 'Esta app necesita acceso Bluetooth para conectarse a la impresora.',
            buttonPositive: 'OK',
          }
        );
      }
    };
    const initPrinter = async () => {
      try {
        await BLEPrinter.init();
        await requestBluetoothPermission();
        console.log("BLEPrinter inicializado");
      } catch (error) {
        console.error("Error al inicializar BLEPrinter:", error);
      }
    };
    initPrinter()
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
  // Inicializa BLEPrinter al montar el componente
  useEffect(() => {
    initPrinter();
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
