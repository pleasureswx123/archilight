export interface WindowParameters {
  width: number    // 毫米
  height: number   // 毫米
  depth: number    // 毫米
  type: 'window' | 'door'
}

export interface MullionSegment {
  position: number  // 中挺的位置（相对于窗户宽度/高度的百分比 0-1）
  start: number    // 段的起点（相对于窗户宽度/高度的百分比 0-1）
  end: number      // 段的终点（相对于窗户宽度/高度的百分比 0-1）
}

export interface MullionConfig {
  // 横中挺位置数组（从下到上，相对于窗户高度的百分比 0-1）
  horizontalMullions: number[]
  // 竖中挺位置数组（从左到右，相对于窗户宽度的百分比 0-1）
  verticalMullions: number[]
  // 中挺宽度（毫米）
  mullionWidth: number
  // 横中挺段
  horizontalSegments?: MullionSegment[]
  // 竖中挺段
  verticalSegments?: MullionSegment[]
}

// 窗扇类型
export type SashType = 'fixed' | 'sliding' | 'casement' | 'glass'

// 窗格区域配置
export interface WindowPane {
  type: SashType
  row: number    // 行索引
  col: number    // 列索引
}

export interface WindowConfig extends WindowParameters {
  mullions: MullionConfig
  panes: WindowPane[]
} 