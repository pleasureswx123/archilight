import { MullionConfig } from '../types/window'
import * as THREE from 'three'

interface WindowPanesProps {
  width: number      // 毫米
  height: number     // 毫米
  depth: number      // 毫米
  config: MullionConfig
  isPenToolActive?: boolean
}

export const WindowPanes = ({ 
  width, 
  height, 
  depth, 
  config,
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
  const frameWidth = 0.05  // 50毫米窗框宽度

  // 计算分割点
  const horizontalPositions = [0, ...config.horizontalMullions, 1].sort((a, b) => a - b)
  const verticalPositions = [0, ...config.verticalMullions, 1].sort((a, b) => a - b)

  // 标准材质
  const standardMaterial = {
    color: '#ffffff',
    transparent: true,
    opacity: 0.3,
    roughness: 0,
    metalness: 0.2,
    transmission: 0.9,
    thickness: 2
  }

  // 生成所有窗格
  const panes = []
  for (let i = 0; i < horizontalPositions.length - 1; i++) {
    for (let j = 0; j < verticalPositions.length - 1; j++) {
      // 计算当前窗格的尺寸
      const paneWidth = (verticalPositions[j + 1] - verticalPositions[j]) * meterWidth - mullionWidth
      const paneHeight = (horizontalPositions[i + 1] - horizontalPositions[i]) * meterHeight - mullionWidth
      const paneDepth = meterDepth * 0.6  // 略小于窗框深度

      // 计算当前窗格的位置
      const posX = -meterWidth/2 + frameWidth + 
                  (verticalPositions[j] + verticalPositions[j + 1]) * meterWidth/2
      const posY = -meterHeight/2 + frameWidth + 
                  (horizontalPositions[i] + horizontalPositions[i + 1]) * meterHeight/2

      panes.push(
        <mesh
          key={`pane-${i}-${j}`}
          position={[posX, posY, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[paneWidth - frameWidth * 2, paneHeight - frameWidth * 2, paneDepth]} />
          <meshPhysicalMaterial {...standardMaterial} />
        </mesh>
      )
    }
  }

  return <group>{panes}</group>
} 