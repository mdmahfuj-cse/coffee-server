const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello, Coffee Server!');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});



import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Eye,
  EyeOff,
  Plus,
  Receipt,
  SlidersHorizontal,
  Snowflake,
  Unlock,
  Wallet,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DetailRow, Panel, PanelBody, PanelHeader } from '@/components/ui/Panel';
import { Button, IconButton } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { AmountInput, Field, Input, Select, Toggle } from '@/components/ui/Form';
import { CopyButton, Progress } from '@/components/ui/Controls';
import { Dialog } from '@/components/ui/Overlay';
import { Pagination } from '@/components/ui/Table';
import { EmptyState, ErrorState, InlineAlert, Skeleton } from '@/components/ui/Feedback';
import { StatGrid, StatTile } from '@/components/data/StatTile';
import { TransactionLedger } from '@/components/data/TransactionLedger';
import { TransactionDrawer } from '@/components/data/TransactionDrawer';
import { CardFace } from '@/components/brand/CardFace';
import { AmountRoll } from '@/components/brand/AmountRoll';
import { SpendBars } from '@/components/charts/SpendBars';
import { useApi } from '@/hooks/useApi';
import { useCurrency } from '@/providers/CurrencyProvider';
import { useToast } from '@/providers/ToastProvider';
import { useConfirm } from '@/providers/ConfirmProvider';
import { api } from '@/mocks/api';
import { cn } from '@/lib/cn';
import {
  CURRENCIES,
  convertMinor,
  formatMoney,
  parseAmountInput,
  toMajor,
  toMinor,
} from '@/lib/money';
import { maskAccount, maskPan } from '@/lib/masking';
import { fmtDate, fmtMonth, lastMonths, monthKey } from '@/lib/dates';
import type { BankCard, SeriesPoint, Transaction } from '@/types/domain';

/** Which mutation is in flight, so only the button that started it spins. */
type Busy = 'freeze' | 'limits' | 'issue' | null;

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Try again in a moment.';

/** Card details reveal themselves for twenty seconds and then hide again. */
const REVEAL_MS = 20_000;

/** How many card payments the ledger shows at a time. */
const LEDGER_PAGE_SIZE = 6;

/**
 * Cards.
 *
 * The plates come first, because that is how people identify a card — by the
 * thing in their wallet, not by a row in a table. Everything below the carousel
 * belongs to whichever plate is selected: its details, its limits, its controls,
 * its payments. Numbers stay masked until asked for, and the reveal expires on
 * its own so a screen left open does not keep a PAN on it.
 */
export default function Cards() {
  const { money } = useCurrency();
  const toast = useToast();
  const confirm = useConfirm();

  const accounts = useApi(() => api.getAccounts(), []);
  const cards = useApi(() => api.getCards(), []);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const list = cards.data ?? [];
  // Selection falls back to the first card rather than being synced in an
  // effect, so there is no frame where a loaded wallet has nothing selected.
  const card = list.find((item) => item.id === selectedId) ?? list[0];
  const cardId = card?.id;

  const plates = useRef(new Map<string, HTMLDivElement>());

  const select = (id: string) => {
    setSelectedId(id);
    plates.current.get(id)?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  };

  const step = (delta: number) => {
    const index = list.findIndex((item) => item.id === cardId);
    const next = list[Math.min(Math.max(index + delta, 0), list.length - 1)];
    if (next && next.id !== cardId) select(next.id);
  };

  // A different card is a different question: hide the digits, start again at
  // the first page of its payments.
  useEffect(() => {
    setRevealed(false);
    setLedgerPage(1);
  }, [cardId]);

  useEffect(() => {
    if (!revealed) return;
    const timer = window.setTimeout(() => setRevealed(false), REVEAL_MS);
    return () => window.clearTimeout(timer);
  }, [revealed]);

  const ledger = useApi(
    () =>
      api.getTransactions({
        cardId,
        page: ledgerPage,
        pageSize: LEDGER_PAGE_SIZE,
        sortBy: 'date',
        sortDirection: 'desc',
      }),
    [cardId, ledgerPage],
    { enabled: Boolean(cardId) },
  );

  /** The card's whole history, for the spend bars. */
  const history = useApi(
    () => api.getTransactions({ cardId, pageSize: 2_000, sortBy: 'date', sortDirection: 'asc' }),
    [cardId],
    { enabled: Boolean(cardId) },
  );

  const spend = useMemo<SeriesPoint[]>(() => {
    const rows = history.data?.rows ?? [];
    return lastMonths(6).map((month) => {
      const key = monthKey(month.toISOString());
      const value = rows
        .filter(
          (transaction) =>
            transaction.direction === 'debit' &&
            transaction.status !== 'failed' &&
            monthKey(transaction.date) === key,
        )
        .reduce(
          (total, transaction) =>
            total +
            convertMinor(
              transaction.amountMinor + transaction.feeMinor,
              transaction.currency,
              'USD',
            ),
          0,
        );
      return { label: fmtMonth(month.toISOString()).slice(0, 3), value };
    });
  }, [history.data]);

  /** Wallet-wide figures, normalised to USD so mixed-currency cards can add up. */
  const totals = useMemo(() => {
    const spent = list.reduce(
      (sum, item) => sum + convertMinor(item.spentThisMonthMinor, item.currency, 'USD'),
      0,
    );
    const limit = list.reduce(
      (sum, item) => sum + convertMinor(item.monthlyLimitMinor, item.currency, 'USD'),
      0,
    );
    return {
      spent,
      limit,
      remaining: Math.max(limit - spent, 0),
      utilisation: limit > 0 ? (spent / limit) * 100 : 0,
      frozen: list.filter((item) => item.frozen).length,
      virtual: list.filter((item) => item.variant === 'virtual').length,
      count: list.length,
    };
  }, [list]);

  const fundingAccount = (accounts.data ?? []).find((item) => item.id === card?.accountId);

  /* ─────────────────────────── Mutations ─────────────────────────── */

  /** Write a server response straight into the cache; no refetch needed. */
  const replaceCard = (next: BankCard) =>
    cards.setData((cards.data ?? []).map((item) => (item.id === next.id ? next : item)));

  const toggleFreeze = async () => {
    if (!card) return;
    const freeze = !card.frozen;

    const confirmed = await confirm(
      freeze
        ? {
            title: `Freeze ${card.label}?`,
            description:
              'Every payment on this card will be declined until you unfreeze it. Standing orders and subscriptions resume where they left off.',
            confirmLabel: 'Freeze card',
          }
        : {
            title: `Unfreeze ${card.label}?`,
            description: 'The card will start authorising payments again immediately.',
            confirmLabel: 'Unfreeze card',
          },
    );
    if (!confirmed) return;

    setBusy('freeze');
    try {
      replaceCard(await api.setCardFrozen(card.id, freeze));
      if (freeze) {
        toast.warning('Card frozen', `${card.label} will decline payments until you unfreeze it.`);
      } else {
        toast.success('Card unfrozen', `${card.label} can be used again.`);
      }
    } catch (error) {
      toast.error('The card did not change', errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  /**
   * Controls flip on screen first and roll back if the call fails. A switch that
   * waits half a second before moving feels broken, so it moves now and tells
   * the truth later.
   */
  const setControls = async (
    patch: Partial<Pick<BankCard, 'contactless' | 'onlinePayments' | 'atmWithdrawals'>>,
  ) => {
    if (!card) return;
    const previous = card;
    replaceCard({ ...card, ...patch });

    try {
      replaceCard(await api.updateCardControls(card.id, patch));
    } catch (error) {
      replaceCard(previous);
      toast.error('That control did not change', errorMessage(error));
    }
  };

  /* ───────────────────────── Limits dialog ───────────────────────── */

  const [limitsOpen, setLimitsOpen] = useState(false);
  const [monthlyInput, setMonthlyInput] = useState('');
  const [perInput, setPerInput] = useState('');
  const [limitError, setLimitError] = useState<string | null>(null);

  const openLimits = () => {
    if (!card) return;
    setMonthlyInput(String(toMajor(card.monthlyLimitMinor, card.currency)));
    setPerInput(String(toMajor(card.perTransactionLimitMinor, card.currency)));
    setLimitError(null);
    setLimitsOpen(true);
  };

  const saveLimits = async () => {
    if (!card) return;

    const monthly = parseAmountInput(monthlyInput);
    const per = parseAmountInput(perInput);

    if (!Number.isFinite(monthly) || monthly <= 0) {
      setLimitError('Enter a monthly limit greater than zero.');
      return;
    }
    if (!Number.isFinite(per) || per <= 0) {
      setLimitError('Enter a per-transaction limit greater than zero.');
      return;
    }
