'use client'


import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Badge from '@mui/material/Badge'

import TableTransactionBank from '@views/Client/Admin/TransactionBank/TableTransactionBank'
import TableWebhookLogs from '@views/Client/Admin/WebhookLogs/TableWebhookLogs'
import TabDepositRequests from '@views/Client/Admin/DepositManagement/TabDepositRequests'
import { useTransactionBankSummary } from '@/hooks/apis/useTransactionBank'
import { useAdminDeposits } from '@/hooks/apis/useDepositManagement'
import { useTabTrenUrl } from '@/hooks/useTabTrenUrl'

// Badge dot for tab labels
function TabBadge({ count, children }: { count: number; children: React.ReactNode }) {
  if (!count) return <>{children}</>

  return (
    <Badge
      badgeContent={count}
      color='error'
      max={99}
      sx={{
        '& .MuiBadge-badge': { fontSize: 10, height: 18, minWidth: 18, right: -10, top: 4 }
      }}
    >
      {children}
    </Badge>
  )
}

export default function TransactionBankPage() {
  const [tab, setTab] = useTabTrenUrl<number>('tab', 0, [0, 1, 2])

  // Badge counts
  const { data: bankSummary } = useTransactionBankSummary()
  const { data: depositResult } = useAdminDeposits({ per_page: 1 })

  const unprocessedCount = bankSummary?.count_unprocessed || 0
  const pendingCount = depositResult?.summary?.count_pending || 0

  return (
    <div>
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{
          borderBottom: '1px solid var(--border-color, #e2e8f0)',
          px: 2,
          '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: '14px', minHeight: '48px' }
        }}
      >
        <Tab label={<TabBadge count={unprocessedCount}>Giao dịch ngân hàng</TabBadge>} />
        <Tab label={<TabBadge count={pendingCount}>Lệnh nạp tiền</TabBadge>} />
        <Tab label='Nhật ký webhook' />
      </Tabs>
      {tab === 0 && <TableTransactionBank />}
      {tab === 1 && <TabDepositRequests />}
      {tab === 2 && <TableWebhookLogs />}
    </div>
  )
}
