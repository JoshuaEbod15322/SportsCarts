import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export const stripeService = {
  async processCardPayment(cardDetails, amount, userId, orderId) {
    try {
      // Validate card number for testing
      const cleanCardNumber = cardDetails.cardNumber.replace(/\s/g, "");

      // In development/test mode, validate test cards
      if (import.meta.env.DEV || import.meta.env.MODE === "development") {
        if (cleanCardNumber !== "4242424242424242") {
          return {
            success: false,
            error: "You number card is incorrect",
            paymentId: null,
          };
        }
      }

      // For demo/testing purposes, simulate a successful payment
      // In real app, you would use Stripe Elements or Stripe.js
      return {
        success: true,
        paymentId: `pi_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        clientSecret: `cs_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        amount: amount,
      };
    } catch (error) {
      console.error("Stripe payment processing error:", error);

      return {
        success: false,
        error: "Payment failed. Please use test card: 4242 4242 4242 4242",
        paymentId: null,
      };
    }
  },

  async savePaymentRecord(paymentResult, orderId, userId) {
    try {
      // For demo purposes, just log the payment
      console.log("Payment saved:", { paymentResult, orderId, userId });
      return { success: true };
    } catch (error) {
      console.error("Error saving payment record:", error);
      throw error;
    }
  },
};
