import { Chess, type Square } from 'chess.js';
import type {
  IChessGameState,
  IChessMove,
  ChessSquare,
  ChessPieceType,
} from '@app-types/game.types';

/**
 * Creates a new Chess instance from an optional FEN string.
 * Defaults to the standard starting position.
 */
export const createChessGame = (fen?: string): Chess => {
  return fen ? new Chess(fen) : new Chess();
};

/**
 * Derives the full IChessGameState from a Chess instance.
 * Called after every move to update the game store.
 */
export const getGameState = (game: Chess): IChessGameState => {
  const history = game.history({ verbose: true });
  const capturedByWhite = history
    .filter((m) => m.color === 'w' && m.captured)
    .map((m) => ({ type: m.captured as ChessPieceType, color: 'b' as const }));
  const capturedByBlack = history
    .filter((m) => m.color === 'b' && m.captured)
    .map((m) => ({ type: m.captured as ChessPieceType, color: 'w' as const }));

  return {
    fen: game.fen(),
    turn: game.turn(),
    isCheck: game.isCheck(),
    isCheckmate: game.isCheckmate(),
    isStalemate: game.isStalemate(),
    isDraw: game.isDraw(),
    isGameOver: game.isGameOver(),
    result: game.isCheckmate()
      ? 'checkmate'
      : game.isStalemate()
      ? 'stalemate'
      : game.isDraw()
      ? 'draw'
      : null,
    moveCount: Math.ceil(history.length / 2),
    capturedByWhite,
    capturedByBlack,
  };
};

/**
 * Returns all legal destination squares for a piece on the given square.
 * Returns empty array if no piece or no legal moves.
 */
export const getLegalMovesForSquare = (
  game: Chess,
  square: ChessSquare
): ChessSquare[] => {
  const moves = game.moves({ square: square as Square, verbose: true });
  return moves.map((m) => (m as { to: ChessSquare }).to);
};

/**
 * Attempts to make a move. Returns the move record if successful, null if illegal.
 */
export const makeMove = (
  game: Chess,
  from: ChessSquare,
  to: ChessSquare,
  promotion: ChessPieceType = 'q'
): IChessMove | null => {
  try {
    const result = game.move({ from, to, promotion });
    if (!result) return null;
    return {
      from: result.from,
      to: result.to,
      promotion: result.promotion as ChessPieceType | undefined,
      san: result.san,
      fen: game.fen(),
    };
  } catch {
    return null;
  }
};

/**
 * Returns the piece symbol for rendering.
 * White pieces use filled unicode, black pieces use outline unicode.
 */
export const getPieceSymbol = (
  type: ChessPieceType,
  color: 'w' | 'b'
): string => {
  const symbols: Record<ChessPieceType, [string, string]> = {
    k: ['♔', '♚'],
    q: ['♕', '♛'],
    r: ['♖', '♜'],
    b: ['♗', '♝'],
    n: ['♘', '♞'],
    p: ['♙', '♟'],
  };
  return symbols[type][color === 'w' ? 0 : 1];
};

/**
 * Checks whether a pawn promotion is required for the given move.
 */
export const requiresPromotion = (
  from: ChessSquare,
  to: ChessSquare,
  game: Chess
): boolean => {
  const piece = game.get(from as any);
  if (!piece || piece.type !== 'p') return false;
  const toRank = to[1];
  return (piece.color === 'w' && toRank === '8') ||
    (piece.color === 'b' && toRank === '1');
};
/**
 * Returns all legal moves for the current position in UCI format.
 * Used to provide Claude with the list of valid moves to choose from.
 */
export const getLegalMovesUCI = (game: Chess): string[] => {
  const moves = game.moves({ verbose: true });
  return moves.map((m) => {
    const promotion = m.promotion ? m.promotion : '';
    return `${m.from}${m.to}${promotion}`;
  });
};