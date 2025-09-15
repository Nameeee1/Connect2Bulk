import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import FolderTabs from '../../components/FolderTabs';
import { Icon } from '@iconify-icon/react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { useAlert } from '../../components/AlertProvider';
import AllFirmTrucks from './tabs/AllFirmTrucks';
import { TRAILER_TYPES, TRAILER_TYPES_SET, toAllCaps } from './constants';

const TruckBoard: React.FC = () => {
  // Amplify Data client
  const client = useMemo(() => generateClient<Schema>(), []);
  const { info, warning } = useAlert();

  // Listing refresh + optimistic lastCreated
  const [refreshToken, setRefreshToken] = useState(0);
  const [lastCreated, setLastCreated] = useState<any | null>(null);
  const incrementRefreshToken = () => setRefreshToken((v) => v + 1);

  // Add Truck modal state
  const [isAddOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    truck_number: '',
    available_date: '',
    origin: '',
    destination_preference: '',
    trailer_type: '',
    equipment: '',
    length_ft: '',
    weight_capacity: '',
    comment: '',
  });

  // Generate a unique random truck number
  const generateTruckNumber = () => {
    const prefix = 'TN';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}-${timestamp}-${random}`;
  };

  // Date picker ref and opener
  const availableDateRef = useRef<HTMLInputElement | null>(null);
  const openDatePicker = (ref: React.RefObject<HTMLInputElement | null>) => {
    const el = ref.current as any;
    try {
      if (el?.showPicker) {
        el.showPicker();
        return;
      }
    } catch (_) {
      // ignore and fallback to focus
    }
    ref.current?.focus();
  };

  // Initialize form with a random truck number when modal opens
  useEffect(() => {
    if (isAddOpen) {
      setForm((prev) => ({ ...prev, truck_number: generateTruckNumber() }));
    }
  }, [isAddOpen]);

  const onChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name === 'available_date') {
      const parts = value.split('-');
      if (parts[0] && parts[0].length > 4) parts[0] = parts[0].slice(0, 4);
      const sanitized = parts.join('-');
      setForm((prev) => ({ ...prev, [name]: sanitized }));
      return;
    }
    if (name === 'trailer_type') {
      setForm((prev) => ({ ...prev, trailer_type: toAllCaps(value) }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const closeModal = () => {
    if (adding) return;
    setError(null);
    setAddOpen(false);
  };

  const onCancel = () => {
    if (adding) return;
    const { close } = warning({
      title: 'Discard this truck post?',
      message: 'Your changes will be lost.',
      autoClose: false,
      position: 'top-right',
      action: (
        <ToastActionRow>
          <ToastPrimaryBtn
            type="button"
            onClick={() => {
              close();
              closeModal();
              info({
                title: 'Cancelled',
                message: 'Post Truck was cancelled.',
                autoClose: true,
                autoCloseDuration: 3500,
                position: 'top-right',
              });
            }}
          >
            Discard
          </ToastPrimaryBtn>
          <ToastSecondaryBtn type="button" onClick={() => close()}>
            Keep Editing
          </ToastSecondaryBtn>
        </ToastActionRow>
      ),
    });
  };

  const validateForm = (): string | null => {
    const errors: string[] = [];
    const tn = form.truck_number.trim();
    if (!tn) errors.push('Truck Number is required.');
    if (tn.length > 50) errors.push('Truck Number must be 50 characters or less.');

    const ad = form.available_date.trim();
    if (!ad) errors.push('Available Date is required.');
    else {
      const m = /^([0-9]{4})-(\d{2})-(\d{2})$/.exec(ad);
      if (!m) errors.push('Available Date must be in YYYY-MM-DD format.');
      else {
        const year = parseInt(m[1], 10);
        const month = parseInt(m[2], 10);
        const day = parseInt(m[3], 10);
        if (m[1].length !== 4) errors.push('Year must be 4 digits.');
        if (year < 1900 || year > 2100) errors.push('Year must be between 1900 and 2100.');
        if (month < 1 || month > 12) errors.push('Month must be 01-12.');
        if (day < 1 || day > 31) errors.push('Day must be 01-31.');
        const dt = new Date(ad);
        if (isNaN(dt.getTime())) errors.push('Available Date is invalid.');
      }
    }

    if (!form.origin.trim()) errors.push('Origin is required.');

    if (!form.trailer_type.trim()) {
      errors.push('Trailer Type is required.');
    } else {
      const tt = toAllCaps(form.trailer_type.trim());
      if (!TRAILER_TYPES_SET.has(tt)) {
        errors.push(
          'Trailer Type must match one of the allowed values: ' +
            Array.from(TRAILER_TYPES_SET).join(', ') +
            '.'
        );
      }
    }

    if (form.length_ft) {
      const len = parseInt(form.length_ft, 10);
      if (isNaN(len) || len < 0) errors.push('Length (ft) must be a non-negative integer.');
      if (len > 500) errors.push('Length (ft) seems too large (> 500).');
    }

    if (form.weight_capacity) {
      const wt = parseInt(form.weight_capacity, 10);
      if (isNaN(wt) || wt < 0) errors.push('Weight Capacity must be a non-negative integer.');
      if (wt > 200000) errors.push('Weight Capacity seems too large.');
    }

    return errors.length ? errors.join(' ') : null;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setAdding(true);
    try {
      const validation = validateForm();
      if (validation) {
        setError(validation);
        setAdding(false);
        return;
      }
      const payload = {
        truck_number: form.truck_number.trim(),
        available_date: form.available_date.trim(),
        origin: form.origin.trim(),
        destination_preference: form.destination_preference.trim(),
        trailer_type: form.trailer_type.trim(),
        equipment: form.equipment.trim(),
        length_ft: form.length_ft ? parseInt(form.length_ft, 10) : undefined,
        weight_capacity: form.weight_capacity ? parseInt(form.weight_capacity, 10) : undefined,
        comment: form.comment.trim(),
        created_at: new Date().toISOString(),
      } as const;

      if (!payload.truck_number || !payload.available_date || !payload.origin || !payload.trailer_type) {
        setError('Please fill Truck Number, Available Date, Origin and Trailer Type.');
        setAdding(false);
        return;
      }

      const created = await client.models.Truck.create(payload as any);
      // Reset and close
      setForm({
        truck_number: '',
        available_date: '',
        origin: '',
        destination_preference: '',
        trailer_type: '',
        equipment: '',
        length_ft: '',
        weight_capacity: '',
        comment: '',
      });
      setAddOpen(false);
      // optimistic
      const optimistic = (created as any)?.data ?? payload;
      setLastCreated(optimistic);
      incrementRefreshToken();
    } catch (err: any) {
      console.error('Create Truck failed', err);
      setError(err?.message ?? 'Failed to post truck');
    } finally {
      setAdding(false);
    }
  };

  return (
    <Page>
      <Content>
        <FolderTabs
          ariaLabel="Truckboard Sections"
          idPrefix="truckboard"
          tabs={[
            {
              id: 'posted',
              label: 'Posted Trucks',
              content: (
                <AllFirmTrucks
                  key={`all-firm-trucks-${refreshToken}`}
                  onAddNewTruck={() => setAddOpen(true)}
                  refreshToken={refreshToken}
                  lastCreated={lastCreated}
                />
              ),
            },
            {
              id: 'search',
              label: 'Search Trucks',
              content: (
                <>
                  <PanelTitle>Search Trucks</PanelTitle>
                  <PanelText>
                    Search interface and results for trucks will appear here.
                  </PanelText>
                </>
              ),
            },
            {
              id: 'my',
              label: 'My Trucks',
              content: (
                <>
                  <PanelTitle>My Trucks</PanelTitle>
                  <PanelText>
                    Your saved and managed trucks will appear here.
                  </PanelText>
                </>
              ),
            },
          ]}
          brand={
            <Brand>
              <PageName>Truckboard</PageName>
              <Logo src="/logo128.png" alt="Connect2Bulk" />
            </Brand>
          }
        />

        {isAddOpen && (
          <ModalOverlay role="dialog" aria-modal="true" onClick={closeModal}>
            <ModalCard onClick={(e) => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>Post Truck</ModalTitle>
                <CloseBtn type="button" onClick={closeModal} aria-label="Close">
                  <Icon icon="mdi:close" />
                </CloseBtn>
              </ModalHeader>
              <form onSubmit={handleCreate}>
                <FormGrid>
                  <Field>
                    <FormLabel htmlFor="truck_number">Truck Number*</FormLabel>
                    <TextInput
                      id="truck_number"
                      name="truck_number"
                      value={form.truck_number}
                      readOnly
                      aria-readonly="true"
                      required
                      maxLength={50}
                    />
                  </Field>

                  <Field>
                    <FormLabel htmlFor="available_date">Available Date*</FormLabel>
                    <DateFieldRow>
                      <TextInput
                        id="available_date"
                        name="available_date"
                        type="date"
                        value={form.available_date}
                        onChange={onChange}
                        required
                        min="1900-01-01"
                        max="2100-12-31"
                        autoComplete="off"
                        inputMode="numeric"
                        ref={availableDateRef}
                      />
                      <CalendarBtn type="button" onClick={() => openDatePicker(availableDateRef)} aria-label="Open date picker">
                        <Icon icon="mdi:calendar-month-outline" />
                      </CalendarBtn>
                    </DateFieldRow>
                  </Field>

                  <Field>
                    <FormLabel htmlFor="origin">Origin*</FormLabel>
                    <TextInput id="origin" name="origin" value={form.origin} onChange={onChange} required maxLength={120} />
                  </Field>
                  <Field>
                    <FormLabel htmlFor="destination_preference">Destination Preference</FormLabel>
                    <TextInput id="destination_preference" name="destination_preference" value={form.destination_preference} onChange={onChange} maxLength={120} />
                  </Field>

                  <Field>
                    <FormLabel htmlFor="trailer_type">Trailer Type*</FormLabel>
                    <UppercaseInput
                      id="trailer_type"
                      name="trailer_type"
                      value={form.trailer_type}
                      onChange={onChange}
                      list="trailer-type-list"
                      placeholder="TYPE TO SEARCH (e.g., VAN, REEFER)"
                      required
                      maxLength={80}
                      autoComplete="off"
                    />
                    <datalist id="trailer-type-list">
                      {TRAILER_TYPES.map((t) => (
                        <option key={t} value={toAllCaps(t)} />
                      ))}
                    </datalist>
                  </Field>
                  <Field>
                    <FormLabel htmlFor="equipment">Equipment</FormLabel>
                    <TextInput id="equipment" name="equipment" value={form.equipment} onChange={onChange} maxLength={120} />
                  </Field>

                  <Field>
                    <FormLabel htmlFor="length_ft">Length (ft)</FormLabel>
                    <TextInput id="length_ft" name="length_ft" type="number" inputMode="numeric" min={0} step={1} value={form.length_ft} onChange={onChange} />
                  </Field>
                  <Field>
                    <FormLabel htmlFor="weight_capacity">Weight Capacity</FormLabel>
                    <TextInput id="weight_capacity" name="weight_capacity" type="number" inputMode="numeric" min={0} step={1} value={form.weight_capacity} onChange={onChange} />
                  </Field>

                  <Field $full>
                    <FormLabel htmlFor="comment">Comment</FormLabel>
                    <TextArea id="comment" name="comment" rows={3} maxLength={500} value={form.comment} onChange={onChange} />
                  </Field>
                </FormGrid>
                {error && <ErrorText role="alert">{error}</ErrorText>}
                <ModalFooter>
                  <SecondaryBtn type="button" onClick={onCancel} disabled={adding}>Cancel</SecondaryBtn>
                  <PrimaryBtn type="submit" disabled={adding}>{adding ? 'Saving…' : 'Post Truck'}</PrimaryBtn>
                </ModalFooter>
              </form>
            </ModalCard>
          </ModalOverlay>
        )}
      </Content>
    </Page>
  );
};

// styled-components placed below the component (per preference)
const Page = styled.div`
  min-height: 100vh;
  width: 100%;
  background-color: #f7f8fb;
  padding: clamp(16px, 2vw, 32px);
  box-sizing: border-box;
`;

const Brand = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-bottom: auto;
`;

const Logo = styled.img`
  width: clamp(20px, 3vw, 28px);
  height: clamp(20px, 3vw, 28px);
  border-radius: 6px;
`;

const PageName = styled.span`
  font-weight: 700;
  color: #2a2f45;
  font-size: clamp(14px, 2vw, 18px);
`;

const Content = styled.main`
  background: #ffffff;
  border: 1px solid rgba(40, 44, 69, 0.06);
  border-radius: 12px;
  padding: clamp(16px, 2.5vw, 24px);
`;

const PanelTitle = styled.h3`
  margin: 0 0 8px 0;
  color: #2a2f45;
  font-size: clamp(16px, 2.2vw, 18px);
`;

const PanelText = styled.p`
  margin: 0;
  color: #6c757d;
  font-size: clamp(12px, 1.8vw, 14px);
`;

export default TruckBoard;

// Modal styled-components
const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(17, 24, 39, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 50;
`;

const ModalCard = styled.div`
  width: min(720px, 100%);
  background: #fff;
  border-radius: 12px;
  border: 1px solid rgba(40, 44, 69, 0.08);
  box-shadow: 0 12px 30px rgba(0,0,0,0.12);
  max-height: 90vh;
  overflow: auto;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(40, 44, 69, 0.06);
`;

const ModalTitle = styled.h3`
  margin: 0;
  font-size: clamp(16px, 2.2vw, 18px);
  color: #1f2937;
`;

const CloseBtn = styled.button`
  appearance: none;
  border: none;
  background: transparent;
  color: #1f2937;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  cursor: pointer;
  &:hover { background: #f3f4f6; }
`;

const FormGrid = styled.div`
  padding: 14px 16px 4px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  align-items: start;
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const Field = styled.div<{ $full?: boolean }>`
  grid-column: ${(p) => (p.$full ? '1 / -1' : 'auto')};
  /* prevent overflow in CSS grid when content is long */
  min-width: 0;
`;

const FormLabel = styled.label`
  display: block;
  margin: 0 0 6px;
  color: #2a2f45;
  font-size: 13px;
  font-weight: 600;
`;

const sharedInput = `
  width: 100%;
  padding: 10px 12px;
  border: 1px solid rgba(40, 44, 69, 0.16);
  border-radius: 8px;
  background: #fff;
  color: #1f2937;
  font-size: 14px;
  font-family: inherit;
  box-sizing: border-box;
  min-height: 40px;
  outline: none;
  &:focus {
    border-color: #111827;
    box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.12);
  }
`;

const TextInput = styled.input`
  ${sharedInput}
`;

const TextArea = styled.textarea`
  ${sharedInput}
  resize: vertical;
`;

/* Visually enforce ALL CAPS for fields like Trailer Type */
const UppercaseInput = styled(TextInput)`
  text-transform: uppercase;
`;

/* Inline row for date input + calendar button */
const DateFieldRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  align-items: center;
  min-width: 0;
`;

const CalendarBtn = styled.button`
  appearance: none;
  border: 1px solid rgba(40, 44, 69, 0.16);
  border-radius: 8px;
  background: #fff;
  color: #1f2937;
  padding: 0 10px;
  height: 40px; /* match sharedInput min-height for visual alignment */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  &:hover { background: #f3f4f6; }
  svg { width: 20px; height: 20px; }
`;

const ErrorText = styled.div`
  color: #b00020;
  background: #ffe3e3;
  border: 1px solid #ffb3b3;
  margin: 8px 16px 0;
  padding: 8px 10px;
  border-radius: 8px;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 16px 16px;
`;

const PrimaryBtn = styled.button`
  appearance: none;
  border: none;
  border-radius: 8px;
  padding: 10px 14px;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  color: #ffffff;
  background: #1f2640;
  box-shadow: 0 4px 10px rgba(31, 38, 64, 0.25);
`;

const SecondaryBtn = styled.button`
  appearance: none;
  border: 1px solid rgba(40, 44, 69, 0.16);
  border-radius: 8px;
  padding: 10px 14px;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  color: #1f2937;
  background: #fff;
`;

// Toast confirmation action styles (used inside alert action)
const ToastActionRow = styled.div`
  display: inline-flex;
  gap: 8px;
`;

const ToastPrimaryBtn = styled.button`
  appearance: none;
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 8px 10px;
  font-weight: 700;
  font-size: 12px;
  cursor: pointer;
  color: #ffffff;
  background: #0d6efd; /* bright blue */
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.28);
  transition: background 140ms ease, transform 80ms ease, box-shadow 140ms ease;
  &:hover { background: #0b5ed7; }
  &:active { background: #0a58ca; transform: translateY(0.5px); }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.95), 0 0 0 5px rgba(17, 24, 39, 0.6);
  }
`;

const ToastSecondaryBtn = styled.button`
  appearance: none;
  border: 1px solid rgba(255, 255, 255, 0.85);
  border-radius: 6px;
  padding: 8px 10px;
  font-weight: 700;
  font-size: 12px;
  cursor: pointer;
  color: #ffffff; /* white text */
  background: transparent; /* outlined */
  transition: background 140ms ease, border-color 140ms ease;
  &:hover { background: rgba(255, 255, 255, 0.08); }
  &:active { background: rgba(255, 255, 255, 0.12); }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.85);
  }
`;

