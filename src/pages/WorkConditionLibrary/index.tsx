import React, { useState, useMemo } from 'react'
import {
  Card, Input, Select, Row, Col, Tag, Badge, Collapse, List, Empty, Space, Descriptions, Divider,
} from 'antd'
import {
  SearchOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  ExperimentOutlined,
  ProfileOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import {
  workConditionTypes,
} from '../../mock/wellData'
import type { WorkConditionType } from '../../mock/wellData'

const categoryLabelMap: Record<string, string> = {
  normal: '正常',
  supply: '供液问题',
  gas: '气体影响',
  pump: '泵故障',
  rod: '杆故障',
  other: '其他',
}

const categoryColorMap: Record<string, string> = {
  normal: '#52c41a',
  supply: '#1677ff',
  gas: '#722ed1',
  pump: '#fa8c16',
  rod: '#f5222d',
  other: '#8c8c8c',
}

const severityTagMap: Record<string, { color: string; label: string }> = {
  info: { color: 'blue', label: '一般' },
  warning: { color: 'orange', label: '警告' },
  danger: { color: 'red', label: '严重' },
}

const severityIconMap: Record<string, React.ReactNode> = {
  info: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
  warning: <WarningOutlined style={{ color: '#faad14' }} />,
  danger: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
}

const categoryOptions = [
  { value: 'all', label: '全部类别' },
  { value: 'normal', label: '正常' },
  { value: 'supply', label: '供液问题' },
  { value: 'gas', label: '气体影响' },
  { value: 'pump', label: '泵故障' },
  { value: 'rod', label: '杆故障' },
  { value: 'other', label: '其他' },
]

const WorkConditionLibrary: React.FC = () => {
  const [searchText, setSearchText] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [expandedCode, setExpandedCode] = useState<string | null>(null)

  const filteredTypes = useMemo(() => {
    return workConditionTypes.filter(wc => {
      const matchSearch = !searchText ||
        wc.name.includes(searchText) ||
        wc.mechanism.includes(searchText) ||
        wc.features.some(f => f.includes(searchText))
      const matchCategory = categoryFilter === 'all' || wc.category === categoryFilter
      return matchSearch && matchCategory
    })
  }, [searchText, categoryFilter])


  const getTypicalCurrentOption = (code: string) => {
    const wc = workConditionTypes.find(w => w.code === code)
    const color = categoryColorMap[wc?.category || 'other'] || '#1677ff'
    const pts = 60
    const baseA = code === 'C06' ? 28 : code === 'C02' ? 5 : code === 'C05' ? 22 : code === 'C01' ? 25 : code === 'C07' ? 38 : code === 'C08' ? 15 : code === 'C03' ? 35 : code === 'C04' ? 30 : code === 'C11' ? 4 : code === 'C10' ? 32 : code === 'C12' ? 27 : 28
    const noise = code === 'C06' ? 0.8 : code === 'C02' ? 8 : code === 'C05' ? 4 : code === 'C01' ? 5 : code === 'C10' ? 6 : code === 'C11' ? 1 : 2
    const trend = code === 'C04' ? 0.08 : code === 'C05' ? -0.06 : code === 'C07' ? 0.1 : 0
    const data: number[][] = []
    for (let i = 0; i < pts; i++) {
      const t = i * 0.5
      const v = baseA + trend * i + (Math.sin(i * 0.5) * noise * 0.5) + (Math.random() - 0.5) * noise
      data.push([t, Math.round(v * 10) / 10])
    }
    return {
      title: { text: '典型电流信号特征', left: 'center', textStyle: { fontSize: 12, color: '#666' } },
      tooltip: { trigger: 'axis' as const, formatter: (params: any) => `时间: ${params[0].data[0]}s<br/>电流: ${params[0].data[1]} A` },
      grid: { top: 35, right: 20, bottom: 30, left: 50 },
      xAxis: { type: 'value' as const, name: '时间(s)', nameTextStyle: { fontSize: 10, color: '#999' }, axisLabel: { fontSize: 10, color: '#999' }, axisLine: { lineStyle: { color: '#ddd' } } },
      yAxis: { type: 'value' as const, name: '电流(A)', nameTextStyle: { fontSize: 10, color: '#999' }, axisLabel: { fontSize: 10, color: '#999' }, axisLine: { lineStyle: { color: '#ddd' } } },
      series: [{
        type: 'line', data, smooth: true, symbol: 'none',
        areaStyle: { opacity: 0.1, color },
        lineStyle: { width: 2, color },
      }],
    }
  }

  const renderConditionCard = (wc: WorkConditionType) => {
    const isExpanded = expandedCode === wc.code
    const sevTag = severityTagMap[wc.severity]
    return (
      <Col xs={24} sm={12} lg={8} key={wc.code}>
        <Card
          size="small"
          hoverable
          style={{
            marginBottom: 16,
            borderLeft: `4px solid ${categoryColorMap[wc.category]}`,
            cursor: 'pointer',
          }}
          onClick={() => setExpandedCode(isExpanded ? null : wc.code)}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#333', marginRight: 8 }}>
                {severityIconMap[wc.severity]} {wc.name}
              </span>
            </div>
            <Tag color={sevTag.color}>{sevTag.label}</Tag>
          </div>

          <div style={{ marginBottom: 8 }}>
            <Tag color={categoryColorMap[wc.category]} style={{ borderRadius: 10 }}>
              {categoryLabelMap[wc.category]}
            </Tag>
          </div>

          <div style={{ fontSize: 12, color: '#666', lineHeight: 1.6 }}>
            {wc.mechanism}
          </div>

          {isExpanded && (
            <div style={{ marginTop: 12 }} onClick={e => e.stopPropagation()}>
              <Divider style={{ margin: '8px 0' }} />

              <ReactECharts option={getTypicalCurrentOption(wc.code)} style={{ height: 220 }} />

              <Divider style={{ margin: '12px 0 8px' }} />
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
                <ExperimentOutlined /> 特征表现
              </div>
              <List
                size="small"
                dataSource={wc.features}
                renderItem={item => (
                  <List.Item style={{ padding: '3px 0', border: 'none', fontSize: 12, color: '#555' }}>
                    <Badge status="processing" text={item} />
                  </List.Item>
                )}
              />

              <Divider style={{ margin: '8px 0' }} />
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
                <ProfileOutlined /> 处理建议
              </div>
              <List
                size="small"
                dataSource={wc.suggestions}
                renderItem={(item, idx) => (
                  <List.Item style={{ padding: '3px 0', border: 'none', fontSize: 12, color: '#555' }}>
                    <Tag color="orange" style={{ minWidth: 20, textAlign: 'center' }}>{idx + 1}</Tag> {item}
                  </List.Item>
                )}
              />

            </div>
          )}
        </Card>
      </Col>
    )
  }

  return (
    <div className="page-container" style={{ padding: 20, background: '#f0f2f5', minHeight: '100%' }}>
      {/* 顶部搜索栏 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Input
              placeholder="搜索工况名称、描述、特征..."
              prefix={<SearchOutlined style={{ color: '#bbb' }} />}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              allowClear
              style={{ maxWidth: 400 }}
            />
          </Col>
          <Col>
            <Space>
              <span style={{ color: '#888' }}>类别筛选：</span>
              <Select
                value={categoryFilter}
                onChange={setCategoryFilter}
                options={categoryOptions}
                style={{ width: 140 }}
              />
            </Space>
          </Col>
          <Col>
            <span style={{ color: '#999', fontSize: 13 }}>
              共 <strong style={{ color: '#1677ff' }}>{filteredTypes.length}</strong> 种工况类型
            </span>
          </Col>
        </Row>
      </Card>

      {/* 工况卡片列表 */}
      {filteredTypes.length > 0 ? (
        <Row gutter={16}>
          {filteredTypes.map(wc => renderConditionCard(wc))}
        </Row>
      ) : (
        <Card>
          <Empty description="没有匹配的工况类型" />
        </Card>
      )}

    </div>
  )
}

export default WorkConditionLibrary
