import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import RootNavigator from '@navigation/RootNavigator';
import { initSupabaseAuth } from '@services/supabase';
import { useAuthStore } from '@store/authStore';
import { COLOURS } from '@constants/colours';

/** App entry point — initialises Supabase auth before rendering navigation */
export default function App(): React.JSX.Element {
  const { isLoading } = useAuthStore();
  const [authReady, setAuthReady] = useState<boolean>(false);

  useEffect(() => {
    const cleanup = initSupabaseAuth();
    setAuthReady(true);
    return cleanup;
  }, []);

  if (!authReady || isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLOURS.PRIMARY} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: COLOURS.BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
  },
});