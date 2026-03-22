/** Chess piece colours */
export type ChessColour = 'w' | 'b';

/** Chess piece types */
export type ChessPieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

/** A chess piece on the board */
export interface IChessPiece {
  type: ChessPieceType;
  color: ChessColour;
}

/** A square on the chess board e.g. 'e4', 'a1' */
export type ChessSquare = string;

/** Result of a chess game */
export type ChessGameResult =
  | 'checkmate'
  | 'stalemate'
  | 'draw'
  | 'resignation'
  | 'timeout'
  | null;

/** Full game state passed between screens */
export interface IChessGameState {
  fen: string;
  turn: ChessColour;
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  isGameOver: boolean;
  result: ChessGameResult;
  moveCount: number;
  capturedByWhite: IChessPiece[];
  capturedByBlack: IChessPiece[];
}

/** A single move in the game history */
export interface IChessMove {
  from: ChessSquare;
  to: ChessSquare;
  promotion?: ChessPieceType;
  san: string;
  fen: string;
}

/** Rummy variant types */
export type RummyVariant = 'points' | 'deals' | 'pool101' | 'pool201';

/** A playing card */
export interface ICard {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
  isJoker?: boolean;
}
/** Time control option for chess games */
export interface ITimeControl {
  label: string;
  seconds: number | null;
  format: 'bullet' | 'blitz' | 'rapid' | 'classical' | 'unlimited';
}

/** Available time controls */
export const TIME_CONTROLS: ITimeControl[] = [
  { label: 'Unlimited', seconds: null, format: 'unlimited' },
  { label: 'Bullet — 1 min', seconds: 60, format: 'bullet' },
  { label: 'Blitz — 3 min', seconds: 180, format: 'blitz' },
  { label: 'Blitz — 5 min', seconds: 300, format: 'blitz' },
  { label: 'Rapid — 10 min', seconds: 600, format: 'rapid' },
  { label: 'Rapid — 15 min', seconds: 900, format: 'rapid' },
  { label: 'Classical — 30 min', seconds: 1800, format: 'classical' },
];