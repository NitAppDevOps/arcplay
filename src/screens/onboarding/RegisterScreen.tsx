import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '@app-types/navigation.types';
import { COLOURS } from '@constants/colours';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Register'>;

interface IFormField {
  label: string;
  placeholder: string;
  key: keyof IFormState;
  secure?: boolean;
  keyboard?: 'default' | 'email-address' | 'numeric';
}

interface IFormState {
  fullName: string;
  username: string;
  email: string;
  password: string;
  dateOfBirth: string;
}

const FIELDS: IFormField[] = [
  { label: 'Full Name', placeholder: 'Your real name', key: 'fullName' },
  { label: 'Username', placeholder: 'Unique player handle', key: 'username' },
  { label: 'Email', placeholder: 'your@email.com', key: 'email', keyboard: 'email-address' },
  { label: 'Password', placeholder: 'Min 8 characters', key: 'password', secure: true },
  { label: 'Date of Birth', placeholder: 'DD/MM/YYYY', key: 'dateOfBirth' },
];

/** RegisterScreen — collects new user details. Saves to Supabase in Step 5. */
export default function RegisterScreen({ navigation }: Props): React.JSX.Element {
  const [form, setForm] = useState<IFormState>({
    fullName: '',
    username: '',
    email: '',
    password: '',
    dateOfBirth: '',
  });
  const [error, setError] = useState<string>('');

  /** Validates form fields before proceeding */
  const validate = (): boolean => {
    if (!form.fullName.trim()) { setError('Please enter your full name.'); return false; }
    if (!form.username.trim()) { setError('Please choose a username.'); return false; }
    if (!form.email.includes('@')) { setError('Please enter a valid email address.'); return false; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return false; }
    if (form.dateOfBirth.length < 8) { setError('Please enter your date of birth.'); return false; }
    return true;
  };

  /** Handles continue — validates then navigates to AvatarSetup */
  const handleContinue = (): void => {
    setError('');
    if (validate()) {
      navigation.navigate('AvatarSetup');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <TouchableOpacity
            style={styles.back}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
          >
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>
            One profile. Every game. All your stats in one place.
          </Text>

          {/* Fields */}
          <View style={styles.fields}>
            {FIELDS.map((field) => (
              <View key={field.key} style={styles.fieldGroup}>
                <Text style={styles.label}>{field.label}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={field.placeholder}
                  placeholderTextColor={COLOURS.TEXT_MUTED}
                  secureTextEntry={field.secure}
                  keyboardType={field.keyboard ?? 'default'}
                  autoCapitalize={field.key === 'email' || field.key === 'password' ? 'none' : 'words'}
                  value={form[field.key]}
                  onChangeText={(val) => setForm((prev) => ({ ...prev, [field.key]: val }))}
                  accessibilityLabel={field.label}
                />
              </View>
            ))}
          </View>

          {/* Error */}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {/* Age notice */}
          <Text style={styles.ageNotice}>
            You must be 13 or older to use ARCPLAY. Users under 18 cannot enter
            real-money tournaments or sign sponsorship contracts.
          </Text>

          {/* CTA */}
          <TouchableOpacity
            style={styles.btn}
            onPress={handleContinue}
            accessibilityLabel="Continue to avatar setup"
          >
            <Text style={styles.btnText}>Continue</Text>
          </TouchableOpacity>

        </ScrollView>
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
  scroll: {
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
    lineHeight: 20,
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
  ageNotice: {
    color: COLOURS.TEXT_MUTED,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
  btn: {
    backgroundColor: COLOURS.PRIMARY,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  btnText: {
    color: COLOURS.TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '700',
  },
});