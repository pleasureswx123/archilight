import { useState, useRef } from 'react'
import { useThree, ThreeEvent } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { MullionConfig } from '../types/window'

interface SnapResult {
  point: THREE.Vector3
  snapType: 'horizontal' | 'vertical' | 'none'
  line?: { 
    start: THREE.Vector3
    end: THREE.Vector3 
  }
  snapLine?: {
    start: THREE.Vector3
    end: THREE.Vector3
  }
}

interface PenToolProps {
  width: number      // 毫米
  height: number     // 毫米
  depth: number      // 毫米
  config: MullionConfig
  onAddMullion: (start: THREE.Vector3, end: THREE.Vector3) => void
}

export const PenTool = ({ 
  width, 
  height, 
  depth, 
  config,
  onAddMullion 
}: PenToolProps) => {
  // 转换为米
  const meterWidth = width / 1000
  const meterHeight = height / 1000
  const meterDepth = depth / 1000

  // 状态管理
  const [startPoint, setStartPoint] = useState<THREE.Vector3 | null>(null)
  const [previewPoint, setPreviewPoint] = useState<THREE.Vector3 | null>(null)
  const [snapResult, setSnapResult] = useState<SnapResult | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  // Three.js 相关
  const { camera } = useThree()

  // 坐标转换辅助函数
  const transformToLocalSpace = (worldPoint: THREE.Vector3): THREE.Vector3 => {
    const windowCenter = new THREE.Vector3(0, meterHeight/2, 0)
    const localPoint = worldPoint.clone().sub(windowCenter)
    
    // 确保 z 坐标为 0
    localPoint.z = 0
    
    console.log('Coordinate transformation:', {
      world: {
        x: (worldPoint.x * 1000).toFixed(1),
        y: (worldPoint.y * 1000).toFixed(1),
        z: (worldPoint.z * 1000).toFixed(1)
      },
      local: {
        x: (localPoint.x * 1000).toFixed(1),
        y: (localPoint.y * 1000).toFixed(1),
        z: (localPoint.z * 1000).toFixed(1)
      }
    })
    
    return localPoint
  }

  // 检查点是否在窗框范围内
  const isPointInBounds = (point: THREE.Vector3): boolean => {
    const halfWidth = meterWidth / 2
    const halfHeight = meterHeight / 2
    return (
      point.x >= -halfWidth &&
      point.x <= halfWidth &&
      point.y >= -halfHeight &&
      point.y <= halfHeight
    )
  }

  // 判断点是否在线段上
  const isPointOnLine = (point: THREE.Vector3, line: { start: THREE.Vector3, end: THREE.Vector3 }): boolean => {
    const { start, end } = line
    // 对于水平线
    if (Math.abs(start.y - end.y) < 0.001) {
      return Math.abs(point.y - start.y) < 0.001 &&
             point.x >= Math.min(start.x, end.x) &&
             point.x <= Math.max(start.x, end.x)
    }
    // 对于垂直线
    if (Math.abs(start.x - end.x) < 0.001) {
      return Math.abs(point.x - start.x) < 0.001 &&
             point.y >= Math.min(start.y, end.y) &&
             point.y <= Math.max(start.y, end.y)
    }
    return false
  }

  // 判断两个线段是否相同
  const isSameLine = (line1: { start: THREE.Vector3, end: THREE.Vector3 }, 
                     line2: { start: THREE.Vector3, end: THREE.Vector3 }): boolean => {
    // 对于水平线
    if (Math.abs(line1.start.y - line1.end.y) < 0.001 &&
        Math.abs(line2.start.y - line2.end.y) < 0.001) {
      return Math.abs(line1.start.y - line2.start.y) < 0.001
    }
    // 对于垂直线
    if (Math.abs(line1.start.x - line1.end.x) < 0.001 &&
        Math.abs(line2.start.x - line2.end.x) < 0.001) {
      return Math.abs(line1.start.x - line2.start.x) < 0.001
    }
    return false
  }

  // 处理鼠标移动
  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    // 1. 正确计算 NDC 坐标
    const mouse = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    )

    console.log('Mouse coordinates:', {
      screen: { x: event.clientX, y: event.clientY },
      window: { width: window.innerWidth, height: window.innerHeight },
      ndc: { x: mouse.x.toFixed(3), y: mouse.y.toFixed(3) }
    })

    // 2. 创建射线
    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(mouse, camera)

    // 3. 创建一个与窗户平面平行的平面
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
    const intersection = new THREE.Vector3()
    const intersectionDistance = raycaster.ray.intersectPlane(plane, intersection)

    if (intersection) {
      // 4. 转换到局部坐标系
      const localPoint = transformToLocalSpace(intersection)

      console.log('Ray intersection:', {
        raw: {
          x: (intersection.x * 1000).toFixed(1),
          y: (intersection.y * 1000).toFixed(1),
          z: (intersection.z * 1000).toFixed(1)
        },
        transformed: {
          x: (localPoint.x * 1000).toFixed(1),
          y: (localPoint.y * 1000).toFixed(1),
          z: (localPoint.z * 1000).toFixed(1)
        },
        camera: {
          position: camera.position.toArray().map(v => Number(v).toFixed(2)),
          rotation: camera.rotation.toArray().map(v => Number(v).toFixed(2))
        }
      })

      // 5. 添加边界检查
      if (isPointInBounds(localPoint)) {
        const result = snapToNearestLine(localPoint)
        setPreviewPoint(result.point)
        setSnapResult(result)
        
        console.log('Snap result:', {
          local: {
            x: (localPoint.x * 1000).toFixed(1),
            y: (localPoint.y * 1000).toFixed(1)
          },
          snap: {
            x: (result.point.x * 1000).toFixed(1),
            y: (result.point.y * 1000).toFixed(1)
          },
          type: result.snapType
        })
      }
    }
  }

  // 获取最近的中挺或边框线
  const snapToNearestLine = (point: THREE.Vector3): SnapResult => {
    const snapThreshold = 0.08 // 8厘米的吸附范围
    const originalPoint = point.clone()

    // 添加调试信息
    console.log('Snap calculation:', {
      input: {
        x: (originalPoint.x * 1000).toFixed(1),
        y: (originalPoint.y * 1000).toFixed(1)
      },
      bounds: {
        width: meterWidth,
        height: meterHeight
      },
      threshold: snapThreshold * 1000
    })

    // 收集所有可能的吸附点
    const snapPoints: Array<{
      point: THREE.Vector3,
      distance: number,
      type: 'horizontal' | 'vertical',
      line: { start: THREE.Vector3, end: THREE.Vector3 }
    }> = []

    // 检查水平线（包括外框和中挺）
    const horizontalPositions = [
      -meterHeight/2, // 下边框
      meterHeight/2,  // 上边框
      ...config.horizontalMullions.map(pos => -meterHeight/2 + pos * meterHeight)
    ]

    // 检查垂直线（包括外框和中挺）
    const verticalPositions = [
      -meterWidth/2,  // 左边框
      meterWidth/2,   // 右边框
      ...config.verticalMullions.map(pos => -meterWidth/2 + pos * meterWidth)
    ]

    // 计算到水平线的距离
    for (const y of horizontalPositions) {
      const dist = Math.abs(point.y - y)
      if (dist < snapThreshold) {
        const line = {
          start: new THREE.Vector3(-meterWidth/2, y, 0),
          end: new THREE.Vector3(meterWidth/2, y, 0)
        }

        // 如果有起点，检查是否在同一线段上
        if (startPoint && snapResult?.line && isSameLine(line, snapResult.line)) {
          continue // 跳过同一线段
        }

        // 在水平线上创建吸附点，x 坐标使用原始点的 x 坐标
        const snapPoint = new THREE.Vector3(
          Math.max(-meterWidth/2, Math.min(meterWidth/2, originalPoint.x)),
          y,
          0
        )
        snapPoints.push({
          point: snapPoint,
          distance: dist,
          type: 'horizontal',
          line
        })
      }
    }

    // 计算到垂直线的距离
    for (const x of verticalPositions) {
      const dist = Math.abs(point.x - x)
      if (dist < snapThreshold) {
        const line = {
          start: new THREE.Vector3(x, -meterHeight/2, 0),
          end: new THREE.Vector3(x, meterHeight/2, 0)
        }

        // 如果有起点，检查是否在同一线段上
        if (startPoint && snapResult?.line && isSameLine(line, snapResult.line)) {
          continue // 跳过同一线段
        }

        // 在垂直线上创建吸附点，y 坐标使用原始点的 y 坐标
        const snapPoint = new THREE.Vector3(
          x,
          Math.max(-meterHeight/2, Math.min(meterHeight/2, originalPoint.y)),
          0
        )
        snapPoints.push({
          point: snapPoint,
          distance: dist,
          type: 'vertical',
          line
        })
      }
    }

    // 如果有起点，需要考虑与起点的对齐
    if (startPoint && snapResult?.line) {
      const dx = Math.abs(point.x - startPoint.x)
      const dy = Math.abs(point.y - startPoint.y)
      
      // 如果与起点的距离小于阈值，优先考虑对齐
      if (dx < snapThreshold || dy < snapThreshold) {
        // 确定对齐方向
        const isVerticalAlignment = dx < dy

        // 找到最近的垂直或水平线
        const positions = isVerticalAlignment ? verticalPositions : horizontalPositions
        let nearestLinePos = null
        let minDist = Infinity

        positions.forEach(pos => {
          const currentLine = {
            start: new THREE.Vector3(
              isVerticalAlignment ? pos : -meterWidth/2,
              isVerticalAlignment ? -meterHeight/2 : pos,
              0
            ),
            end: new THREE.Vector3(
              isVerticalAlignment ? pos : meterWidth/2,
              isVerticalAlignment ? meterHeight/2 : pos,
              0
            )
          }

          // 跳过与起点相同的线段
          if (snapResult.line && isSameLine(currentLine, snapResult.line)) {
            return
          }

          const dist = isVerticalAlignment 
            ? Math.abs(point.x - pos)
            : Math.abs(point.y - pos)
          if (dist < minDist) {
            minDist = dist
            nearestLinePos = pos
          }
        })

        // 只有找到有效的线段时才返回对齐点
        if (nearestLinePos !== null) {
          const alignedPoint = new THREE.Vector3(
            isVerticalAlignment ? nearestLinePos : startPoint.x,
            isVerticalAlignment ? startPoint.y : nearestLinePos,
            0
          )

          return {
            point: alignedPoint,
            snapType: isVerticalAlignment ? 'vertical' : 'horizontal',
            line: {
              start: new THREE.Vector3(
                isVerticalAlignment ? nearestLinePos : -meterWidth/2,
                isVerticalAlignment ? -meterHeight/2 : nearestLinePos,
                0
              ),
              end: new THREE.Vector3(
                isVerticalAlignment ? nearestLinePos : meterWidth/2,
                isVerticalAlignment ? meterHeight/2 : nearestLinePos,
                0
              )
            }
          }
        }
      }
    }

    // 如果有吸附点，选择最近的
    if (snapPoints.length > 0) {
      const nearestSnap = snapPoints.reduce((nearest, current) => 
        current.distance < nearest.distance ? current : nearest
      )
      return {
        point: nearestSnap.point,
        snapType: nearestSnap.type,
        snapLine: nearestSnap.line
      }
    }

    // 如果没有找到吸附点，返回 null
    return {
      point: originalPoint,
      snapType: 'none'
    }
  }

  // 处理点击
  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    
    // 只有当有预览点且在有效的吸附状态时才允许点击
    if (!previewPoint || !snapResult || snapResult.snapType === 'none') return

    if (!startPoint) {
      // 设置起点（必须在有效的吸附线上）
      setStartPoint(previewPoint.clone())
      setIsDrawing(true)
    } else {
      // 完成绘制（终点也必须在有效的吸附线上）
      onAddMullion(startPoint, previewPoint)
      setStartPoint(null)
      setPreviewPoint(null)
      setSnapResult(null)
      setIsDrawing(false)
    }
  }

  // 渲染坐标轴
  const renderCoordinateAxes = () => {
    const axisLength = 0.5 // 坐标轴长度（米）
    const axisWidth = 2 // 线宽

    return (
      <group position={[-meterWidth/2, -meterHeight/2, 0]}>
        {/* X轴 - 红色 */}
        <line>
          <bufferGeometry>
            <float32BufferAttribute
              attach="attributes-position"
              args={[new Float32Array([0, 0, 0, axisLength, 0, 0]), 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial color="red" linewidth={axisWidth} />
        </line>
        <Text
          position={[axisLength + 0.05, 0, 0]}
          fontSize={0.05}
          color="red"
        >
          X
        </Text>

        {/* Y轴 - 绿色 */}
        <line>
          <bufferGeometry>
            <float32BufferAttribute
              attach="attributes-position"
              args={[new Float32Array([0, 0, 0, 0, axisLength, 0]), 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial color="green" linewidth={axisWidth} />
        </line>
        <Text
          position={[0, axisLength + 0.05, 0]}
          fontSize={0.05}
          color="green"
        >
          Y
        </Text>

        {/* Z轴 - 蓝色 */}
        <line>
          <bufferGeometry>
            <float32BufferAttribute
              attach="attributes-position"
              args={[new Float32Array([0, 0, 0, 0, 0, axisLength]), 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial color="blue" linewidth={axisWidth} />
        </line>
        <Text
          position={[0, 0, axisLength + 0.05]}
          fontSize={0.05}
          color="blue"
        >
          Z
        </Text>

        {/* 当前坐标值显示 */}
        {previewPoint && (
          <group position={[0, -0.1, 0]}>
            <Text
              fontSize={0.04}
              color="black"
              anchorX="left"
              anchorY="top"
            >
              {`X: ${(previewPoint.x * 1000).toFixed(1)}mm\nY: ${(previewPoint.y * 1000).toFixed(1)}mm\nZ: ${(previewPoint.z * 1000).toFixed(1)}mm`}
            </Text>
          </group>
        )}
      </group>
    )
  }

  return (
    <group>
      {/* 透明平面用于射线检测 */}
      <mesh
        onPointerMove={handlePointerMove}
        onClick={handleClick}
        visible={false}
      >
        <planeGeometry args={[meterWidth * 1.5, meterHeight * 1.5]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* 起点标记 */}
      {startPoint && (
        <mesh position={startPoint}>
          <sphereGeometry args={[0.02]} />
          <meshBasicMaterial color="#1890ff" />
        </mesh>
      )}

      {/* 预览点标记 */}
      {previewPoint && (
        <mesh position={previewPoint}>
          <sphereGeometry args={[0.02]} />
          <meshBasicMaterial color={isDrawing ? "#52c41a" : "#1890ff"} />
        </mesh>
      )}

      {/* 预览线 */}
      {startPoint && previewPoint && (
        <line>
          <bufferGeometry
            attach="geometry"
            attributes={{
              position: new THREE.BufferAttribute(
                new Float32Array([
                  startPoint.x, startPoint.y, startPoint.z,
                  previewPoint.x, previewPoint.y, previewPoint.z
                ]), 3
              )
            }}
          />
          <lineBasicMaterial attach="material" color="#1890ff" linewidth={2} />
        </line>
      )}

      {/* 吸附辅助线 */}
      {snapResult?.snapLine && (
        <line>
          <bufferGeometry
            attach="geometry"
            attributes={{
              position: new THREE.BufferAttribute(
                new Float32Array([
                  snapResult.snapLine.start.x, snapResult.snapLine.start.y, snapResult.snapLine.start.z,
                  snapResult.snapLine.end.x, snapResult.snapLine.end.y, snapResult.snapLine.end.z
                ]), 3
              )
            }}
          />
          <lineDashedMaterial 
            attach="material" 
            color="#ff4d4f" 
            opacity={0.5} 
            transparent 
            linewidth={1}
            scale={0.1}  // 控制虚线的整体缩放
            dashSize={0.1}  // 虚线段的长度
            gapSize={0.05}  // 虚线段之间的间隔
          />
        </line>
      )}

      {/* 添加坐标轴显示 */}
      {renderCoordinateAxes()}
    </group>
  )
} 