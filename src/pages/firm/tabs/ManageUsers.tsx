import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../amplify/data/resource';
import { signUp, resetPassword, getCurrentUser } from 'aws-amplify/auth';
import { useAlert } from '../../../components/AlertProvider';
import outputs from '../../../../amplify_outputs.json';

type Role = 'SUPER_MANAGER' | 'MANAGER' | 'MEMBER';

interface NewUserForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: Role;
}

// Use a structural type to avoid tight coupling to generated Schema typings
type UserEntity = {
  id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  role?: Role | string;
  createdAt?: string;
  updatedAt?: string;
};

const DEFAULT_FORM: NewUserForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  role: 'MEMBER',
};

const ManageUsers: React.FC = () => {
  // Force User Pool auth mode to avoid NotAuthorized errors when default outputs use IAM
  const client = useMemo(() => generateClient<Schema>({ authMode: 'userPool' } as any), []);
  const alertApi = useAlert();

  const [loading, setLoading] = useState<boolean>(true);
  const [users, setUsers] = useState<Array<UserEntity>>([]);
  const [openModal, setOpenModal] = useState(false);
  const [form, setForm] = useState<NewUserForm>(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<Role>('MEMBER');
  const [savingRole, setSavingRole] = useState<boolean>(false);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkRole, setBulkRole] = useState<Role>('MEMBER');
  const [bulkSaving, setBulkSaving] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Try User Pool first
      try {
        const { data, errors } = await client.models.User.list({ authMode: 'userPool' } as any);
        if (errors?.length) throw new Error(errors.map(e => e.message).join(', '));
        setUsers(data as any);
      } catch (err: any) {
        // Fallback to Identity Pool (IAM) if userPool fails due to auth
        const msg = String(err?.message ?? err);
        const isAuth = /Not Authorized/i.test(msg) || /Unauthorized/i.test(msg);
        const isEnumSerialize = /serialize value|Invalid input for Enum/i.test(msg);
        if (isAuth) {
          try {
            const { data, errors } = await client.models.User.list({ authMode: 'identityPool' } as any);
            if (errors?.length) throw new Error(errors.map(e => e.message).join(', '));
            setUsers(data as any);
          } catch (err2: any) {
            const msg2 = String(err2?.message ?? err2);
            if (/serialize value|Invalid input for Enum/i.test(msg2)) {
              // Fallback: exclude role from selection set to avoid enum serialization issues
              const { data } = await (client.models.User.list as any)({ selectionSet: ['id','first_name','last_name','email','phone'], authMode: 'identityPool' });
              setUsers(data as any);
            } else {
              throw err2;
            }
          }
        } else if (isEnumSerialize) {
          // Fallback: exclude role from selection set to avoid enum serialization issues
          const { data } = await (client.models.User.list as any)({ selectionSet: ['id','first_name','last_name','email','phone'], authMode: 'userPool' });
          setUsers(data as any);
        } else {
          throw err;
        }
      }
    } catch (e: any) {
      console.error('Failed to load users:', e);
      alertApi.error({ title: 'Failed to load users', message: e?.message ?? 'Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (u: UserEntity) => {
    const email = String(u.email || '').trim().toLowerCase();
    if (!u.id) {
      alertApi.error({ title: 'Cannot delete', message: 'User ID is missing.' });
      return;
    }
    if (!email) {
      alertApi.error({ title: 'Cannot delete', message: 'User email (Cognito username) is missing.' });
      return;
    }
    const confirmed = window.confirm(`Delete user ${email}? This will remove their account and data.`);
    if (!confirmed) return;
    setDeletingId(String(u.id));
    try {
      // 1) Delete from Cognito via custom mutation
      const deleteMutation = (client as any)?.mutations?.deleteCognitoUser;
      if (typeof deleteMutation !== 'function') {
        throw new Error('deleteCognitoUser mutation is not available. Please run "npx ampx sandbox" to provision backend changes.');
      }
      const userPoolId = (outputs as any)?.auth?.user_pool_id as string | undefined;
      if (!userPoolId) throw new Error('User Pool ID not configured.');
      try {
        const { data, errors } = await deleteMutation({ username: email, userPoolId }, { authMode: 'userPool' });
        console.debug('deleteCognitoUser (userPool) result:', { data, errors });
        if (errors?.length) throw new Error(errors.map((e: any) => e.message).join(', '));
        const okVal = typeof data === 'boolean' ? data : (data?.deleteCognitoUser ?? data?.result ?? null);
        if (!okVal) throw new Error('Failed to delete Cognito user');
      } catch (err: any) {
        const msg = String(err?.message ?? err);
        if (/Not Authorized|Unauthorized/i.test(msg)) {
          const { data: data2, errors: errors2 } = await deleteMutation({ username: email, userPoolId }, { authMode: 'identityPool' });
          console.debug('deleteCognitoUser (identityPool) result:', { data: data2, errors: errors2 });
          if (errors2?.length) throw new Error(errors2.map((e: any) => e.message).join(', '));
          const okVal2 = typeof data2 === 'boolean' ? data2 : (data2?.deleteCognitoUser ?? data2?.result ?? null);
          if (!okVal2) throw new Error('Failed to delete Cognito user (IAM)');
        } else {
          throw err;
        }
      }

      // 2) Delete from Data User model
      try {
        const res = await client.models.User.delete({ id: u.id } as any, { authMode: 'userPool' } as any);
        if (res?.errors?.length) throw new Error(res.errors.map((e: any) => e.message).join(', '));
      } catch (err: any) {
        const msg = String(err?.message ?? err);
        if (/Not Authorized|Unauthorized/i.test(msg)) {
          const res2 = await client.models.User.delete({ id: u.id } as any, { authMode: 'identityPool' } as any);
          if (res2?.errors?.length) throw new Error(res2.errors.map((e: any) => e.message).join(', '));
        } else {
          throw err;
        }
      }

      // 3) Update UI
      setUsers(prev => prev.filter(x => String(x.id) !== String(u.id)));
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(String(u.id));
        return next;
      });
      alertApi.success({ title: 'User deleted', message: `${email} was removed.` });
    } catch (e: any) {
      console.error('Delete user failed:', e);
      alertApi.error({ title: 'Delete failed', message: e?.message ?? 'Please run npx ampx sandbox and try again.' });
    } finally {
      setDeletingId(null);
    }
  };

  const applyBulkRole = async () => {
    if (selectedIds.size === 0) return;
    setBulkSaving(true);
    let updatedCount = 0;
    try {
      for (const id of Array.from(selectedIds)) {
        try {
          try {
            const res = await client.models.User.update({ id, role: bulkRole } as any, { authMode: 'userPool' } as any);
            if (res.errors?.length) throw new Error(res.errors.map((e: any) => e.message).join(', '));
          } catch (err: any) {
            const msg = String(err?.message ?? err);
            if (/Not Authorized/i.test(msg) || /Unauthorized/i.test(msg)) {
              const res2 = await client.models.User.update({ id, role: bulkRole } as any, { authMode: 'identityPool' } as any);
              if (res2.errors?.length) throw new Error(res2.errors.map((e: any) => e.message).join(', '));
            } else {
              throw err;
            }
          }
          updatedCount++;
        } catch (e) {
          console.error('Bulk update failed for user', id, e);
        }
      }
      if (updatedCount > 0) {
        setUsers(prev => prev.map(u => (selectedIds.has(String(u.id)) ? { ...u, role: bulkRole } : u)));
        alertApi.success({ title: 'Bulk roles updated', message: `Updated ${updatedCount} user(s).` });
        setSelectedIds(new Set());
      } else {
        alertApi.info?.({ title: 'No changes', message: 'No roles were updated.' } as any);
      }
    } finally {
      setBulkSaving(false);
    }
  };

  const startEditRole = (u: UserEntity) => {
    const code = normalizeRoleValue(u.role) ?? 'MEMBER';
    setEditingUserId(String(u.id ?? ''));
    setEditingRole(code);
  };

  const cancelEditRole = () => {
    setEditingUserId(null);
    setEditingRole('MEMBER');
    setSavingRole(false);
  };

  const saveEditRole = async () => {
    if (!editingUserId) return;
    setSavingRole(true);
    try {
      try {
        const res = await client.models.User.update({ id: editingUserId, role: editingRole } as any, { authMode: 'userPool' } as any);
        if (res.errors?.length) throw new Error(res.errors.map((e: any) => e.message).join(', '));
      } catch (err: any) {
        const msg = String(err?.message ?? err);
        if (/Not Authorized/i.test(msg) || /Unauthorized/i.test(msg)) {
          const res2 = await client.models.User.update({ id: editingUserId, role: editingRole } as any, { authMode: 'identityPool' } as any);
          if (res2.errors?.length) throw new Error(res2.errors.map((e: any) => e.message).join(', '));
        } else {
          throw err;
        }
      }
      setUsers(prev => prev.map(u => (String(u.id) === String(editingUserId) ? { ...u, role: editingRole } : u)));
      alertApi.success({ title: 'Role updated', message: 'User role saved successfully.' });
      setEditingUserId(null);
    } catch (e: any) {
      console.error('Save role failed:', e);
      alertApi.error({ title: 'Failed to save', message: e?.message ?? 'Please try again.' });
    } finally {
      setSavingRole(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const displayRole = (r: any): string => {
    const v = String(r ?? '').toUpperCase();
    if (v === 'SUPER_MANAGER') return 'Super Manager';
    if (v === 'MANAGER') return 'Manager';
    if (v === 'MEMBER') return 'Member';
    // Legacy labels fallback
    if (r === 'Super Manager' || r === 'Manager' || r === 'Member') return String(r);
    return 'Member';
  };

  const set = (key: keyof NewUserForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = (e.currentTarget as HTMLInputElement).value;
      setForm(prev => ({ ...prev, [key]: value }));
    };

  const sanitizeE164 = (input: string): string | undefined => {
    if (!input) return undefined;
    const only = input.replace(/[^0-9+]/g, '');
    const digits = only.replace(/[^0-9]/g, '');
    if (!digits) return undefined;
    return only.startsWith('+') ? `+${digits}` : `+${digits}`;
  };

  const generateTempPassword = () => `Tmp!${Math.random().toString(36).slice(-8)}A1`;

  const onAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const first = form.firstName.trim();
      const last = form.lastName.trim();
      const email = form.email.trim().toLowerCase();
      const phoneE164 = sanitizeE164(form.phone);
      if (!first || !last || !email) {
        setError('First name, last name, and email are required.');
        setSubmitting(false);
        return;
      }

      const tempPwd = generateTempPassword();

      // 1) Create Cognito account via signUp so user can log in later
      await signUp({
        username: email,
        password: tempPwd,
        options: { userAttributes: { email, given_name: first, family_name: last, ...(phoneE164 ? { phone_number: phoneE164 } : {}) } },
      });

      // 1a) Immediately send them a password reset email so they can set their own password via our /reset page
      try {
        await resetPassword({ username: email });
      } catch (err) {
        console.warn('Failed to trigger resetPassword after signUp (will rely on verification email instead):', err);
      }

      // Resolve current admin's firm id (match Firm by administrator_email)
      const resolveFirmIdForAdmin = async (): Promise<string | undefined> => {
        try {
          const { username } = await getCurrentUser();
          const adminEmail = String(username || '').trim().toLowerCase();
          if (!adminEmail) return undefined;
          const tryList = async () => {
            try {
              const { data, errors } = await client.models.Firm.list({ authMode: 'userPool' } as any);
              if (errors?.length) throw new Error(errors.map((e: any) => e.message).join(', '));
              return data as any[];
            } catch (err: any) {
              const msg = String(err?.message ?? err);
              if (/Not Authorized|Unauthorized/i.test(msg)) {
                const { data, errors } = await client.models.Firm.list({ authMode: 'identityPool' } as any);
                if (errors?.length) throw new Error(errors.map((e: any) => e.message).join(', '));
                return data as any[];
              }
              throw err;
            }
          };
          const firms = await tryList();
          const mine = firms.find((f: any) => String(f?.administrator_email || '').trim().toLowerCase() === adminEmail);
          return mine?.id ? String(mine.id) : undefined;
        } catch (e) {
          console.warn('Failed to resolve firm id for admin:', e);
          return undefined;
        }
      };

      const firmId = await resolveFirmIdForAdmin();

      // 2) Persist to Amplify Data User model
      let created: any | null = null;
      try {
        const res = await client.models.User.create({
          first_name: first,
          last_name: last,
          email,
          phone: form.phone.trim(),
          role: form.role,
          ...(firmId ? { firm_id: firmId } : {}),
        }, { authMode: 'userPool' } as any);
        if (res.errors?.length) throw new Error(res.errors.map((e: any) => e.message).join(', '));
        created = res.data as any;
      } catch (err: any) {
        const msg = String(err?.message ?? err);
        if (/Not Authorized/i.test(msg) || /Unauthorized/i.test(msg)) {
          const res2 = await client.models.User.create({
            first_name: first,
            last_name: last,
            email,
            phone: form.phone.trim(),
            role: form.role,
            ...(firmId ? { firm_id: firmId } : {}),
          }, { authMode: 'identityPool' } as any);
          if (res2.errors?.length) throw new Error(res2.errors.map((e: any) => e.message).join(', '));
          created = res2.data as any;
        } else {
          throw err;
        }
      }

      // 3) Update local state and notify admin with temp password
      setUsers(prev => [created as any, ...prev]);
      setOpenModal(false);
      setForm(DEFAULT_FORM);

      const id = `invite-${Date.now()}`;
      const resetUrl = new URL('/reset', window.location.origin);
      resetUrl.searchParams.set('email', email);
      // Trigger SES email via Amplify Data mutation (custom function handler)
      try {
        const sendMutation = (client as any)?.mutations?.sendResetEmail;
        if (typeof sendMutation === 'function') {
          // Prefer userPool; fall back to identityPool
          try {
            const { data, errors } = await sendMutation({ to: email, resetUrl: resetUrl.toString(), firstName: first, lastName: last }, { authMode: 'userPool' });
            console.debug('sendResetEmail (userPool) result:', { data, errors });
            if (errors?.length) throw new Error(errors.map((e: any) => e.message).join(', '));
            const okVal = typeof data === 'boolean' ? data : (data?.sendResetEmail ?? data?.result ?? null);
            if (!okVal) throw new Error('Failed to send reset email');
          } catch (err: any) {
            const msg = String(err?.message ?? err);
            if (/Not Authorized|Unauthorized/i.test(msg)) {
              const { data: data2, errors: errors2 } = await sendMutation({ to: email, resetUrl: resetUrl.toString(), firstName: first, lastName: last }, { authMode: 'identityPool' });
              console.debug('sendResetEmail (identityPool) result:', { data: data2, errors: errors2 });
              if (errors2?.length) throw new Error(errors2.map((e: any) => e.message).join(', '));
              const okVal2 = typeof data2 === 'boolean' ? data2 : (data2?.sendResetEmail ?? data2?.result ?? null);
              if (!okVal2) throw new Error('Failed to send reset email (IAM)');
            } else {
              throw err;
            }
          }
        } else {
          console.warn('sendResetEmail mutation is not available; run npx ampx sandbox to provision backend.');
        }
      } catch (e) {
        console.warn('sendResetEmail mutation failed:', e);
      }
      const onCopy = async () => {
        try {
          await navigator.clipboard.writeText(resetUrl.toString());
          alertApi.success({ title: 'Copied', message: 'Reset link copied to clipboard.' });
        } catch {}
      };
      alertApi.success({
        id,
        title: 'Invitation sent',
        message: (
          <div>
            <div>
              We sent a verification email to {email} with a code. Share this reset link with them so they can create a new password on our site:
            </div>
            <pre style={{ margin: '8px 0', background: '#f8f9fa', padding: 8, borderRadius: 8 }}>
{resetUrl.toString()}
            </pre>
            <div style={{ display: 'flex', gap: 8 }}>
              <SecondaryButton type="button" onClick={() => alertApi.close(id)}>Close</SecondaryButton>
              <PrimaryButton type="button" onClick={onCopy}>Copy Reset Link</PrimaryButton>
            </div>
          </div>
        ),
      });
    } catch (err: any) {
      console.error('Add user failed:', err);
      setError(err?.message ?? 'Failed to add user');
    } finally {
      setSubmitting(false);
    }
  };

  const total = users.length;
  const start = page * rowsPerPage;
  const end = Math.min(start + rowsPerPage, total);
  const pageItems = users.slice(start, end);
  const pageIds = useMemo(() => pageItems.map(u => String(u.id)), [pageItems]);
  const allPageSelected = useMemo(() => pageIds.length > 0 && pageIds.every(id => selectedIds.has(id)), [pageIds, selectedIds]);

  const nextPage = () => setPage(p => (end >= total ? p : p + 1));
  const prevPage = () => setPage(p => (p <= 0 ? 0 : p - 1));

  const isSelected = (id: any) => selectedIds.has(String(id));
  const toggleSelect = (id: any) => {
    const key = String(id);
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleSelectAllPage = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (pageIds.every(id => next.has(id))) {
        pageIds.forEach(id => next.delete(id));
      } else {
        pageIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const normalizeRoleValue = (r: any): Role | null => {
    const v = String(r ?? '').toUpperCase();
    if (v === 'SUPER_MANAGER') return 'SUPER_MANAGER';
    if (v === 'MANAGER') return 'MANAGER';
    if (v === 'MEMBER') return 'MEMBER';
    // Map legacy labels
    if (r === 'Super Manager' || r === 'Admin') return 'SUPER_MANAGER';
    if (r === 'Manager') return 'MANAGER';
    if (r === 'Member' || r === 'Regular') return 'MEMBER';
    return null;
  };

  const normalizeAllRoles = async () => {
    setSubmitting(true);
    try {
      const updated: any[] = [];
      for (const u of users) {
        const code = normalizeRoleValue(u.role);
        if (!code || String(u.role) === code) continue;
        try {
          try {
            const res = await client.models.User.update({ id: u.id, role: code } as any, { authMode: 'userPool' } as any);
            if (res.errors?.length) throw new Error(res.errors.map((e: any) => e.message).join(', '));
            updated.push({ id: u.id, role: code });
          } catch (err: any) {
            const msg = String(err?.message ?? err);
            if (/Not Authorized/i.test(msg) || /Unauthorized/i.test(msg)) {
              const res2 = await client.models.User.update({ id: u.id, role: code } as any, { authMode: 'identityPool' } as any);
              if (res2.errors?.length) throw new Error(res2.errors.map((e: any) => e.message).join(', '));
              updated.push({ id: u.id, role: code });
            } else {
              throw err;
            }
          }
        } catch (e) {
          console.error('Failed to normalize role for user', u.id, e);
        }
      }
      if (updated.length > 0) {
        // Update local state
        setUsers(prev => prev.map(u => {
          const found = updated.find(x => x.id === u.id);
          return found ? { ...u, role: found.role } : u;
        }));
        alertApi.success({ title: 'Roles normalized', message: `Updated ${updated.length} user(s).` });
      } else {
        alertApi.info?.({ title: 'No changes', message: 'No user roles required normalization.' } as any);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Page>
      <HeaderRow>
        <Title>User List</Title>
        <div style={{ display: 'inline-flex', gap: 8 }}>
          <SecondaryButton type="button" onClick={normalizeAllRoles} title="Map legacy roles to new enum codes">Normalize Roles</SecondaryButton>
          <PrimaryButton type="button" onClick={() => setOpenModal(true)}>Add New User</PrimaryButton>
        </div>
      </HeaderRow>

      <Card>
        {/* Bulk actions bar */}
        <BulkActions>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span>Bulk Role:</span>
            <Select value={bulkRole} onChange={(e) => setBulkRole(e.target.value as Role)}>
              <option value="SUPER_MANAGER">Super Manager</option>
              <option value="MANAGER">Manager</option>
              <option value="MEMBER">Member</option>
            </Select>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span>{selectedIds.size} selected</span>
            <PrimaryButton type="button" onClick={applyBulkRole} disabled={selectedIds.size === 0 || bulkSaving}>
              {bulkSaving ? 'Applying...' : 'Apply' }
            </PrimaryButton>
          </div>
        </BulkActions>
        <TableWrap>
          <Table role="table" aria-label="User list">
            <thead>
              <tr>
                <Th scope="col" aria-label="Select All">
                  <input type="checkbox" checked={allPageSelected} onChange={toggleSelectAllPage} />
                </Th>
                <Th scope="col">First Name</Th>
                <Th scope="col">Last Name</Th>
                <Th scope="col">Email</Th>
                <Th scope="col">Phone Number</Th>
                <Th scope="col">Role</Th>
                <Th scope="col" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><Td colSpan={7}>Loading...</Td></tr>
              ) : pageItems.length === 0 ? (
                <tr><Td colSpan={7}>No users found.</Td></tr>
              ) : (
                pageItems.map((u: any) => {
                  const letter = (u.first_name || u.last_name || u.email || '?').trim().charAt(0).toUpperCase();
                  return (
                    <tr key={u.id}>
                      <Td>
                        <input type="checkbox" checked={isSelected(u.id)} onChange={() => toggleSelect(u.id)} />
                      </Td>
                      <Td>
                        <CellWithAvatar>
                          <Avatar>{letter || '?'}</Avatar>
                          <span>{u.first_name || '—'}</span>
                        </CellWithAvatar>
                      </Td>
                      <Td>{u.last_name || '—'}</Td>
                      <Td>{u.email || '—'}</Td>
                      <Td>{u.phone || '—'}</Td>
                      <Td>
                        {editingUserId === String(u.id) ? (
                          <Select value={editingRole} onChange={(e) => setEditingRole(e.target.value as Role)}>
                            <option value="SUPER_MANAGER">Super Manager</option>
                            <option value="MANAGER">Manager</option>
                            <option value="MEMBER">Member</option>
                          </Select>
                        ) : (
                          displayRole(u.role)
                        )}
                      </Td>
                      <Td style={{ textAlign: 'right' }}>
                        {editingUserId === String(u.id) ? (
                          <div style={{ display: 'inline-flex', gap: 8 }}>
                            <SecondaryButton type="button" onClick={cancelEditRole}>Cancel</SecondaryButton>
                            <PrimaryButton type="button" onClick={saveEditRole} disabled={savingRole}>{savingRole ? 'Saving...' : 'Save'}</PrimaryButton>
                          </div>
                        ) : (
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            <SecondaryButton type="button" onClick={() => startEditRole(u)}>Edit Role</SecondaryButton>
                            <DangerButton type="button" onClick={() => deleteUser(u)} disabled={deletingId === String(u.id)}>
                              {deletingId === String(u.id) ? 'Deleting...' : 'Delete'}
                            </DangerButton>
                          </div>
                        )}
                      </Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </TableWrap>
        <TableFooter>
          <RowsPerPage>
            <span>Rows per page:</span>
            <Select value={rowsPerPage} onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }}>
              {[5, 10, 15, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
            </Select>
          </RowsPerPage>
          <PageInfo>{total === 0 ? '0-0 of 0' : `${start + 1}-${end} of ${total}`}</PageInfo>
          <Pager>
            <IconButton onClick={prevPage} aria-label="Previous page" disabled={page === 0}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </IconButton>
            <IconButton onClick={nextPage} aria-label="Next page" disabled={end >= total}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </IconButton>
          </Pager>
        </TableFooter>
      </Card>

      {openModal && (
        <DialogBackdrop role="dialog" aria-modal="true">
          <Dialog>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <IconButton aria-label="Close" onClick={() => setOpenModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </IconButton>
            </DialogHeader>
            <form onSubmit={onAddUser}>
              {error && <ErrorBanner role="alert">{error}</ErrorBanner>}
              <Grid>
                <FormField>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" value={form.firstName} onChange={set('firstName')} required />
                </FormField>
                <FormField>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" value={form.lastName} onChange={set('lastName')} required />
                </FormField>
                <FormField $span2>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={form.email} onChange={set('email')} placeholder="user@company.com" required />
                </FormField>
                <FormField>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" type="tel" value={form.phone} onChange={set('phone')} placeholder="+1 555 123 4567" />
                </FormField>
                <FormField>
                  <Label htmlFor="role">Role</Label>
                  <Select id="role" value={form.role} onChange={set('role') as any}>
                    <option value="SUPER_MANAGER">Super Manager</option>
                    <option value="MANAGER">Manager</option>
                    <option value="MEMBER">Member</option>
                  </Select>
                </FormField>
              </Grid>
              <DialogActions>
                <SecondaryButton type="button" onClick={() => setOpenModal(false)}>Cancel</SecondaryButton>
                <PrimaryButton type="submit" disabled={submitting}>{submitting ? 'Adding...' : 'Add User'}</PrimaryButton>
              </DialogActions>
            </form>
          </Dialog>
        </DialogBackdrop>
      )}
    </Page>
  );
};

export default ManageUsers;

// styled-components (below component per project rules)
const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Title = styled.h3`
  margin: 0;
  color: #2a2f45;
`;

const Card = styled.div`
  background: #fff;
  border-radius: 10px;
  border: 1px solid rgba(40,44,69,0.08);
  padding: 0;
`;

// Bulk actions bar above the table
const BulkActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(40,44,69,0.08);

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
`;

const PrimaryButton = styled.button`
  background-color: #0d6efd;
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 10px 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(13,110,253,0.28);
  &:hover { background-color: #0b5ed7; }
  &:active { background-color: #0a58ca; box-shadow: 0 2px 8px rgba(13,110,253,0.35); }
  &:focus-visible { outline: 3px solid rgba(13,110,253,0.35); outline-offset: 2px; }
`;

const SecondaryButton = styled.button`
  background: transparent;
  color: #2a2f45;
  border: 1px solid rgba(40,44,69,0.2);
  border-radius: 10px;
  padding: 10px 14px;
  font-weight: 600;
  cursor: pointer;
  &:hover { background: rgba(40,44,69,0.06); }
`;

const DangerButton = styled.button<{ disabled?: boolean }>`
  background-color: #dc3545;
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 10px 14px;
  font-weight: 600;
  cursor: pointer;
  opacity: ${(p) => (p.disabled ? 0.6 : 1)};
  pointer-events: ${(p) => (p.disabled ? 'none' : 'auto')};
  &:hover { background-color: #c82333; }
  &:active { background-color: #bd2130; }
`;

const TableWrap = styled.div`
  width: 100%;
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Th = styled.th`
  text-align: left;
  color: #475569;
  font-weight: 700;
  padding: 12px 16px;
  background: #f1f5f9; /* slate-100 */
  border-bottom: 1px solid #e2e8f0; /* slate-200 */
`;

const Td = styled.td<{ colSpan?: number }>`
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
  color: #2a2f45;
`;

const CellWithAvatar = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
`;

const Avatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 999px;
  background: #a63e1f; /* warm reddish like screenshot */
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
`;

const IconButton = styled.button<{ disabled?: boolean }>`
  background: transparent;
  border: none;
  color: #2a2f45;
  padding: 6px;
  border-radius: 8px;
  cursor: pointer;
  opacity: ${(p) => (p.disabled ? 0.4 : 1)};
  pointer-events: ${(p) => (p.disabled ? 'none' : 'auto')};
  &:hover { background: rgba(40,44,69,0.06); }
`;

const TableFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 10px 12px;
`;

const RowsPerPage = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`;

const PageInfo = styled.div`
  color: #475569;
`;

const Pager = styled.div`
  display: inline-flex;
  gap: 6px;
`;

const Select = styled.select`
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 6px 8px;
  height: 45px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  color: #2a2f45;
  background: #fff;
`;

/* Dialog */
const DialogBackdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(16, 18, 27, 0.36);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 50;
`;

const Dialog = styled.div`
  width: min(720px, 100%);
  background: #fff;
  border-radius: 12px;
  border: 1px solid rgba(40,44,69,0.08);
  box-shadow: 0 12px 30px rgba(0,0,0,0.12);
  padding: 12px;
`;

const DialogHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 6px 6px 12px;
`;

const DialogTitle = styled.h4`
  margin: 0;
  color: #2a2f45;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  padding: 8px 8px 0 8px;

  @media (min-width: 720px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const FormField = styled.div<{ $span2?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 6px;
  grid-column: ${(p) => (p.$span2 ? '1 / -1' : 'auto')};
`;

const Label = styled.label`
  align-self: start;
  font-size: 14px;
  font-weight: 600;
  color: #475569;
`;

const Input = styled.input`
  width: calc(100% - 24px);
  padding: 10px 12px;
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #2a2f45;
  border-radius: 10px;
  font: inherit;
  outline: none;
  &:focus { border-color: #282c45; box-shadow: 0 0 0 3px rgba(40,44,69,0.12); }
`;

const DialogActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 8px 8px 8px;
`;

const ErrorBanner = styled.div`
  background: #ffe3e3;
  color: #b00020;
  border: 1px solid #ffb3b3;
  padding: 10px 12px;
  border-radius: 8px;
  margin: 0 8px 8px;
`;