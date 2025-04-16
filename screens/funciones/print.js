import React, { useEffect } from 'react';
import { Button, View, Text, PermissionsAndroid, Platform, Alert } from 'react-native';
import { BLEPrinter } from 'react-native-thermal-receipt-printer-image-qr';

// Solicitar permisos de Bluetooth en Android 12+
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

// Inicialización de BLEPrinter (puede llamarse desde otros componentes)
export const initPrinter = async () => {
  try {
    await BLEPrinter.init();
    await requestBluetoothPermission();
    console.log("BLEPrinter inicializado");
  } catch (error) {
    console.error("Error al inicializar BLEPrinter:", error);
  }
};

// Función para verificar si el Bluetooth está encendido (si la función existe)
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
  // Si no se puede comprobar, asumimos que está encendido para no bloquear
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
    return true;
  } catch (error) {
    console.error("Error verificando impresora:", error);
    Alert.alert("Error", "Ocurrió un error al verificar la impresora.");
    return false;
  }
}

// --- Nueva función para conectar con timeout
async function connectPrinterWithTimeout(address, timeoutMs = 3000) {
  // Cerramos cualquier conexión previa, por si acaso
  await BLEPrinter.closeConn();

  // Promise que intenta conectar con la impresora
  const connectPromise = BLEPrinter.connectPrinter(address);

  // Promise de timeout
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => {
      reject(new Error("timeout"));
    }, timeoutMs)
  );

  // 'Race' entre connectPromise y timeoutPromise
  // Si connectPromise tarda más de timeoutMs, se dispara el reject
  return Promise.race([connectPromise, timeoutPromise]);
}

// Función de impresión con timeout
export async function printTest(texto) {
  // Verificar disponibilidad de impresora antes de continuar
  const disponible = await checkPrinterAvailability();
  if (!disponible) {
    // La función checkPrinterAvailability ya mostró la alerta correspondiente.
    return;
  }

  // Se asume que hay al menos una impresora en la lista.
  const printers = await BLEPrinter.getDeviceList();
  const firstPrinter = printers[0];
  const printerAddress = firstPrinter.inner_mac_address || firstPrinter.device_name || "NO_ADDRESS";
  console.log("Dirección de la impresora:", printerAddress, firstPrinter.device_name);

  // Intentar conectar con timeout.
  // Si la impresora está apagada, no responderá y se lanzará el reject("timeout").
  try {
    await connectPrinterWithTimeout(printerAddress, 3000);
    console.log(`Conectado a ${firstPrinter.device_name || printerAddress}`);
  } catch (error) {
    // Si llegamos aquí, puede ser un 'timeout' o un error genuino de conexión.
    console.error("Error al conectar a la impresora:", error);
    Alert.alert(
      "Error de conexión",
      "No se pudo conectar a la impresora. Asegúrate de que esté encendida y emparejada."
    );
    return;
  }

  // Intentar enviar el texto a la impresora dentro de un try/catch
  try {
    await BLEPrinter.printText(texto, {});
  } catch (error) {
    console.error("Error al imprimir:", error);
    Alert.alert("Error de impresión", "Ocurrió un error al intentar imprimir.");
    return;
  }

  // Espera unos segundos para que se complete la impresión y cierra la conexión.
  setTimeout(() => {
    BLEPrinter.closeConn();
    console.log("Conexión cerrada");
  }, 2000);
}

const PrinterExample = () => {
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
