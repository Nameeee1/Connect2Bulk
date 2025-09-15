import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { Icon } from '@iconify-icon/react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../amplify/data/resource';

type Props = {
  onAddNewTruck: () => void;
  refreshToken: number;
  lastCreated?: any | null;
};

const AllFirmTrucks: React.FC<Props> = ({ onAddNewTruck, refreshToken, lastCreated }) => {
  const client = useMemo(() => generateClient<Schema>(), []);

  // Search state
  const [searchText, setSearchText] = useState('');
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Data state
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  };

  const clearSearch = () => {
    setSearchText('');
    searchInputRef.current?.focus();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Wire up search server-side or filter client-side when data set is large
  };

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      clearSearch();
    }
  };

  // Global shortcut: Ctrl/Cmd+K focuses the search box
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const isMetaK = (ev.ctrlKey || ev.metaKey) && (ev.key === 'k' || ev.key === 'K');
      if (isMetaK) {
        ev.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Fetch trucks
  const fetchRows = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await client.models.Truck.list();
      const raw = (res as any)?.data;
      const listCandidate = Array.isArray(raw)
        ? raw
        : Array.isArray((raw as any)?.items)
        ? (raw as any).items
        : Array.isArray((res as any)?.items)
        ? (res as any).items
        : [];
      const list = Array.isArray(listCandidate) ? listCandidate : [];
      // Sort newest first using created_at, then available_date
      const parseDate = (x: any) => {
        const v = x?.created_at ?? x?.available_date;
        const d = v ? new Date(v) : null;
        return d && !isNaN(d.getTime()) ? d.getTime() : 0;
      };
      const sorted = [...list].sort((a, b) => parseDate(b) - parseDate(a));
      // Merge optimistic lastCreated if not present
      const key = (x: any) => x?.id ?? `${x?.truck_number ?? ''}-${x?.created_at ?? ''}`;
      const merged = lastCreated
        ? (sorted.some((r) => key(r) === key(lastCreated)) ? sorted : [lastCreated, ...sorted])
        : sorted;
      setRows(merged);
    } catch (e: any) {
      console.error('[AllFirmTrucks] list() error:', e);
      setError(e?.message ?? 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // fetch initially and when refreshToken changes
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken]);

  // Optimistic update when parent provides lastCreated
  useEffect(() => {
    if (!lastCreated) return;
    setRows((prev) => {
      const key = (x: any) => x?.id ?? `${x?.truck_number ?? ''}-${x?.created_at ?? ''}`;
      const lcKey = key(lastCreated);
      if (!lcKey) return prev;
      if (prev.some((r) => key(r) === lcKey)) return prev;
      return [lastCreated, ...prev];
    });
  }, [lastCreated]);

  const computeAge = (iso?: string, available?: string) => {
    const base = iso || available;
    if (!base) return '';
    const d = new Date(base);
    if (isNaN(d.getTime())) return '';
    const diffMs = Date.now() - d.getTime();
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    if (diffDays > 0) return `${diffDays}d`;
    const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
    if (diffHours > 0) return `${diffHours}h`;
    const diffMins = Math.floor(diffMs / (60 * 1000));
    return `${Math.max(diffMins, 0)}m`;
  };

  return (
    <>
      <Toolbar>
        <SearchForm onSubmit={handleSearchSubmit} role="search" aria-label="Search trucks">
          <SearchInput
            ref={searchInputRef}
            type="text"
            placeholder="Search trucks by any field"
            aria-label="Search trucks by any field"
            value={searchText}
            onChange={handleSearchChange}
            onKeyDown={onSearchKeyDown}
            inputMode="search"
          />
          {searchText && (
            <ClearBtn type="button" onClick={clearSearch} aria-label="Clear search">
              <Icon icon="mdi:close" />
            </ClearBtn>
          )}
          <SearchBtn type="submit" aria-label="Search">
            <Icon icon="mdi:magnify" />
          </SearchBtn>
        </SearchForm>

        <RightActions>
          <RefreshBtn
            type="button"
            onClick={fetchRows}
            aria-label="Refresh table"
            disabled={loading}
            title="Refresh"
          >
            <Icon icon="mdi:refresh" />
            <span>Refresh</span>
          </RefreshBtn>
          <AddBtn type="button" onClick={onAddNewTruck} aria-label="Post a truck">
            Post Truck
          </AddBtn>
        </RightActions>
      </Toolbar>

      <TableWrap>
        <StyledTable>
          <thead>
            <tr>
              <th>Age</th>
              <th>Truck Number</th>
              <th>Available Date</th>
              <th>Origin</th>
              <th>Destination Pref</th>
              <th>Trailer Type</th>
              <th>Equipment</th>
              <th>Length (ft)</th>
              <th>Weight Capacity</th>
              <th>Comment</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={10}>Loading…</td>
              </tr>
            )}
            {error && !loading && (
              <tr>
                <td colSpan={10} style={{ color: '#b00020' }}>{error}</td>
              </tr>
            )}
            {!loading && !error && rows.length === 0 && (
              <tr>
                <td colSpan={10}>No trucks found.</td>
              </tr>
            )}
            {!loading && !error && rows.map((r: any) => (
              <tr key={r.id ?? `${r.truck_number}-${r.created_at}`}>
                <td>{computeAge(r.created_at, r.available_date)}</td>
                <td>{r.truck_number}</td>
                <td>{r.available_date}</td>
                <td>{r.origin}</td>
                <td>{r.destination_preference}</td>
                <td>{r.trailer_type}</td>
                <td>{r.equipment}</td>
                <td>{typeof r.length_ft === 'number' ? r.length_ft : ''}</td>
                <td>{typeof r.weight_capacity === 'number' ? r.weight_capacity : ''}</td>
                <td>{r.comment}</td>
              </tr>
            ))}
          </tbody>
        </StyledTable>

        <PaginationRow>
          <RowsPerPage>
            <span>Rows per page:</span>
            <RppSelect defaultValue={15} aria-label="Rows per page">
              <option value={15}>15</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
            </RppSelect>
          </RowsPerPage>
          <PageInfo>
            {rows.length > 0 ? `1-${rows.length} of ${rows.length}` : '0-0 of 0'}
          </PageInfo>
          <Pager>
            <PageNavBtn aria-label="Previous page" disabled>
              <Icon icon="mdi:chevron-left" />
            </PageNavBtn>
            <PageNavBtn aria-label="Next page" disabled>
              <Icon icon="mdi:chevron-right" />
            </PageNavBtn>
          </Pager>
        </PaginationRow>
      </TableWrap>
    </>
  );
};

// styled-components below the component (per preference)
const Toolbar = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
  background: #ffffff;
  border: 1px solid rgba(40, 44, 69, 0.08);
  border-radius: 10px;
  padding: 10px;
  margin-bottom: 12px;
`;

const SearchForm = styled.form`
  display: inline-flex;
  align-items: stretch;
  border: 1px solid rgba(40, 44, 69, 0.16);
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
  max-width: 100%;
`;

const SearchInput = styled.input`
  border: none;
  outline: none;
  padding: 10px 12px;
  width: min(380px, 70vw);
  font-size: 14px;
  font-family: inherit;
  background-color: #fff;
  color: #1f2937;

  &::placeholder { color: #9aa3b2; }
`;

const ClearBtn = styled.button`
  appearance: none;
  border: none;
  background: transparent;
  color: #6b7280; /* gray-500 */
  padding: 0 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  &:hover { color: #111827; background: #f3f4f6; }
  svg { width: 16px; height: 16px; }
`;

const SearchBtn = styled.button`
  appearance: none;
  border: none;
  background: #111827;
  color: #fff;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  svg { width: 18px; height: 18px; }
`;

const AddBtn = styled.button`
  appearance: none;
  border: none;
  border-radius: 8px;
  padding: 10px 12px;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  color: #ffffff;
  background: #1f2640;
  box-shadow: 0 4px 10px rgba(31, 38, 64, 0.25);
  transition: transform 80ms ease, background 160ms ease;

  &:hover { transform: translateY(-1px); }
  &:active { transform: translateY(0); }
`;

const RightActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: auto; /* push actions to the right */
`;

const RefreshBtn = styled.button`
  appearance: none;
  border: 1px solid rgba(40, 44, 69, 0.16);
  border-radius: 8px;
  padding: 9px 12px;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  background: #fff;
  color: #1f2937;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: background 160ms ease, transform 80ms ease;
  &:hover { background: #f3f4f6; }
  &:active { transform: translateY(0.5px); }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
  svg { width: 18px; height: 18px; }
`;

/* Table */
const TableWrap = styled.div`
  border: 1px solid rgba(40, 44, 69, 0.06);
  border-radius: 10px;
  overflow-x: auto; /* allow horizontal scroll on smaller screens */
  overflow-y: hidden;
  background: #fff;
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;

  thead th {
    text-align: left;
    background: #f3f5f9;
    color: #2a2f45;
    font-weight: 700;
    font-size: 13px;
    padding: 12px;
    border-bottom: 1px solid rgba(40, 44, 69, 0.08);
  }

  tbody td {
    padding: 12px;
    font-size: 13px;
    color: #394260;
    border-top: 1px solid rgba(40, 44, 69, 0.04);
    white-space: nowrap;
  }
`;

/* Pagination */
const PaginationRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-top: 1px solid rgba(40, 44, 69, 0.06);
`;

const RowsPerPage = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #6c757d;
  font-size: 13px;
`;

const RppSelect = styled.select`
  border: 1px solid rgba(40, 44, 69, 0.16);
  border-radius: 6px;
  padding: 6px 8px;
  background: #fff;
  color: #1f2937;
`;

const PageInfo = styled.div`
  font-size: 13px;
  color: #6c757d;
`;

const Pager = styled.div`
  display: inline-flex;
  gap: 6px;
`;

const PageNavBtn = styled.button`
  appearance: none;
  border: 1px solid rgba(40, 44, 69, 0.16);
  background: #fff;
  color: #1f2937;
  width: 32px;
  height: 28px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg { width: 18px; height: 18px; }
`;

export default AllFirmTrucks;
