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

