/** Shared shape of the mossy mound so feet, grass and beetles sit on its surface. */
export const ISLAND = { rx: 3.95, rz: 3.2, dome: 0.26 }

export function islandEllipse(x: number, z: number) {
  return Math.sqrt((x / ISLAND.rx) ** 2 + (z / ISLAND.rz) ** 2)
}

export function islandHeight(x: number, z: number) {
  const e = islandEllipse(x, z)
  let h = e < 1 ? ISLAND.dome * (1 - e * e) - ISLAND.dome : -ISLAND.dome - (e - 1) * (e - 1) * 7
  const n =
    0.05 * Math.sin(x * 2.1 + z * 1.3) * Math.cos(z * 2.7 - x * 0.6) +
    0.025 * Math.sin(x * 5.3 + 1.0) * Math.sin(z * 4.7)
  const f = e < 0.9 ? 1 : Math.max(0, 1 - (e - 0.9) * 2.5)
  h += n * f
  return h
}
