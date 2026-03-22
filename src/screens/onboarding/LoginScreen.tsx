import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '@app-types/navigation.types';
import { COLOURS } from '@constants/colours';
import { signInWithEmail, signInWithGoogle } from '@services/supabase';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Login'>;

/** LoginScreen — signs in existing users via email/password or Google */
export default function LoginScreen({ navigation }: Props): React.JSX.Element {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  /** Signs in with email and password */
  const handleLogin = async (): Promise<void> => {
    setError('');
    if (!email.includes('@')) { setError('Please enter a valid email address.'); return; }
    if (password.length < 8) { setError('Please enter your password.'); return; }
    setIsLoading(true);
    try {
      const { error: authError } = await signInWithEmail(email, password);
      if (authError) setError(authError);
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /** Signs in with Google OAuth */
  const handleGoogleSignIn = async (): Promise<void> => {
    setError('');
    setIsLoading(true);
    try {
      const { error: authError } = await signInWithGoogle();
      if (authError) setError(authError);
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.inner}>

          {/* Header */}
          <TouchableOpacity
            style={styles.back}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
          >
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to your ARCPLAY account</Text>

          {/* Google Sign In */}
          <TouchableOpacity
            style={styles.googleBtn}
            onPress={handleGoogleSignIn}
            disabled={isLoading}
            accessibilityLabel="Continue with Google"
          >
            <Text style={styles.googleBtnText}>Continue with Google</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or sign in with email</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Fields */}
          <View style={styles.fields}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor={COLOURS.TEXT_MUTED}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                accessibilityLabel="Email address"
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Your password"
                placeholderTextColor={COLOURS.TEXT_MUTED}
                secureTextEntry
                autoCapitalize="none"
                value={password}
                onChangeText={setPassword}
                accessibilityLabel="Password"
              />
            </View>
          </View>

          {/* Error */}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {/* CTA */}
          <TouchableOpacity
            style={[styles.btn, isLoading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            accessibilityLabel="Sign in"
          >
            {isLoading ? (
              <ActivityIndicator color={COLOURS.TEXT_PRIMARY} />
            ) : (
              <Text style={styles.btnText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Register link */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
            accessibilityLabel="Go to register"
          >
            <Text style={styles.registerLink}>
              Don't have an account?{' '}
              <Text style={styles.registerLinkBold}>Create one</Text>
            </Text>
          </TouchableOpacity>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: COLOURS.BACKGROUND,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 16,
  },
  back: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
  },
  backText: {
    color: COLOURS.TEXT_SECONDARY,
    fontSize: 15,
  },
  title: {
    color: COLOURS.TEXT_PRIMARY,
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: COLOURS.TEXT_SECONDARY,
    fontSize: 14,
  },
  googleBtn: {
    backgroundColor: COLOURS.SURFACE,
    borderWidth: 1,
    borderColor: COLOURS.BORDER,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  googleBtnText: {
    color: COLOURS.TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLOURS.BORDER,
  },
  dividerText: {
    color: COLOURS.TEXT_MUTED,
    fontSize: 12,
  },
  fields: {
    gap: 16,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    color: COLOURS.TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: '500',
  },
  input: {
    backgroundColor: COLOURS.SURFACE,
    color: COLOURS.TEXT_PRIMARY,
    borderWidth: 1,
    borderColor: COLOURS.BORDER,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
  },
  error: {
    color: COLOURS.ERROR,
    fontSize: 13,
    textAlign: 'center',
  },
  btn: {
    backgroundColor: COLOURS.PRIMARY,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnDisabled: {
    backgroundColor: COLOURS.SURFACE_ELEVATED,
  },
  btnText: {
    color: COLOURS.TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '700',
  },
  registerLink: {
    color: COLOURS.TEXT_SECONDARY,
    fontSize: 14,
    textAlign: 'center',
  },
  registerLinkBold: {
    color: COLOURS.PRIMARY,
    fontWeight: '600',
  },
});