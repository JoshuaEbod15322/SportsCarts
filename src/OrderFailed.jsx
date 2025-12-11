import React from "react";
import { Link } from "react-router-dom";
import { XCircle, RefreshCw, CreditCard, Home } from "lucide-react";

const OrderFailed = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-12 h-12 text-red-600" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Payment Failed
        </h1>

        <p className="text-gray-600 mb-6">
          We couldn't process your payment. Please try again or use a different
          payment method.
        </p>

        <div className="space-y-3">
          <Link
            to="/checkout"
            className="block w-full py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            Try Again
          </Link>

          <Link
            to="/cart"
            className="block w-full py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <CreditCard className="w-5 h-5" />
            Change Payment Method
          </Link>

          <Link
            to="/dashboard"
            className="block w-full py-3 border border-blue-300 text-blue-700 rounded-lg font-semibold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderFailed;
