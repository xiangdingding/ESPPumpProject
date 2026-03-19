import React, { createContext, useContext, useMemo } from 'react'
import { wellDbList, DbWell } from '../mock/wellDbData'
import { orgList } from '../mock/orgData'

export interface OrgSelection {
  id: string
  name: string
  level: number
}

interface OrgContextValue {
  selectedOrg: OrgSelection | null
  wellCount: number
  /** All DbWell records under the currently selected org (or all wells if none selected) */
  filteredDbWells: DbWell[]
}

const OrgContext = createContext<OrgContextValue>({
  selectedOrg: null,
  wellCount: 0,
  filteredDbWells: wellDbList,
})

export function useOrgContext() {
  return useContext(OrgContext)
}

function getWellsUnderOrg(orgId: string): DbWell[] {
  const descendantIds = new Set<string>([orgId])
  orgList.forEach(o => {
    if (o.Org_Id.startsWith(orgId) && o.Org_Id !== orgId) {
      descendantIds.add(o.Org_Id)
    }
  })
  return wellDbList.filter(w => descendantIds.has(w.Org_Id))
}

interface OrgProviderProps {
  selectedOrg: OrgSelection | null
  wellCount: number
  children: React.ReactNode
}

export const OrgProvider: React.FC<OrgProviderProps> = ({ selectedOrg, wellCount, children }) => {
  const filteredDbWells = useMemo(() => {
    if (!selectedOrg) return wellDbList
    return getWellsUnderOrg(selectedOrg.id)
  }, [selectedOrg])

  const value = useMemo(() => ({
    selectedOrg,
    wellCount,
    filteredDbWells,
  }), [selectedOrg, wellCount, filteredDbWells])

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>
}
