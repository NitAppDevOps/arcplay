import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '@app-types/navigation.types';
import SplashScreen from '@screens/onboarding/SplashScreen';
import WelcomeScreen from '@screens/onboarding/WelcomeScreen';
import RegisterScreen from '@screens/onboarding/RegisterScreen';
import LoginScreen from '@screens/onboarding/LoginScreen';
import AvatarSetupScreen from '@screens/onboarding/AvatarSetupScreen';
import SkillSurveyScreen from '@screens/onboarding/SkillSurveyScreen';
import GameLibraryIntroScreen from '@screens/onboarding/GameLibraryIntroScreen';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

/** Onboarding flow — shown to new users before they reach the main app */
export default function OnboardingNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="Splash"
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="AvatarSetup" component={AvatarSetupScreen} />
      <Stack.Screen name="SkillSurvey" component={SkillSurveyScreen} />
      <Stack.Screen name="GameLibraryIntro" component={GameLibraryIntroScreen} />
    </Stack.Navigator>
  );
}