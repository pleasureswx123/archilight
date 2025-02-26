import { OrbitControls, Grid, Text } from '@react-three/drei'
import { Suspense, ReactNode, useEffect, useRef, useState } from 'react'
import { ErrorBoundary } from './ErrorBoundary'
import * as THREE from 'three'

interface Scene3DProps {
  children?: ReactNode
  isPenToolActive?: boolean
  isDraggingMullion?: boolean
  width?: number      // 毫米
  height?: number     // 毫米
  depth?: number      // 毫米
}

// 坐标轴组件
const AxisHelper = ({ width = 2000, height = 1500, depth = 100 }) => {
  const size = 2 // 坐标轴长度(米)
  const lineWidth = 2 // 线宽
  const tickSize = 0.05 // 刻度线长度(米)
  const tickInterval = 0.2 // 刻度间隔(米)
  const majorTickInterval = 0.5 // 主刻度间隔(米)

  // 计算窗户左下角的位置（米）
  const meterWidth = width / 1000
  const meterHeight = height / 1000
  const meterDepth = depth / 1000
  
  // 在统一坐标系中，窗户左下角为原点(0,0,0)
  const originX = 0
  const originY = 0
  const originZ = 0

  // 生成刻度线顶点
  const generateTicks = (axisLength: number, direction: 'x' | 'y' | 'z') => {
    const positions: number[] = []
    const numTicks = Math.floor(axisLength / tickInterval)
    
    for (let i = 0; i <= numTicks; i++) {
      const pos = i * tickInterval
      if (pos > axisLength) break

      // 根据轴方向生成刻度线顶点
      if (direction === 'x') {
        positions.push(pos, 0, 0, pos, -tickSize, 0) // 向下的刻度线
        positions.push(pos, 0, 0, pos, 0, -tickSize) // 向内的刻度线
      } else if (direction === 'y') {
        positions.push(0, pos, 0, -tickSize, pos, 0) // 向左的刻度线
        positions.push(0, pos, 0, 0, pos, -tickSize) // 向内的刻度线
      } else {
        positions.push(0, 0, pos, -tickSize, 0, pos) // 向左的刻度线
        positions.push(0, 0, pos, 0, -tickSize, pos) // 向下的刻度线
      }
    }
    return positions
  }

  // 生成刻度值标签
  const generateLabels = (axisLength: number, direction: 'x' | 'y' | 'z') => {
    const labels = []
    const numLabels = Math.floor(axisLength / majorTickInterval)
    
    for (let i = 0; i <= numLabels; i++) {
      const pos = i * majorTickInterval
      if (pos > axisLength) break

      // 将米转换为毫米并取整
      const value = Math.round(pos * 1000)
      const labelOffset = 0.05 // 标签偏移量

      let position: [number, number, number]
      if (direction === 'x') {
        position = [pos, -labelOffset * 2, -labelOffset]
      } else if (direction === 'y') {
        position = [-labelOffset * 2, pos, -labelOffset]
      } else {
        position = [-labelOffset * 2, -labelOffset, pos]
      }

      labels.push(
        <Text
          key={`${direction}-${i}`}
          position={position}
          fontSize={0.04}
          color="black"
          anchorX="right"
          anchorY="middle"
        >
          {`${value}`}
        </Text>
      )
    }
    return labels
  }

  return (
    <group position={[originX, originY, originZ]}>
      {/* X轴 - 红色 */}
      <line>
        <bufferGeometry>
          <float32BufferAttribute
            attach="attributes-position"
            args={[new Float32Array([0, 0, 0, size, 0, 0]), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color="red" linewidth={lineWidth} />
      </line>
      
      {/* X轴刻度线 */}
      <line>
        <bufferGeometry>
          <float32BufferAttribute
            attach="attributes-position"
            args={[new Float32Array(generateTicks(size, 'x')), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color="red" linewidth={1} />
      </line>
      
      {/* Y轴 - 绿色 */}
      <line>
        <bufferGeometry>
          <float32BufferAttribute
            attach="attributes-position"
            args={[new Float32Array([0, 0, 0, 0, size, 0]), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color="green" linewidth={lineWidth} />
      </line>
      
      {/* Y轴刻度线 */}
      <line>
        <bufferGeometry>
          <float32BufferAttribute
            attach="attributes-position"
            args={[new Float32Array(generateTicks(size, 'y')), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color="green" linewidth={1} />
      </line>
      
      {/* Z轴 - 蓝色 */}
      <line>
        <bufferGeometry>
          <float32BufferAttribute
            attach="attributes-position"
            args={[new Float32Array([0, 0, 0, 0, 0, size]), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color="blue" linewidth={lineWidth} />
      </line>
      
      {/* Z轴刻度线 */}
      <line>
        <bufferGeometry>
          <float32BufferAttribute
            attach="attributes-position"
            args={[new Float32Array(generateTicks(size, 'z')), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color="blue" linewidth={1} />
      </line>

      {/* 轴标签 */}
      <Text position={[size + 0.1, 0, 0]} fontSize={0.1} color="red">
        X(mm)
      </Text>
      <Text position={[0, size + 0.1, 0]} fontSize={0.1} color="green">
        Y(mm)
      </Text>
      <Text position={[0, 0, size + 0.1]} fontSize={0.1} color="blue">
        Z(mm)
      </Text>

      {/* 刻度值标签 */}
      {generateLabels(size, 'x')}
      {generateLabels(size, 'y')}
      {generateLabels(size, 'z')}
    </group>
  )
}

export const Scene3D = ({ children, isPenToolActive, isDraggingMullion = false, width = 2000, height = 1500, depth = 100 }: Scene3DProps) => {
  const controlsRef = useRef<any>(null)
  const [isSpacePressed, setIsSpacePressed] = useState(false)

  // 将毫米转换为米
  const meterHeight = height / 1000

  // 处理键盘事件
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault() // 阻止默认行为
        setIsSpacePressed(true)
        if (controlsRef.current) {
          controlsRef.current.enablePan = true
          controlsRef.current.enableRotate = false
          // 设置鼠标按键为左键
          controlsRef.current.mouseButtons = {
            LEFT: THREE.MOUSE.PAN,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.ROTATE
          }
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        setIsSpacePressed(false)
        if (controlsRef.current && !isPenToolActive && !isDraggingMullion) {
          controlsRef.current.enablePan = false
          controlsRef.current.enableRotate = true
          // 恢复默认鼠标按键设置
          controlsRef.current.mouseButtons = {
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [isPenToolActive, isDraggingMullion])

  // 切换到 Y 视图并设置控制器状态
  useEffect(() => {
    if (!controlsRef.current) return

    const controls = controlsRef.current
    
    if (isPenToolActive) {
      // 钢笔工具模式
      controls.reset()
      controls.setAzimuthalAngle(0)
      controls.setPolarAngle(Math.PI / 2)
      controls.enableRotate = false
      controls.enablePan = true
      controls.enableZoom = true  // 允许缩放
      controls.minDistance = 1    // 设置最小缩放距离（1米）
      controls.maxDistance = 10   // 设置最大缩放距离（10米）
      // 设置鼠标按键为左键平移
      controls.mouseButtons = {
        LEFT: THREE.MOUSE.PAN,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.ROTATE
      }
      
      console.log('%c【视角控制】切换到钢笔工具模式', 'background-color: #e0f7fa; color: #006064; font-weight: bold', {
        视角: '俯视图',
        旋转: '禁用',
        平移: '启用（左键）',
        缩放: '启用（滚轮）',
        距离范围: '1-10米'
      });
    } else if (isDraggingMullion) {
      // 拖动中挺时禁用旋转
      controls.enableRotate = false
      controls.enablePan = true
      controls.enableZoom = true
      controls.minDistance = 2
      controls.maxDistance = 20
      // 设置鼠标按键，拖动中挺时禁用左键旋转
      controls.mouseButtons = {
        LEFT: THREE.MOUSE.PAN,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN
      }
      
      console.log('%c【视角控制】切换到中挺拖动模式', 'background-color: #fff3e0; color: #e65100; font-weight: bold', {
        旋转: '禁用',
        平移: '启用（左键和右键）',
        缩放: '启用（滚轮）',
        距离范围: '2-20米'
      });
    } else {
      // 正常模式
      controls.enableRotate = !isSpacePressed
      controls.enablePan = isSpacePressed
      controls.enableZoom = true
      controls.minDistance = 2
      controls.maxDistance = 20
      // 根据空格键状态设置鼠标按键
      controls.mouseButtons = isSpacePressed ? {
        LEFT: THREE.MOUSE.PAN,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.ROTATE
      } : {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN
      }
      
      console.log('%c【视角控制】切换到正常模式', 'background-color: #f1f8e9; color: #33691e; font-weight: bold', {
        空格键状态: isSpacePressed ? '按下' : '释放',
        旋转: isSpacePressed ? '禁用' : '启用（左键）',
        平移: isSpacePressed ? '启用（左键）' : '启用（右键）',
        缩放: '启用（滚轮）',
        距离范围: '2-20米'
      });
    }
    
    controls.update()
  }, [isPenToolActive, isSpacePressed, isDraggingMullion])

  // 添加一个监听器来记录视角变化
  useEffect(() => {
    if (!controlsRef.current) return
    
    const controls = controlsRef.current
    
    // 为简化输出，使用节流记录视角变化
    const throttledLog = throttle(() => {
      // 计算当前摄像机角度
      const azimuthalAngle = controls.getAzimuthalAngle() * (180 / Math.PI)
      const polarAngle = controls.getPolarAngle() * (180 / Math.PI)
      
      // console.log('%c【视角变化】', 'color: #78909c', {
      //   水平角度: azimuthalAngle.toFixed(1) + '°',
      //   垂直角度: polarAngle.toFixed(1) + '°',
      //   距离: controls.getDistance().toFixed(2) * 1000 + 'mm'
      // });
    }, 500) // 每500毫秒最多记录一次
    
    // 添加控制器变化事件监听
    controls.addEventListener('change', throttledLog)
    
    return () => {
      controls.removeEventListener('change', throttledLog)
    }
  }, [])

  // 添加节流函数
  function throttle<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let lastTime = 0;
    return function(...args: Parameters<T>) {
      const now = Date.now();
      if (now - lastTime >= wait) {
        func(...args);
        lastTime = now;
      }
    };
  }

  return (
    <>
      <color attach="background" args={[isPenToolActive ? '#ffffff' : '#f0f0f0']} />
      
      {/* 光照设置 */}
      {!isPenToolActive && (
        <>
          <ambientLight intensity={0.8} />
          <directionalLight 
            position={[5, 5, 5]} 
            intensity={1} 
            castShadow
            shadow-mapSize={[2048, 2048]}
          />
          <hemisphereLight intensity={0.5} />
        </>
      )}
      
      {/* 网格辅助线 */}
      {!isPenToolActive && (
        <Grid
          args={[20, 20]}
          cellSize={0.5}
          cellThickness={0.5}
          cellColor="#6f6f6f"
          sectionSize={5}
        />
      )}

      {/* 坐标轴 */}
      {!isPenToolActive && <AxisHelper width={width} height={height} depth={depth} />}
      
      {children}
      
      {/* 场景控制器 */}
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        rotateSpeed={0.5}
        minDistance={2}
        maxDistance={20}
        enabled={true}  // 始终保持控制器启用
        screenSpacePanning={true}
        panSpeed={1.5}
      />
    </>
  )
} 