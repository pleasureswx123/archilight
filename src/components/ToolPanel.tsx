import { Card, Slider, Space, InputNumber, Select, Button, List, Typography, Switch, Tag } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'
import { WindowConfig, MullionConfig, WindowParameters } from '../types/window'

interface ToolPanelProps {
  parameters: WindowConfig
  onParametersChange: (params: WindowConfig) => void
  isPenToolActive: boolean
  onPenToolActiveChange: (active: boolean) => void
}

export const ToolPanel = ({ 
  parameters, 
  onParametersChange,
  isPenToolActive,
  onPenToolActiveChange
}: ToolPanelProps) => {
  const handleChange = (key: keyof WindowConfig, value: any) => {
    const newParams = { ...parameters, [key]: value }
    onParametersChange(newParams)
  }

  const handleMullionChange = (key: keyof MullionConfig, value: any) => {
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
    positions[index] = newValue
    
    // 更新对应的段信息
    if (type === 'horizontal') {
      newMullions.horizontalMullions = positions.sort((a, b) => a - b)
      // 找到并更新对应的段
      if (newMullions.horizontalSegments) {
        const segment = newMullions.horizontalSegments.find(s => Math.abs(s.position - oldValue) < 0.001)
        if (segment) {
          segment.position = newValue
        }
      }
    } else {
      newMullions.verticalMullions = positions.sort((a, b) => a - b)
      // 找到并更新对应的段
      if (newMullions.verticalSegments) {
        const segment = newMullions.verticalSegments.find(s => Math.abs(s.position - oldValue) < 0.001)
        if (segment) {
          segment.position = newValue
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
    
    handleMullionChange('verticalMullions', [...currentMullions, insertPosition].sort((a, b) => a - b))
  }

  const removeHorizontalMullion = (index: number) => {
    const newMullions = [...parameters.mullions.horizontalMullions]
    newMullions.splice(index, 1)
    handleMullionChange('horizontalMullions', newMullions)
  }

  const removeVerticalMullion = (index: number) => {
    const newMullions = [...parameters.mullions.verticalMullions]
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

  return (
    <div className="tools-container">
      <div className="tools-header">
        <h1>门窗设计工具</h1>
        <p>调整参数以自定义门窗的尺寸和样式</p>
      </div>

      <div className="parameter-section">
        <h2>工具</h2>
        <div className="parameter-item">
          <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
            <label>钢笔工具</label>
            <Switch
              checked={isPenToolActive}
              onChange={onPenToolActiveChange}
              checkedChildren="开启"
              unCheckedChildren="关闭"
            />
          </Space>
          {isPenToolActive && (
            <Typography.Text type="secondary" style={{ display: 'block', marginTop: '8px', fontSize: '12px' }}>
              点击窗框或中挺线上的点来添加新的中挺。第一次点击确定起点，第二次点击确定终点。
            </Typography.Text>
          )}
        </div>
      </div>

      <div className="parameter-section">
        <h2>基本设置</h2>
        <div className="parameter-item">
          <label>类型</label>
          <Select
            style={{ width: '100%' }}
            value={parameters.type}
            onChange={(value) => handleChange('type', value)}
            options={[
              { label: '窗户', value: 'window' },
              { label: '门', value: 'door' }
            ]}
          />
        </div>
      </div>

      <div className="parameter-section">
        <h2>尺寸调整</h2>
        <div className="parameter-item">
          <label>宽度 (毫米)</label>
          <Slider
            min={500}    // 0.5米 = 500毫米
            max={5000}   // 5米 = 5000毫米
            step={10}    // 1厘米 = 10毫米
            value={parameters.width}
            onChange={(value) => handleChange('width', value)}
          />
          <InputNumber
            min={500}
            max={5000}
            step={10}
            value={parameters.width}
            onChange={(value) => handleChange('width', value)}
            style={{ width: '100%' }}
          />
        </div>

        <div className="parameter-item">
          <label>高度 (毫米)</label>
          <Slider
            min={500}    // 0.5米 = 500毫米
            max={3000}   // 3米 = 3000毫米
            step={10}    // 1厘米 = 10毫米
            value={parameters.height}
            onChange={(value) => handleChange('height', value)}
          />
          <InputNumber
            min={500}
            max={3000}
            step={10}
            value={parameters.height}
            onChange={(value) => handleChange('height', value)}
            style={{ width: '100%' }}
          />
        </div>

        <div className="parameter-item">
          <label>深度 (毫米)</label>
          <Slider
            min={50}     // 0.05米 = 50毫米
            max={300}    // 0.3米 = 300毫米
            step={1}     // 1毫米
            value={parameters.depth}
            onChange={(value) => handleChange('depth', value)}
          />
          <InputNumber
            min={50}
            max={300}
            step={1}
            value={parameters.depth}
            onChange={(value) => handleChange('depth', value)}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      <div className="parameter-section">
        <h2>中挺设置</h2>
        <div className="parameter-item">
          <label>中挺宽度 (毫米)</label>
          <Slider
            min={30}
            max={100}
            step={1}
            value={parameters.mullions.mullionWidth}
            onChange={(value) => handleMullionChange('mullionWidth', value)}
          />
          <InputNumber
            min={30}
            max={100}
            step={1}
            value={parameters.mullions.mullionWidth}
            onChange={(value) => handleMullionChange('mullionWidth', value)}
            style={{ width: '100%' }}
          />
        </div>

        <div className="parameter-item">
          <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: '16px' }}>
            <Button onClick={addHorizontalMullion}>添加横中挺</Button>
            <Button onClick={addVerticalMullion}>添加竖中挺</Button>
          </Space>

          {/* 横中挺列表 */}
          <div className="mullion-list">
            <Typography.Text strong>横中挺位置</Typography.Text>
            <List
              size="small"
              bordered
              dataSource={parameters.mullions.horizontalMullions.map((position, index) => ({
                position,
                segment: parameters.mullions.horizontalSegments?.find(s => Math.abs(s.position - position) < 0.001)
              }))}
              renderItem={({position, segment}, index) => (
                <List.Item
                  actions={[
                    <Button 
                      type="text" 
                      danger 
                      icon={<DeleteOutlined />}
                      onClick={() => removeHorizontalMullion(index)}
                    />
                  ]}
                >
                  <Space align="center" style={{ width: '100%' }}>
                    <span className="mullion-position-label">位置:</span>
                    <InputNumber
                      className="mullion-position-input"
                      min={0}
                      max={100}
                      step={0.1}
                      precision={1}
                      value={parseFloat((position * 100).toFixed(1))}
                      onChange={(value) => value !== null && handleMullionPositionChange('horizontal', index, parsePercentage(value))}
                      addonAfter="%"
                      controls={false}
                    />
                    {segment && segment.start !== 0 || segment?.end !== 1 ? (
                      <Tag color="blue" style={{ marginLeft: 8 }}>
                        钢笔绘制
                      </Tag>
                    ) : null}
                  </Space>
                </List.Item>
              )}
              locale={{ emptyText: '暂无横中挺' }}
              style={{ marginBottom: '16px' }}
            />
          </div>

          {/* 竖中挺列表 */}
          <div className="mullion-list">
            <Typography.Text strong>竖中挺位置</Typography.Text>
            <List
              size="small"
              bordered
              dataSource={parameters.mullions.verticalMullions.map((position, index) => ({
                position,
                segment: parameters.mullions.verticalSegments?.find(s => Math.abs(s.position - position) < 0.001)
              }))}
              renderItem={({position, segment}, index) => (
                <List.Item
                  actions={[
                    <Button 
                      type="text" 
                      danger 
                      icon={<DeleteOutlined />}
                      onClick={() => removeVerticalMullion(index)}
                    />
                  ]}
                >
                  <Space align="center" style={{ width: '100%' }}>
                    <span className="mullion-position-label">位置:</span>
                    <InputNumber
                      className="mullion-position-input"
                      min={0}
                      max={100}
                      step={0.1}
                      precision={1}
                      value={parseFloat((position * 100).toFixed(1))}
                      onChange={(value) => value !== null && handleMullionPositionChange('vertical', index, parsePercentage(value))}
                      addonAfter="%"
                      controls={false}
                    />
                    {segment && segment.start !== 0 || segment?.end !== 1 ? (
                      <Tag color="blue" style={{ marginLeft: 8 }}>
                        钢笔绘制
                      </Tag>
                    ) : null}
                  </Space>
                </List.Item>
              )}
              locale={{ emptyText: '暂无竖中挺' }}
            />
          </div>
        </div>
      </div>
    </div>
  )
} 