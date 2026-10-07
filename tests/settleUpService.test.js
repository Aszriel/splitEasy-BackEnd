const {
  computeNetBalances,
  computeSettlement,
  roundTwoDecimals,
} = require('../src/services/settleUpService');

describe('settleUpService', () => {
  describe('computeNetBalances', () => {
    it('should calculate net balances correctly for equal split', () => {
      const members = ['userA', 'userB'];
      const expenses = [
        {
          paidBy: 'userA',
          amount: 100,
          splitDetails: [
            { user: 'userA', amount: 50 },
            { user: 'userB', amount: 50 },
          ],
        },
      ];

      const balances = computeNetBalances(members, expenses, []);

      expect(balances['userA']).toBe(50); // paid 100, owes 50 -> +50
      expect(balances['userB']).toBe(-50); // paid 0, owes 50 -> -50
    });

    it('should incorporate paid settlements into net balances', () => {
      const members = ['userA', 'userB'];
      const expenses = [
        {
          paidBy: 'userA',
          amount: 100,
          splitDetails: [
            { user: 'userA', amount: 50 },
            { user: 'userB', amount: 50 },
          ],
        },
      ];
      // userB pays userA 50
      const settlements = [
        {
          from: 'userB',
          to: 'userA',
          amount: 50,
          status: 'paid',
        },
      ];

      const balances = computeNetBalances(members, expenses, settlements);

      expect(balances['userA']).toBe(0);
      expect(balances['userB']).toBe(0);
    });

    it('should ignore pending settlements', () => {
      const members = ['userA', 'userB'];
      const expenses = [
        {
          paidBy: 'userA',
          amount: 100,
          splitDetails: [
            { user: 'userA', amount: 50 },
            { user: 'userB', amount: 50 },
          ],
        },
      ];
      const settlements = [
        {
          from: 'userB',
          to: 'userA',
          amount: 50,
          status: 'pending',
        },
      ];

      const balances = computeNetBalances(members, expenses, settlements);

      expect(balances['userA']).toBe(50);
      expect(balances['userB']).toBe(-50);
    });
  });

  describe('computeSettlement (Greedy Matching)', () => {
    it('should return empty array when all balances are zero', () => {
      const balances = {
        userA: 0,
        userB: 0,
        userC: 0,
      };

      const transfers = computeSettlement(balances);
      expect(transfers).toEqual([]);
    });

    it('should settle simple 2-person debt with 1 transfer', () => {
      const balances = {
        userA: 50, // creditor
        userB: -50, // debtor
      };

      const transfers = computeSettlement(balances);
      expect(transfers).toHaveLength(1);
      expect(transfers[0]).toEqual({
        from: 'userB',
        to: 'userA',
        amount: 50,
      });
    });

    it('should minimize transactions for 1 creditor and 2 debtors', () => {
      const balances = {
        userA: 100, // creditor
        userB: -60, // debtor
        userC: -40, // debtor
      };

      const transfers = computeSettlement(balances);
      expect(transfers).toHaveLength(2);
      expect(transfers).toEqual([
        { from: 'userB', to: 'userA', amount: 60 },
        { from: 'userC', to: 'userA', amount: 40 },
      ]);
    });

    it('should minimize transactions for 2 creditors and 1 debtor', () => {
      const balances = {
        userA: 70, // creditor
        userB: 30, // creditor
        userC: -100, // debtor
      };

      const transfers = computeSettlement(balances);
      expect(transfers).toHaveLength(2);
      expect(transfers).toEqual([
        { from: 'userC', to: 'userA', amount: 70 },
        { from: 'userC', to: 'userB', amount: 30 },
      ]);
    });

    it('should eliminate circular debt completely', () => {
      // Net balances of circular debt: all sum to 0
      const balances = {
        userA: 0,
        userB: 0,
        userC: 0,
      };

      const transfers = computeSettlement(balances);
      expect(transfers).toHaveLength(0);
    });

    it('should handle fractional/cent values properly without floating point bugs', () => {
      const balances = {
        userA: 33.34,
        userB: -16.67,
        userC: -16.67,
      };

      const transfers = computeSettlement(balances);
      expect(transfers).toHaveLength(2);

      const totalTransferred = transfers.reduce((sum, t) => sum + t.amount, 0);
      expect(roundTwoDecimals(totalTransferred)).toBe(33.34);
    });
  });
});
