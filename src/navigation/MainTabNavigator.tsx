import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, StyleSheet } from 'react-native';
import type { MainTabParamList } from '@app-types/navigation.types';
import { COLOURS } from '@constants/colours';
import HomeDashboardScreen from '@screens/home/HomeDashboardScreen';
import TournamentsHomeScreen from '@screens/tournaments/TournamentsHomeScreen';
import GamesNavigator from './GamesNavigator';
import CommunityNavigator from './CommunityNavigator';
import ProfileNavigator from './ProfileNavigator';

const Tab = createBottomTabNavigator<MainTabParamList>();

/** Main bottom tab navigator — the core app shell */
export default function MainTabNavigator(): React.JSX.Element {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLOURS.SURFACE,
          borderTopColor: COLOURS.BORDER,
        },
        tabBarActiveTintColor: COLOURS.PRIMARY,
        tabBarInactiveTintColor: COLOURS.TEXT_MUTED,
        tabBarShowLabel: true,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeDashboardScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="Games"
        component={GamesNavigator}
        options={{ tabBarLabel: 'Games' }}
      />
      <Tab.Screen
        name="Community"
        component={CommunityNavigator}
        options={{ tabBarLabel: 'Community' }}
      />
      <Tab.Screen
        name="Tournaments"
        component={TournamentsHomeScreen}
        options={{ tabBarLabel: 'Tournaments' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileNavigator}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({});