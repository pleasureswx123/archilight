import { useState } from 'react'
import { Scene3D } from './components/Scene3D'
import { ToolPanel } from './components/ToolPanel'
import { WindowModel } from './components/WindowModel'
import { WindowMullions } from './components/WindowMullions'
import { WindowPanes } from './components/WindowPanes'
import { PenTool } from './components/PenTool'
import { Ground } from './components/Ground'
import { Measurements } from './components/Measurements'
import { WindowConfig } from './types/window'
import * as THREE from 'three'
import './App.css'

function App() {
  const [parameters, setParameters] = useState<WindowConfig>({
    width: 2000,  // 2000毫米
    height: 1500, // 1500毫米
    depth: 100,   // 100毫米
    type: 'window',
    mullions: {
      horizontalMullions: [0.5], // 默认在中间添加一个横中挺
      verticalMullions: [0.5],   // 默认在中间添加一个竖中挺
      mullionWidth: 50,          // 默认中挺宽度50毫米
      horizontalSegments: [{     // 默认横中挺段
        position: 0.5,
        start: 0,
        end: 1
      }],
      verticalSegments: [{       // 默认竖中挺段
        position: 0.5,
        start: 0,
        end: 1
      }]
    },
    panes: []  // 窗格配置稍后添加
  })

  const [isPenToolActive, setIsPenToolActive] = useState(false)

  // 将毫米转换为米
  const meterHeight = parameters.height / 1000

  const handleMullionDrag = (type: 'horizontal' | 'vertical', index: number, position: number) => {
    setParameters(prev => {
      const newMullions = { ...prev.mullions }
      
      // 辅助函数：判断是否是全长的中挺
      const isFullLength = (segment: { start: number, end: number }) => {
        return Math.abs(segment.start - 0) < 0.001 && Math.abs(segment.end - 1) < 0.001
      }

      // 辅助函数：找到与给定段相交的所有段
      const findIntersectingSegments = (
        segment: { position: number, start: number, end: number },
        isHorizontal: boolean
      ) => {
        const segments = isHorizontal ? newMullions.verticalSegments : newMullions.horizontalSegments
        if (!segments) return []
        
        return segments.filter(s => {
          // 检查两个段是否相交
          const isInRange = s.position >= segment.start && s.position <= segment.end
          const isOverlapping = segment.position >= s.start && segment.position <= s.end
          return isInRange && isOverlapping
        })
      }

      // 辅助函数：更新相交段的位置
      const updateIntersectingSegment = (
        movingSegment: { position: number, start: number, end: number },
        intersectingSegment: { position: number, start: number, end: number },
        oldPosition: number,
        newPosition: number,
        isMovingHorizontal: boolean
      ) => {
        // 如果相交的是全长中挺，不需要调整
        if (isFullLength(intersectingSegment)) {
          return
        }

        // 如果移动的是全长中挺，直接调整相交的部分中挺的对应端点
        if (isFullLength(movingSegment)) {
          // 判断相交点是否在端点或中间
          if (Math.abs(oldPosition - intersectingSegment.start) < 0.001) {
            intersectingSegment.start = newPosition
          } else if (Math.abs(oldPosition - intersectingSegment.end) < 0.001) {
            intersectingSegment.end = newPosition
          } else if (oldPosition > intersectingSegment.start && oldPosition < intersectingSegment.end) {
            // 如果在中间，则根据移动方向调整最近的端点
            const distanceToStart = Math.abs(oldPosition - intersectingSegment.start)
            const distanceToEnd = Math.abs(oldPosition - intersectingSegment.end)
            if (distanceToStart < distanceToEnd) {
              intersectingSegment.start = newPosition
            } else {
              intersectingSegment.end = newPosition
            }
          }
          return
        }

        // 处理部分中挺之间的相交
        const isStartIntersection = Math.abs(intersectingSegment.start - oldPosition) < 0.001
        const isEndIntersection = Math.abs(intersectingSegment.end - oldPosition) < 0.001
        const isMiddleIntersection = oldPosition > intersectingSegment.start && oldPosition < intersectingSegment.end

        if (isStartIntersection || isEndIntersection) {
          if (isStartIntersection) {
            intersectingSegment.start = newPosition
          }
          if (isEndIntersection) {
            intersectingSegment.end = newPosition
          }
        } else if (isMiddleIntersection) {
          if (newPosition <= intersectingSegment.start) {
            intersectingSegment.start = newPosition
          } else if (newPosition >= intersectingSegment.end) {
            intersectingSegment.end = newPosition
          } else {
            if (Math.abs(newPosition - intersectingSegment.start) < Math.abs(newPosition - intersectingSegment.end)) {
              intersectingSegment.start = newPosition
            } else {
              intersectingSegment.end = newPosition
            }
          }
        }

        // 确保段的起点小于终点
        if (intersectingSegment.start > intersectingSegment.end) {
          [intersectingSegment.start, intersectingSegment.end] = [intersectingSegment.end, intersectingSegment.start]
        }
      }

      if (type === 'horizontal') {
        const oldPosition = prev.mullions.horizontalMullions[index]
        const newPositions = [...prev.mullions.horizontalMullions]
        
        // 更新位置数组
        newPositions.splice(index, 1)
        let insertIndex = 0
        while (insertIndex < newPositions.length && newPositions[insertIndex] < position) {
          insertIndex++
        }
        newPositions.splice(insertIndex, 0, position)
        newMullions.horizontalMullions = newPositions

        // 更新段信息
        if (newMullions.horizontalSegments) {
          const currentSegmentIndex = newMullions.horizontalSegments.findIndex(s => 
            Math.abs(s.position - oldPosition) < 0.001
          )
          
          if (currentSegmentIndex !== -1) {
            const currentSegment = newMullions.horizontalSegments[currentSegmentIndex]
            const oldSegment = { ...currentSegment }
            currentSegment.position = position

            // 如果是全长中挺，保持其全长属性
            if (isFullLength(oldSegment)) {
              currentSegment.start = 0
              currentSegment.end = 1
            }

            // 找到所有相交的垂直段
            const intersectingSegments = findIntersectingSegments(oldSegment, true)
            
            // 更新每个相交的垂直段
            intersectingSegments.forEach(segment => {
              updateIntersectingSegment(oldSegment, segment, oldPosition, position, true)
            })
          }
        }
      } else {
        const oldPosition = prev.mullions.verticalMullions[index]
        const newPositions = [...prev.mullions.verticalMullions]
        
        // 更新位置数组
        newPositions.splice(index, 1)
        let insertIndex = 0
        while (insertIndex < newPositions.length && newPositions[insertIndex] < position) {
          insertIndex++
        }
        newPositions.splice(insertIndex, 0, position)
        newMullions.verticalMullions = newPositions

        // 更新段信息
        if (newMullions.verticalSegments) {
          const currentSegmentIndex = newMullions.verticalSegments.findIndex(s => 
            Math.abs(s.position - oldPosition) < 0.001
          )
          
          if (currentSegmentIndex !== -1) {
            const currentSegment = newMullions.verticalSegments[currentSegmentIndex]
            const oldSegment = { ...currentSegment }
            currentSegment.position = position

            // 如果是全长中挺，保持其全长属性
            if (isFullLength(oldSegment)) {
              currentSegment.start = 0
              currentSegment.end = 1
            }

            // 找到所有相交的水平段
            const intersectingSegments = findIntersectingSegments(oldSegment, false)
            
            // 更新每个相交的水平段
            intersectingSegments.forEach(segment => {
              updateIntersectingSegment(oldSegment, segment, oldPosition, position, false)
            })
          }
        }
      }
      
      return { ...prev, mullions: newMullions }
    })
  }

  const handleAddMullion = (start: THREE.Vector3, end: THREE.Vector3) => {
    // 判断是横向还是纵向中挺
    const isHorizontal = Math.abs(start.y - end.y) < Math.abs(start.x - end.x)
    
    setParameters(prev => {
      const newMullions = { ...prev.mullions }
      const meterHeight = prev.height / 1000
      const meterWidth = prev.width / 1000

      if (isHorizontal) {
        // 添加横向中挺
        const y = start.y  // 起点和终点的 y 坐标应该是相同的
        const position = (y + meterHeight/2) / meterHeight
        
        // 计算中挺的起点和终点 x 坐标（相对位置）
        const startX = (Math.min(start.x, end.x) + meterWidth/2) / meterWidth
        const endX = (Math.max(start.x, end.x) + meterWidth/2) / meterWidth
        
        // 添加中挺段
        newMullions.horizontalMullions = [...prev.mullions.horizontalMullions]
        if (!newMullions.horizontalMullions.includes(position)) {
          newMullions.horizontalMullions.push(position)
          newMullions.horizontalMullions.sort((a, b) => a - b)
        }
        
        // 存储中挺段的范围（这需要在 MullionConfig 类型中添加新的字段）
        if (!newMullions.horizontalSegments) {
          newMullions.horizontalSegments = []
        }
        newMullions.horizontalSegments.push({
          position,
          start: startX,
          end: endX
        })
      } else {
        // 添加竖向中挺
        const x = start.x  // 起点和终点的 x 坐标应该是相同的
        const position = (x + meterWidth/2) / meterWidth
        
        // 计算中挺的起点和终点 y 坐标（相对位置）
        const startY = (Math.min(start.y, end.y) + meterHeight/2) / meterHeight
        const endY = (Math.max(start.y, end.y) + meterHeight/2) / meterHeight
        
        // 添加中挺段
        newMullions.verticalMullions = [...prev.mullions.verticalMullions]
        if (!newMullions.verticalMullions.includes(position)) {
          newMullions.verticalMullions.push(position)
          newMullions.verticalMullions.sort((a, b) => a - b)
        }
        
        // 存储中挺段的范围
        if (!newMullions.verticalSegments) {
          newMullions.verticalSegments = []
        }
        newMullions.verticalSegments.push({
          position,
          start: startY,
          end: endY
        })
      }

      return { ...prev, mullions: newMullions }
    })
  }

  return (
    <div className="app-container">
      <div className="canvas-container">
        <Scene3D isPenToolActive={isPenToolActive}>
          <Ground isPenToolActive={isPenToolActive} />
          <group position={[0, meterHeight / 2, 0]}>
            <WindowModel
              width={parameters.width}
              height={parameters.height}
              depth={parameters.depth}
              isPenToolActive={isPenToolActive}
            />
            <WindowMullions
              width={parameters.width}
              height={parameters.height}
              depth={parameters.depth}
              config={parameters.mullions}
              onMullionDrag={handleMullionDrag}
              isPenToolActive={isPenToolActive}
            />
            <WindowPanes
              width={parameters.width}
              height={parameters.height}
              depth={parameters.depth}
              config={parameters.mullions}
              isPenToolActive={isPenToolActive}
            />
            {isPenToolActive && (
              <PenTool
                width={parameters.width}
                height={parameters.height}
                depth={parameters.depth}
                config={parameters.mullions}
                onAddMullion={handleAddMullion}
              />
            )}
          </group>
          {!isPenToolActive && (
            <Measurements
              position={[0, meterHeight / 2, 0]}
              width={parameters.width}
              height={parameters.height}
              depth={parameters.depth}
            />
          )}
        </Scene3D>
      </div>
      <ToolPanel 
        parameters={parameters}
        onParametersChange={setParameters}
        isPenToolActive={isPenToolActive}
        onPenToolActiveChange={setIsPenToolActive}
      />
      </div>
  )
}

export default App
