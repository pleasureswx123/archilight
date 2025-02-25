import { useRef } from 'react'
import { Mesh, EdgesGeometry, LineSegments, BufferGeometry, BoxGeometry } from 'three'

interface WindowProps {
  position?: [number, number, number]
  width?: number
  height?: number
  depth?: number
  isPenToolActive?: boolean
}

export const WindowModel = ({
  position = [0, 0, 0],
  width = 2000,  // 默认2000毫米
  height = 1500, // 默认1500毫米
  depth = 100,   // 默认100毫米
  isPenToolActive = false
}: WindowProps) => {
  const meshRef = useRef<Mesh>(null)

  // 将毫米转换为Three.js单位（1单位 = 1米）
  const meterWidth = width / 1000
  const meterHeight = height / 1000
  const meterDepth = depth / 1000
  
  // 窗框宽度（50毫米 = 0.05米）
  const frameWidth = 0.05

  // 框架线条配置
  const frameLineConfig = {
    count: 5,           // 平行线数量
    spacing: 0.01,      // 线条间距（米）
    color: 'black'      // 线条颜色
  }

  // 标准材质
  const standardMaterial = {
    color: '#666666',
    roughness: 0.5,
    metalness: 0.5
  }

  // 渲染框架线条
  const renderFrameLines = (
    isHorizontal: boolean,
    length: number,
    offset: number = 0
  ) => {
    const lines = []
    const totalSpan = (frameLineConfig.count - 1) * frameLineConfig.spacing
    
    for (let i = 0; i < frameLineConfig.count; i++) {
      const lineOffset = offset + (i - (frameLineConfig.count - 1) / 2) * frameLineConfig.spacing
      
      const points = isHorizontal
        ? [
            [-length/2, lineOffset, 0],
            [length/2, lineOffset, 0]
          ]
        : [
            [lineOffset, -length/2, 0],
            [lineOffset, length/2, 0]
          ]

      lines.push(
        <line key={i}>
          <bufferGeometry>
            <float32BufferAttribute
              attach="attributes-position"
              args={[new Float32Array(points.flat()), 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial color={frameLineConfig.color} />
        </line>
      )
    }

    return <>{lines}</>
  }
  
  return (
    <group position={position}>
      {/* 上框 */}
      <group position={[0, meterHeight/2 - frameWidth/2, 0]}>
        <mesh castShadow receiveShadow visible={!isPenToolActive}>
          <boxGeometry args={[meterWidth, frameWidth, meterDepth]} />
          <meshStandardMaterial {...standardMaterial} />
        </mesh>
        {isPenToolActive && renderFrameLines(true, meterWidth)}
      </group>
      
      {/* 下框 */}
      <group position={[0, -meterHeight/2 + frameWidth/2, 0]}>
        <mesh castShadow receiveShadow visible={!isPenToolActive}>
          <boxGeometry args={[meterWidth, frameWidth, meterDepth]} />
          <meshStandardMaterial {...standardMaterial} />
        </mesh>
        {isPenToolActive && renderFrameLines(true, meterWidth)}
      </group>
      
      {/* 左框 */}
      <group position={[-meterWidth/2 + frameWidth/2, 0, 0]}>
        <mesh castShadow receiveShadow visible={!isPenToolActive}>
          <boxGeometry args={[frameWidth, meterHeight, meterDepth]} />
          <meshStandardMaterial {...standardMaterial} />
        </mesh>
        {isPenToolActive && renderFrameLines(false, meterHeight)}
      </group>
      
      {/* 右框 */}
      <group position={[meterWidth/2 - frameWidth/2, 0, 0]}>
        <mesh castShadow receiveShadow visible={!isPenToolActive}>
          <boxGeometry args={[frameWidth, meterHeight, meterDepth]} />
          <meshStandardMaterial {...standardMaterial} />
        </mesh>
        {isPenToolActive && renderFrameLines(false, meterHeight)}
      </group>
    </group>
  )
} 