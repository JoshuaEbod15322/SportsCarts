import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Package,
  Truck,
  CreditCard,
  Lock,
  Shield,
  CheckCircle,
  Loader2,
  AlertCircle,
  User,
} from "lucide-react";
import { supabase } from "./lib/supabase";
import { cartService } from "./lib/cartService";
import { orderService } from "./lib/orderService";

const Cart = () => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingCheckout, setProcessingCheckout] = useState(false);
  const [userId, setUserId] = useState(null);
  const [address, setAddress] = useState({
    fullName: "",
    street: "",
    city: "",
    state: "",
    zipCode: "",
    country: "US",
  });
  const [showAddressForm, setShowAddressForm] = useState(false);

  const shippingOptions = [
    {
      id: 1,
      name: "Standard Shipping",
      price: 4.99,
      days: "5-7 business days",
    },
    { id: 2, name: "Express Shipping", price: 9.99, days: "2-3 business days" },
    { id: 3, name: "Next Day Delivery", price: 19.99, days: "1 business day" },
  ];

  const [selectedShipping, setSelectedShipping] = useState(shippingOptions[0]);

  // Fetch user session and cart items
  useEffect(() => {
    fetchUserAndCart();
  }, []);

  const fetchUserAndCart = async () => {
    try {
      setLoading(true);

      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("Please login to view your cart");
        setCartItems([]);
        setLoading(false);
        return;
      }

      setUserId(user.id);

      // Fetch user's address from profile
      fetchUserAddress(user.id);

      // Fetch cart items using cartService
      const items = await cartService.getCartItems(user.id);

      // Ensure we have an array
      if (!Array.isArray(items)) {
        setCartItems([]);
        setError("No items in cart");
        setLoading(false);
        return;
      }

      // Ensure all required properties exist
      const processedItems = items.map((item) => ({
        ...item,
        inStock: item.inStock ?? (parseInt(item.stock) || 0) > 0,
        stock: parseInt(item.stock) || 0,
        imageColor: item.imageColor || "#2C3E50",
        name: item.name || "Unknown Product",
        price: parseFloat(item.price) || 0,
        category: item.category || "General",
        brand: item.brand || "Generic",
        size: item.size || "M",
      }));

      setCartItems(processedItems);
      setError(null);
    } catch (err) {
      console.error("Error fetching cart:", err);
      setError("Failed to load cart items. Please try again.");
      setCartItems([]);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (id, newQuantity) => {
    if (newQuantity < 1) {
      removeItem(id);
      return;
    }

    // Find the item to check stock
    const item = cartItems.find((item) => item.id === id);
    if (!item) return;

    // Check if quantity exceeds stock - ensure stock is a number
    const availableStock = parseInt(item.stock) || 0;
    if (newQuantity > availableStock) {
      setError(
        `Only ${availableStock} items available in stock for ${item.name}`
      );
      return;
    }

    try {
      // Update in Supabase using cartService
      await cartService.updateCartItem(id, newQuantity);

      // Update local state
      setCartItems(
        cartItems.map((item) =>
          item.id === id ? { ...item, quantity: newQuantity } : item
        )
      );
      setError(null);
    } catch (err) {
      setError("Failed to update quantity. Please try again.");
    }
  };

  const removeItem = async (id) => {
    try {
      await cartService.removeFromCart(id);
      setCartItems(cartItems.filter((item) => item.id !== id));
      setError(null);
    } catch (err) {
      setError("Failed to remove item. Please try again.");
    }
  };

  const clearCart = async () => {
    try {
      if (userId) {
        await cartService.clearCart(userId);
        setCartItems([]);
        setError(null);
      }
    } catch (err) {
      setError("Failed to clear cart. Please try again.");
    }
  };

  const calculateSubtotal = () =>
    cartItems.reduce((total, item) => total + item.price * item.quantity, 0);

  const calculateTotal = () =>
    calculateSubtotal() + selectedShipping.price + calculateSubtotal() * 0.08;

  const validateAddress = () => {
    const requiredFields = ["fullName", "street", "city", "state", "zipCode"];
    for (const field of requiredFields) {
      if (!address[field]?.trim()) {
        return `Please fill in ${field
          .replace(/([A-Z])/g, " $1")
          .toLowerCase()}`;
      }
    }
    return null;
  };

  // In the fetchUserAddress function:
  const fetchUserAddress = async (userId) => {
    try {
      // Get from users table
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("full_name, address, city, state, zip_code, country")
        .eq("id", userId)
        .single();

      if (!userError && userData) {
        setAddress({
          fullName: userData.full_name || "",
          street: userData.address || "",
          city: userData.city || "",
          state: userData.state || "",
          zipCode: userData.zip_code || "",
          country: userData.country || "US",
        });

        // Don't show address form if we have complete address
        if (
          userData.full_name &&
          userData.address &&
          userData.city &&
          userData.state &&
          userData.zip_code
        ) {
          setShowAddressForm(false);
        }
      }
    } catch (err) {
      console.error("Error fetching address:", err);
    }
  };

  // In the handleAddressSubmit function:
  const handleAddressSubmit = async () => {
    const validationError = validateAddress();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      // Save address to users table
      const { error } = await supabase
        .from("users")
        .update({
          full_name: address.fullName.trim(),
          address: address.street.trim(),
          city: address.city.trim(),
          state: address.state.trim(),
          zip_code: address.zipCode.trim(),
          country: address.country,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) throw error;

      setShowAddressForm(false);
      setError(null);

      // Show success message
      setError("Address saved successfully!");
      setTimeout(() => setError(null), 3000);
    } catch (err) {
      console.error("Error saving address:", err);
      setError("Failed to save address. Please try again.");
    }
  };

  const handleCheckout = async () => {
    if (!cartItems.length) {
      setError("Your cart is empty");
      return;
    }

    if (!userId) {
      navigate("/login");
      return;
    }

    // Check if address is complete
    const isAddressComplete =
      address.fullName &&
      address.street &&
      address.city &&
      address.state &&
      address.zipCode;

    if (!isAddressComplete) {
      setError(
        "Please set up your address in your profile before ordering. Click 'Go to Profile' to set it up."
      );
      setShowAddressForm(true);
      return;
    }

    // Check if any items are out of stock
    const outOfStockItems = cartItems.filter(
      (item) => !item.inStock || item.quantity > item.stock
    );
    if (outOfStockItems.length > 0) {
      setError(
        "Some items in your cart are out of stock or have insufficient quantity. Please update your cart."
      );
      return;
    }

    // Save shipping selection to localStorage for checkout page
    localStorage.setItem(
      "checkoutData",
      JSON.stringify({
        shippingOption: selectedShipping,
        address: address,
        cartTotal: calculateTotal(),
      })
    );

    // Navigate to checkout page
    navigate("/checkout");
  };

  const handleAccountClick = () => {
    navigate("/account");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your cart...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
                <ShoppingCart className="w-7 h-7 md:w-8 md:h-8 text-blue-600" />
                Shopping Cart
              </h1>
              <p className="text-gray-600 mt-1">
                {cartItems.length} items in your cart
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              {cartItems.length > 0 && (
                <button
                  onClick={clearCart}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-all duration-200 font-medium w-full sm:w-auto"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear Cart
                </button>
              )}
              <button
                onClick={() => navigate("/dashboard")}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow w-full sm:w-auto"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Shop
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div
            className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
              error.includes("success")
                ? "bg-green-50 border border-green-200"
                : "bg-red-50 border border-red-200"
            }`}
          >
            {error.includes("success") ? (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            )}
            <p
              className={
                error.includes("success") ? "text-green-700" : "text-red-700"
              }
            >
              {error}
            </p>
            <button
              onClick={() => setError(null)}
              className={`ml-auto ${
                error.includes("success")
                  ? "text-green-600 hover:text-green-800"
                  : "text-red-600 hover:text-red-800"
              }`}
            >
              ×
            </button>
          </div>
        )}

        {cartItems.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12 text-center max-w-lg mx-auto">
            <ShoppingCart className="w-16 h-16 md:w-20 md:h-20 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {userId ? "Your cart is empty" : "Please login to view cart"}
            </h2>
            <p className="text-gray-600 mb-6">
              {userId
                ? "Add some amazing tumblers to your cart!"
                : "Login to manage your shopping cart"}
            </p>
            <button
              onClick={() => navigate("/dashboard")}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium"
            >
              {userId ? "Continue Shopping" : "Go to Login"}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-6">
              {/* Cart Items List */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
                  <h2 className="text-xl font-bold text-gray-900">
                    Cart Items
                  </h2>
                  <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-sm font-medium border border-blue-100">
                    {cartItems.length} items
                  </span>
                </div>

                <div className="space-y-4">
                  {cartItems.map((item) => (
                    <div
                      key={item.id}
                      className="border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-all duration-200"
                    >
                      <div className="flex flex-col sm:flex-row gap-4">
                        {/* Item Image */}
                        <div
                          className="relative w-full sm:w-32 h-32 rounded-lg overflow-hidden flex-shrink-0"
                          style={{ backgroundColor: item.imageColor }}
                        >
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-12 h-12 text-white opacity-80" />
                            </div>
                          )}
                          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold text-gray-700">
                            {item.category}
                          </div>
                          <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded-md text-xs font-bold">
                            {item.size}
                          </div>
                        </div>

                        {/* Item Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 mb-2">
                                {item.name}
                              </h3>
                              <div className="flex flex-wrap gap-2 items-center mb-4">
                                <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-sm font-bold border border-blue-200">
                                  {item.size}
                                </div>
                                {item.inStock ? (
                                  <span className="flex items-center gap-1 text-green-600 text-sm font-semibold">
                                    <CheckCircle className="w-4 h-4" /> In Stock
                                    ({item.stock || 0} available)
                                  </span>
                                ) : (
                                  <span className="text-red-600 text-sm font-medium">
                                    Out of Stock
                                  </span>
                                )}
                              </div>
                              {item.stock <= 5 && item.inStock && (
                                <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                                  <p className="text-xs text-yellow-700">
                                    Only {item.stock} left in stock!
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Price */}
                            <div className="text-right">
                              <div className="text-lg font-bold text-blue-600 mb-1">
                                ${item.price.toFixed(2)}
                              </div>
                              <div className="text-xl font-bold text-green-600">
                                ${(item.price * item.quantity).toFixed(2)}
                              </div>
                            </div>
                          </div>

                          {/* Controls */}
                          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-100">
                            <div className="flex items-center bg-gray-50 rounded-full p-1 border border-gray-200">
                              <button
                                onClick={() =>
                                  updateQuantity(item.id, item.quantity - 1)
                                }
                                className="w-8 h-8 bg-white rounded-full flex items-center justify-center border border-gray-300 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                                disabled={processingCheckout}
                              >
                                <Minus className="w-4 h-4 text-gray-700" />
                              </button>
                              <span className="min-w-[40px] text-center font-semibold text-gray-900">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() =>
                                  updateQuantity(item.id, item.quantity + 1)
                                }
                                className="w-8 h-8 bg-white rounded-full flex items-center justify-center border border-gray-300 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                                disabled={
                                  processingCheckout ||
                                  item.quantity >= item.stock
                                }
                              >
                                <Plus className="w-4 h-4 text-gray-700" />
                              </button>
                            </div>

                            <button
                              onClick={() => removeItem(item.id)}
                              className="flex items-center gap-2 px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors duration-200 font-medium"
                              disabled={processingCheckout}
                            >
                              <Trash2 className="w-4 h-4" />
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipping Address Form */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    Shipping Address
                  </h2>
                  {!showAddressForm && address.fullName && (
                    <button
                      onClick={() => setShowAddressForm(true)}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Edit Address
                    </button>
                  )}
                </div>

                {showAddressForm ? (
                  <div className="space-y-4">
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-700">
                        This address will be saved to your profile and used for
                        all future orders.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          value={address.fullName}
                          onChange={(e) =>
                            setAddress({ ...address, fullName: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="John Doe"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Street Address *
                        </label>
                        <input
                          type="text"
                          value={address.street}
                          onChange={(e) =>
                            setAddress({ ...address, street: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="123 Main St"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          City *
                        </label>
                        <input
                          type="text"
                          value={address.city}
                          onChange={(e) =>
                            setAddress({ ...address, city: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="New York"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          State *
                        </label>
                        <input
                          type="text"
                          value={address.state}
                          onChange={(e) =>
                            setAddress({ ...address, state: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="NY"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          ZIP Code *
                        </label>
                        <input
                          type="text"
                          value={address.zipCode}
                          onChange={(e) =>
                            setAddress({ ...address, zipCode: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="10001"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => setShowAddressForm(false)}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddressSubmit}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Save Address
                      </button>
                    </div>
                  </div>
                ) : address.fullName ? (
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-gray-900">
                          {address.fullName}
                        </p>
                        <p className="text-gray-600 text-sm mt-1">
                          {address.street}
                        </p>
                        <p className="text-gray-600 text-sm">
                          {address.city}, {address.state} {address.zipCode}
                        </p>
                        <p className="text-gray-600 text-sm">
                          {address.country}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span>Using your profile address</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-700 font-medium mb-2">
                      ⚠️ No shipping address set
                    </p>
                    <p className="text-yellow-600 text-sm mb-3">
                      Please set up your address in your profile before
                      ordering.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowAddressForm(true)}
                        className="px-3 py-1.5 bg-yellow-100 text-yellow-800 border border-yellow-300 rounded text-sm font-medium hover:bg-yellow-200"
                      >
                        Add Address Here
                      </button>
                      <button
                        onClick={handleAccountClick}
                        className="px-3 py-1.5 bg-blue-100 text-blue-800 border border-blue-300 rounded text-sm font-medium hover:bg-blue-200 flex items-center gap-1"
                      >
                        <User className="w-3 h-3" />
                        Go to Profile
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Order Summary */}
            <div className="space-y-6">
              {/* Order Summary Card */}
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
                  <h2 className="text-xl font-bold text-gray-900">
                    Order Summary
                  </h2>
                  <div className="flex items-center gap-2 text-green-600 font-semibold text-sm">
                    <Lock className="w-4 h-4" />
                    Secure Checkout
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-gray-700">
                    <span>Subtotal</span>
                    <span className="font-semibold">
                      ${calculateSubtotal().toFixed(2)}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Shipping</span>
                      <span className="font-semibold">
                        ${selectedShipping.price.toFixed(2)}
                      </span>
                    </div>
                    <select
                      value={selectedShipping.id}
                      onChange={(e) =>
                        setSelectedShipping(
                          shippingOptions.find(
                            (opt) => opt.id === parseInt(e.target.value)
                          )
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      disabled={processingCheckout}
                    >
                      {shippingOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name} - ${option.price.toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-between text-gray-700">
                    <span>Estimated Tax (8%)</span>
                    <span>${(calculateSubtotal() * 0.08).toFixed(2)}</span>
                  </div>

                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-gray-900">
                        Total
                      </span>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">
                          ${calculateTotal().toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-500">
                          Includes ${(calculateSubtotal() * 0.08).toFixed(2)} in
                          taxes
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={
                    processingCheckout ||
                    cartItems.length === 0 ||
                    cartItems.some((item) => !item.inStock) ||
                    !address.fullName
                  }
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingCheckout ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      Checkout {/* Changed from "Complete Order" */}
                    </>
                  )}
                </button>

                {cartItems.some((item) => !item.inStock) && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">
                      Some items are out of stock. Please remove them to
                      proceed.
                    </p>
                  </div>
                )}

                {!address.fullName && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-700">
                      Please add a shipping address to proceed.
                    </p>
                  </div>
                )}

                <p className="text-center text-gray-500 text-sm mb-4">
                  Your order will be processed immediately
                </p>

                <div className="grid grid-cols-3 gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  {[Shield, Lock, Package].map((Icon, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col items-center text-gray-600"
                    >
                      <Icon className="w-5 h-5 text-blue-600 mb-1" />
                      <span className="text-xs font-medium">
                        {["SSL Secure", "Encrypted", "Guarantee"][idx]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipping Info Card */}
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                  <Truck className="w-5 h-5 text-blue-600" />
                  Shipping Information
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900">
                      {selectedShipping.name}
                    </span>
                    <span className="text-gray-600 text-sm">
                      {selectedShipping.days}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                  <Package className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-700 font-medium">
                    Free shipping on orders over $50
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;
