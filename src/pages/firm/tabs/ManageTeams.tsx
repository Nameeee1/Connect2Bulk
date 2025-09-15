import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../amplify/data/resource';

// Lightweight placeholder UI for managing teams. Backend model is not defined yet.
// Mirrors the visual style of ManageUsers.tsx and keeps styled-components below the component.

type Team = {
  id: string;
  name: string;
  description?: string;
  members?: number;
  createdAt?: string;
  managerId?: string;
  managerName?: string;
  managerEmail?: string;
};

const DEFAULT_TEAMS: Team[] = [
  { id: 't-1', name: 'Dispatch', description: 'Coordinates loads and trucks', members: 4 },
  { id: 't-2', name: 'Accounting', description: 'Invoices and settlements', members: 2 },
];

type UserEntity = {
  id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  role?: string;
};

const ManageTeams: React.FC = () => {
  const client = useMemo(() => generateClient<Schema>({ authMode: 'userPool' } as any), []);
  const [teams, setTeams] = useState<Team[]>(DEFAULT_TEAMS);
  const [openModal, setOpenModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [managerId, setManagerId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(0);
  const [usersLoading, setUsersLoading] = useState(true);
  const [users, setUsers] = useState<UserEntity[]>([]);
  const [teamsLoading, setTeamsLoading] = useState<boolean>(true);

  const eligibleUsers = useMemo(() => {
    // Accept both new enum values (no spaces) and legacy display labels
    const allowedCodes = new Set(['SUPER_MANAGER', 'MANAGER']);
    const allowedLabels = new Set(['Super Manager', 'Manager']);
    const filtered = users.filter((u) => {
      const v = String(u.role ?? '');
      const upper = v.toUpperCase();
      return allowedCodes.has(upper) || allowedLabels.has(v);
    });
    return filtered.length > 0 ? filtered : users;
  }, [users]);

  const total = teams.length;
  const start = page * rowsPerPage;
  const end = Math.min(start + rowsPerPage, total);
  const pageItems = useMemo(() => teams.slice(start, end), [teams, start, end]);

  const nextPage = () => setPage((p) => (end >= total ? p : p + 1));
  const prevPage = () => setPage((p) => (p <= 0 ? 0 : p - 1));

  // Load users (from Amplify Data User model) to select a manager
  useEffect(() => {
    const load = async () => {
      setUsersLoading(true);
      try {
        try {
          const allowed = ['SUPER_MANAGER','MANAGER','MEMBER','Manager','Member','Admin','Regular'];
          const { data, errors } = await client.models.User.list({ filter: { role: { in: allowed as any } }, authMode: 'userPool' } as any);
          if (errors?.length) throw new Error(errors.map(e => e.message).join(', '));
          setUsers(data as any);
        } catch (err: any) {
          const msg = String(err?.message ?? err);
          const isAuth = /Not Authorized/i.test(msg) || /Unauthorized/i.test(msg);
          const isEnumSerialize = /serialize value|Invalid input for Enum/i.test(msg);
          if (isAuth) {
            try {
              const allowed = ['SUPER_MANAGER','MANAGER','MEMBER','Manager','Member','Admin','Regular'];
              const { data, errors } = await client.models.User.list({ filter: { role: { in: allowed as any } }, authMode: 'identityPool' } as any);
              if (errors?.length) throw new Error(errors.map(e => e.message).join(', '));
              setUsers(data as any);
            } catch (err2: any) {
              const msg2 = String(err2?.message ?? err2);
              if (/serialize value|Invalid input for Enum/i.test(msg2)) {
                // Fallback: exclude role from selection set
                const { data } = await (client.models.User.list as any)({ selectionSet: ['id','first_name','last_name','email','phone'], authMode: 'identityPool' });
                setUsers(data as any);
              } else {
                throw err2;
              }
            }
          } else if (isEnumSerialize) {
            // Fallback: exclude role from selection set
            const { data } = await (client.models.User.list as any)({ selectionSet: ['id','first_name','last_name','email','phone'], authMode: 'userPool' });
            setUsers(data as any);
          } else {
            throw err;
          }
        }
      } catch (e) {
        console.error('Failed to load users for manager select:', e);
      } finally {
        setUsersLoading(false);
      }
    };
    load();
  }, [client]);

  // Load existing teams from backend
  useEffect(() => {
    const loadTeams = async () => {
      setTeamsLoading(true);
      try {
        try {
          const { data, errors } = await client.models.Team.list({ authMode: 'userPool' } as any);
          if (errors?.length) throw new Error(errors.map((e) => e.message).join(', '));
          setTeams((data as any[]).map((t) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            members: t.members,
            createdAt: t.created_at,
            managerId: t.manager_id,
            managerName: t.manager_name,
            managerEmail: t.manager_email,
          })));
        } catch (err: any) {
          const msg = String(err?.message ?? err);
          if (/Not Authorized/i.test(msg) || /Unauthorized/i.test(msg)) {
            const { data, errors } = await client.models.Team.list({ authMode: 'identityPool' } as any);
            if (errors?.length) throw new Error(errors.map((e) => e.message).join(', '));
            setTeams((data as any[]).map((t) => ({
              id: t.id,
              name: t.name,
              description: t.description,
              members: t.members,
              createdAt: t.created_at,
              managerId: t.manager_id,
              managerName: t.manager_name,
              managerEmail: t.manager_email,
            })));
          } else {
            throw err;
          }
        }
      } catch (e) {
        console.error('Failed to load teams:', e);
      } finally {
        setTeamsLoading(false);
      }
    };
    loadTeams();
  }, [client]);

  const onAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const trimmed = name.trim();
      if (!trimmed) {
        setError('Team name is required.');
        setSubmitting(false);
        return;
      }
      if (!managerId) {
        setError('Please select a manager.');
        setSubmitting(false);
        return;
      }
      const manager = users.find(u => String(u.id) === String(managerId));
      const managerFullName = `${(manager?.first_name ?? '').trim()} ${(manager?.last_name ?? '').trim()}`.trim();
      const managerDisplay = managerFullName || (manager?.email ?? '');
      const payload = {
        name: trimmed,
        description: description.trim() || '',
        manager_id: manager?.id ?? managerId,
        manager_name: managerDisplay || '',
        manager_email: manager?.email || '',
        members: 1,
        created_at: new Date().toISOString(),
      } as const;

      let created: any | null = null;
      try {
        const res = await client.models.Team.create(payload as any, { authMode: 'userPool' } as any);
        if (res.errors?.length) throw new Error(res.errors.map((e: any) => e.message).join(', '));
        created = res.data as any;
      } catch (err: any) {
        const msg = String(err?.message ?? err);
        if (/Not Authorized/i.test(msg) || /Unauthorized/i.test(msg)) {
          const res2 = await client.models.Team.create(payload as any, { authMode: 'identityPool' } as any);
          if (res2.errors?.length) throw new Error(res2.errors.map((e: any) => e.message).join(', '));
          created = res2.data as any;
        } else {
          throw err;
        }
      }

      // Update local list with created team
      setTeams((prev) => [
        {
          id: created?.id ?? `t-${Date.now()}`,
          name: created?.name ?? trimmed,
          description: created?.description || (description.trim() || undefined),
          members: created?.members ?? 1,
          createdAt: created?.created_at ?? new Date().toISOString(),
          managerId: created?.manager_id ?? managerId,
          managerName: created?.manager_name ?? (managerDisplay || undefined),
          managerEmail: created?.manager_email ?? manager?.email,
        },
        ...prev,
      ]);
      setOpenModal(false);
      setName('');
      setDescription('');
      setManagerId('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Page>
      <HeaderRow>
        <Title>Teams</Title>
        <PrimaryButton type="button" onClick={() => setOpenModal(true)}>Add Team</PrimaryButton>
      </HeaderRow>

      <Card>
        <TableWrap>
          <Table role="table" aria-label="Team list">
            <thead>
              <tr>
                <Th scope="col">Team Name</Th>
                <Th scope="col">Description</Th>
                <Th scope="col">Manager</Th>
                <Th scope="col">Members</Th>
                <Th scope="col" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {teamsLoading ? (
                <tr><Td colSpan={5}>Loading...</Td></tr>
              ) : pageItems.length === 0 ? (
                <tr><Td colSpan={5}>No teams yet.</Td></tr>
              ) : (
                pageItems.map((t) => (
                  <tr key={t.id}>
                    <Td>
                      <CellWithAvatar>
                        <Avatar>{t.name.trim().charAt(0).toUpperCase()}</Avatar>
                        <span>{t.name}</span>
                      </CellWithAvatar>
                    </Td>
                    <Td>{t.description || '—'}</Td>
                    <Td>{t.managerName || t.managerEmail || '—'}</Td>
                    <Td>{typeof t.members === 'number' ? t.members : '—'}</Td>
                    <Td style={{ textAlign: 'right' }}>
                      <IconButton aria-label="More actions" title="More actions">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
                        </svg>
                      </IconButton>
                    </Td>
                  </tr>
                ))
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
              <DialogTitle>Add Team</DialogTitle>
              <IconButton aria-label="Close" onClick={() => setOpenModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </IconButton>
            </DialogHeader>
            <form onSubmit={onAddTeam}>
              {error && <ErrorBanner role="alert">{error}</ErrorBanner>}
              <Grid>
                <FormField>
                  <Label htmlFor="team-name">Team Name</Label>
                  <Input id="team-name" value={name} onChange={(e) => setName(e.target.value)} required />
                </FormField>
                <FormField>
                  <Label htmlFor="team-manager">Manager</Label>
                  <Select id="team-manager" value={managerId} onChange={(e) => setManagerId(e.target.value)} required disabled={usersLoading || eligibleUsers.length === 0}>
                    <option value="">{
                      usersLoading
                        ? 'Loading users…'
                        : eligibleUsers.length === 0
                          ? 'No eligible managers available'
                          : 'Select a manager…'
                    }</option>
                    {eligibleUsers.map((u: any) => {
                      const full = `${(u.first_name ?? '').trim()} ${(u.last_name ?? '').trim()}`.trim();
                      const label = full ? `${full} (${u.email ?? ''})` : (u.email ?? 'Unknown');
                      return <option key={u.id} value={u.id}>{label}</option>;
                    })}
                  </Select>
                </FormField>
                <FormField $span2>
                  <Label htmlFor="team-desc">Description</Label>
                  <Input id="team-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
                </FormField>
              </Grid>
              <DialogActions>
                <SecondaryButton type="button" onClick={() => setOpenModal(false)}>Cancel</SecondaryButton>
                <PrimaryButton type="submit" disabled={submitting}>{submitting ? 'Adding...' : 'Add Team'}</PrimaryButton>
              </DialogActions>
            </form>
          </Dialog>
        </DialogBackdrop>
      )}
    </Page>
  );
};

export default ManageTeams;

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
  background: #0d6efd;
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
  font-family: inherit;
  font-weight: 600;
  align-self: flex-start;
  font-size: 14px;
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
