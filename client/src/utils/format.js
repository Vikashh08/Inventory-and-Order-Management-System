// Format helper for Currency and Quantities

/**
 * Format a number/string as Indian Rupees (INR)
 * @param {number|string} amount 
 * @returns {string}
 */
export const formatINR = (amount) => {
  const numericAmount = parseFloat(amount || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numericAmount);
};

/**
 * Format quantity with its unit and clean decimals
 * @param {number|string} quantity 
 * @param {string} unit 
 * @returns {string}
 */
export const formatQuantity = (quantity, unit) => {
  const num = parseFloat(quantity || 0);
  
  // Format to max 4 decimal places but strip trailing zeros
  // e.g. 1.2500 -> 1.25, 0.0005 -> 0.0005, 5.0000 -> 5
  let formatted = num.toFixed(4);
  formatted = parseFloat(formatted).toString(); 

  // Add unit
  if (unit === 'unit') {
    return `${formatted} ${num === 1 ? 'item' : 'items'}`;
  }
  return `${formatted} ${unit}`;
};
