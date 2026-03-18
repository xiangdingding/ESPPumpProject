import React, { useState, useMemo } from 'react'
import { Row, Col, Card, Typography, Table, Tag, Descriptions, Empty, Badge, Space } from 'antd'
import { CheckCircleOutlined, InfoCircleOutlined } from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { nineZoneConfig, wellList } from '../../mock/wellData'
import type { NineZoneData } from '../../mock/wellData'

const { Title, Text, Paragraph } = Typography

const supplyLabels = ['供液不足', '供液正常', '供液充足']
const paramLabels = ['参数偏低', '参数合理', '参数偏高']

const NineZoneEvaluation: React.FC = () => {
  const [selectedZone, setSelectedZone] = useState<NineZoneData | null>(nineZoneConfig[4])

  const activeWells = wellList.filter(w => w.status !== 'offline')
  const totalWithZone = nineZoneConfig.reduce((s, z) => s + z.wellCount, 0)

  const selectedWells = useMemo(() => {
    if (!selectedZone) return []
    return wellList.filter(w => selectedZone.wells.includes(w.id))
  }, [selectedZone])

  const pieOption = {
    tooltip: { trigger: 'item' as const, formatter: '{b}: {c}口 ({d}%)' },
    legend: { type: 'scroll' as const, bottom: 0, textStyle: { fontSize: 11 } },
    series: [{
      type: 'pie',
      radius: ['35%', '65%'],
      center: ['50%', '45%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, formatter: '{b}\n{d}%', fontSize: 11 },
      data: nineZoneConfig.filter(z => z.wellCount > 0).map(z => ({
        name: z.zoneName,
        value: z.wellCount,
        itemStyle: { color: z.color },
      })),
    }],
  }

  const barOption = {
    tooltip: { trigger: 'axis' as const },
    grid: { left: 50, right: 20, bottom: 60, top: 20 },
    xAxis: {
      type: 'category' as const,
      data: nineZoneConfig.map(z => z.zoneName.replace('-', '\n')),
      axisLabel: { rotate: 30, fontSize: 10, interval: 0 },
    },
    yAxis: { type: 'value' as const, name: '井数', minInterval: 1 },
    series: [{
      type: 'bar',
      data: nineZoneConfig.map(z => ({
        value: z.wellCount,
        itemStyle: { color: z.color },
      })),
      barMaxWidth: 40,
    }],
  }

  const wellColumns = [
    { title: '井号', dataIndex: 'name', key: 'name', width: 120 },
    { title: '油田', dataIndex: 'oilField', key: 'oilField', width: 90 },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 70,
      render: (s: string) => (
        <Tag color={s === 'alarm' ? 'red' : s === 'warning' ? 'orange' : 'green'}>
          {s === 'alarm' ? '报警' : s === 'warning' ? '预警' : '正常'}
        </Tag>
      ),
    },
    { title: '泵效(%)', dataIndex: 'efficiency', key: 'efficiency', width: 80 },
    { title: '日产液(t)', dataIndex: 'dailyLiquid', key: 'dailyLiquid', width: 90 },
    { title: '含水率(%)', dataIndex: 'waterCut', key: 'waterCut', width: 90 },
    { title: '频率(Hz)', dataIndex: 'frequency', key: 'frequency', width: 80 },
    { title: '沉没度(m)', dataIndex: 'submergence', key: 'submergence', width: 90 },
  ]

  const normalZone = nineZoneConfig.find(z => z.zone === 5)
  const normalPercent = normalZone ? normalZone.percentage : 0
  const insufficientCount = nineZoneConfig.filter(z => z.zone <= 3).reduce((s, z) => s + z.wellCount, 0)
  const sufficientCount = nineZoneConfig.filter(z => z.zone >= 7).reduce((s, z) => s + z.wellCount, 0)

  return (
    <div className="page-container">
      <Title level={4} style={{ marginBottom: 20 }}>宏观九区评价</Title>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card title="九区图评价" extra={<Text type="secondary">点击区域查看详情</Text>}>
            <div style={{ maxWidth: 560, margin: '0 auto' }}>
              <Row gutter={[0, 0]} style={{ marginBottom: 4 }}>
                <Col span={8} />
                {paramLabels.map(label => (
                  <Col span={8} key={label} style={{ textAlign: 'center' }}>
                    <Text strong style={{ fontSize: 12 }}>{label}</Text>
                  </Col>
                ))}
              </Row>

              <div style={{ display: 'flex', gap: 4 }}>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', width: 56, flexShrink: 0 }}>
                  {supplyLabels.map(label => (
                    <div key={label} style={{ writingMode: 'vertical-rl', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#666' }}>
                      {label}
                    </div>
                  ))}
                </div>

                <div className="nine-zone-grid" style={{ flex: 1 }}>
                  {nineZoneConfig.map(zone => (
                    <div
                      key={zone.zone}
                      className="nine-zone-cell"
                      style={{
                        backgroundColor: zone.color,
                        border: selectedZone?.zone === zone.zone ? '3px solid #333' : '2px solid transparent',
                        flexDirection: 'column',
                        gap: 4,
                      }}
                      onClick={() => setSelectedZone(zone)}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{zone.zoneName.split('-')[1]}</div>
                      <div style={{ fontSize: 20, fontWeight: 700 }}>{zone.wellCount}</div>
                      <div style={{ fontSize: 11, opacity: 0.9 }}>{zone.percentage}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card
            title={selectedZone ? `区域详情 - ${selectedZone.zoneName}` : '区域详情'}
            style={{ height: '100%' }}
          >
            {selectedZone ? (
              <>
                <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
                  <Descriptions.Item label="区域编号">第 {selectedZone.zone} 区</Descriptions.Item>
                  <Descriptions.Item label="区域名称">
                    <Tag color={selectedZone.color} style={{ color: '#fff' }}>{selectedZone.zoneName}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="井数">{selectedZone.wellCount} 口</Descriptions.Item>
                  <Descriptions.Item label="占比">{selectedZone.percentage}%</Descriptions.Item>
                  <Descriptions.Item label="调整建议">
                    <Space>
                      <InfoCircleOutlined style={{ color: '#1677ff' }} />
                      <Text>{selectedZone.suggestion}</Text>
                    </Space>
                  </Descriptions.Item>
                </Descriptions>

                {selectedWells.length > 0 ? (
                  <Table
                    columns={wellColumns}
                    dataSource={selectedWells}
                    rowKey="id"
                    size="small"
                    pagination={false}
                    scroll={{ x: 700, y: 200 }}
                  />
                ) : (
                  <Empty description="该区域暂无井" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </>
            ) : (
              <Empty description="请点击九区图选择区域" />
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card className="chart-card" title="九区分布饼图">
            <ReactECharts option={pieOption} style={{ height: 340 }} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card className="chart-card" title="各区域井数统计">
            <ReactECharts option={barOption} style={{ height: 340 }} />
          </Card>
        </Col>
      </Row>

      <Card title="总体评价结论" style={{ marginTop: 16 }}>
        <Row gutter={[24, 16]}>
          <Col xs={24} md={8}>
            <Card size="small" style={{ background: '#f6ffed', borderColor: '#b7eb8f' }}>
              <Space>
                <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />
                <div>
                  <Text strong>正常工况井</Text>
                  <div>
                    <Text style={{ fontSize: 24, fontWeight: 700, color: '#52c41a' }}>{normalZone?.wellCount || 0}</Text>
                    <Text type="secondary"> 口 ({normalPercent}%)</Text>
                  </div>
                </div>
              </Space>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card size="small" style={{ background: '#fff7e6', borderColor: '#ffd591' }}>
              <Space>
                <Badge status="warning" />
                <div>
                  <Text strong>供液不足井</Text>
                  <div>
                    <Text style={{ fontSize: 24, fontWeight: 700, color: '#faad14' }}>{insufficientCount}</Text>
                    <Text type="secondary"> 口 ({totalWithZone > 0 ? Math.round(insufficientCount / totalWithZone * 1000) / 10 : 0}%)</Text>
                  </div>
                </div>
              </Space>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card size="small" style={{ background: '#e6f7ff', borderColor: '#91d5ff' }}>
              <Space>
                <Badge status="processing" />
                <div>
                  <Text strong>供液充足井(增产潜力)</Text>
                  <div>
                    <Text style={{ fontSize: 24, fontWeight: 700, color: '#1677ff' }}>{sufficientCount}</Text>
                    <Text type="secondary"> 口 ({totalWithZone > 0 ? Math.round(sufficientCount / totalWithZone * 1000) / 10 : 0}%)</Text>
                  </div>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>
        <Paragraph style={{ marginTop: 16, padding: '12px 16px', background: '#fafafa', borderRadius: 6, lineHeight: 1.8 }}>
          <Text strong>综合评价：</Text>
          当前共有 {activeWells.length} 口在线井参与九区评价分析。其中 {normalPercent}% 的井处于第5区（供液正常-参数合理），
          属于最优工况区域。供液不足区域有 {insufficientCount} 口井，建议降低排量或优化供液条件；
          供液充足区域有 {sufficientCount} 口井，具有增产潜力，建议适当提高频率以增加产量。
          整体工况分布较为合理，但仍有 {Math.round((1 - normalPercent / 100) * 100)}% 的井需要参数调整优化。
        </Paragraph>
      </Card>
    </div>
  )
}

export default NineZoneEvaluation
