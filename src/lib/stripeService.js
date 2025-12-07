import { supabase } from "./supabase";

export const stripeService = {
  // Process card payment (frontend simulation)
  async processCardPayment(cardDetails, amount, userId, orderId) {
    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const { cardNumber, expiry, cvc, name } = cardDetails;

      // Test card validation
      const testCards = [
        "4242424242424242", // Successful payment
        "4000000000000002", // Payment declined
        "4000000000003220", // 3D Secure required
      ];

      const cleanCardNumber = cardNumber.replace(/\s/g, "");

      // Check if it's a test card
      if (!testCards.includes(cleanCardNumber)) {
        // For any other number, treat as success for simulation
        console.log("Processing card payment...");
      }

      // Simulate different scenarios based on test card numbers
      if (cleanCardNumber === "4000000000000002") {
        throw new Error("Your card was declined. Please try a different card.");
      }

      if (cleanCardNumber === "4000000000003220") {
        throw new Error(
          "3D Secure authentication required. This is a test simulation."
        );
      }

      // For all other cards (including 4242...), simulate success
      return {
        success: true,
        paymentId: `pi_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        amount: amount,
        currency: "usd",
        status: "succeeded",
        message: "Payment successful!",
        paymentMethod: "card",
      };
    } catch (error) {
      throw error;
    }
  },

  // Save payment record to database
  async savePaymentRecord(paymentData, orderId, userId) {
    try {
      // First check if payments table exists
      const { data: tableExists, error: tableCheckError } = await supabase
        .from("payments")
        .select("id")
        .limit(1);

      if (tableCheckError) {
        console.log("Payments table check error:", tableCheckError);
      }

      // Always update the order with payment info first
      const { error: orderUpdateError } = await supabase
        .from("orders")
        .update({
          stripe_payment_intent_id: paymentData.paymentId, // Note: your column name
          payment_status: "paid",
          payment_method: "card",
          status: "processing",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (orderUpdateError) {
        console.error(
          "Error updating order with payment info:",
          orderUpdateError
        );
      }

      // If payments table exists, also create a payment record
      if (tableExists !== null) {
        const paymentRecord = {
          user_id: userId,
          order_id: orderId,
          stripe_payment_id: paymentData.paymentId,
          amount: paymentData.amount,
          currency: paymentData.currency || "usd",
          status: paymentData.status,
          payment_method: paymentData.paymentMethod || "card",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
          .from("payments")
          .insert([paymentRecord]);

        if (error) {
          console.error("Error saving to payments table:", error);
        } else {
          return data;
        }
      }

      return { success: true };
    } catch (error) {
      console.error("Error in savePaymentRecord:", error);
      // At least try to update the order
      try {
        await supabase
          .from("orders")
          .update({
            payment_status: "paid",
            payment_method: "card",
            status: "processing",
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId);
      } catch (updateError) {
        console.error("Failed to update order:", updateError);
      }
      throw error;
    }
  },

  // Get payment by order ID
  async getPaymentByOrderId(orderId) {
    try {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("order_id", orderId)
        .single();

      if (error) {
        return null;
      }
      return data;
    } catch (error) {
      console.error("Error fetching payment:", error);
      return null;
    }
  },

  // Get user payments
  async getUserPayments(userId) {
    try {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        return [];
      }
      return data || [];
    } catch (error) {
      console.error("Error fetching user payments:", error);
      return [];
    }
  },
};
