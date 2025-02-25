import { useRef, useState } from 'react'
import { MullionConfig } from '../types/window'
import { useThree, ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'

interface WindowMullionsProps {
  width: number      // 毫米
  height: number     // 毫米
  depth: number      // 毫米
  config: MullionConfig
  onMullionDrag?: (type: 'horizontal' | 'vertical', index: number, position: number) => void
  isPenToolActive?: boolean
}

// 锚点位置枚举
const AnchorPosition = {
  TopLeft: 'top-left',
  Top: 'top',
  TopRight: 'top-right',
  Right: 'right',
  BottomRight: 'bottom-right',
  Bottom: 'bottom',
  BottomLeft: 'bottom-left',
  Left: 'left'
} as const

type AnchorPositionType = typeof AnchorPosition[keyof typeof AnchorPosition]

export const WindowMullions = ({ 
  width, 
  height, 
  depth, 
  config,
  onMullionDrag,
  isPenToolActive = false
}: WindowMullionsProps) => {
  const [dragging, setDragging] = useState<{
    type: 'horizontal' | 'vertical'
    index: number
    startPosition: THREE.Vector3
    startValue: number
  } | null>(null)
  
  const [selectedMullion, setSelectedMullion] = useState<{
    type: 'horizontal' | 'vertical'
    index: number
  } | null>(null)
  
  // 转换为米
  const meterWidth = width / 1000
  const meterHeight = height / 1000
  const meterDepth = depth / 1000
  const mullionWidth = config.mullionWidth / 1000

  const { camera } = useThree()
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
  const intersection = new THREE.Vector3()

  const handlePointerDown = (
    type: 'horizontal' | 'vertical',
    index: number,
    e: ThreeEvent<PointerEvent>
  ) => {
    // 如果钢笔工具激活，不处理拖动事件
    if (isPenToolActive) return
    
    e.stopPropagation()
    
    // 计算起始点的世界坐标
    const mouse = new THREE.Vector2(
      (e.clientX / window.innerWidth) * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1
    )
    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(mouse, camera)
    const startPosition = new THREE.Vector3()
    raycaster.ray.intersectPlane(plane, startPosition)

    // 记录起始值
    const startValue = type === 'horizontal' 
      ? config.horizontalMullions[index]
      : config.verticalMullions[index]

    setDragging({ type, index, startPosition, startValue })
    if (!isPenToolActive) {
      setSelectedMullion({ type, index })
    }
    // @ts-ignore
    e.target.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    // 如果钢笔工具激活，不处理拖动事件
    if (isPenToolActive) return
    
    if (!dragging || !onMullionDrag) return

    e.stopPropagation()
    const { type, index, startPosition, startValue } = dragging

    // 计算当前点的世界坐标
    const mouse = new THREE.Vector2(
      (e.clientX / window.innerWidth) * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1
    )
    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(mouse, camera)
    raycaster.ray.intersectPlane(plane, intersection)

    // 计算移动距离
    const delta = type === 'horizontal'
      ? intersection.y - startPosition.y
      : intersection.x - startPosition.x

    // 计算新位置
    let newPosition = type === 'horizontal'
      ? startValue + delta / meterHeight
      : startValue + delta / meterWidth

    // 限制在边框和相邻中挺之间
    const positions = type === 'horizontal'
      ? [0, ...config.horizontalMullions, 1].sort((a, b) => a - b)
      : [0, ...config.verticalMullions, 1].sort((a, b) => a - b)
    
    const minPos = positions[index] + (type === 'horizontal' ? mullionWidth/meterHeight : mullionWidth/meterWidth)
    const maxPos = positions[index + 2] - (type === 'horizontal' ? mullionWidth/meterHeight : mullionWidth/meterWidth)
    newPosition = Math.max(0, Math.min(1, newPosition))
    newPosition = Math.max(minPos, Math.min(maxPos, newPosition))

    onMullionDrag(type, index, newPosition)
  }

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    // 如果钢笔工具激活，不处理拖动事件
    if (isPenToolActive) return
    
    if (!dragging) return
    e.stopPropagation()
    setDragging(null)
    // @ts-ignore
    e.target.releasePointerCapture(e.pointerId)
  }

  // 处理背景点击，取消选中
  const handleBackgroundClick = (e: ThreeEvent<MouseEvent>) => {
    // 如果是钢笔工具活动状态，不处理选中状态
    if (isPenToolActive) return

    // 如果点击的是中挺或锚点，不处理
    const target = e.target as unknown as THREE.Object3D
    if (target && target.parent && (
      target.parent.name === 'mullion' || 
      target.parent.name === 'anchor'
    )) {
      return
    }

    // 取消选中状态
    setSelectedMullion(null)
  }

  // 渲染锚点
  const renderAnchors = (
    type: 'horizontal' | 'vertical',
    index: number,
    position: [number, number, number],
    size: [number, number, number]
  ) => {
    if (!selectedMullion || selectedMullion.type !== type || selectedMullion.index !== index || isPenToolActive) {
      return null
    }

    const anchorSize = 0.015 // 锚点大小（1.5厘米）
    const [width, height, depth] = size
    const [x, y, z] = position

    // 根据中挺类型计算锚点位置
    const anchorPositions: Record<AnchorPositionType, [number, number, number]> = type === 'horizontal' ? {
      // 横向中挺的锚点位置
      [AnchorPosition.TopLeft]: [-width/2, 0, -depth/2],
      [AnchorPosition.Top]: [0, 0, -depth/2],
      [AnchorPosition.TopRight]: [width/2, 0, -depth/2],
      [AnchorPosition.Right]: [width/2, 0, 0],
      [AnchorPosition.BottomRight]: [width/2, 0, depth/2],
      [AnchorPosition.Bottom]: [0, 0, depth/2],
      [AnchorPosition.BottomLeft]: [-width/2, 0, depth/2],
      [AnchorPosition.Left]: [-width/2, 0, 0]
    } : {
      // 竖向中挺的锚点位置
      [AnchorPosition.TopLeft]: [-depth/2, height/2, 0],
      [AnchorPosition.Top]: [0, height/2, 0],
      [AnchorPosition.TopRight]: [depth/2, height/2, 0],
      [AnchorPosition.Right]: [depth/2, 0, 0],
      [AnchorPosition.BottomRight]: [depth/2, -height/2, 0],
      [AnchorPosition.Bottom]: [0, -height/2, 0],
      [AnchorPosition.BottomLeft]: [-depth/2, -height/2, 0],
      [AnchorPosition.Left]: [-depth/2, 0, 0]
    }

    return (
      <group>
        {Object.entries(anchorPositions).map(([position, [ax, ay, az]]) => (
          <mesh
            key={position}
            position={[ax, ay, az]}
          >
            <boxGeometry args={[anchorSize, anchorSize, anchorSize]} />
            <meshBasicMaterial color="#1890ff" />
          </mesh>
        ))}
      </group>
    )
  }

  // 标准材质
  const standardMaterial = {
    color: '#666666',
    roughness: 0.5,
    metalness: 0.5
  }

  // 选中状态材质
  const selectedMaterial = {
    ...standardMaterial,
    color: '#1890ff'
  }

  return (
    <group onClick={handleBackgroundClick}>
      {/* 横中挺 */}
      {config.horizontalMullions.map((position, index) => {
        const segment = config.horizontalSegments?.find(s => s.position === position)
        const startX = segment ? -meterWidth/2 + segment.start * meterWidth : -meterWidth/2
        const endX = segment ? -meterWidth/2 + segment.end * meterWidth : meterWidth/2
        const segmentWidth = endX - startX
        const isSelected = selectedMullion?.type === 'horizontal' && selectedMullion.index === index

        const position3D: [number, number, number] = [
          startX + segmentWidth/2,
          -meterHeight/2 + position * meterHeight,
          0
        ]

        const size: [number, number, number] = [
          segmentWidth,
          mullionWidth,
          meterDepth
        ]

        return (
          <group
            key={`h-mullion-${index}`}
            position={position3D}
          >
            <mesh
              name="mullion"
              onPointerDown={(e) => handlePointerDown('horizontal', index, e)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              visible={!isPenToolActive}
            >
              <boxGeometry args={size} />
              <meshStandardMaterial {...(isSelected ? selectedMaterial : standardMaterial)} />
            </mesh>
            {isPenToolActive && (
              <line>
                <bufferGeometry>
                  <float32BufferAttribute
                    attach="attributes-position"
                    args={[new Float32Array([
                      -segmentWidth/2, 0, 0,
                      segmentWidth/2, 0, 0
                    ]), 3]}
                  />
                </bufferGeometry>
                <lineBasicMaterial color="black" linewidth={2} />
              </line>
            )}
            {renderAnchors('horizontal', index, position3D, size)}
          </group>
        )
      })}

      {/* 竖中挺 */}
      {config.verticalMullions.map((position, index) => {
        const segment = config.verticalSegments?.find(s => s.position === position)
        const startY = segment ? -meterHeight/2 + segment.start * meterHeight : -meterHeight/2
        const endY = segment ? -meterHeight/2 + segment.end * meterHeight : meterHeight/2
        const segmentHeight = endY - startY
        const isSelected = selectedMullion?.type === 'vertical' && selectedMullion.index === index

        const position3D: [number, number, number] = [
          -meterWidth/2 + position * meterWidth,
          startY + segmentHeight/2,
          0
        ]

        const size: [number, number, number] = [
          mullionWidth,
          segmentHeight,
          meterDepth
        ]

        return (
          <group
            key={`v-mullion-${index}`}
            position={position3D}
          >
            <mesh
              name="mullion"
              onPointerDown={(e) => handlePointerDown('vertical', index, e)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              visible={!isPenToolActive}
            >
              <boxGeometry args={size} />
              <meshStandardMaterial {...(isSelected ? selectedMaterial : standardMaterial)} />
            </mesh>
            {isPenToolActive && (
              <line>
                <bufferGeometry>
                  <float32BufferAttribute
                    attach="attributes-position"
                    args={[new Float32Array([
                      0, -segmentHeight/2, 0,
                      0, segmentHeight/2, 0
                    ]), 3]}
                  />
                </bufferGeometry>
                <lineBasicMaterial color="black" linewidth={2} />
              </line>
            )}
            {renderAnchors('vertical', index, position3D, size)}
          </group>
        )
      })}
    </group>
  )
} 