import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '@app-types/navigation.types';
import { COLOURS } from '@constants/colours';
import MyProfileScreen from '@screens/profile/MyProfileScreen';
import EditProfileScreen from '@screens/profile/EditProfileScreen';
import NotificationsScreen from '@screens/profile/NotificationsScreen';
import SettingsScreen from '@screens/profile/SettingsScreen';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

/** Profile navigator — user profile, settings, notifications */
export default function ProfileNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLOURS.SURFACE },
        headerTintColor: COLOURS.TEXT_PRIMARY,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen name="MyProfile" component={MyProfileScreen} options={{ title: 'My Profile' }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Edit Profile' }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </Stack.Navigator>
  );
}