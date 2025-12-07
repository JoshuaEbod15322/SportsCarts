import { supabase } from "../lib/supabase";

export const cartService = {
  async getCartItems(userId) {
    try {
      const { data, error } = await supabase
        .from("cart_items")
        .select("*, products(*)")
        .eq("user_id", userId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching cart items:", error);
      return [];
    }
  },

  async clearCart(userId) {
    try {
      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("user_id", userId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("Error clearing cart:", error);
      throw error;
    }
  },
};

export const orderService = {
  async createOrder(orderData, orderItems) {
    try {
      // Create the order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert([orderData])
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItemsWithOrderId = orderItems.map((item) => ({
        ...item,
        order_id: order.id,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItemsWithOrderId);

      if (itemsError) throw itemsError;

      return order;
    } catch (error) {
      console.error("Error creating order:", error);
      throw error;
    }
  },

  async getAllOrders(filters = {}) {
    try {
      let query = supabase
        .from("orders")
        .select(
          `
          *,
          users (*),
          order_items (*)
        `
        )
        .order("created_at", { ascending: false });

      if (filters.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching orders:", error);
      throw error;
    }
  },
};

export { authService } from "../lib/authService";
