import React from "react";
import {
  X,
  Package,
  User,
  Calendar,
  DollarSign,
  Truck,
  CreditCard,
  MapPin,
  Phone,
  Mail,
  Home,
  Globe,
} from "lucide-react";

const ViewOrderModal = ({ isOpen, onClose, order }) => {
  if (!isOpen || !order) return null;

  const statusColors = {
    delivered: "bg-green-100 text-green-800",
    shipped: "bg-blue-100 text-blue-800",
    processing: "bg-yellow-100 text-yellow-800",
    cancelled: "bg-red-100 text-red-800",
  };

  const paymentColors = {
    paid: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    refunded: "bg-blue-100 text-blue-800",
  };

  // Parse shipping address JSON
  const parseShippingAddress = () => {
    if (!order.shipping_address) return null;

    try {
      // Check if it's already an object or needs parsing
      if (typeof order.shipping_address === "string") {
        return JSON.parse(order.shipping_address);
      }
      return order.shipping_address;
    } catch (error) {
      console.error("Error parsing shipping address:", error);
      // Return as plain text if not valid JSON
      return { fullAddress: order.shipping_address };
    }
  };

  const shippingAddress = parseShippingAddress();

  // Format address for display
  const formatAddress = () => {
    if (!shippingAddress) return "No shipping address provided";

    if (shippingAddress.fullAddress) {
      return shippingAddress.fullAddress;
    }

    const parts = [];
    if (shippingAddress.fullName) parts.push(shippingAddress.fullName);
    if (shippingAddress.street) parts.push(shippingAddress.street);
    if (shippingAddress.city) parts.push(shippingAddress.city);
    if (shippingAddress.state) parts.push(shippingAddress.state);
    if (shippingAddress.zipCode) parts.push(shippingAddress.zipCode);
    if (shippingAddress.country) parts.push(shippingAddress.country);

    return parts.join(", ");
  };

  // Calculate subtotal from order items
  const calculateSubtotal = () => {
    if (!order.order_items || order.order_items.length === 0) {
      return parseFloat(order.total_amount || 0);
    }

    return order.order_items.reduce((total, item) => {
      const price = parseFloat(item.products?.price || 0);
      const quantity = item.quantity || 1;
      return total + price * quantity;
    }, 0);
  };

  const subtotal = calculateSubtotal();
  const shipping = order.shipping_cost || 0;
  const tax = order.tax_amount || 0;
  const total = parseFloat(order.total_amount || 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Order Details:{" "}
              {order.order_number || `ORD-${order.id?.slice(0, 8)}`}
            </h2>
            <p className="text-gray-600 text-sm">
              Order Date:{" "}
              {order.created_at
                ? new Date(order.created_at).toLocaleDateString()
                : "N/A"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Order Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-gray-900 flex items-center gap-2">
                <User className="w-5 h-5" />
                Customer Information
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="font-medium">
                    {order.users?.full_name ||
                      shippingAddress?.fullName ||
                      "Customer"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {order.users?.email || "N/A"}
                  </p>
                </div>
                {/* Display shipping address details */}
                {shippingAddress && (
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-1 flex-shrink-0 text-gray-400" />
                      <div className="space-y-1">
                        {shippingAddress.fullName && (
                          <p className="font-medium">
                            {shippingAddress.fullName}
                          </p>
                        )}
                        {shippingAddress.street && (
                          <p className="text-gray-700">
                            {shippingAddress.street}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1">
                          {shippingAddress.city && (
                            <span className="text-gray-700">
                              {shippingAddress.city}
                            </span>
                          )}
                          {shippingAddress.state && (
                            <span className="text-gray-700">
                              {shippingAddress.state}
                            </span>
                          )}
                          {shippingAddress.zipCode && (
                            <span className="text-gray-700">
                              {shippingAddress.zipCode}
                            </span>
                          )}
                        </div>
                        {shippingAddress.country && (
                          <p className="text-gray-700 flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            {shippingAddress.country}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Order Status */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-gray-900 flex items-center gap-2">
                <Package className="w-5 h-5" />
                Order Status
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Order Status</p>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      statusColors[order.status] || "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {order.status?.charAt(0).toUpperCase() +
                      order.status?.slice(1) || "Unknown"}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Payment Status</p>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      paymentColors[order.payment_status] ||
                      "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {order.payment_status?.charAt(0).toUpperCase() +
                      order.payment_status?.slice(1) || "Pending"}
                  </span>
                </div>
                {order.tracking_number && (
                  <div>
                    <p className="text-sm text-gray-600">Tracking Number</p>
                    <p className="font-medium flex items-center gap-2">
                      <Truck className="w-4 h-4" />
                      {order.tracking_number}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div>
            <h3 className="font-semibold text-lg text-gray-900 mb-4">
              Order Items ({order.order_items?.length || 0})
            </h3>
            <div className="border rounded-lg overflow-hidden">
              <div className="grid grid-cols-12 bg-gray-50 p-4 font-medium text-gray-700 text-sm">
                <div className="col-span-6">Item</div>
                <div className="col-span-2 text-center">Quantity</div>
                <div className="col-span-2 text-right">Price</div>
                <div className="col-span-2 text-right">Total</div>
              </div>

              <div className="divide-y">
                {order.order_items && order.order_items.length > 0 ? (
                  order.order_items.map((item, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-12 p-4 hover:bg-gray-50"
                    >
                      <div className="col-span-6">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                            {item.products?.image_url ? (
                              <img
                                src={item.products.image_url}
                                alt={item.products.name}
                                className="w-full h-full object-cover rounded"
                              />
                            ) : (
                              <Package className="w-6 h-6 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">
                              {item.products?.name || "Unknown Product"}
                            </p>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {item.size && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                                  Size: {item.size}
                                </span>
                              )}
                              {item.products?.brand && (
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-800 text-xs rounded-full">
                                  {item.products.brand}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="col-span-2 flex items-center justify-center">
                        <span className="font-medium">
                          {item.quantity || 1}
                        </span>
                      </div>
                      <div className="col-span-2 flex items-center justify-end">
                        <span className="font-medium">
                          ${parseFloat(item.products?.price || 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="col-span-2 flex items-center justify-end">
                        <span className="font-medium">
                          $
                          {parseFloat(
                            (item.products?.price || 0) * (item.quantity || 1)
                          ).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    No items found for this order
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Total Summary */}
          <div className="bg-gray-50 p-6 rounded-lg space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Shipping</span>
              <span className="font-medium">${shipping.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tax</span>
              <span className="font-medium">${tax.toFixed(2)}</span>
            </div>
            <div className="border-t pt-3 flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Order Notes */}
          {order.notes && (
            <div>
              <h3 className="font-semibold text-lg text-gray-900 mb-2">
                Order Notes
              </h3>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800">{order.notes}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewOrderModal;
