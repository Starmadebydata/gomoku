"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle, User, Cpu, BrainCircuit } from 'lucide-react'

type Player = "black" | "white"
type CellValue = Player | null
type Board = CellValue[][]
type Position = { row: number; col: number }
type GameState = "selecting" | "playing" | "finished"
type Direction = { dr: number; dc: number }
type Pattern = {
  name: string
  score: number
  pattern: (string | null)[]
}
type Threat = {
  position: Position
  score: number
  type: string
}
type AIDifficulty = "Medium" | "Hard" | "Expert"

export default function GomokuGame() {
  const boardSize = 15
  const [board, setBoard] = useState<Board>(createEmptyBoard())
  const [currentPlayer, setCurrentPlayer] = useState<Player>("black")
  const [winner, setWinner] = useState<Player | null>(null)
  const [winningPositions, setWinningPositions] = useState<Position[]>([])
  const [lastMove, setLastMove] = useState<Position | null>(null)
  const [humanPlayer, setHumanPlayer] = useState<Player | null>(null)
  const [gameState, setGameState] = useState<GameState>("selecting")
  const [aiThinking, setAiThinking] = useState(false)
  const [difficulty, setDifficulty] = useState<AIDifficulty>("Medium")
  const [moveHistory, setMoveHistory] = useState<Position[]>([])

  // 方向：用于检查棋型和连线
  const directions: Direction[] = [
    { dr: 0, dc: 1 }, // 水平
    { dr: 1, dc: 0 }, // 垂直
    { dr: 1, dc: 1 }, // 右下对角线
    { dr: 1, dc: -1 }, // 左下对角线
  ]

  function createEmptyBoard(): Board {
    return Array(boardSize)
      .fill(null)
      .map(() => Array(boardSize).fill(null))
  }

  function resetGame() {
    setBoard(createEmptyBoard())
    setCurrentPlayer("black")
    setWinner(null)
    setWinningPositions([])
    setLastMove(null)
    setHumanPlayer(null)
    setGameState("selecting")
    setMoveHistory([])
  }

  function startGame(selectedColor: Player) {
    setHumanPlayer(selectedColor)
    setGameState("playing")
    setMoveHistory([])

    // 如果电脑先手（人类选择白棋），则电脑先走
    if (selectedColor === "white") {
      setAiThinking(true)
      setTimeout(() => {
        const emptyBoard = createEmptyBoard()
        const move = makeComputerMove(emptyBoard, "black")
        if (move) {
          setMoveHistory([move])
        }
        setAiThinking(false)
      }, 800)
    }
  }

  function handleCellClick(row: number, col: number) {
    // 如果不是人类回合，或者有赢家，或者该位置已有棋子，或者游戏未进行中，或者AI正在思考，则忽略点击
    if (currentPlayer !== humanPlayer || winner || board[row][col] || gameState !== "playing" || aiThinking) return

    // 创建一个新的棋盘，加入人类的落子
    const newBoard = board.map((boardRow) => [...boardRow])
    newBoard[row][col] = humanPlayer

    // 更新历史记录
    const newHistory = [...moveHistory, { row, col }]
    setMoveHistory(newHistory)

    // 更新状态
    setBoard(newBoard)
    setLastMove({ row, col })

    // 检查是否获胜
    const result = checkWinner(newBoard, row, col, humanPlayer)
    if (result.hasWinner) {
      setWinner(humanPlayer)
      setWinningPositions(result.positions)
      setGameState("finished")
    } else if (isBoardFull(newBoard)) {
      setGameState("finished")
    } else {
      // 切换到电脑回合
      const computerPlayer = humanPlayer === "black" ? "white" : "black"
      setCurrentPlayer(computerPlayer)

      // 短暂延迟后电脑落子
      setAiThinking(true)
      setTimeout(() => {
        const move = makeComputerMove(newBoard, computerPlayer)
        if (move) {
          setMoveHistory([...newHistory, move])
        }
        setAiThinking(false)
      }, 800)
    }
  }

  function isBoardFull(board: Board): boolean {
    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        if (board[row][col] === null) {
          return false
        }
      }
    }
    return true
  }

  function makeComputerMove(currentBoard: Board, computerPlayer: Player): Position | null {
    const humanPlayer = computerPlayer === "black" ? "white" : "black"
    const move = findBestMove(currentBoard, computerPlayer, humanPlayer)

    if (!move) return null // 没有有效的落子位置

    const { row, col } = move
    const newBoard = currentBoard.map((boardRow) => [...boardRow])
    newBoard[row][col] = computerPlayer

    // 更新状态
    setBoard(newBoard)
    setLastMove({ row, col })

    // 检查是否获胜
    const result = checkWinner(newBoard, row, col, computerPlayer)
    if (result.hasWinner) {
      setWinner(computerPlayer)
      setWinningPositions(result.positions)
      setGameState("finished")
    } else if (isBoardFull(newBoard)) {
      setGameState("finished")
    } else {
      // 切换回人类回合
      setCurrentPlayer(humanPlayer)
    }

    return move
  }

  function findBestMove(board: Board, computerPlayer: Player, humanPlayer: Player): Position | null {
    // 如果棋盘为空或几乎为空，使用开局策略
    const stoneCount = countStones(board)
    if (stoneCount <= 2) {
      return getOpeningMove(board, stoneCount)
    }

    // 根据难度级别决定搜索深度和策略
    let searchDepth = 1
    let useAlphaBeta = false
    let useThreatSearch = false

    switch (difficulty) {
      case "Medium":
        searchDepth = 1
        break
      case "Hard":
        searchDepth = 2
        useAlphaBeta = true
        break
      case "Expert":
        searchDepth = 3
        useAlphaBeta = true
        useThreatSearch = true
        break
    }

    // 首先检查是否有立即获胜的着法
    const winningMove = findWinningMove(board, computerPlayer)
    if (winningMove) return winningMove

    // 检查是否需要立即防守（阻止对手获胜）
    const blockingMove = findWinningMove(board, humanPlayer)
    if (blockingMove) return blockingMove

    // 在专家难度下，使用威胁空间搜索
    if (useThreatSearch) {
      const threatMove = findThreatMove(board, computerPlayer, humanPlayer)
      if (threatMove) return threatMove
    }

    // 使用极小极大算法或Alpha-Beta剪枝进行搜索
    if (useAlphaBeta && searchDepth > 1) {
      return alphaBetaSearch(board, computerPlayer, humanPlayer, searchDepth)
    }

    // 生成所有可能的着法并评分
    const scoredMoves: { position: Position; score: number }[] = []

    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        if (board[row][col] === null) {
          // 只考虑靠近现有棋子的位置（加上一个小边距）
          // 这大大减少了搜索空间
          if (!hasNeighbor(board, row, col, 2)) continue

          // 尝试在此处落子并评估局面
          const testBoard = board.map((boardRow) => [...boardRow])
          testBoard[row][col] = computerPlayer

          // 计算此着法的分数
          const score = evaluateMove(board, row, col, computerPlayer, humanPlayer)
          scoredMoves.push({ position: { row, col }, score })
        }
      }
    }

    // 按分数排序（最高分在前）
    scoredMoves.sort((a, b) => b.score - a.score)

    // 为顶级着法添加一些随机性，使AI不那么可预测
    // 但仍然保持强度
    const topMoves = scoredMoves.slice(0, Math.min(3, scoredMoves.length))
    if (topMoves.length > 0) {
      // 如果最佳着法明显更好，则使用它
      if (topMoves.length > 1 && topMoves[0].score > topMoves[1].score * 1.5) {
        return topMoves[0].position
      }
      // 否则，从顶级着法中随机选择
      return topMoves[Math.floor(Math.random() * topMoves.length)].position
    }

    // 如果没有找到好的着法，就选择中心或随机着法
    if (board[Math.floor(boardSize / 2)][Math.floor(boardSize / 2)] === null) {
      return { row: Math.floor(boardSize / 2), col: Math.floor(boardSize / 2) }
    }

    // 找到任何空位置
    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        if (board[row][col] === null) {
          return { row, col }
        }
      }
    }

    return null // 没有有效的着法
  }

  function alphaBetaSearch(board: Board, computerPlayer: Player, humanPlayer: Player, depth: number): Position | null {
    let bestScore = Number.NEGATIVE_INFINITY
    let bestMove: Position | null = null

    // 生成所有可能的着法
    const possibleMoves: Position[] = []

    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        if (board[row][col] === null && hasNeighbor(board, row, col, 2)) {
          possibleMoves.push({ row, col })
        }
      }
    }

    // 如果没有可能的着法，返回null
    if (possibleMoves.length === 0) return null

    // 对每个可能的着法进行评估
    for (const move of possibleMoves) {
      // 尝试此着法
      const newBoard = board.map((row) => [...row])
      newBoard[move.row][move.col] = computerPlayer

      // 递归评估此着法
      const score = minimax(
        newBoard,
        depth - 1,
        Number.NEGATIVE_INFINITY,
        Number.POSITIVE_INFINITY,
        false,
        computerPlayer,
        humanPlayer,
      )

      // 更新最佳着法
      if (score > bestScore) {
        bestScore = score
        bestMove = move
      }
    }

    return bestMove
  }

  function minimax(
    board: Board,
    depth: number,
    alpha: number,
    beta: number,
    isMaximizing: boolean,
    computerPlayer: Player,
    humanPlayer: Player,
  ): number {
    // 检查终止条件
    if (depth === 0) {
      return evaluateBoard(board, computerPlayer, humanPlayer)
    }

    // 生成所有可能的着法
    const possibleMoves: Position[] = []
    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        if (board[row][col] === null && hasNeighbor(board, row, col, 2)) {
          possibleMoves.push({ row, col })
        }
      }
    }

    // 如果没有可能的着法，返回当前局面评分
    if (possibleMoves.length === 0) {
      return evaluateBoard(board, computerPlayer, humanPlayer)
    }

    if (isMaximizing) {
      // 电脑回合，寻找最大值
      let maxEval = Number.NEGATIVE_INFINITY
      for (const move of possibleMoves) {
        const newBoard = board.map((row) => [...row])
        newBoard[move.row][move.col] = computerPlayer

        // 检查是否获胜
        const result = checkWinner(newBoard, move.row, move.col, computerPlayer)
        if (result.hasWinner) {
          return 100000 // 立即获胜的着法
        }

        const evaluation = minimax(newBoard, depth - 1, alpha, beta, false, computerPlayer, humanPlayer)
        maxEval = Math.max(maxEval, evaluation)
        alpha = Math.max(alpha, evaluation)
        if (beta <= alpha) break // Alpha-Beta剪枝
      }
      return maxEval
    } else {
      // 人类回合，寻找最小值
      let minEval = Number.POSITIVE_INFINITY
      for (const move of possibleMoves) {
        const newBoard = board.map((row) => [...row])
        newBoard[move.row][move.col] = humanPlayer

        // 检查是否获胜
        const result = checkWinner(newBoard, move.row, move.col, humanPlayer)
        if (result.hasWinner) {
          return -100000 // 对手获胜的着法
        }

        const evaluation = minimax(newBoard, depth - 1, alpha, beta, true, computerPlayer, humanPlayer)
        minEval = Math.min(minEval, evaluation)
        beta = Math.min(beta, evaluation)
        if (beta <= alpha) break // Alpha-Beta剪枝
      }
      return minEval
    }
  }

  function evaluateBoard(board: Board, computerPlayer: Player, humanPlayer: Player): number {
    let score = 0

    // 评估所有行、列和对角线
    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        if (board[row][col] === computerPlayer) {
          // 评估此位置的所有方向
          for (const { dr, dc } of directions) {
            score += evaluateDirection(board, row, col, dr, dc, computerPlayer, humanPlayer)
          }
        } else if (board[row][col] === humanPlayer) {
          // 评估对手的位置
          for (const { dr, dc } of directions) {
            score -= evaluateDirection(board, row, col, dr, dc, humanPlayer, computerPlayer) * 0.9
          }
        }
      }
    }

    return score
  }

  function evaluateDirection(
    board: Board,
    row: number,
    col: number,
    dr: number,
    dc: number,
    player: Player,
    opponent: Player,
  ): number {
    let count = 1 // 当前位置的棋子
    let openEnds = 0
    const score = 0

    // 向一个方向检查
    let r = row + dr
    let c = col + dc
    while (r >= 0 && r < boardSize && c >= 0 && c < boardSize && board[r][c] === player) {
      count++
      r += dr
      c += dc
    }
    // 检查这个方向是否开放
    if (r >= 0 && r < boardSize && c >= 0 && c < boardSize && board[r][c] === null) {
      openEnds++
    }

    // 向相反方向检查
    r = row - dr
    c = col - dc
    while (r >= 0 && r < boardSize && c >= 0 && c < boardSize && board[r][c] === player) {
      count++
      r -= dr
      c -= dc
    }
    // 检查这个方向是否开放
    if (r >= 0 && r < boardSize && c >= 0 && c < boardSize && board[r][c] === null) {
      openEnds++
    }

    // 根据连子数和开放端评分
    if (count >= 5) return 100000 // 五连
    if (count === 4) {
      if (openEnds === 2) return 10000 // 活四
      if (openEnds === 1) return 1000 // 冲四
    }
    if (count === 3) {
      if (openEnds === 2) return 1000 // 活三
      if (openEnds === 1) return 100 // 冲三
    }
    if (count === 2) {
      if (openEnds === 2) return 100 // 活二
      if (openEnds === 1) return 10 // 冲二
    }
    if (count === 1) {
      if (openEnds === 2) return 10 // 活一
      if (openEnds === 1) return 1 // 冲一
    }

    return 0
  }

  function findThreatMove(board: Board, computerPlayer: Player, humanPlayer: Player): Position | null {
    // 寻找可以形成威胁的着法
    const threats: Threat[] = []

    // 寻找可以形成活三或冲四的着法
    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        if (board[row][col] === null && hasNeighbor(board, row, col, 2)) {
          // 尝试在此处落子
          const testBoard = board.map((r) => [...r])
          testBoard[row][col] = computerPlayer

          // 检查是否形成威胁
          const threatType = checkThreat(testBoard, row, col, computerPlayer)
          if (threatType) {
            threats.push({
              position: { row, col },
              score: getThreatScore(threatType),
              type: threatType,
            })
          }
        }
      }
    }

    // 如果找到威胁，选择分数最高的
    if (threats.length > 0) {
      threats.sort((a, b) => b.score - a.score)
      return threats[0].position
    }

    // 检查是否需要防守对手的威胁
    const defensiveThreats: Threat[] = []

    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        if (board[row][col] === null && hasNeighbor(board, row, col, 2)) {
          // 尝试对手在此处落子
          const testBoard = board.map((r) => [...r])
          testBoard[row][col] = humanPlayer

          // 检查是否形成威胁
          const threatType = checkThreat(testBoard, row, col, humanPlayer)
          if (threatType) {
            defensiveThreats.push({
              position: { row, col },
              score: getThreatScore(threatType),
              type: threatType,
            })
          }
        }
      }
    }

    // 如果找到对手的威胁，选择分数最高的进行防守
    if (defensiveThreats.length > 0) {
      defensiveThreats.sort((a, b) => b.score - a.score)
      return defensiveThreats[0].position
    }

    return null
  }

  function checkThreat(board: Board, row: number, col: number, player: Player): string | null {
    // Check for open four, four, or open three
    for (const { dr, dc } of directions) {
      const line = getLine(board, row, col, dr, dc, player)
      
      // Check for open four
      if (line.join('').includes(`${player}${player}${player}${player}`) && 
          countNulls(line) >= 2) {
        return "Open Four"
      }
      
      // Check for four
      if (line.join('').includes(`${player}${player}${player}${player}`) && 
          countNulls(line) === 1) {
        return "Four"
      }
      
      // Check for open three
      if (line.join('').includes(`${player}${player}${player}`) && 
          !line.join('').includes(`${player}${player}${player}${player}`) && 
          countNulls(line) >= 2) {
        return "Open Three"
      }
    }
    
    return null
  }

  function countNulls(line: (string | null)[]): number {
    return line.filter((cell) => cell === null).length
  }

  function getThreatScore(threatType: string): number {
    switch (threatType) {
      case "Open Four": return 10000
      case "Four": return 1000
      case "Open Three": return 500
      default: return 0
    }
  }

  function countStones(board: Board): number {
    let count = 0
    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        if (board[row][col] !== null) {
          count++
        }
      }
    }
    return count
  }

  function getOpeningMove(board: Board, stoneCount: number): Position {
    const center = Math.floor(boardSize / 2)

    // 第一手 - 下中心点
    if (stoneCount === 0) {
      return { row: center, col: center }
    }

    // 第二手 - 如果对手下了中心点，则下在中心点旁边
    // 否则下中心点
    if (stoneCount === 1) {
      if (board[center][center] !== null) {
        // 天元已被占用，选择靠近天元的位置
        const options = [
          { row: center - 1, col: center },
          { row: center + 1, col: center },
          { row: center, col: center - 1 },
          { row: center, col: center + 1 },
        ]
        return options[Math.floor(Math.random() * options.length)]
      } else {
        return { row: center, col: center }
      }
    }

    // 第三手及以后，使用常规评估
    // 在中心附近找一个好的着法
    const radius = 3
    const candidates: Position[] = []

    for (let row = center - radius; row <= center + radius; row++) {
      for (let col = center - radius; col <= center + radius; col++) {
        if (row >= 0 && row < boardSize && col >= 0 && col < boardSize && board[row][col] === null) {
          candidates.push({ row, col })
        }
      }
    }

    if (candidates.length > 0) {
      return candidates[Math.floor(Math.random() * candidates.length)]
    }

    // 回退到中心
    return { row: center, col: center }
  }

  function hasNeighbor(board: Board, row: number, col: number, distance: number): boolean {
    for (let r = Math.max(0, row - distance); r <= Math.min(boardSize - 1, row + distance); r++) {
      for (let c = Math.max(0, col - distance); c <= Math.min(boardSize - 1, col + distance); c++) {
        if (board[r][c] !== null) {
          return true
        }
      }
    }
    return false
  }

  function findWinningMove(board: Board, player: Player): Position | null {
    // 检查每个空位，看是否可以形成五连
    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        if (board[row][col] === null) {
          // 尝试在此处落子
          const testBoard = board.map((boardRow) => [...boardRow])
          testBoard[row][col] = player

          // 检查是否形成五连
          const result = checkWinner(testBoard, row, col, player)
          if (result.hasWinner) {
            return { row, col }
          }
        }
      }
    }
    return null
  }

  function evaluateMove(board: Board, row: number, col: number, player: Player, opponent: Player): number {
    let totalScore = 0

    // 中心位置加分
    const center = Math.floor(boardSize / 2)
    const distanceFromCenter = Math.max(Math.abs(row - center), Math.abs(col - center))
    totalScore += Math.max(0, 5 - distanceFromCenter) * 2

    // 检查所有方向的棋型
    for (const { dr, dc } of directions) {
      // 获取此方向的棋型
      const line = getLine(board, row, col, dr, dc, player)

      // 评估进攻棋型（玩家的棋型）
      const offensiveScore = evaluateLine(line, player, opponent)
      totalScore += offensiveScore

      // 评估防守棋型（对手的棋型）
      // 在此处放置对手的棋子，看会形成什么棋型
      const defensiveBoard = board.map((r) => [...r])
      defensiveBoard[row][col] = opponent
      const defensiveLine = getLine(defensiveBoard, row, col, dr, dc, opponent)
      const defensiveScore = evaluateLine(defensiveLine, opponent, player)

      // 阻止对手的强势棋型很重要
      // 但略低于创建自己的棋型
      totalScore += defensiveScore * 0.9
    }

    return totalScore
  }

  function getLine(board: Board, row: number, col: number, dr: number, dc: number, player: Player): (string | null)[] {
    const line: (string | null)[] = []

    // 向两个方向各看5个空间
    for (let i = -5; i <= 5; i++) {
      const r = row + i * dr
      const c = col + i * dc

      if (r >= 0 && r < boardSize && c >= 0 && c < boardSize) {
        if (i === 0) {
          // 这是我们正在评估的位置
          line.push(player)
        } else {
          // 将棋盘值转换为字符串以进行模式匹配
          if (board[r][c] === player) {
            line.push(player)
          } else if (board[r][c] === null) {
            line.push(null)
          } else {
            line.push("opponent")
          }
        }
      } else {
        // 超出边界 - 视为对手的棋子以阻止
        line.push("opponent")
      }
    }

    return line
  }

  function evaluateLine(line: (string | null)[], player: Player, opponent: Player): number {
    let score = 0

    // 定义棋型及其分数
    // X = 玩家的棋子, O = 空位, B = 边界（对手或边缘）
    const patterns: Pattern[] = [
      // 五连 - 最高优先级
      { name: "五连", score: 100000, pattern: [player, player, player, player, player] },

      // 活四（一步可以获胜）
      { name: "活四", score: 10000, pattern: [null, player, player, player, player, null] },

      // 冲四（一端被堵）
      { name: "冲四-1", score: 1000, pattern: ["opponent", player, player, player, player, null] },
      { name: "冲四-2", score: 1000, pattern: [null, player, player, player, player, "opponent"] },

      // 活三（可以形成活四）
      { name: "活三-1", score: 1000, pattern: [null, player, player, player, null, null] },
      { name: "活三-2", score: 1000, pattern: [null, null, player, player, player, null] },
      { name: "活三-3", score: 800, pattern: [null, player, player, null, player, null] },
      { name: "活三-4", score: 800, pattern: [null, player, null, player, player, null] },

      // 冲三
      { name: "冲三-1", score: 100, pattern: ["opponent", player, player, player, null, null] },
      { name: "冲三-2", score: 100, pattern: [null, null, player, player, player, "opponent"] },

      // 活二
      { name: "活二", score: 100, pattern: [null, null, player, player, null, null] },
      { name: "活二-2", score: 80, pattern: [null, player, null, player, null, null] },
      { name: "活二-3", score: 80, pattern: [null, null, player, null, player, null] },

      // 单子带空间
      { name: "活一", score: 10, pattern: [null, null, player, null, null, null] },
    ]

    // 检查线上的每个棋型
    for (let i = 0; i <= line.length - 5; i++) {
      const segment = line.slice(i, i + 6)

      for (const { pattern, score: patternScore } of patterns) {
        if (matchesPattern(segment, pattern)) {
          score += patternScore
          break // 每个位置只计算最高价值的棋型
        }
      }
    }

    return score
  }

  function matchesPattern(segment: (string | null)[], pattern: (string | null)[]): boolean {
    if (segment.length !== pattern.length) return false

    for (let i = 0; i < segment.length; i++) {
      if (pattern[i] === "opponent") {
        // 棋型需要对手的棋子或边界
        if (segment[i] !== "opponent") return false
      } else if (pattern[i] !== null) {
        // 棋型需要玩家的棋子
        if (segment[i] !== pattern[i]) return false
      } else {
        // 棋型需要空位
        if (segment[i] !== null) return false
      }
    }

    return true
  }

  function checkWinner(board: Board, row: number, col: number, player: Player) {
    for (const { dr, dc } of directions) {
      const positions: Position[] = []

      // 向两个方向检查
      for (let i = -4; i <= 4; i++) {
        const r = row + i * dr
        const c = col + i * dc

        if (r >= 0 && r < boardSize && c >= 0 && c < boardSize && board[r][c] === player) {
          positions.push({ row: r, col: c })

          // 如果找到五连，返回赢家
          if (positions.length === 5) {
            return { hasWinner: true, positions }
          }
        } else {
          // 如果序列中断，重置位置
          positions.length = 0
        }
      }
    }

    return { hasWinner: false, positions: [] }
  }

  function isCellInWinningLine(row: number, col: number) {
    return winningPositions.some((pos) => pos.row === row && pos.col === col)
  }

  function isLastMove(row: number, col: number) {
    return lastMove?.row === row && lastMove?.col === col
  }

  if (gameState === "selecting") {
    return (
      <div className="flex flex-col items-center bg-white p-8 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-6">Choose Your Stone Color</h2>
        <div className="flex flex-col gap-6">
          <div className="flex gap-6">
            <Button
              onClick={() => startGame("black")}
              className="flex flex-col items-center p-6 bg-gray-800 hover:bg-gray-900"
            >
              <div className="w-10 h-10 bg-black rounded-full mb-3"></div>
              <div className="flex items-center gap-2">
                <User size={16} />
                <span>Play Black (First)</span>
              </div>
            </Button>

            <Button
              onClick={() => startGame("white")}
              className="flex flex-col items-center p-6 bg-gray-200 hover:bg-gray-300 text-gray-800"
            >
              <div className="w-10 h-10 bg-white rounded-full border-2 border-gray-300 mb-3"></div>
              <div className="flex items-center gap-2">
                <User size={16} />
                <span>Play White (Second)</span>
              </div>
            </Button>
          </div>
        
        <div className="mt-4">
          <h3 className="text-lg font-medium mb-2">Select AI Difficulty</h3>
          <div className="flex gap-3">
            <Button 
              onClick={() => setDifficulty("Medium")} 
              variant={difficulty === "Medium" ? "default" : "outline"}
              className="flex items-center gap-2"
            >
              <Cpu size={16} />
              Medium
            </Button>
            <Button 
              onClick={() => setDifficulty("Hard")} 
              variant={difficulty === "Hard" ? "default" : "outline"}
              className="flex items-center gap-2"
            >
              <Cpu size={16} />
              Hard
            </Button>
            <Button 
              onClick={() => setDifficulty("Expert")} 
              variant={difficulty === "Expert" ? "default" : "outline"}
              className="flex items-center gap-2"
            >
              <BrainCircuit size={16} />
              Expert
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

return (
  <div className="flex flex-col items-center">
    <div className="mb-4 text-lg font-medium">
      {winner ? (
        <div className="flex items-center gap-2 text-green-600">
          <AlertCircle className="h-5 w-5" />
          <span>
            Winner: <span className="font-bold">{winner === "black" ? "Black" : "White"}</span>
          </span>
          {winner === humanPlayer ? (
            <span className="flex items-center gap-1">
              <User size={16} /> (You)
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Cpu size={16} /> (Computer)
            </span>
          )}
        </div>
      ) : gameState === "finished" ? (
        <div className="flex items-center gap-2 text-amber-600">
          <AlertCircle className="h-5 w-5" />
          <span>Game ended in a draw</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          Current turn:
          <span className="font-bold">{currentPlayer === "black" ? "Black" : "White"}</span>
          {currentPlayer === humanPlayer ? (
            <span className="flex items-center gap-1">
              <User size={16} /> (You)
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Cpu size={16} className={aiThinking ? "animate-pulse" : ""} /> 
              {aiThinking ? "(Thinking...)" : "(Computer)"}
            </span>
          )}
          <span className="ml-2 text-sm text-muted-foreground">AI Level: {difficulty}</span>
        </div>
      )}
    </div>

    <div className="relative bg-amber-100 p-2 sm:p-3 rounded shadow-md mb-6">
      <div className="relative">
        {/* Grid lines */}
        {Array(boardSize)
          .fill(null)
          .map((_, rowIndex) => (
            <div
              key={`h-${rowIndex}`}
              className="absolute w-full border-t border-amber-800"
              style={{ top: `${(rowIndex / (boardSize - 1)) * 100}%` }}
            />
          ))}
        {Array(boardSize)
          .fill(null)
          .map((_, colIndex) => (
            <div
              key={`v-${colIndex}`}
              className="absolute h-full border-l border-amber-800"
              style={{ left: `${(colIndex / (boardSize - 1)) * 100}%` }}
            />
          ))}

        {/* Board size div */}
        <div className="w-[300px] h-[300px] sm:w-[350px] sm:h-[350px] md:w-[400px] md:h-[400px] lg:w-[450px] lg:h-[450px]" />

        {/* Clickable areas and stones */}
        {board.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <button
              key={`${rowIndex}-${colIndex}`}
              className="absolute -translate-x-1/2 -translate-y-1/2 w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8"
              style={{
                left: `${(colIndex / (boardSize - 1)) * 100}%`,
                top: `${(rowIndex / (boardSize - 1)) * 100}%`,
              }}
              onClick={() => handleCellClick(rowIndex, colIndex)}
              disabled={currentPlayer !== humanPlayer || !!winner || !!cell || gameState !== "playing" || aiThinking}
            >
              {cell && (
                <div
                  className={`
            absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full
            w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-7 lg:h-7
            ${cell === "black" ? "bg-black" : "bg-white border border-gray-300"}
            ${isLastMove(rowIndex, colIndex) ? "ring-1 ring-red-500" : ""}
            ${isCellInWinningLine(rowIndex, colIndex) ? "ring-1 ring-yellow-500" : ""}
          `}
                />
              )}
              {currentPlayer === humanPlayer && !winner && !cell && gameState === "playing" && !aiThinking && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full rounded-full hover:bg-amber-200 opacity-50" />
              )}
            </button>
          )),
        )}

        {/* Star points (traditional board markers) */}
        {[3, 7, 11].map((row) =>
          [3, 7, 11].map((col) => (
            <div
              key={`star-${row}-${col}`}
              className="absolute w-1.5 h-1.5 rounded-full bg-amber-800"
              style={{
                left: `${(col / (boardSize - 1)) * 100}%`,
                top: `${(row / (boardSize - 1)) * 100}%`,
                transform: "translate(-50%, -50%)",
              }}
            />
          )),
        )}
      </div>
    </div>

    <div className="flex gap-4">
      <Button onClick={resetGame} className="px-6">
        New Game
      </Button>
    </div>
  </div>
)
}
