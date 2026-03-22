import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { CommunityStackParamList } from '@app-types/navigation.types';
import { COLOURS } from '@constants/colours';
import CommunityHomeScreen from '@screens/community/CommunityHomeScreen';
import FriendsListScreen from '@screens/community/FriendsListScreen';
import PlayerProfileScreen from '@screens/community/PlayerProfileScreen';

const Stack = createNativeStackNavigator<CommunityStackParamList>();

/** Community navigator — friends, groups, player profiles */
export default function CommunityNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLOURS.SURFACE },
        headerTintColor: COLOURS.TEXT_PRIMARY,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen name="CommunityHome" component={CommunityHomeScreen} options={{ title: 'Community' }} />
      <Stack.Screen name="FriendsList" component={FriendsListScreen} options={{ title: 'Friends' }} />
      <Stack.Screen name="PlayerProfile" component={PlayerProfileScreen} options={{ title: 'Profile' }} />
    </Stack.Navigator>
  );
}