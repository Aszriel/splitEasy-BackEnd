/**
 * settleUpService.js
 * Algoritma penyelesaian utang minimum (Minimum Cash Flow problem)
 * menggunakan pendekatan Greedy Matching O(n log n).
 *
 * Fungsi murni (pure function) tanpa dependensi ke database atau HTTP
 * sehingga dapat diuji secara terisolasi.
 */

function roundTwoDecimals(num) {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Menghitung saldo bersih (net balance) masing-masing anggota dalam grup
 * @param {Array<string|Object>} members - Daftar ID anggota grup
 * @param {Array<Object>} expenses - Daftar transaksi pengeluaran
 * @param {Array<Object>} settlements - Daftar transaksi pelunasan yang sudah dibayar
 * @returns {Record<string, number>} Peta { userId: netBalance }
 */
function computeNetBalances(members = [], expenses = [], settlements = []) {
  const balances = {};

  // Inisialisasi saldo semua anggota ke 0
  for (const m of members) {
    const userId = (m._id || m).toString();
    balances[userId] = 0;
  }

  // Hitung dari seluruh pengeluaran
  for (const exp of expenses) {
    const payerId = (exp.paidBy?._id || exp.paidBy).toString();

    // Payer menalangi uang (+ ke saldo payer)
    balances[payerId] = roundTwoDecimals((balances[payerId] || 0) + Number(exp.amount));

    // Tiap partisipan memiliki tanggungan (- ke saldo partisipan)
    for (const split of exp.splitDetails || []) {
      const participantId = (split.user?._id || split.user).toString();
      balances[participantId] = roundTwoDecimals(
        (balances[participantId] || 0) - Number(split.amount)
      );
    }
  }

  // Perhitungkan pelunasan (settlements) yang berstatus 'paid'
  for (const s of settlements) {
    if (s.status === 'paid') {
      const fromId = (s.from?._id || s.from).toString();
      const toId = (s.to?._id || s.to).toString();

      // Pihak yang mentransfer pelunasan (+ ke saldo from)
      balances[fromId] = roundTwoDecimals((balances[fromId] || 0) + Number(s.amount));
      // Pihak yang menerima pelunasan (- ke saldo to karena hak piutangnya sudah terbayar)
      balances[toId] = roundTwoDecimals((balances[toId] || 0) - Number(s.amount));
    }
  }

  return balances;
}

/**
 * Menghitung transfer pelunasan utang minimum menggunakan Greedy Matching.
 * @param {Record<string, number> | Map<string, number>} balanceMap
 * @returns {Array<{ from: string, to: string, amount: number }>} Daftar transfer
 */
function computeSettlement(balanceMap) {
  const entries =
    balanceMap instanceof Map
      ? Array.from(balanceMap.entries())
      : Object.entries(balanceMap);

  const debtors = [];
  const creditors = [];

  for (const [userId, rawBalance] of entries) {
    const balance = roundTwoDecimals(Number(rawBalance));
    if (balance < -0.009) {
      debtors.push({ user: userId, amount: Math.abs(balance) });
    } else if (balance > 0.009) {
      creditors.push({ user: userId, amount: balance });
    }
  }

  // Urutkan debtor dari utang terbesar (descending)
  debtors.sort((a, b) => b.amount - a.amount);
  // Urutkan creditor dari piutang terbesar (descending)
  creditors.sort((a, b) => b.amount - a.amount);

  const transfers = [];

  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const transferAmount = roundTwoDecimals(Math.min(debtor.amount, creditor.amount));

    if (transferAmount > 0) {
      transfers.push({
        from: debtor.user,
        to: creditor.user,
        amount: transferAmount,
      });
    }

    debtor.amount = roundTwoDecimals(debtor.amount - transferAmount);
    creditor.amount = roundTwoDecimals(creditor.amount - transferAmount);

    if (debtor.amount < 0.01) {
      dIdx++;
    }
    if (creditor.amount < 0.01) {
      cIdx++;
    }
  }

  return transfers;
}

module.exports = {
  computeNetBalances,
  computeSettlement,
  roundTwoDecimals,
};
