// Model.tsx
import React, { useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { Group } from 'three'

interface ModelProps {
  url: string
}

const Model: React.FC<ModelProps> = ({ url }) => {
  const group = useRef<Group>(null)
  const { scene } = useGLTF(url)

  return <primitive ref={group} object={scene} />
}

export default Model
