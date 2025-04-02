import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const MyCheckbox = ({checked,setChecked}) => {
  return (
    <Pressable onPress={() => setChecked(!checked)} style={{ flexDirection: "row", alignItems: "center" }}>
      <Text style={{ marginLeft: 8, fontSize: 11 }}>{checked ? "Desc. Transp." : "Desc. normal"}</Text>
      <Icon name={checked ? "check-box" : "check-box-outline-blank"} size={24} color="blue" />
    </Pressable>
  );
};

export default MyCheckbox;
