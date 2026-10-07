const { computeSplit, roundTwoDecimals } = require('../src/services/splitService');

describe('splitService - computeSplit', () => {
  describe('Equal Split', () => {
    it('should split evenly among members when amount divides cleanly', () => {
      const members = ['user1', 'user2', 'user3'];
      const result = computeSplit({
        splitType: 'equal',
        amount: 300,
        members,
      });

      expect(result).toHaveLength(3);
      expect(result).toEqual([
        { user: 'user1', amount: 100 },
        { user: 'user2', amount: 100 },
        { user: 'user3', amount: 100 },
      ]);

      const sum = result.reduce((acc, curr) => acc + curr.amount, 0);
      expect(roundTwoDecimals(sum)).toBe(300);
    });

    it('should handle penny/cent rounding when amount does not divide cleanly', () => {
      const members = ['user1', 'user2', 'user3'];
      const result = computeSplit({
        splitType: 'equal',
        amount: 100,
        members,
      });

      expect(result).toHaveLength(3);
      expect(result[0].amount).toBe(33.34);
      expect(result[1].amount).toBe(33.33);
      expect(result[2].amount).toBe(33.33);

      const sum = result.reduce((acc, curr) => acc + curr.amount, 0);
      expect(roundTwoDecimals(sum)).toBe(100);
    });

    it('should handle single member split', () => {
      const result = computeSplit({
        splitType: 'equal',
        amount: 50.55,
        members: ['user1'],
      });

      expect(result).toEqual([{ user: 'user1', amount: 50.55 }]);
    });

    it('should throw an error if members array is empty', () => {
      expect(() => {
        computeSplit({
          splitType: 'equal',
          amount: 100,
          members: [],
        });
      }).toThrow('At least one member is required for equal split');
    });

    it('should throw an error if amount is zero or negative', () => {
      expect(() => {
        computeSplit({
          splitType: 'equal',
          amount: 0,
          members: ['user1'],
        });
      }).toThrow('Total amount must be greater than 0');

      expect(() => {
        computeSplit({
          splitType: 'equal',
          amount: -50,
          members: ['user1'],
        });
      }).toThrow('Total amount must be greater than 0');
    });
  });

  describe('Custom Split', () => {
    it('should succeed when custom shares sum up to total amount', () => {
      const customShares = [
        { user: 'user1', amount: 150 },
        { user: 'user2', amount: 100 },
        { user: 'user3', amount: 50 },
      ];

      const result = computeSplit({
        splitType: 'custom',
        amount: 300,
        customShares,
      });

      expect(result).toEqual([
        { user: 'user1', amount: 150 },
        { user: 'user2', amount: 100 },
        { user: 'user3', amount: 50 },
      ]);
    });

    it('should throw an error if custom shares do not sum up to total amount', () => {
      const customShares = [
        { user: 'user1', amount: 100 },
        { user: 'user2', amount: 100 },
      ];

      expect(() => {
        computeSplit({
          splitType: 'custom',
          amount: 250,
          customShares,
        });
      }).toThrow(/does not equal total amount/);
    });

    it('should throw an error if any share amount is negative', () => {
      const customShares = [
        { user: 'user1', amount: 150 },
        { user: 'user2', amount: -50 },
      ];

      expect(() => {
        computeSplit({
          splitType: 'custom',
          amount: 100,
          customShares,
        });
      }).toThrow('Share amount cannot be negative');
    });
  });
});
