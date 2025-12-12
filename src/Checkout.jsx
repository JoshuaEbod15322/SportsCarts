import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CreditCard,
  Lock,
  Shield,
  MapPin,
  Package,
  Truck,
  Loader2,
} from "lucide-react";
import { cartService } from "./lib/cartService";
import { orderService } from "./lib/orderService";
import { stripeService } from "./lib/stripeService";
import { supabase } from "./lib/supabase";

const Checkout = () => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shippingData, setShippingData] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "United States",
  });
  const [orderSummary, setOrderSummary] = useState({
    subtotal: 0,
    shipping: 4.99,
    tax: 0,
    total: 0,
  });
  const [userId, setUserId] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [processing, setProcessing] = useState(false);
  const [cardDetails, setCardDetails] = useState({
    cardNumber: "",
    expiry: "",
    cvc: "",
    name: "",
  });
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  useEffect(() => {
    loadCheckoutData();
  }, []);

  const loadCheckoutData = async () => {
    try {
      setLoading(true);

      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        navigate("/login");
        return;
      }

      setUserId(user.id);

      // Load cart items
      const items = await cartService.getCartItems(user.id);
      setCartItems(items);

      // Calculate totals
      const subtotal = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      const tax = subtotal * 0.08;
      const total = subtotal + orderSummary.shipping + tax;

      setOrderSummary({
        subtotal,
        shipping: orderSummary.shipping,
        tax,
        total,
      });

      // Set shipping data from users table
      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (userData) {
        setShippingData({
          fullName: userData.full_name || user.user_metadata?.full_name || "",
          email: user.email || "",
          phone: userData.phone || "",
          address: userData.address || "",
          city: userData.city || "",
          state: userData.state || "",
          zipCode: userData.zip_code || "",
          country: userData.country || "United States",
        });
      } else {
        setShippingData({
          fullName: user.user_metadata?.full_name || "",
          email: user.email || "",
          phone: "",
          address: "",
          city: "",
          state: "",
          zipCode: "",
          country: "United States",
        });
      }
    } catch (error) {
      alert("Failed to load checkout data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleShippingChange = (e) => {
    setShippingData({
      ...shippingData,
      [e.target.name]: e.target.value,
    });
  };

  const handleCardDetailsChange = (e) => {
    const { name, value } = e.target;
    setPaymentError("");

    // Format card number with spaces
    if (name === "cardNumber") {
      const formatted = value
        .replace(/\s/g, "")
        .replace(/(\d{4})/g, "$1 ")
        .trim()
        .slice(0, 19);
      setCardDetails({ ...cardDetails, [name]: formatted });
    }
    // Format expiry date
    else if (name === "expiry") {
      const formatted = value
        .replace(/\D/g, "")
        .replace(/(\d{2})(\d{0,2})/, "$1/$2")
        .slice(0, 5);
      setCardDetails({ ...cardDetails, [name]: formatted });
    }
    // Format CVC
    else if (name === "cvc") {
      const formatted = value.replace(/\D/g, "").slice(0, 4);
      setCardDetails({ ...cardDetails, [name]: formatted });
    } else {
      setCardDetails({ ...cardDetails, [name]: value });
    }
  };

  const handlePaymentMethodChange = (method) => {
    setPaymentMethod(method);
    setPaymentError("");
  };

  const validateCardDetails = () => {
    if (
      !cardDetails.cardNumber ||
      !cardDetails.expiry ||
      !cardDetails.cvc ||
      !cardDetails.name
    ) {
      return "Please fill in all card details";
    }

    const cleanCardNumber = cardDetails.cardNumber.replace(/\s/g, "");
    if (cleanCardNumber.length < 15 || cleanCardNumber.length > 16) {
      return "Please enter a valid card number";
    }

    // Validate expiry date
    const [month, year] = cardDetails.expiry.split("/");
    if (!month || !year || month.length !== 2 || year.length !== 2) {
      return "Please enter a valid expiry date (MM/YY)";
    }

    const currentYear = new Date().getFullYear() % 100;
    const currentMonth = new Date().getMonth() + 1;

    if (
      parseInt(year) < currentYear ||
      (parseInt(year) === currentYear && parseInt(month) < currentMonth)
    ) {
      return "Card has expired";
    }

    if (cardDetails.cvc.length < 3) {
      return "Please enter a valid CVC";
    }

    return null;
  };

  const processStripePayment = async () => {
    try {
      setPaymentProcessing(true);

      // Validate card details
      const validationError = validateCardDetails();
      if (validationError) {
        throw new Error(validationError);
      }

      // Remove spaces from card number for processing
      const cleanCardNumber = cardDetails.cardNumber.replace(/\s/g, "");

      // Process payment with Stripe service
      const paymentResult = await stripeService.processCardPayment(
        {
          cardNumber: cleanCardNumber,
          expiry: cardDetails.expiry,
          cvc: cardDetails.cvc,
          name: cardDetails.name,
        },
        orderSummary.total,
        userId,
        null // orderId will be generated later
      );

      return paymentResult;
    } catch (error) {
      setPaymentError(error.message);
      throw error;
    } finally {
      setPaymentProcessing(false);
    }
  };

  const handlePlaceOrder = async () => {
    try {
      setProcessing(true);
      setPaymentError("");

      // Validate shipping data
      if (
        !shippingData.fullName ||
        !shippingData.email ||
        !shippingData.address ||
        !shippingData.city ||
        !shippingData.state ||
        !shippingData.zipCode
      ) {
        throw new Error("Please fill in all required shipping information");
      }

      let paymentResult = null;

      // Process payment if using card
      if (paymentMethod === "card") {
        paymentResult = await processStripePayment();

        if (!paymentResult.success) {
          // Navigate to order failed page
          navigate("/order-failed");
          return;
        }
      }

      // Create order data
      const orderData = {
        user_id: userId,
        order_number: `ORD-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)
          .toUpperCase()}`,
        total_amount: orderSummary.total,
        status: paymentMethod === "card" ? "processing" : "pending",
        shipping_address: JSON.stringify({
          fullName: shippingData.fullName,
          email: shippingData.email,
          phone: shippingData.phone,
          address: shippingData.address,
          city: shippingData.city,
          state: shippingData.state,
          zipCode: shippingData.zipCode,
          country: shippingData.country,
        }),
        payment_status: paymentMethod === "cod" ? "pending" : "paid",
        payment_method: paymentMethod === "cod" ? "cash_on_delivery" : "card",
        shipping_method: "Standard Shipping",
        shipping_cost: 4.99,
        tax_amount: orderSummary.tax,
        subtotal: orderSummary.subtotal,
        stripe_payment_id: paymentResult?.paymentId || null,
      };

      // Create order items
      const orderItems = cartItems.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
        size: item.size,
        price: item.price,
        total_price: item.price * item.quantity,
        product_name: item.name,
        category: item.category,
        brand: item.brand,
        image_url: item.imageUrl,
      }));

      // Create order in database
      let order;
      if (paymentMethod === "card" && paymentResult) {
        order = await orderService.createOrderWithStripe(
          orderData,
          orderItems,
          paymentResult
        );

        // Save payment record
        await stripeService.savePaymentRecord(paymentResult, order.id, userId);
      } else {
        order = await orderService.createOrder(orderData, orderItems);
      }

      // Clear cart
      await cartService.clearCart(userId);

      // Navigate to success page
      navigate("/order-success", {
        state: {
          orderTotal: orderSummary.total,
          orderNumber: order.order_number,
          paymentMethod:
            paymentMethod === "cod" ? "Cash on Delivery" : "Credit Card",
          status: order.status,
        },
      });
    } catch (err) {
      console.error("Error placing order:", err);
      alert(err.message || "Failed to place order. Please try again.");
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Your cart is empty
          </h2>
          <p className="text-gray-600 mb-6">
            Add some items to your cart before checking out.
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate("/cart")}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Cart
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Shipping & Payment */}
          <div className="space-y-6">
            {/* Shipping Information */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5" />
                Shipping Information
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      value={shippingData.fullName}
                      onChange={handleShippingChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={shippingData.email}
                      onChange={handleShippingChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={shippingData.phone}
                    onChange={handleShippingChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address *
                  </label>
                  <textarea
                    name="address"
                    value={shippingData.address}
                    onChange={handleShippingChange}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={shippingData.city}
                      onChange={handleShippingChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State *
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={shippingData.state}
                      onChange={handleShippingChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ZIP Code *
                    </label>
                    <input
                      type="text"
                      name="zipCode"
                      value={shippingData.zipCode}
                      onChange={handleShippingChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country *
                  </label>
                  <select
                    name="country"
                    value={shippingData.country}
                    onChange={handleShippingChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="United States">United States</option>
                    <option value="Philippines">Philippines</option>
                    <option value="Canada">Canada</option>
                    <option value="Australia">Australia</option>
                    <option value="United Kingdom">United Kingdom</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5" />
                Payment Method
              </h3>

              <div className="space-y-4">
                <div className="space-y-3">
                  <div
                    className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all ${
                      paymentMethod === "cod"
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                    onClick={() => handlePaymentMethodChange("cod")}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full border ${
                          paymentMethod === "cod"
                            ? "border-blue-500 bg-blue-500"
                            : "border-gray-300"
                        } flex items-center justify-center`}
                      >
                        {paymentMethod === "cod" && (
                          <div className="w-2 h-2 rounded-full bg-white"></div>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          Cash on Delivery
                        </div>
                        <div className="text-sm text-gray-500">
                          Pay when you receive your order
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all ${
                      paymentMethod === "card"
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                    onClick={() => handlePaymentMethodChange("card")}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full border ${
                          paymentMethod === "card"
                            ? "border-blue-500 bg-blue-500"
                            : "border-gray-300"
                        } flex items-center justify-center`}
                      >
                        {paymentMethod === "card" && (
                          <div className="w-2 h-2 rounded-full bg-white"></div>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          Credit Card
                        </div>
                        <div className="text-sm text-gray-500">
                          Pay securely with your card
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {paymentMethod === "card" && (
                  <div className="p-4 border border-gray-300 rounded-lg bg-white">
                    {paymentError && (
                      <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-700 text-sm">{paymentError}</p>
                      </div>
                    )}

                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cardholder Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={cardDetails.name}
                        onChange={handleCardDetailsChange}
                        placeholder="Your name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Card Number *
                      </label>
                      <input
                        type="text"
                        name="cardNumber"
                        value={cardDetails.cardNumber}
                        onChange={handleCardDetailsChange}
                        placeholder="You card number"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Expiry (MM/YY) *
                        </label>
                        <input
                          type="text"
                          name="expiry"
                          value={cardDetails.expiry}
                          onChange={handleCardDetailsChange}
                          placeholder="12/25"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          CVC *
                        </label>
                        <input
                          type="text"
                          name="cvc"
                          value={cardDetails.cvc}
                          onChange={handleCardDetailsChange}
                          placeholder="123"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {/* Test Card Information for Development */}
                    {(import.meta.env.VITE_APP_ENV === "development" ||
                      import.meta.env.VITE_APP_ENV === "test") && (
                      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-yellow-800 text-sm font-medium mb-1">
                          Test Mode - Use this test card:
                        </p>
                        <p className="text-yellow-700 text-xs">
                          Card Number: 4242 4242 4242 4242
                        </p>
                        <p className="text-yellow-700 text-xs">
                          Expiry: Any future date (e.g., 12/30)
                        </p>
                        <p className="text-yellow-700 text-xs">
                          CVC: Any 3 digits (e.g., 123)
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    <Shield className="w-4 h-4" />
                    <span className="text-sm">Secure Transaction</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Your information is secure. All payments are processed
                    through Stripe's secure payment system.
                  </p>
                </div>
              </div> */}
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={processing || paymentProcessing}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing || paymentProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  {paymentMethod === "cod"
                    ? `Place Order - $${orderSummary.total.toFixed(2)}`
                    : `Pay $${orderSummary.total.toFixed(2)}`}
                </>
              )}
            </button>
          </div>

          {/* Right Column - Order Summary */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-4">
                <Package className="w-5 h-5" />
                Order Summary
              </h2>

              <div className="space-y-3">
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-2 border-b border-gray-100"
                  >
                    <div>
                      <div className="font-medium text-gray-900">
                        {item.name} ({item.size})
                      </div>
                      <div className="text-sm text-gray-500">
                        {item.quantity} × ${item.price.toFixed(2)}
                      </div>
                    </div>
                    <div className="font-semibold text-gray-900">
                      ${(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2 mt-6 pt-4 border-t border-gray-200">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold">
                    ${orderSummary.subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-semibold">
                    ${orderSummary.shipping.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax</span>
                  <span className="font-semibold">
                    ${orderSummary.tax.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 mt-2 border-t border-gray-200">
                  <span>Total</span>
                  <span className="text-blue-600">
                    ${orderSummary.total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Security Info */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-3">
                Security & Privacy
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <Shield className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <div className="text-xs text-gray-600">SSL Secure</div>
                </div>
                <div className="text-center">
                  <Lock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-xs text-gray-600">Encrypted</div>
                </div>
                <div className="text-center">
                  <Truck className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                  <div className="text-xs text-gray-600">Guaranteed</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
