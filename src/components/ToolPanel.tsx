import React, { useState } from 'react'
import { Card, Slider, Space, InputNumber, Select, Button, List, Typography, Switch, Tag, Radio, ColorPicker } from 'antd'
import { DeleteOutlined, EditOutlined } from '@ant-design/icons'
import { WindowConfig, MullionConfig, WindowParameters, WindowPane, SashType, GlassType, OpenDirection, HandleType, WindowDimensions } from '../types/window'

interface ToolPanelProps {
  parameters: WindowConfig
  onParametersChange: (params: WindowConfig) => void
  isPenToolActive: boolean
  onTogglePenTool: () => void
  selectedPane: WindowPane | null
  onUpdatePane: (paneId: string, updates: Partial<WindowPane>) => void
  selectedMullion: { type: 'horizontal' | 'vertical', index: number } | null
  onMullionDelete?: (type: 'horizontal' | 'vertical', index: number) => void
  mullions: MullionConfig
  dimensions: WindowDimensions
  onDimensionsChange: (dimensions: WindowDimensions) => void
  onMullionWidthChange: (width: number) => void
  onFrameWidthChange: (width: number) => void
  onRemoveMullion: (direction: 'horizontal' | 'vertical', index: number) => void
  onSashTypeChange: (type: SashType) => void
  onOpenDirectionChange: (direction: OpenDirection) => void
  onHandleTypeChange: (type: HandleType) => void
}

export const ToolPanel = ({ 
  parameters, 
  onParametersChange,
  isPenToolActive,
  onTogglePenTool,
  selectedPane,
  onUpdatePane,
  selectedMullion,
  onMullionDelete,
  mullions,
  dimensions,
  onDimensionsChange,
  onMullionWidthChange,
  onFrameWidthChange,
  onRemoveMullion,
  onSashTypeChange,
  onOpenDirectionChange,
  onHandleTypeChange
}: ToolPanelProps) => {
  const [showGlassColorPicker, setShowGlassColorPicker] = useState(false)
  const [showFrameColorPicker, setShowFrameColorPicker] = useState(false)

  // 样式定义
  const styles = {
    toolPanelHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '10px'
    },
    iconButton: {
      background: isPenToolActive ? '#096dd9' : '#1890ff',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      width: '32px',
      height: '32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      transition: 'all 0.3s'
    },
    penToolTip: {
      background: '#e6f7ff',
      border: '1px solid #91d5ff',
      borderRadius: '4px',
      padding: '8px',
      marginBottom: '10px',
      fontSize: '12px'
    }
  }

  const handleChange = (key: keyof WindowConfig, value: any) => {
    console.log('%c【窗户配置更新】', 'background-color: #e3f2fd; color: #1565c0; font-weight: bold', {
      参数: key,
      旧值: parameters[key],
      新值: value
    });
    const newParams = { ...parameters, [key]: value }
    onParametersChange(newParams)
  }

  const handleMullionChange = (key: keyof MullionConfig, value: any) => {
    console.log('%c【中挺配置更新】', 'background-color: #e8f5e9; color: #2e7d32; font-weight: bold', {
      参数: key,
      旧值: parameters.mullions[key],
      新值: value
    });
    const newMullions = { ...parameters.mullions, [key]: value }
    handleChange('mullions', newMullions)
  }

  const handleMullionPositionChange = (
    type: 'horizontal' | 'vertical',
    index: number,
    value: number
  ) => {
    const newMullions = { ...parameters.mullions }
    const positions = type === 'horizontal' 
      ? [...newMullions.horizontalMullions]
      : [...newMullions.verticalMullions]
    
    // 确保值在0-1之间
    const newValue = Math.max(0, Math.min(1, value))
    const oldValue = positions[index]
    
    console.log('%c【中挺位置调整】', 'background-color: #fff9c4; color: #f57f17; font-weight: bold', {
      类型: type === 'horizontal' ? '水平中挺' : '垂直中挺',
      索引: index,
      原位置: `${(oldValue * 100).toFixed(1)}%`,
      新位置: `${(newValue * 100).toFixed(1)}%`
    });
    
    positions[index] = newValue
    
    // 更新对应的段信息
    if (type === 'horizontal') {
      newMullions.horizontalMullions = positions.sort((a, b) => a - b)
      // 找到并更新对应的段
      if (newMullions.horizontalSegments) {
        const segment = newMullions.horizontalSegments.find(s => Math.abs(s.position - oldValue) < 0.001)
        if (segment) {
          segment.position = newValue
          console.log('更新对应的水平段:', {
            段位置: `${(segment.position * 100).toFixed(1)}%`,
            段起点: `${(segment.start * 100).toFixed(1)}%`,
            段终点: `${(segment.end * 100).toFixed(1)}%`
          });
        }
      }
    } else {
      newMullions.verticalMullions = positions.sort((a, b) => a - b)
      // 找到并更新对应的段
      if (newMullions.verticalSegments) {
        const segment = newMullions.verticalSegments.find(s => Math.abs(s.position - oldValue) < 0.001)
        if (segment) {
          segment.position = newValue
          console.log('更新对应的垂直段:', {
            段位置: `${(segment.position * 100).toFixed(1)}%`,
            段起点: `${(segment.start * 100).toFixed(1)}%`,
            段终点: `${(segment.end * 100).toFixed(1)}%`
          });
        }
      }
    }
    
    handleChange('mullions', newMullions)
  }

  const addHorizontalMullion = () => {
    const currentMullions = [...parameters.mullions.horizontalMullions]
    // 在现有分割点之间找一个合适的位置
    const positions = [0, ...currentMullions, 1].sort((a, b) => a - b)
    let maxGap = 0
    let insertPosition = 0.5
    
    for (let i = 0; i < positions.length - 1; i++) {
      const gap = positions[i + 1] - positions[i]
      if (gap > maxGap) {
        maxGap = gap
        insertPosition = positions[i] + gap / 2
      }
    }
    
    console.log('%c【添加横向中挺】', 'background-color: #e8f5e9; color: #2e7d32; font-weight: bold', {
      插入位置: `${(insertPosition * 100).toFixed(1)}%`,
      最大间隙: `${(maxGap * 100).toFixed(1)}%`,
      现有位置: currentMullions.map(m => `${(m * 100).toFixed(1)}%`)
    });
    
    handleMullionChange('horizontalMullions', [...currentMullions, insertPosition].sort((a, b) => a - b))
  }

  const addVerticalMullion = () => {
    const currentMullions = [...parameters.mullions.verticalMullions]
    // 在现有分割点之间找一个合适的位置
    const positions = [0, ...currentMullions, 1].sort((a, b) => a - b)
    let maxGap = 0
    let insertPosition = 0.5
    
    for (let i = 0; i < positions.length - 1; i++) {
      const gap = positions[i + 1] - positions[i]
      if (gap > maxGap) {
        maxGap = gap
        insertPosition = positions[i] + gap / 2
      }
    }
    
    console.log('%c【添加纵向中挺】', 'background-color: #e8f5e9; color: #2e7d32; font-weight: bold', {
      插入位置: `${(insertPosition * 100).toFixed(1)}%`,
      最大间隙: `${(maxGap * 100).toFixed(1)}%`,
      现有位置: currentMullions.map(m => `${(m * 100).toFixed(1)}%`)
    });
    
    handleMullionChange('verticalMullions', [...currentMullions, insertPosition].sort((a, b) => a - b))
  }

  const removeHorizontalMullion = (index: number) => {
    const newMullions = [...parameters.mullions.horizontalMullions]
    const position = newMullions[index]
    
    console.log('%c【移除横向中挺】', 'background-color: #ffebee; color: #c62828; font-weight: bold', {
      索引: index,
      位置: `${(position * 100).toFixed(1)}%`,
      剩余: newMullions.length - 1
    });
    
    newMullions.splice(index, 1)
    handleMullionChange('horizontalMullions', newMullions)
  }

  const removeVerticalMullion = (index: number) => {
    const newMullions = [...parameters.mullions.verticalMullions]
    const position = newMullions[index]
    
    console.log('%c【移除纵向中挺】', 'background-color: #ffebee; color: #c62828; font-weight: bold', {
      索引: index,
      位置: `${(position * 100).toFixed(1)}%`,
      剩余: newMullions.length - 1
    });
    
    newMullions.splice(index, 1)
    handleMullionChange('verticalMullions', newMullions)
  }

  // 格式化位置显示
  const formatPosition = (position: number) => {
    return `${(position * 100).toFixed(1)}%`
  }

  // 将百分比转换为小数
  const parsePercentage = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value
    return num / 100
  }

  // 处理尺寸变化
  const handleDimensionChange = (e: React.ChangeEvent<HTMLInputElement>, dimension: keyof WindowDimensions) => {
    const value = parseInt(e.target.value)
    if (!isNaN(value) && value > 0) {
      console.log('%c【窗户尺寸变更】', 'background-color: #e3f2fd; color: #1565c0; font-weight: bold', {
        参数: dimension,
        旧值: dimensions[dimension] + ' mm',
        新值: value + ' mm'
      });
      
      onDimensionsChange({
        ...dimensions,
        [dimension]: value
      })
    }
  }

  // 处理中挺宽度变化
  const handleMullionWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value)
    if (!isNaN(value) && value > 0) {
      console.log('%c【中挺宽度变更】', 'background-color: #e8f5e9; color: #2e7d32; font-weight: bold', {
        旧宽度: mullions.mullionWidth + ' mm',
        新宽度: value + ' mm'
      });
      
      onMullionWidthChange(value)
    }
  }

  // 处理框架宽度变化
  const handleFrameWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value)
    if (!isNaN(value) && value > 0) {
      console.log('%c【窗框宽度变更】', 'background-color: #e3f2fd; color: #1565c0; font-weight: bold', {
        旧宽度: parameters.frameWidth + ' mm',
        新宽度: value + ' mm'
      });
      
      onFrameWidthChange(value)
    }
  }

  // 处理窗扇属性更新
  const handlePaneUpdate = (updates: Partial<WindowPane>) => {
    if (selectedPane) {
      console.group('%c【窗扇属性更新】', 'background-color: #f3e5f5; color: #6a1b9a; font-weight: bold');
      console.log('窗扇ID:', selectedPane.id);
      console.log('窗扇位置:', `行${selectedPane.row} 列${selectedPane.col}`);
      
      // 记录每个变更的属性
      Object.entries(updates).forEach(([key, value]) => {
        console.log(`更新 ${key}:`, {
          旧值: selectedPane[key as keyof WindowPane],
          新值: value
        });
      });
      
      console.groupEnd();
      
      onUpdatePane(selectedPane.id, updates)
    }
  }

  // 处理窗扇颜色变化
  const handleColorChange = (color: string, type: 'glassColor' | 'frameColor') => {
    if (selectedPane) {
      console.log('%c【窗扇颜色变更】', 'background-color: #f3e5f5; color: #6a1b9a; font-weight: bold', {
        窗扇ID: selectedPane.id,
        颜色类型: type === 'glassColor' ? '玻璃颜色' : '框架颜色',
        旧颜色: selectedPane[type],
        新颜色: color
      });
      
      handlePaneUpdate({ [type]: color })
    }
  }

  // 渲染窗户参数面板
  const renderWindowParameters = () => (
    <div className="panel-section">
      <h3 className="section-header">窗户参数</h3>
      <div className="input-group">
        <label>宽度 (mm):</label>
        <input
          type="number"
          value={dimensions.width}
          onChange={(e) => handleDimensionChange(e, 'width')}
          min="100"
          max="5000"
        />
      </div>
      <div className="input-group">
        <label>高度 (mm):</label>
        <input
          type="number"
          value={dimensions.height}
          onChange={(e) => handleDimensionChange(e, 'height')}
          min="100"
          max="5000"
        />
      </div>
      <div className="input-group">
        <label>深度 (mm):</label>
        <input
          type="number"
          value={dimensions.depth}
          onChange={(e) => handleDimensionChange(e, 'depth')}
          min="10"
          max="500"
        />
      </div>
      <div className="input-group">
        <label>框架宽度 (mm):</label>
        <input
          type="number"
          value={parameters.frameWidth}
          onChange={handleFrameWidthChange}
          min="10"
          max="200"
        />
      </div>
      <div className="input-group">
        <label>中挺宽度 (mm):</label>
        <input
          type="number"
          value={mullions.mullionWidth}
          onChange={handleMullionWidthChange}
          min="10"
          max="200"
        />
      </div>
    </div>
  )

  // 渲染中挺列表
  const renderMullionList = () => (
    <div className="panel-section">
      <h3 className="section-header">中挺设置</h3>
      
      <div className="mullion-list">
        <h4>横向中挺</h4>
        <ul>
          {mullions.horizontalMullions.map((position, index) => (
            <li key={`h-${index}`} className="mullion-list-item">
              <div className="mullion-position-control">
                <span>位置:</span>
                <input
                  type="number"
                  className="position-input"
                  value={Math.round(position * 100)}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value) && value >= 0 && value <= 100) {
                      handleMullionPositionChange('horizontal', index, value / 100);
                    }
                  }}
                  min="1"
                  max="99"
                  step="1"
                />
                <span className="percent-sign">%</span>
              </div>
              <button
                className="delete-button"
                onClick={() => onMullionDelete && onMullionDelete('horizontal', index)}
              >
                删除
              </button>
            </li>
          ))}
        </ul>
        <button 
          className="add-button"
          onClick={addHorizontalMullion}
          style={{
            marginTop: '8px',
            padding: '4px 10px',
            fontSize: '12px',
            backgroundColor: '#52c41a',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          添加横向中挺
        </button>
      </div>

      <div className="mullion-list">
        <h4>垂直中挺</h4>
        <ul>
          {mullions.verticalMullions.map((position, index) => (
            <li key={`v-${index}`} className="mullion-list-item">
              <div className="mullion-position-control">
                <span>位置:</span>
                <input
                  type="number"
                  className="position-input"
                  value={Math.round(position * 100)}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value) && value >= 0 && value <= 100) {
                      handleMullionPositionChange('vertical', index, value / 100);
                    }
                  }}
                  min="1"
                  max="99"
                  step="1"
                />
                <span className="percent-sign">%</span>
              </div>
              <button
                className="delete-button"
                onClick={() => onMullionDelete && onMullionDelete('vertical', index)}
              >
                删除
              </button>
            </li>
          ))}
        </ul>
        <button 
          className="add-button"
          onClick={addVerticalMullion}
          style={{
            marginTop: '8px',
            padding: '4px 10px',
            fontSize: '12px',
            backgroundColor: '#52c41a',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          添加垂直中挺
        </button>
      </div>

      <div className="mullion-tool" style={{ marginTop: '15px', borderTop: '1px dashed #ddd', paddingTop: '15px' }}>
        <h4 style={{ marginBottom: '8px' }}>添加中挺工具</h4>
        <button
          style={{
            backgroundColor: '#1890ff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '8px 16px',
            width: '100%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => {
            console.log('%c【工具切换】', 'background-color: #e1f5fe; color: #0288d1; font-weight: bold', {
              工具: '钢笔工具',
              状态: !isPenToolActive ? '激活' : '禁用',
              模式: !isPenToolActive ? '绘制模式' : '选择模式'
            });
            onTogglePenTool();
          }}
          title={isPenToolActive ? "退出钢笔工具" : "使用钢笔工具"}
        >
          ✏️
        </button>
        {isPenToolActive && (
          <div style={{ 
            marginTop: '8px', 
            padding: '8px', 
            backgroundColor: '#e6f7ff', 
            border: '1px solid #91d5ff', 
            borderRadius: '4px', 
            fontSize: '12px' 
          }}>
            <p style={{ margin: 0 }}>钢笔工具模式：在窗框或中挺上点击来绘制新的中挺。按ESC键退出。</p>
          </div>
        )}
      </div>
    </div>
  )

  // 渲染窗扇属性面板
  const renderPaneProperties = () => {
    if (!selectedPane || !isPenToolActive) return null
    
    return (
      <div className="panel-section">
        <h3 className="section-header">窗扇属性</h3>
        
        <div className="input-group">
          <label>窗扇类型:</label>
          <select
            value={selectedPane.type}
            onChange={(e) => onSashTypeChange(e.target.value as SashType)}
          >
            <option value="fixed">固定窗</option>
            <option value="sliding">推拉窗</option>
            <option value="casement">平开窗</option>
            <option value="awning">上悬窗</option>
            <option value="hopper">下悬窗</option>
            <option value="pivot">转窗</option>
          </select>
        </div>
        
        {selectedPane.type !== 'fixed' && (
          <div className="input-group">
            <label>开启方向:</label>
            {renderOpenDirectionOptions(selectedPane.type)}
          </div>
        )}
        
        {selectedPane.type !== 'fixed' && (
          <div className="input-group">
            <label>把手类型:</label>
            <select
              value={selectedPane.handle?.type || 'none'}
              onChange={(e) => onHandleTypeChange(e.target.value as HandleType)}
            >
              <option value="none">无把手</option>
              <option value="lever">拉手</option>
              <option value="crank">摇手</option>
              <option value="push">推手</option>
              <option value="pull">抽手</option>
            </select>
          </div>
        )}
        
        <div className="color-pickers">
          <div className="color-picker">
            <label>玻璃颜色:</label>
            <div className="color-preview">
              <div 
                style={{ 
                  backgroundColor: selectedPane.glassColor,
                  width: '30px',
                  height: '30px',
                  border: '1px solid #ccc',
                  cursor: 'pointer'
                }} 
                onClick={() => setShowGlassColorPicker(!showGlassColorPicker)}
              />
            </div>
            {showGlassColorPicker && (
              <div className="color-picker-popover">
                <div 
                  className="color-picker-cover" 
                  onClick={() => setShowGlassColorPicker(false)}
                  style={{
                    position: 'fixed',
                    top: '0px',
                    right: '0px',
                    bottom: '0px',
                    left: '0px'
                  }}
                />
                <input
                  type="color"
                  value={selectedPane.glassColor}
                  onChange={(e) => handleColorChange(e.target.value, 'glassColor')}
                />
              </div>
            )}
          </div>
          
          <div className="color-picker">
            <label>框架颜色:</label>
            <div className="color-preview">
              <div 
                style={{ 
                  backgroundColor: selectedPane.frameColor,
                  width: '30px',
                  height: '30px',
                  border: '1px solid #ccc',
                  cursor: 'pointer'
                }} 
                onClick={() => setShowFrameColorPicker(!showFrameColorPicker)}
              />
            </div>
            {showFrameColorPicker && (
              <div className="color-picker-popover">
                <div 
                  className="color-picker-cover" 
                  onClick={() => setShowFrameColorPicker(false)}
                  style={{
                    position: 'fixed',
                    top: '0px',
                    right: '0px',
                    bottom: '0px',
                    left: '0px'
                  }}
                />
                <input
                  type="color"
                  value={selectedPane.frameColor}
                  onChange={(e) => handleColorChange(e.target.value, 'frameColor')}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // 根据窗扇类型渲染不同的开启方向选项
  const renderOpenDirectionOptions = (type: SashType) => {
    switch (type) {
      case 'casement':
        return (
          <div className="radio-group">
            <label className="radio-wrapper">
              <input
                type="radio"
                value="left"
                checked={selectedPane?.openDirection === 'left'}
                onChange={() => onOpenDirectionChange('left')}
              />
              <span>向左开</span>
            </label>
            <label className="radio-wrapper">
              <input
                type="radio"
                value="right"
                checked={selectedPane?.openDirection === 'right'}
                onChange={() => onOpenDirectionChange('right')}
              />
              <span>向右开</span>
            </label>
          </div>
        )
      case 'sliding':
        return (
          <div className="radio-group">
            <label className="radio-wrapper">
              <input
                type="radio"
                value="left"
                checked={selectedPane?.openDirection === 'left'}
                onChange={() => onOpenDirectionChange('left')}
              />
              <span>向左滑</span>
            </label>
            <label className="radio-wrapper">
              <input
                type="radio"
                value="right"
                checked={selectedPane?.openDirection === 'right'}
                onChange={() => onOpenDirectionChange('right')}
              />
              <span>向右滑</span>
            </label>
          </div>
        )
      case 'awning':
        return (
          <div className="radio-group">
            <label className="radio-wrapper">
              <input
                type="radio"
                value="top"
                checked={selectedPane?.openDirection === 'top'}
                onChange={() => onOpenDirectionChange('top')}
              />
              <span>向上开</span>
            </label>
          </div>
        )
      case 'hopper':
        return (
          <div className="radio-group">
            <label className="radio-wrapper">
              <input
                type="radio"
                value="bottom"
                checked={selectedPane?.openDirection === 'bottom'}
                onChange={() => onOpenDirectionChange('bottom')}
              />
              <span>向下开</span>
            </label>
          </div>
        )
      case 'pivot':
        return (
          <div className="radio-group">
            <label className="radio-wrapper">
              <input
                type="radio"
                value="left"
                checked={selectedPane?.openDirection === 'left'}
                onChange={() => onOpenDirectionChange('left')}
              />
              <span>水平轴</span>
            </label>
            <label className="radio-wrapper">
              <input
                type="radio"
                value="right"
                checked={selectedPane?.openDirection === 'right'}
                onChange={() => onOpenDirectionChange('right')}
              />
              <span>垂直轴</span>
            </label>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="tool-panel">
      <div style={styles.toolPanelHeader}>
        <h2>窗户设计工具</h2>
        <button 
          style={{
            ...styles.iconButton,
            background: isPenToolActive ? '#096dd9' : '#1890ff',
          }}
          onClick={() => {
            console.log('%c【工具切换】', 'background-color: #e1f5fe; color: #0288d1; font-weight: bold', {
              工具: '钢笔工具',
              状态: !isPenToolActive ? '激活' : '禁用',
              模式: !isPenToolActive ? '绘制模式' : '选择模式'
            });
            onTogglePenTool();
          }}
          title={isPenToolActive ? "退出钢笔工具" : "使用钢笔工具"}
        >
          ✏️
        </button>
      </div>
    
      {isPenToolActive && (
        <div style={styles.penToolTip}>
          <p>钢笔工具模式：在窗框或中挺上点击来绘制新的中挺。按ESC键退出。</p>
        </div>
      )}
      {renderWindowParameters()}
      {renderMullionList()}
      {renderPaneProperties()}
    </div>
  )
} 