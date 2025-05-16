import { StyleSheet, Text, View } from 'react-native';
import MyStack from './screens/navigator/stack';

//import { enableScreens } from 'react-native-screens';


//enableScreens(false);
export default function App() {
  return (
    
    <MyStack/>
    //<MyCheckbox />
  //<ConsultaPedidos/>
  // <TestApi/>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
