import { Plane } from '@react-three/drei'

interface GroundProps {
  isPenToolActive?: boolean
}

export const Ground = ({ isPenToolActive = false }: GroundProps) => {
  if (isPenToolActive) {
    return null
  }

  return (
    <Plane
      args={[20, 20]}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.001, 0]}
      receiveShadow
    >
      <meshStandardMaterial
        color="#f0f0f0"
        roughness={1}
        metalness={0}
      />
    </Plane>
  )
} 