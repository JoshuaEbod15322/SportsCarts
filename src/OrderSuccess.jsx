import React from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  CheckCircle,
  Package,
  Home,
  ShoppingBag,
  CreditCard,
} from "lucide-react";

const OrderSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { orderTotal, orderNumber, paymentMethod, status } =
    location.state || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Order Confirmed!
        </h1>

        <p className="text-gray-600 mb-6">
          Thank you for your purchase. Your order has been successfully
          processed.
        </p>

        {orderNumber && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="text-sm text-gray-500 mb-1">Order Number</div>
            <div className="font-mono text-lg font-bold text-gray-700">
              {orderNumber}
            </div>
          </div>
        )}

        {paymentMethod && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="text-sm text-gray-500 mb-1">Payment Method</div>
            <div className="font-semibold text-gray-700 flex items-center justify-center gap-2">
              {paymentMethod === "Credit Card" ? (
                <>
                  <CreditCard className="w-4 h-4" />
                  {paymentMethod}
                </>
              ) : (
                paymentMethod
              )}
            </div>
          </div>
        )}

        {status && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="text-sm text-gray-500 mb-1">Order Status</div>
            <div
              className={`font-semibold ${
                status === "processing"
                  ? "text-yellow-600"
                  : status === "shipped"
                  ? "text-blue-600"
                  : status === "delivered"
                  ? "text-green-600"
                  : "text-gray-700"
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </div>
          </div>
        )}

        {orderTotal && (
          <div className="mb-8">
            <div className="text-4xl font-bold text-green-600">
              ${orderTotal.toFixed(2)}
            </div>
            <div className="text-gray-500">Total Amount</div>
          </div>
        )}

        <div className="space-y-3">
          <Link
            to="/dashboard"
            className="block w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            Continue Shopping
          </Link>

          <Link
            to="/account"
            className="block w-full py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <Package className="w-5 h-5" />
            View Orders
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3">What's Next?</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div>1. You'll receive an order confirmation email shortly</div>
            <div>2. We'll process and ship your order within 24 hours</div>
            <div>3. You can track your order in your account page</div>
            {paymentMethod === "Credit Card" && (
              <div className="text-green-600 font-medium">
                4. Payment successful! Your order is being processed.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;
