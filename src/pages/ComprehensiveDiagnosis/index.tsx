import React, { useState, useMemo } from 'react'
import { Row, Col, Card, Select, Table, Tag, Space, Alert, List, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  DisconnectOutlined,
  MedicineBoxOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { wellList, diagnosisRecords } from '../../mock/wellData'
import type { WellInfo } from '../../mock/wellData'

const { Text } = Typography

const statusColorMap: Record<string, string> = {
  normal: 'green',
  warning: 'orange',
  alarm: 'red',
  offline: 'default',
}

const statusTextMap: Record<string, string> = {
  normal: '正常',
  warning: '预警',
  alarm: '报警',
  offline: '离线',
}

const statusIconMap: Record<string, React.ReactNode> = {
  normal: <CheckCircleOutlined />,
  warning: <WarningOutlined />,
  alarm: <CloseCircleOutlined />,
  offline: <DisconnectOutlined />,
}

const generateSuggestions = (well: WellInfo): { level: 'success' | 'warning' | 'error'; text: string }[] => {
  const suggestions: { level: 'success' | 'warning' | 'error'; text: string }[] = []
  if (well.status === 'offline') {
    suggestions.push({ level: 'error', text: '设备离线，请检查通信链路和供电系统。' })
    return suggestions
  }
  if (well.efficiency < 25) suggestions.push({ level: 'error', text: `泵效仅${well.efficiency}%，严重偏低，建议安排检泵作业。` })
  else if (well.efficiency < 35) suggestions.push({ level: 'warning', text: `泵效${well.efficiency}%偏低，建议优化运行参数。` })
  else suggestions.push({ level: 'success', text: `泵效${well.efficiency}%，处于合理范围。` })

  if (well.temperature > 100) suggestions.push({ level: 'error', text: `电机温度${well.temperature}°C过高，存在烧毁风险，建议降频运行。` })
  else if (well.temperature > 90) suggestions.push({ level: 'warning', text: `电机温度${well.temperature}°C偏高，请持续关注。` })

  if (well.vibration > 5) suggestions.push({ level: 'error', text: `振动值${well.vibration}mm/s超标，可能存在机械故障。` })
  else if (well.vibration > 3.5) suggestions.push({ level: 'warning', text: `振动值${well.vibration}mm/s偏高，建议排查原因。` })

  if (well.submergence < 200) suggestions.push({ level: 'error', text: `沉没度${well.submergence}m过低，存在干抽风险。` })
  else if (well.submergence < 300) suggestions.push({ level: 'warning', text: `沉没度${well.submergence}m偏低，建议适当降频。` })

  if (well.waterCut > 80) suggestions.push({ level: 'warning', text: `含水率${well.waterCut}%偏高，建议评估增产措施。` })

  if (suggestions.length === 0 || suggestions.every(s => s.level === 'success')) {
    suggestions.push({ level: 'success', text: '各项参数正常，建议维持当前运行方案。' })
  }
  return suggestions
}

const ComprehensiveDiagnosis: React.FC = () => {
  const [selectedOilField, setSelectedOilField] = useState<string>('all')
  const [selectedPumpType, setSelectedPumpType] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedWellIds, setSelectedWellIds] = useState<string[]>([wellList[0].id])
  const [compareWellIds, setCompareWellIds] = useState<string[]>([wellList[0].id, wellList[2].id])

  const oilFields = useMemo(() => [...new Set(wellList.map(w => w.oilField))], [])

  const filteredWells = useMemo(() => {
    return wellList.filter(w => {
      if (selectedOilField !== 'all' && w.oilField !== selectedOilField) return false
      if (selectedPumpType !== 'all' && w.pumpType !== selectedPumpType) return false
      if (selectedStatus !== 'all' && w.status !== selectedStatus) return false
      return true
    })
  }, [selectedOilField, selectedPumpType, selectedStatus])

  const selectedWell = useMemo(
    () => wellList.find(w => w.id === selectedWellIds[0]) || wellList[0],
    [selectedWellIds]
  )

  const columns: ColumnsType<WellInfo> = [
    { title: '井名', dataIndex: 'name', key: 'name', width: 110, fixed: 'left' as const, sorter: (a, b) => a.name.localeCompare(b.name) },
    {
      title: '泵型', dataIndex: 'pumpType', key: 'pumpType', width: 80,
      render: (v: string) => <Tag color={v === 'ESP' ? 'blue' : 'green'}>{v}</Tag>,
      filters: [{ text: 'ESP', value: 'ESP' }, { text: 'PCP', value: 'PCP' }],
      onFilter: (val, record) => record.pumpType === val,
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 80,
      render: (s: string) => <Tag icon={statusIconMap[s]} color={statusColorMap[s]}>{statusTextMap[s]}</Tag>,
      filters: Object.entries(statusTextMap).map(([k, v]) => ({ text: v, value: k })),
      onFilter: (val, record) => record.status === val,
    },
    { title: '日产液(t)', dataIndex: 'dailyLiquid', key: 'dailyLiquid', width: 90, sorter: (a, b) => a.dailyLiquid - b.dailyLiquid },
    { title: '日产油(t)', dataIndex: 'dailyOil', key: 'dailyOil', width: 90, sorter: (a, b) => a.dailyOil - b.dailyOil },
    {
      title: '含水率(%)', dataIndex: 'waterCut', key: 'waterCut', width: 95,
      sorter: (a, b) => a.waterCut - b.waterCut,
      render: (v: number) => <span style={{ color: v > 80 ? '#ff4d4f' : undefined }}>{v}</span>,
    },
    {
      title: '泵效(%)', dataIndex: 'efficiency', key: 'efficiency', width: 85,
      sorter: (a, b) => a.efficiency - b.efficiency,
      render: (v: number) => <span style={{ color: v < 30 ? '#ff4d4f' : v < 40 ? '#faad14' : '#52c41a', fontWeight: 600 }}>{v}</span>,
    },
    { title: '电流(A)', dataIndex: 'current', key: 'current', width: 85, sorter: (a, b) => a.current - b.current },
    {
      title: '温度(°C)', dataIndex: 'temperature', key: 'temperature', width: 90,
      sorter: (a, b) => a.temperature - b.temperature,
      render: (v: number) => <span style={{ color: v > 95 ? '#ff4d4f' : v > 85 ? '#faad14' : undefined }}>{v}</span>,
    },
    {
      title: '振动(mm/s)', dataIndex: 'vibration', key: 'vibration', width: 100,
      sorter: (a, b) => a.vibration - b.vibration,
      render: (v: number) => <span style={{ color: v > 5 ? '#ff4d4f' : v > 3.5 ? '#faad14' : undefined }}>{v}</span>,
    },
    { title: '沉没度(m)', dataIndex: 'submergence', key: 'submergence', width: 95, sorter: (a, b) => a.submergence - b.submergence },
  ]

  const radarOption = useMemo(() => {
    const w = selectedWell
    const indicators = [
      { name: '泵效', max: 70 },
      { name: '日产液', max: 100 },
      { name: '日产油', max: 40 },
      { name: '温度安全', max: 100 },
      { name: '振动安全', max: 100 },
      { name: '沉没度', max: 100 },
    ]
    const tempSafe = Math.max(0, 100 - Math.max(0, w.temperature - 60) * 2.5)
    const vibSafe = Math.max(0, 100 - w.vibration * 15)
    const subScore = Math.min(100, w.submergence / 5)
    return {
      tooltip: {},
      radar: {
        indicator: indicators,
        shape: 'circle' as const,
        splitArea: { areaStyle: { color: ['rgba(22,119,255,0.02)', 'rgba(22,119,255,0.05)'] } },
      },
      series: [{
        type: 'radar',
        data: [{
          value: [w.efficiency, w.dailyLiquid, w.dailyOil, tempSafe, vibSafe, subScore],
          name: w.name,
          areaStyle: { color: 'rgba(22,119,255,0.15)' },
          lineStyle: { color: '#1677ff', width: 2 },
          itemStyle: { color: '#1677ff' },
        }],
      }],
    }
  }, [selectedWell])

  const compareOption = useMemo(() => {
    const compareWells = compareWellIds.map(id => wellList.find(w => w.id === id)).filter(Boolean) as WellInfo[]
    const params = ['dailyLiquid', 'dailyOil', 'efficiency', 'current', 'temperature', 'vibration'] as const
    const paramLabels: Record<string, string> = {
      dailyLiquid: '日产液(t)', dailyOil: '日产油(t)', efficiency: '泵效(%)',
      current: '电流(A)', temperature: '温度(°C)', vibration: '振动(mm/s)',
    }
    const colors = ['#1677ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#13c2c2']
    return {
      tooltip: { trigger: 'axis' as const },
      legend: { data: compareWells.map(w => w.name), bottom: 0 },
      grid: { top: 30, right: 20, bottom: 50, left: 50 },
      xAxis: { type: 'category' as const, data: params.map(p => paramLabels[p]), axisLabel: { fontSize: 11 } },
      yAxis: { type: 'value' as const },
      series: compareWells.map((w, i) => ({
        name: w.name,
        type: 'bar',
        data: params.map(p => w[p]),
        itemStyle: { color: colors[i % colors.length], borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 30,
      })),
    }
  }, [compareWellIds])

  const suggestions = useMemo(() => generateSuggestions(selectedWell), [selectedWell])

  const relatedRecords = useMemo(
    () => diagnosisRecords.filter(r => r.wellId === selectedWell.id),
    [selectedWell]
  )

  return (
    <div className="page-container">
      <Card bodyStyle={{ padding: '12px 20px' }} style={{ marginBottom: 16 }}>
        <Space size={16} wrap>
          <Space>
            <span style={{ fontWeight: 500 }}>油田：</span>
            <Select value={selectedOilField} onChange={setSelectedOilField} style={{ width: 140 }}>
              <Select.Option value="all">全部油田</Select.Option>
              {oilFields.map(f => <Select.Option key={f} value={f}>{f}</Select.Option>)}
            </Select>
          </Space>
          <Space>
            <span style={{ fontWeight: 500 }}>泵型：</span>
            <Select value={selectedPumpType} onChange={setSelectedPumpType} style={{ width: 120 }}>
              <Select.Option value="all">全部</Select.Option>
              <Select.Option value="ESP">电潜泵(ESP)</Select.Option>
              <Select.Option value="PCP">螺杆泵(PCP)</Select.Option>
            </Select>
          </Space>
          <Space>
            <span style={{ fontWeight: 500 }}>状态：</span>
            <Select value={selectedStatus} onChange={setSelectedStatus} style={{ width: 120 }}>
              <Select.Option value="all">全部</Select.Option>
              <Select.Option value="normal">正常</Select.Option>
              <Select.Option value="warning">预警</Select.Option>
              <Select.Option value="alarm">报警</Select.Option>
              <Select.Option value="offline">离线</Select.Option>
            </Select>
          </Space>
        </Space>
      </Card>

      <Card title={`综合参数总览（${filteredWells.length}口井）`} style={{ marginBottom: 16 }} className="chart-card">
        <Table<WellInfo>
          columns={columns}
          dataSource={filteredWells}
          rowKey="id"
          size="small"
          scroll={{ x: 1100 }}
          pagination={{ pageSize: 8, showSizeChanger: true, showTotal: t => `共 ${t} 条` }}
          rowSelection={{
            type: 'radio',
            selectedRowKeys: selectedWellIds,
            onChange: (keys) => setSelectedWellIds(keys as string[]),
          }}
          onRow={(record) => ({
            onClick: () => setSelectedWellIds([record.id]),
            style: { cursor: 'pointer' },
          })}
        />
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <Card title={`${selectedWell.name} - 多维参数雷达图`} className="chart-card">
            <ReactECharts option={radarOption} style={{ height: 350 }} />
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <Card
            title="参数对比"
            className="chart-card"
            extra={
              <Select
                mode="multiple"
                value={compareWellIds}
                onChange={setCompareWellIds}
                style={{ width: 320 }}
                maxTagCount={3}
                placeholder="选择对比井"
                options={wellList.filter(w => w.status !== 'offline').map(w => ({
                  value: w.id, label: w.name,
                }))}
              />
            }
          >
            <ReactECharts option={compareOption} style={{ height: 350 }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={14}>
          <Card
            title={<Space><MedicineBoxOutlined style={{ color: '#1677ff' }} /><span>{selectedWell.name} - 诊断建议</span></Space>}
            className="chart-card"
          >
            <List
              dataSource={suggestions}
              renderItem={(item) => (
                <List.Item style={{ padding: '8px 0' }}>
                  <Alert
                    type={item.level}
                    message={item.text}
                    showIcon
                    style={{ width: '100%' }}
                    banner
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="相关诊断记录" className="chart-card">
            {relatedRecords.length > 0 ? (
              <List
                dataSource={relatedRecords}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <Space>
                          <Tag color={statusColorMap[item.status]}>{item.type}</Tag>
                          <Text type="secondary" style={{ fontSize: 12 }}>{item.time}</Text>
                        </Space>
                      }
                      description={item.description}
                    />
                  </List.Item>
                )}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#8c8c8c' }}>
                暂无该井的诊断记录
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default ComprehensiveDiagnosis
