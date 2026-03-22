import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLOURS } from '@constants/colours';

/** RummyPostGameScreen — stub screen, to be implemented in later steps */
export default function RummyPostGameScreen(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>RummyPostGameScreen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOURS.BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: COLOURS.TEXT_PRIMARY,
    fontSize: 18,
  },
});
