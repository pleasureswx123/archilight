import { Line, Text } from '@react-three/drei'
import { Vector3 } from 'three'

interface MeasurementsProps {
  width: number  // 毫米
  height: number // 毫米
  depth: number  // 毫米
  position: [number, number, number]
}

export const Measurements = ({ width, height, depth, position }: MeasurementsProps) => {
  // 将毫米转换为米
  const meterWidth = width / 1000
  const meterHeight = height / 1000
  const meterDepth = depth / 1000
  
  const [x, y, z] = position
  
  return (
    <group>
      {/* 宽度标注 */}
      <group position={[x, y - meterHeight/2 - 0.2, z]}>
        <Line
          points={[
            new Vector3(-meterWidth/2, 0, 0),
            new Vector3(meterWidth/2, 0, 0)
          ]}
          color="black"
        />
        <Line
          points={[
            new Vector3(-meterWidth/2, 0, 0),
            new Vector3(-meterWidth/2, -0.1, 0)
          ]}
          color="black"
        />
        <Line
          points={[
            new Vector3(meterWidth/2, 0, 0),
            new Vector3(meterWidth/2, -0.1, 0)
          ]}
          color="black"
        />
        <Text
          position={[0, -0.15, 0]}
          fontSize={0.1}
          color="black"
          anchorX="center"
          anchorY="top"
        >
          {`${width}mm`}
        </Text>
      </group>

      {/* 高度标注 */}
      <group position={[x - meterWidth/2 - 0.2, y, z]}>
        <Line
          points={[
            new Vector3(0, -meterHeight/2, 0),
            new Vector3(0, meterHeight/2, 0)
          ]}
          color="black"
        />
        <Line
          points={[
            new Vector3(0, -meterHeight/2, 0),
            new Vector3(-0.1, -meterHeight/2, 0)
          ]}
          color="black"
        />
        <Line
          points={[
            new Vector3(0, meterHeight/2, 0),
            new Vector3(-0.1, meterHeight/2, 0)
          ]}
          color="black"
        />
        <Text
          position={[-0.15, 0, 0]}
          fontSize={0.1}
          color="black"
          anchorX="center"
          anchorY="middle"
          rotation={[0, 0, Math.PI/2]}
        >
          {`${height}mm`}
        </Text>
      </group>

      {/* 深度标注 */}
      <group position={[x + meterWidth/2 + 0.2, y, z]}>
        <Line
          points={[
            new Vector3(0, 0, -meterDepth/2),
            new Vector3(0, 0, meterDepth/2)
          ]}
          color="black"
        />
        <Line
          points={[
            new Vector3(0, 0, -meterDepth/2),
            new Vector3(0.1, 0, -meterDepth/2)
          ]}
          color="black"
        />
        <Line
          points={[
            new Vector3(0, 0, meterDepth/2),
            new Vector3(0.1, 0, meterDepth/2)
          ]}
          color="black"
        />
        <Text
          position={[0.15, 0, 0]}
          fontSize={0.1}
          color="black"
          anchorX="center"
          anchorY="middle"
        >
          {`${depth}mm`}
        </Text>
      </group>
    </group>
  )
} 