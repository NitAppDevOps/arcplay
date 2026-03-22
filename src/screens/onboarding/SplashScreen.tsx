import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@app-types/navigation.types';
import { COLOURS } from '@constants/colours';

/** SplashScreen — entry point, navigates to main app for testing */
export default function SplashScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ARCPLAY</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Main')}
        accessibilityLabel="Enter the app"
      >
        <Text style={styles.buttonText}>Enter App →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOURS.BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
  },
  title: {
    color: COLOURS.PRIMARY,
    fontSize: 42,
    fontWeight: '700',
    letterSpacing: 4,
  },
  button: {
    backgroundColor: COLOURS.PRIMARY,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonText: {
    color: COLOURS.TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '600',
  },
});