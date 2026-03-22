import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLOURS } from '@constants/colours';

/** ChessPostGameScreen — stub screen, to be implemented in later steps */
export default function ChessPostGameScreen(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>ChessPostGameScreen</Text>
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
