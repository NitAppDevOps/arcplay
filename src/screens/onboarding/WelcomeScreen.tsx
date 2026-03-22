import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '@app-types/navigation.types';
import { COLOURS } from '@constants/colours';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Welcome'>;

const FEATURES = [
  { icon: '♟', label: 'Compete', desc: 'Play Chess & Rummy with your circle' },
  { icon: '⚑', label: 'Tournament', desc: 'Host your own sponsored championships' },
  { icon: '◎', label: 'Community', desc: 'Build your reputation and following' },
  { icon: '★', label: 'Earn', desc: 'Win prizes and land sponsorship deals' },
];

/** WelcomeScreen — value proposition with Sign Up and Log In CTAs */
export default function WelcomeScreen({ navigation }: Props): React.JSX.Element {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>ARCPLAY</Text>
          <Text style={styles.headline}>Your personal{'\n'}gaming empire</Text>
          <Text style={styles.subheadline}>
            Compete within trusted circles. Host real tournaments.
            Build your reputation. Earn from your skill.
          </Text>
        </View>

        {/* Feature pills */}
        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.label} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Text style={styles.featureIconText}>{f.icon}</Text>
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureLabel}>{f.label}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* CTAs */}
        <View style={styles.ctas}>
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => navigation.navigate('Register')}
            accessibilityLabel="Create a new ARCPLAY account"
          >
            <Text style={styles.btnPrimaryText}>Create Account</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={() => navigation.navigate('Register')}
            accessibilityLabel="Log in to existing ARCPLAY account"
          >
            <Text style={styles.btnSecondaryText}>I already have an account</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.legal}>
          By continuing you agree to our Terms of Service and Privacy Policy
        </Text>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOURS.BACKGROUND,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  header: {
    gap: 12,
  },
  logo: {
    color: COLOURS.PRIMARY,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 4,
  },
  headline: {
    color: COLOURS.TEXT_PRIMARY,
    fontSize: 36,
    fontWeight: '700',
    lineHeight: 44,
  },
  subheadline: {
    color: COLOURS.TEXT_SECONDARY,
    fontSize: 15,
    lineHeight: 22,
  },
  features: {
    gap: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLOURS.SURFACE_ELEVATED,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureIconText: {
    fontSize: 22,
  },
  featureText: {
    flex: 1,
    gap: 2,
  },
  featureLabel: {
    color: COLOURS.TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: '600',
  },
  featureDesc: {
    color: COLOURS.TEXT_SECONDARY,
    fontSize: 13,
  },
  ctas: {
    gap: 12,
  },
  btnPrimary: {
    backgroundColor: COLOURS.PRIMARY,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: COLOURS.TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '700',
  },
  btnSecondary: {
    backgroundColor: COLOURS.SURFACE,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLOURS.BORDER,
  },
  btnSecondaryText: {
    color: COLOURS.TEXT_SECONDARY,
    fontSize: 15,
    fontWeight: '500',
  },
  legal: {
    color: COLOURS.TEXT_MUTED,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
});