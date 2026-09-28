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
