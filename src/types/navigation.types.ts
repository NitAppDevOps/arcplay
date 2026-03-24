/** Navigation type definitions for the entire Phase 1 screen map */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

// ─── Root Stack ───────────────────────────────────────────────────────────────
export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
};

// ─── Onboarding Stack ────────────────────────────────────────────────────────
export type OnboardingStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  Register: undefined;
  Login: undefined;
  AvatarSetup: undefined;
  SkillSurvey: undefined;
  GameLibraryIntro: undefined;
};

// ─── Main Bottom Tabs ────────────────────────────────────────────────────────
export type MainTabParamList = {
  Home: undefined;
  Games: undefined;
  Community: undefined;
  Tournaments: undefined;
  Profile: undefined;
};

// ─── Home Stack ──────────────────────────────────────────────────────────────
export type HomeStackParamList = {
  HomeDashboard: undefined;
};

// ─── Games Stack ─────────────────────────────────────────────────────────────
export type GamesStackParamList = {
  GamesHome: undefined;
  // Chess
  ChessHome: undefined;
  ChessCreateRoom: undefined;
  ChessRoomLobby: { roomId: string };
  ChessBoard: { roomId: string; timeControl?: number | null };
  ChessPostGame: { gameId: string };
  ChessMoveReplay: { gameId: string };
  ChessAISetup: undefined;
  ChessOfflineMode: undefined;
  // Rummy
  RummyHome: undefined;
  RummyVariantSelect: undefined;
  RummyCreateRoom: undefined;
  RummyRoomLobby: { roomId: string };
  RummyTable: { roomId: string; mode?: 'local' | 'online'; playerIndex?: number };
  RummyMeldDiscard: { roomId: string };
  RummyDeclaration: { roomId: string };
  RummyPostGame: { gameId: string };
  RummyAISetup: undefined;
  RummyOfflineMode: undefined;
};

// ─── Community Stack ─────────────────────────────────────────────────────────
export type CommunityStackParamList = {
  CommunityHome: undefined;
  FriendsList: undefined;
  PlayerProfile: { userId: string };
};

// ─── Tournaments Stack ───────────────────────────────────────────────────────
export type TournamentsStackParamList = {
  TournamentsHome: undefined;
};

// ─── Profile Stack ───────────────────────────────────────────────────────────
export type ProfileStackParamList = {
  MyProfile: undefined;
  EditProfile: undefined;
  Notifications: undefined;
  Settings: undefined;
};

// ─── Screen prop helpers ──────────────────────────────────────────────────────
export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type OnboardingStackScreenProps<T extends keyof OnboardingStackParamList> =
  NativeStackScreenProps<OnboardingStackParamList, T>;

export type GamesStackScreenProps<T extends keyof GamesStackParamList> =
  NativeStackScreenProps<GamesStackParamList, T>;

export type CommunityStackScreenProps<T extends keyof CommunityStackParamList> =
  NativeStackScreenProps<CommunityStackParamList, T>;

export type TournamentsStackScreenProps<T extends keyof TournamentsStackParamList> =
  NativeStackScreenProps<TournamentsStackParamList, T>;

export type ProfileStackScreenProps<T extends keyof ProfileStackParamList> =
  NativeStackScreenProps<ProfileStackParamList, T>;

export type MainTabScreenProps<T extends keyof MainTabParamList> =
  BottomTabScreenProps<MainTabParamList, T>;