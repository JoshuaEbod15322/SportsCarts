import { supabase } from "./supabase";

export const orderService = {
  // Create a new order with order items
  async createOrder(orderData, orderItems) {
    try {
      // Ensure all required fields are present with defaults
      const completeOrderData = {
        user_id: orderData.user_id,
        order_number: orderData.order_number,
        total_amount: orderData.total_amount || 0,
        subtotal: orderData.subtotal || 0,
        shipping_cost: orderData.shipping_cost || 4.99,
        tax_amount: orderData.tax_amount || 0,
        status: orderData.status || "pending",
        shipping_address: orderData.shipping_address,
        payment_status: orderData.payment_status || "pending",
        payment_method: orderData.payment_method || "cash_on_delivery",
        shipping_method: orderData.shipping_method || "Standard Shipping",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log("Creating order with data:", completeOrderData);

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert([completeOrderData])
        .select()
        .single();

      if (orderError) {
        console.error("Error creating order:", orderError);
        throw orderError;
      }

      console.log("Order created successfully:", order);

      // Create order items with correct structure
      const orderItemsWithOrderId = orderItems.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.name || item.product_name || "Unknown Product",
        size: item.size || "M",
        quantity: item.quantity || 1,
        price: item.price || 0,
        total_price: item.total_price || item.price * item.quantity || 0,
        category: item.category || "General",
        brand: item.brand || "Generic",
        image_url: item.image_url || item.imageUrl || "",
      }));

      console.log("Inserting order items:", orderItemsWithOrderId);

      // Insert order items
      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItemsWithOrderId);

      if (itemsError) {
        console.error("Error inserting order items:", itemsError);
        throw itemsError;
      }

      console.log("Order items inserted successfully");

      // Update product stock for each item
      for (const item of orderItems) {
        await this.updateProductStock(item.product_id, item.quantity);
      }

      console.log("Product stock updated");

      return order;
    } catch (error) {
      console.error("Failed to create order:", error);
      throw new Error(`Failed to create order: ${error.message}`);
    }
  },

  // Create order with Stripe payment
  async createOrderWithStripe(orderData, orderItems, paymentData) {
    try {
      // First create the order
      const completeOrderData = {
        user_id: orderData.user_id,
        order_number: orderData.order_number,
        total_amount: orderData.total_amount || 0,
        subtotal: orderData.subtotal || 0,
        shipping_cost: orderData.shipping_cost || 4.99,
        tax_amount: orderData.tax_amount || 0,
        status: "processing", // Set to processing for card payments
        shipping_address: orderData.shipping_address,
        payment_status: "paid",
        payment_method: "card",
        stripe_payment_intent_id: paymentData.paymentId, // Note: your column is stripe_payment_intent_id
        shipping_method: orderData.shipping_method || "Standard Shipping",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log("Creating order with Stripe:", completeOrderData);

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert([completeOrderData])
        .select()
        .single();

      if (orderError) {
        console.error("Error creating order with Stripe:", orderError);
        throw orderError;
      }

      console.log("Order created with Stripe:", order);

      // Create order items with correct structure
      const orderItemsWithOrderId = orderItems.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.name || item.product_name || "Unknown Product",
        size: item.size || "M",
        quantity: item.quantity || 1,
        price: item.price || 0,
        total_price: item.total_price || item.price * item.quantity || 0,
        category: item.category || "General",
        brand: item.brand || "Generic",
        image_url: item.image_url || item.imageUrl || "",
      }));

      // Insert order items
      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItemsWithOrderId);

      if (itemsError) {
        console.error("Error inserting order items for Stripe:", itemsError);
        throw itemsError;
      }

      // Update product stock for each item
      for (const item of orderItems) {
        await this.updateProductStock(item.product_id, item.quantity);
      }

      return order;
    } catch (error) {
      console.error("Failed to create order with Stripe:", error);
      throw new Error(`Failed to create order with Stripe: ${error.message}`);
    }
  },

  // Update product stock after order
  async updateProductStock(productId, quantity) {
    try {
      // Get current stock
      const { data: product, error: fetchError } = await supabase
        .from("products")
        .select("stock")
        .eq("id", productId)
        .single();

      if (fetchError) throw fetchError;

      const currentStock = parseInt(product.stock) || 0;
      const newStock = currentStock - quantity;

      // Update stock
      const { error: updateError } = await supabase
        .from("products")
        .update({
          stock: newStock > 0 ? newStock : 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", productId);

      if (updateError) throw updateError;

      return { success: true, newStock };
    } catch (error) {
      throw error;
    }
  },

  // Get all orders (for admin dashboard)
  async getAllOrders(filters = {}) {
    try {
      let query = supabase
        .from("orders")
        .select(
          `
          *,
          user:user_id (
            id,
            full_name,
            email,
            phone
          )
        `
        )
        .order("created_at", { ascending: false });

      // Apply filters
      if (filters.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      if (filters.search) {
        query = query.or(
          `order_number.ilike.%${filters.search}%,user.full_name.ilike.%${filters.search}%`
        );
      }

      const { data: orders, error } = await query;

      if (error) {
        throw error;
      }

      // Get order items for each order
      if (orders && orders.length > 0) {
        for (const order of orders) {
          const { data: orderItems } = await supabase
            .from("order_items")
            .select("*")
            .eq("order_id", order.id);

          order.order_items = orderItems || [];
        }
      }

      return orders || [];
    } catch (error) {
      throw error;
    }
  },

  // Get user orders
  async getUserOrders(userId) {
    try {
      const { data: orders, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get order items for each order
      if (orders && orders.length > 0) {
        for (const order of orders) {
          const { data: orderItems } = await supabase
            .from("order_items")
            .select("*")
            .eq("order_id", order.id);

          order.order_items = orderItems || [];
        }
      }

      return orders || [];
    } catch (error) {
      throw error;
    }
  },

  // Get order by ID
  async getOrderById(orderId) {
    try {
      const { data: order, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          user:user_id (
            id,
            full_name,
            email,
            phone,
            address,
            city,
            state,
            zip_code,
            country
          )
        `
        )
        .eq("id", orderId)
        .single();

      if (error) throw error;

      // Get order items
      const { data: orderItems } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", orderId);

      order.order_items = orderItems || [];

      return order;
    } catch (error) {
      throw error;
    }
  },

  // Update order status
  async updateOrderStatus(orderId, status) {
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          status: status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      throw error;
    }
  },

  // Update payment status
  async updatePaymentStatus(orderId, paymentStatus) {
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          payment_status: paymentStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      throw error;
    }
  },

  // Cancel order
  async cancelOrder(orderId) {
    try {
      // First, get order items to restore stock
      const { data: orderItems, error: itemsError } = await supabase
        .from("order_items")
        .select("product_id, quantity")
        .eq("order_id", orderId);

      if (itemsError) throw itemsError;

      // Restore stock for each product
      if (orderItems) {
        for (const item of orderItems) {
          await this.restoreProductStock(item.product_id, item.quantity);
        }
      }

      // Then update order status to cancelled
      const { error } = await supabase
        .from("orders")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      throw error;
    }
  },

  // Restore product stock when order is cancelled
  async restoreProductStock(productId, quantity) {
    try {
      // Get current stock
      const { data: product, error: fetchError } = await supabase
        .from("products")
        .select("stock")
        .eq("id", productId)
        .single();

      if (fetchError) throw fetchError;

      const currentStock = parseInt(product.stock) || 0;
      const newStock = currentStock + quantity;

      // Update stock
      const { error: updateError } = await supabase
        .from("products")
        .update({
          stock: newStock,
          updated_at: new Date().toISOString(),
        })
        .eq("id", productId);

      if (updateError) throw updateError;
      return { success: true, newStock };
    } catch (error) {
      throw error;
    }
  },

  // Delete order items (for admin order deletion)
  async deleteOrderItems(orderId) {
    try {
      const { error } = await supabase
        .from("order_items")
        .delete()
        .eq("order_id", orderId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("Error deleting order items:", error);
      throw error;
    }
  },

  // Delete order (for admin)
  async deleteOrder(orderId) {
    try {
      // First delete order items
      await this.deleteOrderItems(orderId);

      // Then delete the order
      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("Error deleting order:", error);
      throw error;
    }
  },
};
