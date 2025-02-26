export interface WindowParameters {
  width: number    // 毫米
  height: number   // 毫米
  depth: number    // 毫米
  type: 'window' | 'door'
  frameWidth: number // 毫米，窗框粗细
}

export interface MullionSegment {
  position: number  // 中挺的位置（相对于窗户宽度/高度的百分比 0-1）
  start: number    // 段的起点（相对于窗户宽度/高度的百分比 0-1）
  end: number      // 段的终点（相对于窗户宽度/高度的百分比 0-1）
}

export interface WindowDimensions {
  width: number
  height: number
  depth: number
}

export interface MullionConfig {
  verticalMullions: number[]
  horizontalMullions: number[]
  mullionWidth: number
  horizontalSegments?: MullionSegment[]
  verticalSegments?: MullionSegment[]
}

export type HandleType = 'none' | 'lever' | 'crank' | 'push' | 'pull';

export interface Handle {
  type: HandleType;
  position?: 'left' | 'right' | 'top' | 'bottom';
  color?: string;
}

// 窗扇类型
export type SashType = 'fixed' | 'sliding' | 'casement' | 'awning' | 'hopper' | 'pivot';

// 开启方向
export type OpenDirection = 'left' | 'right' | 'top' | 'bottom';

// 玻璃类型
export type GlassType = 'clear' | 'frosted' | 'tinted' | 'reflective' | 'low-e' | 'tempered'

// 窗格区域配置
export interface WindowPane {
  id: string       // 唯一标识符
  row: number      // 行索引
  col: number      // 列索引
  glassColor: string  // 玻璃颜色
  frameColor: string  // 框架颜色
  isActive: boolean   // 是否激活/选中状态
  type: SashType   // 窗扇类型
  openDirection?: OpenDirection  // 开启方向
  handle?: Handle
  // 其他窗扇特定属性
  openAngle?: number // 打开角度
  lockState?: 'locked' | 'unlocked'
  ventilationState?: 'open' | 'closed'
  screenType?: 'none' | 'mesh' | 'solar'
  glassThickness?: number // 玻璃厚度，单位毫米
  glassLayers?: 1 | 2 | 3 // 单层、双层、三层玻璃
}

export interface WindowConfig extends WindowParameters {
  mullions: MullionConfig
  panes: WindowPane[]
}

export interface WindowModel {
  id: string
  name: string
  dimensions: WindowDimensions
  mullions: MullionConfig
  panes: WindowPane[]
} 