import { emptyState, type State } from "./model";
import { addMonth } from "./finance";
export function demoState(month: string): State {
  const s = emptyState();
  s.demo = true;
  s.cards = [
    {
      id: "card-1",
      bank: "Banco Nación",
      name: "Visa · Nación",
      brand: "Visa",
      last4: "4821",
      closingDay: 20,
      dueDay: 28,
      interestRate: null,
      financingRate: 7.5,
      notes: "Datos ficticios de demostración",
    },
    {
      id: "card-2",
      bank: "Banco Galicia",
      name: "Mastercard · Galicia",
      brand: "Mastercard",
      last4: "9056",
      closingDay: 18,
      dueDay: 25,
      interestRate: null,
      financingRate: 8.2,
      notes: "Datos ficticios de demostración",
    },
  ];
  for (let i = 0; i < 4; i++) {
    const m = addMonth(month, i - 3);
    for (let c = 0; c < 2; c++) {
      const total = [92000000, 83000000, 76000000, 68500000][i] + c * 16000000;
      const id = `st-${i}-${c}`;
      s.statements.push({
        id,
        cardId: `card-${c + 1}`,
        month: m,
        closingDate: m + "-20",
        dueDate: m + (c ? "-25" : "-28"),
        previous: total - 20000000,
        consumption: 18000000,
        interest: 1500000,
        taxes: 500000,
        other: 0,
        previousPayments: 0,
        total,
        minimum: Math.round(total * 0.12),
        rate: c ? 8.2 : 7.5,
        notes: "",
      });
      if (i < 3)
        s.payments.push({
          id: `pay-${i}-${c}`,
          statementId: id,
          date: m + "-24",
          amount: 15000000,
          method: "Transferencia",
        });
    }
  }
  s.payments.push({
    id: "pay-current",
    statementId: "st-3-0",
    date: month + "-22",
    amount: 12000000,
    method: "Transferencia",
  });
  s.purchases = [
    {
      id: "purchase-1",
      cardId: "card-1",
      description: "Heladera",
      month,
      current: 3,
      total: 12,
      amount: 4500000,
    },
    {
      id: "purchase-2",
      cardId: "card-2",
      description: "Notebook",
      month,
      current: 5,
      total: 6,
      amount: 6200000,
    },
  ];
  s.expenses = [
    {
      id: "exp-1",
      statementId: "st-3-0",
      date: month + "-10",
      description: "Supermercado",
      amount: 8700000,
      category: "Supermercado",
      notes: "",
      purchaseId: "",
    },
    {
      id: "exp-2",
      statementId: "st-3-0",
      date: month + "-12",
      description: "Heladera",
      amount: 4500000,
      category: "Hogar",
      notes: "",
      purchaseId: "purchase-1",
    },
  ];
  s.services = [
    {
      id: "srv-1",
      company: "Electricidad del hogar",
      type: "Electricidad",
      reference: "",
      notes: "",
    },
    {
      id: "srv-2",
      company: "Internet del hogar",
      type: "Internet",
      reference: "",
      notes: "",
    },
    {
      id: "srv-3",
      company: "Gas del hogar",
      type: "Gas",
      reference: "",
      notes: "",
    },
  ];
  for (let i = 0; i < 4; i++) {
    const m = addMonth(month, i - 3);
    s.invoices.push({
      id: `inv-${i}`,
      serviceId: "srv-1",
      month: m,
      issued: m + "-02",
      dueDate: m + "-27",
      amount: 3120000 + i * 680000,
      paid: i < 3,
      paidDate: i < 3 ? m + "-20" : "",
      method: i < 3 ? "Transferencia" : "",
      notes: "",
    });
  }
  s.invoices.push(
    {
      id: "inv-internet",
      serviceId: "srv-2",
      month,
      issued: month + "-01",
      dueDate: month + "-25",
      amount: 3200000,
      paid: true,
      paidDate: month + "-20",
      method: "Débito",
      notes: "",
    },
    {
      id: "inv-gas",
      serviceId: "srv-3",
      month,
      issued: month + "-01",
      dueDate: month + "-29",
      amount: 1850000,
      paid: false,
      paidDate: "",
      method: "",
      notes: "",
    },
  );
  s.budgets = [
    {
      id: "budget-1",
      month,
      income: 180000000,
      other: 25000000,
      cardBudget: 60000000,
    },
  ];
  return s;
}
