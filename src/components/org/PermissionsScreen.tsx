'use client'
import { useState } from 'react'
import { useApp, useToast } from '@/lib/store'
import { Check } from '@/components/ui/Icon'

const PERMISSIONS = [
  { key: 'view_clients', label: 'View Clients', desc: 'Can see client accounts and health scores' },
  { key: 'edit_clients', label: 'Edit Clients', desc: 'Can add and edit client information' },
  { key: 'view_content', label: 'View Content', desc: 'Can view content calendar and planner' },
  { key: 'edit_content', label: 'Edit Content', desc: 'Can add, edit, assign deliverables' },
  { key: 'view_reports', label: 'View Reports', desc: 'Can access client reports' },
  { key: 'create_reports', label: 'Generate Reports', desc: 'Can generate AI-powered reports' },
  { key: 'view_pipeline', label: 'View Pipeline', desc: 'Can see sales pipeline and deals' },
  { key: 'edit_pipeline', label: 'Edit Pipeline', desc: 'Can add and move deals' },
  { key: 'manage_team', label: 'Manage Team', desc: 'Can add and remove team members' },
  { key: 'view_performance', label: 'View Performance', desc: 'Can see performance and attendance data' },
  { key: 'manage_permissions', label: 'Manage Permissions', desc: 'Can change role permissions (owner only)' },
]

const ROLE_DEFAULTS: Record<string, string[]> = {
  owner: PERMISSIONS.map(p => p.key),
  manager: ['view_clients', 'edit_clients', 'view_content', 'edit_content', 'view_reports', 'create_reports', 'view_pipeline', 'edit_pipeline', 'view_performance'],
  sales: ['view_clients', 'view_content', 'view_pipeline', 'edit_pipeline'],
  employee: ['view_clients', 'view_content', 'edit_content'],
}

export default function PermissionsScreen() {
  const { state } = useApp()
  const toast = useToast()
  const [selectedRole, setSelectedRole] = useState<string>('employee')
  const [perms, setPerms] = useState(ROLE_DEFAULTS)

  const isOwner = state.currentUser?.role === 'owner'

  function togglePerm(role: string, key: string) {
    if (!isOwner) { toast('Only owners can change permissions'); return }
    setPerms(p => ({
      ...p,
      [role]: p[role].includes(key) ? p[role].filter(k => k !== key) : [...p[role], key]
    }))
    toast('Permission updated')
  }

  function saveRoles() {
    toast('Permissions saved')
  }

  const ROLES = ['owner', 'manager', 'sales', 'employee']

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>Permissions</h1>
        <p style={{ fontSize: 14, color: 'var(--c-subtle)' }}>Define what each role can see and do in Mavixy OS</p>
      </div>

      {!isOwner && (
        <div style={{ background: '#FFF7ED', border: '1px solid #FDBA74', borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: 13.5, color: '#9A3412', fontWeight: 500 }}>
          Only owners can modify permissions. You are viewing current settings.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20 }}>
        {/* Role picker */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--c-ghost)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Roles</div>
          {ROLES.map(role => {
            const memberCount = state.users.filter(u => u.role === role).length
            return (
              <button key={role} onClick={() => setSelectedRole(role)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${selectedRole === role ? 'var(--c-accent)' : 'var(--c-border)'}`, background: selectedRole === role ? 'rgba(255,92,31,.04)' : '#fff', transition: 'all .15s', textAlign: 'left' }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, textTransform: 'capitalize' }}>{role}</span>
                <span style={{ fontSize: 11.5, color: 'var(--c-faint)' }}>{memberCount}</span>
              </button>
            )
          })}
        </div>

        {/* Permissions grid */}
        <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--c-border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, textTransform: 'capitalize' }}>{selectedRole} permissions</div>
              <div style={{ fontSize: 12.5, color: 'var(--c-faint)', marginTop: 2 }}>
                {perms[selectedRole]?.length || 0} of {PERMISSIONS.length} permissions enabled
              </div>
            </div>
            {isOwner && (
              <button onClick={saveRoles}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#fff', background: 'var(--c-ink)', borderRadius: 8, padding: '7px 14px' }}>
                <Check size={13} color="#fff" />Save
              </button>
            )}
          </div>
          <div>
            {PERMISSIONS.map(p => {
              const enabled = perms[selectedRole]?.includes(p.key)
              return (
                <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 18px', borderBottom: '1px solid var(--c-border-soft)', transition: 'background .15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--c-fill)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <button onClick={() => togglePerm(selectedRole, p.key)}
                    style={{ width: 22, height: 22, borderRadius: 6, border: `1.5px solid ${enabled ? 'var(--c-green)' : 'var(--c-border)'}`, background: enabled ? 'var(--c-green)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s', cursor: isOwner ? 'pointer' : 'default' }}>
                    {enabled && <Check size={12} color="#fff" />}
                  </button>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{p.label}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--c-faint)', marginTop: 1 }}>{p.desc}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
