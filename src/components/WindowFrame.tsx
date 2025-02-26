import React from 'react'

interface WindowFrameProps {
  width: number      // 米
  height: number     // 米
  depth: number      // 米
  frameWidth?: number // 米，窗框粗细，可选参数
  isPenToolActive?: boolean
}

export const WindowFrame: React.FC<WindowFrameProps> = ({
  width,
  height,
  depth,
  frameWidth = 0.05, // 默认值为50毫米(0.05米)
  isPenToolActive = false
}) => {
  // 标准材质
  const standardMaterial = {
    color: '#666666',
    roughness: 0.5,
    metalness: 0.5
  }

  // 钢笔工具模式下的材质 - 修改为整色块而非线框
  const penToolMaterial = {
    color: '#333333',
    opacity: 0.7,
    transparent: true,
    wireframe: false, // 移除线框模式
    depthWrite: true, // 确保正确的深度渲染
  }

  // 基于左下角为原点的坐标系来计算各个框架的位置
  return (
    <group>
      {/* 上框 - 从左下角(0,height,0)延申width长度 */}
      <group position={[width/2, height - frameWidth/2, 0]}>
        {!isPenToolActive ? (
          <mesh castShadow receiveShadow>
            <boxGeometry args={[width, frameWidth, depth]} />
            <meshStandardMaterial {...standardMaterial} />
          </mesh>
        ) : (
          <mesh>
            <boxGeometry args={[width, frameWidth, depth]} />
            <meshBasicMaterial {...penToolMaterial} />
          </mesh>
        )}
      </group>
      
      {/* 下框 - 从左下角(0,0,0)延申width长度 */}
      <group position={[width/2, frameWidth/2, 0]}>
        {!isPenToolActive ? (
          <mesh castShadow receiveShadow>
            <boxGeometry args={[width, frameWidth, depth]} />
            <meshStandardMaterial {...standardMaterial} />
          </mesh>
        ) : (
          <mesh>
            <boxGeometry args={[width, frameWidth, depth]} />
            <meshBasicMaterial {...penToolMaterial} />
          </mesh>
        )}
      </group>
      
      {/* 左框 - 从左下角(0,0,0)延申height长度 */}
      <group position={[frameWidth/2, height/2, 0]}>
        {!isPenToolActive ? (
          <mesh castShadow receiveShadow>
            <boxGeometry args={[frameWidth, height, depth]} />
            <meshStandardMaterial {...standardMaterial} />
          </mesh>
        ) : (
          <mesh>
            <boxGeometry args={[frameWidth, height, depth]} />
            <meshBasicMaterial {...penToolMaterial} />
          </mesh>
        )}
      </group>
      
      {/* 右框 - 从右下角(width,0,0)延申height长度 */}
      <group position={[width - frameWidth/2, height/2, 0]}>
        {!isPenToolActive ? (
          <mesh castShadow receiveShadow>
            <boxGeometry args={[frameWidth, height, depth]} />
            <meshStandardMaterial {...standardMaterial} />
          </mesh>
        ) : (
          <mesh>
            <boxGeometry args={[frameWidth, height, depth]} />
            <meshBasicMaterial {...penToolMaterial} />
          </mesh>
        )}
      </group>
    </group>
  )
} 