import { create } from 'zustand';
import type { IChessGameState, IChessMove, ChessSquare } from '@app-types/game.types';

/** Active game store state */
interface IGameStoreState {
  // Chess game state
  chessGameState: IChessGameState | null;
  chessMoveHistory: IChessMove[];
  selectedSquare: ChessSquare | null;
  legalMovesForSelected: ChessSquare[];

  // Actions
  setChessGameState: (state: IChessGameState) => void;
  setSelectedSquare: (square: ChessSquare | null) => void;
  setLegalMoves: (moves: ChessSquare[]) => void;
  addChessMove: (move: IChessMove) => void;
  resetChessGame: () => void;
}

/** Global game store — holds active game state across screens */
export const useGameStore = create<IGameStoreState>((set) => ({
  chessGameState: null,
  chessMoveHistory: [],
  selectedSquare: null,
  legalMovesForSelected: [],

  /** Updates the chess game state after each move */
  setChessGameState: (state) => set({ chessGameState: state }),

  /** Sets the currently selected square on the board */
  setSelectedSquare: (square) => set({ selectedSquare: square }),

  /** Sets legal destination squares for the selected piece */
  setLegalMoves: (moves) => set({ legalMovesForSelected: moves }),

  /** Appends a move to the game history */
  addChessMove: (move) =>
    set((prev) => ({ chessMoveHistory: [...prev.chessMoveHistory, move] })),

  /** Resets all chess game state for a new game */
  resetChessGame: () =>
    set({
      chessGameState: null,
      chessMoveHistory: [],
      selectedSquare: null,
      legalMovesForSelected: [],
    }),
}));