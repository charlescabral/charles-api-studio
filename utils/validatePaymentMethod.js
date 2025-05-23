export default validatePaymentMethod = (paymentMethod) => {
  const validMethods = ["credit_card", "debit_card", "pix", "boleto", "paypal"];
  return validMethods.includes(paymentMethod);
};
