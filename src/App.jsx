import { useReducer, useState, useEffect, useRef } from 'react'
import './App.css'

const GRID = 20
const CELL = 24
const SIZE = GRID * CELL
const SPEED = 150

const DIRS = {
  ArrowUp:    { x: 0, y: -1 },
  ArrowDown:  { x: 0, y: 1 },
  ArrowLeft:  { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 }, s: { x: 0, y: 1 },
  a: { x: -1, y: 0 }, d: { x: 1, y: 0 },
  W: { x: 0, y: -1 }, S: { x: 0, y: 1 },
  A: { x: -1, y: 0 }, D: { x: 1, y: 0 },
}

function initSnake() {
  return [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }]
}

function randFood(snake) {
  let p
  do {
    p = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) }
  } while (snake.some(s => s.x === p.x && s.y === p.y))
  return p
}

function startState() {
  const snake = initSnake()
  return { snake, food: randFood(snake), dir: { x: 1, y: 0 }, status: 'running', score: 0 }
}

function makeIdle() {
  const snake = initSnake()
  return { snake, food: randFood(snake), dir: { x: 1, y: 0 }, status: 'idle', score: 0 }
}

function reducer(state, action) {
  switch (action.type) {
    case 'TOGGLE':
      if (state.status === 'idle' || state.status === 'gameover') return startState()
      if (state.status === 'running') return { ...state, status: 'paused' }
      if (state.status === 'paused') return { ...state, status: 'running' }
      return state

    case 'DIR': {
      const d = action.dir
      if (d.x === -state.dir.x && d.y === -state.dir.y) return state
      return { ...state, dir: d }
    }

    case 'TICK': {
      if (state.status !== 'running') return state
      const { snake, food, dir } = state
      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y }

      if (
        head.x < 0 || head.x >= GRID ||
        head.y < 0 || head.y >= GRID ||
        snake.some(s => s.x === head.x && s.y === head.y)
      ) {
        return { ...state, status: 'gameover' }
      }

      const ate = head.x === food.x && head.y === food.y
      const newSnake = ate ? [head, ...snake] : [head, ...snake.slice(0, -1)]
      return {
        ...state,
        snake: newSnake,
        food: ate ? randFood(newSnake) : food,
        score: ate ? state.score + 10 : state.score,
      }
    }

    default:
      return state
  }
}

function drawCanvas(ctx, state) {
  const { snake, food, dir } = state

  // Background
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(0, 0, SIZE, SIZE)

  // Grid lines
  ctx.strokeStyle = '#1e293b'
  ctx.lineWidth = 0.5
  for (let i = 1; i < GRID; i++) {
    ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, SIZE); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(SIZE, i * CELL); ctx.stroke()
  }

  // Food
  ctx.fillStyle = '#f87171'
  ctx.beginPath()
  ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 3, 0, Math.PI * 2)
  ctx.fill()

  // Snake body (gradient from head to tail)
  snake.slice(1).forEach(({ x, y }, i) => {
    const alpha = 1 - (i / snake.length) * 0.6
    ctx.fillStyle = `rgba(74, 222, 128, ${alpha})`
    ctx.beginPath()
    ctx.roundRect(x * CELL + 2, y * CELL + 2, CELL - 4, CELL - 4, 3)
    ctx.fill()
  })

  // Snake head
  const h = snake[0]
  ctx.fillStyle = '#bbf7d0'
  ctx.beginPath()
  ctx.roundRect(h.x * CELL + 1, h.y * CELL + 1, CELL - 2, CELL - 2, 5)
  ctx.fill()

  // Eyes
  ctx.fillStyle = '#0f172a'
  const cx = h.x * CELL + CELL / 2
  const cy = h.y * CELL + CELL / 2
  const perp = { x: dir.y, y: -dir.x }
  const eyeForward = 5
  const eyeSide = 4
  ctx.beginPath()
  ctx.arc(cx + dir.x * eyeForward + perp.x * eyeSide, cy + dir.y * eyeForward + perp.y * eyeSide, 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cx + dir.x * eyeForward - perp.x * eyeSide, cy + dir.y * eyeForward - perp.y * eyeSide, 2, 0, Math.PI * 2)
  ctx.fill()
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, null, makeIdle)
  const [highScore, setHighScore] = useState(() => +(localStorage.getItem('snakeHighScore') || 0))
  const canvasRef = useRef(null)
  const prevHighScore = useRef(highScore)

  // Update high score
  useEffect(() => {
    if (state.score > 0 && state.score > highScore) {
      setHighScore(state.score)
      localStorage.setItem('snakeHighScore', state.score)
    }
  }, [state.score])

  // Track high score before game over for "new record" check
  useEffect(() => {
    if (state.status === 'running') {
      prevHighScore.current = highScore
    }
  }, [state.status])

  // Game loop
  useEffect(() => {
    if (state.status !== 'running') return
    const id = setInterval(() => dispatch({ type: 'TICK' }), SPEED)
    return () => clearInterval(id)
  }, [state.status])

  // Keyboard
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        dispatch({ type: 'TOGGLE' })
        return
      }
      const dir = DIRS[e.key]
      if (dir) {
        e.preventDefault()
        dispatch({ type: 'DIR', dir })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    drawCanvas(ctx, state)
  }, [state])

  const isNewRecord = state.status === 'gameover' && state.score > 0 && state.score >= prevHighScore.current

  return (
    <div className="app">
      <h1 className="title">貪食蛇</h1>

      <div className="scores">
        <div className="score-box">
          <div className="score-label">分數</div>
          <div className="score-num">{state.score}</div>
        </div>
        <div className="score-box">
          <div className="score-label">最高分</div>
          <div className="score-num">{highScore}</div>
        </div>
      </div>

      <div className="canvas-wrap">
        <canvas ref={canvasRef} width={SIZE} height={SIZE} className="canvas" />

        {state.status !== 'running' && (
          <div className="overlay">
            {state.status === 'idle' && (
              <>
                <div className="ov-icon">🐍</div>
                <div className="ov-title">貪食蛇</div>
                <div className="ov-hint">按 Space / Enter 開始</div>
              </>
            )}
            {state.status === 'paused' && (
              <>
                <div className="ov-title">暫停中</div>
                <div className="ov-hint">按 Space / Enter 繼續</div>
              </>
            )}
            {state.status === 'gameover' && (
              <>
                <div className="ov-title">遊戲結束</div>
                <div className="ov-score">得分 {state.score}</div>
                {isNewRecord && <div className="ov-record">🎉 新紀錄！</div>}
                <div className="ov-hint">按 Space / Enter 重新開始</div>
              </>
            )}
          </div>
        )}
      </div>

      <p className="hint">方向鍵 / WASD 控制方向　Space / Enter 開始／暫停</p>
    </div>
  )
}
