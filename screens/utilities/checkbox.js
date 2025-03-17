import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const MyCheckbox = () => {
  const [checked, setChecked] = useState(false);

  return (
    <Pressable onPress={() => setChecked(!checked)} style={{ flexDirection: "row", alignItems: "center" }}>
      <Icon name={checked ? "check-box" : "check-box-outline-blank"} size={24} color="blue" />
      <Text style={{ marginLeft: 8 }}>{checked ? "Checked" : "Unchecked"}</Text>
    </Pressable>
  );
};

export default MyCheckbox;
