import * as THREE from 'three'

/**
 * Colour for custom ShaderMaterials that write straight to the sRGB canvas
 * (no colour-space conversion in the shader): keep the authored hex values as-is.
 */
export const rawColor = (hex: string) => new THREE.Color().setStyle(hex, THREE.LinearSRGBColorSpace)
