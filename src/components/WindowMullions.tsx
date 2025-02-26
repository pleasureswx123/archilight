import React, { useRef, useState, useEffect, useCallback } from 'react'
import { ThreeEvent } from '@react-three/fiber'
import { MullionConfig } from '../types/window'
import * as THREE from 'three'

// 添加防抖/节流实用函数
function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let lastTime = 0;
  let lastArgs: Parameters<T> | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return function(...args: Parameters<T>) {
    const now = Date.now();
    lastArgs = args;
    
    // 如果是第一次调用或已超过节流时间
    if (now - lastTime >= wait) {
      func(...args);
      lastTime = now;
      
      // 清除任何待处理的超时调用
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    } else if (!timeoutId) {
      // 安排在节流时间结束后执行一次，确保最后的变化也被应用
      const remaining = wait - (now - lastTime);
      timeoutId = setTimeout(() => {
        if (lastArgs) {
          func(...lastArgs);
          lastTime = Date.now();
          lastArgs = null;
        }
        timeoutId = null;
      }, remaining);
    }
  };
}

interface WindowMullionsProps {
  width: number      // 米
  height: number     // 米
  depth: number      // 米
  config: MullionConfig
  frameWidth?: number // 米，窗框粗细，可选参数
  onMullionMove?: (direction: 'horizontal' | 'vertical', index: number, position: number) => void
  onMullionDragStateChange?: (isDragging: boolean) => void
  isPenToolActive?: boolean
}

// 锚点位置枚举
const AnchorPosition = {
  TopLeft: 'top-left',
  Top: 'top',
  TopRight: 'top-right',
  Right: 'right',
  BottomRight: 'bottom-right',
  Bottom: 'bottom',
  BottomLeft: 'bottom-left',
  Left: 'left'
} as const

type AnchorPositionType = typeof AnchorPosition[keyof typeof AnchorPosition]

export const WindowMullions: React.FC<WindowMullionsProps> = ({
  width,
  height,
  depth,
  config,
  frameWidth = 0.05, // 默认值为50毫米(0.05米)
  onMullionMove,
  onMullionDragStateChange,
  isPenToolActive = false
}) => {
  // 中挺宽度（毫米转米）
  const mullionWidth = config.mullionWidth / 1000
  
  // 使用传入的frameWidth而不是硬编码
  // const frameWidth = 0.05
  
  // 计算有效内部区域尺寸（减去框架宽度）
  const innerWidth = width - frameWidth * 2
  const innerHeight = height - frameWidth * 2
  
  // 标准材质
  const standardMaterial = {
    color: '#777777',
    roughness: 0.5,
    metalness: 0.5,
  }

  // 钢笔工具模式下的材质 - 修改为整色块而非线框
  const penToolMaterial = {
    color: '#444444',
    opacity: 0.7,
    transparent: true,
    wireframe: false, // 移除线框模式
    depthWrite: true, // 确保正确的深度渲染
  }

  // 选中材质
  const selectedMaterial = {
    color: '#0066cc', // 更深的蓝色，确保即使在高亮状态下也有明显的颜色
    roughness: 0.3,
    metalness: 0.7,
    emissive: '#1976d2', // 添加蓝色发光效果
    emissiveIntensity: 0.5 // 增强发光强度
  }

  // 拖动状态
  const [dragging, setDragging] = useState(false)
  // 添加本地位置状态以实现更流畅的UI反馈
  const [localPosition, setLocalPosition] = useState<{x: number, y: number} | null>(null)
  
  const dragInfo = useRef<{
    direction: 'horizontal' | 'vertical'
    index: number
    startPosition: number
    initialMouseY?: number        // 初始鼠标Y坐标
    initialMouseX?: number        // 初始鼠标X坐标
    initialIntersection?: THREE.Vector3  // 初始射线与平面的交点
    lastClientX?: number          // 上一次鼠标X坐标
    lastClientY?: number          // 上一次鼠标Y坐标
    camera?: THREE.Camera
  } | null>(null)

  // 节流版本的移动处理函数
  const throttledMullionMove = useCallback(
    throttle((direction: 'horizontal' | 'vertical', index: number, position: number) => {
      if (onMullionMove) {
        onMullionMove(direction, index, position);
      }
    }, 16), // 16ms 节流 - 接近60fps的更新频率
    [onMullionMove]
  );

  // 添加全局指针事件处理器，确保拖拽时跟踪所有指针移动
  useEffect(() => {
    if (!dragging || !dragInfo.current) return;
    
    // 创建一次性资源，避免在事件处理函数中频繁创建
    const raycaster = new THREE.Raycaster();
    const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const intersection = new THREE.Vector3();

    // 防抖处理函数，减少状态更新频率
    let frameId: number | null = null;
    let lastUpdateTime = 0;
    const minUpdateInterval = 16; // 16ms更新一次，接近60fps
    
    // 全局指针移动事件处理
    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (!dragging || !dragInfo.current) return;
      
      // 取消之前的动画帧请求
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
      
      // 使用requestAnimationFrame来限制更新频率
      frameId = requestAnimationFrame(() => {
        const now = Date.now();
        if (now - lastUpdateTime < minUpdateInterval) {
          frameId = null;
          return;
        }
        lastUpdateTime = now;
        
        try {
          // 获取拖动信息
          const { direction, index, startPosition, initialIntersection, camera } = dragInfo.current!;
          
          if (!initialIntersection || !camera) return;
          
          let newPosition;

          // 使用屏幕坐标直接计算移动
          if (direction === 'horizontal') {
            // 获取当前屏幕Y坐标与初始Y坐标的差值
            // 计算鼠标移动距离相对于视窗高度的比例
            const deltaScreenY = e.clientY - (dragInfo.current!.lastClientY || e.clientY);
            
            // 计算比例调整因子 - 窗口高度的10%移动对应完整的中挺可移动范围
            // 数值越小，移动越灵敏
            const sensitivityFactor = 10;
            
            // 转换为相对于内部高度的偏移量
            const deltaPosition = -(deltaScreenY / window.innerHeight) * sensitivityFactor;
            
            // 累加到当前位置
            newPosition = dragInfo.current!.startPosition + deltaPosition;
            
            // 更新拖动信息中的起始位置和上一次鼠标位置
            dragInfo.current!.startPosition = newPosition;
            dragInfo.current!.lastClientY = e.clientY;
          } else {
            // 垂直中挺 - 使用X轴移动
            // 获取当前屏幕X坐标与初始X坐标的差值
            const deltaScreenX = e.clientX - (dragInfo.current!.lastClientX || e.clientX);
            
            // 计算比例调整因子 - 窗口宽度的10%移动对应完整的中挺可移动范围
            const sensitivityFactor = 10;
            
            // 转换为相对于内部宽度的偏移量
            const deltaPosition = (deltaScreenX / window.innerWidth) * sensitivityFactor;
            
            // 累加到当前位置
            newPosition = dragInfo.current!.startPosition + deltaPosition;
            
            // 更新拖动信息中的起始位置和上一次鼠标位置
            dragInfo.current!.startPosition = newPosition;
            dragInfo.current!.lastClientX = e.clientX;
          }
          
          // 限制在窗框内的合理范围 (5% 到 95%)
          newPosition = Math.max(0.05, Math.min(0.95, newPosition));
          
          // 计算实际位置(米)用于本地渲染，以提供即时反馈
          if (direction === 'horizontal') {
            const y = frameWidth + newPosition * innerHeight;
            setLocalPosition({ x: 0, y });
          } else {
            const x = frameWidth + newPosition * innerWidth;
            setLocalPosition({ x, y: 0 });
          }
          
          // 使用节流函数向上传递位置更新
          throttledMullionMove(direction, index, newPosition);
        } catch (err) {
          console.error('拖动处理出错:', err);
        }
        
        frameId = null;
      });
    };
    
    // 全局指针释放事件处理
    const handleGlobalPointerUp = (e: PointerEvent) => {
      if (!dragging) return;
      
      // 取消任何挂起的帧请求
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
        frameId = null;
      }
      
      console.group('%c【中挺拖拽】结束(全局)', 'background-color: #fff3e0; color: #e65100; font-weight: bold');
      
      if (dragInfo.current) {
        const { direction, index, startPosition } = dragInfo.current;
        const endPosition = direction === 'horizontal'
          ? config.horizontalMullions[index]
          : config.verticalMullions[index];
          
        console.log('拖拽结果:', {
          类型: direction === 'horizontal' ? '水平中挺' : '垂直中挺',
          索引: index,
          起始位置: startPosition.toFixed(4),
          最终位置: endPosition.toFixed(4),
          相对位置: (endPosition * 100).toFixed(2) + '%',
          变化量: (endPosition - startPosition).toFixed(4)
        });
      }
      
      console.groupEnd();
      
      // 重置拖拽状态
      setDragging(false);
      // 通知父组件拖动结束
      if (onMullionDragStateChange) {
        onMullionDragStateChange(false);
      }
      setLocalPosition(null);
      dragInfo.current = null;
    };
    
    // 添加全局事件监听器
    window.addEventListener('pointermove', handleGlobalPointerMove);
    window.addEventListener('pointerup', handleGlobalPointerUp);
    
    // 清理函数
    return () => {
      // 取消任何挂起的帧请求
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
    };
  }, [dragging, innerHeight, innerWidth, frameWidth, config, onMullionDragStateChange, throttledMullionMove]);

  // 处理拖动开始
  const handlePointerDown = (
    e: ThreeEvent<PointerEvent>,
    direction: 'horizontal' | 'vertical',
    index: number
  ) => {
    if (isPenToolActive) return
    
    e.stopPropagation()
    
    // 获取当前位置
    const position = direction === 'horizontal'
      ? config.horizontalMullions[index]
      : config.verticalMullions[index]
    
    console.group('%c【中挺拖拽】开始', 'background-color: #fff3e0; color: #e65100; font-weight: bold');
    console.log('初始信息:', {
      类型: direction === 'horizontal' ? '水平中挺' : '垂直中挺',
      索引: index,
      初始位置: position.toFixed(4),
      相对位置: (position * 100).toFixed(2) + '%',
      鼠标位置: {x: e.clientX, y: e.clientY}
    });
    
    // 记录初始鼠标位置
    const initialIntersection = e.point.clone()
    
    // 计算实际位置(米)，用于本地渲染
    let localPos;
    if (direction === 'horizontal') {
      // 横向中挺的Y位置
      const y = frameWidth + position * innerHeight
      localPos = { x: 0, y }
    } else {
      // 纵向中挺的X位置
      const x = frameWidth + position * innerWidth
      localPos = { x, y: 0 }
    }
    
    // 设置本地位置用于渲染
    setLocalPosition(localPos)
    
    // 存储拖动信息
    dragInfo.current = {
      direction,
      index,
      startPosition: position,
      initialIntersection,
      lastClientX: e.clientX,
      lastClientY: e.clientY,
      camera: e.camera,
    }
    
    // 标记为拖动状态
    setDragging(true)
    
    // 通知父组件拖动开始
    if (onMullionDragStateChange) {
      onMullionDragStateChange(true)
    }
    
    // 不再进行指针捕获，依赖全局事件处理
  }

  // 简化pointer move - 仅阻止事件冒泡
  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (dragging) {
      e.stopPropagation();
    }
  }

  // 简化pointer up - 仅阻止事件冒泡
  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (dragging) {
      e.stopPropagation();
    }
  }

  // 渲染横向中挺
  const renderHorizontalMullions = () => {
    return config.horizontalMullions.map((position, index) => {
      // 如果正在拖动此中挺，使用本地位置，否则使用配置位置
      const isDraggingThis = dragging && 
                             dragInfo.current?.direction === 'horizontal' && 
                             dragInfo.current?.index === index
      
      // 基于左下角为原点的Y坐标计算
      const y = isDraggingThis && localPosition 
                ? localPosition.y 
                : frameWidth + position * innerHeight
                
      // 如果正在拖动其他中挺，跳过渲染当前中挺
      if (dragging && !isDraggingThis) {
        return null;
      }
      
      // 选择适当的材质 - 总是使用相同的材质定义方式，避免切换渲染模式
      const materialProps = isDraggingThis ? selectedMaterial : 
                            (isPenToolActive ? penToolMaterial : standardMaterial);
      
      return (
        <group 
          key={`h-${index}`} 
          position={[width/2, y, 0]}
          onPointerDown={(e) => handlePointerDown(e, 'horizontal', index)}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <mesh castShadow receiveShadow renderOrder={2}>
            <boxGeometry args={[innerWidth, mullionWidth, depth]} />
            <meshStandardMaterial {...materialProps} />
          </mesh>
        </group>
      )
    }).filter(Boolean); // 过滤掉null值
  }

  // 渲染水平局部中挺
  const renderHorizontalSegments = () => {
    if (!config.horizontalSegments || config.horizontalSegments.length === 0) {
      return null;
    }

    return config.horizontalSegments.map((segment, index) => {
      // 如果正在拖动中挺，不渲染局部中挺以避免视觉干扰
      if (dragging) {
        return null;
      }
      
      // 基于左下角原点计算Y坐标
      const y = frameWidth + segment.position * innerHeight;
      // 计算水平中挺的起点和终点(基于窗户宽度)
      const startX = frameWidth + segment.start * innerWidth;
      const endX = frameWidth + segment.end * innerWidth;
      const segmentWidth = endX - startX;
      
      // 计算局部中挺的中心点
      const centerX = startX + segmentWidth / 2;
      
      // 选择材质
      const materialProps = isPenToolActive ? penToolMaterial : standardMaterial;
      
      return (
        <group 
          key={`hseg-${index}`} 
          position={[centerX, y, 0]}
        >
          <mesh castShadow receiveShadow renderOrder={2}>
            <boxGeometry args={[segmentWidth, mullionWidth, depth]} />
            <meshStandardMaterial {...materialProps} />
          </mesh>
        </group>
      );
    }).filter(Boolean);
  }

  // 渲染竖中挺
  const renderVerticalMullions = () => {
    return config.verticalMullions.map((position, index) => {
      // 如果正在拖动此中挺，使用本地位置，否则使用配置位置
      const isDraggingThis = dragging && 
                             dragInfo.current?.direction === 'vertical' && 
                             dragInfo.current?.index === index
      
      // 基于左下角为原点的X坐标计算
      const x = isDraggingThis && localPosition 
                ? localPosition.x 
                : frameWidth + position * innerWidth
      
      // 如果正在拖动其他中挺，跳过渲染当前中挺
      if (dragging && !isDraggingThis) {
        return null;
      }
      
      // 选择适当的材质 - 总是使用相同的材质定义方式，避免切换渲染模式
      const materialProps = isDraggingThis ? selectedMaterial : 
                            (isPenToolActive ? penToolMaterial : standardMaterial);
      
      return (
        <group 
          key={`v-${index}`} 
          position={[x, height/2, 0]}
          onPointerDown={(e) => handlePointerDown(e, 'vertical', index)}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <mesh castShadow receiveShadow renderOrder={2}>
            <boxGeometry args={[mullionWidth, innerHeight, depth]} />
            <meshStandardMaterial {...materialProps} />
          </mesh>
        </group>
      )
    }).filter(Boolean); // 过滤掉null值
  }

  // 渲染垂直局部中挺
  const renderVerticalSegments = () => {
    if (!config.verticalSegments || config.verticalSegments.length === 0) {
      return null;
    }

    return config.verticalSegments.map((segment, index) => {
      // 如果正在拖动中挺，不渲染局部中挺以避免视觉干扰
      if (dragging) {
        return null;
      }
      
      // 基于左下角原点计算X坐标
      const x = frameWidth + segment.position * innerWidth;
      // 计算垂直中挺的起点和终点(基于窗户高度)
      const startY = frameWidth + segment.start * innerHeight;
      const endY = frameWidth + segment.end * innerHeight;
      const segmentHeight = endY - startY;
      
      // 计算局部中挺的中心点
      const centerY = startY + segmentHeight / 2;
      
      // 选择材质
      const materialProps = isPenToolActive ? penToolMaterial : standardMaterial;
      
      return (
        <group 
          key={`vseg-${index}`} 
          position={[x, centerY, 0]}
        >
          <mesh castShadow receiveShadow renderOrder={2}>
            <boxGeometry args={[mullionWidth, segmentHeight, depth]} />
            <meshStandardMaterial {...materialProps} />
          </mesh>
        </group>
      );
    }).filter(Boolean);
  }

  return (
    <group>
      {renderHorizontalMullions()}
      {renderVerticalMullions()}
      {renderHorizontalSegments()}
      {renderVerticalSegments()}
    </group>
  )
} 