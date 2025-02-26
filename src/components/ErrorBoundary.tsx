import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Text } from '@react-three/drei';

interface Props {
  children: ReactNode;
  is3D?: boolean; // 标识是否在 Three.js 环境中
}

interface State {
  hasError: boolean;
  error: Error | null;
  is3DError: boolean; // 新增：标识是否是Three.js相关错误
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    is3DError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    // 检查错误是否与Three.js相关
    const errorMessage = error.toString();
    const isThreeJsError = 
      errorMessage.includes('THREE namespace') || 
      errorMessage.includes('R3F:') ||
      errorMessage.includes('react-three-fiber');
    
    return { 
      hasError: true, 
      error,
      is3DError: isThreeJsError
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('渲染错误:', error);
    console.error('错误信息:', errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      // 如果是Three.js相关错误或者明确指定了is3D=true，使用Three.js兼容内容
      if (this.props.is3D || this.state.is3DError) {
        return (
          <group position={[0, 0, 1]}>
            <Text
              position={[0, 0, 0]}
              fontSize={0.1}
              color="#ff0000"
              anchorX="center"
              anchorY="middle"
              maxWidth={2}
            >
              渲染出现错误
            </Text>
          </group>
        );
      }
      
      // 在普通DOM环境中渲染HTML
      return (
        <div style={{
          padding: '20px',
          backgroundColor: '#fff1f0',
          border: '1px solid #ffa39e',
          borderRadius: '4px',
          margin: '20px'
        }}>
          <h2>渲染出现错误</h2>
          <p style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error && this.state.error.toString()}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
} 