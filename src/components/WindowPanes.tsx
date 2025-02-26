import { useState, useRef, useEffect } from 'react'
import { MullionConfig, WindowPane, SashType } from '../types/window'
import * as THREE from 'three'
import { ThreeEvent, useFrame } from '@react-three/fiber'

interface WindowPanesProps {
  width: number      // 毫米
  height: number     // 毫米
  depth: number      // 毫米
  config: MullionConfig
  frameWidth?: number // 毫米，窗框粗细，可选参数
  panes: WindowPane[]
  onPaneSelect?: (paneId: string) => void
  isPenToolActive?: boolean
}

export const WindowPanes = ({ 
  width, 
  height, 
  depth, 
  config,
  frameWidth = 50, // 默认值为50毫米，注意这里接收的是毫米单位
  panes,
  onPaneSelect,
  isPenToolActive = false
}: WindowPanesProps) => {
  // 如果钢笔工具激活，不渲染任何窗格
  if (isPenToolActive) {
    return null
  }

  // 转换为米
  const meterWidth = width / 1000
  const meterHeight = height / 1000
  const meterDepth = depth / 1000
  const mullionWidth = config.mullionWidth / 1000
  const meterFrameWidth = frameWidth / 1000  // 转换为米
  const glassThickness = 0.006  // 玻璃厚度，6毫米

  // 计算有效内部区域尺寸（减去框架宽度）
  const innerWidth = meterWidth - meterFrameWidth * 2
  const innerHeight = meterHeight - meterFrameWidth * 2

  // 计算分割点
  const horizontalPositions = [0, ...config.horizontalMullions, 1].sort((a, b) => a - b)
  const verticalPositions = [0, ...config.verticalMullions, 1].sort((a, b) => a - b)

  // 处理窗格点击事件
  const handlePaneClick = (paneId: string, e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    
    console.log('%c【窗格点击】', 'background-color: #e8eaf6; color: #3949ab; font-weight: bold', {
      窗格ID: paneId,
      点击位置: {
        x: e.point.x.toFixed(4) * 1000 + 'mm',
        y: e.point.y.toFixed(4) * 1000 + 'mm',
        z: e.point.z.toFixed(4) * 1000 + 'mm'
      }
    });
    
    if (onPaneSelect) {
      onPaneSelect(paneId)
    }
  }

  // 渲染空区域的占位窗格 - 添加此函数以处理空区域
  const renderEmptyPane = (width: number, height: number, depth: number, position: [number, number, number], rowCol: {row: number, col: number}) => {
    // 创建临时ID用于点击事件
    const tempId = `empty-${rowCol.row}-${rowCol.col}`
    
    return (
      <group position={position}>
        {/* 透明背景用于捕获点击 */}
        <mesh
          onClick={(e) => {
            e.stopPropagation()
            console.log('%c【创建新窗格】', 'background-color: #e3f2fd; color: #0d47a1; font-weight: bold', {
              位置: {
                行: rowCol.row,
                列: rowCol.col
              },
              坐标: {
                x: position[0].toFixed(4) + 'm',
                y: position[1].toFixed(4) + 'm',
                z: position[2].toFixed(4) + 'm'
              },
              尺寸: {
                宽: width.toFixed(4) + 'm',
                高: height.toFixed(4) + 'm'
              }
            });
            // 调用点击处理程序，传递行列信息让App组件知道在哪里创建新的窗格
            if (onPaneSelect) {
              onPaneSelect(tempId)
            }
          }}
          visible={true}
        >
          <boxGeometry args={[width, height, depth * 0.1]} />
          <meshStandardMaterial 
            color="#cccccc" 
            transparent={true} 
            opacity={0.2} 
            side={THREE.DoubleSide}
            wireframe={false}
          />
        </mesh>
        
        {/* 添加"点击添加玻璃"的虚线边框提示 */}
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(width, height, 0.001)]} />
          <lineBasicMaterial color="#666666" transparent opacity={0.8} />
        </lineSegments>
      </group>
    )
  }

  // 根据窗扇类型渲染不同的组件
  const renderSash = (pane: WindowPane, width: number, height: number, depth: number, position: [number, number, number]) => {
    switch (pane.type) {
      case 'fixed':
        return renderFixedSash(pane, width, height, depth, position)
      case 'sliding':
        return renderSlidingSash(pane, width, height, depth, position)
      case 'casement':
        return renderCasementSash(pane, width, height, depth, position)
      case 'awning':
        return renderAwningHopperSash(pane, width, height, depth, position, 'top')
      case 'hopper':
        return renderAwningHopperSash(pane, width, height, depth, position, 'bottom')
      case 'pivot':
        return renderPivotSash(pane, width, height, depth, position)
      default:
        return renderFixedSash(pane, width, height, depth, position)
    }
  }

  // 渲染固定窗
  const renderFixedSash = (pane: WindowPane, width: number, height: number, depth: number, position: [number, number, number]) => {
    const glassDepth = depth * 0.6
    const sashFrameWidth = meterFrameWidth * 0.8  // 使用传入的框架宽度
    
    return (
      <group position={position}>
        {/* 固定窗框 */}
        <mesh
          castShadow
          receiveShadow
          onClick={(e) => handlePaneClick(pane.id, e)}
        >
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial color={pane.frameColor} />
        </mesh>
        
        {/* 玻璃 */}
        <mesh position={[0, 0, 0]} renderOrder={1}>
          <boxGeometry args={[width - sashFrameWidth * 2, height - sashFrameWidth * 2, glassThickness]} />
          <meshPhysicalMaterial 
            color={pane.glassColor}
            transparent
            opacity={0.3}
            roughness={0}
            metalness={0.2}
            transmission={0.9}
            thickness={2}
            depthWrite={false}  // 改为false避免透明物体之间的深度冲突
          />
        </mesh>
        
        {/* 选中高亮 */}
        {pane.isActive && (
          <mesh position={[0, 0, depth/2 + 0.001]} renderOrder={2}>
            <boxGeometry args={[width, height, 0.002]} />
            <meshBasicMaterial color="#1890ff" transparent opacity={0.2} depthWrite={false} />
          </mesh>
        )}
      </group>
    )
  }

  // 渲染推拉窗
  const renderSlidingSash = (pane: WindowPane, width: number, height: number, depth: number, position: [number, number, number]) => {
    // 简单起见，将窗扇分为两部分，一个固定，一个可滑动
    const halfWidth = width / 2
    const glassDepth = depth * 0.6
    const slideOffset = pane.isActive ? halfWidth * 0.3 : 0 // 激活状态时略微滑动
    
    return (
      <group position={position}>
        {/* 推拉窗框 */}
        <mesh
          castShadow
          receiveShadow
          onClick={(e) => handlePaneClick(pane.id, e)}
        >
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial color={pane.frameColor} />
        </mesh>
        
        {/* 左侧固定玻璃 */}
        <mesh position={[-halfWidth/2 + meterFrameWidth/2, 0, 0]} renderOrder={1}>
          <boxGeometry args={[halfWidth - meterFrameWidth, height - meterFrameWidth * 2, glassThickness]} />
          <meshPhysicalMaterial 
            color={pane.glassColor}
            transparent
            opacity={0.3}
            roughness={0}
            metalness={0.2}
            transmission={0.9}
            depthWrite={false}
          />
        </mesh>
        
        {/* 右侧滑动玻璃 */}
        <mesh position={[halfWidth/2 - meterFrameWidth/2 - slideOffset, 0, glassThickness]} renderOrder={1}>
          <boxGeometry args={[halfWidth - meterFrameWidth, height - meterFrameWidth * 2, glassThickness]} />
          <meshPhysicalMaterial 
            color={pane.glassColor}
            transparent
            opacity={0.3}
            roughness={0}
            metalness={0.2}
            transmission={0.9}
            depthWrite={false}
          />
        </mesh>
        
        {/* 滑轨标识 */}
        <mesh position={[0, -height/2 + meterFrameWidth/2, depth/2 - meterFrameWidth/2]}>
          <boxGeometry args={[width - meterFrameWidth * 2, meterFrameWidth/4, meterFrameWidth/4]} />
          <meshStandardMaterial color="#444444" />
        </mesh>
        
        {/* 选中高亮 */}
        {pane.isActive && (
          <mesh position={[0, 0, depth/2 + 0.001]} renderOrder={2}>
            <boxGeometry args={[width, height, 0.002]} />
            <meshBasicMaterial color="#1890ff" transparent opacity={0.2} depthWrite={false} />
          </mesh>
        )}
      </group>
    )
  }

  // 渲染平开窗
  const renderCasementSash = (pane: WindowPane, width: number, height: number, depth: number, position: [number, number, number]) => {
    const glassDepth = depth * 0.6
    const isRight = pane.openDirection === 'right'
    const openAngle = pane.isActive ? (isRight ? -Math.PI/6 : Math.PI/6) : 0 // 激活状态时打开30度
    
    return (
      <group position={position}>
        {/* 平开窗框 */}
        <mesh
          castShadow
          receiveShadow
          onClick={(e) => handlePaneClick(pane.id, e)}
        >
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial color={pane.frameColor} />
        </mesh>
        
        {/* 窗扇 */}
        <group 
          position={[isRight ? width/2 - meterFrameWidth : -width/2 + meterFrameWidth, 0, 0]}
          rotation={[0, openAngle, 0]}
          scale={[0.95, 0.95, 1]}
        >
          {/* 窗扇框 */}
          <mesh position={[isRight ? -width/2 + meterFrameWidth : width/2 - meterFrameWidth, 0, 0]}>
            <boxGeometry args={[width - meterFrameWidth * 2, height - meterFrameWidth * 2, meterFrameWidth]} />
            <meshStandardMaterial color={pane.frameColor} />
          </mesh>
          
          {/* 玻璃 */}
          <mesh position={[isRight ? -width/2 + meterFrameWidth : width/2 - meterFrameWidth, 0, 0]}>
            <boxGeometry args={[width - meterFrameWidth * 4, height - meterFrameWidth * 4, glassThickness]} />
            <meshPhysicalMaterial 
              color={pane.glassColor}
              transparent
              opacity={0.3}
              roughness={0}
              metalness={0.2}
              transmission={0.9}
            />
          </mesh>
          
          {/* 把手 */}
          {pane.handle && pane.handle.type !== 'none' && (
            <mesh 
              position={[
                isRight ? -width/2 + meterFrameWidth * 3 : width/2 - meterFrameWidth * 3, 
                0, 
                meterFrameWidth + 0.01
              ]}
            >
              <boxGeometry args={[0.02, 0.06, 0.01]} />
              <meshStandardMaterial color="#444444" />
            </mesh>
          )}
        </group>
        
        {/* 选中高亮 */}
        {pane.isActive && (
          <mesh position={[0, 0, depth/2 + 0.001]}>
            <boxGeometry args={[width, height, 0.002]} />
            <meshBasicMaterial color="#1890ff" transparent opacity={0.2} />
          </mesh>
        )}
      </group>
    )
  }

  // 渲染上悬窗和下悬窗
  const renderAwningHopperSash = (
    pane: WindowPane, 
    width: number, 
    height: number, 
    depth: number, 
    position: [number, number, number],
    direction: 'top' | 'bottom'
  ) => {
    const glassDepth = depth * 0.6
    const isTop = direction === 'top'
    const openAngle = pane.isActive ? (isTop ? Math.PI/6 : -Math.PI/6) : 0 // 激活状态时打开30度
    
    return (
      <group position={position}>
        {/* 窗框 */}
        <mesh
          castShadow
          receiveShadow
          onClick={(e) => handlePaneClick(pane.id, e)}
        >
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial color={pane.frameColor} />
        </mesh>
        
        {/* 窗扇 */}
        <group 
          position={[0, isTop ? height/2 - meterFrameWidth : -height/2 + meterFrameWidth, 0]}
          rotation={[openAngle, 0, 0]}
          scale={[0.95, 0.95, 1]}
        >
          {/* 窗扇框 */}
          <mesh position={[0, isTop ? -height/2 + meterFrameWidth : height/2 - meterFrameWidth, 0]}>
            <boxGeometry args={[width - meterFrameWidth * 2, height - meterFrameWidth * 2, meterFrameWidth]} />
            <meshStandardMaterial color={pane.frameColor} />
          </mesh>
          
          {/* 玻璃 */}
          <mesh position={[0, isTop ? -height/2 + meterFrameWidth : height/2 - meterFrameWidth, 0]}>
            <boxGeometry args={[width - meterFrameWidth * 4, height - meterFrameWidth * 4, glassThickness]} />
            <meshPhysicalMaterial 
              color={pane.glassColor}
              transparent
              opacity={0.3}
              roughness={0}
              metalness={0.2}
              transmission={0.9}
            />
          </mesh>
          
          {/* 把手 */}
          {pane.handle && pane.handle.type !== 'none' && (
            <mesh 
              position={[
                0, 
                isTop ? -height/2 + meterFrameWidth * 3 : height/2 - meterFrameWidth * 3, 
                meterFrameWidth + 0.01
              ]}
            >
              <boxGeometry args={[0.06, 0.02, 0.01]} />
              <meshStandardMaterial color="#444444" />
            </mesh>
          )}
        </group>
        
        {/* 选中高亮 */}
        {pane.isActive && (
          <mesh position={[0, 0, depth/2 + 0.001]}>
            <boxGeometry args={[width, height, 0.002]} />
            <meshBasicMaterial color="#1890ff" transparent opacity={0.2} />
          </mesh>
        )}
      </group>
    )
  }

  // 渲染转窗
  const renderPivotSash = (pane: WindowPane, width: number, height: number, depth: number, position: [number, number, number]) => {
    const glassDepth = depth * 0.6
    const openAngle = pane.isActive ? Math.PI/6 : 0 // 激活状态时打开30度
    
    return (
      <group position={position}>
        {/* 窗框 */}
        <mesh
          castShadow
          receiveShadow
          onClick={(e) => handlePaneClick(pane.id, e)}
        >
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial color={pane.frameColor} />
        </mesh>
        
        {/* 窗扇 */}
        <group 
          rotation={[0, openAngle, 0]}
          scale={[0.95, 0.95, 1]}
        >
          {/* 窗扇框 */}
          <mesh>
            <boxGeometry args={[width - meterFrameWidth * 2, height - meterFrameWidth * 2, meterFrameWidth]} />
            <meshStandardMaterial color={pane.frameColor} />
          </mesh>
          
          {/* 玻璃 */}
          <mesh>
            <boxGeometry args={[width - meterFrameWidth * 4, height - meterFrameWidth * 4, glassThickness]} />
            <meshPhysicalMaterial 
              color={pane.glassColor}
              transparent
              opacity={0.3}
              roughness={0}
              metalness={0.2}
              transmission={0.9}
            />
          </mesh>
          
          {/* 转轴标识 */}
          <mesh rotation={[0, 0, Math.PI/2]}>
            <cylinderGeometry args={[meterFrameWidth/4, meterFrameWidth/4, width - meterFrameWidth * 2, 16]} />
            <meshStandardMaterial color="#444444" />
          </mesh>
        </group>
        
        {/* 选中高亮 */}
        {pane.isActive && (
          <mesh position={[0, 0, depth/2 + 0.001]}>
            <boxGeometry args={[width, height, 0.002]} />
            <meshBasicMaterial color="#1890ff" transparent opacity={0.2} />
          </mesh>
        )}
      </group>
    )
  }

  // 生成所有可能的窗格位置
  const allPanePositions = []
  for (let row = 0; row < horizontalPositions.length - 1; row++) {
    for (let col = 0; col < verticalPositions.length - 1; col++) {
      allPanePositions.push({ row, col })
    }
  }

  return (
    <group>
      {/* 遍历所有可能的窗格位置 */}
      {allPanePositions.map(({ row, col }) => {
        // 获取窗格的边界
        const startH = horizontalPositions[row]
        const endH = horizontalPositions[row + 1]
        const startV = verticalPositions[col]
        const endV = verticalPositions[col + 1]
        
        // 考虑中挺的宽度
        const leftOffset = col > 0 ? mullionWidth / 2 : 0
        const rightOffset = col < verticalPositions.length - 2 ? mullionWidth / 2 : 0
        const topOffset = row > 0 ? mullionWidth / 2 : 0
        const bottomOffset = row < horizontalPositions.length - 2 ? mullionWidth / 2 : 0
        
        // 计算窗格的实际宽度和高度（米），考虑中挺占用的空间
        const paneWidth = (endV - startV) * innerWidth - leftOffset - rightOffset
        const paneHeight = (endH - startH) * innerHeight - topOffset - bottomOffset
        
        // 基于左下角为原点的窗格中心位置（米），考虑中挺的偏移
        const paneCenterX = meterFrameWidth + 
                          (startV * innerWidth + leftOffset + paneWidth / 2)
        const paneCenterY = meterFrameWidth + 
                          (startH * innerHeight + topOffset + paneHeight / 2)
        
        // 查找此位置是否有现有窗格
        const existingPane = panes.find(p => p.row === row && p.col === col)
        
        if (existingPane) {
          // 如果有现有窗格，渲染它
          return (
            <group key={existingPane.id}>
              {renderSash(
                existingPane,
                paneWidth,
                paneHeight,
                meterDepth,
                [paneCenterX, paneCenterY, 0]
              )}
            </group>
          )
        } else {
          // 如果没有窗格，渲染一个可点击的空区域
          return (
            <group key={`empty-${row}-${col}`}>
              {renderEmptyPane(
                paneWidth,
                paneHeight,
                meterDepth,
                [paneCenterX, paneCenterY, 0],
                {row, col}
              )}
            </group>
          )
        }
      })}
    </group>
  )
} 