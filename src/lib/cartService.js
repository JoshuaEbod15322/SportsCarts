import { supabase } from "./supabase";

export const cartService = {
  async getCartItems(userId) {
    try {
      const { data: cartItems, error } = await supabase
        .from("cart_items")
        .select(
          `
          id,
          user_id,
          product_id,
          size,
          quantity,
          products:product_id (
            id,
            name,
            description,
            category,
            brand,
            price,
            stock,
            status,
            image_url,
            sizes,
            available_sizes,
            created_at
          )
        `
        )
        .eq("user_id", userId);

      if (error) {
        throw error;
      }

      if (!cartItems || cartItems.length === 0) {
        return [];
      }

      const transformedItems = cartItems.map((item) => {
        const product = item.products || {};

        let sizesArray = ["12oz", "16oz", "20oz"];
        let availableSizesArray = ["12oz", "16oz"];

        try {
          if (product.sizes && Array.isArray(product.sizes)) {
            sizesArray = product.sizes;
          }
          if (
            product.available_sizes &&
            Array.isArray(product.available_sizes)
          ) {
            availableSizesArray = product.available_sizes;
          }
        } catch (e) {
          // Silently handle parse errors
        }

        const stock = parseInt(product.stock) || 0;
        const isActive = product.status === "active";
        const inStock = isActive && stock > 0;

        return {
          id: item.id,
          productId: item.product_id,
          userId: item.user_id,
          size: item.size || "M",
          quantity: item.quantity || 1,
          name: product.name || "Unknown Product",
          description: product.description || "",
          category: product.category || "General",
          brand: product.brand || "Generic",
          price: parseFloat(product.price) || 0,
          stock: stock,
          imageUrl:
            product.image_url ||
            "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=600&fit=crop",
          imageColor: "#2C3E50",
          inStock: inStock,
          availableSizes: availableSizesArray,
          sizes: sizesArray,
        };
      });

      return transformedItems;
    } catch (error) {
      throw new Error(`Failed to load cart: ${error.message}`);
    }
  },

  async addToCart(userId, productId, quantity, size) {
    try {
      const { data: existingItem, error: fetchError } = await supabase
        .from("cart_items")
        .select("*")
        .eq("user_id", userId)
        .eq("product_id", productId)
        .eq("size", size)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        throw fetchError;
      }

      if (existingItem) {
        const { error: updateError } = await supabase
          .from("cart_items")
          .update({ quantity: existingItem.quantity + quantity })
          .eq("id", existingItem.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("cart_items")
          .insert({
            user_id: userId,
            product_id: productId,
            size: size,
            quantity: quantity,
          });

        if (insertError) throw insertError;
      }
    } catch (error) {
      throw error;
    }
  },

  async updateCartItem(cartItemId, newQuantity) {
    try {
      const { error } = await supabase
        .from("cart_items")
        .update({ quantity: newQuantity })
        .eq("id", cartItemId);

      if (error) throw error;
    } catch (error) {
      throw error;
    }
  },

  async removeFromCart(cartItemId) {
    try {
      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("id", cartItemId);

      if (error) throw error;
    } catch (error) {
      throw error;
    }
  },

  async clearCart(userId) {
    try {
      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("user_id", userId);

      if (error) throw error;
    } catch (error) {
      throw error;
    }
  },
};
