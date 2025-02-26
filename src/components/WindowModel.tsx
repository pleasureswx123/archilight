import React from 'react'
import { WindowMullions } from './WindowMullions'
import { WindowPanes } from './WindowPanes'
import { WindowFrame } from './WindowFrame'
import { MullionConfig, WindowPane } from '../types/window'

interface WindowProps {
  width: number        // 毫米
  height: number       // 毫米
  depth: number        // 毫米
  frameWidth?: number  // 毫米，窗框粗细，可选参数
  config: MullionConfig
  panes: WindowPane[]
  onMullionMove?: (direction: 'horizontal' | 'vertical', index: number, position: number) => void
  onMullionDragStateChange?: (isDragging: boolean) => void
  onPaneSelect?: (paneId: string) => void
  isPenToolActive?: boolean
}

export const WindowModel: React.FC<WindowProps> = ({
  width,
  height,
  depth,
  frameWidth = 50, // 默认值为50毫米
  config,
  panes,
  onMullionMove,
  onMullionDragStateChange,
  onPaneSelect,
  isPenToolActive = false
}) => {
  // 转换为米
  const meterWidth = width / 1000
  const meterHeight = height / 1000
  const meterDepth = depth / 1000
  const meterFrameWidth = frameWidth / 1000 // 转换为米

  console.log('%c【窗户模型】使用统一坐标系 - 左下角为原点', 'background-color: #e3f2fd; color: #1565c0; font-weight: bold', {
    窗宽: meterWidth.toFixed(3) + ' m',
    窗高: meterHeight.toFixed(3) + ' m',
    窗深: meterDepth.toFixed(3) + ' m',
    框宽: meterFrameWidth.toFixed(3) + ' m'
  });

  return (
    <group position={[0, 0, 0]}>
      {/* 窗框 */}
      <WindowFrame
        width={meterWidth}
        height={meterHeight}
        depth={meterDepth}
        frameWidth={meterFrameWidth}
        isPenToolActive={isPenToolActive}
      />
      
      {/* 中挺 */}
      <WindowMullions
        width={meterWidth}
        height={meterHeight}
        depth={meterDepth}
        config={config}
        frameWidth={meterFrameWidth}
        onMullionMove={onMullionMove}
        onMullionDragStateChange={onMullionDragStateChange}
        isPenToolActive={isPenToolActive}
      />
      
      {/* 窗扇 */}
      <WindowPanes
        width={width}
        height={height}
        depth={depth}
        config={config}
        frameWidth={frameWidth}
        panes={panes}
        onPaneSelect={onPaneSelect}
        isPenToolActive={isPenToolActive}
      />
    </group>
  )
} 