import { Button, StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
   
    reactLogo: {
      height: 178,
      width: 290,
      bottom: 0,
      left: 0,
      position: 'absolute',
    },
    
    title: {
      width: '100%',
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 5,
    },
    item: {
         position: 'relative', // Permite posicionar al input de forma absoluta
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
      },
    loader: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    input: {
        height: 40,
        width: '90%',
      
        marginTop: 0,
        borderWidth: 1,
        padding: 5,
    },
    inputP: {      
        height: 45,
        width: 80,          // Ancho fijo para el campo QTY
        borderWidth: 1,
        padding: 10,
        marginLeft: 10,
      },
      headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 0,
      },
      titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      },
      stepContainer: {
        gap: 8,
        marginBottom: 8,
      },
      step: {
        padding: 5,
      },
      container: {
        flex: 1,
        paddingTop: 10,
        padding: 5,
        borderWidth: 1,
        borderColor: 'red',
        backgroundColor: '#f4f4f4',
      },
      modalContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#fff",
        borderBlockColor: "#000",
        borderWidth: 5,
    },
    textContainer: {
        width: '100%',
        paddingRight: 100,
      },
      itemText: {
        fontSize: 16,
      },
      listContainer: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
        padding: 5,
        marginBottom: 5,
        
      },
      listContainer2: {
        flex  : 1,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
        padding: 5,
      },

      
    modalHeader: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 10,
        borderColor: "#000",
        borderWidth: 1,
    },
    headerText: {
      fontSize: 14,
      marginBottom: 2,
    },
    modalContent: {
        fontSize: 16,
        marginBottom: 20,
    },
    modalButton: {
        padding: 10,
        backgroundColor: "#007AFF",
        borderRadius: 5,
    },
    modalButton2: {
      padding: 1,
      borderRadius: 5,
      borderWidth: 1,
      borderColor: "black",
      alignItems: 'center',
   
  },
  modalButton3: {
    padding: 1,
    marginTop: 4,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "black",
    alignItems: 'center',
 
},
    modalButtonText: {
             // Ancho fijo para el campo QTY
        padding: 0,
        width: 40,  
        fontSize: 25,
        alignContent: 'center',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        borderRadius: 5,
        borderColor: '#007AFF',
        backgroundColor: '#007AFF',
        

    },
    button: {
      paddingHorizontal: 10,
      backgroundColor: "#007AFF",
      borderRadius: 5,
      borderWidth: 1,
      borderColor: "black",
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 10,
    },
    buttonB: {
      width: 150,
      height: 40,
      backgroundColor: "#007AFF",
      borderRadius: 5,
      borderWidth: 1,
      borderColor: "black",
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonRow: {
      flex: '1',
      width: 100,
      height: 40,
      paddingHorizontal: 10,
      backgroundColor: "#007AFF",
      borderRadius: 5,
      borderWidth: 1,
      borderColor: "black",
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 10,
      marginBottom: 1,
    },
    buttonRow2: {
      flex: '3',
      width: 200,
      height: 40,
      paddingHorizontal: 10,
      backgroundColor: "#007AFF",
      borderRadius: 5,
      borderWidth: 1,
      borderColor: "black",
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 10,
      marginBottom: 1,
    },
    buttonText: {
      color: "white",
      fontSize: 12,
      fontWeight: "bold",
      textAlign: "center",
    },
    buttonContainer: {
      marginTop: 0, // Espacio desde el final de la lista
      alignItems: 'flex-end',
      paddingVertical: 1,
      paddingBottom: 5,
      backgroundColor: "#f4f4f4",
    },
    buttonContainerRow: {
      flexDirection: 'row',
      bottom: 20,
      right: 0,
      alignItems: 'center',
      alignContent: 'center',

    }
    
  });
  