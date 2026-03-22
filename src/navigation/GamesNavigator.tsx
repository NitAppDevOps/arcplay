import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { GamesStackParamList } from '@app-types/navigation.types';
import { COLOURS } from '@constants/colours';
import GamesHomeScreen from '@screens/games/GamesHomeScreen';
import ChessHomeScreen from '@screens/games/chess/ChessHomeScreen';
import ChessCreateRoomScreen from '@screens/games/chess/ChessCreateRoomScreen';
import ChessRoomLobbyScreen from '@screens/games/chess/ChessRoomLobbyScreen';
import ChessBoardScreen from '@screens/games/chess/ChessBoardScreen';
import ChessPostGameScreen from '@screens/games/chess/ChessPostGameScreen';
import ChessMoveReplayScreen from '@screens/games/chess/ChessMoveReplayScreen';
import ChessAISetupScreen from '@screens/games/chess/ChessAISetupScreen';
import ChessOfflineModeScreen from '@screens/games/chess/ChessOfflineModeScreen';
import RummyHomeScreen from '@screens/games/rummy/RummyHomeScreen';
import RummyVariantSelectScreen from '@screens/games/rummy/RummyVariantSelectScreen';
import RummyCreateRoomScreen from '@screens/games/rummy/RummyCreateRoomScreen';
import RummyRoomLobbyScreen from '@screens/games/rummy/RummyRoomLobbyScreen';
import RummyTableScreen from '@screens/games/rummy/RummyTableScreen';
import RummyMeldDiscardScreen from '@screens/games/rummy/RummyMeldDiscardScreen';
import RummyDeclarationScreen from '@screens/games/rummy/RummyDeclarationScreen';
import RummyPostGameScreen from '@screens/games/rummy/RummyPostGameScreen';
import RummyAISetupScreen from '@screens/games/rummy/RummyAISetupScreen';
import RummyOfflineModeScreen from '@screens/games/rummy/RummyOfflineModeScreen';

const Stack = createNativeStackNavigator<GamesStackParamList>();

/** Games navigator — covers Chess and Rummy screens */
export default function GamesNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLOURS.SURFACE },
        headerTintColor: COLOURS.TEXT_PRIMARY,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen name="GamesHome" component={GamesHomeScreen} options={{ title: 'Games' }} />
      <Stack.Screen name="ChessHome" component={ChessHomeScreen} options={{ title: 'Chess' }} />
      <Stack.Screen name="ChessCreateRoom" component={ChessCreateRoomScreen} options={{ title: 'Create Room' }} />
      <Stack.Screen name="ChessRoomLobby" component={ChessRoomLobbyScreen} options={{ title: 'Lobby' }} />
      <Stack.Screen name="ChessBoard" component={ChessBoardScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ChessPostGame" component={ChessPostGameScreen} options={{ title: 'Result' }} />
      <Stack.Screen name="ChessMoveReplay" component={ChessMoveReplayScreen} options={{ title: 'Replay' }} />
      <Stack.Screen name="ChessAISetup" component={ChessAISetupScreen} options={{ title: 'vs AI' }} />
      <Stack.Screen name="ChessOfflineMode" component={ChessOfflineModeScreen} options={{ title: 'Offline' }} />
      <Stack.Screen name="RummyHome" component={RummyHomeScreen} options={{ title: 'Rummy' }} />
      <Stack.Screen name="RummyVariantSelect" component={RummyVariantSelectScreen} options={{ title: 'Choose Variant' }} />
      <Stack.Screen name="RummyCreateRoom" component={RummyCreateRoomScreen} options={{ title: 'Create Room' }} />
      <Stack.Screen name="RummyRoomLobby" component={RummyRoomLobbyScreen} options={{ title: 'Lobby' }} />
      <Stack.Screen name="RummyTable" component={RummyTableScreen} options={{ headerShown: false }} />
      <Stack.Screen name="RummyMeldDiscard" component={RummyMeldDiscardScreen} options={{ headerShown: false }} />
      <Stack.Screen name="RummyDeclaration" component={RummyDeclarationScreen} options={{ title: 'Declare' }} />
      <Stack.Screen name="RummyPostGame" component={RummyPostGameScreen} options={{ title: 'Result' }} />
      <Stack.Screen name="RummyAISetup" component={RummyAISetupScreen} options={{ title: 'vs AI' }} />
      <Stack.Screen name="RummyOfflineMode" component={RummyOfflineModeScreen} options={{ title: 'Offline' }} />
    </Stack.Navigator>
  );
}