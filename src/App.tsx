import { ImportAccounts } from "./ImportAccounts";
import { mergeExtracted } from "./importAccounts";
import { BankLogo } from "./BankLogo";
import { bankLogoOwner } from "./banks";
import { fieldsFor } from "./forms";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  CreditCard,
  Files,
  Route,
  Layers,
  House,
  CalendarDays,
  ChartNoAxesCombined,
  Settings,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  ChevronLeft,
  ChevronRight,
  Wallet,
  ShieldCheck,
  Download,
  Upload,
  Printer,
  Menu,
  Check,
  Paperclip,
  Trash2,
  X,
  CircleHelp,
} from "lucide-react";
import {
  emptyState,
  currentMonth,
  today,
  uid,
  validateState,
  type State,
  type Currency,
  type Card,
  type Table as TableName,
  type Statement,
} from "./model";
import {
  addMonth,
  currency as formatCurrency,
  dateLabel,
  monthLabel,
  status,
  daysUntil,
  paid as paidIn,
  balance as balanceIn,
  effectiveRate as effectiveRateIn,
  overview,
  statementValue,
  requiredPayment,
  paymentPlan,
  projection,
  estimate,
  deadlines,
  type Strategy,
} from "./finance";
import {
  readState,
  saveState,
  readAttachments,
  attach,
  deleteAttachment,
  exportBackup,
  parseBackup,
  type Attachment,
} from "./storage";
import { demoState } from "./demo";
import { Editor, Empty, Status, Actions, Table, Chart } from "./ui";
const nav = [
  ["home", "Inicio", LayoutDashboard],
  ["cards", "Mis tarjetas", CreditCard],
  ["statements", "Resúmenes", Files],
  ["plan", "Plan de pago", Route],
  ["installments", "Cuotas futuras", Layers],
  ["services", "Servicios", House],
  ["calendar", "Calendario", CalendarDays],
  ["history", "Historial", ChartNoAxesCombined],
  ["settings", "Configuración", Settings],
] as const;
type Editing = { table: TableName; row: Record<string, any>; title: string };
export default function App() {
  const [s, setS] = useState<State | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [month, setMonth] = useState(currentMonth()),
    [page, setPage] = useState("home"),
    [selectedCurrency, setSelectedCurrency] = useState<Currency>("ARS"),
    [editing, setEditing] = useState<Editing | null>(null),
    [detail, setDetail] = useState(""),
    [attachments, setAttachments] = useState<Attachment[]>([]),
    [strategy, setStrategy] = useState<Strategy>("recommended"),
    [mobile, setMobile] = useState(false),
    [historyCard, setHistoryCard] = useState("all"),
    [calendarMonth, setCalendarMonth] = useState(currentMonth()),
    [simId, setSimId] = useState(""),
    [simPay, setSimPay] = useState("0");
  useEffect(() => {
    readState()
      .then(setS)
      .catch((e) =>
        setError("No se pudieron abrir los datos locales. " + e.message),
      );
    readAttachments()
      .then(setAttachments)
      .catch((e) => setError(e.message));
    const refresh = () => {
      readState()
        .then(setS)
        .catch((e) => setError(e.message));
      readAttachments()
        .then(setAttachments)
        .catch((e) => setError(e.message));
    };
    const channel = new BroadcastChannel("mis-cuentas");
    channel.onmessage = refresh;
    return () => channel.close();
  }, []);
  async function mutate(fn: (state: State) => State) {
    try {
      await navigator.locks.request("mis-cuentas-write", async () => {
        const current = await readState();
        const next = validateState(fn(current));
        await saveState(next);
        setS(next);
        setAttachments(await readAttachments());
        const c = new BroadcastChannel("mis-cuentas");
        c.postMessage("updated");
        c.close();
      });
      setNotice("Cambios guardados en este dispositivo.");
      setError("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudieron guardar los datos",
      );
      throw e;
    }
  }
  const safely = (promise: Promise<unknown>) => {
    void promise.catch(() => {});
  };
  const edit = (table: TableName, row: Record<string, any>, title: string) =>
    setEditing({
      table,
      row:
        table === "expenses"
          ? {
              currency: unit,
              installmentCurrent: 1,
              installmentTotal: 1,
              ...row,
            }
          : table === "payments" || table === "purchases"
            ? { currency: unit, ...row }
            : table === "statements"
              ? {
                  paymentMode: row.minimum == null ? "unknown" : "minimum",
                  usdPaymentMode: "unknown",
                  ...row,
                }
              : row,
      title,
    });
  const go = (next: string) => {
    setPage(next);
    setMobile(false);
    setDetail("");
  };
  if (!s)
    return (
      <div className="loading">
        <Wallet size={38} />
        <h1>Arquitecta Patricia Tomoff</h1>
        <p>{error || "Abriendo tus datos locales…"}</p>
        {error && (
          <button className="button" onClick={() => location.reload()}>
            Reintentar
          </button>
        )}
      </div>
    );
  const unit: Currency = page === "services" ? "ARS" : selectedCurrency;
  const currency = (n: number | null | undefined) =>
    n == null ? "No informado" : formatCurrency(n, unit);
  const paid = (state: State, id: string) => paidIn(state, id, unit);
  const balance = (state: State, st: Statement) => balanceIn(state, st, unit);
  const effectiveRate = (state: State, st: Statement) =>
    effectiveRateIn(state, st, unit);
  const value = (st: Statement, key: Parameters<typeof statementValue>[1]) =>
    statementValue(st, key, unit);
  const minimum = (st: Statement) =>
    unit === "ARS" ? st.minimum : st.minimumUSD;
  const identifier = (c: Card) =>
    c.last4
      ? "•••• " + c.last4
      : c.referenceLast4
        ? `${c.referenceKind === "member" ? "Socio" : "Cuenta"} •••• ${c.referenceLast4} · tarjeta por confirmar`
        : "Terminación por confirmar";
  const o = overview(s, month, unit),
    budget = s.budgets.find((x) => x.month === month),
    available =
      unit === "ARS" ? (budget?.cardBudget ?? 0) : (budget?.cardBudgetUSD ?? 0),
    plan = paymentPlan(s, month, available, strategy, unit);
  const cardName = (id: string) =>
    s.cards.find((c) => c.id === id)?.name ?? "Tarjeta";
  const serviceName = (id: string) =>
    s.services.find((c) => c.id === id)?.company ?? "Servicio";
  const newCard = () =>
    edit(
      "cards",
      {
        id: uid(),
        bank: "",
        name: "",
        brand: "Visa",
        last4: "",
        closingDay: 20,
        dueDay: 28,
        interestRate: null,
        financingRate: null,
        notes: "",
      },
      "Agregar tarjeta",
    );
  const newStatement = (cardId = s.cards[0]?.id ?? "") =>
    edit(
      "statements",
      {
        id: uid(),
        cardId,
        month,
        closingDate: month + "-20",
        dueDate: month + "-28",
        previous: 0,
        consumption: 0,
        interest: 0,
        taxes: 0,
        other: 0,
        previousPayments: 0,
        total: 0,
        minimum: 0,
        paymentMode: "minimum",
        totalUSD: 0,
        minimumUSD: null,
        usdPaymentMode: "unknown",
        rate: null,
        notes: "",
      },
      "Nuevo resumen mensual",
    );
  const newService = () =>
    edit(
      "services",
      {
        id: uid(),
        company: "",
        type: "Electricidad",
        reference: "",
        notes: "",
      },
      "Agregar servicio",
    );
  const newInvoice = (serviceId = s.services[0]?.id ?? "") =>
    edit(
      "invoices",
      {
        id: uid(),
        serviceId,
        month,
        issued: today(),
        dueDate: month + "-28",
        amount: 0,
        paid: false,
        paidDate: "",
        method: "",
        notes: "",
      },
      "Nueva factura",
    );
  const newPurchase = () =>
    edit(
      "purchases",
      {
        id: uid(),
        cardId: s.cards[0]?.id ?? "",
        description: "",
        month,
        current: 1,
        total: 12,
        amount: 0,
      },
      "Agregar compra en cuotas",
    );
  const editBudget = () =>
    edit(
      "budgets",
      budget ?? { id: uid(), month, income: 0, other: 0, cardBudget: 0 },
      "Presupuesto de " + monthLabel(month),
    );
  async function remove(table: TableName, id: string) {
    if (
      !confirm(
        "¿Eliminar este registro? Se eliminarán también sus registros dependientes y documentos. Esta acción no se puede deshacer. Exporta una copia si necesitas conservarlos.",
      )
    )
      return;
    safely(
      mutate((current) => {
        const n = structuredClone(current);
        const stIds = new Set(
          n.statements
            .filter(
              (x) =>
                (table === "cards" && x.cardId === id) ||
                (table === "statements" && x.id === id),
            )
            .map((x) => x.id),
        );
        const invIds = new Set(
          n.invoices
            .filter(
              (x) =>
                (table === "services" && x.serviceId === id) ||
                (table === "invoices" && x.id === id),
            )
            .map((x) => x.id),
        );
        const pIds = new Set(
          n.purchases
            .filter(
              (x) =>
                (table === "cards" && x.cardId === id) ||
                (table === "purchases" && x.id === id),
            )
            .map((x) => x.id),
        );
        n.statements = n.statements.filter((x) => !stIds.has(x.id));
        n.expenses = n.expenses
          .filter((x) => !stIds.has(x.statementId))
          .map((x) => (pIds.has(x.purchaseId) ? { ...x, purchaseId: "" } : x));
        n.payments = n.payments.filter((x) => !stIds.has(x.statementId));
        n.purchases = n.purchases.filter((x) => !pIds.has(x.id));
        n.invoices = n.invoices.filter((x) => !invIds.has(x.id));
        (n[table] as { id: string }[]) = (n[table] as { id: string }[]).filter(
          (x) => x.id !== id,
        );
        return n;
      }),
    );
  }
  const actions = (
    table: TableName,
    row: Record<string, any>,
    title: string,
  ) => (
    <Actions
      edit={() => edit(table, row, title)}
      remove={() => void remove(table, row.id)}
    />
  );
  const upload = async (ownerId: string, file?: File) => {
    if (!file) return;
    try {
      await navigator.locks.request("mis-cuentas-write", () =>
        attach(ownerId, file),
      );
      setAttachments(await readAttachments());
      setNotice(
        ownerId.startsWith("bank-logo:")
          ? "Logo del banco guardado en este dispositivo."
          : "Documento guardado localmente.",
      );
      const channel = new BroadcastChannel("mis-cuentas");
      channel.postMessage("updated");
      channel.close();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  function docs(ownerId: string) {
    return (
      <div className="documents">
        <label className="button secondary small">
          <Paperclip size={16} />
          Adjuntar PDF o imagen
          <input
            className="file-input"
            type="file"
            accept="application/pdf,image/png,image/jpeg"
            onChange={(e) => {
              void upload(ownerId, e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        <small>Máximo 15 MB por documento.</small>
        {attachments
          .filter((a) => a.ownerId === ownerId)
          .map((a) => (
            <div className="document" key={a.id}>
              <button
                className="text-button"
                onClick={() => {
                  const url = URL.createObjectURL(a.blob);
                  window.open(url, "_blank", "noopener,noreferrer");
                  setTimeout(() => URL.revokeObjectURL(url), 60000);
                }}
              >
                Abrir
              </button>
              <button
                className="text-button"
                onClick={() => {
                  const url = URL.createObjectURL(a.blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = a.name;
                  link.click();
                  setTimeout(() => URL.revokeObjectURL(url), 10000);
                }}
              >
                {a.name} <Download size={14} />
              </button>
              <button
                className="icon-button"
                aria-label={"Eliminar documento " + a.name}
                onClick={async () => {
                  if (confirm("¿Eliminar el documento adjunto?")) {
                    try {
                      await deleteAttachment(a.id);
                      setAttachments(await readAttachments());
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }
                }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
      </div>
    );
  }
  const future = projection(s, month, 12, unit);
  const due = deadlines(s, unit).filter(
    (d) => d.amount > 0 && d.month === month,
  );
  const monthDue = deadlines(s, unit).filter((d) => d.month === month);

  const metric = (
    label: string,
    value: number | null | undefined,
    sub?: string,
    highlight = false,
    overrideUnit?: Currency,
  ) => (
    <div className={"metric " + (highlight ? "highlight" : "")}>
      <span>{label}</span>
      <strong>
        {overrideUnit && value != null
          ? formatCurrency(value, overrideUnit)
          : currency(value)}
      </strong>
      {sub && <small>{sub}</small>}
    </div>
  );
  const panel = (title: string, children: ReactNode, action?: ReactNode) => (
    <section className="panel">
      <div className="panel-head">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
  const historyMonths = [...new Set(s.statements.map((st) => st.month))].sort();
  const debtPoints = historyMonths.map((m) => ({
    label: monthLabel(m),
    value: s.statements
      .filter(
        (st) =>
          st.month === m &&
          (historyCard === "all" || st.cardId === historyCard),
      )
      .reduce((a, st) => a + balance(s, st), 0),
  }));
  const arsOverview = overview(s, month, "ARS");
  const budgetView = (
    <>
      <div className="budget-list">
        <div>
          <span>Ingresos ARS</span>
          <strong>{formatCurrency(budget?.income ?? 0)}</strong>
        </div>
        <div>
          <span>Servicios ARS</span>
          <strong>− {formatCurrency(arsOverview.services)}</strong>
        </div>
        <div>
          <span>Reservado para tarjetas ARS</span>
          <strong>− {formatCurrency(budget?.cardBudget ?? 0)}</strong>
        </div>
        <div>
          <span>Otros gastos ARS</span>
          <strong>− {formatCurrency(budget?.other ?? 0)}</strong>
        </div>
        <div className="budget-total">
          <span>Disponible en pesos después del plan</span>
          <strong>
            {formatCurrency(
              (budget?.income ?? 0) -
                arsOverview.services -
                (budget?.cardBudget ?? 0) -
                (budget?.other ?? 0),
            )}
          </strong>
        </div>
        <div>
          <span>Disponible para tarjetas en USD (separado)</span>
          <strong>{formatCurrency(budget?.cardBudgetUSD ?? 0, "USD")}</strong>
        </div>
      </div>
      <button className="button secondary full" onClick={editBudget}>
        Editar presupuesto
      </button>
    </>
  );
  let content: ReactNode;
  if (page === "home")
    content = (
      <>
        <div className="welcome">
          <div>
            <span className="eyebrow">TU TRANQUILIDAD, UN MES A LA VEZ</span>
            <h2>Un vistazo a tus cuentas</h2>
            <p>Todo lo que necesitas para organizar {monthLabel(month)}.</p>
          </div>
          <div className="welcome-icon">
            <House size={46} />
          </div>
        </div>
        <div className="metrics">
          {metric(
            "Deuda pendiente en tarjetas",
            o.debt,
            "Saldo de los resúmenes de este período",
            true,
          )}
          {metric(
            "Obligaciones del mes",
            o.obligations,
            "Tarjetas + servicios",
          )}
          {metric("Ya pagado", o.payment, "Pagos de tarjetas y facturas")}
          {metric(
            "Total pendiente",
            o.pending,
            "Lo que falta para completar el mes",
          )}
        </div>
        <div className="two-col">
          <div>
            {panel(
              "Próximos vencimientos",
              <>
                {due.length ? (
                  <div className="deadline-list">
                    {due.slice(0, 5).map((d) => (
                      <div className="deadline" key={d.id}>
                        <div className="date-tile">
                          <strong>{d.dueDate.slice(8)}</strong>
                          <small>
                            {new Date(
                              d.dueDate + "T12:00:00",
                            ).toLocaleDateString("es-AR", { month: "short" })}
                          </small>
                        </div>
                        <div className="grow">
                          <strong>{d.name}</strong>
                          <small>
                            {d.kind} ·{" "}
                            {daysUntil(d.dueDate) < 0
                              ? `${Math.abs(daysUntil(d.dueDate))} días de atraso`
                              : daysUntil(d.dueDate) === 0
                                ? "Vence hoy"
                                : `Vence en ${daysUntil(d.dueDate)} días`}
                          </small>
                        </div>
                        <div className="align-right">
                          <strong>{currency(d.amount)}</strong>
                          <Status value={status(d.dueDate, d.amount)} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty>
                    Cuando agregues resúmenes o facturas, verás sus vencimientos
                    aquí.
                  </Empty>
                )}
              </>,
              <button className="text-button" onClick={() => go("calendar")}>
                Ver calendario <ArrowUpRight size={16} />
              </button>,
            )}
            {panel(
              "Tus tarjetas este mes",
              s.cards.length ? (
                <div className="mini-cards">
                  {s.cards.map((c) => {
                    const st = o.statements.find((x) => x.cardId === c.id);
                    return (
                      <button
                        className="mini-card"
                        key={c.id}
                        onClick={() => {
                          go("statements");
                          if (st) setDetail(st.id);
                        }}
                      >
                        <BankLogo bank={c.bank} attachments={attachments} />
                        <div>
                          <strong>{c.name}</strong>
                          <small>{identifier(c)}</small>
                        </div>
                        <div className="align-right">
                          <strong>
                            {st ? currency(balance(s, st)) : "Sin resumen"}
                          </strong>
                          <small>
                            {st
                              ? "Saldo pendiente"
                              : "Carga el resumen de este mes"}
                          </small>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <Empty
                  action={
                    <button className="button" onClick={newCard}>
                      <Plus size={17} />
                      Agregar mi primera tarjeta
                    </button>
                  }
                >
                  Registra únicamente los últimos cuatro dígitos.
                </Empty>
              ),
              <button className="text-button" onClick={() => go("cards")}>
                Mis tarjetas <ArrowUpRight size={16} />
              </button>,
            )}
          </div>
          <div>
            {panel("Tu presupuesto", budgetView, <Wallet size={19} />)}
            <section className="plan-teaser">
              <Route size={30} />
              <h2>Un plan, paso a paso</h2>
              <p>
                Organiza el dinero disponible y conoce qué pagos conviene
                priorizar.
              </p>
              <div>
                <span>Obligaciones conocidas pendientes</span>
                <strong>{currency(o.minimum)}</strong>
              </div>
              <div>
                <span>Servicios del mes</span>
                <strong>{currency(o.services)}</strong>
              </div>
              <div>
                <span>Total recomendado a pagar</span>
                <strong>
                  {plan.blocked
                    ? "Requiere revisión"
                    : currency(plan.allocated)}
                </strong>
              </div>
              <button className="button" onClick={() => go("plan")}>
                Armar mi plan de pago <ArrowUpRight size={17} />
              </button>
            </section>
          </div>
        </div>
        <div className="tip">
          <ShieldCheck size={21} />
          <p>
            <strong>Tus cuentas se quedan contigo.</strong> Los datos y
            documentos se guardan en este navegador. Exporta una copia de
            seguridad regularmente.
          </p>
        </div>
      </>
    );
  else if (page === "cards")
    content = (
      <>
        <div className="section-intro">
          <p>
            Solo los datos necesarios para organizarte. Nunca guardamos números
            completos ni claves.
          </p>
          <button className="button" onClick={newCard}>
            <Plus size={18} />
            Agregar tarjeta
          </button>
        </div>
        <div className="card-grid">
          {s.cards.map((c, i) => (
            <section className="panel card-panel" key={c.id}>
              <div className={"bank-card theme-" + (i % 3)}>
                <div>
                  <span className="bank-name">
                    <BankLogo bank={c.bank} attachments={attachments} />
                    <span>{c.bank}</span>
                  </span>
                  <CreditCard size={27} />
                </div>
                <h2>{c.name}</h2>
                <p>{identifier(c)}</p>
                <div>
                  <small>Cierre: día {c.closingDay}</small>
                  <strong>{c.brand}</strong>
                </div>
              </div>
              <div className="card-info">
                <span>
                  Vencimiento habitual<strong>Día {c.dueDay}</strong>
                </span>
                <span>
                  Financiación mensual
                  <strong>
                    {(unit === "ARS" ? c.financingRate : c.financingRateUSD) ==
                    null
                      ? "Sin informar"
                      : (unit === "ARS"
                          ? c.financingRate
                          : c.financingRateUSD) + " % TEM"}
                  </strong>
                </span>
              </div>
              <div className="bank-logo-controls">
                <label className="button secondary small">
                  <Upload size={15} />
                  {attachments.some((a) => a.ownerId === bankLogoOwner(c.bank))
                    ? "Cambiar logo"
                    : "Cargar logo del banco"}
                  <input
                    className="file-input"
                    type="file"
                    accept="image/png,image/jpeg"
                    aria-label={`Logo de ${c.bank}`}
                    onChange={(e) => {
                      void upload(bankLogoOwner(c.bank), e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
                {attachments.some(
                  (a) => a.ownerId === bankLogoOwner(c.bank),
                ) && (
                  <button
                    className="icon-button"
                    aria-label={`Quitar logo de ${c.bank}`}
                    onClick={async () => {
                      if (
                        !confirm(
                          "¿Quitar el logo de todas las tarjetas de este banco?",
                        )
                      )
                        return;
                      try {
                        await navigator.locks.request(
                          "mis-cuentas-write",
                          async () => {
                            const all = await readAttachments();
                            for (const a of all.filter(
                              (a) => a.ownerId === bankLogoOwner(c.bank),
                            ))
                              await deleteAttachment(a.id);
                          },
                        );
                        setAttachments(await readAttachments());
                        setNotice("Logo eliminado.");
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <small>
                  PNG o JPG, hasta 2 MB. Se comparte con las tarjetas del mismo
                  banco.
                </small>
              </div>
              {c.notes && <p className="muted">{c.notes}</p>}
              <div className="row-between">
                <button
                  className="button secondary"
                  onClick={() => newStatement(c.id)}
                >
                  Cargar resumen
                </button>
                {actions("cards", c, "Editar tarjeta")}
              </div>
            </section>
          ))}
        </div>
        {!s.cards.length && <Empty>Agrega tus tarjetas para empezar.</Empty>}
      </>
    );
  else if (page === "statements") {
    const st = s.statements.find((x) => x.id === detail);
    content = st ? (
      <>
        <button className="text-button back" onClick={() => setDetail("")}>
          <ChevronLeft size={18} />
          Todos los resúmenes
        </button>
        <div className="section-intro">
          <div>
            <h2>{cardName(st.cardId)}</h2>
            <p>
              {monthLabel(st.month)} · Cierre {dateLabel(st.closingDate)} ·
              Vence {dateLabel(st.dueDate)}
            </p>
          </div>
          {actions("statements", st, "Editar resumen")}
        </div>
        <div className="metrics">
          {metric("Total informado", value(st, "total"))}
          {metric("Mínimo informado", minimum(st))}
          {metric("Pagado", paid(s, st.id))}
          {metric("Saldo pendiente", balance(s, st), undefined, true)}
        </div>
        {st.paymentsConfirmed === false && (
          <div className="alert warning">
            <strong>Pagos posteriores al cierre pendientes de revisar.</strong>
            <p>
              Los pagos del documento ya están descontados del total. Registra
              únicamente pagos posteriores a este cierre; luego confirma que el
              registro está actualizado.
            </p>
            <button
              className="button secondary"
              onClick={() => {
                if (
                  confirm(
                    "¿Confirmas que registraste todos los pagos posteriores al cierre, o que no hubo otros pagos?",
                  )
                )
                  safely(
                    mutate((current) => ({
                      ...current,
                      statements: current.statements.map((x) =>
                        x.id === st.id ? { ...x, paymentsConfirmed: true } : x,
                      ),
                    })),
                  );
              }}
            >
              Confirmar pagos al día
            </button>
          </div>
        )}
        {balance(s, st) > 0 && requiredPayment(s, st, unit) === null && (
          <p className="alert warning">
            No se conoce el mínimo o la modalidad de pago en {unit}. Edita el
            resumen para ingresar el mínimo informado o confirmar que
            corresponde pago total. No se supone mínimo cero.
          </p>
        )}
        {panel(
          "Detalle del resumen",
          <>
            <div className="detail-grid">
              {[
                ["Saldo anterior", value(st, "previous")],
                ["Consumos informados", value(st, "consumption")],
                ["Intereses", value(st, "interest")],
                ["Impuestos / cargos", value(st, "taxes")],
                ["Otros cargos", value(st, "other")],
                [
                  "Pagos descontados por el banco",
                  value(st, "previousPayments"),
                ],
              ].map(([k, v]) => (
                <div key={k}>
                  <span>{k}</span>
                  <strong>{currency(v as number)}</strong>
                </div>
              ))}
            </div>
            <p className="muted">
              Total calculado de referencia:{" "}
              {currency(
                value(st, "previous") +
                  value(st, "consumption") +
                  value(st, "interest") +
                  value(st, "taxes") +
                  value(st, "other") -
                  value(st, "previousPayments"),
              )}
              . El total informado permanece sin cambios. Los pagos descontados
              por el banco corresponden al período anterior; registra abajo los
              pagos de este resumen.
            </p>
            {st.notes && <p>{st.notes}</p>}
            {docs(st.id)}
          </>,
        )}
        {panel(
          "Consumos del período",
          <>
            <Table
              headers={[
                "Fecha",
                "Comercio / descripción",
                "Cuota",
                "Importe",
                "Categoría",
                "Observación",
                "Acciones",
              ]}
              rows={s.expenses
                .filter((e) => e.statementId === st.id)
                .map((e) => {
                  const p = s.purchases.find((p) => p.id === e.purchaseId);
                  const delta = p
                    ? (Number(st.month.slice(0, 4)) -
                        Number(p.month.slice(0, 4))) *
                        12 +
                      Number(st.month.slice(5)) -
                      Number(p.month.slice(5))
                    : 0;
                  return [
                    dateLabel(e.date),
                    e.description,
                    p ? `${p.current + delta}/${p.total}` : "—",
                    formatCurrency(e.amount, e.currency ?? "ARS"),
                    e.category,
                    e.notes,
                    actions("expenses", e, "Editar consumo"),
                  ];
                })}
            />
            <div className="total-row">
              Total de consumos registrados{" "}
              <strong>
                {currency(
                  s.expenses
                    .filter(
                      (e) =>
                        e.statementId === st.id &&
                        (e.currency ?? "ARS") === unit,
                    )
                    .reduce((a, e) => a + e.amount, 0),
                )}
              </strong>
            </div>
            <p className="muted">
              Los consumos no cambian automáticamente el total real del resumen.
              Al cargar una cuota de una compra nueva se registra su compromiso
              futuro. En meses posteriores vincula la compra existente para
              evitar duplicados.
            </p>
          </>,
          <button
            className="button secondary"
            onClick={() =>
              edit(
                "expenses",
                {
                  id: uid(),
                  statementId: st.id,
                  date: st.month + "-01",
                  description: "",
                  amount: 0,
                  category: "Otros",
                  notes: "",
                  purchaseId: "",
                },
                "Agregar consumo",
              )
            }
          >
            <Plus size={17} />
            Consumo
          </button>,
        )}
        {panel(
          "Pagos registrados",
          <Table
            headers={["Fecha", "Importe", "Medio", "Acciones"]}
            rows={s.payments
              .filter((p) => p.statementId === st.id)
              .map((p) => [
                dateLabel(p.date),
                formatCurrency(p.amount, p.currency ?? "ARS"),
                p.method,
                actions("payments", p, "Editar pago"),
              ])}
          />,
          <button
            className="button"
            onClick={() =>
              edit(
                "payments",
                {
                  id: uid(),
                  statementId: st.id,
                  date: today(),
                  amount: balance(s, st),
                  method: "",
                },
                "Registrar pago",
              )
            }
          >
            <Plus size={17} />
            Registrar pago
          </button>,
        )}
      </>
    ) : (
      <>
        <div className="section-intro">
          <p>
            Un resumen por tarjeta y período. Puedes corregir sus datos y
            registrar cada pago.
          </p>
          <button
            className="button"
            disabled={!s.cards.length}
            onClick={() => newStatement()}
          >
            <Plus size={18} />
            Nuevo resumen
          </button>
        </div>
        {!s.cards.length && (
          <p className="alert">Primero agrega una tarjeta en «Mis tarjetas».</p>
        )}
        {panel(
          "Resúmenes de " + monthLabel(month),
          <Table
            headers={[
              "Tarjeta",
              "Vencimiento",
              "Total",
              "Mínimo",
              "Pagado",
              "Pendiente",
              "Estado",
              "Detalle",
            ]}
            rows={o.statements.map((st) => [
              cardName(st.cardId),
              dateLabel(st.dueDate),
              currency(value(st, "total")),
              currency(minimum(st)),
              currency(paid(s, st.id)),
              currency(balance(s, st)),
              <Status value={status(st.dueDate, balance(s, st))} />,
              <button
                className="button secondary small"
                onClick={() => setDetail(st.id)}
              >
                Abrir resumen
              </button>,
            ])}
          />,
        )}
        <p className="muted">
          Para consultar otro período, cambia el selector de mes en la parte
          superior.
        </p>
      </>
    );
  } else if (page === "plan") {
    const sim = o.statements.find((st) => st.id === simId) ?? o.statements[0],
      simCents = Math.max(
        0,
        Math.round(Number(simPay.replace(",", ".")) * 100) || 0,
      ),
      est = sim
        ? estimate(balance(s, sim), simCents, effectiveRate(s, sim))
        : null;
    content = (
      <>
        <div className="section-intro">
          <p>
            Primero los mínimos. Después, el dinero extra trabaja para reducir
            tu deuda.
          </p>
          <button className="button secondary" onClick={editBudget}>
            <Wallet size={18} />
            Cambiar dinero disponible
          </button>
        </div>
        <div className="metrics three">
          {metric(
            "Dinero disponible para tarjetas",
            available,
            undefined,
            true,
          )}
          {metric("Obligaciones conocidas pendientes", plan.minimum)}
          {metric(
            "Total recomendado a pagar",
            plan.blocked ? null : plan.allocated,
            plan.unused ? `${currency(plan.unused)} sin asignar` : undefined,
          )}
        </div>
        <p className="alert warning">
          <strong>
            Pagar solamente el mínimo puede hacer que la deuda continúe
            creciendo.
          </strong>{" "}
          Las recomendaciones no realizan pagos ni modifican tus datos.
        </p>
        {!plan.blocked && plan.shortfall > 0 && (
          <div className="alert danger" role="alert">
            <strong>
              El importe disponible no alcanza para cubrir todos los pagos
              mínimos.
            </strong>
            <p>
              Faltan {currency(plan.shortfall)}. La asignación parcial sigue el
              orden de vencimiento; revisa abajo los mínimos sin cubrir. No
              existe una distribución que cubra todos con este presupuesto.
            </p>
          </div>
        )}
        {plan.blocked && (
          <p className="alert warning">
            Plan pendiente: confirma pagos y modalidad en los resúmenes. No se
            ha asignado dinero a ninguna tarjeta.
          </p>
        )}
        {panel(
          "Cómo distribuir tus pagos",
          <>
            <div className="strategy-tabs">
              {(
                [
                  ["recommended", "Recomendada"],
                  ["interest", "Mayor interés primero"],
                  ["snowball", "Menor deuda primero"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  aria-pressed={strategy === id}
                  className={strategy === id ? "active" : ""}
                  onClick={() => setStrategy(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <Table
              headers={[
                "Tarjeta / vencimiento",
                "Saldo pendiente",
                "Obligación pendiente",
                "TEM mensual",
                "Pago sugerido",
                "Obligación sin cubrir",
                "Por qué",
              ]}
              rows={plan.rows.map((r) => [
                <>
                  <span className="card-bank-label">
                    <BankLogo
                      bank={
                        s.cards.find((c) => c.id === r.statement.cardId)
                          ?.bank ?? ""
                      }
                      attachments={attachments}
                    />
                    <strong>{cardName(r.statement.cardId)}</strong>
                  </span>
                  <small>
                    {dateLabel(r.statement.dueDate)} ·{" "}
                    {daysUntil(r.statement.dueDate)} días
                  </small>
                </>,
                currency(r.remaining),
                currency(r.minimum),
                r.rate === null ? "Sin informar" : `${r.rate} %`,
                <strong className="teal">
                  {plan.blocked
                    ? "Pendiente de revisión"
                    : currency(r.suggested)}
                </strong>,
                r.minimum === null
                  ? "Sin confirmar"
                  : currency(Math.max(0, r.minimum - r.suggested)),
                <span className="reason">{r.reason}</span>,
              ])}
            />
            <p className="muted">
              La estrategia recomendada prioriza, después de los mínimos, los
              vencimientos de hoy, vencidos o de los próximos 3 días; luego la
              TEM más alta y el menor saldo. Es una regla orientativa, no una
              optimización contractual.
            </p>
            <p className="muted">
              Deuda financiada previa: visible en cada resumen como saldo
              anterior. Los pagos ya registrados se descuentan antes de
              distribuir.
            </p>
          </>,
        )}
        {panel(
          "Comparar estrategias",
          <Table
            headers={[
              "Estrategia",
              "Distribución sugerida",
              "Interés mensual estimado del saldo restante",
            ]}
            rows={(["recommended", "interest", "snowball"] as Strategy[]).map(
              (mode) => {
                const p = paymentPlan(s, month, available, mode, unit);
                return [
                  mode === "recommended"
                    ? "Recomendada"
                    : mode === "interest"
                      ? "Mayor interés primero"
                      : "Menor deuda primero",
                  p.rows
                    .map(
                      (r) =>
                        `${cardName(r.statement.cardId)}: ${p.blocked ? "Pendiente de revisión" : currency(r.suggested)}`,
                    )
                    .join(" · ") || "Sin deuda",
                  p.blocked
                    ? "Pendiente: revisar pagos y modalidades"
                    : p.rows.some(
                          (r) => r.rate === null && r.remaining > r.suggested,
                        )
                      ? "Faltan tasas para comparar"
                      : currency(
                          p.rows.reduce(
                            (a, r) =>
                              a +
                              (estimate(r.remaining, r.suggested, r.rate)
                                .interest ?? 0),
                            0,
                          ),
                        ) + " (estimación)",
                ];
              },
            )}
          />,
        )}
        {panel(
          "Simulador de deuda",
          o.statements.length ? (
            <>
              <div className="inline-form">
                <label>
                  Resumen
                  <select
                    value={sim?.id ?? ""}
                    onChange={(e) => setSimId(e.target.value)}
                  >
                    {o.statements.map((st) => (
                      <option key={st.id} value={st.id}>
                        {cardName(st.cardId)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Pago previsto (pesos)
                  <input
                    inputMode="decimal"
                    value={simPay}
                    onChange={(e) => setSimPay(e.target.value)}
                  />
                </label>
              </div>
              {est && (
                <>
                  <div className="metrics three">
                    {metric("Saldo antes del pago", balance(s, sim!))}
                    {metric("Saldo restante estimado", est.remaining)}
                    {est.interest === null ? (
                      <div className="metric">
                        <span>Interés del próximo período</span>
                        <p>
                          Falta ingresar la tasa informada por la tarjeta para
                          realizar esta estimación.
                        </p>
                      </div>
                    ) : (
                      metric("Interés estimado próximo período", est.interest)
                    )}
                  </div>
                  <p className="muted">
                    ESTIMACIÓN: saldo pendiente × TEM / 100, sin nuevos
                    consumos, impuestos ni cargos. No representa el cálculo
                    contractual del banco. Un pago superior al saldo se limita
                    al saldo para esta simulación.
                  </p>
                </>
              )}
            </>
          ) : (
            <Empty>Carga un resumen para simular pagos.</Empty>
          ),
        )}
        {panel("Tu presupuesto mensual", budgetView)}
      </>
    );
  } else if (page === "installments")
    content = (
      <>
        <div className="section-intro">
          <p>
            Lo que ya está comprometido para los próximos meses, sin generar
            gastos automáticamente.
          </p>
          <button
            className="button"
            disabled={!s.cards.length}
            onClick={newPurchase}
          >
            <Plus size={18} />
            Compra en cuotas
          </button>
        </div>
        {panel(
          "Cuotas futuras comprometidas",
          <Table
            headers={[
              "Tarjeta",
              "Compra",
              "Período base",
              "Cuota actual",
              "Cuotas restantes",
              "Valor de cuota",
              "Compromiso restante",
              "Acciones",
            ]}
            rows={s.purchases
              .filter((p) => (p.currency ?? "ARS") === unit)
              .map((p) => [
                cardName(p.cardId),
                p.description,
                monthLabel(p.month),
                `${p.current}/${p.total}`,
                p.total - p.current,
                formatCurrency(p.amount, p.currency ?? "ARS"),
                formatCurrency(
                  (p.total - p.current) * p.amount,
                  p.currency ?? "ARS",
                ),
                actions("purchases", p, "Editar compra en cuotas"),
              ])}
          />,
        )}
        {panel(
          "Compromisos futuros desde " + monthLabel(month),
          <>
            <Chart
              unit={unit}
              label="Compromisos futuros"
              points={future.map((x) => ({
                label: monthLabel(x.month),
                value: x.total,
              }))}
            />
            <Table
              headers={["Mes", "Importe comprometido"]}
              rows={future.map((x) => [monthLabel(x.month), currency(x.total)])}
            />
            <p className="muted">
              La cuota actual corresponde al período base. La proyección incluye
              solo cuotas posteriores, iguales en valor; no incluye intereses ni
              nuevos consumos. Actualiza una compra existente, evita crearla de
              nuevo cada mes.
            </p>
          </>,
        )}
      </>
    );
  else if (page === "services")
    content = (
      <>
        <div className="section-intro">
          <p>Empresas y facturas, organizadas por período.</p>
          <div className="actions">
            <button className="button secondary" onClick={newService}>
              <Plus size={18} />
              Servicio
            </button>
            <button
              className="button"
              disabled={!s.services.length}
              onClick={() => newInvoice()}
            >
              <Plus size={18} />
              Factura
            </button>
          </div>
        </div>
        {panel(
          "Facturas de " + monthLabel(month),
          <Table
            headers={[
              "Empresa / tipo",
              "Vencimiento",
              "Importe",
              "Estado",
              "Pago",
              "Acciones",
            ]}
            rows={o.invoices.map((i) => [
              <>
                <strong>{serviceName(i.serviceId)}</strong>
                <small>
                  {s.services.find((x) => x.id === i.serviceId)?.type}
                </small>
              </>,
              dateLabel(i.dueDate),
              currency(i.amount),
              <Status value={status(i.dueDate, i.paid ? 0 : i.amount)} />,
              i.paid ? (
                `${dateLabel(i.paidDate)} · ${i.method}`
              ) : (
                <button
                  className="button secondary small"
                  onClick={() =>
                    edit(
                      "invoices",
                      { ...i, paid: true, paidDate: today() },
                      "Registrar pago de factura",
                    )
                  }
                >
                  <Check size={16} />
                  Registrar pago
                </button>
              ),
              <div className="actions">
                {actions("invoices", i, "Editar factura")}
                <button
                  className="icon-button"
                  aria-label={"Documentos de " + serviceName(i.serviceId)}
                  onClick={() => setDetail(detail === i.id ? "" : i.id)}
                >
                  <Paperclip size={18} />
                </button>
              </div>,
            ])}
          />,
        )}
        {o.invoices
          .filter((i) => i.id === detail)
          .map((i) => (
            <section className="panel" key={i.id}>
              <h2>Documentos · {serviceName(i.serviceId)}</h2>
              {docs(i.id)}
            </section>
          ))}
        {panel(
          "Mis servicios",
          <Table
            headers={[
              "Empresa",
              "Tipo",
              "Referencia",
              "Observaciones",
              "Acciones",
            ]}
            rows={s.services.map((v) => [
              v.company,
              v.type,
              v.reference,
              v.notes,
              <div className="actions">
                <button
                  className="button secondary small"
                  onClick={() => newInvoice(v.id)}
                >
                  Nueva factura
                </button>
                {actions("services", v, "Editar servicio")}
              </div>,
            ])}
          />,
        )}
        {s.services.map((service) => {
          const invoices = s.invoices
            .filter((i) => i.serviceId === service.id)
            .sort((a, b) => a.month.localeCompare(b.month));
          return (
            invoices.length > 0 && (
              <section className="panel" key={service.id}>
                <h2>Historial · {service.company}</h2>
                <Chart
                  unit={unit}
                  label={"Historial de " + service.company}
                  points={invoices.map((i) => ({
                    label: monthLabel(i.month),
                    value: i.amount,
                  }))}
                />
                <Table
                  headers={[
                    "Período",
                    "Importe",
                    "Variación frente a factura anterior",
                    "Estado",
                    "Abrir / corregir",
                  ]}
                  rows={invoices.map((i, n) => [
                    monthLabel(i.month),
                    currency(i.amount),
                    n && invoices[n - 1].amount
                      ? `${(((i.amount - invoices[n - 1].amount) / invoices[n - 1].amount) * 100).toFixed(1)} %`
                      : "—",
                    <Status value={status(i.dueDate, i.paid ? 0 : i.amount)} />,
                    <button
                      className="text-button"
                      onClick={() => {
                        setMonth(i.month);
                        setDetail(i.id);
                        window.scrollTo(0, 0);
                      }}
                    >
                      Ver factura
                    </button>,
                  ])}
                />
              </section>
            )
          );
        })}
      </>
    );
  else if (page === "calendar") {
    const displayMonth = calendarMonth,
      first = new Date(displayMonth + "-01T12:00:00"),
      offset = (first.getDay() + 6) % 7,
      count = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const events = deadlines(s, unit).filter((d) =>
      d.dueDate.startsWith(displayMonth),
    );
    content = (
      <>
        <div className="section-intro">
          <p>
            Vencimientos reales de tarjetas y servicios, incluidos los ya
            pagados.
          </p>
          <div className="month-picker">
            <button
              aria-label="Mes calendario anterior"
              onClick={() => setCalendarMonth(addMonth(displayMonth, -1))}
            >
              <ChevronLeft size={18} />
            </button>
            <input
              aria-label="Mes calendario"
              type="month"
              value={displayMonth}
              onChange={(e) =>
                e.target.value && setCalendarMonth(e.target.value)
              }
            />
            <button
              aria-label="Mes calendario siguiente"
              onClick={() => setCalendarMonth(addMonth(displayMonth, 1))}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        <section className="panel calendar-panel">
          <div className="calendar-grid">
            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
              <div className="weekday" key={d}>
                {d}
              </div>
            ))}
            {Array.from({ length: offset }, (_, i) => (
              <div className="calendar-blank" key={"blank" + i} />
            ))}
            {Array.from({ length: count }, (_, i) => {
              const date = displayMonth + "-" + String(i + 1).padStart(2, "0");
              return (
                <div
                  className={
                    "calendar-day " + (date === today() ? "is-today" : "")
                  }
                  key={date}
                >
                  <strong>{i + 1}</strong>
                  {events
                    .filter((e) => e.dueDate === date)
                    .map((e) => (
                      <div
                        className={"calendar-event " + (e.amount ? "" : "done")}
                        key={e.id}
                      >
                        {e.name}
                        <small>
                          {e.amount ? currency(e.amount) : "Pagado"}
                        </small>
                      </div>
                    ))}
                </div>
              );
            })}
          </div>
        </section>
        {panel(
          "Agenda del mes",
          <Table
            headers={[
              "Fecha",
              "Obligación",
              "Tipo",
              "Pendiente",
              "Mínimo pendiente",
              "Estado",
            ]}
            rows={events.map((d) => [
              dateLabel(d.dueDate),
              d.name,
              d.kind,
              currency(d.amount),
              d.kind === "Tarjeta" ? currency(d.minimum) : "—",
              <Status value={status(d.dueDate, d.amount)} />,
            ])}
          />,
        )}
      </>
    );
  } else if (page === "history")
    content = (
      <>
        <div className="section-intro">
          <p>
            Saldos de los resúmenes menos sus pagos registrados. Son fotografías
            de cada período, no deudas que se suman entre meses.
          </p>
          <select
            aria-label="Filtrar historial por tarjeta"
            value={historyCard}
            onChange={(e) => setHistoryCard(e.target.value)}
          >
            <option value="all">Todas las tarjetas</option>
            {s.cards.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        {debtPoints.length ? (
          <>
            {panel(
              "Evolución de deuda " +
                (historyCard === "all" ? "total" : cardName(historyCard)),
              <Chart
                label="Evolución de deuda por moneda"
                points={debtPoints}
              />,
            )}
            <div className="metrics three">
              {metric("Deuda inicial registrada", debtPoints[0].value)}
              {metric("Deuda último período", debtPoints.at(-1)!.value)}
              {metric(
                "Variación entre extremos",
                debtPoints.at(-1)!.value - debtPoints[0].value,
              )}
            </div>
            {panel(
              "Detalle por período",
              <Table
                headers={[
                  "Período",
                  "Deuda pendiente",
                  "Variación",
                  "Cobertura de tarjetas",
                ]}
                rows={debtPoints.map((p, i) => {
                  const m = historyMonths[i],
                    actual = s.statements.filter(
                      (st) =>
                        st.month === m &&
                        (historyCard === "all" || st.cardId === historyCard),
                    ).length;
                  const prev = debtPoints[i - 1];
                  return [
                    p.label,
                    currency(p.value),
                    prev ? (
                      <span
                        className={
                          p.value > prev.value ? "danger-text" : "teal"
                        }
                      >
                        {p.value > prev.value ? (
                          <ArrowUpRight size={16} />
                        ) : (
                          <ArrowDownRight size={16} />
                        )}{" "}
                        {currency(p.value - prev.value)}
                      </span>
                    ) : (
                      "—"
                    ),
                    `${actual} de ${historyCard === "all" ? s.cards.length : 1} tarjetas`,
                  ];
                })}
              />,
            )}
            {panel(
              "Tarjetas cuya deuda está creciendo",
              <>
                {s.cards.map((c) => {
                  const statements = s.statements
                    .filter((st) => st.cardId === c.id)
                    .sort((a, b) => a.month.localeCompare(b.month));
                  if (statements.length < 2) return null;
                  const last = statements.at(-1)!,
                    prev = statements.at(-2)!;
                  return (
                    balance(s, last) > balance(s, prev) && (
                      <p className="alert warning" key={c.id}>
                        {c.name}: aumentó{" "}
                        {currency(balance(s, last) - balance(s, prev))} entre{" "}
                        {monthLabel(prev.month)} y {monthLabel(last.month)}.
                      </p>
                    )
                  );
                })}
                <p className="muted">
                  Compara períodos con todas las tarjetas cargadas. La ausencia
                  de un resumen no significa que esa tarjeta no tenga deuda. Los
                  pagos posteriores actualizan el saldo del resumen
                  correspondiente.
                </p>
              </>,
            )}
          </>
        ) : (
          <Empty>Necesitas resúmenes para ver la evolución.</Empty>
        )}
      </>
    );
  else if (page === "report") {
    const prev = overview(s, addMonth(month, -1), unit);
    content = (
      <>
        <div className="section-intro no-print">
          <p>
            Utiliza la impresión del navegador para imprimir o guardar como PDF.
          </p>
          <button className="button" onClick={() => window.print()}>
            <Printer size={18} />
            Imprimir resumen
          </button>
        </div>
        <section className="panel report">
          <span className="eyebrow">
            ARQUITECTA PATRICIA TOMOFF · INFORME PERSONAL
          </span>
          <h2>Resumen financiero — {monthLabel(month)}</h2>
          <p>
            Tarjetas y totales en {unit}. Ingresos y servicios se muestran en
            ARS por separado; no se suman a los totales USD.
          </p>
          <p>
            Generado el {dateLabel(today())}.{" "}
            {s.demo ? "Incluye datos ficticios de demostración." : ""}
          </p>
          <div className="metrics three">
            {metric(
              "Ingresos registrados ARS",
              budget?.income ?? 0,
              undefined,
              false,
              "ARS",
            )}
            {metric(
              "Servicios ARS (separados)",
              arsOverview.services,
              undefined,
              false,
              "ARS",
            )}
            {metric("Total tarjetas del mes", o.total)}
            {metric("Pagado", o.payment)}
            {metric("Pendiente general", o.pending)}
            {metric("Deuda pendiente tarjetas", o.debt)}
          </div>
          <p>
            Variación respecto del mes anterior:{" "}
            {prev.statements.length
              ? currency(o.debt - prev.debt)
              : "Sin datos del mes anterior"}
            . Solo se comparan los resúmenes registrados.
          </p>
          <h3>Vencimientos del período</h3>
          <Table
            headers={["Fecha", "Obligación", "Pendiente"]}
            rows={monthDue.map((d) => [
              dateLabel(d.dueDate),
              d.name,
              currency(d.amount),
            ])}
          />
          <h3>Plan recomendado · presupuesto {currency(available)}</h3>
          <Table
            headers={["Tarjeta", "Sugerencia", "Motivo"]}
            rows={paymentPlan(
              s,
              month,
              available,
              "recommended",
              unit,
            ).rows.map((r) => [
              cardName(r.statement.cardId),
              plan.blocked ? "Pendiente de revisión" : currency(r.suggested),
              r.reason,
            ])}
          />
          {!plan.blocked && plan.shortfall > 0 && (
            <p>
              El presupuesto no cubre los mínimos: faltan{" "}
              {currency(plan.shortfall)}.
            </p>
          )}
          <p>
            Pagar solamente el mínimo puede hacer que la deuda continúe
            creciendo. Las estimaciones no sustituyen los importes ni
            condiciones del banco.
          </p>
        </section>
      </>
    );
  } else
    content = (
      <>
        <ImportAccounts
          state={s}
          onImport={async (bundle, choices) => {
            let result = { added: 0, skipped: 0 };
            await mutate((current) => {
              const merged = mergeExtracted(current, bundle, choices);
              result = { added: merged.added, skipped: merged.skipped };
              return merged.state;
            });
            setNotice(
              `Importación completada: ${result.added} resúmenes agregados; ${result.skipped} existentes conservados. Revisa los pagos y modalidades pendientes.`,
            );
            setMonth(
              bundle.accounts.find((a) =>
                choices.some((c) => c.selected && c.key === a.key),
              )?.statement.month ?? month,
            );
            setSelectedCurrency("ARS");
            go("statements");
          }}
        />

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Copia de seguridad</h2>
              <p className="muted">
                Todos los registros y documentos adjuntos en un único archivo
                portable.
              </p>
            </div>
            <ShieldCheck size={28} />
          </div>
          <p>
            Los datos se guardan en IndexedDB en este navegador y esta
            dirección. No se envían a servidores. Eliminar los datos del
            navegador o usar otra dirección puede dejar esta instalación sin
            acceso a ellos.
          </p>
          <div className="backup-actions">
            <button
              className="button"
              onClick={async () => {
                try {
                  const raw = await navigator.locks.request(
                    "mis-cuentas-write",
                    () => exportBackup(),
                  );
                  const url = URL.createObjectURL(
                    new Blob([raw], { type: "application/json" }),
                  );
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `mis-cuentas-${today()}.json`;
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(url), 10000);
                  setNotice(
                    "Copia generada con datos y documentos. Guárdala en un lugar seguro.",
                  );
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              <Download size={19} />
              Exportar copia de seguridad
            </button>
            <label className="button secondary">
              <Upload size={19} />
              Importar copia de seguridad
              <input
                className="file-input"
                type="file"
                accept="application/json,.json"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  try {
                    if (file.size > 150 * 1024 * 1024)
                      throw Error("La copia supera 150 MB.");
                    const imported = await parseBackup(await file.text());
                    if (
                      !confirm(
                        `La copia contiene ${imported.state.cards.length} tarjetas, ${imported.state.statements.length} resúmenes y ${imported.attachments.length} documentos. Reemplazará todos los datos actuales. ¿Continuar?`,
                      )
                    )
                      return;
                    await navigator.locks.request("mis-cuentas-write", () =>
                      saveState(imported.state, imported.attachments),
                    );
                    setS(imported.state);
                    setAttachments(imported.attachments);
                    setDetail("");
                    setNotice("Copia importada correctamente.");
                  } catch (err) {
                    setError(
                      "No se importó la copia: " + (err as Error).message,
                    );
                  }
                }}
              />
            </label>
          </div>
          <p className="alert warning">
            La copia contiene información financiera y documentos, sin cifrar.
            Guárdala en una carpeta protegida o unidad cifrada. La app no guarda
            credenciales bancarias. IndexedDB no protege frente a otras personas
            que acceden a tu sesión de Windows.
          </p>
          <button
            className="text-button"
            onClick={async () => {
              const granted = await navigator.storage?.persist?.();
              setNotice(
                granted
                  ? "El navegador concedió almacenamiento persistente. Sigue haciendo copias."
                  : "El navegador no concedió persistencia adicional. Los datos siguen en IndexedDB: conserva copias.",
              );
            }}
          >
            Solicitar al navegador que conserve el almacenamiento
          </button>
        </section>
        <section className="panel">
          <h2>Datos de demostración</h2>
          <p>
            Prueba las pantallas con información ficticia. No se mezcla con tus
            datos personales.
          </p>
          <div className="actions">
            <button
              className="button secondary"
              disabled={
                !!(
                  s.cards.length ||
                  s.services.length ||
                  s.statements.length ||
                  s.invoices.length ||
                  s.purchases.length ||
                  s.budgets.length
                )
              }
              onClick={() => safely(mutate(() => demoState(month)))}
            >
              Cargar demostración
            </button>
            {s.demo && (
              <button
                className="button danger-button"
                onClick={() => {
                  if (
                    confirm(
                      "Se eliminarán TODOS los datos actuales de esta demostración, incluidos los que hayas agregado. Exporta una copia antes de continuar.",
                    )
                  )
                    safely(mutate(() => emptyState()));
                }}
              >
                Eliminar datos de demostración
              </button>
            )}
          </div>
        </section>
        <section className="panel">
          <h2>Acerca de Mi organizador personal</h2>
          <p>
            Versión 2 · Monedas separadas: ARS y USD · Tasas de financiación:
            TEM mensual.
          </p>
          <p>
            Aplicación local, sin telemetría ni sincronización. Los PDF e
            imágenes se conservan como documentos; no se extrae su contenido
            automáticamente.
          </p>
          <p>
            Conserva siempre la misma dirección local y el mismo perfil de
            navegador. Los procesos del entorno en la nube deben reiniciarse en
            cada sesión.
          </p>
        </section>
      </>
    );
  return (
    <div className="app-shell">
      <aside className={"sidebar " + (mobile ? "mobile-open" : "")}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            go("home");
          }}
        >
          <div>
            <Wallet size={25} />
          </div>
          <span>
            <span className="brand-profession">Arquitecta</span>
            Patricia Tomoff<small>Mi organizador personal</small>
          </span>
        </a>
        <div className="sidebar-caption">MI PANEL</div>
        <nav aria-label="Menú principal">
          {nav.map(([id, label, Icon]) => (
            <button
              key={id}
              className={page === id ? "active" : ""}
              onClick={() => {
                go(id);
                if (id === "calendar") setCalendarMonth(month);
              }}
            >
              <Icon size={20} />
              <span>{label}</span>
              {id === "plan" && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <ShieldCheck size={23} />
          <div>
            <strong>Privado y local</strong>
            <small>Tus datos, en tu dispositivo</small>
          </div>
        </div>
      </aside>
      {mobile && (
        <button
          className="sidebar-scrim"
          aria-label="Cerrar menú"
          onClick={() => setMobile(false)}
        />
      )}
      <main>
        <header className="topbar">
          <div className="title-line">
            <button
              className="icon-button mobile-toggle"
              aria-label="Abrir menú"
              onClick={() => setMobile(!mobile)}
            >
              <Menu />
            </button>
            <div>
              <span className="breadcrumb">
                Mi organizador personal <span>/</span>{" "}
                {nav.find((n) => n[0] === page)?.[1] ?? "Resumen del mes"}
              </span>
              <h1>
                {page === "home"
                  ? "Mi panel del mes"
                  : (nav.find((n) => n[0] === page)?.[1] ?? "Resumen del mes")}
              </h1>
            </div>
          </div>
          <div className="topbar-actions">
            <label className="currency-picker">
              Moneda
              <select
                aria-label="Moneda de consulta"
                value={unit}
                disabled={page === "services"}
                onChange={(e) =>
                  setSelectedCurrency(e.target.value as Currency)
                }
              >
                <option value="ARS">Pesos · ARS</option>
                <option value="USD">Dólares · USD</option>
              </select>
            </label>
            <div className="month-picker">
              <button
                aria-label="Mes anterior"
                onClick={() => {
                  setMonth(addMonth(month, -1));
                  setDetail("");
                }}
              >
                <ChevronLeft size={18} />
              </button>
              <input
                aria-label="Mes y año"
                type="month"
                value={month}
                onChange={(e) => {
                  if (e.target.value) {
                    setMonth(e.target.value);
                    setDetail("");
                  }
                }}
              />
              <button
                aria-label="Mes siguiente"
                onClick={() => {
                  setMonth(addMonth(month, 1));
                  setDetail("");
                }}
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <button
              className="icon-button report-button"
              aria-label="Resumen imprimible del mes"
              title="Resumen imprimible del mes"
              onClick={() => go("report")}
            >
              <Printer size={20} />
            </button>
          </div>
        </header>
        <div className="main-content">
          {s.demo && (
            <div className="demo-banner">
              <span>DEMOSTRACIÓN · Los datos son ficticios.</span>
              <button className="text-button" onClick={() => go("settings")}>
                Administrar datos
              </button>
            </div>
          )}
          {error && (
            <div className="alert danger dismissible" role="alert">
              {error}
              <button
                className="icon-button"
                aria-label="Cerrar error"
                onClick={() => setError("")}
              >
                <X size={17} />
              </button>
            </div>
          )}
          {notice && (
            <div className="save-notice" role="status">
              <Check size={17} />
              {notice}
              <button
                className="icon-button"
                aria-label="Cerrar aviso"
                onClick={() => setNotice("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {!s.cards.length &&
            !s.services.length &&
            !s.budgets.length &&
            page === "home" && (
              <div className="get-started">
                <div>
                  <h3>Bienvenido a tu organizador personal</h3>
                  <p>
                    Agrega tu primera tarjeta o explora una demostración con
                    datos ficticios.
                  </p>
                </div>
                <button
                  className="button secondary"
                  onClick={() => safely(mutate(() => demoState(month)))}
                >
                  Explorar demostración
                </button>
              </div>
            )}
          <p className="currency-notice">
            Vista en{" "}
            {unit === "ARS"
              ? "pesos argentinos (ARS)"
              : "dólares estadounidenses (USD)"}
            . Las monedas no se suman ni convierten automáticamente.
          </p>
          {(o.minimumIncomplete || o.unconfirmedPayments > 0) &&
            page !== "settings" &&
            page !== "services" && (
              <div className="alert warning">
                <strong>Información pendiente de revisión.</strong>{" "}
                {o.unconfirmedPayments > 0
                  ? `${o.unconfirmedPayments} resúmenes necesitan confirmar pagos posteriores al cierre. `
                  : ""}
                {o.minimumIncomplete
                  ? "Hay cuentas sin mínimo o modalidad de pago confirmada. "
                  : ""}
                Los saldos reflejan los registros actuales; el plan no
                distribuirá dinero hasta completar la revisión.
              </div>
            )}
          {content}
          <footer className="page-footer">
            <span>
              <ShieldCheck size={14} />
              Guardado local · Sin conexiones bancarias
            </span>
            <button className="text-button" onClick={() => go("settings")}>
              <CircleHelp size={15} />
              Copias y privacidad
            </button>
          </footer>
        </div>
      </main>
      {editing && (
        <Editor
          key={editing.row.id}
          title={editing.title}
          fields={fieldsFor(editing.table, s, editing)}
          initial={editing.row}
          onClose={() => setEditing(null)}
          onSave={async (values) => {
            await mutate((current) => {
              const n = structuredClone(current);
              const table = editing.table;
              const old = (n[table] as any[]).find((r) => r.id === values.id);
              if (!old && (s[table] as any[]).some((r) => r.id === values.id))
                throw Error("El registro fue eliminado en otra pestaña.");
              if (
                table === "expenses" &&
                !values.purchaseId &&
                values.installmentTotal > 1
              ) {
                const st = n.statements.find(
                  (st) => st.id === values.statementId,
                );
                if (!st) throw Error("Resumen inexistente");
                const purchase = {
                  id: uid(),
                  cardId: st.cardId,
                  description: values.description,
                  month: st.month,
                  current: values.installmentCurrent,
                  total: values.installmentTotal,
                  amount: values.amount,
                };
                n.purchases.push(purchase);
                values = { ...values, purchaseId: purchase.id };
              }
              if (table === "expenses" && values.purchaseId) {
                const p = n.purchases.find((p) => p.id === values.purchaseId),
                  st = n.statements.find((st) => st.id === values.statementId);
                if (p && st) {
                  const delta =
                    (Number(st.month.slice(0, 4)) -
                      Number(p.month.slice(0, 4))) *
                      12 +
                    Number(st.month.slice(5)) -
                    Number(p.month.slice(5));
                  if (p.current + delta < 1 || p.current + delta > p.total)
                    throw Error(
                      "La compra no tiene una cuota en este período.",
                    );
                }
              }
              (n[table] as any[]) = old
                ? (n[table] as any[]).map((r) =>
                    r.id === values.id ? values : r,
                  )
                : [...n[table], values];
              return n;
            });
          }}
        />
      )}
    </div>
  );
}
