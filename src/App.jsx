import { useReducer, useState, useEffect, useRef } from 'react'
import './App.css'

const GRID = 20
const CELL = 24
const SIZE = GRID * CELL
const BASE_SPEED = 150
const MIN_SPEED = 60

const THEMES = [
  { // 0-40: Deep ocean
    bg: '#0f172a', grid: '#1e293b',
    body: [74, 222, 128], head: '#bbf7d0', food: '#f87171', eye: '#0f172a',
  },
  { // 50-90: Purple night
    bg: '#1a0a2e', grid: '#2d1b4e',
    body: [167, 139, 250], head: '#ddd6fe', food: '#fb923c', eye: '#1a0a2e',
  },
  { // 100-140: Teal abyss
    bg: '#042f2e', grid: '#134e4a',
    body: [45, 212, 191], head: '#ccfbf1', food: '#f472b6', eye: '#042f2e',
  },
  { // 150-190: Crimson fire
    bg: '#1c0a0a', grid: '#3b1515',
    body: [251, 146, 60], head: '#fed7aa', food: '#a78bfa', eye: '#1c0a0a',
  },
  { // 200+: Golden realm
    bg: '#1a1500', grid: '#3d3200',
    body: [250, 204, 21], head: '#fef9c3', food: '#22d3ee', eye: '#1a1500',
  },
]

function getTheme(score) {
  const level = Math.min(Math.floor(score / 50), THEMES.length - 1)
  return THEMES[level]
}

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
      if (state.status === 'dying') return state
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
        return { ...state, status: 'dying' }
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

    case 'DEAD':
      if (state.status === 'dying') return { ...state, status: 'gameover' }
      return state

    default:
      return state
  }
}

function drawBgAndGrid(ctx, theme) {
  ctx.fillStyle = theme.bg
  ctx.fillRect(0, 0, SIZE, SIZE)
  ctx.strokeStyle = theme.grid
  ctx.lineWidth = 0.5
  for (let i = 1; i < GRID; i++) {
    ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, SIZE); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(SIZE, i * CELL); ctx.stroke()
  }
}

function drawCanvas(ctx, state) {
  const { snake, food, dir } = state
  const theme = getTheme(state.score)

  drawBgAndGrid(ctx, theme)

  // Food
  ctx.fillStyle = theme.food
  ctx.beginPath()
  ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 3, 0, Math.PI * 2)
  ctx.fill()

  // Snake body
  const [r, g, b] = theme.body
  snake.slice(1).forEach(({ x, y }, i) => {
    const alpha = 1 - (i / snake.length) * 0.6
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`
    ctx.beginPath()
    ctx.roundRect(x * CELL + 2, y * CELL + 2, CELL - 4, CELL - 4, 3)
    ctx.fill()
  })

  // Snake head
  const h = snake[0]
  ctx.fillStyle = theme.head
  ctx.beginPath()
  ctx.roundRect(h.x * CELL + 1, h.y * CELL + 1, CELL - 2, CELL - 2, 5)
  ctx.fill()

  // Eyes
  ctx.fillStyle = theme.eye
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
  const [isNewRecord, setIsNewRecord] = useState(false)

  // Update high score
  useEffect(() => {
    if (state.score > 0 && state.score > highScore) {
      setHighScore(state.score)
      localStorage.setItem('snakeHighScore', state.score)
    }
  }, [state.score])

  // Track new record on game over
  useEffect(() => {
    if (state.status === 'dying' && state.score > 0) {
      setIsNewRecord(state.score >= highScore)
    } else if (state.status === 'running') {
      setIsNewRecord(false)
    }
  }, [state.status])

  // Game loop (speed increases with score)
  const speed = Math.max(MIN_SPEED, BASE_SPEED - Math.floor(state.score / 10) * 5)
  useEffect(() => {
    if (state.status !== 'running') return
    const id = setInterval(() => dispatch({ type: 'TICK' }), speed)
    return () => clearInterval(id)
  }, [state.status, speed])

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

  // Death animation
  useEffect(() => {
    if (state.status !== 'dying') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const wrap = canvas.parentElement
    wrap.classList.add('shaking')

    const startTime = performance.now()
    const duration = 800
    const { snake, food } = state
    const theme = getTheme(state.score)
    const [br, bg, bb] = theme.body

    const particles = snake.map(() => ({
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4 - 0.5,
      rot: (Math.random() - 0.5) * 8,
    }))

    let rafId
    const animate = (now) => {
      const t = Math.min((now - startTime) / duration, 1)
      const ease = 1 - (1 - t) * (1 - t)

      drawBgAndGrid(ctx, theme)

      if (t < 0.3) {
        ctx.fillStyle = `rgba(239, 68, 68, ${0.4 * (1 - t / 0.3)})`
        ctx.fillRect(0, 0, SIZE, SIZE)
      }

      ctx.fillStyle = theme.food
      ctx.beginPath()
      ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 3, 0, Math.PI * 2)
      ctx.fill()

      const fadeAlpha = 1 - ease
      particles.forEach((p, i) => {
        const seg = snake[i]
        const ox = p.vx * ease * CELL * 2.5
        const oy = p.vy * ease * CELL * 2.5
        const scale = 1 - ease * 0.5
        const halfSize = (CELL - 4) * scale / 2

        if (i === 0) {
          ctx.fillStyle = `rgba(239, 68, 68, ${fadeAlpha})`
        } else {
          const a = (1 - (i / snake.length) * 0.6) * fadeAlpha
          ctx.fillStyle = `rgba(${br}, ${bg}, ${bb}, ${a})`
        }

        ctx.save()
        ctx.translate(seg.x * CELL + CELL / 2 + ox, seg.y * CELL + CELL / 2 + oy)
        ctx.rotate(p.rot * ease)
        ctx.beginPath()
        ctx.roundRect(-halfSize, -halfSize, halfSize * 2, halfSize * 2, i === 0 ? 5 : 3)
        ctx.fill()
        ctx.restore()
      })

      if (t < 1) {
        rafId = requestAnimationFrame(animate)
      } else {
        wrap.classList.remove('shaking')
        dispatch({ type: 'DEAD' })
      }
    }

    rafId = requestAnimationFrame(animate)
    return () => {
      cancelAnimationFrame(rafId)
      wrap.classList.remove('shaking')
    }
  }, [state.status])

  // Draw
  useEffect(() => {
    if (state.status === 'dying') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    drawCanvas(ctx, state)
  }, [state])

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

        {state.status !== 'running' && state.status !== 'dying' && (
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

      <p className="hint">方向鍵 / WASD 控制方向 Space / Enter 開始/暫停</p>
    </div>
  )
}
