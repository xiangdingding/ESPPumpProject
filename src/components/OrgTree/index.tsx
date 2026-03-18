import React, { useState, useEffect, useMemo } from 'react'
import { Tree, Card, Empty, Spin, Tag } from 'antd'
import { BankOutlined, ProjectOutlined, GoldOutlined, EnvironmentOutlined, HomeOutlined, ClusterOutlined } from '@ant-design/icons'
import type { DataNode, EventDataNode } from 'antd/es/tree'
import { orgList, OrgNode as DbOrgNode, getOrgLevel } from '../../mock/orgData'
import { wellDbList } from '../../mock/wellDbData'

// 转换数据库组织机构为树形结构
interface OrgTreeNode {
  key: string
  orgId: string
  orgName: string
  orgLevel: number
  children: OrgTreeNode[]
  wellCount?: number
  isLeaf?: boolean
}

interface OrgTreeProps {
  onOrgSelect?: (org: { id: string; name: string; level: number } | null, wellCount: number) => void
  onWellSelect?: (well: { id: string; name: string; orgId: string }) => void
  /** 不显示“国家”“项目”“油田”等层级标签 */
  hideLevelLabels?: boolean
  /** 嵌入模式：不包 Card，用于下拉框内 */
  embedded?: boolean
}

const getLevelIcon = (level: number, isWell: boolean = false) => {
  if (isWell) return <ClusterOutlined style={{ color: '#eb2f96' }} />
  switch (level) {
    case 1: return <BankOutlined style={{ color: '#1677ff' }} />
    case 2: return <ProjectOutlined style={{ color: '#722ed1' }} />
    case 3: return <GoldOutlined style={{ color: '#fa8c16' }} />
    case 4: return <EnvironmentOutlined style={{ color: '#52c41a' }} />
    case 5: return <HomeOutlined style={{ color: '#13c2c2' }} />
    default: return <BankOutlined />
  }
}

const getLevelColor = (level: number) => {
  switch (level) {
    case 1: return '#1677ff'
    case 2: return '#722ed1'
    case 3: return '#fa8c16'
    case 4: return '#52c41a'
    case 5: return '#13c2c2'
    default: return '#999'
  }
}

const getLevelName = (level: number) => {
  switch (level) {
    case 1: return '国家'
    case 2: return '项目'
    case 3: return '油田'
    case 4: return '区块'
    case 5: return '区块'
    default: return '未知'
  }
}

// 构建树形结构
function buildOrgTree(orgs: DbOrgNode[], wells: any[]): OrgTreeNode[] {
  const orgMap = new Map<string, OrgTreeNode>()
  const rootNodes: OrgTreeNode[] = []

  // 先按Org_Id排序，确保父节点在子节点之前处理
  const sortedOrgs = [...orgs].sort((a, b) => a.Org_Id.localeCompare(b.Org_Id))

  // 计算每个区块的井数量
  const wellCounts = new Map<string, number>()
  wells.forEach(well => {
    const orgId = well.Org_Id
    if (orgId) {
      wellCounts.set(orgId, (wellCounts.get(orgId) || 0) + 1)
    }
  })

  // 创建所有节点的映射
  sortedOrgs.forEach(org => {
    const level = getOrgLevel(org)
    const isLeaf = level === 5 || (level === 4 && !wellCounts.has(org.Org_Id))
    orgMap.set(org.Org_Id, {
      key: org.Org_Id,
      orgId: org.Org_Id,
      orgName: org.Org_Name,
      orgLevel: level,
      children: [],
      wellCount: wellCounts.get(org.Org_Id) || 0,
      isLeaf
    })
  })

  // 构建树
  sortedOrgs.forEach(org => {
    const node = orgMap.get(org.Org_Id)!
    if (org.Parent_Id && orgMap.has(org.Parent_Id)) {
      orgMap.get(org.Parent_Id)!.children.push(node)
    } else {
      rootNodes.push(node)
    }
  })

  // 为区块添加井节点
  rootNodes.forEach(addWellsToNode)

  return rootNodes
}

function addWellsToNode(node: OrgTreeNode): void {
  if (node.orgLevel === 4) {
    // 找到该区块下的所有井
    const wellsInBlock = wellDbList.filter(w => w.Org_Id === node.orgId)
    wellsInBlock.forEach(well => {
      node.children.push({
        key: `well_${well.Well_Id}`,
        orgId: well.Well_Id,
        orgName: well.Well_Name || well.Well_Id,
        orgLevel: 6,
        children: [],
        isLeaf: true
      })
    })
  } else if (node.children.length > 0) {
    node.children.forEach(addWellsToNode)
  }
}

// 递归构建树节点
function buildTreeNodes(orgs: OrgTreeNode[], hideLevelLabels?: boolean): DataNode[] {
  return orgs.map(org => {
    const isWell = org.orgLevel === 6
    const children = org.children.length > 0
      ? buildTreeNodes(org.children, hideLevelLabels)
      : undefined

    return {
      key: org.key,
      title: (
        <span style={{ padding: '2px 0', display: 'flex', alignItems: 'center' }}>
          {getLevelIcon(org.orgLevel, isWell)}
          <span style={{ marginLeft: 8 }}>{org.orgName}</span>
          {!isWell && org.wellCount !== undefined && org.wellCount > 0 && (
            <Tag color="blue" style={{ marginLeft: 8 }}>{org.wellCount}</Tag>
          )}
          {!isWell && !hideLevelLabels && (
            <Tag color={getLevelColor(org.orgLevel)} style={{ marginLeft: 4, fontSize: 10 }}>
              {org.orgLevel === 6 ? '井' : getLevelName(org.orgLevel)}
            </Tag>
          )}
        </span>
      ),
      children,
      isLeaf: org.isLeaf,
    }
  })
}

const OrgTree: React.FC<OrgTreeProps> = ({ onOrgSelect, onWellSelect, hideLevelLabels = false, embedded = false }) => {
  const [orgTreeData, setOrgTreeData] = useState<OrgTreeNode[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedKeys, setExpandedKeys] = useState<string[]>([])

  // 构建树数据
  const treeData = useMemo(() => {
    if (orgTreeData.length === 0) return []
    return buildTreeNodes(orgTreeData, hideLevelLabels)
  }, [orgTreeData, hideLevelLabels])

  // 加载数据
  useEffect(() => {
    try {
      // 直接使用mock数据构建树
      const tree = buildOrgTree(orgList, wellDbList)
      setOrgTreeData(tree)

      // 默认展开前两级
      const defaultExpand: string[] = []
      tree.forEach(org => {
        defaultExpand.push(org.key)
        org.children.forEach(child => {
          defaultExpand.push(child.key)
          // 也展开第三级
          child.children.forEach(c3 => {
            defaultExpand.push(c3.key)
          })
        })
      })
      setExpandedKeys(defaultExpand)
    } catch (err) {
      console.error('加载组织机构数据失败:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // 树节点选择
  const handleSelect = (selectedKeys: React.Key[]) => {
    const key = String(selectedKeys[0])
    if (!key) {
      onOrgSelect?.(null, 0)
      return
    }

    // 判断是否是井节点
    if (key.startsWith('well_')) {
      const wellId = key.replace('well_', '')
      const well = wellDbList.find(w => w.Well_Id === wellId)
      if (well) {
        onWellSelect?.({ id: wellId, name: well.Well_Name || wellId, orgId: well.Org_Id })
        // 找到所属的组织节点，并统计该节点下所有井的数量
        const findParentOrg = (orgs: OrgTreeNode[], id: string): OrgTreeNode | null => {
          for (const org of orgs) {
            // 检查是否是当前节点的子节点
            if (org.children.some(c => c.key === id || c.children.some(cc => cc.key === id))) {
              return org
            }
            if (org.children.length > 0) {
              const found = findParentOrg(org.children, id)
              if (found) return found
            }
          }
          return null
        }
        const parentOrg = findParentOrg(orgTreeData, key)
        if (parentOrg) {
          const totalCount = calculateTotalWellCount(parentOrg)
          onOrgSelect?.(
            { id: parentOrg.orgId, name: parentOrg.orgName, level: parentOrg.orgLevel },
            totalCount
          )
        }
      }
      return
    }

    // 找到对应的组织节点，并计算该节点下所有井的数量（包括子节点）
    const findOrg = (orgs: OrgTreeNode[], id: string): OrgTreeNode | null => {
      for (const org of orgs) {
        if (org.key === id) return org
        if (org.children.length > 0) {
          const found = findOrg(org.children, id)
          if (found) return found
        }
      }
      return null
    }

    // 递归计算某节点下所有井的数量（包括子节点）
    const calculateTotalWellCount = (org: OrgTreeNode): number => {
      let count = org.wellCount || 0
      for (const child of org.children) {
        count += calculateTotalWellCount(child)
      }
      return count
    }

    const selectedOrg = findOrg(orgTreeData, key)
    if (selectedOrg) {
      const totalCount = calculateTotalWellCount(selectedOrg)
      onOrgSelect?.(
        { id: selectedOrg.orgId, name: selectedOrg.orgName, level: selectedOrg.orgLevel },
        totalCount
      )
    }
  }

  // 加载节点（懒加载井）
  const loadData = (node: EventDataNode<DataNode>): Promise<DataNode[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([])
      }, 300)
    })
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
        <Spin tip="加载组织机构..." />
      </div>
    )
  }

  if (treeData.length === 0) {
    return <Empty description="暂无组织机构数据" />
  }

  const treeContent = (
    <Tree
      showIcon
      defaultExpandAll={false}
      expandedKeys={expandedKeys}
      onExpand={(keys) => setExpandedKeys(keys as string[])}
      treeData={treeData}
      onSelect={handleSelect}
      loadData={loadData}
      style={{ maxHeight: embedded ? 240 : 500, overflow: 'auto', minWidth: 180 }}
    />
  )

  if (embedded) {
    return <div style={{ padding: '8px 0' }}>{treeContent}</div>
  }

  return (
    <Card
      title={
        <span>
          <BankOutlined style={{ marginRight: 8 }} />
          组织机构
        </span>
      }
      bodyStyle={{ padding: '12px' }}
      size="small"
    >
      {treeContent}
    </Card>
  )
}

export default OrgTree
