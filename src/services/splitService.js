/**
 * splitService.js
 * Pure function untuk menghitung pembagian pengeluaran (splitDetails).
 * Tidak bergantung pada Express atau MongoDB agar mudah di-unit test.
 */

function roundTwoDecimals(num) {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Menghitung rincian pembagian tagihan (splitDetails)
 * @param {Object} params
 * @param {string} params.splitType - 'equal' | 'custom'
 * @param {number} params.amount - Total nominal pengeluaran
 * @param {Array<string>} params.members - Array ID anggota yang ikut patungan
 * @param {Array<{ user: string, amount: number }>} [params.customShares] - Porsi kustom jika splitType 'custom'
 * @returns {Array<{ user: string, amount: number }>}
 */
function computeSplit({ splitType = 'equal', amount, members = [], customShares = [] }) {
  const totalAmount = roundTwoDecimals(Number(amount));

  if (!totalAmount || totalAmount <= 0) {
    throw new Error('Total amount must be greater than 0');
  }

  if (splitType === 'equal') {
    if (!Array.isArray(members) || members.length === 0) {
      throw new Error('At least one member is required for equal split');
    }

    const count = members.length;
    // Bagi rata dengan pembulatan ke bawah 2 desimal
    const baseShare = Math.floor((totalAmount / count) * 100) / 100;
    let remainder = roundTwoDecimals(totalAmount - baseShare * count);

    return members.map((userId) => {
      let userShare = baseShare;
      // Alokasikan sisa desimal (sen/peser) ke anggota pertama secara adil
      if (remainder > 0) {
        userShare = roundTwoDecimals(userShare + 0.01);
        remainder = roundTwoDecimals(remainder - 0.01);
      }
      return {
        user: userId.toString(),
        amount: userShare,
      };
    });
  }

  if (splitType === 'custom') {
    if (!Array.isArray(customShares) || customShares.length === 0) {
      throw new Error('Custom shares must be provided for custom split');
    }

    let calculatedSum = 0;
    const splitDetails = customShares.map((share) => {
      if (!share.user) {
        throw new Error('Each custom share must specify a user');
      }
      const shareAmount = roundTwoDecimals(Number(share.amount || 0));
      if (shareAmount < 0) {
        throw new Error('Share amount cannot be negative');
      }
      calculatedSum = roundTwoDecimals(calculatedSum + shareAmount);
      return {
        user: share.user.toString(),
        amount: shareAmount,
      };
    });

    if (Math.abs(calculatedSum - totalAmount) > 0.01) {
      throw new Error(
        `Sum of custom shares (${calculatedSum}) does not equal total amount (${totalAmount})`
      );
    }

    return splitDetails;
  }

  throw new Error(`Unsupported split type: ${splitType}`);
}

module.exports = {
  computeSplit,
  roundTwoDecimals,
};
