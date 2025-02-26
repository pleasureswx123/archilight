import React, { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { MullionConfig, MullionSegment } from '../types/window';

// 吸附类型枚举
enum SnapType {
  None = 'none',
  HorizontalLine = 'horizontalLine',
  VerticalLine = 'verticalLine',
  Endpoint = 'endpoint',
  Intersection = 'intersection'
}

// 获取吸附类型名称的辅助函数
const getSnapTypeName = (type: SnapType): string => {
  switch (type) {
    case SnapType.None:
      return '无吸附';
    case SnapType.HorizontalLine:
      return '水平线';
    case SnapType.VerticalLine:
      return '垂直线';
    case SnapType.Endpoint:
      return '端点';
    case SnapType.Intersection:
      return '交点';
    default:
      return '未知';
  }
};

// 计算两条线的交点
const findLinesIntersection = (
  line1Start: {x: number, y: number}, 
  line1End: {x: number, y: number},
  line2Start: {x: number, y: number}, 
  line2End: {x: number, y: number}
): {x: number, y: number} | null => {
  // 确保一条线是水平线，一条线是垂直线
  const isLine1Horizontal = Math.abs(line1Start.y - line1End.y) < 0.001;
  const isLine2Vertical = Math.abs(line2Start.x - line2End.x) < 0.001;
  
  if (isLine1Horizontal && isLine2Vertical) {
    const y = line1Start.y;
    const x = line2Start.x;
    
    // 检查交点是否在两条线段上
    if (x >= Math.min(line1Start.x, line1End.x) && x <= Math.max(line1Start.x, line1End.x) &&
        y >= Math.min(line2Start.y, line2End.y) && y <= Math.max(line2Start.y, line2End.y)) {
      return { x, y };
    }
  } else if (!isLine1Horizontal && !isLine2Vertical) {
    // 尝试反过来
    return findLinesIntersection(line2Start, line2End, line1Start, line1End);
  }
  
  return null;
};

// 吸附结果接口
interface SnapResult {
  original: {x: number, y: number}; // 原始坐标 (0-1范围)
  snapped: {x: number, y: number};  // 吸附后坐标 (0-1范围)
  type: SnapType;                   // 吸附类型
}

// 组件属性接口
interface PenToolProps {
  config: MullionConfig;
  onMullionAdd: (
    startPoint: {x: number, y: number}, 
    endPoint: {x: number, y: number}
  ) => void;
  dimensions: {
    width: number,  // 窗宽 (mm)
    height: number  // 窗高 (mm)
  };
}

const PenTool: React.FC<PenToolProps> = ({ config, onMullionAdd, dimensions }) => {
  // 将尺寸从毫米转换为米
  const meterWidth = dimensions.width / 1000;
  const meterHeight = dimensions.height / 1000;
  
  // 状态管理
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<THREE.Vector3 | null>(null);
  const [previewPoint, setPreviewPoint] = useState<THREE.Vector3 | null>(null);
  const [snapResult, setSnapResult] = useState<SnapResult | null>(null);
  const [isWindowInitialized, setIsWindowInitialized] = useState(false);
  
  // 引用
  const mousePosRef = useRef<THREE.Vector3 | null>(null);
  
  // 派生状态
  const drawState = isDrawing ? 'started' : 'idle';
  
  // 初始化窗口
  useEffect(() => {
    setIsWindowInitialized(true);
    return () => setIsWindowInitialized(false);
  }, []);
  
  // 跟踪鼠标位置
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      // 这里我们只是记录鼠标位置，实际吸附逻辑在 handlePointerMove 中处理
      if (mousePosRef.current) {
        // 更新 z 坐标不变
        const z = mousePosRef.current.z;
        mousePosRef.current.set(
          mousePosRef.current.x,
          mousePosRef.current.y,
          z
        );
      }
    };
    
    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => window.removeEventListener('mousemove', handleGlobalMouseMove);
  }, []);
  
  // 将场景坐标转换为窗口的本地坐标系（0-1范围）
  const transformToLocalSpace = (position: THREE.Vector3): {x: number, y: number} => {
    // 计算相对于窗口左下角的坐标（0-1范围）
    console.group('【坐标转换】场景坐标 → 窗口本地坐标');
    console.log('原始场景坐标:', {
      x: position.x.toFixed(4) + ' m',
      y: position.y.toFixed(4) + ' m',
      z: position.z.toFixed(4) + ' m'
    });
    
    // 从场景坐标转换到窗口本地坐标系统（基于窗口左下角）
    const localX = (position.x + meterWidth / 2) / meterWidth;
    const localY = position.y / meterHeight;
    
    const result = {
      x: Math.max(0, Math.min(1, localX)),
      y: Math.max(0, Math.min(1, localY))
    };
    
    console.log('窗口本地坐标(0-1范围):', {
      x: result.x.toFixed(4),
      y: result.y.toFixed(4)
    });
    console.groupEnd();
    
    return result;
  };
  
  // 将本地坐标转换回场景坐标
  const transformToSceneSpace = (position: {x: number, y: number}): {x: number, y: number} => {
    return {
      x: position.x * meterWidth - meterWidth / 2,
      y: position.y * meterHeight
    };
  };
  
  // 计算到最近线段的吸附
  const snapToNearestLine = (position: THREE.Vector3): SnapResult => {
    console.group('【吸附检测】计算最近线段吸附点');
    console.log('检测吸附点:', {
      x: position.x.toFixed(4) + ' m',
      y: position.y.toFixed(4) + ' m',
      z: position.z.toFixed(4) + ' m'
    });
    
    const local = transformToLocalSpace(position);
    
    // 定义窗户边框
    const frameLines = [
      // 左边框 (x = 0)
      {start: {x: 0, y: 0}, end: {x: 0, y: 1}, isVertical: true},
      // 右边框 (x = 1)
      {start: {x: 1, y: 0}, end: {x: 1, y: 1}, isVertical: true},
      // 底边框 (y = 0)
      {start: {x: 0, y: 0}, end: {x: 1, y: 0}, isVertical: false},
      // 顶边框 (y = 1)
      {start: {x: 0, y: 1}, end: {x: 1, y: 1}, isVertical: false}
    ];
    
    // 获取水平和垂直中挺线段
    const horizontalSegments = config.horizontalSegments || [];
    const verticalSegments = config.verticalSegments || [];
    
    // 转换中挺段为线条
    const mullionLines = [
      // 水平中挺线
      ...horizontalSegments.map((segment: MullionSegment) => ({
        start: {x: segment.start, y: segment.position},
        end: {x: segment.end, y: segment.position},
        isVertical: false
      })),
      // 垂直中挺线
      ...verticalSegments.map((segment: MullionSegment) => ({
        start: {x: segment.position, y: segment.start},
        end: {x: segment.position, y: segment.end},
        isVertical: true
      }))
    ];
    
    // 所有需要检查的线
    const allLines = [...frameLines, ...mullionLines];
    
    // 寻找最近的垂直线
    const nearestVerticalLine = allLines
      .filter(line => line.isVertical)
      .map(line => {
        const distance = Math.abs(local.x - line.start.x);
        return { line, distance };
      })
      .sort((a, b) => a.distance - b.distance)[0];
    
    // 寻找最近的水平线
    const nearestHorizontalLine = allLines
      .filter(line => !line.isVertical)
      .map(line => {
        const distance = Math.abs(local.y - line.start.y);
        return { line, distance };
      })
      .sort((a, b) => a.distance - b.distance)[0];
    
    // 确定吸附距离阈值（以米为单位，转换为相对距离）
    const snapThresholdMeters = 0.05; // 5厘米
    const snapThresholdX = snapThresholdMeters / meterWidth;
    const snapThresholdY = snapThresholdMeters / meterHeight;
    
    // 潜在的吸附点及其类型
    const snapPoints: {point: {x: number, y: number}, type: SnapType, distance: number}[] = [];
    
    // 检查垂直线吸附
    if (nearestVerticalLine && nearestVerticalLine.distance < snapThresholdX) {
      // 确保点在线段范围内
      const line = nearestVerticalLine.line;
      const y = Math.max(line.start.y, Math.min(line.end.y, local.y));
      
      snapPoints.push({
        point: {x: line.start.x, y},
        type: SnapType.VerticalLine,
        distance: nearestVerticalLine.distance
      });
      
      // 检查端点吸附
      const startPointDistance = Math.sqrt(
        Math.pow(local.x - line.start.x, 2) + 
        Math.pow(local.y - line.start.y, 2)
      );
      
      const endPointDistance = Math.sqrt(
        Math.pow(local.x - line.end.x, 2) + 
        Math.pow(local.y - line.end.y, 2)
      );
      
      if (startPointDistance < Math.max(snapThresholdX, snapThresholdY)) {
        snapPoints.push({
          point: line.start,
          type: SnapType.Endpoint,
          distance: startPointDistance
        });
      }
      
      if (endPointDistance < Math.max(snapThresholdX, snapThresholdY)) {
        snapPoints.push({
          point: line.end,
          type: SnapType.Endpoint,
          distance: endPointDistance
        });
      }
    }
    
    // 检查水平线吸附
    if (nearestHorizontalLine && nearestHorizontalLine.distance < snapThresholdY) {
      // 确保点在线段范围内
      const line = nearestHorizontalLine.line;
      const x = Math.max(line.start.x, Math.min(line.end.x, local.x));
      
      snapPoints.push({
        point: {x, y: line.start.y},
        type: SnapType.HorizontalLine,
        distance: nearestHorizontalLine.distance
      });
      
      // 检查端点吸附
      const startPointDistance = Math.sqrt(
        Math.pow(local.x - line.start.x, 2) + 
        Math.pow(local.y - line.start.y, 2)
      );
      
      const endPointDistance = Math.sqrt(
        Math.pow(local.x - line.end.x, 2) + 
        Math.pow(local.y - line.end.y, 2)
      );
      
      if (startPointDistance < Math.max(snapThresholdX, snapThresholdY)) {
        snapPoints.push({
          point: line.start,
          type: SnapType.Endpoint,
          distance: startPointDistance
        });
      }
      
      if (endPointDistance < Math.max(snapThresholdX, snapThresholdY)) {
        snapPoints.push({
          point: line.end,
          type: SnapType.Endpoint,
          distance: endPointDistance
        });
      }
    }
    
    // 如果有垂直和水平线的吸附点，检查交点
    if (nearestVerticalLine && nearestVerticalLine.distance < snapThresholdX &&
        nearestHorizontalLine && nearestHorizontalLine.distance < snapThresholdY) {
      
      const vLine = nearestVerticalLine.line;
      const hLine = nearestHorizontalLine.line;
      
      // 检查交点是否在两条线的范围内
      if (vLine.start.x >= hLine.start.x && vLine.start.x <= hLine.end.x &&
          hLine.start.y >= vLine.start.y && hLine.start.y <= vLine.end.y) {
        
        const intersectionPoint = {
          x: vLine.start.x,
          y: hLine.start.y
        };
        
        const intersectionDistance = Math.sqrt(
          Math.pow(local.x - intersectionPoint.x, 2) + 
          Math.pow(local.y - intersectionPoint.y, 2)
        );
        
        snapPoints.push({
          point: intersectionPoint,
          type: SnapType.Intersection,
          distance: intersectionDistance
        });
      }
    }
    
    // 如果没有吸附点，返回无吸附
    if (snapPoints.length === 0) {
      console.log('🔍 无吸附点');
      console.groupEnd();
      return { 
        original: local, 
        snapped: local, 
        type: SnapType.None 
      };
    }
    
    // 找到最近的吸附点
    const nearestSnapPoint = snapPoints.sort((a, b) => a.distance - b.distance)[0];
    
    // 将吸附点的相对坐标转换回场景坐标
    const snappedScenePosition = transformToSceneSpace(nearestSnapPoint.point);
    
    console.log('📌 找到吸附点:', {
      类型: getSnapTypeName(nearestSnapPoint.type),
      本地坐标: {
        x: nearestSnapPoint.point.x.toFixed(4), 
        y: nearestSnapPoint.point.y.toFixed(4)
      },
      场景坐标: {
        x: snappedScenePosition.x.toFixed(4) + ' m', 
        y: snappedScenePosition.y.toFixed(4) + ' m'
      },
      距离: nearestSnapPoint.distance.toFixed(4)
    });
    console.groupEnd();
    
    return {
      original: local,
      snapped: nearestSnapPoint.point,
      type: nearestSnapPoint.type
    };
  };
  
  // 处理指针移动：用于实时吸附和预览
  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    // 更新鼠标位置引用
    mousePosRef.current = event.point;
    
    // 如果窗户没有初始化完成就退出
    if (!isWindowInitialized) {
      return;
    }
    
    // 获取鼠标当前位置
    const mousePos = event.point;
    
    console.group('【鼠标移动】实时吸附和预览');
    console.log('鼠标原始位置:', {
      x: mousePos.x.toFixed(4) + ' m',
      y: mousePos.y.toFixed(4) + ' m',
      z: mousePos.z.toFixed(4) + ' m'
    });
    
    // 计算当前位置的吸附结果
    const currentSnapResult = snapToNearestLine(mousePos);
    setSnapResult(currentSnapResult);
    
    // 如果有吸附结果，更新预览点
    if (currentSnapResult && currentSnapResult.type !== SnapType.None) {
      // 将本地坐标转换回场景坐标用于显示
      const scenePos = transformToSceneSpace(currentSnapResult.snapped);
      const previewPos = new THREE.Vector3(scenePos.x, scenePos.y, 0);
      
      setPreviewPoint(previewPos);
      
      console.log('吸附结果:', {
        类型: getSnapTypeName(currentSnapResult.type),
        本地坐标: {
          x: currentSnapResult.snapped.x.toFixed(4),
          y: currentSnapResult.snapped.y.toFixed(4)
        },
        场景坐标: {
          x: previewPos.x.toFixed(4) + ' m',
          y: previewPos.y.toFixed(4) + ' m',
          z: previewPos.z.toFixed(4) + ' m'
        }
      });
      
      // 如果已经有起点，检查是否可以完成绘制
      if (isDrawing && startPoint) {
        // 检查方向和距离是否足够
        const dx = Math.abs(startPoint.x - previewPos.x);
        const dy = Math.abs(startPoint.y - previewPos.y);
        
        // 判断绘制方向
        const isHorizontal = dy < dx;
        const isVertical = dx < dy;
        
        // 最小距离阈值 (5cm)
        const minDistanceThreshold = 0.05;
        const hasMinimumDistance = dx > minDistanceThreshold || dy > minDistanceThreshold;
        
        console.log('绘制检查:', {
          方向: isHorizontal ? '水平' : (isVertical ? '垂直' : '不确定'),
          起点: {
            x: startPoint.x.toFixed(4) + ' m',
            y: startPoint.y.toFixed(4) + ' m'
          },
          当前终点: {
            x: previewPos.x.toFixed(4) + ' m',
            y: previewPos.y.toFixed(4) + ' m'
          },
          距离: {
            x: dx.toFixed(4) + ' m',
            y: dy.toFixed(4) + ' m',
            总距离: Math.sqrt(dx*dx + dy*dy).toFixed(4) + ' m'
          },
          满足最小距离: hasMinimumDistance
        });
        
        // 判断是否可以完成绘制
        const canCompleteDrawing = hasMinimumDistance && (isHorizontal || isVertical);
        
        if (!canCompleteDrawing) {
          console.log('❌ 不能完成绘制:', {
            原因: !hasMinimumDistance ? '距离太小' : '方向不明确'
          });
        } else {
          console.log('✅ 可以完成绘制');
        }
      }
    } else {
      // 无吸附点时，清除预览
      setPreviewPoint(null);
      console.log('❌ 无吸附结果');
    }
    
    console.groupEnd();
  };
  
  // 处理点击操作，设置起点或完成绘制
  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    console.group('【钢笔工具】点击处理');
    
    if (!isWindowInitialized) {
      console.warn('❌ 窗口尚未初始化，无法处理点击');
      console.groupEnd();
      return;
    }
    
    if (!mousePosRef.current) {
      console.warn('❌ 鼠标位置未初始化');
      console.groupEnd();
      return;
    }
    
    // 获取当前鼠标位置的最近吸附点
    const currentSnapResult = snapToNearestLine(mousePosRef.current);
    
    if (!currentSnapResult) {
      console.warn('❌ 无有效吸附点');
      console.groupEnd();
      return;
    }
    
    setSnapResult(currentSnapResult);
    
    // 将吸附点转换为场景坐标
    const scenePos = transformToSceneSpace(currentSnapResult.snapped);
    const snappedPoint = new THREE.Vector3(scenePos.x, scenePos.y, 0);
    
    // 根据当前绘制状态处理
    switch (drawState) {
      case 'idle':
        // 设置起点
        if (currentSnapResult.type !== SnapType.None) {
          setStartPoint(snappedPoint);
          setIsDrawing(true);
          console.log('✅ 设置绘制起点:', {
            x: snappedPoint.x.toFixed(4) + ' m',
            y: snappedPoint.y.toFixed(4) + ' m',
            吸附类型: getSnapTypeName(currentSnapResult.type)
          });
        } else {
          console.log('❌ 无有效吸附点，无法设置起点');
        }
        break;
        
      case 'started':
        // 完成绘制
        if (currentSnapResult.type !== SnapType.None && startPoint) {
          console.log('✅ 完成绘制:', {
            起点: {
              x: startPoint.x.toFixed(4) + ' m', 
              y: startPoint.y.toFixed(4) + ' m'
            },
            终点: {
              x: snappedPoint.x.toFixed(4) + ' m', 
              y: snappedPoint.y.toFixed(4) + ' m'
            },
            吸附类型: getSnapTypeName(currentSnapResult.type)
          });
          
          // 转换为本地坐标 (0-1范围) 用于添加中挺
          const startLocal = transformToLocalSpace(startPoint);
          const endLocal = currentSnapResult.snapped;
          
          // 添加中挺
          onMullionAdd(startLocal, endLocal);
          
          // 重置绘制状态
          setStartPoint(null);
          setIsDrawing(false);
        } else {
          console.log('❌ 无法完成绘制:', {
            有起点: !!startPoint,
            有效吸附: currentSnapResult.type !== SnapType.None
          });
        }
        break;
    }
    
    console.groupEnd();
  };
  
  // 添加中挺的底层实现
  const addMullion = (start: {x: number, y: number}, end: {x: number, y: number}) => {
    // 检查中挺方向
    const dx = Math.abs(end.x - start.x);
    const dy = Math.abs(end.y - start.y);
    
    if (dx > dy) {
      // 水平中挺 (y坐标相同)
      const position = start.y; // 位置是y坐标 (0-1范围)
      const startX = Math.min(start.x, end.x);
      const endX = Math.max(start.x, end.x);
      
      console.log('添加水平中挺:', {
        position: position.toFixed(4),
        start: startX.toFixed(4),
        end: endX.toFixed(4)
      });
      
      onMullionAdd(
        {x: startX, y: position},
        {x: endX, y: position}
      );
    } else {
      // 垂直中挺 (x坐标相同)
      const position = start.x; // 位置是x坐标 (0-1范围)
      const startY = Math.min(start.y, end.y);
      const endY = Math.max(start.y, end.y);
      
      console.log('添加垂直中挺:', {
        position: position.toFixed(4),
        start: startY.toFixed(4),
        end: endY.toFixed(4)
      });
      
      onMullionAdd(
        {x: position, y: startY},
        {x: position, y: endY}
      );
    }
  };
  
  // 渲染钢笔工具UI
  return (
    <group>
      {/* 捕获鼠标事件 */}
      <mesh 
        position={[0, 0, 0]}
        scale={[meterWidth, meterHeight, 1]}
        onPointerMove={handlePointerMove}
        onClick={handleClick}
        visible={false}
      >
        <planeGeometry />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      
      {/* 当前吸附点标记 */}
      {previewPoint && snapResult && snapResult.type !== SnapType.None && (
        <group position={previewPoint}>
          {/* 吸附点指示器 */}
          <mesh>
            <sphereGeometry args={[0.01, 32, 32]} />
            <meshBasicMaterial color={isDrawing ? "#4CAF50" : "#2196F3"} />
          </mesh>
        </group>
      )}
      
      {/* 起点标记 */}
      {startPoint && (
        <group position={startPoint}>
          <mesh>
            <sphereGeometry args={[0.015, 32, 32]} />
            <meshBasicMaterial color="#FF9800" />
          </mesh>
        </group>
      )}
      
      {/* 预览线 - 连接起点和当前鼠标位置 */}
      {startPoint && previewPoint && snapResult && snapResult.type !== SnapType.None && (
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([
                startPoint.x, startPoint.y, startPoint.z,
                previewPoint.x, previewPoint.y, previewPoint.z
              ])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#4CAF50" linewidth={2} />
        </line>
      )}
    </group>
  );
};

export default PenTool; 