import React, { useState } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Typography, Avatar, Dropdown, Badge, Space, Card } from 'antd'
import { DownOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import {
  DashboardOutlined,
  MonitorOutlined,
  ThunderboltOutlined,
  ExperimentOutlined,
  AppstoreOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  PlusCircleOutlined,
  FundOutlined,
  BellOutlined,
  UserOutlined,
  DatabaseOutlined,
  ToolOutlined,
  FileTextOutlined,
  AimOutlined,
  HistoryOutlined,
  RocketOutlined,
  SolutionOutlined,
  BuildOutlined,
  BookOutlined,
  BankOutlined,
  ProfileOutlined,
} from '@ant-design/icons'

import Dashboard from './pages/Dashboard'
import RealtimeDiagnosis from './pages/RealtimeDiagnosis'
import ComprehensiveDiagnosis from './pages/ComprehensiveDiagnosis'
import CurrentSignalDiagnosis from './pages/CurrentSignalDiagnosis'
import WorkConditionLibrary from './pages/WorkConditionLibrary'
import DiagnosisHistory from './pages/DiagnosisHistory'
import LiquidMeasurement from './pages/LiquidMeasurement'
import BigDataAnalysis from './pages/BigDataAnalysis'
import NineZoneEvaluation from './pages/NineZoneEvaluation'
import IndustryStandard from './pages/IndustryStandard'
import EvaluationResult from './pages/EvaluationResult'
import RunOptimization from './pages/RunOptimization'
import OptimizationSchemeManager from './pages/OptimizationSchemeManager'
import OptimizationEffect from './pages/OptimizationEffect'
import NewWellDesign from './pages/NewWellDesign'
import PumpSelection from './pages/PumpSelection'
import DesignSchemeManager from './pages/DesignSchemeManager'
import EfficiencyAnalysis from './pages/EfficiencyAnalysis'
import { WorkOrderList, WorkOrderHistory } from './pages/WorkOrder'
import OrgTree from './components/OrgTree'
import { OrgProvider } from './contexts/OrgContext'

const { Header, Sider, Content } = Layout
const { Title } = Typography

const menuItems: MenuProps['items'] = [
  {
    key: '/',
    icon: <DashboardOutlined />,
    label: '系统总览',
  },
  { type: 'divider' },
  {
    key: 'diagnosis',
    icon: <MonitorOutlined />,
    label: '工况诊断',
    children: [
      { key: '/realtime-diagnosis', icon: <AimOutlined />, label: '工况实时诊断' },
      { key: '/comprehensive-diagnosis', icon: <AppstoreOutlined />, label: '综合参数诊断' },
      { key: '/current-signal', icon: <ThunderboltOutlined />, label: '电流信号诊断' },
      { key: '/diagnosis-history', icon: <HistoryOutlined />, label: '诊断历史追踪' },
    ],
  },
  { type: 'divider' },
  {
    key: 'optimization',
    icon: <RocketOutlined />,
    label: '运行优化',
    children: [
      { key: '/run-optimization', icon: <SettingOutlined />, label: '优化分析建议' },
      { key: '/optimization-schemes', icon: <SolutionOutlined />, label: '优化方案管理' },
      { key: '/optimization-effect', icon: <FundOutlined />, label: '优化效果跟踪' },
    ],
  },
  { type: 'divider' },
  {
    key: 'design',
    icon: <BuildOutlined />,
    label: '新井设计',
    children: [
      { key: '/new-well-design', icon: <PlusCircleOutlined />, label: '设计计算' },
      { key: '/pump-selection', icon: <ToolOutlined />, label: '泵型选型库' },
      { key: '/design-schemes', icon: <ProfileOutlined />, label: '设计方案管理' },
    ],
  },
  { type: 'divider' },
  {
    key: '/liquid-measurement',
    icon: <ExperimentOutlined />,
    label: '产液计量',
  },
  {
    key: 'data-analysis',
    icon: <DatabaseOutlined />,
    label: '大数据分析',
    children: [
      { key: '/big-data', label: '数据分析总览' },
      { key: '/nine-zone-data', label: '大数据九区分析' },
    ],
  },
  {
    key: 'evaluation',
    icon: <FileTextOutlined />,
    label: '评价体系',
    children: [
      { key: '/nine-zone', label: '宏观九区评价' },
      { key: '/industry-standard', label: '行业标准评价' },
      { key: '/evaluation-result', label: '评价结果分析' },
    ],
  },
  {
    key: '/efficiency',
    icon: <FundOutlined />,
    label: '效率分析',
  },
  { type: 'divider' },
  {
    key: 'workorder',
    icon: <FileTextOutlined />,
    label: '问题工单',
    children: [
      { key: '/workorder', icon: <FileTextOutlined />, label: '工单管理' },
      { key: '/workorder-history', icon: <FileTextOutlined />, label: '历史记录' },
    ],
  },
  { type: 'divider' },
  {
    key: 'data-manage',
    icon: <DatabaseOutlined />,
    label: '数据管理',
    children: [
      { key: '/work-condition-library', icon: <BookOutlined />, label: '工况类型库' },
    ],
  },
]

const App: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const [selectedOrg, setSelectedOrg] = useState<{ id: string; name: string; level: number } | null>(null)
  const [selectedWellCount, setSelectedWellCount] = useState(0)
  const [selectedWell, setSelectedWell] = useState<{ id: string; name: string; orgId: string } | null>(null)
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false)

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    navigate(key)
  }

  const getOpenKeys = () => {
    const path = location.pathname
    if (['/realtime-diagnosis', '/comprehensive-diagnosis', '/current-signal', '/diagnosis-history'].includes(path)) return ['diagnosis']
    if (['/work-condition-library'].includes(path)) return ['data-manage']
    if (['/run-optimization', '/optimization-schemes', '/optimization-effect'].includes(path)) return ['optimization']
    if (['/new-well-design', '/pump-selection', '/design-schemes'].includes(path)) return ['design']
    if (['/big-data', '/nine-zone-data'].includes(path)) return ['data-analysis']
    if (['/nine-zone', '/industry-standard', '/evaluation-result'].includes(path)) return ['evaluation']
    return []
  }

  const userMenu: MenuProps['items'] = [
    { key: 'profile', label: '个人信息' },
    { key: 'settings', label: '系统设置' },
    { type: 'divider' },
    { key: 'logout', label: '退出登录' },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={240}
        theme="dark"
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
        }}
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}>
          <img src="/vite.svg" alt="logo" style={{ width: 32, height: 32, marginRight: collapsed ? 0 : 10 }} />
          {!collapsed && (
            <Title level={5} style={{ color: '#fff', margin: 0, fontSize: 14, whiteSpace: 'nowrap' }}>
              ESP泵优化专家系统
            </Title>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          defaultOpenKeys={getOpenKeys()}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 80 : 240, transition: 'all 0.2s' }}>
        <Header style={{
          padding: '0 24px',
          height: 64,
          minHeight: 64,
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          position: 'sticky',
          top: 0,
          zIndex: 99,
          overflow: 'hidden',
        }}>
          <Space size={16} style={{ alignItems: 'center' }}>
            <SafetyCertificateOutlined style={{ fontSize: 18, color: '#1677ff' }} />
            <span style={{ fontSize: 15, fontWeight: 500, color: '#333' }}>
              ESP电潜泵优化设计及生产管理专家系统
            </span>
          </Space>
          <Space size={12} style={{ alignItems: 'center' }}>
            <BankOutlined style={{ fontSize: 16, color: '#1677ff' }} />
            <span style={{ fontSize: 14, color: '#333', whiteSpace: 'nowrap', lineHeight: 1 }}>组织机构</span>
            <Dropdown
              open={orgDropdownOpen}
              onOpenChange={setOrgDropdownOpen}
              dropdownRender={() => (
                <div style={{
                  background: '#fff',
                  borderRadius: 8,
                  boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
                  padding: '8px',
                  width: 240,
                }}>
                  <OrgTree
                    embedded
                    hideLevelLabels
                    onOrgSelect={(org, count) => {
                      setSelectedOrg(org)
                      setSelectedWellCount(count)
                      setOrgDropdownOpen(false)
                    }}
                    onWellSelect={(well) => {
                      setSelectedWell(well)
                      setOrgDropdownOpen(false)
                    }}
                  />
                </div>
              )}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  height: 32,
                  padding: '0 12px',
                  border: '1px solid #d9d9d9',
                  borderRadius: 6,
                  cursor: 'pointer',
                  background: '#fff',
                  minWidth: 160,
                  fontSize: 14,
                  lineHeight: 1,
                  boxSizing: 'border-box',
                }}
              >
                <span style={{ flex: 1, color: selectedOrg ? '#333' : '#bfbfbf' }}>
                  {selectedOrg?.name ?? '请选择组织机构'}
                </span>
                <DownOutlined style={{ fontSize: 12, color: '#999' }} />
              </div>
            </Dropdown>
            <span style={{ fontSize: 14, color: '#666', whiteSpace: 'nowrap' }}>
              井数量：<strong style={{ color: '#1677ff' }}>{selectedWellCount}</strong>
            </span>
            <Badge count={3} size="small">
              <BellOutlined style={{ fontSize: 18, cursor: 'pointer' }} />
            </Badge>
            <Dropdown menu={{ items: userMenu }} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#1677ff' }} />
                <span>管理员</span>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content style={{
          margin: 0,
          background: '#f5f5f5',
          minHeight: 'calc(100vh - 64vh - 64px)',
          overflow: 'auto',
        }}>
          <OrgProvider selectedOrg={selectedOrg} wellCount={selectedWellCount}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              {/* 工况诊断 */}
              <Route path="/realtime-diagnosis" element={<RealtimeDiagnosis />} />
              <Route path="/comprehensive-diagnosis" element={<ComprehensiveDiagnosis />} />
              <Route path="/current-signal" element={<CurrentSignalDiagnosis />} />
              <Route path="/work-condition-library" element={<WorkConditionLibrary />} />
              <Route path="/diagnosis-history" element={<DiagnosisHistory />} />
              {/* 运行优化 */}
              <Route path="/run-optimization" element={<RunOptimization />} />
              <Route path="/optimization-schemes" element={<OptimizationSchemeManager />} />
              <Route path="/optimization-effect" element={<OptimizationEffect />} />
              {/* 新井设计 */}
              <Route path="/new-well-design" element={<NewWellDesign />} />
              <Route path="/pump-selection" element={<PumpSelection />} />
              <Route path="/design-schemes" element={<DesignSchemeManager />} />
              {/* 其他 */}
              <Route path="/liquid-measurement" element={<LiquidMeasurement />} />
              <Route path="/big-data" element={<BigDataAnalysis />} />
              <Route path="/nine-zone-data" element={<BigDataAnalysis />} />
              <Route path="/nine-zone" element={<NineZoneEvaluation />} />
              <Route path="/industry-standard" element={<IndustryStandard />} />
              <Route path="/evaluation-result" element={<EvaluationResult />} />
              <Route path="/efficiency" element={<EfficiencyAnalysis />} />
              <Route path="/workorder" element={<WorkOrderList />} />
              <Route path="/workorder-history" element={<WorkOrderHistory />} />
            </Routes>
          </OrgProvider>
        </Content>
      </Layout>
    </Layout>
  )
}

export default App
