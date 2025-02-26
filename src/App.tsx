import React, { useState, useEffect, useRef, MouseEventHandler } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stats, PerspectiveCamera } from '@react-three/drei'
import { Scene3D } from './components/Scene3D'
import { WindowModel } from './components/WindowModel'
import { ToolPanel } from './components/ToolPanel'
import { WindowPane, MullionConfig, SashType, OpenDirection, HandleType, Handle, WindowDimensions, WindowConfig, MullionSegment } from './types/window'
import PenTool from './components/PenTool'
import { v4 as uuidv4 } from 'uuid'
import './App.css'
import { ErrorBoundary } from './components/ErrorBoundary'
import * as THREE from 'three'
import { Suspense } from 'react'

// 窗扇类型与颜色映射
const sashTypeColors = {
  fixed: '#8EB1C7',    // 浅蓝色 - 固定窗
  sliding: '#8EC78E',  // 浅绿色 - 推拉窗
  casement: '#B78EC7', // 浅紫色 - 平开窗
  awning: '#C7C78E',   // 浅黄色 - 上悬窗
  hopper: '#C7A88E',   // 浅橙色 - 下悬窗
  pivot: '#C78E9E'     // 浅粉色 - 转窗
}

function App() {
  // 窗户尺寸 (mm)
  const [dimensions, setDimensions] = useState<WindowDimensions>({
    width: 2000,  // 2米宽
    height: 1800, // 1.8米高
    depth: 70     // 70毫米深
  })

  // 框架宽度 (mm)
  const [frameWidth, setFrameWidth] = useState<number>(50) // 默认50毫米

  // 中挺配置
  const [mullionConfig, setMullionConfig] = useState<MullionConfig>({
    horizontalMullions: [0.5],
    verticalMullions: [0.5],
    mullionWidth: 50,
  })

  // 窗扇配置
  const [panes, setPanes] = useState<WindowPane[]>([
    {
      id: '1',
      row: 0,
      col: 0,
      type: 'fixed',
      glassColor: '#8EB1C7',
      frameColor: '#FFFFFF',
      isActive: false
    },
    {
      id: '2',
      row: 0,
      col: 1,
      type: 'sliding',
      glassColor: '#8EB1C7',
      frameColor: '#FFFFFF',
      isActive: false,
      openDirection: 'right',
      handle: {
        type: 'pull',
        position: 'right'
      }
    },
    {
      id: '3',
      row: 1,
      col: 0,
      type: 'casement',
      openDirection: 'left',
      glassColor: '#8EB1C7',
      frameColor: '#FFFFFF',
      isActive: false,
      handle: {
        type: 'lever',
        position: 'right'
      }
    },
    {
      id: '4',
      row: 1,
      col: 1,
      type: 'awning',
      openDirection: 'top',
      glassColor: '#8EB1C7',
      frameColor: '#FFFFFF',
      isActive: false,
      handle: {
        type: 'lever',
        position: 'bottom'
      }
    }
  ])

  // 当前选中的窗扇
  const [selectedPane, setSelectedPane] = useState<string | null>(null)
  
  // 当前选中的中挺
  const [selectedMullion, setSelectedMullion] = useState<{ type: 'horizontal' | 'vertical', index: number } | null>(null)

  // 中挺拖动状态
  const [isDraggingMullion, setIsDraggingMullion] = useState(false)

  // 钢笔工具状态
  const [isPenToolActive, setIsPenToolActive] = useState(false)

  // 窗户参数配置
  const windowConfig: WindowConfig = {
    width: dimensions.width,
    height: dimensions.height,
    depth: dimensions.depth,
    type: 'window',
    frameWidth: frameWidth, // 添加frameWidth到windowConfig
    mullions: mullionConfig,
    panes: panes
  }
  
  // 处理参数变更
  const handleParametersChange = (newParams: WindowConfig) => {
    console.group('%c【配置更新】', 'background-color: #e3f2fd; color: #1565c0; font-weight: bold');
    console.log('更新窗户配置:', {
      尺寸: {
        宽: newParams.width + ' mm',
        高: newParams.height + ' mm',
        深: newParams.depth + ' mm'
      },
      中挺数量: {
        横向: newParams.mullions.horizontalMullions.length,
        纵向: newParams.mullions.verticalMullions.length
      }
    });
    console.groupEnd();
    
    setDimensions({
      width: newParams.width,
      height: newParams.height,
      depth: newParams.depth
    });
    setFrameWidth(newParams.frameWidth);
    setMullionConfig(newParams.mullions);
    setPanes(newParams.panes);
  }

  // 处理中挺位置移动
  const handleMullionMove = (direction: 'horizontal' | 'vertical', index: number, position: number) => {
    console.log('%c【中挺移动】', 'background-color: #fff9c4; color: #f57f17; font-weight: bold', {
      类型: direction === 'horizontal' ? '水平中挺' : '垂直中挺',
      索引: index,
      新位置: position.toFixed(4),
      相对位置: (position * 100).toFixed(2) + '%'
    });
    
    const newConfig = { ...mullionConfig };
    
    if (direction === 'horizontal') {
      const horizontalMullions = [...newConfig.horizontalMullions];
      horizontalMullions[index] = position;
      newConfig.horizontalMullions = horizontalMullions;
    } else {
      const verticalMullions = [...newConfig.verticalMullions];
      verticalMullions[index] = position;
      newConfig.verticalMullions = verticalMullions;
    }
    
    setMullionConfig(newConfig);
    updatePanesAfterMullionChange();
  }

  // 处理添加中挺
  const handleAddMullion = (direction: 'horizontal' | 'vertical', position: number) => {
    console.group('%c【添加中挺】', 'background-color: #e8f5e9; color: #2e7d32; font-weight: bold');
    console.log('添加新中挺:', {
      类型: direction === 'horizontal' ? '水平中挺' : '垂直中挺',
      位置: position.toFixed(4),
      相对位置: (position * 100).toFixed(2) + '%'
    });
    
    const newConfig = { ...mullionConfig };
    
    if (direction === 'horizontal') {
      const horizontalMullions = [...newConfig.horizontalMullions, position];
      horizontalMullions.sort((a, b) => a - b);
      newConfig.horizontalMullions = horizontalMullions;
    } else {
      const verticalMullions = [...newConfig.verticalMullions, position];
      verticalMullions.sort((a, b) => a - b);
      newConfig.verticalMullions = verticalMullions;
    }
    
    console.log('更新后中挺配置:', {
      横向中挺: newConfig.horizontalMullions.map(p => p.toFixed(3)),
      纵向中挺: newConfig.verticalMullions.map(p => p.toFixed(3))
    });
    console.groupEnd();
    
    setMullionConfig(newConfig);
    updatePanesAfterMullionChange();
  }

  // 处理移除中挺
  const handleRemoveMullion = (direction: 'horizontal' | 'vertical', index: number) => {
    console.group('%c【移除中挺】', 'background-color: #ffebee; color: #c62828; font-weight: bold');
    console.log('移除中挺:', {
      类型: direction === 'horizontal' ? '水平中挺' : '垂直中挺',
      索引: index,
      位置: direction === 'horizontal' 
        ? mullionConfig.horizontalMullions[index].toFixed(4)
        : mullionConfig.verticalMullions[index].toFixed(4)
    });
    
    const newConfig = { ...mullionConfig };
    
    if (direction === 'horizontal') {
      const horizontalMullions = [...newConfig.horizontalMullions];
      horizontalMullions.splice(index, 1);
      newConfig.horizontalMullions = horizontalMullions;
    } else {
      const verticalMullions = [...newConfig.verticalMullions];
      verticalMullions.splice(index, 1);
      newConfig.verticalMullions = verticalMullions;
    }
    
    console.log('更新后中挺配置:', {
      横向中挺: newConfig.horizontalMullions.map(p => p.toFixed(3)),
      纵向中挺: newConfig.verticalMullions.map(p => p.toFixed(3))
    });
    console.groupEnd();
    
    setMullionConfig(newConfig);
    updatePanesAfterMullionChange();
  }

  // 中挺变化后更新窗扇布局
  const updatePanesAfterMullionChange = () => {
    const horizontalCount = mullionConfig.horizontalMullions.length + 1
    const verticalCount = mullionConfig.verticalMullions.length + 1
    const newPanes: WindowPane[] = []

    // 为每个格子创建窗扇
    for (let row = 0; row < horizontalCount; row++) {
      for (let col = 0; col < verticalCount; col++) {
        // 查找现有窗扇
        const existingPane = panes.find(p => p.row === row && p.col === col)
        
        if (existingPane) {
          // 保留现有窗扇
          newPanes.push(existingPane)
        } else {
          // 创建新窗扇
          newPanes.push({
            id: uuidv4(),
            row,
            col,
            type: 'fixed',
            glassColor: '#8EB1C7',
            frameColor: '#FFFFFF',
            isActive: false
          })
        }
      }
    }

    setPanes(newPanes)
  }

  // 窗格选择处理
  const handlePaneSelect = (paneId: string) => {
    console.log('%c【窗格选择】', 'background-color: #e8eaf6; color: #3949ab; font-weight: bold', {
      窗格ID: paneId
    });
    
    const selectedPane = panes.find(pane => pane.id === paneId);
    
    if (selectedPane) {
      console.log('已选中窗格信息:', {
        位置: `行${selectedPane.row} 列${selectedPane.col}`,
        类型: selectedPane.type,
        开启方向: selectedPane.openDirection || '无',
        玻璃颜色: selectedPane.glassColor,
        框架颜色: selectedPane.frameColor
      });
      
      setSelectedPane(selectedPane.id);
    } else {
      console.warn('⚠️ 未找到对应ID的窗格:', paneId);
      setSelectedPane(null);
    }
  }

  // 窗格更新处理
  const handlePaneUpdate = (paneId: string, updates: Partial<WindowPane>) => {
    console.group('%c【窗格更新】', 'background-color: #f3e5f5; color: #6a1b9a; font-weight: bold');
    console.log('更新窗格:', {
      窗格ID: paneId,
      更新内容: updates
    });
    
    const newPanes = panes.map(pane => 
      pane.id === paneId 
        ? { ...pane, ...updates }
        : pane
    );
    
    console.log('更新后窗格信息:', {
      位置: `行${updates.row} 列${updates.col}`,
      类型: updates.type,
      开启方向: updates.openDirection || '无',
      玻璃颜色: updates.glassColor,
      框架颜色: updates.frameColor
    });
    
    setPanes(newPanes);
    setSelectedPane(paneId);
    console.groupEnd();
  }

  // 切换窗扇类型
  const handleSashTypeChange = (type: SashType) => {
    if (!selectedPane) return
    
    // 根据不同的窗扇类型设置默认属性
    let updates: Partial<WindowPane> = { 
      type,
      glassColor: sashTypeColors[type] // 设置对应类型的默认玻璃颜色
    }
    
    switch (type) {
      case 'fixed':
        // 固定窗不需要方向和把手
        updates = { 
          ...updates, 
          openDirection: undefined,
          handle: undefined
        }
        break
      case 'sliding':
        // 推拉窗默认水平方向
        updates = { 
          ...updates,
          openDirection: 'right',
          handle: { type: 'pull', position: 'right' }
        }
        break
      case 'casement':
        // 平开窗默认左开
        updates = { 
          ...updates,
          openDirection: 'left',
          handle: { type: 'lever', position: 'right' }
        }
        break
      case 'awning':
        // 上悬窗默认上开
        updates = { 
          ...updates,
          openDirection: 'top',
          handle: { type: 'lever', position: 'bottom' }
        }
        break
      case 'hopper':
        // 下悬窗默认下开
        updates = { 
          ...updates,
          openDirection: 'bottom',
          handle: { type: 'lever', position: 'top' }
        }
        break
      case 'pivot':
        // 转窗默认垂直轴
        updates = { 
          ...updates,
          openDirection: 'right',
          handle: { type: 'push', position: 'right' }
        }
        break
    }
    
    handlePaneUpdate(selectedPane, updates)
  }

  // 切换窗扇开启方向
  const handleOpenDirectionChange = (direction: OpenDirection) => {
    if (!selectedPane) return
    
    // 获取当前窗扇
    const currentPane = panes.find(pane => pane.id === selectedPane)
    if (!currentPane) return
    
    // 根据不同的窗扇类型和新方向调整把手位置
    let handle: Handle | undefined = currentPane.handle
    
    if (handle) {
      switch (currentPane.type) {
        case 'casement':
          // 平开窗：左开把手在右，右开把手在左
          handle = {
            ...handle,
            position: direction === 'left' ? 'right' : 'left'
          }
          break
        case 'awning':
          // 上悬窗：把手在底部
          handle = {
            ...handle,
            position: 'bottom'
          }
          break
        case 'hopper':
          // 下悬窗：把手在顶部
          handle = {
            ...handle,
            position: 'top'
          }
          break
      }
    }
    
    handlePaneUpdate(selectedPane, { 
      openDirection: direction,
      handle
    })
  }

  // 切换把手类型
  const handleHandleTypeChange = (type: HandleType) => {
    if (!selectedPane) return
    
    // 获取当前窗扇
    const currentPane = panes.find(pane => pane.id === selectedPane)
    if (!currentPane) return
    
    if (type === 'none') {
      // 移除把手
      handlePaneUpdate(selectedPane, { handle: undefined })
    } else {
      // 更新把手类型，保留位置
      const position = currentPane.handle?.position || getDefaultHandlePosition(currentPane.type, currentPane.openDirection)
      handlePaneUpdate(selectedPane, { 
        handle: { type, position }
      })
    }
  }

  // 根据窗扇类型和开启方向获取默认把手位置
  const getDefaultHandlePosition = (type: SashType, direction?: OpenDirection): 'left' | 'right' | 'top' | 'bottom' => {
    switch (type) {
      case 'casement':
        return direction === 'left' ? 'right' : 'left'
      case 'awning':
        return 'bottom'
      case 'hopper':
        return 'top'
      case 'sliding':
        return direction === 'left' ? 'right' : 'left'
      default:
        return 'right'
    }
  }

  // 处理钢笔工具添加中挺
  const handleAddMullionForPenTool = (start: THREE.Vector3, end: THREE.Vector3) => {
    console.group('%c【PenTool日志】处理钢笔工具绘制的中挺', 'background-color: #e8f5e9; color: #2e7d32; font-weight: bold;');
    
    // 记录收到的原始坐标
    console.log('【PenTool日志】接收到的原始坐标:', {
      起点: {
        x: start.x.toFixed(4) + ' m',
        y: start.y.toFixed(4) + ' m',
        z: start.z.toFixed(4) + ' m'
      },
      终点: {
        x: end.x.toFixed(4) + ' m',
        y: end.y.toFixed(4) + ' m',
        z: end.z.toFixed(4) + ' m'
      }
    });
    
    // 确定是水平还是垂直中挺
    // 通过比较x和y坐标的差值来决定
    const dx = Math.abs(end.x - start.x);
    const dy = Math.abs(end.y - start.y);
    
    // 如果x坐标相同，则是垂直中挺；如果y坐标相同，则是水平中挺
    const isVertical = dx < dy;
    
    console.log(`【PenTool日志】判定中挺方向: ${isVertical ? '垂直中挺' : '水平中挺'}`);
    
    // 获取窗户尺寸（米）
    const meterWidth = dimensions.width / 1000;
    const meterHeight = dimensions.height / 1000;
    const meterFrameWidth = frameWidth / 1000;
    
    // 窗户内部尺寸
    const innerWidth = meterWidth - meterFrameWidth * 2;
    const innerHeight = meterHeight - meterFrameWidth * 2;
    
    console.log('【PenTool日志】窗户尺寸(米):', {
      总宽: meterWidth.toFixed(2),
      总高: meterHeight.toFixed(2),
      内部宽: innerWidth.toFixed(2),
      内部高: innerHeight.toFixed(2),
      窗框宽度: meterFrameWidth.toFixed(2)
    });
    
    if (isVertical) {
      // 垂直中挺 - 从x坐标计算相对位置
      // 计算中挺在整个窗户宽度中的相对位置
      // 坐标系统现在是以窗户左下角为原点，所以直接除以总宽
      let position = start.x / meterWidth;
      position = Math.max(0, Math.min(1, position)); // 确保在0-1范围内
      
      // 计算起点和终点的y轴相对位置
      let startY = start.y / meterHeight;
      let endY = end.y / meterHeight;
      
      // 确保起点在下方，终点在上方
      if (startY > endY) {
        [startY, endY] = [endY, startY];
      }
      
      // 确保范围在0-1之间
      startY = Math.max(0, Math.min(1, startY));
      endY = Math.max(0, Math.min(1, endY));
      
      console.log('【PenTool日志】垂直中挺参数:', {
        position: position.toFixed(4),
        startY: startY.toFixed(4),
        endY: endY.toFixed(4),
        物理位置X: (position * meterWidth).toFixed(4) + ' m'
      });
      
      // 添加部分垂直中挺
      handleAddPartialMullion('vertical', position, startY, endY);
      
    } else {
      // 水平中挺 - 从y坐标计算相对位置
      // 计算中挺在整个窗户高度中的相对位置
      let position = start.y / meterHeight;
      position = Math.max(0, Math.min(1, position)); // 确保在0-1范围内
      
      // 计算起点和终点的x轴相对位置
      // 坐标系统现在是以窗户左下角为原点，所以直接除以总宽
      let startX = start.x / meterWidth;
      let endX = end.x / meterWidth;
      
      // 确保起点在左侧，终点在右侧
      if (startX > endX) {
        [startX, endX] = [endX, startX];
      }
      
      // 确保范围在0-1之间
      startX = Math.max(0, Math.min(1, startX));
      endX = Math.max(0, Math.min(1, endX));
      
      console.log('【PenTool日志】水平中挺参数:', {
        position: position.toFixed(4),
        startX: startX.toFixed(4),
        endX: endX.toFixed(4),
        物理位置Y: (position * meterHeight).toFixed(4) + ' m'
      });
      
      // 添加部分水平中挺
      handleAddPartialMullion('horizontal', position, startX, endX);
    }
    
    console.groupEnd();
  }

  // 添加部分中挺
  const handleAddPartialMullion = (
    direction: 'horizontal' | 'vertical', 
    position: number, 
    start: number, 
    end: number
  ) => {
    console.log(`【PenTool日志】添加${direction === 'horizontal' ? '水平' : '垂直'}中挺段:`, {
      position: position.toFixed(4),
      start: start.toFixed(4),
      end: end.toFixed(4)
    });
    
    // 检查position是否在有效范围内
    if (position < 0 || position > 1) {
      console.error(`【PenTool日志】错误: ${direction}中挺位置${position}超出有效范围(0-1)`);
      return;
    }
    
    // 创建中挺段配置
    const mullionSegment: MullionSegment = {
      position,
      start,
      end
    };
    
    // 复制当前配置
    const newConfig = { ...mullionConfig };
    
    // 更新相应方向的中挺段
    if (direction === 'horizontal') {
      // 复制数组或创建新数组
      const segments = newConfig.horizontalSegments 
        ? [...newConfig.horizontalSegments] 
        : [];
      
      // 添加新的段
      segments.push(mullionSegment);
      
      // 更新配置
      newConfig.horizontalSegments = segments;
      
      // 计算在实际窗户上的位置（米）- 使用统一坐标系
      const physicalY = position * dimensions.height / 1000;
      const physicalStartX = start * dimensions.width / 1000;
      const physicalEndX = end * dimensions.width / 1000;
      const segmentLength = (end - start) * dimensions.width / 1000;
      
      console.log('【PenTool日志】水平中挺实际位置(米):', {
        y: physicalY.toFixed(4),
        startX: physicalStartX.toFixed(4),
        endX: physicalEndX.toFixed(4),
        length: segmentLength.toFixed(4)
      });
      
    } else {
      // 复制数组或创建新数组
      const segments = newConfig.verticalSegments 
        ? [...newConfig.verticalSegments] 
        : [];
      
      // 添加新的段
      segments.push(mullionSegment);
      
      // 更新配置
      newConfig.verticalSegments = segments;
      
      // 计算在实际窗户上的位置（米）- 使用统一坐标系
      const physicalX = position * dimensions.width / 1000;
      const physicalStartY = start * dimensions.height / 1000;
      const physicalEndY = end * dimensions.height / 1000;
      const segmentLength = (end - start) * dimensions.height / 1000;
      
      console.log('【PenTool日志】垂直中挺实际位置(米):', {
        x: physicalX.toFixed(4),
        startY: physicalStartY.toFixed(4),
        endY: physicalEndY.toFixed(4),
        length: segmentLength.toFixed(4)
      });
    }
    
    // 更新状态
    setMullionConfig(newConfig);
    console.log('【PenTool日志】中挺添加完成 ✓');
  };

  // 获取当前选中的窗扇 (确保不为 undefined)
  const selectedPaneDetails = selectedPane !== null ? panes.find(pane => pane.id === selectedPane) || null : null;
  
  // 处理中挺选择
  const handleMullionSelect = (type: 'horizontal' | 'vertical', index: number) => {
    console.log('%c【中挺选择】', 'background-color: #fffde7; color: #827717; font-weight: bold', {
      类型: type === 'horizontal' ? '水平中挺' : '垂直中挺',
      索引: index,
      位置: type === 'horizontal' 
        ? mullionConfig.horizontalMullions[index].toFixed(4)
        : mullionConfig.verticalMullions[index].toFixed(4),
      相对位置: (type === 'horizontal' 
        ? mullionConfig.horizontalMullions[index] * 100
        : mullionConfig.verticalMullions[index] * 100).toFixed(2) + '%'
    });
    
    setSelectedMullion({ type, index });
  }

  // 处理中挺拖动状态变化
  const handleMullionDragStateChange = (isDragging: boolean) => {
    console.log('%c【中挺拖动】', 'color: #ff9800', isDragging ? '开始拖动' : '结束拖动');
    setIsDraggingMullion(isDragging);
  }

  return (
    <div className="app-container">
      <div className="canvas-container">
        <ErrorBoundary is3D={false}>
          <Canvas 
            shadows 
            style={{ width: '100%', height: '100vh' }}
            camera={{ position: [4, 2, 4], fov: 50 }}
          >
            <Suspense fallback={null}>
              <ErrorBoundary is3D={true}>
                <WindowModel 
                  width={dimensions.width} 
                  height={dimensions.height} 
                  depth={dimensions.depth}
                  frameWidth={frameWidth} // 传递frameWidth给WindowModel
                  config={mullionConfig}
                  panes={panes}
                  onPaneSelect={handlePaneSelect}
                  onMullionMove={handleMullionMove}
                  onMullionDragStateChange={handleMullionDragStateChange}
                  isPenToolActive={isPenToolActive}
                />
                
                {isPenToolActive && (
                  <PenTool 
                    config={mullionConfig}
                    dimensions={{
                      width: dimensions.width,
                      height: dimensions.height
                    }}
                    onMullionAdd={(start, end) => handleAddMullionForPenTool(
                      new THREE.Vector3(start.x, start.y, 0),
                      new THREE.Vector3(end.x, end.y, 0)
                    )}
                  />
                )}
                
                <fog attach="fog" args={['#f0f0f0', 1, 20]} />
                <Scene3D 
                  width={dimensions.width} 
                  height={dimensions.height} 
                  depth={dimensions.depth} 
                  isPenToolActive={isPenToolActive}
                  isDraggingMullion={isDraggingMullion}
                />
              </ErrorBoundary>
            </Suspense>
          </Canvas>
        </ErrorBoundary>
      </div>
      <div className="tools-container">
        <ToolPanel
          parameters={windowConfig}
          onParametersChange={handleParametersChange}
          mullions={mullionConfig}
          dimensions={dimensions}
          onDimensionsChange={setDimensions}
          onMullionWidthChange={(width) => setMullionConfig(prev => ({ ...prev, mullionWidth: width }))}
          onFrameWidthChange={(width) => setFrameWidth(width)} // 添加frameWidth变更处理
          onRemoveMullion={handleRemoveMullion}
          isPenToolActive={isPenToolActive}
          onTogglePenTool={() => setIsPenToolActive(prev => !prev)}
          selectedPane={selectedPaneDetails}
          onUpdatePane={handlePaneUpdate}
          onSashTypeChange={handleSashTypeChange}
          onOpenDirectionChange={handleOpenDirectionChange}
          onHandleTypeChange={handleHandleTypeChange}
          selectedMullion={selectedMullion}
          onMullionDelete={handleRemoveMullion}
        />
      </div>
    </div>
  )
}

export default App
