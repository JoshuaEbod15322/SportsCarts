import { supabase } from "./supabase";

export const productService = {
  // Fetch all products (for user dashboard)
  getAllProducts: async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching products:", error);
      return [];
    }
  },

  // Fetch products with filters (for admin)
  getProducts: async (filters = {}) => {
    try {
      let query = supabase.from("products").select("*");

      if (filters.search) {
        query = query.ilike("name", `%${filters.search}%`);
      }

      if (filters.category && filters.category !== "all") {
        query = query.eq("category", filters.category);
      }

      if (filters.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      query = query.order("created_at", { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching products:", error);
      return [];
    }
  },

  // Create new product (admin only)
  createProduct: async (productData) => {
    try {
      const { data, error } = await supabase
        .from("products")
        .insert([productData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error creating product:", error);
      throw error;
    }
  },

  // Update product (admin only)
  updateProduct: async (id, productData) => {
    try {
      const { data, error } = await supabase
        .from("products")
        .update(productData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error updating product:", error);
      throw error;
    }
  },

  // Delete product with cascade approach
  deleteProduct: async (id) => {
    try {
      // Step 1: Check if product exists in order_items
      const { data: orderItems, error: checkError } = await supabase
        .from("order_items")
        .select("id, order_id")
        .eq("product_id", id);

      if (checkError) throw checkError;

      if (orderItems && orderItems.length > 0) {
        // Product exists in orders - throw specific error
        throw new Error(
          "Cannot delete product that exists in orders. Use force delete instead."
        );
      }

      // Step 2: Delete the product
      const { error: deleteError } = await supabase
        .from("products")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      return { success: true };
    } catch (error) {
      console.error("Error deleting product:", error);
      throw error;
    }
  },

  // Force delete product with cascade
  forceDeleteProduct: async (id) => {
    try {
      // Step 1: First delete all order_items associated with this product
      const { error: orderItemsError } = await supabase
        .from("order_items")
        .delete()
        .eq("product_id", id);

      if (orderItemsError) {
        console.warn("Could not delete related order items:", orderItemsError);
        // Continue with product deletion anyway
      }

      // Step 2: Delete the product itself
      const { error: productError } = await supabase
        .from("products")
        .delete()
        .eq("id", id);

      if (productError) {
        // If there's still a foreign key constraint, try soft delete
        if (productError.code === "23503") {
          console.log("Attempting soft delete...");
          return await this.softDeleteProduct(id);
        }
        throw productError;
      }

      return { success: true, message: "Product force deleted successfully" };
    } catch (error) {
      console.error("Error force deleting product:", error);
      throw error;
    }
  },

  // Soft delete as fallback
  softDeleteProduct: async (id) => {
    try {
      const { error } = await supabase
        .from("products")
        .update({
          status: "deleted",
          deleted_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      return {
        success: true,
        message: "Product marked as deleted (soft delete)",
      };
    } catch (error) {
      console.error("Error soft deleting product:", error);
      throw error;
    }
  },

  // Upload product image to storage
  uploadProductImage: async (file, userId) => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;
      const filePath = `product-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("product-images").getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  },
};
