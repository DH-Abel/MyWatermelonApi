import React, { useEffect } from 'react';
import { Button, View, Text } from 'react-native';
// Importamos el módulo BLEPrinter de la librería
import { BLEPrinter } from 'react-native-thermal-receipt-printer-image-qr';
import { PermissionsAndroid, Platform } from 'react-native';


async function requestBluetoothPermission() {
    if (Platform.OS === 'android' && Platform.Version >= 31) {
        const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            {
                title: 'Permiso para usar Bluetooth',
                message: 'Esta app necesita acceso Bluetooth para conectarse a la impresora.',
                buttonPositive: 'OK',
            },
        );
        // Puedes también solicitar BLUETOOTH_SCAN si planeas buscar nuevos dispositivos
    }
}





const PrinterExample = () => {

    useEffect(() => {
        // Inicializar el módulo de impresora Bluetooth al montar el componente
        BLEPrinter.init().then(() => {
            requestBluetoothPermission()
            console.log("Módulo BLEPrinter inicializado");

        });
    }, []);

    const printTest = async () => {
        try {
          const printers = await BLEPrinter.getDeviceList();
          console.log("Emparejadas:", printers);
          if (printers.length === 0) {
            alert("No hay impresoras emparejadas");
            return;
          }
          const firstPrinter = printers[0];
          await BLEPrinter.connectPrinter(firstPrinter.inner_mac_address || firstPrinter.device_name);
          console.log(`Conectado a ${firstPrinter.device_name}`);
      
          const testReceipt = "Hola Mundo\nReact Native 0.76.7\n\n\n"; // Agrega saltos de línea extras
          await BLEPrinter.printText(testReceipt, {});  // Espera a que se envíe el texto
      
          // Espera unos segundos para asegurarse que la impresión se complete antes de cerrar la conexión
          setTimeout(() => {
            BLEPrinter.closeConn();
            console.log("Conexión cerrada");
          }, 2000);
      
        } catch (error) {
          console.error("Error de impresión:", error);
        }
      };
      

    return (
        <View style={{ padding: 20 }}>
            <Text>Ejemplo de impresión térmica</Text>
            <Button title="Imprimir ticket de prueba" onPress={printTest} />
        </View>
    );
};

export default PrinterExample;
